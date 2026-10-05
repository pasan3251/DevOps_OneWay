import {
  Injectable,
  Inject,
  NotFoundException,
  ConflictException,
  BadRequestException,
  ForbiddenException,
  Optional,
} from '@nestjs/common';
import { eq, and, sql, desc, inArray, SQL } from 'drizzle-orm';
import { DRIZZLE_ORM, DrizzleDb } from '../database/database.module';
import * as schema from '../database/schema';
import { CreateOrderDto, OrderFilterDto } from './dto/order.dto';
import { RequestUser } from '../common/decorators/current-user.decorator';
import { AuditService } from '../audit/audit.service';
import { NotificationsService } from '../communications/notifications.service';

@Injectable()
export class OrdersService {
  constructor(
    @Inject(DRIZZLE_ORM) private readonly db: DrizzleDb,
    @Optional() private readonly auditService?: AuditService,
    @Optional() private readonly notificationsService?: NotificationsService,
  ) {}

  private getColomboOrderCycle() {
    const now = new Date();
    const colomboNow = new Date(now.getTime() + 330 * 60 * 1000);
    const isPastCutoff = colomboNow.getUTCHours() >= 16;
    const earliestDelivery = new Date(
      Date.UTC(
        colomboNow.getUTCFullYear(),
        colomboNow.getUTCMonth(),
        colomboNow.getUTCDate() + (isPastCutoff ? 2 : 1),
      ),
    );

    return {
      isPastCutoff,
      earliestDeliveryDate: earliestDelivery.toISOString().slice(0, 10),
    };
  }

  async createOrder(dto: CreateOrderDto, userId?: string, actorRole?: string) {
    if (!dto.items || dto.items.length === 0) {
      throw new BadRequestException('Order must contain at least one line item');
    }

    // 1. Validate Outlet exists and matches brand
    const outlet = await this.db.query.outlets.findFirst({
      where: eq(schema.outlets.id, dto.outletId),
    });

    if (!outlet || !outlet.isActive) {
      throw new NotFoundException('Designated outlet not found or is currently inactive');
    }

    if (outlet.brand !== dto.brand) {
      throw new BadRequestException(
        `Brand mismatch: Outlet is '${outlet.brand}', but order brand is '${dto.brand}'`,
      );
    }

    // 2. Validate Temperature requirement consistency
    if (dto.brand !== 'Fresh' && dto.tempRequirement !== 'ambient') {
      throw new BadRequestException(
        `Brand '${dto.brand}' does not support chilled goods. Temperature requirement must be 'ambient'`,
      );
    }

    const orderCycle = this.getColomboOrderCycle();
    if (dto.orderDate < orderCycle.earliestDeliveryDate) {
      throw new BadRequestException(
        `The earliest eligible delivery date is ${orderCycle.earliestDeliveryDate} for the current 16:00 Colombo order cycle`,
      );
    }

    // 3. Enforce Fresh Dual-Order Invariant (BR-ORD-002)
    const existingOrder = await this.db.query.orders.findFirst({
      where: and(
        eq(schema.orders.outletId, dto.outletId),
        eq(schema.orders.orderDate, dto.orderDate),
        eq(schema.orders.tempRequirement, dto.tempRequirement),
      ),
    });

    if (existingOrder) {
      throw new ConflictException(
        `Duplicate order violation: Outlet '${outlet.name}' already has a '${dto.tempRequirement}' order registered for ${dto.orderDate} (Order #${existingOrder.orderNumber})`,
      );
    }

    // 4. Calculate Operational 16:00 Cutoff (BR-ORD-001)
    const isPastCutoff = orderCycle.isPastCutoff;
    const orderStatus = isPastCutoff ? 'QUEUED_NEXT_RUN' : 'ORDER_RECORDED';

    // 5. Fetch Products and compute weights, volumes, and prices
    const productIds = dto.items.map((i) => i.productId);
    const productRecords = await this.db.query.products.findMany({
      where: inArray(schema.products.id, productIds),
    });

    const productMap = new Map(productRecords.map((p) => [p.id, p]));

    let totalWeight = 0;
    let totalVolume = 0;
    let totalItems = 0;

    const preparedItems = dto.items.map((item) => {
      const prod = productMap.get(item.productId);
      if (!prod || !prod.isActive) {
        throw new NotFoundException(`Product ID '${item.productId}' not found or inactive`);
      }

      if (prod.brand !== dto.brand) {
        throw new BadRequestException(
          `Product '${prod.name}' belongs to brand '${prod.brand}', not '${dto.brand}'`,
        );
      }

      if (prod.tempRequirement !== dto.tempRequirement) {
        throw new BadRequestException(
          `Product '${prod.name}' temperature '${prod.tempRequirement}' does not match order requirement '${dto.tempRequirement}'`,
        );
      }

      const itemWeight = Number(prod.unitWeightKg) * item.quantity;
      const itemVolume = Number(prod.unitVolumeM3) * item.quantity;

      totalWeight += itemWeight;
      totalVolume += itemVolume;
      totalItems += item.quantity;

      return {
        productId: prod.id,
        quantityRequested: item.quantity,
        unitWeightKg: prod.unitWeightKg,
        unitVolumeM3: prod.unitVolumeM3,
        unitPrice: prod.unitPrice,
      };
    });

    const orderNumber = `ORD-${dto.orderDate}-${dto.brand.substring(0, 2).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`;

    // 6. Execute Atomic Transaction
    const created = await this.db.transaction(async (tx) => {
      const [newOrder] = await tx
        .insert(schema.orders)
        .values({
          orderNumber,
          outletId: dto.outletId,
          brand: dto.brand,
          tempRequirement: dto.tempRequirement,
          orderDate: dto.orderDate,
          status: orderStatus,
          totalWeightKg: totalWeight.toFixed(2),
          totalVolumeM3: totalVolume.toFixed(2),
          totalItemsCount: totalItems,
          isCutoffLocked: isPastCutoff,
          createdBy: userId,
        })
        .returning();

      const itemsToInsert = preparedItems.map((item) => ({
        orderId: newOrder.id,
        ...item,
      }));

      const insertedItems = await tx
        .insert(schema.orderItems)
        .values(itemsToInsert)
        .returning();

      return {
        ...newOrder,
        outlet,
        items: insertedItems,
      };
    });
    await this.auditService?.record({
      actorId: userId,
      actorRole,
      action: 'order.created',
      entity: 'order',
      entityId: created.id,
      afterState: { status: created.status, orderNumber: created.orderNumber },
    });
    if (this.notificationsService) {
      const recipients = await this.notificationsService.usersForRoles(
        ['dispatcher', 'admin'],
        { depotId: outlet.depotId },
      );
      await this.notificationsService.create({
        userIds: recipients,
        type: 'ORDER_CREATED',
        title: 'New order ready for planning',
        message: `${created.orderNumber} was submitted by ${outlet.name}.`,
        entityType: 'order',
        entityId: created.id,
        payload: { status: created.status, outletId: outlet.id },
      });
    }
    return created;
  }

  async listOrders(filter: OrderFilterDto) {
    const conditions: SQL<unknown>[] = [];

    if (filter.orderDate) {
      conditions.push(eq(schema.orders.orderDate, filter.orderDate));
    }
    if (filter.brand) {
      conditions.push(eq(schema.orders.brand, filter.brand));
    }
    if (filter.status) {
      conditions.push(eq(schema.orders.status, filter.status as typeof schema.orders.status.enumValues[number]));
    }
    if (filter.outletId) {
      conditions.push(eq(schema.orders.outletId, filter.outletId));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const data = await this.db.query.orders.findMany({
      where: whereClause,
      limit: filter.limit,
      offset: filter.offset,
      orderBy: [desc(schema.orders.submissionTime)],
      with: {
        outlet: { with: { depot: true } },
        items: {
          with: {
            product: true,
          },
        },
      },
    });

    const [countResult] = await this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(schema.orders)
      .where(whereClause);

    const total = countResult?.count ?? 0;
    const limit = filter.limit ?? 20;

    return {
      data,
      meta: {
        total,
        page: filter.page ?? 1,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getOrderById(orderId: string, user?: RequestUser) {
    const order = await this.db.query.orders.findFirst({
      where: eq(schema.orders.id, orderId),
      with: {
        outlet: true,
        items: {
          with: {
            product: true,
          },
        },
        tripStop: {
          with: {
            trip: true,
          },
        },
        discrepancies: true,
      },
    });

    if (!order) {
      throw new NotFoundException(`Order with ID '${orderId}' not found`);
    }

    if (
      user?.role === 'store_manager' &&
      (!user.outletId || order.outletId !== user.outletId)
    ) {
      throw new ForbiddenException('Store Managers can only view orders for their assigned outlet');
    }

    if (user?.role === 'loader' && (!user.depotId || order.outlet.depotId !== user.depotId)) {
      throw new ForbiddenException('Loaders can only view orders assigned to their depot');
    }

    if (user?.role === 'driver') {
      const driver = await this.db.query.drivers.findFirst({
        where: eq(schema.drivers.userId, user.id),
      });
      if (!driver || order.tripStop?.trip?.driverId !== driver.id) {
        throw new ForbiddenException('Drivers can only view orders on their assigned trip');
      }
    }

    return order;
  }

  async cancelOrder(orderId: string, user?: RequestUser) {
    const order = await this.db.query.orders.findFirst({
      where: eq(schema.orders.id, orderId),
    });

    if (!order) {
      throw new NotFoundException(`Order with ID '${orderId}' not found`);
    }

    if (
      user?.role === 'store_manager' &&
      (!user.outletId || order.outletId !== user.outletId)
    ) {
      throw new ForbiddenException('Store Managers can only cancel orders for their assigned outlet');
    }

    if (
      order.status !== 'ORDER_RECORDED' ||
      order.isCutoffLocked ||
      this.getColomboOrderCycle().isPastCutoff
    ) {
      throw new BadRequestException(
        'This order is locked. Only a recorded order in the current pre-cutoff cycle can be cancelled',
      );
    }

    const [updatedOrder] = await this.db
      .update(schema.orders)
      .set({
        status: 'CANCELLED',
        updatedAt: new Date(),
      })
      .where(eq(schema.orders.id, orderId))
      .returning();

    await this.auditService?.record({
      actorId: user?.id,
      actorRole: user?.role,
      action: 'order.cancelled',
      entity: 'order',
      entityId: orderId,
      beforeState: { status: order.status },
      afterState: { status: updatedOrder.status },
    });

    return updatedOrder;
  }
}
