import {
  pgTable,
  uuid,
  integer,
  text,
  date,
  timestamp,
  uniqueIndex,
  index,
} from 'drizzle-orm/pg-core';
import { depots } from './depots';
import { users } from './users';
import { planStatusEnum } from './enums';

export const deliveryPlans = pgTable('delivery_plans', {
  id: uuid('id').defaultRandom().primaryKey(),
  depotId: uuid('depot_id').notNull().references(() => depots.id, { onDelete: 'restrict' }),
  operatingDate: date('operating_date').notNull(),
  createdBy: uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  uniqueIndex('uniq_delivery_plan_depot_date').on(table.depotId, table.operatingDate),
]);

export const planVersions = pgTable('plan_versions', {
  id: uuid('id').defaultRandom().primaryKey(),
  planId: uuid('plan_id').notNull().references(() => deliveryPlans.id, { onDelete: 'cascade' }),
  versionNumber: integer('version_number').notNull(),
  status: planStatusEnum('status').notNull().default('DRAFT'),
  revisionReason: text('revision_reason'),
  supersedesVersionId: uuid('supersedes_version_id'),
  createdBy: uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
  validatedAt: timestamp('validated_at', { withTimezone: true }),
  publishedBy: uuid('published_by').references(() => users.id, { onDelete: 'set null' }),
  publishedAt: timestamp('published_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  uniqueIndex('uniq_plan_version').on(table.planId, table.versionNumber),
  index('idx_plan_versions_status').on(table.status, table.publishedAt),
]);

export type DeliveryPlan = typeof deliveryPlans.$inferSelect;
export type PlanVersion = typeof planVersions.$inferSelect;
