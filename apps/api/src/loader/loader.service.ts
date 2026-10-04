import {
  Injectable,
  Inject,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { eq, asc } from 'drizzle-orm';
import { randomUUID } from 'crypto';
import { DRIZZLE_ORM, DrizzleDb } from '../database/database.module';
import * as schema from '../database/schema';
import { ReportLoadingDiscrepancyDto, GateClearanceDto } from './dto/loader.dto';

@Injectable()
export class LoaderService {
  constructor(@Inject(DRIZZLE_ORM) private readonly db: DrizzleDb) {}

  async getLoadingManifest(tripId: string) {
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
          orderBy: [asc(schema.tripStops.loadingSequence)],
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
          },
        },
      },
    });

    if (!trip) {
      throw new NotFoundException(`Trip with ID '${tripId}' not found`);
    }

    return trip;
  }

  async reportShortfall(
    tripId: string,
    dto: ReportLoadingDiscrepancyDto,
    userId: string,
  ) {
    const order = await this.db.query.orders.findFirst({
      where: eq(schema.orders.id, dto.orderId),
    });

    if (!order) {
      throw new NotFoundException(`Order with ID '${dto.orderId}' not found`);
    }

    const claimNumber = `DISC-LOAD-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`;

    const [claim] = await this.db
      .insert(schema.discrepancyClaims)
      .values({
        claimNumber,
        orderId: dto.orderId,
        tripStopId: dto.tripStopId,
        outletId: order.outletId,
        reportedByRole: 'loader',
        reportedByUserId: userId,
        status: 'LOGGED',
        discrepancyType: 'FAIL_A_LOADING_SHORTFALL',
        shortfallQty: dto.shortfallQty,
        notes: dto.notes,
      })
      .returning();

    return claim;
  }

  async gateClearance(tripId: string, dto: GateClearanceDto, userId: string) {
    const trip = await this.db.query.trips.findFirst({
      where: eq(schema.trips.id, tripId),
    });

    if (!trip) {
      throw new NotFoundException(`Trip with ID '${tripId}' not found`);
    }

    if (trip.status !== 'LOCKED' && trip.status !== 'LOADING' && trip.status !== 'PLANNED') {
      throw new BadRequestException(
        `Gate clearance requires trip to be in staging/loading state. Current status: '${trip.status}'`,
      );
    }

    const gatePassToken = `GATE-PASS-${Date.now()}-${randomUUID().slice(0, 8).toUpperCase()}`;

    const [updatedTrip] = await this.db
      .update(schema.trips)
      .set({
        status: 'MANIFEST_ISSUED',
        gatePassToken,
        gateClearedBy: userId,
        gateClearedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(schema.trips.id, tripId))
      .returning();

    return updatedTrip;
  }
}
