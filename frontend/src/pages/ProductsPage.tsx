import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { productsApi } from '@/api/products'
import { categoriesApi } from '@/api/categories'
import type { Product, UOM } from '@/types/api'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Badge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import { Spinner } from '@/components/ui/Spinner'

interface FormState {
  code: string; name: string; description: string
  unitOfMeasure: string; categoryId: string; minStock: string; salePrice: string
}
const EMPTY: FormState = {
  code: '', name: '', description: '', unitOfMeasure: 'UND', categoryId: '', minStock: '', salePrice: '',
}

const UOM_OPTIONS = [
  { value: 'UND', label: 'UND — Unidad' },
  { value: 'KG', label: 'KG — Kilogramo' },
  { value: 'LT', label: 'LT — Litro' },
  { value: 'MT', label: 'MT — Metro' },
  { value: 'CJA', label: 'CJA — Caja' },
  { value: 'PAQ', label: 'PAQ — Paquete' },
]

export function ProductsPage() {
  const qc = useQueryClient()
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Product | null>(null)
  const [form, setForm] = useState<FormState>(EMPTY)
  const [formError, setFormError] = useState('')

  const { data: products = [], isLoading } = useQuery({
    queryKey: ['products'],
    queryFn: () => productsApi.list(),
  })
  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: () => categoriesApi.list(),
  })

  const saveMutation = useMutation({
    mutationFn: (f: FormState) => {
      const payload = {
        code: f.code,
        name: f.name,
        description: f.description || undefined,
        unitOfMeasure: f.unitOfMeasure as UOM,
        categoryId: f.categoryId || undefined,
        minStock: f.minStock ? parseFloat(f.minStock) : undefined,
        salePrice: f.salePrice ? parseFloat(f.salePrice) : undefined,
      }
      return editing
        ? productsApi.update(editing.id, payload)
        : productsApi.create(payload)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['products'] })
      closeModal()
    },
    onError: (err: Error) => setFormError(err.message),
  })

  const deactivateMutation = useMutation({
    mutationFn: (id: string) => productsApi.deactivate(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['products'] }),
  })

  function openCreate() {
    setEditing(null); setForm(EMPTY); setFormError(''); setModalOpen(true)
  }
  function openEdit(p: Product) {
    setEditing(p)
    setForm({
      code: p.code,
      name: p.name,
      description: p.description ?? '',
      unitOfMeasure: p.unitOfMeasure,
      categoryId: p.categoryId ?? '',
      minStock: p.minStock ? String(parseFloat(p.minStock)) : '',
      salePrice: p.salePrice ? String(parseFloat(p.salePrice)) : '',
    })
    setFormError(''); setModalOpen(true)
  }
  function closeModal() {
    setModalOpen(false); setEditing(null); setForm(EMPTY); setFormError('')
  }

  function set(k: keyof FormState) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm((f) => ({ ...f, [k]: e.target.value }))
  }

  const catOptions = categories
    .filter((c) => c.isActive)
    .map((c) => ({ value: c.id, label: c.name }))

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">{products.length} productos</p>
        <Button onClick={openCreate} icon="add">Nuevo Producto</Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16"><Spinner size="lg" /></div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-gray-500 border-b border-gray-100 bg-gray-50">
                <th className="px-6 py-3 font-medium">Código</th>
                <th className="px-6 py-3 font-medium">Nombre</th>
                <th className="px-6 py-3 font-medium">Categoría</th>
                <th className="px-6 py-3 font-medium">U.M.</th>
                <th className="px-6 py-3 font-medium text-right">Precio Venta</th>
                <th className="px-6 py-3 font-medium">Estado</th>
                <th className="px-6 py-3 font-medium text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {products.map((p) => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="px-6 py-3 text-gray-500 font-mono text-xs">{p.code}</td>
                  <td className="px-6 py-3 font-medium text-gray-800">{p.name}</td>
                  <td className="px-6 py-3 text-gray-600">{p.categoryName ?? '—'}</td>
                  <td className="px-6 py-3 text-gray-600">{p.unitOfMeasure}</td>
                  <td className="px-6 py-3 text-right">
                    {p.salePrice ? `S/ ${parseFloat(p.salePrice).toFixed(2)}` : '—'}
                  </td>
                  <td className="px-6 py-3">
                    <Badge variant={p.isActive ? 'green' : 'red'}>
                      {p.isActive ? 'Activo' : 'Inactivo'}
                    </Badge>
                  </td>
                  <td className="px-6 py-3 text-right">
                    <div className="flex justify-end gap-2">
                      <Button size="sm" variant="secondary" onClick={() => openEdit(p)}>Editar</Button>
                      {p.isActive && (
                        <Button size="sm" variant="danger" onClick={() => deactivateMutation.mutate(p.id)}>
                          Desactivar
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!products.length && (
            <div className="px-6 py-10 text-center text-gray-400 text-sm">Sin productos.</div>
          )}
        </div>
      )}

      <Modal open={modalOpen} onClose={closeModal} title={editing ? 'Editar Producto' : 'Nuevo Producto'} size="lg">
        {formError && (
          <div className="mb-4 text-sm text-red-600 bg-red-50 px-4 py-2 rounded-lg">{formError}</div>
        )}
        <form
          onSubmit={(e) => { e.preventDefault(); setFormError(''); saveMutation.mutate(form) }}
          className="space-y-4"
        >
          <div className="grid grid-cols-2 gap-3">
            <Input label="Código *" value={form.code} onChange={set('code')} required disabled={!!editing} />
            <Select
              label="Unidad de medida *"
              value={form.unitOfMeasure}
              onChange={set('unitOfMeasure')}
              options={UOM_OPTIONS}
            />
          </div>
          <Input label="Nombre *" value={form.name} onChange={set('name')} required />
          <Input label="Descripción" value={form.description} onChange={set('description')} />
          <Select
            label="Categoría"
            value={form.categoryId}
            onChange={set('categoryId')}
            options={catOptions}
            placeholder="Sin categoría"
          />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Stock mínimo" type="number" step="0.01" value={form.minStock} onChange={set('minStock')} />
            <Input label="Precio de venta (S/)" type="number" step="0.01" value={form.salePrice} onChange={set('salePrice')} />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" type="button" onClick={closeModal}>Cancelar</Button>
            <Button type="submit" loading={saveMutation.isPending}>{editing ? 'Guardar' : 'Crear'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
