import { pgTable, uuid, varchar, text, jsonb, timestamp, index, uniqueIndex } from 'drizzle-orm/pg-core';
import { users } from './users';

export const clientMutations = pgTable('client_mutations', {
  id: uuid('id').defaultRandom().primaryKey(),
  clientMutationId: uuid('client_mutation_id').notNull().unique(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  entity: varchar('entity', { length: 64 }).notNull(),
  action: varchar('action', { length: 64 }).notNull(),
  payloadHash: varchar('payload_hash', { length: 64 }).notNull(),
  responseBody: jsonb('response_body'),
  status: varchar('status', { length: 32 }).notNull().default('COMMITTED'),
  occurredAt: timestamp('occurred_at', { withTimezone: true }).notNull().defaultNow(),
  executedAt: timestamp('executed_at', { withTimezone: true }).notNull().defaultNow(),
});

export type ClientMutation = typeof clientMutations.$inferSelect;
export type NewClientMutation = typeof clientMutations.$inferInsert;

export const syncConflicts = pgTable('sync_conflicts', {
  id: uuid('id').defaultRandom().primaryKey(),
  clientMutationId: uuid('client_mutation_id').notNull(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  entity: varchar('entity', { length: 64 }).notNull(),
  action: varchar('action', { length: 64 }).notNull(),
  payload: jsonb('payload').notNull(),
  reason: text('reason').notNull(),
  serverState: jsonb('server_state'),
  status: varchar('status', { length: 32 }).notNull().default('OPEN'),
  resolvedAt: timestamp('resolved_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  uniqueIndex('uniq_sync_conflict_mutation_user').on(table.clientMutationId, table.userId),
  index('idx_sync_conflicts_user_status').on(table.userId, table.status),
]);
