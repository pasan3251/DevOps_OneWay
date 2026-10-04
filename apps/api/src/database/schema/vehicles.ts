import { pgTable, uuid, varchar, numeric, boolean, timestamp, index } from 'drizzle-orm/pg-core';
import { depots } from './depots';
import { vehicleTypeEnum, bodyTypeEnum, refrigerationTypeEnum, vehicleStatusEnum } from './enums';

export const vehicles = pgTable('vehicles', {
  id: uuid('id').defaultRandom().primaryKey(),
  registrationNumber: varchar('registration_number', { length: 32 }).notNull().unique(),
  depotId: uuid('depot_id').notNull().references(() => depots.id, { onDelete: 'restrict' }),
  vehicleType: vehicleTypeEnum('vehicle_type').notNull(),
  bodyType: bodyTypeEnum('body_type').notNull(),
  refrigerationType: refrigerationTypeEnum('refrigeration_type').notNull(),
  maxWeightKg: numeric('max_weight_kg', { precision: 10, scale: 2 }).notNull(),
  maxVolumeM3: numeric('max_volume_m3', { precision: 10, scale: 2 }).notNull(),
  status: vehicleStatusEnum('status').notNull().default('available'),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index('idx_vehicles_depot_status').on(table.depotId, table.status),
  index('idx_vehicles_capabilities').on(table.bodyType, table.refrigerationType),
]);

export type Vehicle = typeof vehicles.$inferSelect;
export type NewVehicle = typeof vehicles.$inferInsert;
