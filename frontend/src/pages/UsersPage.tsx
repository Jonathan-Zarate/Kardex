import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { usersApi } from '@/api/users'
import type { User, Role } from '@/types/api'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Badge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import { Spinner } from '@/components/ui/Spinner'

const ROLE_OPTIONS = [
  { value: 'ADMIN', label: 'Administrador' },
  { value: 'SUPERVISOR', label: 'Supervisor' },
  { value: 'WAREHOUSE', label: 'Almacenero' },
]
const ROLE_BADGE: Record<Role, 'purple' | 'blue' | 'gray'> = {
  ADMIN: 'purple', SUPERVISOR: 'blue', WAREHOUSE: 'gray',
}
const ROLE_LABEL: Record<Role, string> = {
  ADMIN: 'Admin', SUPERVISOR: 'Supervisor', WAREHOUSE: 'Almacenero',
}

interface CreateForm { name: string; email: string; password: string; role: Role }
const CREATE_EMPTY: CreateForm = { name: '', email: '', password: '', role: 'WAREHOUSE' }

export function UsersPage() {
  const qc = useQueryClient()
  const [createOpen, setCreateOpen] = useState(false)
  const [createForm, setCreateForm] = useState<CreateForm>(CREATE_EMPTY)
  const [formError, setFormError] = useState('')

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: usersApi.list,
  })

  const createMutation = useMutation({
    mutationFn: (f: CreateForm) => usersApi.create(f),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] })
      setCreateOpen(false)
      setCreateForm(CREATE_EMPTY)
      setFormError('')
    },
    onError: (err: Error) => setFormError(err.message),
  })

  const deactivateMutation = useMutation({
    mutationFn: (id: string) => usersApi.deactivate(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
  })

  const unlockMutation = useMutation({
    mutationFn: (id: string) => usersApi.unlock(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
  })

  function setField(k: keyof CreateForm) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setCreateForm((f) => ({ ...f, [k]: e.target.value }))
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">{users.length} usuarios</p>
        <Button onClick={() => { setCreateForm(CREATE_EMPTY); setFormError(''); setCreateOpen(true) }} icon="person_add">
          Nuevo Usuario
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16"><Spinner size="lg" /></div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-gray-500 border-b border-gray-100 bg-gray-50">
                <th className="px-6 py-3 font-medium">Nombre</th>
                <th className="px-6 py-3 font-medium">Email</th>
                <th className="px-6 py-3 font-medium">Rol</th>
                <th className="px-6 py-3 font-medium">Estado</th>
                <th className="px-6 py-3 font-medium text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {users.map((u: User) => (
                <tr key={u.id} className="hover:bg-gray-50">
                  <td className="px-6 py-3 font-medium text-gray-800">{u.name}</td>
                  <td className="px-6 py-3 text-gray-600">{u.email}</td>
                  <td className="px-6 py-3">
                    <Badge variant={ROLE_BADGE[u.role]}>{ROLE_LABEL[u.role]}</Badge>
                  </td>
                  <td className="px-6 py-3">
                    {u.lockedAt ? (
                      <Badge variant="yellow">Bloqueado</Badge>
                    ) : (
                      <Badge variant={u.isActive ? 'green' : 'red'}>
                        {u.isActive ? 'Activo' : 'Inactivo'}
                      </Badge>
                    )}
                  </td>
                  <td className="px-6 py-3 text-right">
                    <div className="flex justify-end gap-2">
                      {u.lockedAt && (
                        <Button size="sm" variant="secondary" onClick={() => unlockMutation.mutate(u.id)}>
                          Desbloquear
                        </Button>
                      )}
                      {u.isActive && !u.lockedAt && (
                        <Button size="sm" variant="danger" onClick={() => deactivateMutation.mutate(u.id)}>
                          Desactivar
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!users.length && (
            <div className="px-6 py-10 text-center text-gray-400 text-sm">Sin usuarios.</div>
          )}
        </div>
      )}

      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Nuevo Usuario" size="sm">
        {formError && (
          <div className="mb-4 text-sm text-red-600 bg-red-50 px-4 py-2 rounded-lg">{formError}</div>
        )}
        <form
          onSubmit={(e) => { e.preventDefault(); setFormError(''); createMutation.mutate(createForm) }}
          className="space-y-4"
        >
          <Input label="Nombre *" value={createForm.name} onChange={setField('name')} required />
          <Input label="Email *" type="email" value={createForm.email} onChange={setField('email')} required />
          <Input label="Contraseña *" type="password" value={createForm.password} onChange={setField('password')} required />
          <Select
            label="Rol *"
            value={createForm.role}
            onChange={setField('role')}
            options={ROLE_OPTIONS}
          />
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" type="button" onClick={() => setCreateOpen(false)}>Cancelar</Button>
            <Button type="submit" loading={createMutation.isPending}>Crear</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
