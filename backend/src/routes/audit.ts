import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { and, desc, eq, gte, ilike, lte, sql } from 'drizzle-orm'
import { db } from '../db'
import { auditLogs, users } from '@kardex/database'
import { authMiddleware } from '../middleware/auth'
import { requireRole } from '../middleware/require-role'
import type { AppEnv } from '../types'

const auditRoutes = new Hono<AppEnv>()
auditRoutes.use('*', authMiddleware)
auditRoutes.use('*', requireRole('ADMIN'))

auditRoutes.get(
  '/',
  zValidator('query', z.object({
    entity: z.string().optional(),
    action: z.string().optional(),
    userId: z.string().uuid().optional(),
    from: z.string().optional(),
    to: z.string().optional(),
    limit: z.coerce.number().int().min(1).max(100).default(50),
    offset: z.coerce.number().int().min(0).default(0),
  })),
  async (c) => {
    const currentUser = c.get('user')
    const { entity, action, userId, from, to, limit, offset } = c.req.valid('query')

    const conditions = [eq(auditLogs.companyId, currentUser.companyId)]
    if (entity) conditions.push(ilike(auditLogs.entity, entity))
    if (action) conditions.push(ilike(auditLogs.action, `%${action}%`))
    if (userId) conditions.push(eq(auditLogs.userId, userId))
    if (from) conditions.push(gte(auditLogs.createdAt, new Date(from)))
    if (to) conditions.push(lte(auditLogs.createdAt, new Date(`${to}T23:59:59Z`)))

    const where = and(...conditions)

    const [rows, countResult] = await Promise.all([
      db
        .select({
          id: auditLogs.id,
          action: auditLogs.action,
          entity: auditLogs.entity,
          entityId: auditLogs.entityId,
          oldValue: auditLogs.oldValue,
          newValue: auditLogs.newValue,
          ip: auditLogs.ip,
          createdAt: auditLogs.createdAt,
          userId: auditLogs.userId,
          userName: users.name,
          userEmail: users.email,
        })
        .from(auditLogs)
        .leftJoin(users, eq(auditLogs.userId, users.id))
        .where(where)
        .orderBy(desc(auditLogs.createdAt))
        .limit(limit)
        .offset(offset),
      db
        .select({ total: sql<number>`count(*)::int` })
        .from(auditLogs)
        .where(where),
    ])

    return c.json({ data: rows, total: countResult[0]?.total ?? 0, limit, offset })
  },
)

// GET /audit-logs/entities — lista de entidades únicas (para el filtro)
auditRoutes.get('/entities', async (c) => {
  const { companyId } = c.get('user')
  const rows = await db
    .selectDistinct({ entity: auditLogs.entity })
    .from(auditLogs)
    .where(eq(auditLogs.companyId, companyId))
    .orderBy(auditLogs.entity)
  return c.json(rows.map((r) => r.entity))
})

export default auditRoutes
