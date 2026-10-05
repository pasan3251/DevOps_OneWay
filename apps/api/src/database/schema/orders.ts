import { pgTable, uuid, varchar, numeric, integer, boolean, timestamp, date, uniqueIndex, index } from 'drizzle-orm/pg-core';
import { outlets } from './outlets';
import { products } from './products';
import { users } from './users';
import { brandEnum, tempRequirementEnum, orderStatusEnum } from './enums';

export const orders = pgTable('orders', {
  id: uuid('id').defaultRandom().primaryKey(),
  orderNumber: varchar('order_number', { length: 64 }).notNull().unique(),
  outletId: uuid('outlet_id').notNull().references(() => outlets.id, { onDelete: 'restrict' }),
  brand: brandEnum('brand').notNull(),
  tempRequirement: tempRequirementEnum('temp_requirement').notNull().default('ambient'),
  orderDate: date('order_date').notNull(),
  submissionTime: timestamp('submission_time', { withTimezone: true }).notNull().defaultNow(),
  status: orderStatusEnum('status').notNull().default('ORDER_RECORDED'),
  totalWeightKg: numeric('total_weight_kg', { precision: 10, scale: 2 }).notNull().default('0.00'),
  totalVolumeM3: numeric('total_volume_m3', { precision: 10, scale: 2 }).notNull().default('0.00'),
  totalItemsCount: integer('total_items_count').notNull().default(0),
  isCutoffLocked: boolean('is_cutoff_locked').notNull().default(false),
  deferredCount: integer('deferred_count').notNull().default(0),
  lastDeferredDate: date('last_deferred_date'),
  deferralReason: varchar('deferral_reason', { length: 255 }),
  deferralReasonCode: varchar('deferral_reason_code', { length: 64 }),
  createdBy: uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  uniqueIndex('uniq_outlet_date_temp').on(table.outletId, table.orderDate, table.tempRequirement),
  index('idx_orders_status_date').on(table.status, table.orderDate),
  index('idx_orders_outlet_date').on(table.outletId, table.orderDate),
  index('idx_orders_brand_status').on(table.brand, table.status),
]);

export const orderItems = pgTable('order_items', {
  id: uuid('id').defaultRandom().primaryKey(),
  orderId: uuid('order_id').notNull().references(() => orders.id, { onDelete: 'cascade' }),
  productId: uuid('product_id').notNull().references(() => products.id, { onDelete: 'restrict' }),
  quantityRequested: integer('quantity_requested').notNull(),
  quantityLoaded: integer('quantity_loaded').notNull().default(0),
  quantityDelivered: integer('quantity_delivered').notNull().default(0),
  unitWeightKg: numeric('unit_weight_kg', { precision: 8, scale: 3 }).notNull(),
  unitVolumeM3: numeric('unit_volume_m3', { precision: 8, scale: 4 }).notNull(),
  unitPrice: numeric('unit_price', { precision: 12, scale: 2 }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index('idx_order_items_order').on(table.orderId),
  index('idx_order_items_product').on(table.productId),
]);

export type Order = typeof orders.$inferSelect;
export type NewOrder = typeof orders.$inferInsert;
export type OrderItem = typeof orderItems.$inferSelect;
export type NewOrderItem = typeof orderItems.$inferInsert;
