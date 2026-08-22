import { useState, type FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { authApi } from '@/api/auth'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'

export function ResetPasswordPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const token = searchParams.get('token') ?? ''

  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="w-full max-w-sm bg-white rounded-2xl shadow-sm border border-gray-200 p-8 text-center space-y-4">
          <span className="material-icons text-4xl text-red-500">link_off</span>
          <h2 className="text-lg font-semibold text-gray-800">Enlace inválido</h2>
          <p className="text-sm text-gray-500">El enlace de recuperación no es válido o ya fue utilizado.</p>
          <Link to="/login" className="inline-flex items-center gap-1 text-sm text-blue-600 hover:underline">
            <span className="material-icons text-base">arrow_back</span>
            Volver al inicio de sesión
          </Link>
        </div>
      </div>
    )
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')

    if (password !== confirm) {
      setError('Las contraseñas no coinciden')
      return
    }

    setLoading(true)
    try {
      await authApi.resetPassword(token, password)
      navigate('/login?reset=ok', { replace: true })
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al restablecer la contraseña')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 rounded-xl bg-blue-600 flex items-center justify-center mb-3">
            <span className="material-icons text-white text-2xl">inventory</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Kardex</h1>
          <p className="text-sm text-gray-500 mt-1">Gestión de Inventario</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
          <h2 className="text-lg font-semibold text-gray-800 mb-2">Nueva contraseña</h2>
          <p className="text-sm text-gray-500 mb-6">
            Ingresa tu nueva contraseña. Debe tener al menos 8 caracteres.
          </p>

          {error && (
            <div className="mb-4 flex items-center gap-2 bg-red-50 text-red-700 text-sm px-4 py-3 rounded-lg">
              <span className="material-icons text-base">error_outline</span>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Nueva contraseña"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Mínimo 8 caracteres"
              required
              minLength={8}
            />
            <Input
              label="Confirmar contraseña"
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="Repite la contraseña"
              required
            />
            <Button type="submit" className="w-full" loading={loading}>
              Guardar nueva contraseña
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}
