import {
  Injectable,
  Inject,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { eq, and, desc, sql, inArray } from 'drizzle-orm';
import { DRIZZLE_ORM, DrizzleDb } from '../database/database.module';
import * as schema from '../database/schema';
import { CreateDiscrepancyClaimDto, StoreDeliveryFilterDto } from './dto/store.dto';
import { RequestUser } from '../common/decorators/current-user.decorator';

@Injectable()
export class StoreService {
  constructor(@Inject(DRIZZLE_ORM) private readonly db: DrizzleDb) {}

  /**
   * Helper to compute Colombo Local Time (UTC + 05:30)
   */
  private getColomboNow(): { now: Date; hour: number; minute: number; dateStr: string } {
    const now = new Date();
    // Offset in milliseconds: 5 hours + 30 mins = 330 mins = 19,800,000 ms
    const colomboMs = now.getTime() + 5.5 * 60 * 60 * 1000;
    const colomboDate = new Date(colomboMs);
    const hour = colomboDate.getUTCHours();
    const minute = colomboDate.getUTCMinutes();
    const year = colomboDate.getUTCFullYear();
    const month = String(colomboDate.getUTCMonth() + 1).padStart(2, '0');
    const day = String(colomboDate.getUTCDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;

    return { now: colomboDate, hour, minute, dateStr };
  }

  /**
   * Get operational store overview for Store Manager dashboard
   */
  async getStoreOverview(outletId: string) {
    // 1. Fetch Outlet details
    const outlet = await this.db.query.outlets.findFirst({
      where: eq(schema.outlets.id, outletId),
      with: {
        depot: true,
      },
    });

    if (!outlet) {
      throw new NotFoundException(`Outlet with ID '${outletId}' not found`);
    }

    // 2. Cutoff Time & Schedule calculations (16:00 Colombo time)
    const { now: colomboNow, hour, minute, dateStr } = this.getColomboNow();
    const isPastCutoff = hour >= 16;
    let minutesToCutoff = 0;
    if (!isPastCutoff) {
      minutesToCutoff = (15 - hour) * 60 + (60 - minute);
    }

    // Compute next delivery date
    const advanceDays = isPastCutoff ? 2 : 1;
    const nextDelivery = new Date(
      Date.UTC(
        colomboNow.getUTCFullYear(),
        colomboNow.getUTCMonth(),
        colomboNow.getUTCDate() + advanceDays,
      ),
    );
    const nextDeliveryYear = nextDelivery.getUTCFullYear();
    const nextDeliveryMonth = String(nextDelivery.getUTCMonth() + 1).padStart(2, '0');
    const nextDeliveryDay = String(nextDelivery.getUTCDate()).padStart(2, '0');
    const nextDeliveryDate = `${nextDeliveryYear}-${nextDeliveryMonth}-${nextDeliveryDay}`;

    const cutoffInfo = {
      cutoffTime: '16:00:00',
      isPastCutoff,
      minutesToCutoff,
      currentColomboTime: `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`,
      nextDeliveryDate,
      message: isPastCutoff
        ? 'Cutoff reached for tomorrow. New orders will be queued for the following delivery run.'
        : `Order cutoff is 16:00. You have ${Math.floor(minutesToCutoff / 60)}h ${minutesToCutoff % 60}m remaining for next-day dispatch.`,
    };

    // 3. Active Order Counts
    const storeOrders = await this.db.query.orders.findMany({
      where: eq(schema.orders.outletId, outletId),
      orderBy: [desc(schema.orders.orderDate), desc(schema.orders.submissionTime)],
      limit: 50,
    });

    const activeCounts = {
      total: storeOrders.length,
      recorded: storeOrders.filter((o) => o.status === 'ORDER_RECORDED').length,
      queued: storeOrders.filter((o) => o.status === 'QUEUED_NEXT_RUN').length,
      assigned: storeOrders.filter((o) => o.status === 'ASSIGNED').length,
      inTransit: storeOrders.filter((o) => o.status === 'IN_TRANSIT').length,
      delivered: storeOrders.filter((o) => o.status === 'DELIVERED').length,
      deferred: storeOrders.filter((o) => o.status === 'DEFICIT_PENDING').length,
    };

    const recentOrders = storeOrders.slice(0, 5).map((o) => ({
      id: o.id,
      orderNumber: o.orderNumber,
      orderDate: o.orderDate,
      tempRequirement: o.tempRequirement,
      status: o.status,
      totalItemsCount: o.totalItemsCount,
      totalWeightKg: o.totalWeightKg,
      totalVolumeM3: o.totalVolumeM3,
      isCutoffLocked: o.isCutoffLocked,
      submissionTime: o.submissionTime,
      deferredCount: o.deferredCount,
      lastDeferredDate: o.lastDeferredDate,
      deferralReason: o.deferralReason,
    }));

    // 4. Inbound Deliveries for Today (Supports Dual-Delivery Split ETAs: ALT-1)
    const inboundStops = await this.db.query.tripStops.findMany({
      where: eq(schema.tripStops.outletId, outletId),
      with: {
        trip: {
          with: {
            vehicle: true,
            driver: {
              with: {
                user: true,
              },
            },
          },
        },
        order: true,
        proofOfDelivery: true,
      },
      orderBy: [desc(schema.tripStops.createdAt)],
      limit: 10,
    });

    const inboundDeliveries = inboundStops.map((stop) => {
      let deliveryStatus: 'SCHEDULED' | 'IN_TRANSIT' | 'ARRIVED' | 'DELIVERED' | 'FAILED' = 'SCHEDULED';
      if (stop.status === 'DELIVERED' || stop.status === 'DISCREPANCY_FLAGGED') {
        deliveryStatus = 'DELIVERED';
      } else if (stop.status === 'ARRIVED' || stop.status === 'WAITING_WINDOW' || stop.status === 'UNLOADING') {
        deliveryStatus = 'ARRIVED';
      } else if (stop.trip?.status === 'EN_ROUTE') {
        deliveryStatus = 'IN_TRANSIT';
      } else if (stop.status === 'FAILED') {
        deliveryStatus = 'FAILED';
      }

      const driverName = stop.trip?.driver?.user
        ? `${stop.trip.driver.user.firstName} ${stop.trip.driver.user.lastName}`
        : stop.trip?.driver?.licenseNumber || 'Unassigned';
      const driverPhone = stop.trip?.driver?.user?.phone || 'N/A';

      return {
        tripStopId: stop.id,
        tripId: stop.tripId,
        tripNumber: stop.trip?.tripNumber || 'N/A',
        operatingDate: stop.trip?.operatingDate || dateStr,
        orderId: stop.orderId,
        orderNumber: stop.order?.orderNumber || 'N/A',
        brand: stop.order?.brand,
        tempRequirement: stop.order?.tempRequirement || 'ambient',
        stopSequence: stop.stopSequence,
        status: deliveryStatus,
        stopStatus: stop.status,
        plannedArrivalTime: stop.plannedArrivalTime,
        actualArrivalTime: stop.actualArrivalTime,
        actualDepartureTime: stop.actualDepartureTime,
        vehiclePlate: stop.trip?.vehicle?.registrationNumber || 'Pending',
        vehicleType: stop.trip?.vehicle?.vehicleType || 'van_ambient',
        vehicleCapacityKg: stop.trip?.vehicle?.maxWeightKg || '0',
        driverName,
        driverPhone,
        totalItemsCount: stop.order?.totalItemsCount || 0,
        totalWeightKg: stop.order?.totalWeightKg || '0.00',
        hasPod: Boolean(stop.proofOfDelivery),
        proofOfDelivery: stop.proofOfDelivery
          ? {
              id: stop.proofOfDelivery.id,
              storeRepName: stop.proofOfDelivery.storeRepName,
              signatureUrl: stop.proofOfDelivery.storeRepSignatureUrl,
              photoUrl: stop.proofOfDelivery.photoEvidenceUrl,
              driverNotes: stop.proofOfDelivery.driverNotes,
              geoLatitude: stop.proofOfDelivery.geoLatitude,
              geoLongitude: stop.proofOfDelivery.geoLongitude,
              capturedAt: stop.proofOfDelivery.capturedAt,
            }
          : null,
      };
    });

    return {
      outlet: {
        id: outlet.id,
        code: outlet.code,
        name: outlet.name,
        brand: outlet.brand,
        district: outlet.district,
        address: outlet.address,
        contactPhone: outlet.contactPhone,
        deliveryWindow: `${outlet.windowStart} - ${outlet.windowEnd}`,
        depotName: outlet.depot?.name || 'Peliyagoda Central Hub',
      },
      cutoff: cutoffInfo,
      activeCounts,
      recentOrders,
      inboundDeliveries,
    };
  }

  /**
   * Get all delivery records with POD and discrepancy context for the outlet
   */
  async getStoreDeliveries(outletId: string, filter?: StoreDeliveryFilterDto) {
    const stops = await this.db.query.tripStops.findMany({
      where: eq(schema.tripStops.outletId, outletId),
      with: {
        trip: {
          with: {
            vehicle: true,
            driver: {
              with: {
                user: true,
              },
            },
          },
        },
        order: {
          with: {
            discrepancies: true,
          },
        },
        proofOfDelivery: true,
      },
      orderBy: [desc(schema.tripStops.createdAt)],
      limit: 50,
    });

    return stops
      .filter((stop) => !filter?.date || stop.trip?.operatingDate === filter.date)
      .map((stop) => {
        let displayStatus: 'SCHEDULED' | 'IN_TRANSIT' | 'ARRIVED' | 'DELIVERED' | 'FAILED' = 'SCHEDULED';
        if (stop.status === 'DELIVERED' || stop.status === 'DISCREPANCY_FLAGGED') {
          displayStatus = 'DELIVERED';
        } else if (stop.status === 'ARRIVED' || stop.status === 'WAITING_WINDOW' || stop.status === 'UNLOADING') {
          displayStatus = 'ARRIVED';
        } else if (stop.trip?.status === 'EN_ROUTE') {
          displayStatus = 'IN_TRANSIT';
        } else if (stop.status === 'FAILED') {
          displayStatus = 'FAILED';
        }

        const driverName = stop.trip?.driver?.user
          ? `${stop.trip.driver.user.firstName} ${stop.trip.driver.user.lastName}`
          : stop.trip?.driver?.licenseNumber || 'Assigned Driver';
        const driverPhone = stop.trip?.driver?.user?.phone || 'N/A';

        const delivery = {
        tripStopId: stop.id,
        tripId: stop.tripId,
        tripNumber: stop.trip?.tripNumber || 'N/A',
        operatingDate: stop.trip?.operatingDate,
        orderId: stop.orderId,
        orderNumber: stop.order?.orderNumber || 'N/A',
        brand: stop.order?.brand,
        tempRequirement: stop.order?.tempRequirement || 'ambient',
        status: displayStatus,
        stopStatus: stop.status,
        stopSequence: stop.stopSequence,
        plannedArrivalTime: stop.plannedArrivalTime,
        actualArrivalTime: stop.actualArrivalTime,
        actualDepartureTime: stop.actualDepartureTime,
        vehiclePlate: stop.trip?.vehicle?.registrationNumber || 'N/A',
        vehicleType: stop.trip?.vehicle?.vehicleType || 'van_ambient',
        driverName,
        driverPhone,
        totalItemsCount: stop.order?.totalItemsCount || 0,
        totalWeightKg: stop.order?.totalWeightKg || '0.00',
        proofOfDelivery: stop.proofOfDelivery
          ? {
              id: stop.proofOfDelivery.id,
              storeRepName: stop.proofOfDelivery.storeRepName,
              signatureUrl: stop.proofOfDelivery.storeRepSignatureUrl,
              photoUrl: stop.proofOfDelivery.photoEvidenceUrl,
              driverNotes: stop.proofOfDelivery.driverNotes,
              geoLatitude: stop.proofOfDelivery.geoLatitude,
              geoLongitude: stop.proofOfDelivery.geoLongitude,
              capturedAt: stop.proofOfDelivery.capturedAt,
            }
          : null,
        discrepancies: (stop.order?.discrepancies || []).map((d) => ({
          id: d.id,
          claimNumber: d.claimNumber,
          discrepancyType: d.discrepancyType,
          status: d.status,
          shortfallQty: d.shortfallQty,
          notes: d.notes,
          createdAt: d.createdAt,
        })),
        };
        return delivery;
      })
      .filter(
        (delivery) =>
          !filter?.status ||
          delivery.stopStatus === filter.status ||
          delivery.status === filter.status,
      );
  }

  /**
   * Log physical receiving discrepancy claim (SM-3, SM-DISC-001)
   */
  async createDiscrepancyClaim(dto: CreateDiscrepancyClaimDto, user: RequestUser) {
    if (!user.outletId) {
      throw new ForbiddenException('User is not assigned to an outlet to report discrepancies');
    }

    // 1. Verify Order belongs to this outlet
    const order = await this.db.query.orders.findFirst({
      where: and(
        eq(schema.orders.id, dto.orderId),
        eq(schema.orders.outletId, user.outletId),
      ),
    });

    if (!order) {
      throw new NotFoundException('Specified order was not found for your retail store');
    }

    const orderStops = await this.db.query.tripStops.findMany({
      where: and(
        eq(schema.tripStops.orderId, order.id),
        eq(schema.tripStops.outletId, user.outletId),
      ),
      with: { proofOfDelivery: true },
      orderBy: [desc(schema.tripStops.createdAt)],
      limit: 10,
    });
    const completedDelivery = orderStops.some(
      (stop) =>
        (stop.status === 'DELIVERED' || stop.status === 'DISCREPANCY_FLAGGED') &&
        Boolean(stop.proofOfDelivery),
    );
    if (order.status !== 'DELIVERED' && !completedDelivery) {
      throw new BadRequestException('A receiving discrepancy can only be reported after the delivery is completed');
    }

    if (dto.tripStopId) {
      const stop = await this.db.query.tripStops.findFirst({
        where: and(
          eq(schema.tripStops.id, dto.tripStopId),
          eq(schema.tripStops.orderId, order.id),
          eq(schema.tripStops.outletId, user.outletId),
        ),
      });
      if (!stop || stop.status !== 'DELIVERED') {
        throw new BadRequestException('The selected delivery stop is not eligible for a receiving claim');
      }
    }

    // 2. Generate Unique Claim Number
    const now = new Date();
    const dateCode = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
    const randSuffix = Math.floor(1000 + Math.random() * 9000);
    const claimNumber = `CLM-${dateCode}-${randSuffix}`;

    // 3. Insert Claim Record
    const [claim] = await this.db
      .insert(schema.discrepancyClaims)
      .values({
        claimNumber,
        orderId: dto.orderId,
        tripStopId: dto.tripStopId || null,
        outletId: user.outletId,
        reportedByRole: 'store_manager',
        reportedByUserId: user.id,
        status: 'LOGGED',
        discrepancyType: dto.discrepancyType,
        shortfallQty: dto.shortfallQty || 0,
        notes: dto.notes || null,
      })
      .returning();

    return claim;
  }

  /**
   * List all discrepancy claims logged for the store
   */
  async getStoreDiscrepancies(outletId: string) {
    return this.db.query.discrepancyClaims.findMany({
      where: eq(schema.discrepancyClaims.outletId, outletId),
      with: {
        order: true,
        tripStop: true,
      },
      orderBy: [desc(schema.discrepancyClaims.createdAt)],
    });
  }
}
