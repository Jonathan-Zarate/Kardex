import { useAuthStore } from '@/store/auth'

const BASE = '/api'

async function downloadFile(path: string, filename: string) {
  const { accessToken } = useAuthStore.getState()
  const res = await fetch(`${BASE}${path}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({})) as { error?: string }
    throw new Error(body.error ?? 'Error generando el reporte')
  }
  const blob = await res.blob()
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export interface KardexReportParams {
  productId: string
  warehouseId?: string
  from?: string
  to?: string
  format: 'pdf' | 'excel'
}

export interface MovementsReportParams {
  type?: string
  from: string
  to: string
  format: 'pdf' | 'excel'
}

export const reportsApi = {
  kardex: (p: KardexReportParams) => {
    const q = new URLSearchParams({ productId: p.productId, format: p.format })
    if (p.warehouseId) q.set('warehouseId', p.warehouseId)
    if (p.from) q.set('from', p.from)
    if (p.to) q.set('to', p.to)
    return downloadFile(`/reports/kardex?${q}`, `kardex.${p.format === 'pdf' ? 'pdf' : 'xlsx'}`)
  },

  inventory: (format: 'pdf' | 'excel') =>
    downloadFile(`/reports/inventory?format=${format}`, `inventario.${format === 'pdf' ? 'pdf' : 'xlsx'}`),

  movements: (p: MovementsReportParams) => {
    const q = new URLSearchParams({ from: p.from, to: p.to, format: p.format })
    if (p.type) q.set('type', p.type)
    return downloadFile(`/reports/movements?${q}`, `movimientos.${p.format === 'pdf' ? 'pdf' : 'xlsx'}`)
  },

  lowStock: (format: 'pdf' | 'excel') =>
    downloadFile(`/reports/low-stock?format=${format}`, `bajo-stock.${format === 'pdf' ? 'pdf' : 'xlsx'}`),
}
