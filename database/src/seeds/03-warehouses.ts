import { db } from '../client.js'
import { warehouses } from '../schema/warehouses.js'

export async function seedWarehouses(companyId: string) {
  const [warehouse] = await db.insert(warehouses).values({
    companyId,
    name: 'Principal',
    location: 'Sede Central',
  }).returning()

  console.log(`  ✓ Almacén: ${warehouse.name} [${warehouse.id}]`)
  return warehouse
}
