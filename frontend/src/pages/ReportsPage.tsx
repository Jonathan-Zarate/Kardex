import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { productsApi } from '@/api/products'
import { warehousesApi } from '@/api/warehouses'
import { reportsApi, type KardexReportParams, type MovementsReportParams } from '@/api/reports'
import { Spinner } from '@/components/ui/Spinner'

type Format = 'pdf' | 'excel'

function FormatSelector({ value, onChange }: { value: Format; onChange: (f: Format) => void }) {
  return (
    <div className="flex gap-2">
      {(['pdf', 'excel'] as Format[]).map((f) => (
        <button
          key={f}
          type="button"
          onClick={() => onChange(f)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm border transition-colors ${
            value === f
              ? 'bg-blue-600 text-white border-blue-600'
              : 'bg-white text-gray-700 border-gray-300 hover:border-blue-400'
          }`}
        >
          <span className="material-icons text-[16px]">
            {f === 'pdf' ? 'picture_as_pdf' : 'table_chart'}
          </span>
          {f === 'pdf' ? 'PDF' : 'Excel'}
        </button>
      ))}
    </div>
  )
}

function DownloadButton({ onClick, loading }: { onClick: () => void; loading: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
    >
      {loading
        ? <Spinner size="sm" />
        : <span className="material-icons text-[18px]">download</span>}
      {loading ? 'Generando…' : 'Descargar'}
    </button>
  )
}

function ReportCard({ icon, title, description, children }: {
  icon: string; title: string; description: string; children: React.ReactNode
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
      <div className="px-6 py-5 border-b border-gray-100 flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center">
          <span className="material-icons text-blue-600 text-lg">{icon}</span>
        </div>
        <div>
          <h2 className="font-semibold text-gray-800 text-sm">{title}</h2>
          <p className="text-xs text-gray-500">{description}</p>
        </div>
      </div>
      <div className="px-6 py-5 space-y-4">{children}</div>
    </div>
  )
}

// ── Report 1: Kardex ──────────────────────────────────────────────────────────
function KardexReport() {
  const [productId, setProductId] = useState('')
  const [warehouseId, setWarehouseId] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [format, setFormat] = useState<Format>('pdf')
  const [loading, setLoading] = useState(false)

  const { data: products = [] } = useQuery({ queryKey: ['products'], queryFn: () => productsApi.list() })
  const { data: warehouses = [] } = useQuery({ queryKey: ['warehouses'], queryFn: () => warehousesApi.list() })

  async function download() {
    if (!productId) return
    setLoading(true)
    try {
      const params: KardexReportParams = { productId, format }
      if (warehouseId) params.warehouseId = warehouseId
      if (from) params.from = from
      if (to) params.to = to
      await reportsApi.kardex(params)
    } catch (e) {
      alert((e as Error).message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <ReportCard
      icon="receipt_long"
      title="Kardex por Producto"
      description="Historial de entradas, salidas y saldos de un producto"
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Producto *</label>
          <select
            value={productId}
            onChange={(e) => setProductId(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
          >
            <option value="">Seleccionar producto…</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>{p.code} — {p.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Almacén (opcional)</label>
          <select
            value={warehouseId}
            onChange={(e) => setWarehouseId(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
          >
            <option value="">Todos los almacenes</option>
            {warehouses.map((w) => (
              <option key={w.id} value={w.id}>{w.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Desde</label>
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Hasta</label>
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
          />
        </div>
      </div>
      <div className="flex items-center justify-between pt-1">
        <FormatSelector value={format} onChange={setFormat} />
        <DownloadButton onClick={download} loading={loading} />
      </div>
    </ReportCard>
  )
}

// ── Report 2: Inventory valuation ─────────────────────────────────────────────
function InventoryReport() {
  const [format, setFormat] = useState<Format>('pdf')
  const [loading, setLoading] = useState(false)

  async function download() {
    setLoading(true)
    try { await reportsApi.inventory(format) }
    catch (e) { alert((e as Error).message) }
    finally { setLoading(false) }
  }

  return (
    <ReportCard
      icon="warehouse"
      title="Valorización de Inventario"
      description="Stock actual con costo promedio y valor total por producto"
    >
      <p className="text-sm text-gray-500">
        Muestra el saldo actual de todos los productos activos, su costo promedio ponderado y el valor total del inventario.
      </p>
      <div className="flex items-center justify-between">
        <FormatSelector value={format} onChange={setFormat} />
        <DownloadButton onClick={download} loading={loading} />
      </div>
    </ReportCard>
  )
}

// ── Report 3: Movements ───────────────────────────────────────────────────────
const MOVEMENT_TYPES = [
  { value: '', label: 'Todos los tipos' },
  { value: 'ENTRY', label: 'Entradas' },
  { value: 'EXIT', label: 'Salidas' },
  { value: 'TRANSFER', label: 'Transferencias' },
]

function MovementsReport() {
  const today = new Date().toISOString().split('T')[0]
  const firstOfMonth = today.slice(0, 8) + '01'

  const [type, setType] = useState('')
  const [from, setFrom] = useState(firstOfMonth)
  const [to, setTo] = useState(today)
  const [format, setFormat] = useState<Format>('pdf')
  const [loading, setLoading] = useState(false)

  async function download() {
    if (!from || !to) return alert('Las fechas desde/hasta son obligatorias')
    setLoading(true)
    try {
      const params: MovementsReportParams = { from, to, format }
      if (type) params.type = type
      await reportsApi.movements(params)
    } catch (e) {
      alert((e as Error).message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <ReportCard
      icon="swap_vert"
      title="Reporte de Movimientos"
      description="Entradas y salidas por rango de fechas"
    >
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Tipo</label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
          >
            {MOVEMENT_TYPES.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Desde *</label>
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Hasta *</label>
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
          />
        </div>
      </div>
      <div className="flex items-center justify-between">
        <FormatSelector value={format} onChange={setFormat} />
        <DownloadButton onClick={download} loading={loading} />
      </div>
    </ReportCard>
  )
}

// ── Report 4: Low stock ───────────────────────────────────────────────────────
function LowStockReport() {
  const [format, setFormat] = useState<Format>('pdf')
  const [loading, setLoading] = useState(false)

  async function download() {
    setLoading(true)
    try { await reportsApi.lowStock(format) }
    catch (e) { alert((e as Error).message) }
    finally { setLoading(false) }
  }

  return (
    <ReportCard
      icon="warning"
      title="Alertas de Stock Mínimo"
      description="Productos cuyo stock actual es menor al mínimo configurado"
    >
      <p className="text-sm text-gray-500">
        Lista productos que están por debajo de su stock mínimo, ordenados por déficit de mayor a menor.
        Útil para planificar reposición de inventario.
      </p>
      <div className="flex items-center justify-between">
        <FormatSelector value={format} onChange={setFormat} />
        <DownloadButton onClick={download} loading={loading} />
      </div>
    </ReportCard>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
export function ReportsPage() {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Reportes</h1>
        <p className="text-sm text-gray-500 mt-0.5">Genera reportes en PDF o Excel para tu empresa</p>
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        <KardexReport />
        <InventoryReport />
        <MovementsReport />
        <LowStockReport />
      </div>
    </div>
  )
}
