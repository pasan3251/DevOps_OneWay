import { pgTable, uuid, varchar, numeric, boolean, timestamp, index } from 'drizzle-orm/pg-core';
import { brandEnum, tempRequirementEnum } from './enums';

export const products = pgTable('products', {
  id: uuid('id').defaultRandom().primaryKey(),
  sku: varchar('sku', { length: 64 }).notNull().unique(),
  name: varchar('name', { length: 128 }).notNull(),
  brand: brandEnum('brand').notNull(),
  category: varchar('category', { length: 64 }).notNull(),
  tempRequirement: tempRequirementEnum('temp_requirement').notNull().default('ambient'),
  unitWeightKg: numeric('unit_weight_kg', { precision: 8, scale: 3 }).notNull(),
  unitVolumeM3: numeric('unit_volume_m3', { precision: 8, scale: 4 }).notNull(),
  unitPrice: numeric('unit_price', { precision: 12, scale: 2 }).notNull(),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index('idx_products_brand_temp').on(table.brand, table.tempRequirement),
]);

export type Product = typeof products.$inferSelect;
export type NewProduct = typeof products.$inferInsert;
