import './env'

import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { db } from './db'
import { companies } from '@kardex/database'
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

const app = new Hono<AppEnv>()

app.use(
  '*',
  cors({
    origin: process.env.APP_URL ?? 'http://localhost:5173',
    allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  }),
)

app.get('/', (c) => c.json({ name: 'Kardex API', version: '1.0.0' }))

app.get('/health', async (c) => {
  const rows = await db.select().from(companies).limit(1)
  return c.json({ status: 'ok', db: 'connected', companies: rows.length })
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

app.onError((err, c) => {
  console.error('[ERROR]', err)
  return c.json({ error: 'Error interno del servidor' }, 500)
})

serve(
  { fetch: app.fetch, port: 3000 },
  (info) => console.log(`Server running on http://localhost:${info.port}`),
)
