import type { MiddlewareHandler } from 'hono'
import { and, eq, isNull } from 'drizzle-orm'
import { companies, users } from '@kardex/database'
import { db } from '../db.js'
import { verifyAccessToken } from '../lib/jwt.js'
import type { AppEnv } from '../types.js'

export const authMiddleware: MiddlewareHandler<AppEnv> = async (c, next) => {
  const header = c.req.header('Authorization')
  if (!header?.startsWith('Bearer ')) {
    return c.json({ error: 'No autorizado' }, 401)
  }

  const token = header.slice(7)
  const payload = await verifyAccessToken(token)

  if (!payload) {
    return c.json({ error: 'Token inválido o expirado' }, 401)
  }

  const [user] = await db.select({
    sub: users.id,
    companyId: users.companyId,
    role: users.role,
    email: users.email,
  }).from(users)
    .innerJoin(companies, eq(companies.id, users.companyId))
    .where(and(
      eq(users.id, payload.sub),
      eq(users.isActive, true),
      isNull(users.lockedAt),
      eq(companies.isActive, true),
    ))
    .limit(1)

  if (!user) {
    return c.json({ error: 'Sesión no disponible' }, 401)
  }

  c.set('user', user)
  await next()
}
