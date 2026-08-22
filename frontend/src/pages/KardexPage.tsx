import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { kardexApi } from '@/api/kardex'
import { productsApi } from '@/api/products'
import { warehousesApi } from '@/api/warehouses'
import { Select } from '@/components/ui/Select'
import { Button } from '@/components/ui/Button'
import { Spinner } from '@/components/ui/Spinner'

const SUBTYPE_LABEL: Record<string, string> = {
  PURCHASE: 'Compra', SALE_RETURN: 'Dev. Venta', POSITIVE_ADJUSTMENT: 'Ajuste +',
  SALE: 'Venta', PURCHASE_RETURN: 'Dev. Compra', NEGATIVE_ADJUSTMENT: 'Ajuste −',
  TRANSFER_IN: 'Entrada Transf.', TRANSFER_OUT: 'Salida Transf.',
}

export function KardexPage() {
  const [productId, setProductId] = useState('')
  const [warehouseId, setWarehouseId] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [search, setSearch] = useState<{ productId: string; warehouseId?: string; from?: string; to?: string } | null>(null)

  const { data: products = [] } = useQuery({
    queryKey: ['products'],
    queryFn: () => productsApi.list(),
  })
  const { data: warehouses = [] } = useQuery({
    queryKey: ['warehouses'],
    queryFn: warehousesApi.list,
  })

  const { data: entries = [], isLoading, isFetching } = useQuery({
    queryKey: ['kardex', search],
    queryFn: () => kardexApi.report(search!),
    enabled: !!search,
  })

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    if (!productId) return
    setSearch({
      productId,
      warehouseId: warehouseId || undefined,
      from: from || undefined,
      to: to || undefined,
    })
  }

  const productOpts = products.map((p) => ({ value: p.id, label: `${p.code} — ${p.name}` }))
  const warehouseOpts = warehouses
    .filter((w) => w.isActive)
    .map((w) => ({ value: w.id, label: w.name }))

  function fmt(v: string) {
    const n = parseFloat(v)
    return n === 0 ? '—' : n.toFixed(4)
  }

  const firstEntry = entries[0]
  const lastEntry = entries[entries.length - 1]

  return (
    <div className="space-y-4">
      {/* Filters */}
      <form onSubmit={handleSearch} className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div className="sm:col-span-2">
            <Select
              label="Producto *"
              value={productId}
              onChange={(e) => setProductId(e.target.value)}
              options={productOpts}
              placeholder="Seleccionar producto..."
            />
          </div>
          <Select
            label="Almacén"
            value={warehouseId}
            onChange={(e) => setWarehouseId(e.target.value)}
            options={warehouseOpts}
            placeholder="Todos"
          />
          <div className="flex items-end">
            <Button type="submit" icon="search" className="w-full" disabled={!productId}>
              Consultar
            </Button>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Desde</label>
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Hasta</label>
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </form>

      {/* Summary */}
      {search && entries.length > 0 && (
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Saldo inicial', value: `S/ ${parseFloat(entries[0].balanceTotalValue).toFixed(2)}` },
            { label: `${entries.length} movimientos`, value: firstEntry?.productName ?? '' },
            { label: 'Saldo final', value: `S/ ${parseFloat(lastEntry.balanceTotalValue).toFixed(2)}` },
          ].map((s) => (
            <div key={s.label} className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
              <p className="text-xs text-gray-500">{s.label}</p>
              <p className="text-base font-semibold text-gray-800 mt-1">{s.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Table */}
      {search && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          {isLoading || isFetching ? (
            <div className="flex justify-center py-16"><Spinner size="lg" /></div>
          ) : (
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-gray-500 border-b border-gray-100 bg-gray-50">
                  <th className="px-4 py-3 font-medium">Fecha</th>
                  <th className="px-4 py-3 font-medium">Concepto</th>
                  <th className="px-4 py-3 font-medium">Almacén</th>
                  <th className="px-4 py-3 font-medium text-right">E. Cant.</th>
                  <th className="px-4 py-3 font-medium text-right">E. Costo</th>
                  <th className="px-4 py-3 font-medium text-right">S. Cant.</th>
                  <th className="px-4 py-3 font-medium text-right">S. Costo</th>
                  <th className="px-4 py-3 font-medium text-right">Saldo Cant.</th>
                  <th className="px-4 py-3 font-medium text-right">C. Prom.</th>
                  <th className="px-4 py-3 font-medium text-right">Valor</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {entries.map((e) => (
                  <tr key={e.id} className="hover:bg-gray-50">
                    <td className="px-4 py-2.5 text-gray-500">
                      {new Date(e.date).toLocaleDateString('es-PE')}
                    </td>
                    <td className="px-4 py-2.5 text-gray-700">
                      {SUBTYPE_LABEL[e.movementSubtype] ?? e.movementSubtype}
                    </td>
                    <td className="px-4 py-2.5 text-gray-600">{e.warehouseName}</td>
                    <td className="px-4 py-2.5 text-right text-green-700 font-medium">{fmt(e.inQty)}</td>
                    <td className="px-4 py-2.5 text-right text-green-700">{fmt(e.inUnitCost)}</td>
                    <td className="px-4 py-2.5 text-right text-red-700 font-medium">{fmt(e.outQty)}</td>
                    <td className="px-4 py-2.5 text-right text-red-700">{fmt(e.outUnitCost)}</td>
                    <td className="px-4 py-2.5 text-right font-semibold text-gray-800">
                      {parseFloat(e.balanceQty).toFixed(2)}
                    </td>
                    <td className="px-4 py-2.5 text-right text-gray-600">{parseFloat(e.balanceAvgCost).toFixed(4)}</td>
                    <td className="px-4 py-2.5 text-right font-semibold text-gray-800">
                      {parseFloat(e.balanceTotalValue).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {!entries.length && !isLoading && (
            <div className="px-6 py-10 text-center text-gray-400 text-sm">
              Sin registros para este producto.
            </div>
          )}
        </div>
      )}

      {!search && (
        <div className="flex flex-col items-center justify-center py-16 text-gray-400">
          <span className="material-icons text-5xl mb-3">receipt_long</span>
          <p className="text-sm">Selecciona un producto y haz clic en Consultar</p>
        </div>
      )}
    </div>
  )
}
