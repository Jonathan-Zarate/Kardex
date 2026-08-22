import { Hono } from 'hono'
import { and, asc, desc, eq, gte, lte } from 'drizzle-orm'
import { db, queryClient } from '../db'
import {
  companies,
  inventoryMovements,
  kardexEntries,
  products,
  stockBalances,
  warehouses,
} from '@kardex/database'
import { generatePDF } from '../lib/pdf'
import { generateExcel } from '../lib/excel'
import { authMiddleware } from '../middleware/auth'
import { requireRole } from '../middleware/require-role'
import type { Context } from 'hono'
import type { AppEnv } from '../types'

const reportsRoutes = new Hono<AppEnv>()
reportsRoutes.use('*', authMiddleware)
reportsRoutes.use('*', requireRole('ADMIN', 'SUPERVISOR'))

type Format = 'pdf' | 'excel'

function getFormat(c: { req: { query: (k: string) => string | undefined } }): Format {
  const f = c.req.query('format')
  return f === 'excel' ? 'excel' : 'pdf'
}

function fmt(n: string | number | null | undefined, decimals = 2) {
  const v = parseFloat(String(n ?? 0))
  return isNaN(v) ? '0.00' : v.toFixed(decimals)
}

function fmtDate(d: Date | string | null | undefined) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('es-PE')
}

const SUBTYPE_LABEL: Record<string, string> = {
  PURCHASE: 'Compra', SALE_RETURN: 'Dev. Venta', POSITIVE_ADJUSTMENT: 'Ajuste +',
  SALE: 'Venta', PURCHASE_RETURN: 'Dev. Compra', NEGATIVE_ADJUSTMENT: 'Ajuste −',
  TRANSFER_IN: 'Entrada Transf.', TRANSFER_OUT: 'Salida Transf.', VOID: 'Anulación',
}

async function getCompany(companyId: string) {
  const [company] = await db.select({
    name: companies.name,
    ruc: companies.ruc,
  }).from(companies).where(eq(companies.id, companyId)).limit(1)
  return company ?? { name: 'Empresa', ruc: '' }
}

function sendFile(c: Context<AppEnv>, buf: Buffer, format: Format, name: string) {
  const isPdf = format === 'pdf'
  const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer
  return c.body(new Uint8Array(ab), 200, {
    'Content-Type': isPdf
      ? 'application/pdf'
      : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'Content-Disposition': `attachment; filename="${name}.${isPdf ? 'pdf' : 'xlsx'}"`,
  })
}

/* ── 1. Kardex por producto ─────────────────────────────── */
reportsRoutes.get('/kardex', async (c) => {
  const { companyId, sub: userId, email: userEmail } = c.get('user')
  const format = getFormat(c)

  const productId = c.req.query('productId')
  const warehouseId = c.req.query('warehouseId')
  const from = c.req.query('from')
  const to = c.req.query('to')

  if (!productId) return c.json({ error: 'El parámetro productId es obligatorio' }, 400)

  const conditions = [
    eq(kardexEntries.companyId, companyId),
    eq(kardexEntries.productId, productId),
    ...(warehouseId ? [eq(kardexEntries.warehouseId, warehouseId)] : []),
    ...(from ? [gte(kardexEntries.date, new Date(from))] : []),
    ...(to ? [lte(kardexEntries.date, new Date(to))] : []),
  ]

  const [company, entries] = await Promise.all([
    getCompany(companyId),
    db.select({
      date: kardexEntries.date,
      subtype: inventoryMovements.subtype,
      reference: inventoryMovements.reference,
      warehouseName: warehouses.name,
      productName: products.name,
      productCode: products.code,
      inQty: kardexEntries.inQty,
      inUnitCost: kardexEntries.inUnitCost,
      inTotalCost: kardexEntries.inTotalCost,
      outQty: kardexEntries.outQty,
      outUnitCost: kardexEntries.outUnitCost,
      outTotalCost: kardexEntries.outTotalCost,
      balanceQty: kardexEntries.balanceQty,
      balanceAvgCost: kardexEntries.balanceAvgCost,
      balanceTotalValue: kardexEntries.balanceTotalValue,
    })
      .from(kardexEntries)
      .innerJoin(inventoryMovements, eq(kardexEntries.movementId, inventoryMovements.id))
      .innerJoin(products, eq(kardexEntries.productId, products.id))
      .innerJoin(warehouses, eq(kardexEntries.warehouseId, warehouses.id))
      .where(and(...conditions))
      .orderBy(asc(kardexEntries.date)),
  ])

  const productName = entries[0]?.productName ?? ''
  const productCode = entries[0]?.productCode ?? ''
  const filtersText = [
    `Producto: ${productCode} — ${productName}`,
    warehouseId ? `Almacén filtrado` : 'Todos los almacenes',
    from || to ? `Período: ${from ?? '—'} a ${to ?? '—'}` : '',
  ].filter(Boolean).join('  |  ')

  const headers = ['Fecha', 'Concepto', 'Almacén', 'E.Cant.', 'E.Costo', 'E.Total', 'S.Cant.', 'S.Costo', 'S.Total', 'Saldo', 'C.Prom.', 'Valor']
  const rows = entries.map((e) => [
    fmtDate(e.date),
    SUBTYPE_LABEL[e.subtype] ?? e.subtype,
    e.warehouseName,
    fmt(e.inQty, 2) === '0.00' ? '—' : fmt(e.inQty, 2),
    fmt(e.inUnitCost, 4) === '0.0000' ? '—' : fmt(e.inUnitCost, 4),
    fmt(e.inTotalCost) === '0.00' ? '—' : fmt(e.inTotalCost),
    fmt(e.outQty, 2) === '0.00' ? '—' : fmt(e.outQty, 2),
    fmt(e.outUnitCost, 4) === '0.0000' ? '—' : fmt(e.outUnitCost, 4),
    fmt(e.outTotalCost) === '0.00' ? '—' : fmt(e.outTotalCost),
    fmt(e.balanceQty, 2),
    fmt(e.balanceAvgCost, 4),
    fmt(e.balanceTotalValue),
  ])

  const last = entries.at(-1)
  const totals = last
    ? [null, null, 'Saldo final', null, null, null, null, null, null, fmt(last.balanceQty, 2), fmt(last.balanceAvgCost, 4), fmt(last.balanceTotalValue)]
    : undefined

  if (format === 'pdf') {
    const widths = [48, 70, 70, 35, 42, 42, 35, 42, 42, 35, 42, 42]
    const buf = await generatePDF(
      { companyName: company.name, companyRuc: company.ruc, title: 'Kardex por Producto', filters: filtersText, generatedBy: userEmail },
      [{ headers, rows, widths, totals }],
    )
    return sendFile(c, buf, 'pdf', `kardex-${productCode}`)
  }

  const buf = await generateExcel(
    { companyName: company.name, companyRuc: company.ruc, title: 'Kardex por Producto', filters: filtersText, generatedBy: userEmail },
    [{ name: 'Kardex', headers, rows, totals }],
  )
  return sendFile(c, buf, 'excel', `kardex-${productCode}`)
})

/* ── 2. Inventario valorizado ───────────────────────────── */
reportsRoutes.get('/inventory', async (c) => {
  const { companyId, sub: userId, email: userEmail } = c.get('user')
  const format = getFormat(c)

  const [company, stock] = await Promise.all([
    getCompany(companyId),
    db.select({
      productCode: products.code,
      productName: products.name,
      unitOfMeasure: products.unitOfMeasure,
      warehouseName: warehouses.name,
      quantity: stockBalances.quantity,
      avgCost: stockBalances.avgCost,
      totalValue: stockBalances.quantity,
    })
      .from(stockBalances)
      .innerJoin(products, eq(stockBalances.productId, products.id))
      .innerJoin(warehouses, eq(stockBalances.warehouseId, warehouses.id))
      .where(and(eq(stockBalances.companyId, companyId), eq(products.isActive, true)))
      .orderBy(products.name, warehouses.name),
  ])

  const rows = stock.map((s) => {
    const qty = parseFloat(s.quantity)
    const avg = parseFloat(s.avgCost)
    return [
      s.productCode,
      s.productName,
      s.warehouseName,
      s.unitOfMeasure,
      fmt(qty, 2),
      fmt(avg, 4),
      fmt(qty * avg),
    ]
  })

  const totalValue = stock.reduce((acc, s) => acc + parseFloat(s.quantity) * parseFloat(s.avgCost), 0)
  const totals = [null, null, null, 'TOTAL', null, null, fmt(totalValue)]

  const headers = ['Código', 'Producto', 'Almacén', 'Unidad', 'Stock', 'Costo Prom.', 'Valor Total']

  if (format === 'pdf') {
    const widths = [55, 130, 90, 45, 45, 55, 95]
    const buf = await generatePDF(
      { companyName: company.name, companyRuc: company.ruc, title: 'Inventario Valorizado', generatedBy: userEmail },
      [{ headers, rows, widths, totals }],
    )
    return sendFile(c, buf, 'pdf', 'inventario-valorizado')
  }

  const buf = await generateExcel(
    { companyName: company.name, companyRuc: company.ruc, title: 'Inventario Valorizado', generatedBy: userEmail },
    [{ name: 'Inventario', headers, rows, totals }],
  )
  return sendFile(c, buf, 'excel', 'inventario-valorizado')
})

/* ── 3. Movimientos por período ─────────────────────────── */
reportsRoutes.get('/movements', async (c) => {
  const { companyId, sub: userId, email: userEmail } = c.get('user')
  const format = getFormat(c)

  const type = c.req.query('type') as 'ENTRY' | 'EXIT' | 'TRANSFER' | undefined
  const from = c.req.query('from')
  const to = c.req.query('to')

  if (!from || !to) return c.json({ error: 'Los parámetros from y to son obligatorios' }, 400)

  const conditions = [
    eq(inventoryMovements.companyId, companyId),
    eq(inventoryMovements.status, 'APPROVED'),
    gte(inventoryMovements.createdAt, new Date(from)),
    lte(inventoryMovements.createdAt, new Date(to)),
    ...(type ? [eq(inventoryMovements.type, type)] : []),
  ]

  const [company, movements] = await Promise.all([
    getCompany(companyId),
    db.select({
      createdAt: inventoryMovements.createdAt,
      type: inventoryMovements.type,
      subtype: inventoryMovements.subtype,
      reference: inventoryMovements.reference,
      productCode: products.code,
      productName: products.name,
      warehouseName: warehouses.name,
      quantity: inventoryMovements.quantity,
      unitCost: inventoryMovements.unitCost,
      totalCost: inventoryMovements.totalCost,
    })
      .from(inventoryMovements)
      .innerJoin(products, eq(inventoryMovements.productId, products.id))
      .innerJoin(warehouses, eq(inventoryMovements.warehouseId, warehouses.id))
      .where(and(...conditions))
      .orderBy(desc(inventoryMovements.createdAt)),
  ])

  const TYPE_LABEL: Record<string, string> = { ENTRY: 'Entrada', EXIT: 'Salida', TRANSFER: 'Transferencia' }
  const rows = movements.map((m) => [
    fmtDate(m.createdAt),
    TYPE_LABEL[m.type] ?? m.type,
    SUBTYPE_LABEL[m.subtype] ?? m.subtype,
    m.productCode,
    m.productName,
    m.warehouseName,
    fmt(m.quantity, 2),
    fmt(m.unitCost, 4),
    fmt(m.totalCost),
  ])

  const totalIn = movements.filter((m) => m.type === 'ENTRY').reduce((a, m) => a + parseFloat(m.totalCost), 0)
  const totalOut = movements.filter((m) => m.type === 'EXIT').reduce((a, m) => a + parseFloat(m.totalCost), 0)
  const totals = [null, null, null, null, `${movements.length} mov.`, null, null, `E: ${fmt(totalIn)}`, `S: ${fmt(totalOut)}`]

  const filtersText = `Período: ${from} a ${to}${type ? `  |  Tipo: ${TYPE_LABEL[type]}` : ''}`
  const headers = ['Fecha', 'Tipo', 'Subtipo', 'Código', 'Producto', 'Almacén', 'Cantidad', 'Costo Unit.', 'Total']

  if (format === 'pdf') {
    const widths = [48, 45, 60, 45, 110, 70, 40, 50, 47]
    const buf = await generatePDF(
      { companyName: company.name, companyRuc: company.ruc, title: 'Movimientos por Período', filters: filtersText, generatedBy: userEmail },
      [{ headers, rows, widths, totals }],
    )
    return sendFile(c, buf, 'pdf', 'movimientos')
  }

  const buf = await generateExcel(
    { companyName: company.name, companyRuc: company.ruc, title: 'Movimientos por Período', filters: filtersText, generatedBy: userEmail },
    [{ name: 'Movimientos', headers, rows, totals }],
  )
  return sendFile(c, buf, 'excel', 'movimientos')
})

/* ── 4. Productos bajo stock mínimo ─────────────────────── */
reportsRoutes.get('/low-stock', async (c) => {
  const { companyId, sub: userId, email: userEmail } = c.get('user')
  const format = getFormat(c)

  const [company, rows_raw] = await Promise.all([
    getCompany(companyId),
    queryClient<{
      code: string; name: string; category_name: string | null;
      unit: string; total_stock: string; min_stock: string; deficit: string
    }[]>`
      SELECT
        p.code,
        p.name,
        cat.name AS category_name,
        p.unit_of_measure AS unit,
        COALESCE(SUM(sb.quantity::numeric), 0)::text AS total_stock,
        p.min_stock::text,
        (p.min_stock::numeric - COALESCE(SUM(sb.quantity::numeric), 0))::text AS deficit
      FROM products p
      LEFT JOIN categories cat ON p.category_id = cat.id
      LEFT JOIN stock_balances sb ON p.id = sb.product_id AND sb.company_id = p.company_id
      WHERE p.company_id = ${companyId}
        AND p.is_active = true
        AND p.min_stock::numeric > 0
      GROUP BY p.id, p.code, p.name, cat.name, p.unit_of_measure, p.min_stock
      HAVING COALESCE(SUM(sb.quantity::numeric), 0) < p.min_stock::numeric
      ORDER BY (p.min_stock::numeric - COALESCE(SUM(sb.quantity::numeric), 0)) DESC
    `,
  ])

  const rows = rows_raw.map((r) => [
    r.code,
    r.name,
    r.category_name ?? '—',
    r.unit,
    fmt(r.total_stock, 2),
    fmt(r.min_stock, 2),
    fmt(r.deficit, 2),
  ])

  const headers = ['Código', 'Producto', 'Categoría', 'Unidad', 'Stock Actual', 'Stock Mínimo', 'Déficit']
  const totals = [null, `${rows.length} producto${rows.length !== 1 ? 's' : ''}`, null, null, null, null, null]

  if (format === 'pdf') {
    const widths = [55, 140, 90, 45, 55, 55, 55]
    const buf = await generatePDF(
      { companyName: company.name, companyRuc: company.ruc, title: 'Productos bajo Stock Mínimo', generatedBy: userEmail },
      [{ headers, rows, widths, totals }],
    )
    return sendFile(c, buf, 'pdf', 'bajo-stock')
  }

  const buf = await generateExcel(
    { companyName: company.name, companyRuc: company.ruc, title: 'Productos bajo Stock Mínimo', generatedBy: userEmail },
    [{ name: 'Bajo Stock', headers, rows, totals }],
  )
  return sendFile(c, buf, 'excel', 'bajo-stock')
})

export default reportsRoutes
