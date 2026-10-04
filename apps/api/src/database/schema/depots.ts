import { pgTable, uuid, varchar, numeric, boolean, timestamp } from 'drizzle-orm/pg-core';

export const depots = pgTable('depots', {
  id: uuid('id').defaultRandom().primaryKey(),
  code: varchar('code', { length: 32 }).notNull().unique(),
  name: varchar('name', { length: 128 }).notNull(),
  province: varchar('province', { length: 64 }).notNull(),
  latitude: numeric('latitude', { precision: 10, scale: 7 }).notNull(),
  longitude: numeric('longitude', { precision: 10, scale: 7 }).notNull(),
  operatingHoursOpen: varchar('operating_hours_open', { length: 5 }).notNull().default('06:00'),
  operatingHoursClose: varchar('operating_hours_close', { length: 5 }).notNull().default('22:00'),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export type Depot = typeof depots.$inferSelect;
export type NewDepot = typeof depots.$inferInsert;
