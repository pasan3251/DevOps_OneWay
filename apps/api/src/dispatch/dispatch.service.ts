import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import { and, desc, eq, inArray, ne, sql, SQL } from 'drizzle-orm';
import { AuditService } from '../audit/audit.service';
import { RequestUser } from '../common/decorators/current-user.decorator';
import { NotificationsService } from '../communications/notifications.service';
import { DRIZZLE_ORM, DrizzleDb } from '../database/database.module';
import * as schema from '../database/schema';
import {
  CreatePlanDto,
  DeferOrderDto,
  PlanTripDto,
  RevisePlanDto,
  TripFilterDto,
  UpdateTripDto,
} from './dto/dispatch.dto';
import { FeasibilityRulesEngine } from './rules/feasibility.rules';

type OrderWithOutlet = schema.Order & { outlet: schema.Outlet };
type RouteEstimate = {
  distanceKm: number;
  durationMin: number;
  fuelLitres: number;
  departureAt: Date;
  returnAt: Date;
  arrivals: Date[];
};

@Injectable()
export class DispatchService {
  constructor(
    @Inject(DRIZZLE_ORM) private readonly db: DrizzleDb,
    @Optional() private readonly auditService?: AuditService,
    @Optional() private readonly notificationsService?: NotificationsService,
  ) {}

  private distanceKm(from: { latitude: string; longitude: string }, to: { latitude: string; longitude: string }) {
    const radians = (degrees: number) => (degrees * Math.PI) / 180;
    const fromLat = Number(from.latitude);
    const fromLng = Number(from.longitude);
    const toLat = Number(to.latitude);
    const toLng = Number(to.longitude);
    const latDelta = radians(toLat - fromLat);
    const lngDelta = radians(toLng - fromLng);
    const value =
      Math.sin(latDelta / 2) ** 2 +
      Math.cos(radians(fromLat)) * Math.cos(radians(toLat)) * Math.sin(lngDelta / 2) ** 2;
    return 6371 * 2 * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value)) * 1.2;
  }

  private colomboDateTime(operatingDate: string, time: string) {
    return new Date(`${operatingDate}T${time}:00+05:30`);
  }

  private effectiveWindow(outlet: schema.Outlet, operatingDate: string) {
    let opensAt = this.colomboDateTime(operatingDate, outlet.windowStart);
    let closesAt = this.colomboDateTime(operatingDate, outlet.windowEnd);
    if (outlet.parkingConstraint === 'mall_dock' && outlet.mallWindowStart && outlet.mallWindowEnd) {
      opensAt = new Date(Math.max(opensAt.getTime(), this.colomboDateTime(operatingDate, outlet.mallWindowStart).getTime()));
      closesAt = new Date(Math.min(closesAt.getTime(), this.colomboDateTime(operatingDate, outlet.mallWindowEnd).getTime()));
    }
    if (opensAt >= closesAt) {
      throw new BadRequestException(`Outlet '${outlet.name}' has no valid receiving window`);
    }
    return { opensAt, closesAt };
  }

  private async matrixLeg(
    originId: string,
    origin: { latitude: string; longitude: string },
    destinationId: string,
    destination: { latitude: string; longitude: string },
  ) {
    const matrix = await this.db.query.distanceDurationMatrix.findFirst({
      where: and(
        eq(schema.distanceDurationMatrix.originId, originId),
        eq(schema.distanceDurationMatrix.destinationId, destinationId),
      ),
    });
    if (matrix) {
      return { distanceKm: Number(matrix.distanceKm), durationMin: matrix.durationMin };
    }
    const distanceKm = this.distanceKm(origin, destination);
    return { distanceKm, durationMin: Math.max(1, Math.ceil((distanceKm / 40) * 60)) };
  }

  private async estimateRoute(
    depot: schema.Depot,
    orders: OrderWithOutlet[],
    vehicle: schema.Vehicle,
    operatingDate: string,
    requestedDeparture?: string,
    earliestDeparture?: Date,
  ): Promise<RouteEstimate> {
    let departureAt = requestedDeparture
      ? new Date(requestedDeparture)
      : this.colomboDateTime(operatingDate, depot.operatingHoursOpen);
    if (Number.isNaN(departureAt.getTime())) {
      throw new BadRequestException('The planned departure time is invalid');
    }
    if (earliestDeparture && departureAt < earliestDeparture) departureAt = earliestDeparture;

    let cursor = departureAt;
    let distanceKm = 0;
    let originId = depot.id;
    let origin: { latitude: string; longitude: string } = depot;
    const arrivals: Date[] = [];

    for (const { outlet } of orders) {
      const leg = await this.matrixLeg(originId, origin, outlet.id, outlet);
      distanceKm += leg.distanceKm;
      cursor = new Date(cursor.getTime() + leg.durationMin * 60_000);
      const { opensAt, closesAt } = this.effectiveWindow(outlet, operatingDate);
      if (cursor < opensAt) cursor = opensAt;
      if (cursor > closesAt) {
        throw new BadRequestException({
          code: 'DELIVERY_WINDOW_VIOLATION',
          message: `Planned arrival at '${outlet.name}' falls outside its receiving window`,
          details: { plannedArrival: cursor, closesAt },
        });
      }
      arrivals.push(cursor);
      cursor = new Date(cursor.getTime() + Math.ceil(Number(outlet.serviceTimeMinutes)) * 60_000);
      originId = outlet.id;
      origin = outlet;
    }

    const returnLeg = await this.matrixLeg(originId, origin, depot.id, depot);
    distanceKm += returnLeg.distanceKm;
    cursor = new Date(cursor.getTime() + returnLeg.durationMin * 60_000);
    const durationMin = Math.ceil((cursor.getTime() - departureAt.getTime()) / 60_000);
    const efficiency = Number(vehicle.fuelEfficiencyKmPerL);
    if (efficiency <= 0) throw new BadRequestException('Vehicle fuel efficiency must be greater than zero');
    return {
      distanceKm,
      durationMin,
      fuelLitres: distanceKm / efficiency,
      departureAt,
      returnAt: cursor,
      arrivals,
    };
  }

  private async getOrCreateDraftVersion(dto: CreatePlanDto, userId?: string) {
    let plan = await this.db.query.deliveryPlans.findFirst({
      where: and(
        eq(schema.deliveryPlans.depotId, dto.depotId),
        eq(schema.deliveryPlans.operatingDate, dto.operatingDate),
      ),
    });
    if (!plan) {
      return this.db.transaction(async (tx) => {
        const [createdPlan] = await tx.insert(schema.deliveryPlans).values({
          depotId: dto.depotId,
          operatingDate: dto.operatingDate,
          createdBy: userId,
        }).returning();
        const [version] = await tx.insert(schema.planVersions).values({
          planId: createdPlan.id,
          versionNumber: 1,
          createdBy: userId,
        }).returning();
        return { plan: createdPlan, version };
      });
    }
    const versions = await this.db.query.planVersions.findMany({
      where: eq(schema.planVersions.planId, plan.id),
      orderBy: [desc(schema.planVersions.versionNumber)],
    });
    const editable = versions.find((version) => version.status === 'DRAFT' || version.status === 'VALIDATED');
    if (!editable) {
      throw new ConflictException('This operating plan is already published. Create a controlled revision before editing it.');
    }
    return { plan, version: editable };
  }

  async createPlan(dto: CreatePlanDto, userId?: string) {
    const depot = await this.db.query.depots.findFirst({ where: eq(schema.depots.id, dto.depotId) });
    if (!depot?.isActive) throw new NotFoundException('Depot not found or inactive');
    const result = await this.getOrCreateDraftVersion(dto, userId);
    await this.auditService?.record({
      actorId: userId,
      actorRole: 'dispatcher',
      action: 'plan.created',
      entity: 'plan_version',
      entityId: result.version.id,
      afterState: result.version,
    });
    return result;
  }

  private async resolveDraftVersion(dto: PlanTripDto, userId?: string) {
    if (!dto.planVersionId) {
      return (await this.getOrCreateDraftVersion({ depotId: dto.depotId, operatingDate: dto.operatingDate }, userId)).version;
    }
    const version = await this.db.query.planVersions.findFirst({
      where: eq(schema.planVersions.id, dto.planVersionId),
    });
    if (!version || !['DRAFT', 'VALIDATED'].includes(version.status)) {
      throw new ConflictException('Trips can only be changed on an editable plan version');
    }
    const plan = await this.db.query.deliveryPlans.findFirst({ where: eq(schema.deliveryPlans.id, version.planId) });
    if (!plan || plan.depotId !== dto.depotId || plan.operatingDate !== dto.operatingDate) {
      throw new BadRequestException('Trip depot/date does not match the selected plan version');
    }
    return version;
  }

  async planTrip(dto: PlanTripDto, userId?: string) {
    const planVersion = await this.resolveDraftVersion(dto, userId);
    const [vehicle, driver, depot] = await Promise.all([
      this.db.query.vehicles.findFirst({ where: eq(schema.vehicles.id, dto.vehicleId) }),
      this.db.query.drivers.findFirst({ where: eq(schema.drivers.id, dto.driverId) }),
      this.db.query.depots.findFirst({ where: eq(schema.depots.id, dto.depotId) }),
    ]);
    if (!vehicle?.isActive) throw new NotFoundException('Designated vehicle not found or inactive');
    if (vehicle.status !== 'available') throw new ConflictException(`Vehicle is '${vehicle.status}' and cannot be allocated`);
    if (!driver?.isActive) throw new NotFoundException('Designated driver not found or inactive');
    if (driver.status !== 'available') throw new ConflictException(`Driver is '${driver.status}' and cannot be allocated`);
    if (!depot?.isActive) throw new NotFoundException('Designated depot not found or inactive');
    if (vehicle.depotId !== dto.depotId || driver.depotId !== dto.depotId) {
      throw new BadRequestException('Vehicle, driver, and trip must belong to the same depot');
    }

    const [existingVehicleTrips, existingDriverTrips, orderRecords] = await Promise.all([
      this.db.query.trips.findMany({
        where: and(
          eq(schema.trips.vehicleId, dto.vehicleId),
          eq(schema.trips.operatingDate, dto.operatingDate),
          eq(schema.trips.planVersionId, planVersion.id),
          ne(schema.trips.status, 'CANCELLED'),
        ),
        orderBy: [desc(schema.trips.tripSequenceInDay)],
      }),
      this.db.query.trips.findMany({
        where: and(
          eq(schema.trips.driverId, dto.driverId),
          eq(schema.trips.operatingDate, dto.operatingDate),
          eq(schema.trips.planVersionId, planVersion.id),
          ne(schema.trips.status, 'CANCELLED'),
        ),
      }),
      this.db.query.orders.findMany({
        where: inArray(schema.orders.id, dto.orderIds),
        with: { outlet: true },
      }),
    ]);
    if (existingDriverTrips.length >= 2) throw new ConflictException('Driver already has two trips on this operating day');
    if (orderRecords.length !== dto.orderIds.length) throw new NotFoundException('One or more orders were not found');
    for (const order of orderRecords) {
      if (!['ORDER_RECORDED', 'QUEUED_NEXT_RUN', 'DISPATCH_PENDING'].includes(order.status)) {
        throw new ConflictException(`Order #${order.orderNumber} cannot be planned from status '${order.status}'`);
      }
      if (order.orderDate !== dto.operatingDate) {
        throw new BadRequestException(`Order #${order.orderNumber} is scheduled for ${order.orderDate}, not ${dto.operatingDate}`);
      }
    }

    const orderMap = new Map(orderRecords.map((order) => [order.id, order]));
    const sequenced = dto.orderIds.map((id) => orderMap.get(id) as OrderWithOutlet);
    const previousReturn = existingVehicleTrips
      .map((trip) => trip.plannedReturnTime)
      .filter((value): value is Date => Boolean(value))
      .sort((left, right) => right.getTime() - left.getTime())[0];
    const earliestDeparture = previousReturn ? new Date(previousReturn.getTime() + 30 * 60_000) : undefined;
    const estimate = await this.estimateRoute(
      depot,
      sequenced,
      vehicle,
      dto.operatingDate,
      dto.plannedDepartureTime,
      earliestDeparture,
    );

    const sameBudgetPriorMinutes = existingVehicleTrips
      .filter((trip) => (dto.brand === 'Fresh' ? trip.brand === 'Fresh' : trip.brand !== 'Fresh'))
      .reduce((sum, trip) => sum + trip.plannedDurationMin, 0);
    FeasibilityRulesEngine.assertValid({
      vehicle,
      driverId: dto.driverId,
      brand: dto.brand,
      district: dto.district,
      operatingDate: dto.operatingDate,
      ordersWithOutlets: sequenced.map((order) => ({ order, outlet: order.outlet })),
      plannedDurationMin: estimate.durationMin,
      priorTripsForVehicleToday: existingVehicleTrips.length,
      priorDrivingMinutesForVehicleToday: sameBudgetPriorMinutes,
    });
    const remainingFuel = Number(vehicle.weeklyFuelQuotaL) - Number(vehicle.weekToDateFuelUsedL);
    if (Number(vehicle.weeklyFuelQuotaL) > 0 && estimate.fuelLitres > remainingFuel) {
      throw new BadRequestException({
        code: 'FUEL_QUOTA_EXCEEDED',
        message: `Trip needs ${estimate.fuelLitres.toFixed(1)} L but only ${remainingFuel.toFixed(1)} L remains in the weekly quota`,
      });
    }

    const totalWeight = sequenced.reduce((sum, order) => sum + Number(order.totalWeightKg), 0);
    const totalVolume = sequenced.reduce((sum, order) => sum + Number(order.totalVolumeM3), 0);
    const tripSequenceInDay = existingVehicleTrips.length + 1;
    const tripNumber = `TRIP-${dto.operatingDate}-${dto.district.slice(0, 3).toUpperCase()}-T${tripSequenceInDay}-${crypto.randomUUID().slice(0, 6).toUpperCase()}`;

    const result = await this.db.transaction(async (tx) => {
      const [trip] = await tx.insert(schema.trips).values({
        tripNumber,
        planVersionId: planVersion.id,
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
        plannedDurationMin: estimate.durationMin,
        plannedDistanceKm: estimate.distanceKm.toFixed(2),
        plannedFuelLitres: estimate.fuelLitres.toFixed(2),
        plannedDepartureTime: estimate.departureAt,
        plannedReturnTime: estimate.returnAt,
      }).returning();
      const stops = await tx.insert(schema.tripStops).values(sequenced.map((order, index) => ({
        tripId: trip.id,
        orderId: order.id,
        outletId: order.outlet.id,
        stopSequence: index + 1,
        loadingSequence: sequenced.length - index,
        plannedArrivalTime: estimate.arrivals[index],
        status: 'PENDING' as const,
      }))).returning();
      await tx.update(schema.orders).set({ status: 'ASSIGNED', updatedAt: new Date() }).where(inArray(schema.orders.id, dto.orderIds));
      return { ...trip, vehicle, driver, stops };
    });
    await this.auditService?.record({
      actorId: userId,
      actorRole: 'dispatcher',
      action: 'order.allocated',
      entity: 'trip',
      entityId: result.id,
      afterState: { planVersionId: planVersion.id, orderIds: dto.orderIds, estimate },
    });
    return result;
  }

  async updateTrip(tripId: string, dto: UpdateTripDto, userId?: string) {
    const trip = await this.db.query.trips.findFirst({
      where: eq(schema.trips.id, tripId),
      with: { stops: true },
    });
    if (!trip) throw new NotFoundException('Trip not found');
    if (trip.status !== 'PLANNED' || !trip.planVersionId) {
      throw new ConflictException('Only a trip in an editable plan revision can be changed');
    }
    const version = await this.db.query.planVersions.findFirst({
      where: eq(schema.planVersions.id, trip.planVersionId),
    });
    if (!version || !['DRAFT', 'VALIDATED'].includes(version.status)) {
      throw new ConflictException('Create a controlled revision before changing a published trip');
    }

    const vehicleId = dto.vehicleId ?? trip.vehicleId;
    const driverId = dto.driverId ?? trip.driverId;
    const orderIds = dto.orderIds ?? [...trip.stops]
      .sort((left, right) => left.stopSequence - right.stopSequence)
      .map((stop) => stop.orderId);
    const [vehicle, driver, depot, orderRecords, versionTrips, occupiedStops] = await Promise.all([
      this.db.query.vehicles.findFirst({ where: eq(schema.vehicles.id, vehicleId) }),
      this.db.query.drivers.findFirst({ where: eq(schema.drivers.id, driverId) }),
      this.db.query.depots.findFirst({ where: eq(schema.depots.id, trip.depotId) }),
      this.db.query.orders.findMany({ where: inArray(schema.orders.id, orderIds), with: { outlet: true } }),
      this.db.query.trips.findMany({
        where: and(eq(schema.trips.planVersionId, trip.planVersionId), ne(schema.trips.id, tripId), ne(schema.trips.status, 'CANCELLED')),
      }),
      this.db.query.tripStops.findMany({ where: inArray(schema.tripStops.orderId, orderIds) }),
    ]);
    if (!vehicle?.isActive || vehicle.status !== 'available') throw new ConflictException('The selected vehicle is unavailable');
    if (!driver?.isActive || driver.status !== 'available') throw new ConflictException('The selected driver is unavailable');
    if (!depot?.isActive) throw new NotFoundException('Trip depot is unavailable');
    if (vehicle.depotId !== trip.depotId || driver.depotId !== trip.depotId) {
      throw new BadRequestException('Vehicle, driver, and trip must belong to the same depot');
    }
    if (orderRecords.length !== orderIds.length) throw new NotFoundException('One or more orders were not found');
    const otherVersionTripIds = new Set(versionTrips.map((candidate) => candidate.id));
    if (occupiedStops.some((stop) => otherVersionTripIds.has(stop.tripId))) {
      throw new ConflictException('One or more orders are already assigned to another trip');
    }
    const selected = new Map(orderRecords.map((order) => [order.id, order]));
    const sequenced = orderIds.map((id) => selected.get(id) as OrderWithOutlet);
    for (const order of sequenced) {
      if (order.orderDate !== trip.operatingDate || order.outlet.depotId !== trip.depotId) {
        throw new BadRequestException(`Order #${order.orderNumber} does not belong to this depot and operating day`);
      }
      if (order.brand !== trip.brand || order.outlet.district !== trip.district) {
        throw new BadRequestException('Every stop must keep the trip’s brand and district grouping');
      }
      if (!['ASSIGNED', 'ORDER_RECORDED', 'QUEUED_NEXT_RUN', 'DISPATCH_PENDING'].includes(order.status)) {
        throw new ConflictException(`Order #${order.orderNumber} cannot be assigned from status '${order.status}'`);
      }
    }
    const vehicleTrips = versionTrips.filter((candidate) => candidate.vehicleId === vehicleId);
    const driverTrips = versionTrips.filter((candidate) => candidate.driverId === driverId);
    if (vehicleTrips.length >= 2) throw new ConflictException('Vehicle already has two trips in this plan version');
    if (driverTrips.length >= 2) throw new ConflictException('Driver already has two trips in this plan version');
    const previousReturn = vehicleTrips
      .map((candidate) => candidate.plannedReturnTime)
      .filter((value): value is Date => Boolean(value))
      .sort((left, right) => right.getTime() - left.getTime())[0];
    const estimate = await this.estimateRoute(
      depot,
      sequenced,
      vehicle,
      trip.operatingDate,
      dto.plannedDepartureTime ?? trip.plannedDepartureTime?.toISOString(),
      previousReturn ? new Date(previousReturn.getTime() + 30 * 60_000) : undefined,
    );
    const sameBudgetMinutes = vehicleTrips
      .filter((candidate) => (trip.brand === 'Fresh' ? candidate.brand === 'Fresh' : candidate.brand !== 'Fresh'))
      .reduce((sum, candidate) => sum + candidate.plannedDurationMin, 0);
    FeasibilityRulesEngine.assertValid({
      vehicle,
      driverId,
      brand: trip.brand,
      district: trip.district,
      operatingDate: trip.operatingDate,
      ordersWithOutlets: sequenced.map((order) => ({ order, outlet: order.outlet })),
      plannedDurationMin: estimate.durationMin,
      priorTripsForVehicleToday: vehicleTrips.length,
      priorDrivingMinutesForVehicleToday: sameBudgetMinutes,
    });
    const otherFuel = vehicleTrips.reduce((sum, candidate) => sum + Number(candidate.plannedFuelLitres), 0);
    const remainingFuel = Number(vehicle.weeklyFuelQuotaL) - Number(vehicle.weekToDateFuelUsedL);
    if (Number(vehicle.weeklyFuelQuotaL) > 0 && estimate.fuelLitres + otherFuel > remainingFuel) {
      throw new BadRequestException('The revised route exceeds the vehicle’s remaining weekly fuel quota');
    }

    const currentOrderIds = trip.stops.map((stop) => stop.orderId);
    const removedOrderIds = currentOrderIds.filter((id) => !orderIds.includes(id));
    const totalWeight = sequenced.reduce((sum, order) => sum + Number(order.totalWeightKg), 0);
    const totalVolume = sequenced.reduce((sum, order) => sum + Number(order.totalVolumeM3), 0);
    const sequenceInDay = vehicleId === trip.vehicleId ? trip.tripSequenceInDay : vehicleTrips.length + 1;
    const updated = await this.db.transaction(async (tx) => {
      await tx.delete(schema.tripStops).where(eq(schema.tripStops.tripId, tripId));
      const [updatedTrip] = await tx.update(schema.trips).set({
        vehicleId,
        driverId,
        tripSequenceInDay: sequenceInDay,
        totalWeightKg: totalWeight.toFixed(2),
        totalVolumeM3: totalVolume.toFixed(2),
        plannedDurationMin: estimate.durationMin,
        plannedDistanceKm: estimate.distanceKm.toFixed(2),
        plannedFuelLitres: estimate.fuelLitres.toFixed(2),
        plannedDepartureTime: estimate.departureAt,
        plannedReturnTime: estimate.returnAt,
        updatedAt: new Date(),
      }).where(eq(schema.trips.id, tripId)).returning();
      const stops = await tx.insert(schema.tripStops).values(sequenced.map((order, index) => ({
        tripId,
        orderId: order.id,
        outletId: order.outlet.id,
        stopSequence: index + 1,
        loadingSequence: sequenced.length - index,
        plannedArrivalTime: estimate.arrivals[index],
        status: 'PENDING' as const,
      }))).returning();
      if (removedOrderIds.length) {
        await tx.update(schema.orders).set({ status: 'ORDER_RECORDED', updatedAt: new Date() }).where(inArray(schema.orders.id, removedOrderIds));
      }
      await tx.update(schema.orders).set({ status: 'ASSIGNED', updatedAt: new Date() }).where(inArray(schema.orders.id, orderIds));
      return { ...updatedTrip, stops };
    });
    await this.auditService?.record({
      actorId: userId,
      actorRole: 'dispatcher',
      action: 'trip.updated',
      entity: 'trip',
      entityId: tripId,
      beforeState: { vehicleId: trip.vehicleId, driverId: trip.driverId, orderIds: currentOrderIds },
      afterState: { vehicleId, driverId, orderIds, estimate },
    });
    return updated;
  }

  async removeTrip(tripId: string, userId?: string) {
    const trip = await this.db.query.trips.findFirst({
      where: eq(schema.trips.id, tripId),
      with: { stops: true },
    });
    if (!trip) throw new NotFoundException('Trip not found');
    if (trip.status !== 'PLANNED' || !trip.planVersionId) {
      throw new ConflictException('Only an editable draft trip can be removed');
    }
    const version = await this.db.query.planVersions.findFirst({ where: eq(schema.planVersions.id, trip.planVersionId) });
    if (!version || !['DRAFT', 'VALIDATED'].includes(version.status)) {
      throw new ConflictException('Create a controlled revision before removing a published trip');
    }
    await this.db.transaction(async (tx) => {
      if (trip.stops.length) {
        await tx.update(schema.orders).set({ status: 'ORDER_RECORDED', updatedAt: new Date() }).where(inArray(schema.orders.id, trip.stops.map((stop) => stop.orderId)));
      }
      await tx.delete(schema.trips).where(eq(schema.trips.id, tripId));
    });
    await this.auditService?.record({
      actorId: userId,
      actorRole: 'dispatcher',
      action: 'trip.removed',
      entity: 'trip',
      entityId: tripId,
      beforeState: trip,
    });
    return { removed: true, tripId };
  }

  async validatePlan(versionId: string, userId?: string) {
    const version = await this.db.query.planVersions.findFirst({ where: eq(schema.planVersions.id, versionId) });
    if (!version) throw new NotFoundException('Plan version not found');
    if (version.status === 'PUBLISHED') return version;
    if (!['DRAFT', 'VALIDATED'].includes(version.status)) throw new ConflictException('This plan version is not editable');
    const trips = await this.db.query.trips.findMany({ where: eq(schema.trips.planVersionId, versionId) });
    if (!trips.length) throw new BadRequestException('A plan must contain at least one trip before validation');
    if (trips.some((trip) => trip.status !== 'PLANNED')) throw new ConflictException('Every draft trip must be in PLANNED state');
    const [updated] = await this.db.update(schema.planVersions).set({
      status: 'VALIDATED',
      validatedAt: new Date(),
      updatedAt: new Date(),
    }).where(eq(schema.planVersions.id, versionId)).returning();
    await this.auditService?.record({
      actorId: userId,
      actorRole: 'dispatcher',
      action: 'plan.validated',
      entity: 'plan_version',
      entityId: versionId,
      beforeState: { status: version.status },
      afterState: { status: updated.status },
    });
    return updated;
  }

  async publishPlan(versionId: string, userId?: string) {
    let version = await this.db.query.planVersions.findFirst({ where: eq(schema.planVersions.id, versionId) });
    if (!version) throw new NotFoundException('Plan version not found');
    if (version.status === 'PUBLISHED') return version;
    if (version.status === 'DRAFT') version = await this.validatePlan(versionId, userId);
    if (version.status !== 'VALIDATED') throw new ConflictException('Only a validated plan can be published');
    const trips = await this.db.query.trips.findMany({
      where: eq(schema.trips.planVersionId, versionId),
      with: { stops: true },
    });
    const plan = await this.db.query.deliveryPlans.findFirst({ where: eq(schema.deliveryPlans.id, version.planId) });
    if (!plan) throw new NotFoundException('Plan not found');
    const publishedVersions = await this.db.query.planVersions.findMany({
      where: and(eq(schema.planVersions.planId, plan.id), eq(schema.planVersions.status, 'PUBLISHED')),
    });
    const now = new Date();
    const published = await this.db.transaction(async (tx) => {
      if (publishedVersions.length) {
        const oldIds = publishedVersions.map((item) => item.id);
        await tx.update(schema.planVersions).set({ status: 'SUPERSEDED', updatedAt: now }).where(inArray(schema.planVersions.id, oldIds));
        await tx.update(schema.trips).set({ status: 'CANCELLED', updatedAt: now }).where(and(
          inArray(schema.trips.planVersionId, oldIds),
          inArray(schema.trips.status, ['PLANNED', 'LOCKED', 'LOADING', 'MANIFEST_ISSUED', 'CLEARED', 'DRIVER_READY']),
        ));
      }
      const [updated] = await tx.update(schema.planVersions).set({
        status: 'PUBLISHED',
        publishedBy: userId,
        publishedAt: now,
        updatedAt: now,
      }).where(eq(schema.planVersions.id, versionId)).returning();
      await tx.update(schema.trips).set({ status: 'LOCKED', updatedAt: now }).where(eq(schema.trips.planVersionId, versionId));
      await tx.insert(schema.loadingManifests).values(trips.map((trip) => ({
        tripId: trip.id,
        planVersionId: versionId,
        manifestVersion: version.versionNumber,
        status: 'PENDING' as const,
        expectedWeightKg: trip.totalWeightKg,
        expectedVolumeM3: trip.totalVolumeM3,
      })));
      return updated;
    });

    if (this.notificationsService) {
      const driverProfiles = await this.db.query.drivers.findMany({
        where: inArray(schema.drivers.id, [...new Set(trips.map((trip) => trip.driverId))]),
      });
      const outletIds = [...new Set(trips.flatMap((trip) => trip.stops.map((stop) => stop.outletId)))];
      const roleRecipients = await this.notificationsService.usersForRoles(['loader', 'store_manager'], {
        depotId: plan.depotId,
        outletIds,
      });
      await this.notificationsService.create({
        userIds: [...roleRecipients, ...driverProfiles.map((driver) => driver.userId)],
        type: 'PLAN_PUBLISHED',
        title: 'Delivery plan published',
        message: `Plan version ${version.versionNumber} for ${plan.operatingDate} is now operational.`,
        entityType: 'plan_version',
        entityId: versionId,
        payload: { operatingDate: plan.operatingDate, depotId: plan.depotId },
      });
    }
    await this.auditService?.record({
      actorId: userId,
      actorRole: 'dispatcher',
      action: 'plan.published',
      entity: 'plan_version',
      entityId: versionId,
      beforeState: { status: version.status },
      afterState: published,
    });
    return published;
  }

  async revisePlan(versionId: string, dto: RevisePlanDto, userId?: string) {
    const source = await this.db.query.planVersions.findFirst({ where: eq(schema.planVersions.id, versionId) });
    if (!source || source.status !== 'PUBLISHED') throw new ConflictException('Only a published plan can be revised');
    const existing = await this.db.query.planVersions.findMany({
      where: eq(schema.planVersions.planId, source.planId),
      orderBy: [desc(schema.planVersions.versionNumber)],
    });
    if (existing.some((version) => version.status === 'DRAFT' || version.status === 'VALIDATED')) {
      throw new ConflictException('An editable revision already exists for this plan');
    }
    const sourceTrips = await this.db.query.trips.findMany({
      where: eq(schema.trips.planVersionId, versionId),
      with: { stops: true },
    });
    const revisableStatuses: schema.Trip['status'][] = ['PLANNED', 'LOCKED', 'LOADING', 'MANIFEST_ISSUED', 'CLEARED', 'DRIVER_READY'];
    if (sourceTrips.some((trip) => !revisableStatuses.includes(trip.status))) {
      throw new ConflictException('A plan cannot be cloned for revision once a trip has departed or completed');
    }
    const sourcePlan = await this.db.query.deliveryPlans.findFirst({ where: eq(schema.deliveryPlans.id, source.planId) });
    if (!sourcePlan) throw new NotFoundException('Delivery plan not found');
    const nextNumber = (existing[0]?.versionNumber ?? source.versionNumber) + 1;
    const now = new Date();
    const result = await this.db.transaction(async (tx) => {
      if (sourceTrips.length) {
        const invalidated = await tx.update(schema.trips).set({
          status: 'LOCKED', gatePassToken: null, gateClearedAt: null, gateClearedBy: null,
          driverReadyAt: null, driverChecklist: null, updatedAt: now,
        }).where(and(
          eq(schema.trips.planVersionId, source.id),
          inArray(schema.trips.status, revisableStatuses),
        )).returning({ id: schema.trips.id });
        if (invalidated.length !== sourceTrips.length) {
          throw new ConflictException('Trip execution changed while the revision was being created. Refresh the plan.');
        }
      }
      const [revision] = await tx.insert(schema.planVersions).values({
        planId: source.planId,
        versionNumber: nextNumber,
        status: 'DRAFT',
        revisionReason: dto.reason,
        supersedesVersionId: source.id,
        createdBy: userId,
      }).returning();
      for (const sourceTrip of sourceTrips) {
        const [trip] = await tx.insert(schema.trips).values({
          tripNumber: `${sourceTrip.tripNumber}-R${nextNumber}`,
          planVersionId: revision.id,
          depotId: sourceTrip.depotId,
          vehicleId: sourceTrip.vehicleId,
          driverId: sourceTrip.driverId,
          brand: sourceTrip.brand,
          district: sourceTrip.district,
          operatingDate: sourceTrip.operatingDate,
          tripSequenceInDay: sourceTrip.tripSequenceInDay,
          status: 'PLANNED',
          totalWeightKg: sourceTrip.totalWeightKg,
          totalVolumeM3: sourceTrip.totalVolumeM3,
          plannedDurationMin: sourceTrip.plannedDurationMin,
          plannedDistanceKm: sourceTrip.plannedDistanceKm,
          plannedFuelLitres: sourceTrip.plannedFuelLitres,
          plannedDepartureTime: sourceTrip.plannedDepartureTime,
          plannedReturnTime: sourceTrip.plannedReturnTime,
        }).returning();
        if (sourceTrip.stops.length) {
          await tx.insert(schema.tripStops).values(sourceTrip.stops.map((stop) => ({
            tripId: trip.id,
            orderId: stop.orderId,
            outletId: stop.outletId,
            stopSequence: stop.stopSequence,
            loadingSequence: stop.loadingSequence,
            plannedArrivalTime: stop.plannedArrivalTime,
            status: 'PENDING' as const,
          })));
        }
      }
      await tx.update(schema.loadingManifests).set({ status: 'STALE', staleAt: now, updatedAt: now }).where(eq(schema.loadingManifests.planVersionId, source.id));
      return revision;
    });
    if (this.notificationsService) {
      const driverProfiles = sourceTrips.length
        ? await this.db.query.drivers.findMany({ where: inArray(schema.drivers.id, [...new Set(sourceTrips.map((trip) => trip.driverId))]) })
        : [];
      const outletIds = [...new Set(sourceTrips.flatMap((trip) => trip.stops.map((stop) => stop.outletId)))];
      const roleRecipients = await this.notificationsService.usersForRoles(['loader', 'store_manager'], {
        depotId: sourcePlan.depotId,
        outletIds,
      });
      await this.notificationsService.create({
        userIds: [...roleRecipients, ...driverProfiles.map((driver) => driver.userId)],
        type: 'PLAN_REVISED',
        title: 'Published plan is being revised',
        message: 'Previous loading verification is stale. Wait for the new published manifest.',
        entityType: 'plan_version',
        entityId: result.id,
        payload: { supersedesVersionId: source.id, reason: dto.reason },
      });
    }
    await this.auditService?.record({
      actorId: userId,
      actorRole: 'dispatcher',
      action: 'plan.revised',
      entity: 'plan_version',
      entityId: result.id,
      beforeState: source,
      afterState: result,
    });
    return result;
  }

  async deferOrder(dto: DeferOrderDto, userId?: string) {
    const order = await this.db.query.orders.findFirst({ where: eq(schema.orders.id, dto.orderId) });
    if (!order) throw new NotFoundException(`Order with ID '${dto.orderId}' not found`);
    if (!['ORDER_RECORDED', 'QUEUED_NEXT_RUN', 'DISPATCH_PENDING'].includes(order.status)) {
      throw new ConflictException(`Order cannot be deferred from status '${order.status}'`);
    }
    const today = new Date().toISOString().slice(0, 10);
    const [updated] = await this.db.update(schema.orders).set({
      deferredCount: order.deferredCount + 1,
      lastDeferredDate: today,
      deferralReasonCode: dto.reasonCode,
      deferralReason: dto.deferralReason,
      status: 'QUEUED_NEXT_RUN',
      updatedAt: new Date(),
    }).where(eq(schema.orders.id, dto.orderId)).returning();
    await this.auditService?.record({
      actorId: userId,
      actorRole: 'dispatcher',
      action: 'order.deferred',
      entity: 'order',
      entityId: order.id,
      beforeState: { status: order.status, deferredCount: order.deferredCount },
      afterState: { status: updated.status, deferredCount: updated.deferredCount, reasonCode: dto.reasonCode },
    });
    if (this.notificationsService) {
      const storeUsers = await this.notificationsService.usersForRoles(['store_manager'], { outletIds: [order.outletId] });
      await this.notificationsService.create({
        userIds: storeUsers,
        type: 'ORDER_DEFERRED',
        title: 'Order deferred',
        message: dto.deferralReason,
        entityType: 'order',
        entityId: order.id,
        payload: { reasonCode: dto.reasonCode, deferredCount: updated.deferredCount },
      });
    }
    return updated;
  }

  async reinstateOrder(orderId: string, userId?: string) {
    const order = await this.db.query.orders.findFirst({ where: eq(schema.orders.id, orderId) });
    if (!order) throw new NotFoundException('Order not found');
    if (order.status !== 'QUEUED_NEXT_RUN' || order.deferredCount < 1) {
      throw new ConflictException('Only a dispatcher-deferred order can be returned to the planning backlog');
    }
    const [updated] = await this.db.update(schema.orders).set({
      status: 'ORDER_RECORDED',
      deferralReasonCode: null,
      deferralReason: null,
      updatedAt: new Date(),
    }).where(eq(schema.orders.id, orderId)).returning();
    await this.auditService?.record({
      actorId: userId,
      actorRole: 'dispatcher',
      action: 'order.reinstated',
      entity: 'order',
      entityId: orderId,
      beforeState: { status: order.status },
      afterState: { status: updated.status },
    });
    return updated;
  }

  async listTrips(filter: TripFilterDto, user?: RequestUser) {
    if (user?.role === 'loader' && !user.depotId) {
      throw new ForbiddenException('Loaders require an assigned depot to view trips');
    }
    const conditions: SQL<unknown>[] = [];
    if (filter.operatingDate) conditions.push(eq(schema.trips.operatingDate, filter.operatingDate));
    if (filter.brand) conditions.push(eq(schema.trips.brand, filter.brand));
    if (filter.district) conditions.push(eq(schema.trips.district, filter.district));
    if (filter.status) conditions.push(eq(schema.trips.status, filter.status as typeof schema.trips.status.enumValues[number]));
    if (filter.depotId) conditions.push(eq(schema.trips.depotId, filter.depotId));
    if (user?.role === 'loader' && user.depotId) conditions.push(eq(schema.trips.depotId, user.depotId));
    const whereClause = conditions.length ? and(...conditions) : undefined;
    const data = await this.db.query.trips.findMany({
      where: whereClause,
      limit: filter.limit,
      offset: filter.offset,
      orderBy: [desc(schema.trips.createdAt)],
      with: {
        planVersion: true,
        vehicle: true,
        driver: { with: { user: true } },
        depot: true,
        stops: { with: { outlet: true, order: true } },
      },
    });
    const [countResult] = await this.db.select({ count: sql<number>`count(*)::int` }).from(schema.trips).where(whereClause);
    return {
      data: data.map((trip) => this.safeTrip(trip)),
      meta: {
        total: countResult?.count ?? 0,
        page: filter.page ?? 1,
        limit: filter.limit ?? 20,
        totalPages: Math.ceil((countResult?.count ?? 0) / (filter.limit ?? 20)),
      },
    };
  }

  async getTripById(tripId: string, user?: RequestUser) {
    const trip = await this.db.query.trips.findFirst({
      where: eq(schema.trips.id, tripId),
      with: {
        vehicle: true,
        driver: { with: { user: true } },
        depot: true,
        loadingManifests: { with: { exceptions: true } },
        stops: {
          with: {
            outlet: true,
            order: { with: { items: { with: { product: true } } } },
            proofOfDelivery: true,
            receipt: true,
          },
        },
      },
    });
    if (!trip) throw new NotFoundException(`Trip with ID '${tripId}' not found`);
    if (user?.role === 'loader' && (!user.depotId || trip.depotId !== user.depotId)) {
      throw new ForbiddenException('Loaders can only view trips for their assigned depot');
    }
    if (user?.role === 'driver' && trip.driver.userId !== user.id) {
      throw new ForbiddenException('Drivers can only view their assigned trips');
    }
    return this.safeTrip(trip);
  }

  async lockTrip(tripId: string, userId?: string) {
    const trip = await this.db.query.trips.findFirst({ where: eq(schema.trips.id, tripId) });
    if (!trip) throw new NotFoundException(`Trip with ID '${tripId}' not found`);
    if (trip.status !== 'PLANNED') throw new BadRequestException(`Trip cannot be locked from status '${trip.status}'`);
    const [updated] = await this.db.update(schema.trips).set({ status: 'LOCKED', updatedAt: new Date() }).where(eq(schema.trips.id, tripId)).returning();
    await this.auditService?.record({
      actorId: userId,
      actorRole: 'dispatcher',
      action: 'trip.locked',
      entity: 'trip',
      entityId: tripId,
      beforeState: { status: trip.status },
      afterState: { status: updated.status },
    });
    return updated;
  }

  private safeTrip<T extends { driver?: { user?: typeof schema.users.$inferSelect | null } | null }>(trip: T) {
    if (!trip.driver?.user) return trip;
    const { passwordHash: _passwordHash, ...safeUser } = trip.driver.user;
    return { ...trip, driver: { ...trip.driver, user: safeUser } };
  }
}
