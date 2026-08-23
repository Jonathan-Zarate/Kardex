import { sql } from 'drizzle-orm'
import { check, foreignKey, index, numeric, pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core'
import type { AnyPgColumn } from 'drizzle-orm/pg-core'
import { companies } from './companies.js'
import { movementStatusEnum, movementSubtypeEnum, movementTypeEnum } from './enums.js'
import { products } from './products.js'
import { suppliers } from './suppliers.js'
import { users } from './users.js'
import { warehouses } from './warehouses.js'

export const inventoryMovements = pgTable('inventory_movements', {
  id: uuid('id').primaryKey().defaultRandom(),
  companyId: uuid('company_id').notNull().references(() => companies.id),
  productId: uuid('product_id').notNull().references(() => products.id),
  warehouseId: uuid('warehouse_id').notNull().references(() => warehouses.id),
  type: movementTypeEnum('type').notNull(),
  subtype: movementSubtypeEnum('subtype').notNull(),
  status: movementStatusEnum('status').notNull().default('APPROVED'),
  quantity: numeric('quantity', { precision: 15, scale: 4 }).notNull(),
  unitCost: numeric('unit_cost', { precision: 15, scale: 4 }).notNull().default('0'),
  totalCost: numeric('total_cost', { precision: 15, scale: 4 }).notNull().default('0'),
  reference: text('reference'),
  notes: text('notes'),
  supplierId: uuid('supplier_id').references(() => suppliers.id),
  // Self-reference: devoluciones apuntan al movimiento original
  referenceMovementId: uuid('reference_movement_id').references(
    (): AnyPgColumn => inventoryMovements.id,
  ),
  approvedBy: uuid('approved_by').references(() => users.id),
  approvedAt: timestamp('approved_at', { withTimezone: true }),
  rejectionComment: text('rejection_comment'),
  createdBy: uuid('created_by').notNull().references(() => users.id),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  companyProductIdx: index('idx_movements_company_product').on(table.companyId, table.productId),
  companyCreatedAtIdx: index('idx_movements_company_created_at').on(table.companyId, table.createdAt),
  idCompanyIdx: uniqueIndex('uq_movements_id_company').on(table.id, table.companyId),
  productCompanyFk: foreignKey({
    columns: [table.productId, table.companyId],
    foreignColumns: [products.id, products.companyId],
    name: 'fk_movements_product_company',
  }),
  warehouseCompanyFk: foreignKey({
    columns: [table.warehouseId, table.companyId],
    foreignColumns: [warehouses.id, warehouses.companyId],
    name: 'fk_movements_warehouse_company',
  }),
  supplierCompanyFk: foreignKey({
    columns: [table.supplierId, table.companyId],
    foreignColumns: [suppliers.id, suppliers.companyId],
    name: 'fk_movements_supplier_company',
  }),
  approvedByCompanyFk: foreignKey({
    columns: [table.approvedBy, table.companyId],
    foreignColumns: [users.id, users.companyId],
    name: 'fk_movements_approved_by_company',
  }),
  createdByCompanyFk: foreignKey({
    columns: [table.createdBy, table.companyId],
    foreignColumns: [users.id, users.companyId],
    name: 'fk_movements_created_by_company',
  }),
  referenceCompanyFk: foreignKey({
    columns: [table.referenceMovementId, table.companyId],
    foreignColumns: [table.id, table.companyId],
    name: 'fk_movements_reference_company',
  }),
  quantityCheck: check('ck_movements_quantity_positive', sql`${table.quantity} > 0`),
  unitCostCheck: check('ck_movements_unit_cost_nonnegative', sql`${table.unitCost} >= 0`),
  totalCostCheck: check('ck_movements_total_cost_nonnegative', sql`${table.totalCost} >= 0`),
  typeSubtypeCheck: check('ck_movements_type_subtype', sql`
    (${table.type} = 'ENTRY' AND ${table.subtype} IN ('PURCHASE', 'SALE_RETURN', 'POSITIVE_ADJUSTMENT', 'VOID')) OR
    (${table.type} = 'EXIT' AND ${table.subtype} IN ('SALE', 'PURCHASE_RETURN', 'NEGATIVE_ADJUSTMENT', 'VOID')) OR
    (${table.type} = 'TRANSFER' AND ${table.subtype} IN ('TRANSFER_IN', 'TRANSFER_OUT'))
  `),
  requiredReferenceCheck: check('ck_movements_required_reference', sql`
    ${table.subtype} NOT IN ('SALE_RETURN', 'PURCHASE_RETURN', 'TRANSFER_IN', 'VOID')
    OR ${table.referenceMovementId} IS NOT NULL
  `),
}))
