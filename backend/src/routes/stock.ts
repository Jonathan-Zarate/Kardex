import { Hono } from 'hono'
import { and, eq } from 'drizzle-orm'
import { db } from '../db.js'
import { products, stockBalances, warehouses } from '@kardex/database'
import { authMiddleware } from '../middleware/auth.js'
import type { AppEnv } from '../types.js'

const stockRoutes = new Hono<AppEnv>()
stockRoutes.use('*', authMiddleware)

const STOCK_FIELDS = {
  id: stockBalances.id,
  productId: stockBalances.productId,
  warehouseId: stockBalances.warehouseId,
  quantity: stockBalances.quantity,
  avgCost: stockBalances.avgCost,
  updatedAt: stockBalances.updatedAt,
  productCode: products.code,
  productName: products.name,
  productUnit: products.unitOfMeasure,
  productMinStock: products.minStock,
  warehouseName: warehouses.name,
}

// GET /stock — stock con filtros opcionales por producto o almacén
stockRoutes.get('/', async (c) => {
  const { companyId } = c.get('user')
  const productId = c.req.query('productId')
  const warehouseId = c.req.query('warehouseId')

  const conditions = [
    eq(stockBalances.companyId, companyId),
    ...(productId ? [eq(stockBalances.productId, productId)] : []),
    ...(warehouseId ? [eq(stockBalances.warehouseId, warehouseId)] : []),
  ]

  const result = await db
    .select(STOCK_FIELDS)
    .from(stockBalances)
    .innerJoin(products, eq(stockBalances.productId, products.id))
    .innerJoin(warehouses, eq(stockBalances.warehouseId, warehouses.id))
    .where(and(...conditions))
    .orderBy(products.name, warehouses.name)

  return c.json(result)
})

// GET /stock/:productId — stock de un producto en todos los almacenes
stockRoutes.get('/:productId', async (c) => {
  const { companyId } = c.get('user')
  const { productId } = c.req.param()

  const result = await db
    .select(STOCK_FIELDS)
    .from(stockBalances)
    .innerJoin(products, eq(stockBalances.productId, products.id))
    .innerJoin(warehouses, eq(stockBalances.warehouseId, warehouses.id))
    .where(and(eq(stockBalances.companyId, companyId), eq(stockBalances.productId, productId)))
    .orderBy(warehouses.name)

  return c.json(result)
})

export default stockRoutes
