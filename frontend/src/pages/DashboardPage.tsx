import { useQuery } from '@tanstack/react-query'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer,
} from 'recharts'
import { dashboardApi } from '@/api/dashboard'
import { Spinner } from '@/components/ui/Spinner'

const TYPE_LABEL: Record<string, string> = { ENTRY: 'Entrada', EXIT: 'Salida', TRANSFER: 'Transferencia' }
const TYPE_COLOR: Record<string, string> = { ENTRY: 'text-green-600', EXIT: 'text-red-600', TRANSFER: 'text-blue-600' }

function currency(n: number) {
  return `S/ ${n.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function KpiCard({ icon, label, value, color, alert }: {
  icon: string; label: string; value: string | number; color: string; alert?: boolean
}) {
  return (
    <div className={`bg-white rounded-xl border shadow-sm p-5 flex items-center gap-4 ${alert ? 'border-red-200' : 'border-gray-200'}`}>
      <div className={`w-11 h-11 rounded-lg flex items-center justify-center ${color}`}>
        <span className="material-icons text-white text-xl">{icon}</span>
      </div>
      <div>
        <p className="text-sm text-gray-500">{label}</p>
        <p className={`text-xl font-bold ${alert ? 'text-red-600' : 'text-gray-900'}`}>{value}</p>
      </div>
    </div>
  )
}

function formatDay(day: string) {
  const d = new Date(day + 'T00:00:00')
  return d.toLocaleDateString('es-PE', { day: '2-digit', month: 'short' })
}

const TOOLTIP_STYLE = { fontSize: 12, borderRadius: 8 }

export function DashboardPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard-metrics'],
    queryFn: dashboardApi.metrics,
    staleTime: 30_000,
  })

  if (isLoading) {
    return <div className="flex justify-center py-20"><Spinner size="lg" /></div>
  }

  const metrics = data!

  return (
    <div className="space-y-6">
      {/* KPI cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <KpiCard
          icon="inventory_2"
          label="Productos Activos"
          value={metrics.totalProducts}
          color="bg-blue-600"
        />
        <KpiCard
          icon="account_balance_wallet"
          label="Valor Total Inventario"
          value={currency(metrics.totalInventoryValue)}
          color="bg-emerald-600"
        />
        <KpiCard
          icon="warning"
          label="Bajo Stock Mínimo"
          value={metrics.lowStockCount}
          color={metrics.lowStockCount > 0 ? 'bg-red-500' : 'bg-gray-400'}
          alert={metrics.lowStockCount > 0}
        />
      </div>

      {/* Low stock alert banner */}
      {metrics.lowStockCount > 0 && (
        <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-xl px-5 py-3 text-sm text-red-700">
          <span className="material-icons text-red-500">warning</span>
          <span>
            <strong>{metrics.lowStockCount} producto{metrics.lowStockCount > 1 ? 's' : ''}</strong> {metrics.lowStockCount > 1 ? 'están' : 'está'} bajo su stock mínimo.
            Considera generar órdenes de compra.
          </span>
        </div>
      )}

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Inventory trend */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <h2 className="font-semibold text-gray-800 mb-4 text-sm">Actividad diaria — últimos 30 días</h2>
          {metrics.inventoryTrend.length === 0 ? (
            <div className="flex items-center justify-center h-48 text-gray-400 text-sm">Sin movimientos en los últimos 30 días</div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={metrics.inventoryTrend} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis
                  dataKey="day"
                  tickFormatter={formatDay}
                  tick={{ fontSize: 10, fill: '#9ca3af' }}
                  tickLine={false}
                  axisLine={false}
                  interval="preserveStartEnd"
                />
                <YAxis
                  tick={{ fontSize: 10, fill: '#9ca3af' }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => `S/${(v / 1000).toFixed(0)}k`}
                  width={48}
                />
                <Tooltip
                  contentStyle={TOOLTIP_STYLE}
                  formatter={(v: number, name: string) => [currency(v), name === 'inValue' ? 'Entradas' : 'Salidas']}
                  labelFormatter={formatDay}
                />
                <Legend
                  iconType="circle"
                  iconSize={8}
                  formatter={(v) => v === 'inValue' ? 'Entradas' : 'Salidas'}
                  wrapperStyle={{ fontSize: 11 }}
                />
                <Bar dataKey="inValue" fill="#10b981" radius={[3, 3, 0, 0]} maxBarSize={20} />
                <Bar dataKey="outValue" fill="#f43f5e" radius={[3, 3, 0, 0]} maxBarSize={20} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Top products */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <h2 className="font-semibold text-gray-800 mb-4 text-sm">Top 10 productos — últimos 7 días</h2>
          {metrics.topProducts.length === 0 ? (
            <div className="flex items-center justify-center h-48 text-gray-400 text-sm">Sin movimientos en los últimos 7 días</div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart
                layout="vertical"
                data={metrics.topProducts}
                margin={{ top: 0, right: 10, left: 0, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                <XAxis
                  type="number"
                  tick={{ fontSize: 10, fill: '#9ca3af' }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={90}
                  tick={{ fontSize: 10, fill: '#374151' }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v: string) => v.length > 14 ? v.slice(0, 13) + '…' : v}
                />
                <Tooltip
                  contentStyle={TOOLTIP_STYLE}
                  formatter={(v: number) => [v, 'Movimientos']}
                />
                <Bar dataKey="movement_count" fill="#3b82f6" radius={[0, 3, 3, 0]} maxBarSize={16} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Recent movements */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-semibold text-gray-800">Últimos Movimientos</h2>
          <span className="text-xs text-gray-400">10 más recientes</span>
        </div>
        {metrics.recentMovements.length === 0 ? (
          <div className="px-6 py-8 text-center text-gray-400 text-sm">Sin movimientos registrados</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-gray-500 border-b border-gray-100">
                <th className="px-6 py-3 font-medium">Producto</th>
                <th className="px-6 py-3 font-medium">Tipo</th>
                <th className="px-6 py-3 font-medium">Almacén</th>
                <th className="px-6 py-3 font-medium text-right">Cantidad</th>
                <th className="px-6 py-3 font-medium text-right">Total</th>
                <th className="px-6 py-3 font-medium">Fecha</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {metrics.recentMovements.map((m) => (
                <tr key={m.id} className="hover:bg-gray-50">
                  <td className="px-6 py-3 font-medium text-gray-800">
                    <div className="text-xs text-gray-400">{m.productCode}</div>
                    {m.productName}
                  </td>
                  <td className={`px-6 py-3 font-semibold text-xs ${TYPE_COLOR[m.type] ?? 'text-gray-600'}`}>
                    {TYPE_LABEL[m.type] ?? m.type}
                  </td>
                  <td className="px-6 py-3 text-gray-600">{m.warehouseName}</td>
                  <td className="px-6 py-3 text-right">
                    {parseFloat(m.quantity).toLocaleString('es-PE', { maximumFractionDigits: 2 })}
                  </td>
                  <td className="px-6 py-3 text-right text-gray-600 font-medium">
                    {currency(parseFloat(m.totalCost))}
                  </td>
                  <td className="px-6 py-3 text-gray-500 text-xs">
                    {new Date(m.createdAt).toLocaleString('es-PE', { dateStyle: 'short', timeStyle: 'short' })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
