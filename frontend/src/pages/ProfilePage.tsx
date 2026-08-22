import { useState, type FormEvent } from 'react'
import { useAuthStore } from '@/store/auth'
import { authApi } from '@/api/auth'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'

const ROLE_LABEL: Record<string, string> = {
  ADMIN: 'Administrador',
  SUPERVISOR: 'Supervisor',
  WAREHOUSE: 'Almacenero',
}

export function ProfilePage() {
  const { user, updateUser } = useAuthStore()

  const [name, setName] = useState(user?.name ?? '')
  const [nameLoading, setNameLoading] = useState(false)
  const [nameSuccess, setNameSuccess] = useState(false)
  const [nameError, setNameError] = useState('')

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [pwLoading, setPwLoading] = useState(false)
  const [pwSuccess, setPwSuccess] = useState(false)
  const [pwError, setPwError] = useState('')

  async function handleNameSubmit(e: FormEvent) {
    e.preventDefault()
    if (name.trim() === user?.name) return
    setNameError('')
    setNameSuccess(false)
    setNameLoading(true)
    try {
      const updated = await authApi.updateProfile(name.trim())
      updateUser({ name: updated.name })
      setNameSuccess(true)
      setTimeout(() => setNameSuccess(false), 3000)
    } catch (err: unknown) {
      setNameError(err instanceof Error ? err.message : 'Error al actualizar el nombre')
    } finally {
      setNameLoading(false)
    }
  }

  async function handlePasswordSubmit(e: FormEvent) {
    e.preventDefault()
    setPwError('')
    setPwSuccess(false)

    if (newPassword !== confirmPassword) {
      setPwError('Las contraseñas nuevas no coinciden')
      return
    }

    setPwLoading(true)
    try {
      await authApi.changePassword(currentPassword, newPassword)
      setPwSuccess(true)
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      setTimeout(() => setPwSuccess(false), 3000)
    } catch (err: unknown) {
      setPwError(err instanceof Error ? err.message : 'Error al cambiar la contraseña')
    } finally {
      setPwLoading(false)
    }
  }

  return (
    <div className="max-w-lg space-y-4">
      {/* Información del usuario */}
      <Card>
        <CardHeader>
          <h2 className="font-semibold text-gray-800">Mi Perfil</h2>
        </CardHeader>
        <CardBody>
          <div className="flex items-center gap-4 mb-6">
            <div className="w-14 h-14 rounded-full bg-blue-600 flex items-center justify-center text-white text-xl font-bold shrink-0">
              {user?.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="font-medium text-gray-900">{user?.name}</p>
              <p className="text-sm text-gray-500">{user?.email}</p>
              <span className="inline-block mt-1 text-xs font-medium text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full">
                {user?.role ? ROLE_LABEL[user.role] : ''}
              </span>
            </div>
          </div>

          {nameError && (
            <div className="mb-4 flex items-center gap-2 bg-red-50 text-red-700 text-sm px-4 py-3 rounded-lg">
              <span className="material-icons text-base">error_outline</span>
              {nameError}
            </div>
          )}
          {nameSuccess && (
            <div className="mb-4 flex items-center gap-2 bg-green-50 text-green-700 text-sm px-4 py-3 rounded-lg">
              <span className="material-icons text-base">check_circle</span>
              Nombre actualizado correctamente
            </div>
          )}

          <form onSubmit={handleNameSubmit} className="space-y-4">
            <Input
              label="Nombre completo"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              minLength={2}
            />
            <Input
              label="Correo electrónico"
              value={user?.email ?? ''}
              disabled
              className="bg-gray-50 text-gray-500"
            />
            <div className="flex justify-end">
              <Button
                type="submit"
                loading={nameLoading}
                icon="save"
                disabled={name.trim() === user?.name || name.trim().length < 2}
              >
                Guardar nombre
              </Button>
            </div>
          </form>
        </CardBody>
      </Card>

      {/* Cambiar contraseña */}
      <Card>
        <CardHeader>
          <h2 className="font-semibold text-gray-800">Cambiar Contraseña</h2>
        </CardHeader>
        <CardBody>
          {pwError && (
            <div className="mb-4 flex items-center gap-2 bg-red-50 text-red-700 text-sm px-4 py-3 rounded-lg">
              <span className="material-icons text-base">error_outline</span>
              {pwError}
            </div>
          )}
          {pwSuccess && (
            <div className="mb-4 flex items-center gap-2 bg-green-50 text-green-700 text-sm px-4 py-3 rounded-lg">
              <span className="material-icons text-base">check_circle</span>
              Contraseña actualizada correctamente
            </div>
          )}

          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <Input
              label="Contraseña actual"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
            />
            <Input
              label="Nueva contraseña"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Mínimo 8 caracteres"
              required
              minLength={8}
            />
            <Input
              label="Confirmar nueva contraseña"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
            <div className="flex justify-end">
              <Button type="submit" loading={pwLoading} icon="lock">
                Cambiar contraseña
              </Button>
            </div>
          </form>
        </CardBody>
      </Card>
    </div>
  )
}
