import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation } from '@tanstack/react-query'
import { movementsApi } from '@/api/movements'
import { productsApi } from '@/api/products'
import { warehousesApi } from '@/api/warehouses'
import { suppliersApi } from '@/api/suppliers'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'

type MovType = 'ENTRY' | 'EXIT' | 'TRANSFER'

const ENTRY_SUBTYPES = [
  { value: 'PURCHASE', label: 'Compra' },
  { value: 'SALE_RETURN', label: 'Devolución de Venta' },
  { value: 'POSITIVE_ADJUSTMENT', label: 'Ajuste Positivo' },
]
const EXIT_SUBTYPES = [
  { value: 'SALE', label: 'Venta' },
  { value: 'PURCHASE_RETURN', label: 'Devolución de Compra' },
  { value: 'NEGATIVE_ADJUSTMENT', label: 'Ajuste Negativo' },
]

export function NewMovementPage() {
  const navigate = useNavigate()

  const [type, setType] = useState<MovType>('ENTRY')
  const [productId, setProductId] = useState('')
  const [warehouseId, setWarehouseId] = useState('')
  const [srcWarehouseId, setSrcWarehouseId] = useState('')
  const [dstWarehouseId, setDstWarehouseId] = useState('')
  const [subtype, setSubtype] = useState('PURCHASE')
  const [quantity, setQuantity] = useState('')
  const [unitCost, setUnitCost] = useState('')
  const [supplierId, setSupplierId] = useState('')
  const [reference, setReference] = useState('')
  const [notes, setNotes] = useState('')
  const [error, setError] = useState('')

  const { data: products = [] } = useQuery({
    queryKey: ['products'],
    queryFn: () => productsApi.list(),
  })
  const { data: warehouses = [] } = useQuery({
    queryKey: ['warehouses'],
    queryFn: () => warehousesApi.list(),
  })
  const { data: suppliers = [] } = useQuery({
    queryKey: ['suppliers'],
    queryFn: () => suppliersApi.list(),
  })

  const mutation = useMutation({
    mutationFn: movementsApi.create,
    onSuccess: () => navigate('/movements'),
    onError: (err: Error) => setError(err.message),
  })

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (type === 'ENTRY') {
      mutation.mutate({
        type: 'ENTRY',
        subtype: subtype as 'PURCHASE' | 'SALE_RETURN' | 'POSITIVE_ADJUSTMENT',
        productId,
        warehouseId,
        quantity: parseFloat(quantity),
        unitCost: parseFloat(unitCost),
        reference: reference || undefined,
        notes: notes || undefined,
        supplierId: supplierId || undefined,
      })
    } else if (type === 'EXIT') {
      mutation.mutate({
        type: 'EXIT',
        subtype: subtype as 'SALE' | 'PURCHASE_RETURN' | 'NEGATIVE_ADJUSTMENT',
        productId,
        warehouseId,
        quantity: parseFloat(quantity),
        reference: reference || undefined,
        notes: notes || undefined,
      })
    } else {
      mutation.mutate({
        type: 'TRANSFER',
        productId,
        sourceWarehouseId: srcWarehouseId,
        targetWarehouseId: dstWarehouseId,
        quantity: parseFloat(quantity),
        notes: notes || undefined,
      })
    }
  }

  const productOpts = products.map((p) => ({ value: p.id, label: `${p.code} — ${p.name}` }))
  const warehouseOpts = warehouses
    .filter((w) => w.isActive)
    .map((w) => ({ value: w.id, label: w.name }))
  const supplierOpts = suppliers
    .filter((s) => s.isActive)
    .map((s) => ({ value: s.id, label: s.name }))

  const subtypeOpts = type === 'ENTRY' ? ENTRY_SUBTYPES : EXIT_SUBTYPES

  function handleTypeChange(t: MovType) {
    setType(t)
    setSubtype(t === 'ENTRY' ? 'PURCHASE' : t === 'EXIT' ? 'SALE' : '')
  }

  return (
    <div className="max-w-xl">
      <Card>
        <CardHeader>
          <h2 className="font-semibold text-gray-800">Registrar Movimiento</h2>
        </CardHeader>
        <CardBody>
          {error && (
            <div className="mb-4 text-sm text-red-600 bg-red-50 px-4 py-2 rounded-lg">{error}</div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Tipo de movimiento */}
            <div>
              <p className="text-sm font-medium text-gray-700 mb-2">Tipo de movimiento</p>
              <div className="flex gap-2">
                {(['ENTRY', 'EXIT', 'TRANSFER'] as MovType[]).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => handleTypeChange(t)}
                    className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${
                      type === t
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    {t === 'ENTRY' ? 'Entrada' : t === 'EXIT' ? 'Salida' : 'Transferencia'}
                  </button>
                ))}
              </div>
            </div>

            {/* Subtipo */}
            {type !== 'TRANSFER' && (
              <Select
                label="Subtipo"
                value={subtype}
                onChange={(e) => setSubtype(e.target.value)}
                options={subtypeOpts}
              />
            )}

            {/* Producto */}
            <Select
              label="Producto *"
              value={productId}
              onChange={(e) => setProductId(e.target.value)}
              options={productOpts}
              placeholder="Seleccionar producto..."
            />

            {/* Almacén(es) */}
            {type === 'TRANSFER' ? (
              <div className="grid grid-cols-2 gap-3">
                <Select
                  label="Almacén origen *"
                  value={srcWarehouseId}
                  onChange={(e) => setSrcWarehouseId(e.target.value)}
                  options={warehouseOpts}
                  placeholder="Origen..."
                />
                <Select
                  label="Almacén destino *"
                  value={dstWarehouseId}
                  onChange={(e) => setDstWarehouseId(e.target.value)}
                  options={warehouseOpts}
                  placeholder="Destino..."
                />
              </div>
            ) : (
              <Select
                label="Almacén *"
                value={warehouseId}
                onChange={(e) => setWarehouseId(e.target.value)}
                options={warehouseOpts}
                placeholder="Seleccionar almacén..."
              />
            )}

            {/* Cantidad y costo */}
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Cantidad *"
                type="number"
                step="0.01"
                min="0.01"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                required
              />
              {type === 'ENTRY' && (
                <Input
                  label="Costo unitario *"
                  type="number"
                  step="0.0001"
                  min="0"
                  value={unitCost}
                  onChange={(e) => setUnitCost(e.target.value)}
                  required
                />
              )}
            </div>

            {/* Proveedor (solo ENTRY) */}
            {type === 'ENTRY' && (
              <Select
                label="Proveedor (opcional)"
                value={supplierId}
                onChange={(e) => setSupplierId(e.target.value)}
                options={supplierOpts}
                placeholder="Sin proveedor"
              />
            )}

            {/* Referencia y notas */}
            {type !== 'TRANSFER' && (
              <Input
                label="Referencia (ej. Factura N°)"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
              />
            )}
            <Input
              label="Notas"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />

            <div className="flex justify-end gap-3 pt-2">
              <Button variant="secondary" type="button" onClick={() => navigate('/movements')}>
                Cancelar
              </Button>
              <Button type="submit" loading={mutation.isPending} icon="check">
                Registrar
              </Button>
            </div>
          </form>
        </CardBody>
      </Card>
    </div>
  )
}
