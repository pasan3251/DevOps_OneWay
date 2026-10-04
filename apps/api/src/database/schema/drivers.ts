import { pgTable, uuid, varchar, numeric, boolean, timestamp, index } from 'drizzle-orm/pg-core';
import { users } from './users';
import { depots } from './depots';
import { driverStatusEnum } from './enums';

export const drivers = pgTable('drivers', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull().unique().references(() => users.id, { onDelete: 'cascade' }),
  depotId: uuid('depot_id').notNull().references(() => depots.id, { onDelete: 'restrict' }),
  licenseNumber: varchar('license_number', { length: 64 }).notNull().unique(),
  licenseClass: varchar('license_class', { length: 16 }).notNull().default('heavy'),
  phone: varchar('phone', { length: 32 }).notNull(),
  status: driverStatusEnum('status').notNull().default('available'),
  currentLatitude: numeric('current_latitude', { precision: 10, scale: 7 }),
  currentLongitude: numeric('current_longitude', { precision: 10, scale: 7 }),
  lastTelematicsAt: timestamp('last_telematics_at', { withTimezone: true }),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index('idx_drivers_depot_status').on(table.depotId, table.status),
  index('idx_drivers_user').on(table.userId),
]);

export type Driver = typeof drivers.$inferSelect;
export type NewDriver = typeof drivers.$inferInsert;
