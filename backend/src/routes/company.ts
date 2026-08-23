import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { eq } from 'drizzle-orm'
import { db } from '../db.js'
import { companies } from '@kardex/database'
import { logAudit } from '../lib/audit.js'
import { authMiddleware } from '../middleware/auth.js'
import { requireRole } from '../middleware/require-role.js'
import type { AppEnv } from '../types.js'

const companyRoutes = new Hono<AppEnv>()
companyRoutes.use('*', authMiddleware)

const COMPANY_FIELDS = {
  id: companies.id,
  name: companies.name,
  ruc: companies.ruc,
  address: companies.address,
  logoUrl: companies.logoUrl,
  currency: companies.currency,
  timezone: companies.timezone,
  decimalSeparator: companies.decimalSeparator,
  dateFormat: companies.dateFormat,
  isActive: companies.isActive,
  createdAt: companies.createdAt,
  updatedAt: companies.updatedAt,
}

// GET /company — datos de la empresa actual
companyRoutes.get('/', async (c) => {
  const { companyId } = c.get('user')

  const [company] = await db
    .select(COMPANY_FIELDS)
    .from(companies)
    .where(eq(companies.id, companyId))
    .limit(1)

  if (!company) {
    return c.json({ error: 'Empresa no encontrada' }, 404)
  }

  return c.json(company)
})

// PATCH /company — actualizar empresa (solo ADMIN)
companyRoutes.patch(
  '/',
  requireRole('ADMIN'),
  zValidator('json', z.object({
    name: z.string().min(2).max(255).optional(),
    ruc: z.string().regex(/^\d{11}$/, 'RUC debe tener 11 dígitos').optional(),
    address: z.string().max(500).optional(),
    currency: z.string().length(3).optional(),
    timezone: z.string().max(50).optional(),
    decimalSeparator: z.enum(['.', ',']).optional(),
    dateFormat: z.string().max(20).optional(),
  })),
  async (c) => {
    const { companyId, sub: userId } = c.get('user')
    const body = c.req.valid('json')

    const [updated] = await db
      .update(companies)
      .set({ ...body, updatedAt: new Date() })
      .where(eq(companies.id, companyId))
      .returning(COMPANY_FIELDS)

    await logAudit({
      companyId,
      userId,
      action: 'UPDATE_COMPANY',
      entity: 'companies',
      entityId: companyId,
      newValue: body,
    })

    return c.json(updated)
  },
)

export default companyRoutes
