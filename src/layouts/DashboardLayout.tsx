import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { logout, getStoredUser } from '../lib/auth'
import { ROLE_LABELS } from '../lib/format'

const navItems = [
  { to: '/', label: 'Tableau de bord', exact: true },
  { to: '/clients', label: 'Clients' },
  { to: '/caisse', label: 'Caisse' },
  { to: '/stickers', label: 'Carnets / Stickers' },
  { to: '/users', label: 'Utilisateurs' },
  { to: '/devices', label: 'Appareils' },
  { to: '/zones', label: 'Zones' },
  { to: '/settings', label: 'Paramètres' },
  { to: '/audit-log', label: 'Journal d\'audit' },
]

export function DashboardLayout() {
  const navigate = useNavigate()
  const user = getStoredUser()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <div className="flex h-screen bg-gray-100">
      <aside className="w-64 bg-white shadow-md flex flex-col">
        <div className="p-4 border-b">
          <h1 className="text-xl font-bold text-blue-700">Tontine Prospera</h1>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.exact}
              className={({ isActive }) =>
                `block px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  isActive ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:bg-gray-100'
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="p-4 border-t space-y-3">
          {user && (
            <div className="px-3 py-2 bg-gray-50 rounded-md">
              <p className="text-sm font-medium text-gray-900 truncate">
                {user.first_name ? `${user.first_name} ${user.last_name}` : 'Administrateur'}
              </p>
              <p className="text-xs text-gray-500">{ROLE_LABELS[user.role] ?? user.role}</p>
            </div>
          )}
          <button
            onClick={handleLogout}
            className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-md"
          >
            Déconnexion
          </button>
        </div>
      </aside>
      <main className="flex-1 overflow-auto p-6">
        <Outlet />
      </main>
    </div>
  )
}
