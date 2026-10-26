import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { BrandLogo } from '@/components/brand-logo'
import { useAuth } from '@/features/auth/auth-context'
import { cognitoConfigured, localLoginEnabled } from '@/lib/config'

const HIGHLIGHTS = [
  { title: 'Aprovisionamiento seguro', text: 'Crea y da de baja tenants con trazabilidad completa de cada operación.' },
  { title: 'Estado en tiempo real', text: 'Sigue pipelines, Pull Requests y Argo CD desde un único panel.' },
  { title: 'Control operativo', text: 'Reintentos, historial y eventos listos para auditoría.' },
]

export function LoginPage() {
  const { login, devLogin } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as { from?: { pathname: string; search?: string } } | null)?.from
  const returnTo = from ? `${from.pathname}${from.search ?? ''}` : '/'
  const devMode = localLoginEnabled

  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const start = async () => {
    setError(null)
    setPending(true)
    try {
      await login(returnTo)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No fue posible iniciar sesión.')
      setPending(false)
    }
  }

  const startDev = () => {
    devLogin()
    navigate(returnTo, { replace: true })
  }

  return (
    <div className="auth-page">
      <aside className="auth-hero">
        <span className="auth-orb auth-orb-a" />
        <span className="auth-orb auth-orb-b" />
        <div className="auth-hero-inner">
          <div className="auth-hero-brand">
            <BrandLogo size={52} />
            <div>
              <strong>eDecision</strong>
              <span>Admin Control Plane</span>
            </div>
          </div>

          <div className="auth-hero-copy">
            <p className="auth-eyebrow">Plataforma EP04</p>
            <h1>Gobierna tus tenants con precisión y confianza.</h1>
            <p>Un solo punto de control para aprovisionar, monitorear y operar cada entorno de tus clientes.</p>
          </div>

          <ul className="auth-highlights">
            {HIGHLIGHTS.map((item) => (
              <li key={item.title}>
                <span className="auth-check" aria-hidden>
                  <svg viewBox="0 0 20 20" width="14" height="14" fill="none">
                    <path d="M4.5 10.5l3.5 3.5 7.5-8" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
                <div>
                  <strong>{item.title}</strong>
                  <span>{item.text}</span>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </aside>

      <main className="auth-panel">
        <div className="auth-card">
          <BrandLogo size={64} className="auth-card-logo" />
          <header>
            <h2>Bienvenido de nuevo</h2>
            <p>Accede con tu cuenta corporativa para entrar al panel de administración.</p>
          </header>

          {!cognitoConfigured && !devMode && (
            <div className="auth-error" role="alert">
              El inicio de sesión no está configurado. Contacta al administrador de la plataforma.
            </div>
          )}

          {error && (
            <div className="auth-error" role="alert">
              {error}
            </div>
          )}

          <button className="auth-submit" type="button" onClick={start} disabled={pending || !cognitoConfigured}>
            {pending ? (
              <span className="auth-spinner" aria-hidden />
            ) : (
              <svg viewBox="0 0 20 20" width="16" height="16" fill="none" aria-hidden>
                <rect x="4" y="9" width="12" height="8" rx="2" stroke="currentColor" strokeWidth="1.8" />
                <path d="M7 9V6.5a3 3 0 016 0V9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
            )}
            {pending ? 'Redirigiendo...' : 'Iniciar sesión'}
          </button>

          {devMode && (
            <button className="auth-secondary" type="button" onClick={startDev}>
              Entrar en modo local (sin Cognito)
            </button>
          )}

          <footer>
            <span>Acceso seguro gestionado por Amazon Cognito. Solo personal autorizado.</span>
          </footer>
        </div>
        <p className="auth-copy">© {new Date().getFullYear()} eDecision. Todos los derechos reservados.</p>
      </main>
    </div>
  )
}
