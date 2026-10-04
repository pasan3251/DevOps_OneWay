import { pgTable, uuid, varchar, jsonb, timestamp } from 'drizzle-orm/pg-core';
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
  executedAt: timestamp('executed_at', { withTimezone: true }).notNull().defaultNow(),
});

export type ClientMutation = typeof clientMutations.$inferSelect;
export type NewClientMutation = typeof clientMutations.$inferInsert;
