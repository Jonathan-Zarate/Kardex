import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { and, eq } from 'drizzle-orm'
import { db } from '../db.js'
import { isUniqueViolation } from '../lib/db-errors.js'
import { categories, products } from '@kardex/database'
import { authMiddleware } from '../middleware/auth.js'
import { requireRole } from '../middleware/require-role.js'
import type { AppEnv } from '../types.js'

const productsRoutes = new Hono<AppEnv>()
productsRoutes.use('*', authMiddleware)

const PRODUCT_FIELDS = {
  id: products.id,
  companyId: products.companyId,
  categoryId: products.categoryId,
  code: products.code,
  name: products.name,
  description: products.description,
  unitOfMeasure: products.unitOfMeasure,
  minStock: products.minStock,
  salePrice: products.salePrice,
  imageUrl: products.imageUrl,
  isActive: products.isActive,
  createdAt: products.createdAt,
  updatedAt: products.updatedAt,
}

const UOM_VALUES = ['UND', 'KG', 'LT', 'MT', 'CJA', 'PAQ'] as const

// GET /products
productsRoutes.get('/', async (c) => {
  const { companyId } = c.get('user')
  const categoryId = c.req.query('categoryId')
  const isActiveParam = c.req.query('isActive')
  const isActive = isActiveParam === undefined ? true : isActiveParam === 'true'

  const conditions = [
    eq(products.companyId, companyId),
    eq(products.isActive, isActive),
    ...(categoryId ? [eq(products.categoryId, categoryId)] : []),
  ]

  const result = await db
    .select({
      ...PRODUCT_FIELDS,
      categoryName: categories.name,
    })
    .from(products)
    .leftJoin(categories, eq(products.categoryId, categories.id))
    .where(and(...conditions))
    .orderBy(products.name)

  return c.json(result)
})

// POST /products (ADMIN o SUPERVISOR)
productsRoutes.post(
  '/',
  requireRole('ADMIN', 'SUPERVISOR'),
  zValidator('json', z.object({
    code: z.string().min(1).max(100),
    name: z.string().min(1).max(255),
    description: z.string().max(1000).optional(),
    unitOfMeasure: z.enum(UOM_VALUES),
    categoryId: z.string().uuid().optional(),
    minStock: z.number().min(0).optional().default(0),
    salePrice: z.number().min(0).optional(),
    imageUrl: z.string().url().optional(),
  })),
  async (c) => {
    const { companyId } = c.get('user')
    const { code, name, description, unitOfMeasure, categoryId, minStock, salePrice, imageUrl } = c.req.valid('json')

    const [existing] = await db
      .select({ id: products.id })
      .from(products)
      .where(and(eq(products.companyId, companyId), eq(products.code, code)))
      .limit(1)

    if (existing) {
      return c.json({ error: 'Ya existe un producto con ese código' }, 409)
    }

    try {
      const [created] = await db
        .insert(products)
        .values({
          companyId,
          categoryId: categoryId ?? null,
          code,
          name,
          description: description ?? null,
          unitOfMeasure,
          minStock: minStock.toFixed(4),
          salePrice: salePrice !== undefined ? salePrice.toFixed(4) : null,
          imageUrl: imageUrl ?? null,
        })
        .returning(PRODUCT_FIELDS)

      return c.json(created, 201)
    } catch (error) {
      if (isUniqueViolation(error)) {
        return c.json({ error: 'Ya existe un producto con ese código' }, 409)
      }
      throw error
    }
  },
)

// GET /products/:id
productsRoutes.get('/:id', async (c) => {
  const { companyId } = c.get('user')
  const { id } = c.req.param()

  const [product] = await db
    .select({
      ...PRODUCT_FIELDS,
      categoryName: categories.name,
    })
    .from(products)
    .leftJoin(categories, eq(products.categoryId, categories.id))
    .where(and(eq(products.id, id), eq(products.companyId, companyId)))
    .limit(1)

  if (!product) return c.json({ error: 'Producto no encontrado' }, 404)
  return c.json(product)
})

// PATCH /products/:id (ADMIN o SUPERVISOR)
productsRoutes.patch(
  '/:id',
  requireRole('ADMIN', 'SUPERVISOR'),
  zValidator('json', z.object({
    name: z.string().min(1).max(255).optional(),
    description: z.string().max(1000).nullable().optional(),
    unitOfMeasure: z.enum(UOM_VALUES).optional(),
    categoryId: z.string().uuid().nullable().optional(),
    minStock: z.number().min(0).optional(),
    salePrice: z.number().min(0).nullable().optional(),
    imageUrl: z.string().url().nullable().optional(),
  })),
  async (c) => {
    const { companyId } = c.get('user')
    const { id } = c.req.param()
    const { minStock, salePrice, ...rest } = c.req.valid('json')

    const [updated] = await db
      .update(products)
      .set({
        ...rest,
        ...(minStock !== undefined ? { minStock: minStock.toFixed(4) } : {}),
        ...(salePrice !== undefined ? { salePrice: salePrice !== null ? salePrice.toFixed(4) : null } : {}),
        updatedAt: new Date(),
      })
      .where(and(eq(products.id, id), eq(products.companyId, companyId)))
      .returning(PRODUCT_FIELDS)

    if (!updated) return c.json({ error: 'Producto no encontrado' }, 404)
    return c.json(updated)
  },
)

// PATCH /products/:id/deactivate (solo ADMIN)
productsRoutes.patch('/:id/deactivate', requireRole('ADMIN'), async (c) => {
  const { companyId } = c.get('user')
  const { id } = c.req.param()

  const [updated] = await db
    .update(products)
    .set({ isActive: false, updatedAt: new Date() })
    .where(and(eq(products.id, id), eq(products.companyId, companyId)))
    .returning(PRODUCT_FIELDS)

  if (!updated) return c.json({ error: 'Producto no encontrado' }, 404)
  return c.json(updated)
})

export default productsRoutes
