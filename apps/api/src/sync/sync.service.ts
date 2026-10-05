import { BadRequestException, ConflictException, Inject, Injectable, Optional } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { createHash } from 'crypto';
import { NotificationsService } from '../communications/notifications.service';
import { DRIZZLE_ORM, DrizzleDb } from '../database/database.module';
import * as schema from '../database/schema';
import { DriverService } from '../driver/driver.service';
import { BatchSyncDto, ClientMutationDto } from './dto/sync.dto';

type SyncStatus = 'COMMITTED' | 'ALREADY_COMMITTED' | 'CONFLICT' | 'FAILED';
export interface SyncResult {
  clientMutationId: string;
  status: SyncStatus;
  result?: unknown;
  error?: string;
  serverUpdatedAt?: Date;
}

@Injectable()
export class SyncService {
  constructor(
    @Inject(DRIZZLE_ORM) private readonly db: DrizzleDb,
    private readonly driverService: DriverService,
    @Optional() private readonly notificationsService?: NotificationsService,
  ) {}

  async processSyncBatch(dto: BatchSyncDto, userId: string) {
    const results: SyncResult[] = [];
    const chronological = [...dto.mutations].sort(
      (left, right) => new Date(left.occurredAt).getTime() - new Date(right.occurredAt).getTime(),
    );
    for (const mutation of chronological) {
      results.push(await this.processSingleMutation(mutation, userId));
    }
    return {
      syncedCount: results.filter((result) => result.status === 'COMMITTED').length,
      deduplicatedCount: results.filter((result) => result.status === 'ALREADY_COMMITTED').length,
      conflictCount: results.filter((result) => result.status === 'CONFLICT').length,
      failedCount: results.filter((result) => result.status === 'FAILED').length,
      results,
    };
  }

  private async persistConflict(mutation: ClientMutationDto, userId: string, reason: string, serverState?: unknown) {
    const inserted = await this.db.insert(schema.syncConflicts).values({
      clientMutationId: mutation.clientMutationId,
      userId,
      entity: mutation.entity,
      action: mutation.action,
      payload: mutation.payload,
      reason,
      serverState: serverState ?? null,
    }).onConflictDoNothing({
      target: [schema.syncConflicts.clientMutationId, schema.syncConflicts.userId],
    }).returning({ id: schema.syncConflicts.id });
    if (!inserted.length) return;
    await this.notificationsService?.create({
      userIds: [userId],
      type: 'SYNC_CONFLICT',
      title: 'Offline update needs review',
      message: reason,
      entityType: mutation.entity,
      payload: { clientMutationId: mutation.clientMutationId, action: mutation.action },
    });
  }

  private requiredString(value: string | undefined, field: string) {
    if (!value) throw new BadRequestException(`Offline event is missing ${field}`);
    return value;
  }

  private requiredNumber(value: number | undefined, field: string) {
    if (value === undefined || Number.isNaN(value)) throw new BadRequestException(`Offline event is missing ${field}`);
    return value;
  }

  private requiredBoolean(value: boolean | undefined, field: string) {
    if (value === undefined) throw new BadRequestException(`Offline event is missing ${field}`);
    return value;
  }

  private async processSingleMutation(mutation: ClientMutationDto, userId: string): Promise<SyncResult> {
    const payloadHash = createHash('sha256').update(JSON.stringify(mutation.payload)).digest('hex');
    const existing = await this.db.query.clientMutations.findFirst({
      where: eq(schema.clientMutations.clientMutationId, mutation.clientMutationId),
    });
    if (existing) {
      if (existing.userId !== userId || existing.payloadHash !== payloadHash) {
        const error = 'This mutation identifier was already used with different data';
        await this.persistConflict(mutation, userId, error, existing.responseBody);
        return { clientMutationId: mutation.clientMutationId, status: 'CONFLICT', error };
      }
      return { clientMutationId: mutation.clientMutationId, status: 'ALREADY_COMMITTED', result: existing.responseBody };
    }

    if (mutation.baseUpdatedAt && mutation.payload.stopId) {
      const stop = await this.db.query.tripStops.findFirst({
        where: eq(schema.tripStops.id, mutation.payload.stopId),
      });
      if (stop && stop.updatedAt.toISOString() !== new Date(mutation.baseUpdatedAt).toISOString()) {
        const error = 'The route or stop changed while this device was offline. Dispatch must reconcile it.';
        await this.persistConflict(mutation, userId, error, stop);
        return {
          clientMutationId: mutation.clientMutationId,
          status: 'CONFLICT',
          error,
          serverUpdatedAt: stop.updatedAt,
        };
      }
    }

    const occurredAt = new Date(mutation.occurredAt);
    try {
      let result: unknown;
      const payload = mutation.payload;
      switch (mutation.action) {
        case 'confirm_readiness':
          result = await this.driverService.confirmReadiness(
            this.requiredString(payload.tripId, 'tripId'),
            {
              vehicleRoadworthy: this.requiredBoolean(payload.vehicleRoadworthy, 'vehicleRoadworthy'),
              manifestAndSealMatched: this.requiredBoolean(payload.manifestAndSealMatched, 'manifestAndSealMatched'),
              fuelConfirmed: this.requiredBoolean(payload.fuelConfirmed, 'fuelConfirmed'),
              reeferTemperatureConfirmed: this.requiredBoolean(payload.reeferTemperatureConfirmed, 'reeferTemperatureConfirmed'),
            },
            userId,
            occurredAt,
          );
          break;
        case 'depart_trip':
          result = await this.driverService.departTrip(this.requiredString(payload.tripId, 'tripId'), userId, occurredAt);
          break;
        case 'arrive_stop':
          result = await this.driverService.arriveAtStop(
            this.requiredString(payload.stopId, 'stopId'),
            { currentLatitude: payload.currentLatitude, currentLongitude: payload.currentLongitude, occurredAt: mutation.occurredAt },
            userId,
          );
          break;
        case 'deliver_stop':
          result = await this.driverService.deliverStop(
            this.requiredString(payload.stopId, 'stopId'),
            {
              storeRepName: this.requiredString(payload.storeRepName, 'storeRepName'),
              storeRepDesignation: payload.storeRepDesignation,
              outcome: payload.outcome ?? 'FULL',
              expectedCartons: this.requiredNumber(payload.expectedCartons, 'expectedCartons'),
              deliveredCartons: this.requiredNumber(payload.deliveredCartons, 'deliveredCartons'),
              storeRepSignatureUrl: payload.storeRepSignatureUrl,
              photoEvidenceUrl: payload.photoEvidenceUrl,
              driverNotes: payload.driverNotes,
              geoLatitude: this.requiredNumber(payload.geoLatitude, 'geoLatitude'),
              geoLongitude: this.requiredNumber(payload.geoLongitude, 'geoLongitude'),
              clientCapturedAt: payload.clientCapturedAt ?? mutation.occurredAt,
            },
            userId,
          );
          break;
        case 'fail_stop':
          result = await this.driverService.failStop(
            this.requiredString(payload.stopId, 'stopId'),
            {
              failureReason: payload.failureReason ?? 'ACCESS_BLOCKED',
              driverNotes: payload.driverNotes,
              photoEvidenceUrl: payload.photoEvidenceUrl,
              affectedCartons: payload.affectedCartons,
              occurredAt: mutation.occurredAt,
            },
            userId,
          );
          break;
        case 'report_delay':
          result = await this.driverService.reportDelay(
            this.requiredString(payload.stopId, 'stopId'),
            {
              delayMinutes: this.requiredNumber(payload.delayMinutes, 'delayMinutes'),
              reason: this.requiredString(payload.reason, 'reason'),
              occurredAt: mutation.occurredAt,
            },
            userId,
          );
          break;
        case 'complete_trip':
          result = await this.driverService.completeTrip(
            this.requiredString(payload.tripId, 'tripId'),
            {
              latitude: this.requiredNumber(payload.latitude, 'latitude'),
              longitude: this.requiredNumber(payload.longitude, 'longitude'),
            },
            userId,
            occurredAt,
          );
          break;
        default:
          throw new BadRequestException(`Unsupported sync action: ${mutation.action}`);
      }

      await this.db.insert(schema.clientMutations).values({
        clientMutationId: mutation.clientMutationId,
        userId,
        entity: mutation.entity,
        action: mutation.action,
        payloadHash,
        responseBody: result,
        status: 'COMMITTED',
        occurredAt,
      });
      return { clientMutationId: mutation.clientMutationId, status: 'COMMITTED', result };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Offline update was rejected';
      await this.persistConflict(mutation, userId, message);
      return { clientMutationId: mutation.clientMutationId, status: error instanceof ConflictException ? 'CONFLICT' : 'FAILED', error: message };
    }
  }
}
