import { db } from '../client.js'
import { companies } from '../schema/companies.js'

export async function seedCompanies() {
  const [company] = await db.insert(companies).values({
    name: 'Empresa Demo S.A.C.',
    ruc: '20123456789',
    address: 'Av. Principal 123, Lima, Perú',
    currency: 'PEN',
    timezone: 'America/Lima',
  }).returning()

  console.log(`  ✓ Empresa: ${company.name} [${company.id}]`)
  return company
}
