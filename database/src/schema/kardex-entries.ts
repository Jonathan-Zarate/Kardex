import { index, numeric, pgTable, timestamp, uuid } from 'drizzle-orm/pg-core'
import { companies } from './companies'
import { inventoryMovements } from './inventory-movements'
import { products } from './products'
import { warehouses } from './warehouses'

export const kardexEntries = pgTable('kardex_entries', {
  id: uuid('id').primaryKey().defaultRandom(),
  movementId: uuid('movement_id').notNull().references(() => inventoryMovements.id),
  companyId: uuid('company_id').notNull().references(() => companies.id),
  productId: uuid('product_id').notNull().references(() => products.id),
  warehouseId: uuid('warehouse_id').notNull().references(() => warehouses.id),
  date: timestamp('date', { withTimezone: true }).notNull(),
  // Columna entrada
  inQty: numeric('in_qty', { precision: 15, scale: 4 }).notNull().default('0'),
  inUnitCost: numeric('in_unit_cost', { precision: 15, scale: 4 }).notNull().default('0'),
  inTotalCost: numeric('in_total_cost', { precision: 15, scale: 4 }).notNull().default('0'),
  // Columna salida
  outQty: numeric('out_qty', { precision: 15, scale: 4 }).notNull().default('0'),
  outUnitCost: numeric('out_unit_cost', { precision: 15, scale: 4 }).notNull().default('0'),
  outTotalCost: numeric('out_total_cost', { precision: 15, scale: 4 }).notNull().default('0'),
  // Saldo tras el movimiento (Promedio Ponderado Móvil)
  balanceQty: numeric('balance_qty', { precision: 15, scale: 4 }).notNull(),
  balanceAvgCost: numeric('balance_avg_cost', { precision: 15, scale: 4 }).notNull(),
  balanceTotalValue: numeric('balance_total_value', { precision: 15, scale: 4 }).notNull(),
}, (table) => ({
  productWarehouseIdx: index('idx_kardex_company_product_warehouse').on(
    table.companyId,
    table.productId,
    table.warehouseId,
  ),
  dateIdx: index('idx_kardex_date').on(
    table.companyId,
    table.productId,
    table.warehouseId,
    table.date,
  ),
}))
