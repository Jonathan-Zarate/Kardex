import bcrypt from 'bcryptjs'
import { eq, inArray } from 'drizzle-orm'

import '../env.js'
import { db } from '../client.js'
import { passwordResetTokens, refreshTokens, users } from '../schema/index.js'

const MIN_PASSWORD_LENGTH = 12

const credentials = [
  { email: 'admin@kardex.demo', envName: 'RESET_ADMIN_PASSWORD' },
  { email: 'supervisor@kardex.demo', envName: 'RESET_SUPERVISOR_PASSWORD' },
  { email: 'almacenero@kardex.demo', envName: 'RESET_WAREHOUSE_PASSWORD' },
] as const

function requiredPassword(envName: string): string {
  const value = process.env[envName]
  if (!value || value.length < MIN_PASSWORD_LENGTH) {
    throw new Error(`${envName} es obligatorio y debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres.`)
  }
  return value
}

async function main() {
  const emails = credentials.map(({ email }) => email)
  const existingUsers = await db
    .select({ id: users.id, email: users.email })
    .from(users)
    .where(inArray(users.email, emails))

  if (existingUsers.length !== credentials.length) {
    const found = new Set<string>(existingUsers.map(({ email }) => email))
    const missing = emails.filter((email) => !found.has(email))
    throw new Error(`No se encontraron todos los usuarios demo: ${missing.join(', ')}`)
  }

  const passwordHashes = new Map<string, string>(
    await Promise.all(credentials.map(async ({ email, envName }) => [
      email,
      await bcrypt.hash(requiredPassword(envName), 12),
    ] as const)),
  )

  await db.transaction(async (tx) => {
    for (const user of existingUsers) {
      const passwordHash = passwordHashes.get(user.email)
      if (!passwordHash) throw new Error(`No se genero el hash para ${user.email}`)

      await tx
        .update(users)
        .set({
          passwordHash,
          failedLoginAttempts: 0,
          lockedAt: null,
          updatedAt: new Date(),
        })
        .where(eq(users.id, user.id))
    }

    const userIds = existingUsers.map(({ id }) => id)
    await tx.delete(refreshTokens).where(inArray(refreshTokens.userId, userIds))
    await tx.delete(passwordResetTokens).where(inArray(passwordResetTokens.userId, userIds))
  })

  console.log(`Contraseñas actualizadas para ${existingUsers.length} usuarios demo; sesiones previas revocadas.`)
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error)
    process.exit(1)
  })
