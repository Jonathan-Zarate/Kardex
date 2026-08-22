import { NavLink } from 'react-router-dom'
import { useAuthStore } from '@/store/auth'

interface NavItem {
  to: string
  icon: string
  label: string
  adminOnly?: boolean
}

const NAV: { section: string; items: NavItem[] }[] = [
  {
    section: 'Principal',
    items: [
      { to: '/', icon: 'dashboard', label: 'Dashboard' },
    ],
  },
  {
    section: 'Catálogo',
    items: [
      { to: '/products', icon: 'inventory_2', label: 'Productos' },
      { to: '/categories', icon: 'category', label: 'Categorías' },
      { to: '/suppliers', icon: 'local_shipping', label: 'Proveedores' },
    ],
  },
  {
    section: 'Inventario',
    items: [
      { to: '/movements/new', icon: 'add_circle', label: 'Nuevo Movimiento' },
      { to: '/movements', icon: 'swap_vert', label: 'Movimientos' },
      { to: '/stock', icon: 'warehouse', label: 'Stock' },
      { to: '/kardex', icon: 'receipt_long', label: 'Kardex' },
      { to: '/reports', icon: 'summarize', label: 'Reportes' },
    ],
  },
  {
    section: 'Configuración',
    items: [
      { to: '/warehouses', icon: 'store', label: 'Almacenes' },
      { to: '/users', icon: 'group', label: 'Usuarios', adminOnly: true },
      { to: '/settings', icon: 'settings', label: 'Empresa', adminOnly: true },
      { to: '/audit', icon: 'policy', label: 'Auditoría', adminOnly: true },
    ],
  },
]

export function Sidebar() {
  const role = useAuthStore((s) => s.user?.role)

  return (
    <aside className="flex flex-col w-60 shrink-0 bg-gray-900 text-gray-300 h-full">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-5 py-5 border-b border-gray-700">
        <span className="material-icons text-blue-400 text-2xl">inventory</span>
        <span className="text-white font-bold text-lg tracking-tight">Kardex</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-5">
        {NAV.map(({ section, items }) => {
          const visible = items.filter(
            (i) => !i.adminOnly || role === 'ADMIN',
          )
          if (!visible.length) return null
          return (
            <div key={section}>
              <p className="px-2 mb-1 text-xs font-semibold uppercase tracking-wider text-gray-500">
                {section}
              </p>
              <ul className="space-y-0.5">
                {visible.map((item) => (
                  <li key={item.to}>
                    <NavLink
                      to={item.to}
                      end={item.to === '/' || item.to === '/movements'}
                      className={({ isActive }) =>
                        `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                          isActive
                            ? 'bg-blue-600 text-white'
                            : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                        }`
                      }
                    >
                      <span className="material-icons text-[18px] leading-none">
                        {item.icon}
                      </span>
                      {item.label}
                    </NavLink>
                  </li>
                ))}
              </ul>
            </div>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-gray-700 text-xs text-gray-500 text-center">
        v1.0 · Kardex SaaS
      </div>
    </aside>
  )
}
