import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { and, desc, eq, gte, lte } from 'drizzle-orm'
import { db } from '../db'
import { inventoryMovements, products, warehouses } from '@kardex/database'
import { InventoryError, approveAdjustment, rejectAdjustment, voidMovement, processMovement } from '../lib/inventory'
import { authMiddleware } from '../middleware/auth'
import { requireRole } from '../middleware/require-role'
import type { AppEnv } from '../types'

const movementsRoutes = new Hono<AppEnv>()
movementsRoutes.use('*', authMiddleware)

const createSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('ENTRY'),
    subtype: z.enum(['PURCHASE', 'SALE_RETURN', 'POSITIVE_ADJUSTMENT']),
    productId: z.string().uuid(),
    warehouseId: z.string().uuid(),
    quantity: z.number().positive(),
    unitCost: z.number().min(0),
    reference: z.string().max(255).optional(),
    notes: z.string().max(1000).optional(),
    supplierId: z.string().uuid().optional(),
  }),
  z.object({
    type: z.literal('EXIT'),
    subtype: z.enum(['SALE', 'PURCHASE_RETURN', 'NEGATIVE_ADJUSTMENT']),
    productId: z.string().uuid(),
    warehouseId: z.string().uuid(),
    quantity: z.number().positive(),
    reference: z.string().max(255).optional(),
    notes: z.string().max(1000).optional(),
  }),
  z.object({
    type: z.literal('TRANSFER'),
    productId: z.string().uuid(),
    sourceWarehouseId: z.string().uuid(),
    targetWarehouseId: z.string().uuid(),
    quantity: z.number().positive(),
    notes: z.string().max(1000).optional(),
  }),
])

// POST /movements — crear movimiento con actualización de stock y kardex
movementsRoutes.post('/', zValidator('json', createSchema), async (c) => {
  const { companyId, sub: createdBy } = c.get('user')
  const body = c.req.valid('json')

  try {
    const result = await processMovement({ ...body, companyId, createdBy })
    return c.json(result, 201)
  } catch (err) {
    if (err instanceof InventoryError) {
      return c.json({ error: err.message }, 422)
    }
    throw err
  }
})

// GET /movements — listar movimientos con filtros
movementsRoutes.get('/', async (c) => {
  const { companyId } = c.get('user')

  const productId = c.req.query('productId')
  const warehouseId = c.req.query('warehouseId')
  const type = c.req.query('type') as 'ENTRY' | 'EXIT' | 'TRANSFER' | undefined
  const status = c.req.query('status') as 'PENDING' | 'APPROVED' | 'REJECTED' | 'VOIDED' | undefined
  const from = c.req.query('from')
  const to = c.req.query('to')
  const page = Math.max(1, parseInt(c.req.query('page') ?? '1'))
  const limit = Math.min(100, Math.max(1, parseInt(c.req.query('limit') ?? '20')))

  const conditions = [
    eq(inventoryMovements.companyId, companyId),
    ...(productId ? [eq(inventoryMovements.productId, productId)] : []),
    ...(warehouseId ? [eq(inventoryMovements.warehouseId, warehouseId)] : []),
    ...(type ? [eq(inventoryMovements.type, type)] : []),
    ...(status ? [eq(inventoryMovements.status, status)] : []),
    ...(from ? [gte(inventoryMovements.createdAt, new Date(from))] : []),
    ...(to ? [lte(inventoryMovements.createdAt, new Date(to))] : []),
  ]

  const result = await db
    .select({
      id: inventoryMovements.id,
      type: inventoryMovements.type,
      subtype: inventoryMovements.subtype,
      status: inventoryMovements.status,
      quantity: inventoryMovements.quantity,
      unitCost: inventoryMovements.unitCost,
      totalCost: inventoryMovements.totalCost,
      reference: inventoryMovements.reference,
      notes: inventoryMovements.notes,
      supplierId: inventoryMovements.supplierId,
      referenceMovementId: inventoryMovements.referenceMovementId,
      rejectionComment: inventoryMovements.rejectionComment,
      createdAt: inventoryMovements.createdAt,
      productId: products.id,
      productCode: products.code,
      productName: products.name,
      productUnit: products.unitOfMeasure,
      warehouseId: warehouses.id,
      warehouseName: warehouses.name,
    })
    .from(inventoryMovements)
    .innerJoin(products, eq(inventoryMovements.productId, products.id))
    .innerJoin(warehouses, eq(inventoryMovements.warehouseId, warehouses.id))
    .where(and(...conditions))
    .orderBy(desc(inventoryMovements.createdAt))
    .limit(limit)
    .offset((page - 1) * limit)

  return c.json({ data: result, page, limit })
})

// PATCH /movements/:id/approve — aprobar ajuste pendiente (SUPERVISOR o ADMIN)
movementsRoutes.patch(
  '/:id/approve',
  requireRole('ADMIN', 'SUPERVISOR'),
  async (c) => {
    const { companyId, sub: approvedBy } = c.get('user')
    const { id } = c.req.param()

    try {
      await approveAdjustment(id, companyId, approvedBy)
      return c.json({ ok: true })
    } catch (err) {
      if (err instanceof InventoryError) return c.json({ error: err.message }, 422)
      throw err
    }
  },
)

// PATCH /movements/:id/reject — rechazar ajuste pendiente (SUPERVISOR o ADMIN)
movementsRoutes.patch(
  '/:id/reject',
  requireRole('ADMIN', 'SUPERVISOR'),
  zValidator('json', z.object({ comment: z.string().min(1).max(500) })),
  async (c) => {
    const { companyId, sub: rejectedBy } = c.get('user')
    const { id } = c.req.param()
    const { comment } = c.req.valid('json')

    try {
      await rejectAdjustment(id, companyId, rejectedBy, comment)
      return c.json({ ok: true })
    } catch (err) {
      if (err instanceof InventoryError) return c.json({ error: err.message }, 422)
      throw err
    }
  },
)

// POST /movements/:id/void — anular movimiento mediante contraasiento (SUPERVISOR o ADMIN)
movementsRoutes.post(
  '/:id/void',
  requireRole('ADMIN', 'SUPERVISOR'),
  zValidator('json', z.object({ notes: z.string().max(500).optional() })),
  async (c) => {
    const { companyId, sub: voidedBy } = c.get('user')
    const { id } = c.req.param()
    const { notes } = c.req.valid('json')

    try {
      await voidMovement(id, companyId, voidedBy, notes)
      return c.json({ ok: true })
    } catch (err) {
      if (err instanceof InventoryError) return c.json({ error: err.message }, 422)
      throw err
    }
  },
)

// GET /movements/:id — detalle de movimiento
movementsRoutes.get('/:id', async (c) => {
  const { companyId } = c.get('user')
  const { id } = c.req.param()

  const [movement] = await db
    .select({
      id: inventoryMovements.id,
      companyId: inventoryMovements.companyId,
      type: inventoryMovements.type,
      subtype: inventoryMovements.subtype,
      status: inventoryMovements.status,
      quantity: inventoryMovements.quantity,
      unitCost: inventoryMovements.unitCost,
      totalCost: inventoryMovements.totalCost,
      reference: inventoryMovements.reference,
      notes: inventoryMovements.notes,
      supplierId: inventoryMovements.supplierId,
      referenceMovementId: inventoryMovements.referenceMovementId,
      approvedBy: inventoryMovements.approvedBy,
      approvedAt: inventoryMovements.approvedAt,
      createdBy: inventoryMovements.createdBy,
      createdAt: inventoryMovements.createdAt,
      productId: products.id,
      productCode: products.code,
      productName: products.name,
      productUnit: products.unitOfMeasure,
      warehouseId: warehouses.id,
      warehouseName: warehouses.name,
    })
    .from(inventoryMovements)
    .innerJoin(products, eq(inventoryMovements.productId, products.id))
    .innerJoin(warehouses, eq(inventoryMovements.warehouseId, warehouses.id))
    .where(and(eq(inventoryMovements.id, id), eq(inventoryMovements.companyId, companyId)))
    .limit(1)

  if (!movement) return c.json({ error: 'Movimiento no encontrado' }, 404)
  return c.json(movement)
})

export default movementsRoutes
