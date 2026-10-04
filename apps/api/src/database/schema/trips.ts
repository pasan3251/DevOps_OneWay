import { pgTable, uuid, varchar, numeric, integer, timestamp, date, uniqueIndex, index, jsonb, boolean } from 'drizzle-orm/pg-core';
import { depots } from './depots';
import { vehicles } from './vehicles';
import { drivers } from './drivers';
import { outlets } from './outlets';
import { orders } from './orders';
import { users } from './users';
import { brandEnum, tripStatusEnum, tripStopStatusEnum } from './enums';

export const trips = pgTable('trips', {
  id: uuid('id').defaultRandom().primaryKey(),
  tripNumber: varchar('trip_number', { length: 64 }).notNull().unique(),
  depotId: uuid('depot_id').notNull().references(() => depots.id, { onDelete: 'restrict' }),
  vehicleId: uuid('vehicle_id').notNull().references(() => vehicles.id, { onDelete: 'restrict' }),
  driverId: uuid('driver_id').notNull().references(() => drivers.id, { onDelete: 'restrict' }),
  brand: brandEnum('brand').notNull(),
  district: varchar('district', { length: 64 }).notNull(),
  operatingDate: date('operating_date').notNull(),
  tripSequenceInDay: integer('trip_sequence_in_day').notNull().default(1),
  status: tripStatusEnum('status').notNull().default('PLANNED'),
  totalWeightKg: numeric('total_weight_kg', { precision: 10, scale: 2 }).notNull().default('0.00'),
  totalVolumeM3: numeric('total_volume_m3', { precision: 10, scale: 2 }).notNull().default('0.00'),
  plannedDurationMin: integer('planned_duration_min').notNull().default(0),
  actualDepartureTime: timestamp('actual_departure_time', { withTimezone: true }),
  actualReturnTime: timestamp('actual_return_time', { withTimezone: true }),
  gatePassToken: varchar('gate_pass_token', { length: 128 }),
  gateClearedBy: uuid('gate_cleared_by').references(() => users.id, { onDelete: 'set null' }),
  gateClearedAt: timestamp('gate_cleared_at', { withTimezone: true }),
  driverReadyAt: timestamp('driver_ready_at', { withTimezone: true }),
  driverChecklist: jsonb('driver_checklist'),
  returnStartedAt: timestamp('return_started_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  uniqueIndex('uniq_vehicle_date_seq').on(table.vehicleId, table.operatingDate, table.tripSequenceInDay),
  index('idx_trips_driver_date').on(table.driverId, table.operatingDate),
  index('idx_trips_date_status').on(table.operatingDate, table.status),
  index('idx_trips_depot_date').on(table.depotId, table.operatingDate),
]);

export const tripStops = pgTable('trip_stops', {
  id: uuid('id').defaultRandom().primaryKey(),
  tripId: uuid('trip_id').notNull().references(() => trips.id, { onDelete: 'cascade' }),
  orderId: uuid('order_id').notNull().unique().references(() => orders.id, { onDelete: 'restrict' }),
  outletId: uuid('outlet_id').notNull().references(() => outlets.id, { onDelete: 'restrict' }),
  stopSequence: integer('stop_sequence').notNull(),
  loadingSequence: integer('loading_sequence').notNull(),
  plannedArrivalTime: timestamp('planned_arrival_time', { withTimezone: true }),
  actualArrivalTime: timestamp('actual_arrival_time', { withTimezone: true }),
  actualDepartureTime: timestamp('actual_departure_time', { withTimezone: true }),
  waitTimeMinutes: integer('wait_time_minutes').notNull().default(0),
  windowHoldUntil: timestamp('window_hold_until', { withTimezone: true }),
  slaBreach: boolean('sla_breach').notNull().default(false),
  slaBreachMinutes: integer('sla_breach_minutes').notNull().default(0),
  status: tripStopStatusEnum('status').notNull().default('PENDING'),
  failureReason: varchar('failure_reason', { length: 128 }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  uniqueIndex('uniq_trip_stop_seq').on(table.tripId, table.stopSequence),
  index('idx_trip_stops_trip_loading').on(table.tripId, table.loadingSequence),
  index('idx_trip_stops_outlet_status').on(table.outletId, table.status),
]);

export type Trip = typeof trips.$inferSelect;
export type NewTrip = typeof trips.$inferInsert;
export type TripStop = typeof tripStops.$inferSelect;
export type NewTripStop = typeof tripStops.$inferInsert;
