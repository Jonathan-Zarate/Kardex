import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { and, eq } from 'drizzle-orm'
import { db } from '../db'
import { categories } from '@kardex/database'
import { authMiddleware } from '../middleware/auth'
import { requireRole } from '../middleware/require-role'
import type { AppEnv } from '../types'

const categoriesRoutes = new Hono<AppEnv>()
categoriesRoutes.use('*', authMiddleware)

const FIELDS = {
  id: categories.id,
  companyId: categories.companyId,
  name: categories.name,
  description: categories.description,
  isActive: categories.isActive,
  createdAt: categories.createdAt,
  updatedAt: categories.updatedAt,
}

// GET /categories
categoriesRoutes.get('/', async (c) => {
  const { companyId } = c.get('user')
  const isActiveParam = c.req.query('isActive')
  const isActive = isActiveParam === undefined ? true : isActiveParam === 'true'

  const result = await db
    .select(FIELDS)
    .from(categories)
    .where(and(eq(categories.companyId, companyId), eq(categories.isActive, isActive)))
    .orderBy(categories.name)

  return c.json(result)
})

// POST /categories (ADMIN o SUPERVISOR)
categoriesRoutes.post(
  '/',
  requireRole('ADMIN', 'SUPERVISOR'),
  zValidator('json', z.object({
    name: z.string().min(1).max(255),
    description: z.string().max(1000).optional(),
  })),
  async (c) => {
    const { companyId } = c.get('user')
    const { name, description } = c.req.valid('json')

    const [existing] = await db
      .select({ id: categories.id })
      .from(categories)
      .where(and(eq(categories.companyId, companyId), eq(categories.name, name)))
      .limit(1)

    if (existing) {
      return c.json({ error: 'Ya existe una categoría con ese nombre' }, 409)
    }

    const [created] = await db
      .insert(categories)
      .values({ companyId, name, description: description ?? null })
      .returning(FIELDS)

    return c.json(created, 201)
  },
)

// GET /categories/:id
categoriesRoutes.get('/:id', async (c) => {
  const { companyId } = c.get('user')
  const { id } = c.req.param()

  const [category] = await db
    .select(FIELDS)
    .from(categories)
    .where(and(eq(categories.id, id), eq(categories.companyId, companyId)))
    .limit(1)

  if (!category) return c.json({ error: 'Categoría no encontrada' }, 404)
  return c.json(category)
})

// PATCH /categories/:id (ADMIN o SUPERVISOR)
categoriesRoutes.patch(
  '/:id',
  requireRole('ADMIN', 'SUPERVISOR'),
  zValidator('json', z.object({
    name: z.string().min(1).max(255).optional(),
    description: z.string().max(1000).nullable().optional(),
  })),
  async (c) => {
    const { companyId } = c.get('user')
    const { id } = c.req.param()
    const body = c.req.valid('json')

    const [updated] = await db
      .update(categories)
      .set({ ...body, updatedAt: new Date() })
      .where(and(eq(categories.id, id), eq(categories.companyId, companyId)))
      .returning(FIELDS)

    if (!updated) return c.json({ error: 'Categoría no encontrada' }, 404)
    return c.json(updated)
  },
)

// PATCH /categories/:id/deactivate (solo ADMIN)
categoriesRoutes.patch('/:id/deactivate', requireRole('ADMIN'), async (c) => {
  const { companyId } = c.get('user')
  const { id } = c.req.param()

  const [updated] = await db
    .update(categories)
    .set({ isActive: false, updatedAt: new Date() })
    .where(and(eq(categories.id, id), eq(categories.companyId, companyId)))
    .returning(FIELDS)

  if (!updated) return c.json({ error: 'Categoría no encontrada' }, 404)
  return c.json(updated)
})

export default categoriesRoutes
