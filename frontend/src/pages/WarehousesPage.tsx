import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { warehousesApi } from '@/api/warehouses'
import type { Warehouse } from '@/types/api'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import { Spinner } from '@/components/ui/Spinner'

interface FormState { name: string; location: string }
const EMPTY: FormState = { name: '', location: '' }

export function WarehousesPage() {
  const qc = useQueryClient()
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Warehouse | null>(null)
  const [form, setForm] = useState<FormState>(EMPTY)
  const [formError, setFormError] = useState('')

  const { data: warehouses = [], isLoading } = useQuery({
    queryKey: ['warehouses'],
    queryFn: warehousesApi.list,
  })

  const saveMutation = useMutation({
    mutationFn: (f: FormState) => {
      const payload = { name: f.name, location: f.location || undefined }
      return editing
        ? warehousesApi.update(editing.id, payload)
        : warehousesApi.create(payload)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['warehouses'] })
      closeModal()
    },
    onError: (err: Error) => setFormError(err.message),
  })

  const deactivateMutation = useMutation({
    mutationFn: (id: string) => warehousesApi.deactivate(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['warehouses'] }),
  })

  function openCreate() {
    setEditing(null); setForm(EMPTY); setFormError(''); setModalOpen(true)
  }
  function openEdit(w: Warehouse) {
    setEditing(w)
    setForm({ name: w.name, location: w.location ?? '' })
    setFormError(''); setModalOpen(true)
  }
  function closeModal() {
    setModalOpen(false); setEditing(null); setForm(EMPTY); setFormError('')
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">{warehouses.length} almacenes</p>
        <Button onClick={openCreate} icon="add">Nuevo Almacén</Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16"><Spinner size="lg" /></div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-gray-500 border-b border-gray-100 bg-gray-50">
                <th className="px-6 py-3 font-medium">Nombre</th>
                <th className="px-6 py-3 font-medium">Ubicación</th>
                <th className="px-6 py-3 font-medium">Estado</th>
                <th className="px-6 py-3 font-medium text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {warehouses.map((w) => (
                <tr key={w.id} className="hover:bg-gray-50">
                  <td className="px-6 py-3 font-medium text-gray-800">{w.name}</td>
                  <td className="px-6 py-3 text-gray-600">{w.location ?? '—'}</td>
                  <td className="px-6 py-3">
                    <Badge variant={w.isActive ? 'green' : 'red'}>
                      {w.isActive ? 'Activo' : 'Inactivo'}
                    </Badge>
                  </td>
                  <td className="px-6 py-3 text-right">
                    <div className="flex justify-end gap-2">
                      <Button size="sm" variant="secondary" onClick={() => openEdit(w)}>Editar</Button>
                      {w.isActive && (
                        <Button size="sm" variant="danger" onClick={() => deactivateMutation.mutate(w.id)}>
                          Desactivar
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!warehouses.length && (
            <div className="px-6 py-10 text-center text-gray-400 text-sm">Sin almacenes.</div>
          )}
        </div>
      )}

      <Modal open={modalOpen} onClose={closeModal} title={editing ? 'Editar Almacén' : 'Nuevo Almacén'} size="sm">
        {formError && (
          <div className="mb-4 text-sm text-red-600 bg-red-50 px-4 py-2 rounded-lg">{formError}</div>
        )}
        <form
          onSubmit={(e) => { e.preventDefault(); setFormError(''); saveMutation.mutate(form) }}
          className="space-y-4"
        >
          <Input label="Nombre *" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          <Input label="Ubicación" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" type="button" onClick={closeModal}>Cancelar</Button>
            <Button type="submit" loading={saveMutation.isPending}>{editing ? 'Guardar' : 'Crear'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
