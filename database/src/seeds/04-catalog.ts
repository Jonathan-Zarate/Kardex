import { db } from '../client'
import { categories } from '../schema/categories'
import { suppliers } from '../schema/suppliers'

export async function seedCatalog(companyId: string) {
  const cats = await db.insert(categories).values([
    { companyId, name: 'Abarrotes', description: 'Productos de abarrotes y despensa' },
    { companyId, name: 'Bebidas', description: 'Bebidas alcohólicas y no alcohólicas' },
    { companyId, name: 'Limpieza', description: 'Productos de limpieza e higiene personal' },
    { companyId, name: 'Electrónicos', description: 'Equipos y accesorios electrónicos' },
  ]).returning()

  const [supplier] = await db.insert(suppliers).values({
    companyId,
    name: 'Distribuidora Central S.A.C.',
    ruc: '20987654321',
    phone: '01-234-5678',
    email: 'ventas@distcentral.com',
    address: 'Av. Industrial 456, Lima',
  }).returning()

  cats.forEach(c => console.log(`  ✓ Categoría: ${c.name}`))
  console.log(`  ✓ Proveedor: ${supplier.name}`)
  return { categories: cats, supplier }
}
