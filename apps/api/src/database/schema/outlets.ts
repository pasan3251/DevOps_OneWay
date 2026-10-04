import { pgTable, uuid, varchar, text, numeric, boolean, timestamp, index } from 'drizzle-orm/pg-core';
import { depots } from './depots';
import { brandEnum } from './enums';

export const outlets = pgTable('outlets', {
  id: uuid('id').defaultRandom().primaryKey(),
  code: varchar('code', { length: 32 }).notNull().unique(),
  name: varchar('name', { length: 128 }).notNull(),
  brand: brandEnum('brand').notNull(),
  district: varchar('district', { length: 64 }).notNull(),
  depotId: uuid('depot_id').notNull().references(() => depots.id, { onDelete: 'restrict' }),
  latitude: numeric('latitude', { precision: 10, scale: 7 }).notNull(),
  longitude: numeric('longitude', { precision: 10, scale: 7 }).notNull(),
  address: text('address').notNull(),
  contactPhone: varchar('contact_phone', { length: 32 }).notNull(),
  windowStart: varchar('window_start', { length: 5 }).notNull().default('08:00'),
  windowEnd: varchar('window_end', { length: 5 }).notNull().default('18:00'),
  mallWindowStart: varchar('mall_window_start', { length: 5 }),
  mallWindowEnd: varchar('mall_window_end', { length: 5 }),
  parkingConstraint: varchar('parking_constraint', { length: 32 }).notNull().default('normal'),
  isVanOnly: boolean('is_van_only').notNull().default(false),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index('idx_outlets_brand_district').on(table.brand, table.district),
  index('idx_outlets_depot').on(table.depotId),
]);

export type Outlet = typeof outlets.$inferSelect;
export type NewOutlet = typeof outlets.$inferInsert;
