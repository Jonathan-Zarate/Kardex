import { db } from '../client'
import { warehouses } from '../schema/warehouses'

export async function seedWarehouses(companyId: string) {
  const [warehouse] = await db.insert(warehouses).values({
    companyId,
    name: 'Principal',
    location: 'Sede Central',
  }).returning()

  console.log(`  ✓ Almacén: ${warehouse.name} [${warehouse.id}]`)
  return warehouse
}
