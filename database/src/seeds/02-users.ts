import bcrypt from 'bcryptjs'
import { db } from '../client'
import { users } from '../schema/users'

export interface SeedUserPasswords {
  admin: string
  supervisor: string
  warehouse: string
}

export async function seedUsers(companyId: string, passwords: SeedUserPasswords) {
  const hash = (pwd: string) => bcrypt.hash(pwd, 12)

  const inserted = await db.insert(users).values([
    {
      companyId,
      name: 'Administrador Demo',
      email: 'admin@demo.com',
      passwordHash: await hash(passwords.admin),
      role: 'ADMIN' as const,
    },
    {
      companyId,
      name: 'Supervisor Demo',
      email: 'supervisor@demo.com',
      passwordHash: await hash(passwords.supervisor),
      role: 'SUPERVISOR' as const,
    },
    {
      companyId,
      name: 'Almacenero Demo',
      email: 'almacenero@demo.com',
      passwordHash: await hash(passwords.warehouse),
      role: 'WAREHOUSE' as const,
    },
  ]).returning()

  inserted.forEach(u => console.log(`  ✓ Usuario: ${u.email} (${u.role})`))
  return inserted
}
