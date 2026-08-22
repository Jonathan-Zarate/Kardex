import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { useAuthStore } from '@/store/auth'
import { authApi } from '@/api/auth'

interface Props { title: string }

export function Header({ title }: Props) {
  const { user, refreshToken, logout } = useAuthStore()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)

  async function handleLogout() {
    if (refreshToken) {
      await authApi.logout(refreshToken).catch(() => null)
    }
    logout()
    navigate('/login', { replace: true })
  }

  const roleLabel: Record<string, string> = {
    ADMIN: 'Administrador',
    SUPERVISOR: 'Supervisor',
    WAREHOUSE: 'Almacenero',
  }

  return (
    <header className="flex items-center justify-between h-14 px-6 bg-white border-b border-gray-200 shrink-0">
      <h1 className="text-base font-semibold text-gray-800">{title}</h1>

      <div className="relative">
        <button
          onClick={() => setOpen((v) => !v)}
          className="flex items-center gap-2 hover:bg-gray-50 rounded-lg px-2 py-1.5 transition-colors"
        >
          <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm font-semibold">
            {user?.name.charAt(0).toUpperCase()}
          </div>
          <div className="text-left hidden sm:block">
            <p className="text-sm font-medium text-gray-800 leading-none">{user?.name}</p>
            <p className="text-xs text-gray-500 mt-0.5">
              {user ? roleLabel[user.role] : ''}
            </p>
          </div>
          <span className="material-icons text-gray-400 text-sm">expand_more</span>
        </button>

        {open && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
            <div className="absolute right-0 top-12 z-20 w-48 bg-white rounded-xl shadow-lg border border-gray-100 py-1">
              <button
                onClick={() => { setOpen(false); navigate('/profile') }}
                className="flex w-full items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
              >
                <span className="material-icons text-base">manage_accounts</span>
                Mi perfil
              </button>
              <div className="my-1 border-t border-gray-100" />
              <button
                onClick={() => { setOpen(false); handleLogout() }}
                className="flex w-full items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
              >
                <span className="material-icons text-base">logout</span>
                Cerrar sesión
              </button>
            </div>
          </>
        )}
      </div>
    </header>
  )
}
