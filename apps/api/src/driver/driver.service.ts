import {
  Injectable,
  Inject,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { eq, and, asc, inArray } from 'drizzle-orm';
import { DRIZZLE_ORM, DrizzleDb } from '../database/database.module';
import * as schema from '../database/schema';
import {
  ArriveAtStopDto,
  SubmitProofOfDeliveryDto,
  FailStopDto,
  UpdateTelematicsDto,
  ConfirmDriverReadinessDto,
  ConfirmDepotReturnDto,
} from './dto/driver.dto';

const TERMINAL_STOP_STATUSES = new Set([
  'DELIVERED',
  'DISCREPANCY_FLAGGED',
  'FAILED',
]);

@Injectable()
export class DriverService {
  constructor(@Inject(DRIZZLE_ORM) private readonly db: DrizzleDb) {}

  private async getDriverProfile(userId: string) {
    const driver = await this.db.query.drivers.findFirst({
      where: eq(schema.drivers.userId, userId),
    });
    if (!driver || !driver.isActive) {
      throw new ForbiddenException('User does not have an active driver profile');
    }
    return driver;
  }

  private colomboWindow(time: string, reference = new Date()) {
    const dateParts = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Colombo',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(reference);
    const part = (type: string) =>
      dateParts.find((value) => value.type === type)?.value;
    return new Date(
      `${part('year')}-${part('month')}-${part('day')}T${time}:00+05:30`,
    );
  }

  private effectiveWindow(
    outlet: {
      windowStart: string;
      windowEnd: string;
      mallWindowStart: string | null;
      mallWindowEnd: string | null;
      parkingConstraint: string;
    },
    reference = new Date(),
  ) {
    let opensAt = this.colomboWindow(outlet.windowStart, reference);
    let closesAt = this.colomboWindow(outlet.windowEnd, reference);
    if (
      outlet.parkingConstraint === 'mall_dock' &&
      outlet.mallWindowStart &&
      outlet.mallWindowEnd
    ) {
      const mallOpensAt = this.colomboWindow(outlet.mallWindowStart, reference);
      const mallClosesAt = this.colomboWindow(outlet.mallWindowEnd, reference);
      opensAt = new Date(Math.max(opensAt.getTime(), mallOpensAt.getTime()));
      closesAt = new Date(Math.min(closesAt.getTime(), mallClosesAt.getTime()));
    }
    if (opensAt >= closesAt) {
      throw new ConflictException('Outlet and mall receiving windows do not overlap');
    }
    return { opensAt, closesAt };
  }

  private assertCurrentStop(
    stopId: string,
    stops: Array<{ id: string; stopSequence: number; status: string }>,
  ) {
    const current = [...stops]
      .sort((a, b) => a.stopSequence - b.stopSequence)
      .find((stop) => !TERMINAL_STOP_STATUSES.has(stop.status));
    if (!current || current.id !== stopId) {
      throw new ConflictException(
        'Stops must be executed in the dispatcher-published sequence',
      );
    }
  }

  private distanceKm(
    from: { lat: number; lng: number },
    to: { lat: number; lng: number },
  ) {
    const radians = (degrees: number) => (degrees * Math.PI) / 180;
    const earthRadiusKm = 6371;
    const latitudeDelta = radians(to.lat - from.lat);
    const longitudeDelta = radians(to.lng - from.lng);
    const value =
      Math.sin(latitudeDelta / 2) ** 2 +
      Math.cos(radians(from.lat)) *
        Math.cos(radians(to.lat)) *
        Math.sin(longitudeDelta / 2) ** 2;
    return earthRadiusKm * 2 * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value));
  }

  async getActiveTrip(userId: string) {
    const driver = await this.getDriverProfile(userId);
    const trip = await this.db.query.trips.findFirst({
      where: and(
        eq(schema.trips.driverId, driver.id),
        inArray(schema.trips.status, ['MANIFEST_ISSUED', 'EN_ROUTE', 'RETURNING']),
      ),
      orderBy: [asc(schema.trips.operatingDate), asc(schema.trips.tripSequenceInDay)],
      with: {
        vehicle: true,
        depot: true,
        stops: {
          orderBy: [asc(schema.tripStops.stopSequence)],
          with: {
            outlet: true,
            order: {
              with: {
                items: { with: { product: true } },
              },
            },
            proofOfDelivery: true,
          },
        },
      },
    });
    if (!trip) return null;
    return {
      ...trip,
      departureUnlocked:
        trip.status === 'MANIFEST_ISSUED' &&
        Boolean(trip.gateClearedAt) &&
        Boolean(trip.driverReadyAt),
    };
  }

  async confirmReadiness(
    tripId: string,
    dto: ConfirmDriverReadinessDto,
    userId: string,
  ) {
    const driver = await this.getDriverProfile(userId);
    const trip = await this.db.query.trips.findFirst({
      where: eq(schema.trips.id, tripId),
    });
    if (!trip) throw new NotFoundException(`Trip with ID '${tripId}' not found`);
    if (trip.driverId !== driver.id) {
      throw new ForbiddenException('Cannot acknowledge a trip assigned to another driver');
    }
    if (trip.status !== 'MANIFEST_ISSUED' || !trip.gateClearedAt || !trip.gatePassToken) {
      throw new ConflictException('Loader clearance must be issued before driver readiness');
    }
    if (Object.values(dto).some((value) => value !== true)) {
      throw new BadRequestException('Every readiness item must be confirmed before departure');
    }
    const [updated] = await this.db
      .update(schema.trips)
      .set({ driverReadyAt: new Date(), driverChecklist: dto, updatedAt: new Date() })
      .where(eq(schema.trips.id, tripId))
      .returning();
    return updated;
  }

  async departTrip(tripId: string, userId: string) {
    const driver = await this.getDriverProfile(userId);
    const trip = await this.db.query.trips.findFirst({
      where: eq(schema.trips.id, tripId),
      with: { stops: true },
    });
    if (!trip) throw new NotFoundException(`Trip with ID '${tripId}' not found`);
    if (trip.driverId !== driver.id) {
      throw new ForbiddenException('You are not authorized to depart a trip assigned to another driver');
    }
    if (trip.status !== 'MANIFEST_ISSUED' || !trip.gateClearedAt) {
      throw new ConflictException('The loader has not released this manifest for departure');
    }
    if (!trip.driverReadyAt) {
      throw new ConflictException('Complete the driver readiness check before departure');
    }
    const now = new Date();
    const orderIds = trip.stops.map((stop) => stop.orderId);
    return this.db.transaction(async (tx) => {
      const [updatedTrip] = await tx
        .update(schema.trips)
        .set({ status: 'EN_ROUTE', actualDepartureTime: now, updatedAt: now })
        .where(eq(schema.trips.id, tripId))
        .returning();
      await tx.update(schema.vehicles).set({ status: 'in_transit', updatedAt: now }).where(eq(schema.vehicles.id, trip.vehicleId));
      await tx.update(schema.drivers).set({ status: 'on_trip', updatedAt: now }).where(eq(schema.drivers.id, driver.id));
      if (orderIds.length) {
        await tx.update(schema.orders).set({ status: 'IN_TRANSIT', updatedAt: now }).where(inArray(schema.orders.id, orderIds));
      }
      return updatedTrip;
    });
  }

  async arriveAtStop(stopId: string, dto: ArriveAtStopDto, userId: string) {
    const driver = await this.getDriverProfile(userId);
    const stop = await this.db.query.tripStops.findFirst({
      where: eq(schema.tripStops.id, stopId),
      with: { outlet: true, trip: { with: { stops: true } } },
    });
    if (!stop) throw new NotFoundException(`Trip stop with ID '${stopId}' not found`);
    if (stop.trip.driverId !== driver.id) {
      throw new ForbiddenException('Cannot modify a stop belonging to another driver');
    }
    if (stop.trip.status !== 'EN_ROUTE') {
      throw new ConflictException('The assigned trip is not currently en route');
    }
    this.assertCurrentStop(stopId, stop.trip.stops);
    if (stop.status !== 'PENDING') {
      throw new ConflictException(`Stop cannot arrive from status '${stop.status}'`);
    }

    const now = new Date();
    const { opensAt, closesAt } = this.effectiveWindow(stop.outlet, now);
    const waitTimeMinutes = Math.max(
      0,
      Math.ceil((opensAt.getTime() - now.getTime()) / 60_000),
    );
    const slaBreachMinutes = Math.max(
      0,
      Math.floor((now.getTime() - closesAt.getTime()) / 60_000),
    );
    const [updatedStop] = await this.db
      .update(schema.tripStops)
      .set({
        status: waitTimeMinutes > 0 ? 'WAITING_WINDOW' : 'ARRIVED',
        actualArrivalTime: now,
        waitTimeMinutes,
        windowHoldUntil: waitTimeMinutes > 0 ? opensAt : null,
        slaBreach: slaBreachMinutes > 0,
        slaBreachMinutes,
        updatedAt: now,
      })
      .where(eq(schema.tripStops.id, stopId))
      .returning();

    if (dto.currentLatitude !== undefined && dto.currentLongitude !== undefined) {
      await this.db.update(schema.drivers).set({
        currentLatitude: dto.currentLatitude.toFixed(7),
        currentLongitude: dto.currentLongitude.toFixed(7),
        lastTelematicsAt: now,
        updatedAt: now,
      }).where(eq(schema.drivers.id, driver.id));
    }
    return { ...updatedStop, effectiveWindow: { opensAt, closesAt } };
  }

  async deliverStop(stopId: string, dto: SubmitProofOfDeliveryDto, userId: string) {
    const driver = await this.getDriverProfile(userId);
    const stop = await this.db.query.tripStops.findFirst({
      where: eq(schema.tripStops.id, stopId),
      with: {
        outlet: true,
        order: true,
        trip: { with: { stops: true } },
      },
    });
    if (!stop) throw new NotFoundException(`Trip stop with ID '${stopId}' not found`);
    if (stop.trip.driverId !== driver.id) {
      throw new ForbiddenException('Cannot deliver a stop assigned to another driver');
    }
    if (stop.trip.status !== 'EN_ROUTE') {
      throw new ConflictException('The assigned trip is not currently en route');
    }
    this.assertCurrentStop(stopId, stop.trip.stops);
    if (!['ARRIVED', 'WAITING_WINDOW', 'UNLOADING'].includes(stop.status)) {
      throw new ConflictException(`Proof of delivery is not allowed from status '${stop.status}'`);
    }
    const now = new Date();
    if (stop.windowHoldUntil && now < stop.windowHoldUntil) {
      throw new ConflictException(`Unloading is locked until ${stop.windowHoldUntil.toISOString()}`);
    }
    if (dto.expectedCartons !== stop.order.totalItemsCount) {
      throw new ConflictException('POD manifest count does not match the published order');
    }
    if (dto.deliveredCartons > dto.expectedCartons) {
      throw new BadRequestException('Delivered cartons cannot exceed the manifest count');
    }
    if (dto.outcome === 'FULL' && dto.deliveredCartons !== dto.expectedCartons) {
      throw new BadRequestException('A full delivery must match the manifest count');
    }
    if (dto.outcome === 'PARTIAL' && dto.deliveredCartons >= dto.expectedCartons) {
      throw new BadRequestException('A partial delivery must be below the manifest count');
    }
    if (!dto.storeRepSignatureUrl && !dto.photoEvidenceUrl) {
      throw new BadRequestException('A signature or photo is required as proof of handover');
    }

    return this.db.transaction(async (tx) => {
      const [pod] = await tx.insert(schema.proofOfDeliveries).values({
        tripStopId: stop.id,
        orderId: stop.orderId,
        storeRepName: dto.storeRepName,
        storeRepDesignation: dto.storeRepDesignation,
        outcome: dto.outcome,
        expectedCartons: dto.expectedCartons,
        deliveredCartons: dto.deliveredCartons,
        storeRepSignatureUrl: dto.storeRepSignatureUrl,
        photoEvidenceUrl: dto.photoEvidenceUrl,
        driverNotes: dto.driverNotes,
        geoLatitude: dto.geoLatitude.toFixed(7),
        geoLongitude: dto.geoLongitude.toFixed(7),
        capturedAt: dto.clientCapturedAt ? new Date(dto.clientCapturedAt) : now,
      }).returning();

      const terminalStatus = dto.outcome === 'FULL' ? 'DELIVERED' : 'DISCREPANCY_FLAGGED';
      const [updatedStop] = await tx.update(schema.tripStops).set({
        status: terminalStatus,
        actualDepartureTime: now,
        updatedAt: now,
      }).where(eq(schema.tripStops.id, stopId)).returning();
      await tx.update(schema.orders).set({ status: 'DELIVERED', updatedAt: now }).where(eq(schema.orders.id, stop.orderId));

      if (dto.outcome === 'PARTIAL') {
        await tx.insert(schema.discrepancyClaims).values({
          claimNumber: `CLM-DRV-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`,
          orderId: stop.orderId,
          tripStopId: stop.id,
          outletId: stop.outletId,
          reportedByRole: 'driver',
          reportedByUserId: userId,
          discrepancyType: 'STORE_SHORTFALL',
          shortfallQty: dto.expectedCartons - dto.deliveredCartons,
          notes: dto.driverNotes || 'Partial receipt recorded on driver POD',
        });
      }

      const allResolved = stop.trip.stops.every((candidate) =>
        candidate.id === stopId
          ? true
          : TERMINAL_STOP_STATUSES.has(candidate.status),
      );
      if (allResolved) {
        await tx.update(schema.trips).set({
          status: 'RETURNING',
          returnStartedAt: now,
          updatedAt: now,
        }).where(eq(schema.trips.id, stop.tripId));
      }
      return { stop: updatedStop, proofOfDelivery: pod, tripStatus: allResolved ? 'RETURNING' : 'EN_ROUTE' };
    });
  }

  async failStop(stopId: string, dto: FailStopDto, userId: string) {
    const driver = await this.getDriverProfile(userId);
    const stop = await this.db.query.tripStops.findFirst({
      where: eq(schema.tripStops.id, stopId),
      with: { trip: { with: { stops: true } } },
    });
    if (!stop) throw new NotFoundException(`Trip stop with ID '${stopId}' not found`);
    if (stop.trip.driverId !== driver.id) {
      throw new ForbiddenException('Cannot modify a stop assigned to another driver');
    }
    if (stop.trip.status !== 'EN_ROUTE') {
      throw new ConflictException('The assigned trip is not currently en route');
    }
    this.assertCurrentStop(stopId, stop.trip.stops);
    if (!['PENDING', 'ARRIVED', 'WAITING_WINDOW', 'UNLOADING'].includes(stop.status)) {
      throw new ConflictException(`Delivery exception is not allowed from status '${stop.status}'`);
    }
    const now = new Date();
    return this.db.transaction(async (tx) => {
      const [updatedStop] = await tx.update(schema.tripStops).set({
        status: 'FAILED',
        failureReason: dto.failureReason,
        actualDepartureTime: now,
        updatedAt: now,
      }).where(eq(schema.tripStops.id, stopId)).returning();
      await tx.update(schema.orders).set({
        status: 'DEFICIT_PENDING',
        deferralReason: dto.failureReason,
        updatedAt: now,
      }).where(eq(schema.orders.id, stop.orderId));

      const allResolved = stop.trip.stops.every((candidate) =>
        candidate.id === stopId
          ? true
          : TERMINAL_STOP_STATUSES.has(candidate.status),
      );
      if (allResolved) {
        await tx.update(schema.trips).set({ status: 'RETURNING', returnStartedAt: now, updatedAt: now }).where(eq(schema.trips.id, stop.tripId));
      }
      return { stop: updatedStop, tripStatus: allResolved ? 'RETURNING' : 'EN_ROUTE' };
    });
  }

  async completeTrip(
    tripId: string,
    dto: ConfirmDepotReturnDto,
    userId: string,
  ) {
    const driver = await this.getDriverProfile(userId);
    const trip = await this.db.query.trips.findFirst({
      where: eq(schema.trips.id, tripId),
      with: { stops: true, depot: true },
    });
    if (!trip) throw new NotFoundException(`Trip with ID '${tripId}' not found`);
    if (trip.driverId !== driver.id) {
      throw new ForbiddenException('Cannot complete a trip assigned to another driver');
    }
    if (trip.status !== 'RETURNING') {
      throw new ConflictException('Trip can close only after all stops are resolved and the return leg is active');
    }
    const pendingStops = trip.stops.filter((stop) => !TERMINAL_STOP_STATUSES.has(stop.status));
    if (pendingStops.length) {
      throw new ConflictException(`Cannot complete trip while ${pendingStops.length} stops remain unresolved`);
    }
    const depotDistance = this.distanceKm(
      { lat: dto.latitude, lng: dto.longitude },
      { lat: Number(trip.depot.latitude), lng: Number(trip.depot.longitude) },
    );
    if (depotDistance > 2) {
      throw new ConflictException('Depot return can be confirmed only within the depot geofence');
    }
    const now = new Date();
    return this.db.transaction(async (tx) => {
      const [updatedTrip] = await tx.update(schema.trips).set({
        status: 'COMPLETED',
        actualReturnTime: now,
        updatedAt: now,
      }).where(eq(schema.trips.id, tripId)).returning();
      await tx.update(schema.vehicles).set({ status: 'available', updatedAt: now }).where(eq(schema.vehicles.id, trip.vehicleId));
      await tx.update(schema.drivers).set({ status: 'available', updatedAt: now }).where(eq(schema.drivers.id, driver.id));
      return updatedTrip;
    });
  }

  async updateTelematics(dto: UpdateTelematicsDto, userId: string) {
    const driver = await this.getDriverProfile(userId);
    const now = new Date();
    const [updatedDriver] = await this.db.update(schema.drivers).set({
      currentLatitude: dto.latitude.toFixed(7),
      currentLongitude: dto.longitude.toFixed(7),
      lastTelematicsAt: now,
      updatedAt: now,
    }).where(eq(schema.drivers.id, driver.id)).returning();
    return updatedDriver;
  }
}
