import { useQuery } from '@tanstack/react-query'
import { stockApi } from '@/api/stock'
import { Badge } from '@/components/ui/Badge'
import { Spinner } from '@/components/ui/Spinner'

export function StockPage() {
  const { data: stock = [], isLoading } = useQuery({
    queryKey: ['stock'],
    queryFn: () => stockApi.list(),
  })

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-500">{stock.length} registros de stock</p>

      {isLoading ? (
        <div className="flex justify-center py-16"><Spinner size="lg" /></div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-gray-500 border-b border-gray-100 bg-gray-50">
                <th className="px-6 py-3 font-medium">Producto</th>
                <th className="px-6 py-3 font-medium">Almacén</th>
                <th className="px-6 py-3 font-medium text-right">Cantidad</th>
                <th className="px-6 py-3 font-medium text-right">Costo Prom.</th>
                <th className="px-6 py-3 font-medium text-right">Valor Total</th>
                <th className="px-6 py-3 font-medium">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {stock.map((s) => {
                const qty = parseFloat(s.quantity)
                const avg = parseFloat(s.avgCost)
                const total = qty * avg
                const low = qty < 10
                return (
                  <tr key={s.id} className="hover:bg-gray-50">
                    <td className="px-6 py-3 font-medium text-gray-800">{s.productName}</td>
                    <td className="px-6 py-3 text-gray-600">{s.warehouseName}</td>
                    <td className={`px-6 py-3 text-right font-semibold ${low ? 'text-red-600' : 'text-gray-800'}`}>
                      {qty.toLocaleString('es-PE', { maximumFractionDigits: 2 })}
                    </td>
                    <td className="px-6 py-3 text-right text-gray-600">
                      S/ {avg.toFixed(4)}
                    </td>
                    <td className="px-6 py-3 text-right font-medium text-gray-800">
                      S/ {total.toFixed(2)}
                    </td>
                    <td className="px-6 py-3">
                      {low ? (
                        <Badge variant="red">Stock Bajo</Badge>
                      ) : (
                        <Badge variant="green">Normal</Badge>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {!stock.length && (
            <div className="px-6 py-10 text-center text-gray-400 text-sm">
              Sin registros de stock. Registra una entrada primero.
            </div>
          )}
        </div>
      )}
    </div>
  )
}
