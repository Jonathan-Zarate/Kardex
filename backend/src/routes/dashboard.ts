import { Hono } from 'hono'
import { and, count, desc, eq, gte, sql } from 'drizzle-orm'
import { db, queryClient } from '../db.js'
import { inventoryMovements, products, stockBalances, warehouses } from '@kardex/database'
import { authMiddleware } from '../middleware/auth.js'
import type { AppEnv } from '../types.js'

const dashboardRoutes = new Hono<AppEnv>()
dashboardRoutes.use('*', authMiddleware)

dashboardRoutes.get('/metrics', async (c) => {
  const { companyId } = c.get('user')

  const [
    productCountRows,
    inventoryValueRows,
    lowStockRows,
    recentMovements,
    topProductsRows,
    trendRows,
  ] = await Promise.all([

    // 1. Total productos activos
    db.select({ total: count() })
      .from(products)
      .where(and(eq(products.companyId, companyId), eq(products.isActive, true))),

    // 2. Valor total del inventario
    db.select({
      total: sql<string>`COALESCE(SUM(${stockBalances.quantity}::numeric * ${stockBalances.avgCost}::numeric), 0)`,
    }).from(stockBalances).where(eq(stockBalances.companyId, companyId)),

    // 3. SKUs bajo stock mínimo (suma de todos los almacenes < min_stock)
    queryClient<{ count: number }[]>`
      SELECT COUNT(*)::int AS count FROM (
        SELECT p.id
        FROM products p
        LEFT JOIN stock_balances sb
          ON p.id = sb.product_id AND sb.company_id = p.company_id
        WHERE p.company_id = ${companyId}
          AND p.is_active = true
          AND p.min_stock::numeric > 0
        GROUP BY p.id, p.min_stock
        HAVING COALESCE(SUM(sb.quantity::numeric), 0) < p.min_stock::numeric
      ) t
    `,

    // 4. Últimos 10 movimientos
    db.select({
      id: inventoryMovements.id,
      type: inventoryMovements.type,
      subtype: inventoryMovements.subtype,
      status: inventoryMovements.status,
      quantity: inventoryMovements.quantity,
      unitCost: inventoryMovements.unitCost,
      totalCost: inventoryMovements.totalCost,
      createdAt: inventoryMovements.createdAt,
      productName: products.name,
      productCode: products.code,
      warehouseName: warehouses.name,
    })
      .from(inventoryMovements)
      .innerJoin(products, eq(inventoryMovements.productId, products.id))
      .innerJoin(warehouses, eq(inventoryMovements.warehouseId, warehouses.id))
      .where(eq(inventoryMovements.companyId, companyId))
      .orderBy(desc(inventoryMovements.createdAt))
      .limit(10),

    // 5. Top 10 productos más movidos (últimos 7 días)
    queryClient<{ id: string; name: string; code: string; movement_count: number }[]>`
      SELECT p.id, p.name, p.code, COUNT(im.id)::int AS movement_count
      FROM inventory_movements im
      JOIN products p ON im.product_id = p.id
      WHERE im.company_id = ${companyId}
        AND im.created_at >= NOW() - INTERVAL '7 days'
        AND im.status = 'APPROVED'
      GROUP BY p.id, p.name, p.code
      ORDER BY movement_count DESC
      LIMIT 10
    `,

    // 6. Actividad diaria últimos 30 días (valor de entradas y salidas por día)
    queryClient<{ day: string; in_value: string; out_value: string }[]>`
      SELECT
        DATE(created_at AT TIME ZONE 'UTC')::text AS day,
        SUM(CASE WHEN type = 'ENTRY' THEN total_cost::numeric ELSE 0 END)::text AS in_value,
        SUM(CASE WHEN type = 'EXIT'  THEN total_cost::numeric ELSE 0 END)::text AS out_value
      FROM inventory_movements
      WHERE company_id = ${companyId}
        AND created_at >= NOW() - INTERVAL '30 days'
        AND status = 'APPROVED'
        AND type IN ('ENTRY', 'EXIT')
      GROUP BY day
      ORDER BY day
    `,
  ])

  return c.json({
    totalProducts: productCountRows[0].total,
    totalInventoryValue: parseFloat(inventoryValueRows[0].total),
    lowStockCount: lowStockRows[0]?.count ?? 0,
    recentMovements,
    topProducts: topProductsRows,
    inventoryTrend: trendRows.map((r) => ({
      day: r.day,
      inValue: parseFloat(r.in_value),
      outValue: parseFloat(r.out_value),
    })),
  })
})

export default dashboardRoutes
