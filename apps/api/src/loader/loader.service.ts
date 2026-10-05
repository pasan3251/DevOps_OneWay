import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import { and, asc, desc, eq, inArray } from 'drizzle-orm';
import { randomUUID } from 'crypto';
import { AuditService } from '../audit/audit.service';
import { RequestUser } from '../common/decorators/current-user.decorator';
import { NotificationsService } from '../communications/notifications.service';
import { DRIZZLE_ORM, DrizzleDb } from '../database/database.module';
import * as schema from '../database/schema';
import {
  GateClearanceDto,
  ReportLoadingDiscrepancyDto,
  ResolveLoadingExceptionDto,
  VerifyManifestDto,
} from './dto/loader.dto';

@Injectable()
export class LoaderService {
  constructor(
    @Inject(DRIZZLE_ORM) private readonly db: DrizzleDb,
    @Optional() private readonly auditService?: AuditService,
    @Optional() private readonly notificationsService?: NotificationsService,
  ) {}

  private async manifestForTrip(tripId: string) {
    const manifests = await this.db.query.loadingManifests.findMany({
      where: eq(schema.loadingManifests.tripId, tripId),
      orderBy: [desc(schema.loadingManifests.manifestVersion)],
    });
    const manifest = manifests.find((item) => item.status !== 'STALE');
    if (!manifest) throw new ConflictException('No current published loading manifest exists for this trip');
    return manifest;
  }

  private assertScope(depotId: string, user?: RequestUser) {
    if (user?.role === 'loader' && (!user.depotId || user.depotId !== depotId)) {
      throw new ForbiddenException('Loaders can only access manifests for their assigned depot');
    }
  }

  async listPublishedManifests(user?: RequestUser) {
    const manifests = await this.db.query.loadingManifests.findMany({
      where: inArray(schema.loadingManifests.status, ['PENDING', 'VERIFIED', 'EXCEPTION', 'RESOLVED', 'CLEARED']),
      orderBy: [desc(schema.loadingManifests.createdAt)],
    });
    if (!manifests.length) return [];
    const trips = await this.db.query.trips.findMany({
      where: inArray(schema.trips.id, manifests.map((manifest) => manifest.tripId)),
      with: {
        vehicle: true,
        driver: { with: { user: true } },
        depot: true,
        stops: {
          orderBy: [asc(schema.tripStops.stopSequence)],
          with: {
            outlet: true,
            order: { with: { items: { with: { product: true } } } },
          },
        },
      },
    });
    return manifests.flatMap((manifest) => {
      const trip = trips.find((item) => item.id === manifest.tripId);
      if (!trip || (user?.role === 'loader' && trip.depotId !== user.depotId)) return [];
      const safeDriver = trip.driver?.user
        ? { ...trip.driver, user: this.safeUser(trip.driver.user) }
        : trip.driver;
      return [{ ...manifest, trip: { ...trip, driver: safeDriver } }];
    });
  }

  async getLoadingManifest(tripId: string, user?: RequestUser) {
    const manifest = await this.manifestForTrip(tripId);
    const trip = await this.db.query.trips.findFirst({
      where: eq(schema.trips.id, tripId),
      with: {
        vehicle: true,
        driver: { with: { user: true } },
        depot: true,
        stops: {
          orderBy: [asc(schema.tripStops.loadingSequence)],
          with: {
            outlet: true,
            order: { with: { items: { with: { product: true } } } },
          },
        },
      },
    });
    if (!trip) throw new NotFoundException(`Trip with ID '${tripId}' not found`);
    this.assertScope(trip.depotId, user);
    const exceptions = await this.db.query.loadingExceptions.findMany({
      where: eq(schema.loadingExceptions.manifestId, manifest.id),
      orderBy: [desc(schema.loadingExceptions.createdAt)],
    });
    return {
      ...trip,
      driver: trip.driver?.user ? { ...trip.driver, user: this.safeUser(trip.driver.user) } : trip.driver,
      manifest,
      loadingExceptions: exceptions,
    };
  }

  async verifyManifest(tripId: string, dto: VerifyManifestDto, user: RequestUser) {
    const trip = await this.db.query.trips.findFirst({ where: eq(schema.trips.id, tripId) });
    if (!trip) throw new NotFoundException('Trip not found');
    this.assertScope(trip.depotId, user);
    if (trip.status !== 'LOCKED' && trip.status !== 'LOADING') {
      throw new ConflictException(`Loading verification is not allowed from trip status '${trip.status}'`);
    }
    const manifest = await this.manifestForTrip(tripId);
    if (!['PENDING', 'RESOLVED'].includes(manifest.status)) {
      throw new ConflictException(`Manifest cannot be verified from status '${manifest.status}'`);
    }
    const openExceptions = await this.db.query.loadingExceptions.findMany({
      where: and(
        eq(schema.loadingExceptions.manifestId, manifest.id),
        eq(schema.loadingExceptions.status, 'OPEN'),
      ),
    });
    if (openExceptions.length) throw new ConflictException('Resolve every loading exception before verification');
    const now = new Date();
    const result = await this.db.transaction(async (tx) => {
      const [updatedManifest] = await tx.update(schema.loadingManifests).set({
        status: 'VERIFIED',
        verifiedBy: user.id,
        verifiedAt: now,
        verificationNotes: dto.notes ?? null,
        updatedAt: now,
      }).where(eq(schema.loadingManifests.id, manifest.id)).returning();
      await tx.update(schema.trips).set({ status: 'LOADING', updatedAt: now }).where(eq(schema.trips.id, tripId));
      return updatedManifest;
    });
    await this.auditService?.record({
      actorId: user.id,
      actorRole: user.role,
      action: 'loading.verified',
      entity: 'manifest',
      entityId: manifest.id,
      beforeState: { status: manifest.status },
      afterState: { status: result.status },
    });
    return result;
  }

  async reportShortfall(tripId: string, dto: ReportLoadingDiscrepancyDto, userId: string, user?: RequestUser) {
    const trip = await this.db.query.trips.findFirst({ where: eq(schema.trips.id, tripId) });
    if (!trip) throw new NotFoundException('Trip not found');
    this.assertScope(trip.depotId, user);
    if (!['LOCKED', 'LOADING'].includes(trip.status)) {
      throw new ConflictException(`Loading exceptions cannot be recorded from trip status '${trip.status}'`);
    }
    const manifest = await this.manifestForTrip(tripId);
    const stop = await this.db.query.tripStops.findFirst({
      where: and(eq(schema.tripStops.tripId, tripId), eq(schema.tripStops.orderId, dto.orderId)),
    });
    if (!stop || (dto.tripStopId && dto.tripStopId !== stop.id)) {
      throw new BadRequestException('The selected order is not part of this published manifest');
    }
    const order = await this.db.query.orders.findFirst({ where: eq(schema.orders.id, dto.orderId) });
    if (!order) throw new NotFoundException('Order not found');
    const now = new Date();
    const result = await this.db.transaction(async (tx) => {
      const [loadingException] = await tx.insert(schema.loadingExceptions).values({
        manifestId: manifest.id,
        tripStopId: stop.id,
        orderId: dto.orderId,
        type: dto.exceptionType ?? 'SHORTFALL',
        affectedSku: dto.affectedSku ?? null,
        affectedQuantity: dto.shortfallQty,
        notes: dto.notes,
        evidenceUrl: dto.evidenceUrl ?? null,
        reportedBy: userId,
      }).returning();
      await tx.update(schema.loadingManifests).set({ status: 'EXCEPTION', updatedAt: now }).where(eq(schema.loadingManifests.id, manifest.id));
      await tx.update(schema.trips).set({ status: 'LOADING', updatedAt: now }).where(eq(schema.trips.id, tripId));
      return loadingException;
    });
    await this.auditService?.record({
      actorId: userId,
      actorRole: user?.role ?? 'loader',
      action: 'loading.exception_created',
      entity: 'loading_exception',
      entityId: result.id,
      afterState: result,
    });
    if (this.notificationsService) {
      const recipients = await this.notificationsService.usersForRoles(['dispatcher', 'admin'], { depotId: trip.depotId });
      await this.notificationsService.create({
        userIds: recipients,
        type: 'LOADING_EXCEPTION',
        title: 'Loading exception requires resolution',
        message: dto.notes,
        entityType: 'loading_exception',
        entityId: result.id,
        payload: { tripId, orderId: order.id, affectedSku: dto.affectedSku },
      });
    }
    return result;
  }

  async resolveException(exceptionId: string, dto: ResolveLoadingExceptionDto, user: RequestUser) {
    const exception = await this.db.query.loadingExceptions.findFirst({
      where: eq(schema.loadingExceptions.id, exceptionId),
    });
    if (!exception) throw new NotFoundException('Loading exception not found');
    if (exception.status !== 'OPEN') throw new ConflictException('Loading exception is already resolved');
    const manifest = await this.db.query.loadingManifests.findFirst({
      where: eq(schema.loadingManifests.id, exception.manifestId),
    });
    if (!manifest) throw new NotFoundException('Manifest not found');
    const trip = await this.db.query.trips.findFirst({ where: eq(schema.trips.id, manifest.tripId) });
    if (!trip) throw new NotFoundException('Trip not found');
    this.assertScope(trip.depotId, user);
    const now = new Date();
    const [resolved] = await this.db.update(schema.loadingExceptions).set({
      status: 'RESOLVED',
      resolvedBy: user.id,
      resolution: dto.resolution,
      resolvedAt: now,
      updatedAt: now,
    }).where(eq(schema.loadingExceptions.id, exceptionId)).returning();
    const open = await this.db.query.loadingExceptions.findMany({
      where: and(
        eq(schema.loadingExceptions.manifestId, manifest.id),
        eq(schema.loadingExceptions.status, 'OPEN'),
      ),
    });
    if (!open.length) {
      await this.db.update(schema.loadingManifests).set({ status: 'RESOLVED', updatedAt: now }).where(eq(schema.loadingManifests.id, manifest.id));
    }
    await this.auditService?.record({
      actorId: user.id,
      actorRole: user.role,
      action: 'loading.exception_resolved',
      entity: 'loading_exception',
      entityId: exceptionId,
      beforeState: { status: exception.status },
      afterState: resolved,
    });
    return resolved;
  }

  async gateClearance(tripId: string, dto: GateClearanceDto, userId: string, user?: RequestUser) {
    const trip = await this.db.query.trips.findFirst({
      where: eq(schema.trips.id, tripId),
      with: { stops: true },
    });
    if (!trip) throw new NotFoundException(`Trip with ID '${tripId}' not found`);
    this.assertScope(trip.depotId, user);
    if (trip.status !== 'LOADING') {
      throw new ConflictException(`Departure clearance requires a verified loading state. Current status: '${trip.status}'`);
    }
    if (trip.tripSequenceInDay > 1) {
      const earlierTrips = await this.db.query.trips.findMany({
        where: and(
          eq(schema.trips.vehicleId, trip.vehicleId),
          eq(schema.trips.operatingDate, trip.operatingDate),
        ),
      });
      const blockingTrip = earlierTrips.find(
        (candidate) => candidate.tripSequenceInDay < trip.tripSequenceInDay && candidate.status !== 'COMPLETED',
      );
      if (blockingTrip) {
        throw new ConflictException('Trip 2 cannot receive departure clearance until the prior trip returns to depot');
      }
    }
    const manifest = await this.manifestForTrip(tripId);
    if (manifest.status !== 'VERIFIED') {
      throw new ConflictException(`Departure clearance requires a VERIFIED manifest, not '${manifest.status}'`);
    }
    const openExceptions = await this.db.query.loadingExceptions.findMany({
      where: and(
        eq(schema.loadingExceptions.manifestId, manifest.id),
        eq(schema.loadingExceptions.status, 'OPEN'),
      ),
    });
    if (openExceptions.length) throw new ConflictException('Open loading exceptions block departure clearance');
    const now = new Date();
    const gatePassToken = `GATE-${randomUUID().toUpperCase()}`;
    const result = await this.db.transaction(async (tx) => {
      const [updatedTrip] = await tx.update(schema.trips).set({
        status: 'CLEARED',
        gatePassToken,
        gateClearedBy: userId,
        gateClearedAt: now,
        updatedAt: now,
      }).where(eq(schema.trips.id, tripId)).returning();
      await tx.update(schema.loadingManifests).set({ status: 'CLEARED', clearedAt: now, updatedAt: now }).where(eq(schema.loadingManifests.id, manifest.id));
      if (trip.stops.length) {
        await tx.update(schema.orders).set({ status: 'LOADED', updatedAt: now }).where(inArray(schema.orders.id, trip.stops.map((stop) => stop.orderId)));
      }
      return updatedTrip;
    });
    await this.auditService?.record({
      actorId: userId,
      actorRole: user?.role ?? 'loader',
      action: 'departure.cleared',
      entity: 'trip',
      entityId: tripId,
      beforeState: { status: trip.status },
      afterState: { status: result.status, manifestId: manifest.id, sealNumber: dto.sealNumber },
    });
    if (this.notificationsService) {
      const driver = await this.db.query.drivers.findFirst({ where: eq(schema.drivers.id, trip.driverId) });
      await this.notificationsService.create({
        userIds: driver ? [driver.userId] : [],
        type: 'DEPARTURE_CLEARED',
        title: 'Departure clearance issued',
        message: 'Complete driver readiness before departing the depot.',
        entityType: 'trip',
        entityId: tripId,
      });
    }
    return result;
  }

  private safeUser(user: typeof schema.users.$inferSelect) {
    const { passwordHash: _passwordHash, ...safe } = user;
    return safe;
  }
}
