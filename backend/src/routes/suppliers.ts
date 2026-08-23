import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { and, eq } from 'drizzle-orm'
import { db } from '../db.js'
import { suppliers } from '@kardex/database'
import { authMiddleware } from '../middleware/auth.js'
import { requireRole } from '../middleware/require-role.js'
import type { AppEnv } from '../types.js'

const suppliersRoutes = new Hono<AppEnv>()
suppliersRoutes.use('*', authMiddleware)

const FIELDS = {
  id: suppliers.id,
  companyId: suppliers.companyId,
  name: suppliers.name,
  ruc: suppliers.ruc,
  phone: suppliers.phone,
  email: suppliers.email,
  address: suppliers.address,
  isActive: suppliers.isActive,
  createdAt: suppliers.createdAt,
  updatedAt: suppliers.updatedAt,
}

// GET /suppliers
suppliersRoutes.get('/', async (c) => {
  const { companyId } = c.get('user')
  const isActiveParam = c.req.query('isActive')
  const isActive = isActiveParam === undefined ? true : isActiveParam === 'true'

  const result = await db
    .select(FIELDS)
    .from(suppliers)
    .where(and(eq(suppliers.companyId, companyId), eq(suppliers.isActive, isActive)))
    .orderBy(suppliers.name)

  return c.json(result)
})

// POST /suppliers (ADMIN o SUPERVISOR)
suppliersRoutes.post(
  '/',
  requireRole('ADMIN', 'SUPERVISOR'),
  zValidator('json', z.object({
    name: z.string().min(1).max(255),
    ruc: z.string().regex(/^\d{11}$/, 'RUC debe tener 11 dígitos').optional(),
    phone: z.string().max(20).optional(),
    email: z.string().email().optional(),
    address: z.string().max(500).optional(),
  })),
  async (c) => {
    const { companyId } = c.get('user')
    const { name, ruc, phone, email, address } = c.req.valid('json')

    if (ruc) {
      const [existing] = await db
        .select({ id: suppliers.id })
        .from(suppliers)
        .where(and(eq(suppliers.companyId, companyId), eq(suppliers.ruc, ruc)))
        .limit(1)

      if (existing) {
        return c.json({ error: 'Ya existe un proveedor con ese RUC' }, 409)
      }
    }

    const [created] = await db
      .insert(suppliers)
      .values({
        companyId,
        name,
        ruc: ruc ?? null,
        phone: phone ?? null,
        email: email ?? null,
        address: address ?? null,
      })
      .returning(FIELDS)

    return c.json(created, 201)
  },
)

// GET /suppliers/:id
suppliersRoutes.get('/:id', async (c) => {
  const { companyId } = c.get('user')
  const { id } = c.req.param()

  const [supplier] = await db
    .select(FIELDS)
    .from(suppliers)
    .where(and(eq(suppliers.id, id), eq(suppliers.companyId, companyId)))
    .limit(1)

  if (!supplier) return c.json({ error: 'Proveedor no encontrado' }, 404)
  return c.json(supplier)
})

// PATCH /suppliers/:id (ADMIN o SUPERVISOR)
suppliersRoutes.patch(
  '/:id',
  requireRole('ADMIN', 'SUPERVISOR'),
  zValidator('json', z.object({
    name: z.string().min(1).max(255).optional(),
    ruc: z.string().regex(/^\d{11}$/).nullable().optional(),
    phone: z.string().max(20).nullable().optional(),
    email: z.string().email().nullable().optional(),
    address: z.string().max(500).nullable().optional(),
  })),
  async (c) => {
    const { companyId } = c.get('user')
    const { id } = c.req.param()
    const body = c.req.valid('json')

    const [updated] = await db
      .update(suppliers)
      .set({ ...body, updatedAt: new Date() })
      .where(and(eq(suppliers.id, id), eq(suppliers.companyId, companyId)))
      .returning(FIELDS)

    if (!updated) return c.json({ error: 'Proveedor no encontrado' }, 404)
    return c.json(updated)
  },
)

// PATCH /suppliers/:id/deactivate (solo ADMIN)
suppliersRoutes.patch('/:id/deactivate', requireRole('ADMIN'), async (c) => {
  const { companyId } = c.get('user')
  const { id } = c.req.param()

  const [updated] = await db
    .update(suppliers)
    .set({ isActive: false, updatedAt: new Date() })
    .where(and(eq(suppliers.id, id), eq(suppliers.companyId, companyId)))
    .returning(FIELDS)

  if (!updated) return c.json({ error: 'Proveedor no encontrado' }, 404)
  return c.json(updated)
})

export default suppliersRoutes
