import type { MiddlewareHandler } from 'hono'
import type { AppEnv } from '../types.js'

type Role = 'ADMIN' | 'SUPERVISOR' | 'WAREHOUSE'

export const requireRole =
  (...roles: Role[]): MiddlewareHandler<AppEnv> =>
  async (c, next) => {
    const user = c.get('user')
    if (!roles.includes(user.role)) {
      return c.json({ error: 'Acceso denegado' }, 403)
    }
    await next()
  }
