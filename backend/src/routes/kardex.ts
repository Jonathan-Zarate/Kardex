import { Hono } from 'hono'
import { and, asc, eq, gte, lte } from 'drizzle-orm'
import { db } from '../db.js'
import { inventoryMovements, kardexEntries, products, warehouses } from '@kardex/database'
import { authMiddleware } from '../middleware/auth.js'
import type { AppEnv } from '../types.js'

const kardexRoutes = new Hono<AppEnv>()
kardexRoutes.use('*', authMiddleware)

// GET /kardex — reporte Kardex por producto + almacén
// Requiere: productId
// Opcional: warehouseId, from, to
kardexRoutes.get('/', async (c) => {
  const { companyId } = c.get('user')

  const productId = c.req.query('productId')
  const warehouseId = c.req.query('warehouseId')
  const from = c.req.query('from')
  const to = c.req.query('to')

  if (!productId) {
    return c.json({ error: 'El parámetro productId es obligatorio' }, 400)
  }

  const conditions = [
    eq(kardexEntries.companyId, companyId),
    eq(kardexEntries.productId, productId),
    ...(warehouseId ? [eq(kardexEntries.warehouseId, warehouseId)] : []),
    ...(from ? [gte(kardexEntries.date, new Date(from))] : []),
    ...(to ? [lte(kardexEntries.date, new Date(to))] : []),
  ]

  const result = await db
    .select({
      id: kardexEntries.id,
      date: kardexEntries.date,
      movementId: kardexEntries.movementId,
      movementType: inventoryMovements.type,
      movementSubtype: inventoryMovements.subtype,
      movementReference: inventoryMovements.reference,
      // Entradas
      inQty: kardexEntries.inQty,
      inUnitCost: kardexEntries.inUnitCost,
      inTotalCost: kardexEntries.inTotalCost,
      // Salidas
      outQty: kardexEntries.outQty,
      outUnitCost: kardexEntries.outUnitCost,
      outTotalCost: kardexEntries.outTotalCost,
      // Saldo
      balanceQty: kardexEntries.balanceQty,
      balanceAvgCost: kardexEntries.balanceAvgCost,
      balanceTotalValue: kardexEntries.balanceTotalValue,
      // Contexto
      productName: products.name,
      productCode: products.code,
      productUnit: products.unitOfMeasure,
      warehouseName: warehouses.name,
    })
    .from(kardexEntries)
    .innerJoin(inventoryMovements, eq(kardexEntries.movementId, inventoryMovements.id))
    .innerJoin(products, eq(kardexEntries.productId, products.id))
    .innerJoin(warehouses, eq(kardexEntries.warehouseId, warehouses.id))
    .where(and(...conditions))
    .orderBy(asc(kardexEntries.date), asc(kardexEntries.id))

  return c.json(result)
})

export default kardexRoutes
