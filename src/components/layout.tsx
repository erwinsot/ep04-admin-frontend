import { Link, NavLink } from 'react-router-dom'
import { useAuth } from '@/features/auth/auth-context'
import { useHealth } from '@/features/tenants/hooks'

export function Layout({ children }: { children: React.ReactNode }) {
  const { data, isError } = useHealth()
  const { session, logout } = useAuth()
  const healthClass = isError
    ? 'health-pill health-down'
    : data?.status === 'UP'
      ? 'health-pill health-up'
      : 'health-pill health-checking'

  return (
    <div className="shell">
      <header className="topbar">
        <Link to="/" className="brand">
          <span className="brand-mark">EP4</span>
          <span>Admin Control Plane</span>
        </Link>
        <nav className="nav" aria-label="Principal">
          <NavLink to="/" end>
            Tenants
          </NavLink>
          <NavLink to="/tenants/new">Crear tenant</NavLink>
          <NavLink to="/operations">Operaciones</NavLink>
          <span className={healthClass}>
            <span className="dot" />
            {isError ? 'DOWN' : (data?.status ?? 'CHECKING')}
          </span>
        </nav>
        <div className="user-chip">
          <span className="user-avatar" aria-hidden>
            {(session?.displayName ?? '?').charAt(0).toUpperCase()}
          </span>
          <span className="user-name">{session?.displayName}</span>
          <button type="button" className="user-logout" onClick={logout}>
            Salir
          </button>
        </div>
      </header>
      <main className="content">{children}</main>
    </div>
  )
}
