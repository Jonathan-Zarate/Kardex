import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { and, eq, gt, isNull } from 'drizzle-orm'
import { db } from '../db'
import { passwordResetTokens, refreshTokens, users } from '@kardex/database'
import { signAccessToken } from '../lib/jwt'
import { hashPassword, verifyPassword } from '../lib/password'
import { generateToken, hashToken } from '../lib/tokens'
import { sendPasswordResetEmail } from '../lib/email'
import { logAudit } from '../lib/audit'
import { authMiddleware } from '../middleware/auth'
import type { AppEnv } from '../types'

const authRoutes = new Hono<AppEnv>()

const REFRESH_TTL_MS = 7 * 24 * 60 * 60 * 1000 // 7 días
const RESET_TTL_MS = 30 * 60 * 1000 // 30 minutos
const MAX_FAILED_ATTEMPTS = 5

// POST /auth/login
authRoutes.post(
  '/login',
  zValidator('json', z.object({
    email: z.string().email(),
    password: z.string().min(1),
  })),
  async (c) => {
    const { email, password } = c.req.valid('json')
    const ip = c.req.header('x-forwarded-for') ?? c.req.header('x-real-ip') ?? 'unknown'

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, email.toLowerCase()))
      .limit(1)

    if (!user || !user.isActive) {
      return c.json({ error: 'Credenciales inválidas' }, 401)
    }

    if (user.lockedAt) {
      return c.json({ error: 'Cuenta bloqueada. Contacta al administrador.' }, 403)
    }

    const valid = await verifyPassword(password, user.passwordHash)

    if (!valid) {
      const attempts = user.failedLoginAttempts + 1
      const shouldLock = attempts >= MAX_FAILED_ATTEMPTS

      await db
        .update(users)
        .set({
          failedLoginAttempts: attempts,
          ...(shouldLock ? { lockedAt: new Date() } : {}),
          updatedAt: new Date(),
        })
        .where(eq(users.id, user.id))

      if (shouldLock) {
        await logAudit({
          companyId: user.companyId,
          userId: user.id,
          action: 'ACCOUNT_LOCKED',
          entity: 'users',
          entityId: user.id,
          ip,
        })
        return c.json({ error: 'Cuenta bloqueada tras 5 intentos fallidos.' }, 403)
      }

      return c.json({ error: 'Credenciales inválidas' }, 401)
    }

    await db
      .update(users)
      .set({ failedLoginAttempts: 0, updatedAt: new Date() })
      .where(eq(users.id, user.id))

    const accessToken = await signAccessToken({
      sub: user.id,
      companyId: user.companyId,
      role: user.role,
      email: user.email,
    })

    const rawRefreshToken = generateToken()
    await db.insert(refreshTokens).values({
      userId: user.id,
      tokenHash: hashToken(rawRefreshToken),
      expiresAt: new Date(Date.now() + REFRESH_TTL_MS),
    })

    await logAudit({
      companyId: user.companyId,
      userId: user.id,
      action: 'USER_LOGIN',
      entity: 'users',
      entityId: user.id,
      ip,
    })

    return c.json({
      accessToken,
      refreshToken: rawRefreshToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        companyId: user.companyId,
      },
    })
  },
)

// POST /auth/refresh
authRoutes.post(
  '/refresh',
  zValidator('json', z.object({ refreshToken: z.string() })),
  async (c) => {
    const { refreshToken: rawToken } = c.req.valid('json')
    const tokenHash = hashToken(rawToken)

    const [rt] = await db
      .select()
      .from(refreshTokens)
      .where(
        and(
          eq(refreshTokens.tokenHash, tokenHash),
          isNull(refreshTokens.revokedAt),
          gt(refreshTokens.expiresAt, new Date()),
        ),
      )
      .limit(1)

    if (!rt) {
      return c.json({ error: 'Refresh token inválido o expirado' }, 401)
    }

    const [user] = await db
      .select()
      .from(users)
      .where(and(eq(users.id, rt.userId), eq(users.isActive, true)))
      .limit(1)

    if (!user || user.lockedAt) {
      return c.json({ error: 'Usuario no disponible' }, 401)
    }

    // Rotación: revocar token anterior
    await db
      .update(refreshTokens)
      .set({ revokedAt: new Date() })
      .where(eq(refreshTokens.id, rt.id))

    const accessToken = await signAccessToken({
      sub: user.id,
      companyId: user.companyId,
      role: user.role,
      email: user.email,
    })

    const newRaw = generateToken()
    await db.insert(refreshTokens).values({
      userId: user.id,
      tokenHash: hashToken(newRaw),
      expiresAt: new Date(Date.now() + REFRESH_TTL_MS),
    })

    return c.json({ accessToken, refreshToken: newRaw })
  },
)

// POST /auth/logout
authRoutes.post(
  '/logout',
  zValidator('json', z.object({ refreshToken: z.string() })),
  async (c) => {
    const { refreshToken: rawToken } = c.req.valid('json')

    await db
      .update(refreshTokens)
      .set({ revokedAt: new Date() })
      .where(
        and(
          eq(refreshTokens.tokenHash, hashToken(rawToken)),
          isNull(refreshTokens.revokedAt),
        ),
      )

    return c.json({ message: 'Sesión cerrada' })
  },
)

// POST /auth/forgot-password
authRoutes.post(
  '/forgot-password',
  zValidator('json', z.object({ email: z.string().email() })),
  async (c) => {
    const { email } = c.req.valid('json')

    const [user] = await db
      .select()
      .from(users)
      .where(and(eq(users.email, email.toLowerCase()), eq(users.isActive, true)))
      .limit(1)

    if (user) {
      const rawToken = generateToken()
      await db.insert(passwordResetTokens).values({
        userId: user.id,
        tokenHash: hashToken(rawToken),
        expiresAt: new Date(Date.now() + RESET_TTL_MS),
      })

      const appUrl = process.env.APP_URL ?? 'http://localhost:5173'
      await sendPasswordResetEmail(user.email, `${appUrl}/reset-password?token=${rawToken}`)
    }

    // Respuesta genérica — no revela si el email existe
    return c.json({
      message: 'Si el email existe, recibirás instrucciones para restablecer tu contraseña.',
    })
  },
)

// POST /auth/reset-password
authRoutes.post(
  '/reset-password',
  zValidator('json', z.object({
    token: z.string(),
    newPassword: z.string().min(8).max(100),
  })),
  async (c) => {
    const { token: rawToken, newPassword } = c.req.valid('json')
    const tokenHash = hashToken(rawToken)

    const [prt] = await db
      .select()
      .from(passwordResetTokens)
      .where(
        and(
          eq(passwordResetTokens.tokenHash, tokenHash),
          isNull(passwordResetTokens.usedAt),
          gt(passwordResetTokens.expiresAt, new Date()),
        ),
      )
      .limit(1)

    if (!prt) {
      return c.json({ error: 'Token inválido o expirado' }, 400)
    }

    const passwordHash = await hashPassword(newPassword)

    await Promise.all([
      db
        .update(users)
        .set({ passwordHash, updatedAt: new Date() })
        .where(eq(users.id, prt.userId)),
      db
        .update(passwordResetTokens)
        .set({ usedAt: new Date() })
        .where(eq(passwordResetTokens.id, prt.id)),
      // Revocar todos los refresh tokens por seguridad
      db
        .update(refreshTokens)
        .set({ revokedAt: new Date() })
        .where(and(eq(refreshTokens.userId, prt.userId), isNull(refreshTokens.revokedAt))),
    ])

    return c.json({ message: 'Contraseña actualizada correctamente' })
  },
)

// GET /auth/me
authRoutes.get('/me', authMiddleware, async (c) => {
  const { sub } = c.get('user')

  const [user] = await db
    .select({
      id: users.id,
      companyId: users.companyId,
      name: users.name,
      email: users.email,
      role: users.role,
      isActive: users.isActive,
      createdAt: users.createdAt,
    })
    .from(users)
    .where(eq(users.id, sub))
    .limit(1)

  if (!user) {
    return c.json({ error: 'Usuario no encontrado' }, 404)
  }

  return c.json(user)
})

// PATCH /auth/me — actualizar nombre del perfil
authRoutes.patch(
  '/me',
  authMiddleware,
  zValidator('json', z.object({
    name: z.string().min(2).max(255),
  })),
  async (c) => {
    const { sub, companyId } = c.get('user')
    const { name } = c.req.valid('json')

    const [updated] = await db
      .update(users)
      .set({ name, updatedAt: new Date() })
      .where(eq(users.id, sub))
      .returning({
        id: users.id,
        companyId: users.companyId,
        name: users.name,
        email: users.email,
        role: users.role,
      })

    if (!updated) {
      return c.json({ error: 'Usuario no encontrado' }, 404)
    }

    await logAudit({
      companyId,
      userId: sub,
      action: 'UPDATE_PROFILE',
      entity: 'users',
      entityId: sub,
      newValue: { name },
    })

    return c.json(updated)
  },
)

// PATCH /auth/me/password
authRoutes.patch(
  '/me/password',
  authMiddleware,
  zValidator('json', z.object({
    currentPassword: z.string(),
    newPassword: z.string().min(8).max(100),
  })),
  async (c) => {
    const { sub } = c.get('user')
    const { currentPassword, newPassword } = c.req.valid('json')

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, sub))
      .limit(1)

    if (!user) {
      return c.json({ error: 'Usuario no encontrado' }, 404)
    }

    const valid = await verifyPassword(currentPassword, user.passwordHash)
    if (!valid) {
      return c.json({ error: 'Contraseña actual incorrecta' }, 400)
    }

    await db
      .update(users)
      .set({ passwordHash: await hashPassword(newPassword), updatedAt: new Date() })
      .where(eq(users.id, sub))

    return c.json({ message: 'Contraseña actualizada' })
  },
)

export default authRoutes
