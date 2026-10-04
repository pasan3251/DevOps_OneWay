import { pgTable, uuid, varchar, text, integer, timestamp, index } from 'drizzle-orm/pg-core';
import { orders } from './orders';
import { tripStops } from './trips';
import { outlets } from './outlets';
import { users } from './users';
import { discrepancyStatusEnum, discrepancyTypeEnum } from './enums';

export const discrepancyClaims = pgTable('discrepancy_claims', {
  id: uuid('id').defaultRandom().primaryKey(),
  claimNumber: varchar('claim_number', { length: 64 }).notNull().unique(),
  orderId: uuid('order_id').notNull().references(() => orders.id, { onDelete: 'restrict' }),
  tripStopId: uuid('trip_stop_id').references(() => tripStops.id, { onDelete: 'set null' }),
  outletId: uuid('outlet_id').notNull().references(() => outlets.id, { onDelete: 'restrict' }),
  reportedByRole: varchar('reported_by_role', { length: 32 }).notNull(),
  reportedByUserId: uuid('reported_by_user_id').references(() => users.id, { onDelete: 'set null' }),
  status: discrepancyStatusEnum('status').notNull().default('LOGGED'),
  discrepancyType: discrepancyTypeEnum('discrepancy_type').notNull(),
  shortfallQty: integer('shortfall_qty').notNull().default(0),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index('idx_discrepancy_order').on(table.orderId),
  index('idx_discrepancy_status').on(table.status),
  index('idx_discrepancy_outlet').on(table.outletId),
]);

export type DiscrepancyClaim = typeof discrepancyClaims.$inferSelect;
export type NewDiscrepancyClaim = typeof discrepancyClaims.$inferInsert;
