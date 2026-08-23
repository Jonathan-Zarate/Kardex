import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { and, eq } from 'drizzle-orm'
import { db } from '../db.js'
import { users } from '@kardex/database'
import { hashPassword } from '../lib/password.js'
import { logAudit } from '../lib/audit.js'
import { authMiddleware } from '../middleware/auth.js'
import { requireRole } from '../middleware/require-role.js'
import type { AppEnv } from '../types.js'

const usersRoutes = new Hono<AppEnv>()
usersRoutes.use('*', authMiddleware)

const USER_FIELDS = {
  id: users.id,
  companyId: users.companyId,
  name: users.name,
  email: users.email,
  role: users.role,
  isActive: users.isActive,
  lockedAt: users.lockedAt,
  createdAt: users.createdAt,
  updatedAt: users.updatedAt,
}

// GET /users — lista usuarios de la empresa (solo ADMIN)
usersRoutes.get('/', requireRole('ADMIN'), async (c) => {
  const { companyId } = c.get('user')

  const result = await db
    .select(USER_FIELDS)
    .from(users)
    .where(eq(users.companyId, companyId))
    .orderBy(users.createdAt)

  return c.json(result)
})

// POST /users — crear usuario (solo ADMIN)
usersRoutes.post(
  '/',
  requireRole('ADMIN'),
  zValidator('json', z.object({
    name: z.string().min(2).max(255),
    email: z.string().email(),
    password: z.string().min(8).max(100),
    role: z.enum(['ADMIN', 'SUPERVISOR', 'WAREHOUSE']),
  })),
  async (c) => {
    const currentUser = c.get('user')
    const { name, email, password, role } = c.req.valid('json')
    const normalizedEmail = email.toLowerCase()

    const [existing] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, normalizedEmail))
      .limit(1)

    if (existing) {
      return c.json({ error: 'El email ya está registrado' }, 409)
    }

    const passwordHash = await hashPassword(password)

    const [created] = await db
      .insert(users)
      .values({
        companyId: currentUser.companyId,
        name,
        email: normalizedEmail,
        passwordHash,
        role,
      })
      .returning(USER_FIELDS)

    await logAudit({
      companyId: currentUser.companyId,
      userId: currentUser.sub,
      action: 'CREATE_USER',
      entity: 'users',
      entityId: created.id,
      newValue: { name, email: normalizedEmail, role },
    })

    return c.json(created, 201)
  },
)

// GET /users/:id — ver usuario (ADMIN o el mismo usuario)
usersRoutes.get('/:id', async (c) => {
  const currentUser = c.get('user')
  const { id } = c.req.param()

  if (currentUser.role !== 'ADMIN' && currentUser.sub !== id) {
    return c.json({ error: 'Acceso denegado' }, 403)
  }

  const [user] = await db
    .select(USER_FIELDS)
    .from(users)
    .where(and(eq(users.id, id), eq(users.companyId, currentUser.companyId)))
    .limit(1)

  if (!user) {
    return c.json({ error: 'Usuario no encontrado' }, 404)
  }

  return c.json(user)
})

// PATCH /users/:id — actualizar usuario
usersRoutes.patch(
  '/:id',
  zValidator('json', z.object({
    name: z.string().min(2).max(255).optional(),
    role: z.enum(['ADMIN', 'SUPERVISOR', 'WAREHOUSE']).optional(),
  })),
  async (c) => {
    const currentUser = c.get('user')
    const { id } = c.req.param()
    const body = c.req.valid('json')

    if (currentUser.role !== 'ADMIN' && currentUser.sub !== id) {
      return c.json({ error: 'Acceso denegado' }, 403)
    }

    if (currentUser.role !== 'ADMIN' && body.role !== undefined) {
      return c.json({ error: 'No puedes cambiar tu propio rol' }, 403)
    }

    const [target] = await db
      .select(USER_FIELDS)
      .from(users)
      .where(and(eq(users.id, id), eq(users.companyId, currentUser.companyId)))
      .limit(1)

    if (!target) {
      return c.json({ error: 'Usuario no encontrado' }, 404)
    }

    const [updated] = await db
      .update(users)
      .set({ ...body, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning(USER_FIELDS)

    await logAudit({
      companyId: currentUser.companyId,
      userId: currentUser.sub,
      action: 'UPDATE_USER',
      entity: 'users',
      entityId: id,
      oldValue: { name: target.name, role: target.role },
      newValue: body,
    })

    return c.json(updated)
  },
)

// PATCH /users/:id/deactivate — desactivar usuario (solo ADMIN)
usersRoutes.patch('/:id/deactivate', requireRole('ADMIN'), async (c) => {
  const currentUser = c.get('user')
  const { id } = c.req.param()

  if (currentUser.sub === id) {
    return c.json({ error: 'No puedes desactivar tu propia cuenta' }, 400)
  }

  const [updated] = await db
    .update(users)
    .set({ isActive: false, updatedAt: new Date() })
    .where(and(eq(users.id, id), eq(users.companyId, currentUser.companyId)))
    .returning(USER_FIELDS)

  if (!updated) {
    return c.json({ error: 'Usuario no encontrado' }, 404)
  }

  await logAudit({
    companyId: currentUser.companyId,
    userId: currentUser.sub,
    action: 'DEACTIVATE_USER',
    entity: 'users',
    entityId: id,
  })

  return c.json(updated)
})

// PATCH /users/:id/unlock — desbloquear cuenta (solo ADMIN)
usersRoutes.patch('/:id/unlock', requireRole('ADMIN'), async (c) => {
  const currentUser = c.get('user')
  const { id } = c.req.param()

  const [updated] = await db
    .update(users)
    .set({ lockedAt: null, failedLoginAttempts: 0, updatedAt: new Date() })
    .where(and(eq(users.id, id), eq(users.companyId, currentUser.companyId)))
    .returning(USER_FIELDS)

  if (!updated) {
    return c.json({ error: 'Usuario no encontrado' }, 404)
  }

  await logAudit({
    companyId: currentUser.companyId,
    userId: currentUser.sub,
    action: 'UNLOCK_USER',
    entity: 'users',
    entityId: id,
  })

  return c.json(updated)
})

export default usersRoutes
