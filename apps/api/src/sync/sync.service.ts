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

    for (const mutation of dto.mutations) {
      const outcome = await this.processSingleMutation(mutation, userId);
      results.push(outcome);
    }

    return {
      syncedCount: results.filter((r) => r.status === 'COMMITTED').length,
      deduplicatedCount: results.filter((r) => r.status === 'ALREADY_COMMITTED').length,
      failedCount: results.filter((r) => r.status === 'FAILED').length,
      results,
    };
  }

  private async processSingleMutation(
    mutation: ClientMutationDto,
    userId: string,
  ) {
    // 1. Check if mutation was already executed (Idempotency Check)
    const existing = await this.db.query.clientMutations.findFirst({
      where: eq(schema.clientMutations.clientMutationId, mutation.clientMutationId),
    });

    if (existing) {
      return {
        clientMutationId: mutation.clientMutationId,
        status: 'ALREADY_COMMITTED',
        result: existing.responseBody,
      };
    }

    const payloadHash = createHash('sha256')
      .update(JSON.stringify(mutation.payload))
      .digest('hex');

    try {
      let result: any = null;

      switch (mutation.action) {
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
              storeRepSignatureUrl: mutation.payload.storeRepSignatureUrl,
              photoEvidenceUrl: mutation.payload.photoEvidenceUrl,
              driverNotes: mutation.payload.driverNotes,
              geoLatitude: mutation.payload.geoLatitude,
              geoLongitude: mutation.payload.geoLongitude,
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
