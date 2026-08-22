import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { and, eq } from 'drizzle-orm'
import { db } from '../db'
import { warehouses } from '@kardex/database'
import { authMiddleware } from '../middleware/auth'
import { requireRole } from '../middleware/require-role'
import type { AppEnv } from '../types'

const warehousesRoutes = new Hono<AppEnv>()
warehousesRoutes.use('*', authMiddleware)

const WAREHOUSE_FIELDS = {
  id: warehouses.id,
  companyId: warehouses.companyId,
  name: warehouses.name,
  location: warehouses.location,
  isActive: warehouses.isActive,
  createdAt: warehouses.createdAt,
  updatedAt: warehouses.updatedAt,
}

// GET /warehouses — listar almacenes de la empresa
warehousesRoutes.get('/', async (c) => {
  const { companyId } = c.get('user')

  const result = await db
    .select(WAREHOUSE_FIELDS)
    .from(warehouses)
    .where(eq(warehouses.companyId, companyId))
    .orderBy(warehouses.name)

  return c.json(result)
})

// POST /warehouses — crear almacén (ADMIN o SUPERVISOR)
warehousesRoutes.post(
  '/',
  requireRole('ADMIN', 'SUPERVISOR'),
  zValidator('json', z.object({
    name: z.string().min(1).max(255),
    location: z.string().max(1000).optional(),
  })),
  async (c) => {
    const { companyId } = c.get('user')
    const { name, location } = c.req.valid('json')

    const [created] = await db
      .insert(warehouses)
      .values({ companyId, name, location: location ?? null })
      .returning(WAREHOUSE_FIELDS)

    return c.json(created, 201)
  },
)

// GET /warehouses/:id — obtener almacén
warehousesRoutes.get('/:id', async (c) => {
  const { companyId } = c.get('user')
  const { id } = c.req.param()

  const [warehouse] = await db
    .select(WAREHOUSE_FIELDS)
    .from(warehouses)
    .where(and(eq(warehouses.id, id), eq(warehouses.companyId, companyId)))
    .limit(1)

  if (!warehouse) {
    return c.json({ error: 'Almacén no encontrado' }, 404)
  }

  return c.json(warehouse)
})

// PATCH /warehouses/:id — actualizar almacén (ADMIN o SUPERVISOR)
warehousesRoutes.patch(
  '/:id',
  requireRole('ADMIN', 'SUPERVISOR'),
  zValidator('json', z.object({
    name: z.string().min(1).max(255).optional(),
    location: z.string().max(1000).nullable().optional(),
  })),
  async (c) => {
    const { companyId } = c.get('user')
    const { id } = c.req.param()
    const body = c.req.valid('json')

    const [updated] = await db
      .update(warehouses)
      .set({ ...body, updatedAt: new Date() })
      .where(and(eq(warehouses.id, id), eq(warehouses.companyId, companyId)))
      .returning(WAREHOUSE_FIELDS)

    if (!updated) {
      return c.json({ error: 'Almacén no encontrado' }, 404)
    }

    return c.json(updated)
  },
)

// PATCH /warehouses/:id/deactivate — desactivar almacén (solo ADMIN)
warehousesRoutes.patch('/:id/deactivate', requireRole('ADMIN'), async (c) => {
  const { companyId } = c.get('user')
  const { id } = c.req.param()

  const [updated] = await db
    .update(warehouses)
    .set({ isActive: false, updatedAt: new Date() })
    .where(and(eq(warehouses.id, id), eq(warehouses.companyId, companyId)))
    .returning(WAREHOUSE_FIELDS)

  if (!updated) {
    return c.json({ error: 'Almacén no encontrado' }, 404)
  }

  return c.json(updated)
})

export default warehousesRoutes
