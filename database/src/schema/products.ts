import { sql } from 'drizzle-orm'
import { boolean, check, foreignKey, numeric, pgTable, text, timestamp, uniqueIndex, uuid, varchar } from 'drizzle-orm/pg-core'
import { categories } from './categories.js'
import { companies } from './companies.js'
import { unitOfMeasureEnum } from './enums.js'
import { suppliers } from './suppliers.js'

export const products = pgTable('products', {
  id: uuid('id').primaryKey().defaultRandom(),
  companyId: uuid('company_id').notNull().references(() => companies.id),
  categoryId: uuid('category_id').references(() => categories.id),
  supplierId: uuid('supplier_id').references(() => suppliers.id),
  code: varchar('code', { length: 100 }).notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  unitOfMeasure: unitOfMeasureEnum('unit_of_measure').notNull(),
  minStock: numeric('min_stock', { precision: 15, scale: 4 }).notNull().default('0'),
  salePrice: numeric('sale_price', { precision: 15, scale: 4 }),
  imageUrl: text('image_url'),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  companyCodeIdx: uniqueIndex('uq_products_company_code').on(table.companyId, table.code),
  idCompanyIdx: uniqueIndex('uq_products_id_company').on(table.id, table.companyId),
  categoryCompanyFk: foreignKey({
    columns: [table.categoryId, table.companyId],
    foreignColumns: [categories.id, categories.companyId],
    name: 'fk_products_category_company',
  }),
  supplierCompanyFk: foreignKey({
    columns: [table.supplierId, table.companyId],
    foreignColumns: [suppliers.id, suppliers.companyId],
    name: 'fk_products_supplier_company',
  }),
  minStockCheck: check('ck_products_min_stock_nonnegative', sql`${table.minStock} >= 0`),
  salePriceCheck: check('ck_products_sale_price_nonnegative', sql`${table.salePrice} IS NULL OR ${table.salePrice} >= 0`),
}))
