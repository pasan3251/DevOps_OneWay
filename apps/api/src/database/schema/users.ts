import { pgTable, uuid, varchar, boolean, timestamp, index } from 'drizzle-orm/pg-core';
import { depots } from './depots';
import { outlets } from './outlets';
import { userRoleEnum } from './enums';

export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  passwordHash: varchar('password_hash', { length: 255 }).notNull(),
  firstName: varchar('first_name', { length: 64 }).notNull(),
  lastName: varchar('last_name', { length: 64 }).notNull(),
  role: userRoleEnum('role').notNull(),
  outletId: uuid('outlet_id').references(() => outlets.id, { onDelete: 'set null' }),
  depotId: uuid('depot_id').references(() => depots.id, { onDelete: 'set null' }),
  phone: varchar('phone', { length: 32 }),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index('idx_users_role').on(table.role),
  index('idx_users_outlet').on(table.outletId),
  index('idx_users_depot').on(table.depotId),
]);

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
