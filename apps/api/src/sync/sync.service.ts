import { Injectable, Inject, BadRequestException } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { createHash } from 'crypto';
import { DRIZZLE_ORM, DrizzleDb } from '../database/database.module';
import * as schema from '../database/schema';
import { BatchSyncDto, ClientMutationDto } from './dto/sync.dto';
import { DriverService } from '../driver/driver.service';

@Injectable()
export class SyncService {
  constructor(
    @Inject(DRIZZLE_ORM) private readonly db: DrizzleDb,
    private readonly driverService: DriverService,
  ) {}

  async processSyncBatch(dto: BatchSyncDto, userId: string) {
    const results: any[] = [];

    const chronological = [...dto.mutations].sort(
      (left, right) =>
        new Date(left.occurredAt).getTime() - new Date(right.occurredAt).getTime(),
    );
    for (const mutation of chronological) {
      const outcome = await this.processSingleMutation(mutation, userId);
      results.push(outcome);
    }

    return {
      syncedCount: results.filter((r) => r.status === 'COMMITTED').length,
      deduplicatedCount: results.filter((r) => r.status === 'ALREADY_COMMITTED').length,
      conflictCount: results.filter((r) => r.status === 'CONFLICT').length,
      failedCount: results.filter((r) => r.status === 'FAILED').length,
      results,
    };
  }

  private async processSingleMutation(
    mutation: ClientMutationDto,
    userId: string,
  ) {
    const payloadHash = createHash('sha256')
      .update(JSON.stringify(mutation.payload))
      .digest('hex');

    // 1. Check if mutation was already executed (Idempotency Check)
    const existing = await this.db.query.clientMutations.findFirst({
      where: eq(schema.clientMutations.clientMutationId, mutation.clientMutationId),
    });

    if (existing) {
      if (existing.payloadHash !== payloadHash) {
        return {
          clientMutationId: mutation.clientMutationId,
          status: 'CONFLICT',
          error: 'This mutation identifier was already used with different data',
        };
      }
      return {
        clientMutationId: mutation.clientMutationId,
        status: 'ALREADY_COMMITTED',
        result: existing.responseBody,
      };
    }

    if (mutation.baseUpdatedAt && mutation.payload.stopId) {
      const stop = await this.db.query.tripStops.findFirst({
        where: eq(schema.tripStops.id, mutation.payload.stopId),
      });
      if (stop && stop.updatedAt.toISOString() !== new Date(mutation.baseUpdatedAt).toISOString()) {
        return {
          clientMutationId: mutation.clientMutationId,
          status: 'CONFLICT',
          error: 'The route or stop changed while this device was offline. Dispatch must reconcile it.',
          serverUpdatedAt: stop.updatedAt,
        };
      }
    }

    try {
      let result: any = null;

      switch (mutation.action) {
        case 'confirm_readiness':
          result = await this.driverService.confirmReadiness(
            mutation.payload.tripId,
            {
              vehicleRoadworthy: mutation.payload.vehicleRoadworthy,
              manifestAndSealMatched: mutation.payload.manifestAndSealMatched,
              fuelConfirmed: mutation.payload.fuelConfirmed,
              reeferTemperatureConfirmed: mutation.payload.reeferTemperatureConfirmed,
            },
            userId,
          );
          break;

        case 'depart_trip':
          result = await this.driverService.departTrip(
            mutation.payload.tripId,
            userId,
          );
          break;

        case 'arrive_stop':
          result = await this.driverService.arriveAtStop(
            mutation.payload.stopId,
            {
              currentLatitude: mutation.payload.currentLatitude,
              currentLongitude: mutation.payload.currentLongitude,
            },
            userId,
          );
          break;

        case 'deliver_stop':
          result = await this.driverService.deliverStop(
            mutation.payload.stopId,
            {
              storeRepName: mutation.payload.storeRepName,
              storeRepDesignation: mutation.payload.storeRepDesignation,
              outcome: mutation.payload.outcome,
              expectedCartons: mutation.payload.expectedCartons,
              deliveredCartons: mutation.payload.deliveredCartons,
              storeRepSignatureUrl: mutation.payload.storeRepSignatureUrl,
              photoEvidenceUrl: mutation.payload.photoEvidenceUrl,
              driverNotes: mutation.payload.driverNotes,
              geoLatitude: mutation.payload.geoLatitude,
              geoLongitude: mutation.payload.geoLongitude,
              clientCapturedAt: mutation.payload.clientCapturedAt || mutation.occurredAt,
            },
            userId,
          );
          break;

        case 'complete_trip':
          result = await this.driverService.completeTrip(
            mutation.payload.tripId,
            {
              latitude: mutation.payload.latitude,
              longitude: mutation.payload.longitude,
            },
            userId,
          );
          break;

        case 'fail_stop':
          result = await this.driverService.failStop(
            mutation.payload.stopId,
            {
              failureReason: mutation.payload.failureReason,
              driverNotes: mutation.payload.driverNotes,
            },
            userId,
          );
          break;

        default:
          throw new BadRequestException(`Unsupported sync action: ${mutation.action}`);
      }

      // Record committed mutation for future replay detection
      await this.db.insert(schema.clientMutations).values({
        clientMutationId: mutation.clientMutationId,
        userId,
        entity: mutation.entity,
        action: mutation.action,
        payloadHash,
        responseBody: result,
        status: 'COMMITTED',
        occurredAt: new Date(mutation.occurredAt),
      });

      return {
        clientMutationId: mutation.clientMutationId,
        status: 'COMMITTED',
        result,
      };
    } catch (err: any) {
      return {
        clientMutationId: mutation.clientMutationId,
        status: 'FAILED',
        error: err.message,
      };
    }
  }
}
