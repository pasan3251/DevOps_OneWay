import { pgTable, uuid, varchar, numeric, integer, timestamp, uniqueIndex } from 'drizzle-orm/pg-core';

export const distanceDurationMatrix = pgTable('distance_duration_matrix', {
  id: uuid('id').defaultRandom().primaryKey(),
  originType: varchar('origin_type', { length: 16 }).notNull(),
  originId: uuid('origin_id').notNull(),
  destinationType: varchar('destination_type', { length: 16 }).notNull(),
  destinationId: uuid('destination_id').notNull(),
  distanceKm: numeric('distance_km', { precision: 8, scale: 2 }).notNull(),
  durationMin: integer('duration_min').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  uniqueIndex('uniq_matrix_origin_dest').on(table.originId, table.destinationId),
]);

export type DistanceDuration = typeof distanceDurationMatrix.$inferSelect;
export type NewDistanceDuration = typeof distanceDurationMatrix.$inferInsert;
