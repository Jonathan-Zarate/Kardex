import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { suppliersApi } from '@/api/suppliers'
import type { Supplier } from '@/types/api'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import { Spinner } from '@/components/ui/Spinner'

interface FormState {
  name: string; ruc: string; email: string; phone: string; address: string
}
const EMPTY: FormState = { name: '', ruc: '', email: '', phone: '', address: '' }

export function SuppliersPage() {
  const qc = useQueryClient()
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Supplier | null>(null)
  const [form, setForm] = useState<FormState>(EMPTY)
  const [formError, setFormError] = useState('')

  const { data: suppliers = [], isLoading } = useQuery({
    queryKey: ['suppliers'],
    queryFn: suppliersApi.list,
  })

  const saveMutation = useMutation({
    mutationFn: (f: FormState) => {
      const payload = {
        name: f.name,
        ruc: f.ruc || undefined,
        email: f.email || undefined,
        phone: f.phone || undefined,
        address: f.address || undefined,
      }
      return editing
        ? suppliersApi.update(editing.id, payload)
        : suppliersApi.create(payload)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['suppliers'] })
      closeModal()
    },
    onError: (err: Error) => setFormError(err.message),
  })

  const deactivateMutation = useMutation({
    mutationFn: (id: string) => suppliersApi.deactivate(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['suppliers'] }),
  })

  function openCreate() {
    setEditing(null); setForm(EMPTY); setFormError(''); setModalOpen(true)
  }
  function openEdit(s: Supplier) {
    setEditing(s)
    setForm({ name: s.name, ruc: s.ruc ?? '', email: s.email ?? '', phone: s.phone ?? '', address: s.address ?? '' })
    setFormError(''); setModalOpen(true)
  }
  function closeModal() {
    setModalOpen(false); setEditing(null); setForm(EMPTY); setFormError('')
  }

  function set(k: keyof FormState) {
    return (e: React.ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, [k]: e.target.value }))
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">{suppliers.length} proveedores</p>
        <Button onClick={openCreate} icon="add">Nuevo Proveedor</Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16"><Spinner size="lg" /></div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-gray-500 border-b border-gray-100 bg-gray-50">
                <th className="px-6 py-3 font-medium">Nombre</th>
                <th className="px-6 py-3 font-medium">RUC</th>
                <th className="px-6 py-3 font-medium">Email</th>
                <th className="px-6 py-3 font-medium">Teléfono</th>
                <th className="px-6 py-3 font-medium">Estado</th>
                <th className="px-6 py-3 font-medium text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {suppliers.map((s) => (
                <tr key={s.id} className="hover:bg-gray-50">
                  <td className="px-6 py-3 font-medium text-gray-800">{s.name}</td>
                  <td className="px-6 py-3 text-gray-600">{s.ruc ?? '—'}</td>
                  <td className="px-6 py-3 text-gray-600">{s.email ?? '—'}</td>
                  <td className="px-6 py-3 text-gray-600">{s.phone ?? '—'}</td>
                  <td className="px-6 py-3">
                    <Badge variant={s.isActive ? 'green' : 'red'}>
                      {s.isActive ? 'Activo' : 'Inactivo'}
                    </Badge>
                  </td>
                  <td className="px-6 py-3 text-right">
                    <div className="flex justify-end gap-2">
                      <Button size="sm" variant="secondary" onClick={() => openEdit(s)}>Editar</Button>
                      {s.isActive && (
                        <Button size="sm" variant="danger" onClick={() => deactivateMutation.mutate(s.id)}>
                          Desactivar
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!suppliers.length && (
            <div className="px-6 py-10 text-center text-gray-400 text-sm">Sin proveedores.</div>
          )}
        </div>
      )}

      <Modal open={modalOpen} onClose={closeModal} title={editing ? 'Editar Proveedor' : 'Nuevo Proveedor'}>
        {formError && (
          <div className="mb-4 text-sm text-red-600 bg-red-50 px-4 py-2 rounded-lg">{formError}</div>
        )}
        <form onSubmit={(e) => { e.preventDefault(); setFormError(''); saveMutation.mutate(form) }} className="space-y-4">
          <Input label="Nombre *" value={form.name} onChange={set('name')} required />
          <div className="grid grid-cols-2 gap-3">
            <Input label="RUC" value={form.ruc} onChange={set('ruc')} />
            <Input label="Teléfono" value={form.phone} onChange={set('phone')} />
          </div>
          <Input label="Email" type="email" value={form.email} onChange={set('email')} />
          <Input label="Dirección" value={form.address} onChange={set('address')} />
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" type="button" onClick={closeModal}>Cancelar</Button>
            <Button type="submit" loading={saveMutation.isPending}>{editing ? 'Guardar' : 'Crear'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
