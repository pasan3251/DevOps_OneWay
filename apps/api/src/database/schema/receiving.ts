import { pgTable, uuid, text, timestamp, uniqueIndex } from 'drizzle-orm/pg-core';
import { users } from './users';
import { orders } from './orders';
import { tripStops } from './trips';
import { receiptStatusEnum } from './enums';

export const storeReceipts = pgTable('store_receipts', {
  id: uuid('id').defaultRandom().primaryKey(),
  orderId: uuid('order_id').notNull().references(() => orders.id, { onDelete: 'restrict' }),
  tripStopId: uuid('trip_stop_id').notNull().references(() => tripStops.id, { onDelete: 'restrict' }),
  confirmedBy: uuid('confirmed_by').references(() => users.id, { onDelete: 'set null' }),
  status: receiptStatusEnum('status').notNull(),
  notes: text('notes'),
  confirmedAt: timestamp('confirmed_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  uniqueIndex('uniq_store_receipt_stop').on(table.tripStopId),
]);

export type StoreReceipt = typeof storeReceipts.$inferSelect;
