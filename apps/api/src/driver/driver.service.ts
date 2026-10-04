import {
  Injectable,
  Inject,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { eq, and, asc, inArray } from 'drizzle-orm';
import { DRIZZLE_ORM, DrizzleDb } from '../database/database.module';
import * as schema from '../database/schema';
import {
  ArriveAtStopDto,
  SubmitProofOfDeliveryDto,
  FailStopDto,
  UpdateTelematicsDto,
} from './dto/driver.dto';

@Injectable()
export class DriverService {
  constructor(@Inject(DRIZZLE_ORM) private readonly db: DrizzleDb) {}

  private async getDriverProfile(userId: string) {
    const driver = await this.db.query.drivers.findFirst({
      where: eq(schema.drivers.userId, userId),
    });

    if (!driver) {
      throw new ForbiddenException('User does not have an active driver profile');
    }

    return driver;
  }

  async getActiveTrip(userId: string) {
    const driver = await this.getDriverProfile(userId);

    const trip = await this.db.query.trips.findFirst({
      where: and(
        eq(schema.trips.driverId, driver.id),
        inArray(schema.trips.status, [
          'MANIFEST_ISSUED',
          'EN_ROUTE',
          'LOCKED',
          'PLANNED',
        ]),
      ),
      with: {
        vehicle: true,
        depot: true,
        stops: {
          orderBy: [asc(schema.tripStops.stopSequence)],
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
      return null;
    }

    return trip;
  }

  async departTrip(tripId: string, userId: string) {
    const driver = await this.getDriverProfile(userId);

    const trip = await this.db.query.trips.findFirst({
      where: eq(schema.trips.id, tripId),
      with: {
        stops: true,
      },
    });

    if (!trip) {
      throw new NotFoundException(`Trip with ID '${tripId}' not found`);
    }

    if (trip.driverId !== driver.id) {
      throw new ForbiddenException('You are not authorized to depart a trip assigned to another driver');
    }

    if (trip.status !== 'MANIFEST_ISSUED') {
      throw new BadRequestException(
        `Cannot depart trip in status '${trip.status}'. Gate clearance and manifest issuance must be completed first`,
      );
    }

    const orderIds = trip.stops.map((s) => s.orderId);

    return await this.db.transaction(async (tx) => {
      const [updatedTrip] = await tx
        .update(schema.trips)
        .set({
          status: 'EN_ROUTE',
          actualDepartureTime: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(schema.trips.id, tripId))
        .returning();

      await tx
        .update(schema.vehicles)
        .set({ status: 'in_transit', updatedAt: new Date() })
        .where(eq(schema.vehicles.id, trip.vehicleId));

      await tx
        .update(schema.drivers)
        .set({ status: 'on_trip', updatedAt: new Date() })
        .where(eq(schema.drivers.id, driver.id));

      if (orderIds.length > 0) {
        await tx
          .update(schema.orders)
          .set({ status: 'IN_TRANSIT', updatedAt: new Date() })
          .where(inArray(schema.orders.id, orderIds));
      }

      return updatedTrip;
    });
  }

  async arriveAtStop(stopId: string, dto: ArriveAtStopDto, userId: string) {
    const driver = await this.getDriverProfile(userId);

    const stop = await this.db.query.tripStops.findFirst({
      where: eq(schema.tripStops.id, stopId),
      with: {
        outlet: true,
        trip: true,
      },
    });

    if (!stop) {
      throw new NotFoundException(`Trip stop with ID '${stopId}' not found`);
    }

    if (stop.trip.driverId !== driver.id) {
      throw new ForbiddenException('Cannot modify a stop belonging to another driver');
    }

    if (stop.status !== 'PENDING') {
      throw new BadRequestException(
        `Stop has already been arrived at or completed (Current status: '${stop.status}')`,
      );
    }

    // Calculate early arrival wait time (BR-DELIV-002)
    const now = new Date();
    // Colombo time (UTC+5:30)
    const colomboMinutes =
      ((now.getUTCHours() + 5) * 60 + now.getUTCMinutes() + 30) % (24 * 60);

    const [openH, openM] = stop.outlet.windowStart.split(':').map(Number);
    const windowStartMinutes = openH * 60 + openM;

    let waitTimeMinutes = 0;
    if (colomboMinutes < windowStartMinutes) {
      waitTimeMinutes = windowStartMinutes - colomboMinutes;
    }

    const [updatedStop] = await this.db
      .update(schema.tripStops)
      .set({
        status: 'ARRIVED',
        actualArrivalTime: now,
        waitTimeMinutes,
        updatedAt: now,
      })
      .where(eq(schema.tripStops.id, stopId))
      .returning();

    // Optionally update telematics
    if (dto.currentLatitude && dto.currentLongitude) {
      await this.db
        .update(schema.drivers)
        .set({
          currentLatitude: dto.currentLatitude.toFixed(7),
          currentLongitude: dto.currentLongitude.toFixed(7),
          lastTelematicsAt: now,
        })
        .where(eq(schema.drivers.id, driver.id));
    }

    return updatedStop;
  }

  async deliverStop(stopId: string, dto: SubmitProofOfDeliveryDto, userId: string) {
    const driver = await this.getDriverProfile(userId);

    const stop = await this.db.query.tripStops.findFirst({
      where: eq(schema.tripStops.id, stopId),
      with: {
        trip: true,
        order: true,
      },
    });

    if (!stop) {
      throw new NotFoundException(`Trip stop with ID '${stopId}' not found`);
    }

    if (stop.trip.driverId !== driver.id) {
      throw new ForbiddenException('Cannot deliver a stop assigned to another driver');
    }

    if (stop.status === 'DELIVERED') {
      throw new BadRequestException('This stop has already been marked as DELIVERED');
    }

    const now = new Date();

    return await this.db.transaction(async (tx) => {
      // 1. Insert Proof of Delivery
      const [pod] = await tx
        .insert(schema.proofOfDeliveries)
        .values({
          tripStopId: stop.id,
          orderId: stop.orderId,
          storeRepName: dto.storeRepName,
          storeRepSignatureUrl: dto.storeRepSignatureUrl,
          photoEvidenceUrl: dto.photoEvidenceUrl,
          driverNotes: dto.driverNotes,
          geoLatitude: dto.geoLatitude.toFixed(7),
          geoLongitude: dto.geoLongitude.toFixed(7),
          capturedAt: now,
        })
        .returning();

      // 2. Mark stop DELIVERED
      const [updatedStop] = await tx
        .update(schema.tripStops)
        .set({
          status: 'DELIVERED',
          actualDepartureTime: now,
          updatedAt: now,
        })
        .where(eq(schema.tripStops.id, stopId))
        .returning();

      // 3. Mark order DELIVERED
      await tx
        .update(schema.orders)
        .set({
          status: 'DELIVERED',
          updatedAt: now,
        })
        .where(eq(schema.orders.id, stop.orderId));

      return {
        stop: updatedStop,
        proofOfDelivery: pod,
      };
    });
  }

  async failStop(stopId: string, dto: FailStopDto, userId: string) {
    const driver = await this.getDriverProfile(userId);

    const stop = await this.db.query.tripStops.findFirst({
      where: eq(schema.tripStops.id, stopId),
      with: {
        trip: true,
      },
    });

    if (!stop) {
      throw new NotFoundException(`Trip stop with ID '${stopId}' not found`);
    }

    if (stop.trip.driverId !== driver.id) {
      throw new ForbiddenException('Cannot modify a stop assigned to another driver');
    }

    const now = new Date();

    const [updatedStop] = await this.db
      .update(schema.tripStops)
      .set({
        status: 'FAILED',
        failureReason: dto.failureReason,
        actualDepartureTime: now,
        updatedAt: now,
      })
      .where(eq(schema.tripStops.id, stopId))
      .returning();

    return updatedStop;
  }

  async completeTrip(tripId: string, userId: string) {
    const driver = await this.getDriverProfile(userId);

    const trip = await this.db.query.trips.findFirst({
      where: eq(schema.trips.id, tripId),
      with: {
        stops: true,
      },
    });

    if (!trip) {
      throw new NotFoundException(`Trip with ID '${tripId}' not found`);
    }

    if (trip.driverId !== driver.id) {
      throw new ForbiddenException('Cannot complete a trip assigned to another driver');
    }

    // Verify all stops are in terminal status
    const pendingStops = trip.stops.filter(
      (s) => s.status !== 'DELIVERED' && s.status !== 'FAILED',
    );

    if (pendingStops.length > 0) {
      throw new BadRequestException(
        `Cannot complete trip. ${pendingStops.length} stops are still pending completion or exception reporting`,
      );
    }

    const now = new Date();

    return await this.db.transaction(async (tx) => {
      const [updatedTrip] = await tx
        .update(schema.trips)
        .set({
          status: 'COMPLETED',
          actualReturnTime: now,
          updatedAt: now,
        })
        .where(eq(schema.trips.id, tripId))
        .returning();

      await tx
        .update(schema.vehicles)
        .set({ status: 'available', updatedAt: now })
        .where(eq(schema.vehicles.id, trip.vehicleId));

      await tx
        .update(schema.drivers)
        .set({ status: 'available', updatedAt: now })
        .where(eq(schema.drivers.id, driver.id));

      return updatedTrip;
    });
  }

  async updateTelematics(dto: UpdateTelematicsDto, userId: string) {
    const driver = await this.getDriverProfile(userId);
    const now = new Date();

    const [updatedDriver] = await this.db
      .update(schema.drivers)
      .set({
        currentLatitude: dto.latitude.toFixed(7),
        currentLongitude: dto.longitude.toFixed(7),
        lastTelematicsAt: now,
        updatedAt: now,
      })
      .where(eq(schema.drivers.id, driver.id))
      .returning();

    return updatedDriver;
  }
}
