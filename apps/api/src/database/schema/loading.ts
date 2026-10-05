import {
  pgTable,
  uuid,
  integer,
  numeric,
  text,
  varchar,
  timestamp,
  uniqueIndex,
  index,
} from 'drizzle-orm/pg-core';
import { users } from './users';
import { trips, tripStops } from './trips';
import { orders } from './orders';
import { planVersions } from './plans';
import {
  manifestStatusEnum,
  loadingExceptionTypeEnum,
  exceptionResolutionEnum,
} from './enums';

export const loadingManifests = pgTable('loading_manifests', {
  id: uuid('id').defaultRandom().primaryKey(),
  tripId: uuid('trip_id').notNull().references(() => trips.id, { onDelete: 'cascade' }),
  planVersionId: uuid('plan_version_id').notNull().references(() => planVersions.id, { onDelete: 'restrict' }),
  manifestVersion: integer('manifest_version').notNull().default(1),
  status: manifestStatusEnum('status').notNull().default('PENDING'),
  expectedWeightKg: numeric('expected_weight_kg', { precision: 10, scale: 2 }).notNull(),
  expectedVolumeM3: numeric('expected_volume_m3', { precision: 10, scale: 2 }).notNull(),
  verifiedBy: uuid('verified_by').references(() => users.id, { onDelete: 'set null' }),
  verifiedAt: timestamp('verified_at', { withTimezone: true }),
  verificationNotes: text('verification_notes'),
  staleAt: timestamp('stale_at', { withTimezone: true }),
  clearedAt: timestamp('cleared_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  uniqueIndex('uniq_manifest_trip_version').on(table.tripId, table.manifestVersion),
  index('idx_manifest_plan_status').on(table.planVersionId, table.status),
]);

export const loadingExceptions = pgTable('loading_exceptions', {
  id: uuid('id').defaultRandom().primaryKey(),
  manifestId: uuid('manifest_id').notNull().references(() => loadingManifests.id, { onDelete: 'cascade' }),
  tripStopId: uuid('trip_stop_id').references(() => tripStops.id, { onDelete: 'set null' }),
  orderId: uuid('order_id').notNull().references(() => orders.id, { onDelete: 'restrict' }),
  type: loadingExceptionTypeEnum('type').notNull(),
  affectedSku: varchar('affected_sku', { length: 64 }),
  affectedQuantity: integer('affected_quantity').notNull().default(0),
  notes: text('notes').notNull(),
  evidenceUrl: text('evidence_url'),
  status: exceptionResolutionEnum('status').notNull().default('OPEN'),
  reportedBy: uuid('reported_by').references(() => users.id, { onDelete: 'set null' }),
  resolvedBy: uuid('resolved_by').references(() => users.id, { onDelete: 'set null' }),
  resolution: text('resolution'),
  resolvedAt: timestamp('resolved_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index('idx_loading_exception_manifest_status').on(table.manifestId, table.status),
  index('idx_loading_exception_order').on(table.orderId),
]);

export type LoadingManifest = typeof loadingManifests.$inferSelect;
export type LoadingException = typeof loadingExceptions.$inferSelect;
