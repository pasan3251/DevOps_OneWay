import { pgTable, uuid, varchar, text, numeric, timestamp, index } from 'drizzle-orm/pg-core';
import { tripStops } from './trips';
import { orders } from './orders';

export const proofOfDeliveries = pgTable('proof_of_deliveries', {
  id: uuid('id').defaultRandom().primaryKey(),
  tripStopId: uuid('trip_stop_id').notNull().unique().references(() => tripStops.id, { onDelete: 'restrict' }),
  orderId: uuid('order_id').notNull().references(() => orders.id, { onDelete: 'restrict' }),
  storeRepName: varchar('store_rep_name', { length: 128 }).notNull(),
  storeRepSignatureUrl: text('store_rep_signature_url').notNull(),
  photoEvidenceUrl: text('photo_evidence_url'),
  driverNotes: text('driver_notes'),
  geoLatitude: numeric('geo_latitude', { precision: 10, scale: 7 }).notNull(),
  geoLongitude: numeric('geo_longitude', { precision: 10, scale: 7 }).notNull(),
  capturedAt: timestamp('captured_at', { withTimezone: true }).notNull().defaultNow(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index('idx_pod_order').on(table.orderId),
]);

export type ProofOfDelivery = typeof proofOfDeliveries.$inferSelect;
export type NewProofOfDelivery = typeof proofOfDeliveries.$inferInsert;
