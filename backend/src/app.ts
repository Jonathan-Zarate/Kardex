import './env'

import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { sql } from 'drizzle-orm'
import { db } from './db'
import auditRoutes from './routes/audit'
import authRoutes from './routes/auth'
import categoriesRoutes from './routes/categories'
import companyRoutes from './routes/company'
import dashboardRoutes from './routes/dashboard'
import kardexRoutes from './routes/kardex'
import movementsRoutes from './routes/movements'
import reportsRoutes from './routes/reports'
import productsRoutes from './routes/products'
import stockRoutes from './routes/stock'
import suppliersRoutes from './routes/suppliers'
import usersRoutes from './routes/users'
import warehousesRoutes from './routes/warehouses'
import type { AppEnv } from './types'

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
