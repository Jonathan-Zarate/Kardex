import { sql } from 'drizzle-orm'
import { check, numeric, pgTable, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core'
import { companies } from './companies'
import { products } from './products'
import { warehouses } from './warehouses'

export const stockBalances = pgTable('stock_balances', {
  id: uuid('id').primaryKey().defaultRandom(),
  companyId: uuid('company_id').notNull().references(() => companies.id),
  productId: uuid('product_id').notNull().references(() => products.id),
  warehouseId: uuid('warehouse_id').notNull().references(() => warehouses.id),
  quantity: numeric('quantity', { precision: 15, scale: 4 }).notNull().default('0'),
  avgCost: numeric('avg_cost', { precision: 15, scale: 4 }).notNull().default('0'),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  productWarehouseIdx: uniqueIndex('uq_stock_balances_product_warehouse').on(
    table.companyId,
    table.productId,
    table.warehouseId,
  ),
  quantityCheck: check('ck_stock_balances_quantity_nonnegative', sql`${table.quantity} >= 0`),
  avgCostCheck: check('ck_stock_balances_avg_cost_nonnegative', sql`${table.avgCost} >= 0`),
}))
