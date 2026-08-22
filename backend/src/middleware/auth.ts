import type { MiddlewareHandler } from 'hono'
import { verifyAccessToken } from '../lib/jwt'
import type { AppEnv } from '../types'

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

  c.set('user', payload)
  await next()
}
