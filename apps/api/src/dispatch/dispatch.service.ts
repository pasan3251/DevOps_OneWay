import {
  Injectable,
  Inject,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { eq, and, sql, desc, inArray } from 'drizzle-orm';
import { DRIZZLE_ORM, DrizzleDb } from '../database/database.module';
import * as schema from '../database/schema';
import { PlanTripDto, DeferOrderDto, TripFilterDto } from './dto/dispatch.dto';
import { FeasibilityRulesEngine } from './rules/feasibility.rules';

@Injectable()
export class DispatchService {
  constructor(@Inject(DRIZZLE_ORM) private readonly db: DrizzleDb) {}

  async planTrip(dto: PlanTripDto, userId?: string) {
    // 1. Fetch Vehicle and Driver
    const vehicle = await this.db.query.vehicles.findFirst({
      where: eq(schema.vehicles.id, dto.vehicleId),
    });

    if (!vehicle || !vehicle.isActive) {
      throw new NotFoundException('Designated vehicle not found or is currently inactive');
    }

    const driver = await this.db.query.drivers.findFirst({
      where: eq(schema.drivers.id, dto.driverId),
    });

    if (!driver || !driver.isActive) {
      throw new NotFoundException('Designated driver profile not found or is currently inactive');
    }

    // 2. Check existing trips for vehicle on operating date
    const existingVehicleTrips = await this.db.query.trips.findMany({
      where: and(
        eq(schema.trips.vehicleId, dto.vehicleId),
        eq(schema.trips.operatingDate, dto.operatingDate),
        sql`${schema.trips.status} != 'CANCELLED'`,
      ),
    });

    const priorTripsCount = existingVehicleTrips.length;
    const priorDrivingMinutes = existingVehicleTrips.reduce(
      (sum, t) => sum + (t.plannedDurationMin || 0),
      0,
    );

    // 3. Fetch Orders with their Outlets
    const orderRecords = await this.db.query.orders.findMany({
      where: inArray(schema.orders.id, dto.orderIds),
      with: {
        outlet: true,
      },
    });

    if (orderRecords.length !== dto.orderIds.length) {
      throw new NotFoundException('One or more order IDs in the manifest were not found');
    }

    // Verify all orders are in assignable state
    for (const order of orderRecords) {
      if (order.status !== 'ORDER_RECORDED' && order.status !== 'QUEUED_NEXT_RUN') {
        throw new BadRequestException(
          `Order #${order.orderNumber} is in status '${order.status}' and cannot be planned onto a new trip`,
        );
      }
    }

    // Map orders in the exact stop sequence provided by dispatcher
    const orderMap = new Map(orderRecords.map((o) => [o.id, o]));
    const sequencedOrdersWithOutlets = dto.orderIds.map((id) => {
      const order = orderMap.get(id)!;
      return {
        order,
        outlet: order.outlet,
      };
    });

    // 4. Assert 7 Core Feasibility Rules
    FeasibilityRulesEngine.assertValid({
      vehicle,
      driverId: dto.driverId,
      brand: dto.brand,
      district: dto.district,
      operatingDate: dto.operatingDate,
      ordersWithOutlets: sequencedOrdersWithOutlets,
      plannedDurationMin: dto.plannedDurationMin,
      priorTripsForVehicleToday: priorTripsCount,
      priorDrivingMinutesForVehicleToday: priorDrivingMinutes,
    });

    // 5. Compute manifest totals
    let totalWeight = 0;
    let totalVolume = 0;
    for (const { order } of sequencedOrdersWithOutlets) {
      totalWeight += Number(order.totalWeightKg);
      totalVolume += Number(order.totalVolumeM3);
    }

    const tripSequenceInDay = priorTripsCount + 1;
    const tripNumber = `TRIP-${dto.operatingDate}-${dto.district.substring(0, 3).toUpperCase()}-T${tripSequenceInDay}-${Math.floor(100 + Math.random() * 900)}`;

    const totalStops = sequencedOrdersWithOutlets.length;

    // 6. Execute Atomic Transaction to lock trip and update orders
    return await this.db.transaction(async (tx) => {
      const [newTrip] = await tx
        .insert(schema.trips)
        .values({
          tripNumber,
          depotId: dto.depotId,
          vehicleId: dto.vehicleId,
          driverId: dto.driverId,
          brand: dto.brand,
          district: dto.district,
          operatingDate: dto.operatingDate,
          tripSequenceInDay,
          status: 'PLANNED',
          totalWeightKg: totalWeight.toFixed(2),
          totalVolumeM3: totalVolume.toFixed(2),
          plannedDurationMin: dto.plannedDurationMin,
        })
        .returning();

      // Insert trip stops with strict LIFO reverse loading calculation
      const stopsToInsert = sequencedOrdersWithOutlets.map(({ order, outlet }, index) => {
        const stopSequence = index + 1;
        const loadingSequence = totalStops - index; // LIFO reverse order
        return {
          tripId: newTrip.id,
          orderId: order.id,
          outletId: outlet.id,
          stopSequence,
          loadingSequence,
          status: 'PENDING' as const,
        };
      });

      const insertedStops = await tx
        .insert(schema.tripStops)
        .values(stopsToInsert)
        .returning();

      // Update orders status to ASSIGNED
      await tx
        .update(schema.orders)
        .set({
          status: 'ASSIGNED',
          updatedAt: new Date(),
        })
        .where(inArray(schema.orders.id, dto.orderIds));

      return {
        ...newTrip,
        vehicle,
        driver,
        stops: insertedStops,
      };
    });
  }

  async deferOrder(dto: DeferOrderDto, userId?: string) {
    const order = await this.db.query.orders.findFirst({
      where: eq(schema.orders.id, dto.orderId),
    });

    if (!order) {
      throw new NotFoundException(`Order with ID '${dto.orderId}' not found`);
    }

    const today = new Date().toISOString().split('T')[0];
    const newDeferredCount = (order.deferredCount || 0) + 1;

    const [updatedOrder] = await this.db
      .update(schema.orders)
      .set({
        deferredCount: newDeferredCount,
        lastDeferredDate: today,
        deferralReason: dto.deferralReason,
        status: 'ORDER_RECORDED',
        updatedAt: new Date(),
      })
      .where(eq(schema.orders.id, dto.orderId))
      .returning();

    return updatedOrder;
  }

  async listTrips(filter: TripFilterDto) {
    const conditions: any[] = [];

    if (filter.operatingDate) {
      conditions.push(eq(schema.trips.operatingDate, filter.operatingDate));
    }
    if (filter.brand) {
      conditions.push(eq(schema.trips.brand, filter.brand));
    }
    if (filter.district) {
      conditions.push(eq(schema.trips.district, filter.district));
    }
    if (filter.status) {
      conditions.push(eq(schema.trips.status, filter.status as any));
    }
    if (filter.depotId) {
      conditions.push(eq(schema.trips.depotId, filter.depotId));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const data = await this.db.query.trips.findMany({
      where: whereClause,
      limit: filter.limit,
      offset: filter.offset,
      orderBy: [desc(schema.trips.createdAt)],
      with: {
        vehicle: true,
        driver: {
          with: {
            user: true,
          },
        },
        depot: true,
        stops: {
          with: {
            outlet: true,
            order: true,
          },
        },
      },
    });

    const [countResult] = await this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(schema.trips)
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

  async getTripById(tripId: string) {
    const trip = await this.db.query.trips.findFirst({
      where: eq(schema.trips.id, tripId),
      with: {
        vehicle: true,
        driver: {
          with: {
            user: true,
          },
        },
        depot: true,
        stops: {
          with: {
            outlet: true,
            order: {
              with: {
                items: {
                  with: {
                    product: true,
                  },
                },
              },
            },
            proofOfDelivery: true,
          },
        },
      },
    });

    if (!trip) {
      throw new NotFoundException(`Trip with ID '${tripId}' not found`);
    }

    return trip;
  }

  async lockTrip(tripId: string, userId?: string) {
    const trip = await this.db.query.trips.findFirst({
      where: eq(schema.trips.id, tripId),
    });

    if (!trip) {
      throw new NotFoundException(`Trip with ID '${tripId}' not found`);
    }

    if (trip.status !== 'PLANNED') {
      throw new BadRequestException(
        `Trip cannot be locked from current status '${trip.status}'. Must be in 'PLANNED' state`,
      );
    }

    const [updatedTrip] = await this.db
      .update(schema.trips)
      .set({
        status: 'LOCKED',
        updatedAt: new Date(),
      })
      .where(eq(schema.trips.id, tripId))
      .returning();

    return updatedTrip;
  }
}
