import './env.js'

import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { sql } from 'drizzle-orm'
import { db } from './db.js'
import auditRoutes from './routes/audit.js'
import authRoutes from './routes/auth.js'
import categoriesRoutes from './routes/categories.js'
import companyRoutes from './routes/company.js'
import dashboardRoutes from './routes/dashboard.js'
import kardexRoutes from './routes/kardex.js'
import movementsRoutes from './routes/movements.js'
import reportsRoutes from './routes/reports.js'
import productsRoutes from './routes/products.js'
import stockRoutes from './routes/stock.js'
import suppliersRoutes from './routes/suppliers.js'
import usersRoutes from './routes/users.js'
import warehousesRoutes from './routes/warehouses.js'
import type { AppEnv } from './types.js'

const allowedOrigins = (process.env.APP_URL ?? 'http://localhost:5173')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean)

const app = new Hono<AppEnv>()

app.use(
  '*',
  cors({
    origin: (origin) => allowedOrigins.includes(origin) ? origin : '',
    allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
  }),
)

app.get('/', (c) => c.json({ name: 'Kardex API', version: '1.0.0' }))
app.get('/health/live', (c) => c.json({ status: 'ok' }))
app.get('/health/ready', async (c) => {
  try {
    await db.execute(sql`SELECT 1`)
    return c.json({ status: 'ok', database: 'ready' })
  } catch {
    return c.json({ status: 'error', database: 'unavailable' }, 503)
  }
})

app.route('/audit-logs', auditRoutes)
app.route('/auth', authRoutes)
app.route('/users', usersRoutes)
app.route('/company', companyRoutes)
app.route('/warehouses', warehousesRoutes)
app.route('/categories', categoriesRoutes)
app.route('/suppliers', suppliersRoutes)
app.route('/products', productsRoutes)
app.route('/stock', stockRoutes)
app.route('/movements', movementsRoutes)
app.route('/kardex', kardexRoutes)
app.route('/dashboard', dashboardRoutes)
app.route('/reports', reportsRoutes)

app.notFound((c) => c.json({ error: 'Ruta no encontrada' }, 404))

app.onError((error, c) => {
  console.error('[ERROR]', error)
  return c.json({ error: 'Error interno del servidor' }, 500)
})

export default app
