const required = [
  'SMOKE_API_URL',
  'SMOKE_ADMIN_EMAIL',
  'SMOKE_ADMIN_PASSWORD',
  'SMOKE_SUPERVISOR_EMAIL',
  'SMOKE_SUPERVISOR_PASSWORD',
  'SMOKE_WAREHOUSE_EMAIL',
  'SMOKE_WAREHOUSE_PASSWORD',
]

for (const name of required) {
  if (!process.env[name]) throw new Error(`${name} es obligatorio`)
}

const baseUrl = process.env.SMOKE_API_URL.replace(/\/$/, '')
const createdProducts = []
const createdCategories = []
let adminToken

function assertEqual(name, actual, expected) {
  if (actual !== expected) {
    throw new Error(`${name}: esperado ${expected}, recibido ${actual}`)
  }
  console.log(`OK  ${name}`)
}

async function request(token, path, method = 'GET', body) {
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      ...(body ? { 'content-type': 'application/json' } : {}),
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  const data = await response.json().catch(() => null)
  return { status: response.status, data }
}

async function login(email, password) {
  const result = await request(undefined, '/auth/login', 'POST', { email, password })
  assertEqual(`login ${email}`, result.status, 200)
  return result.data.accessToken
}

async function deactivate(path) {
  if (!adminToken) return
  await request(adminToken, path, 'PATCH').catch(() => undefined)
}

async function main() {
  const stamp = `${Date.now()}-${crypto.randomUUID().slice(0, 8)}`
  const admin = await login(process.env.SMOKE_ADMIN_EMAIL, process.env.SMOKE_ADMIN_PASSWORD)
  const supervisor = await login(process.env.SMOKE_SUPERVISOR_EMAIL, process.env.SMOKE_SUPERVISOR_PASSWORD)
  const warehouse = await login(process.env.SMOKE_WAREHOUSE_EMAIL, process.env.SMOKE_WAREHOUSE_PASSWORD)
  adminToken = admin

  assertEqual('health live', (await request(undefined, '/health/live')).status, 200)
  assertEqual('health ready', (await request(undefined, '/health/ready')).status, 200)

  for (const [role, token] of Object.entries({ admin, supervisor, warehouse })) {
    assertEqual(`${role} consulta categorias`, (await request(token, '/categories')).status, 200)
  }

  const category = await request(admin, '/categories', 'POST', {
    name: `Smoke ${stamp}`,
    description: 'Prueba automatizada de produccion',
  })
  assertEqual('admin crea categoria', category.status, 201)
  createdCategories.push(category.data.id)

  assertEqual(
    'warehouse no crea categoria',
    (await request(warehouse, '/categories', 'POST', { name: `Forbidden ${stamp}` })).status,
    403,
  )
  assertEqual('admin lista usuarios', (await request(admin, '/users')).status, 200)
  assertEqual('supervisor no lista usuarios', (await request(supervisor, '/users')).status, 403)
  assertEqual('warehouse no lista usuarios', (await request(warehouse, '/users')).status, 403)

  const warehouses = await request(admin, '/warehouses')
  assertEqual('existe un almacen', warehouses.status, 200)
  if (!warehouses.data[0]?.id) throw new Error('No existe un almacen para la prueba')
  const warehouseId = warehouses.data[0].id

  const product = await request(admin, '/products', 'POST', {
    code: `SMOKE-${stamp}`,
    name: `Producto Smoke ${stamp}`,
    unitOfMeasure: 'UND',
    categoryId: category.data.id,
    minStock: 0,
  })
  assertEqual('admin crea producto', product.status, 201)
  createdProducts.push(product.data.id)

  assertEqual('warehouse registra entrada', (await request(warehouse, '/movements', 'POST', {
    type: 'ENTRY', subtype: 'PURCHASE', productId: product.data.id,
    warehouseId, quantity: 100, unitCost: 1, reference: `SMOKE-${stamp}`,
  })).status, 201)

  const exits = await Promise.all(Array.from({ length: 20 }, (_, index) =>
    request(warehouse, '/movements', 'POST', {
      type: 'EXIT', subtype: 'SALE', productId: product.data.id,
      warehouseId, quantity: 6, reference: `SMOKE-${stamp}-${index}`,
    })))
  assertEqual('salidas concurrentes aceptadas', exits.filter(({ status }) => status === 201).length, 16)
  assertEqual('salidas sin stock rechazadas', exits.filter(({ status }) => status === 422).length, 4)

  const stock = await request(admin, `/stock/${product.data.id}`)
  assertEqual('saldo concurrente no negativo', stock.data[0]?.quantity, '4.0000')

  const duplicateCode = `DUP-${stamp}`
  const duplicates = await Promise.all(Array.from({ length: 8 }, (_, index) =>
    request(admin, '/products', 'POST', {
      code: duplicateCode,
      name: `Producto duplicado ${index}`,
      unitOfMeasure: 'UND',
      categoryId: category.data.id,
      minStock: 0,
    })))
  const duplicateCreated = duplicates.find(({ status }) => status === 201)
  if (duplicateCreated) createdProducts.push(duplicateCreated.data.id)
  assertEqual('un producto duplicado creado', duplicates.filter(({ status }) => status === 201).length, 1)
  assertEqual('siete duplicados son conflicto', duplicates.filter(({ status }) => status === 409).length, 7)
  assertEqual('ningun duplicado produce 500', duplicates.filter(({ status }) => status === 500).length, 0)

  assertEqual('paginacion respeta limit', (await request(admin, '/movements?page=1&limit=1')).data.data.length, 1)
  console.log('\nSmoke de produccion completado correctamente.')
}

try {
  await main()
} finally {
  for (const id of createdProducts) await deactivate(`/products/${id}/deactivate`)
  for (const id of createdCategories) await deactivate(`/categories/${id}/deactivate`)
}
