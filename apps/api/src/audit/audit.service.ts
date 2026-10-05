import { Inject, Injectable } from '@nestjs/common';
import { desc, eq } from 'drizzle-orm';
import { DRIZZLE_ORM, DrizzleDb } from '../database/database.module';
import * as schema from '../database/schema';

export interface AuditEventInput {
  actorId?: string | null;
  actorRole?: string | null;
  action: string;
  entity: string;
  entityId: string;
  beforeState?: unknown;
  afterState?: unknown;
  correlationId?: string;
}

@Injectable()
export class AuditService {
  constructor(@Inject(DRIZZLE_ORM) private readonly db: DrizzleDb) {}

  async record(event: AuditEventInput) {
    const [created] = await this.db.insert(schema.auditLogs).values({
      actorId: event.actorId ?? null,
      actorRole: event.actorRole ?? null,
      action: event.action,
      entity: event.entity,
      entityId: event.entityId,
      beforeState: event.beforeState ?? null,
      afterState: event.afterState ?? null,
      correlationId: event.correlationId ?? null,
    }).returning();
    return created;
  }

  async listForEntity(entity: string, entityId: string) {
    return this.db.query.auditLogs.findMany({
      where: eq(schema.auditLogs.entityId, entityId),
      orderBy: [desc(schema.auditLogs.createdAt)],
    }).then((rows) => rows.filter((row) => row.entity === entity));
  }
}
