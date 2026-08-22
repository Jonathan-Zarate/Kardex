import { Outlet, useLocation } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { Header } from './Header'

const TITLES: Record<string, string> = {
  '/': 'Dashboard',
  '/products': 'Productos',
  '/categories': 'Categorías',
  '/suppliers': 'Proveedores',
  '/warehouses': 'Almacenes',
  '/stock': 'Stock',
  '/movements': 'Movimientos',
  '/movements/new': 'Nuevo Movimiento',
  '/kardex': 'Kardex',
  '/users': 'Usuarios',
  '/settings': 'Configuración de Empresa',
  '/profile': 'Mi Perfil',
  '/reports': 'Reportes',
  '/audit': 'Auditoría',
}

export function AppShell() {
  const { pathname } = useLocation()
  const title = TITLES[pathname] ?? 'Kardex'

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <Sidebar />
      <div className="flex flex-col flex-1 overflow-hidden">
        <Header title={title} />
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
