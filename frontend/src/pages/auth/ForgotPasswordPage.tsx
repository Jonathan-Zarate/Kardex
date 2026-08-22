import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { authApi } from '@/api/auth'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await authApi.forgotPassword(email)
      setSent(true)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al enviar el correo')
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
          {sent ? (
            <div className="text-center space-y-4">
              <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mx-auto">
                <span className="material-icons text-green-600 text-2xl">mark_email_read</span>
              </div>
              <h2 className="text-lg font-semibold text-gray-800">Revisa tu correo</h2>
              <p className="text-sm text-gray-500">
                Si el email está registrado, recibirás un enlace para restablecer tu contraseña.
                El enlace expira en 30 minutos.
              </p>
              <Link
                to="/login"
                className="inline-flex items-center gap-1.5 text-sm text-blue-600 hover:underline"
              >
                <span className="material-icons text-base">arrow_back</span>
                Volver al inicio de sesión
              </Link>
            </div>
          ) : (
            <>
              <h2 className="text-lg font-semibold text-gray-800 mb-2">Recuperar contraseña</h2>
              <p className="text-sm text-gray-500 mb-6">
                Ingresa tu correo y te enviaremos un enlace para restablecer tu contraseña.
              </p>

              {error && (
                <div className="mb-4 flex items-center gap-2 bg-red-50 text-red-700 text-sm px-4 py-3 rounded-lg">
                  <span className="material-icons text-base">error_outline</span>
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <Input
                  label="Correo electrónico"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@empresa.com"
                  required
                />
                <Button type="submit" className="w-full" loading={loading}>
                  Enviar enlace
                </Button>
              </form>

              <div className="mt-5 text-center">
                <Link
                  to="/login"
                  className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
                >
                  <span className="material-icons text-base">arrow_back</span>
                  Volver al inicio de sesión
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
