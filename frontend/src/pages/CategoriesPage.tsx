import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { categoriesApi } from '@/api/categories'
import type { Category } from '@/types/api'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import { Spinner } from '@/components/ui/Spinner'

interface FormState { name: string; description: string }
const EMPTY: FormState = { name: '', description: '' }

export function CategoriesPage() {
  const qc = useQueryClient()
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Category | null>(null)
  const [form, setForm] = useState<FormState>(EMPTY)
  const [formError, setFormError] = useState('')

  const { data: categories = [], isLoading } = useQuery({
    queryKey: ['categories'],
    queryFn: () => categoriesApi.list(),
  })

  const saveMutation = useMutation({
    mutationFn: (f: FormState) =>
      editing
        ? categoriesApi.update(editing.id, f)
        : categoriesApi.create(f),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['categories'] })
      closeModal()
    },
    onError: (err: Error) => setFormError(err.message),
  })

  const deactivateMutation = useMutation({
    mutationFn: (id: string) => categoriesApi.deactivate(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['categories'] }),
  })

  function openCreate() {
    setEditing(null)
    setForm(EMPTY)
    setFormError('')
    setModalOpen(true)
  }

  function openEdit(c: Category) {
    setEditing(c)
    setForm({ name: c.name, description: c.description ?? '' })
    setFormError('')
    setModalOpen(true)
  }

  function closeModal() {
    setModalOpen(false)
    setEditing(null)
    setForm(EMPTY)
    setFormError('')
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setFormError('')
    saveMutation.mutate(form)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">{categories.length} categorías</p>
        <Button onClick={openCreate} icon="add">Nueva Categoría</Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16"><Spinner size="lg" /></div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-gray-500 border-b border-gray-100 bg-gray-50">
                <th className="px-6 py-3 font-medium">Nombre</th>
                <th className="px-6 py-3 font-medium">Descripción</th>
                <th className="px-6 py-3 font-medium">Estado</th>
                <th className="px-6 py-3 font-medium text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {categories.map((c) => (
                <tr key={c.id} className="hover:bg-gray-50">
                  <td className="px-6 py-3 font-medium text-gray-800">{c.name}</td>
                  <td className="px-6 py-3 text-gray-500">{c.description ?? '—'}</td>
                  <td className="px-6 py-3">
                    <Badge variant={c.isActive ? 'green' : 'red'}>
                      {c.isActive ? 'Activo' : 'Inactivo'}
                    </Badge>
                  </td>
                  <td className="px-6 py-3 text-right">
                    <div className="flex justify-end gap-2">
                      <Button size="sm" variant="secondary" onClick={() => openEdit(c)}>
                        Editar
                      </Button>
                      {c.isActive && (
                        <Button
                          size="sm"
                          variant="danger"
                          onClick={() => deactivateMutation.mutate(c.id)}
                        >
                          Desactivar
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!categories.length && (
            <div className="px-6 py-10 text-center text-gray-400 text-sm">
              Sin categorías. Crea la primera.
            </div>
          )}
        </div>
      )}

      <Modal
        open={modalOpen}
        onClose={closeModal}
        title={editing ? 'Editar Categoría' : 'Nueva Categoría'}
        size="sm"
      >
        {formError && (
          <div className="mb-4 text-sm text-red-600 bg-red-50 px-4 py-2 rounded-lg">{formError}</div>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Nombre"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
          />
          <Input
            label="Descripción (opcional)"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" type="button" onClick={closeModal}>
              Cancelar
            </Button>
            <Button type="submit" loading={saveMutation.isPending}>
              {editing ? 'Guardar' : 'Crear'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
