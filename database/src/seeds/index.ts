// env.js DEBE ser el primer import para que DATABASE_URL esté disponible
// cuando client.ts se evalúe
import '../env.js'

import { seedCatalog } from './04-catalog.js'
import { seedCompanies } from './01-companies.js'
import { seedUsers } from './02-users.js'
import { seedWarehouses } from './03-warehouses.js'

const MIN_PASSWORD_LENGTH = 12

function requiredSeedPassword(name: string): string {
  const value = process.env[name]

  if (!value || value.length < MIN_PASSWORD_LENGTH) {
    throw new Error(`${name} es obligatorio y debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres.`)
  }

  return value
}

async function main() {
  console.log('Iniciando semilla de base de datos...\n')

  const company = await seedCompanies()
  await seedUsers(company.id, {
    admin: requiredSeedPassword('SEED_ADMIN_PASSWORD'),
    supervisor: requiredSeedPassword('SEED_SUPERVISOR_PASSWORD'),
    warehouse: requiredSeedPassword('SEED_WAREHOUSE_PASSWORD'),
  })
  await seedWarehouses(company.id)
  await seedCatalog(company.id)

  console.log('\nSemilla completada.')
  process.exit(0)
}

main().catch((err) => {
  console.error('Error en semilla:', err)
  process.exit(1)
})
