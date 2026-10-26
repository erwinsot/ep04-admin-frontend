import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { BrandLogo } from '@/components/brand-logo'
import { useAuth } from '@/features/auth/auth-context'

export function AuthCallbackPage() {
  const { completeLogin } = useAuth()
  const started = useRef(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // El code de Cognito es de un solo uso: evita el doble efecto de StrictMode.
    if (started.current) return
    started.current = true
    completeLogin(window.location.search).catch((cause) => {
      setError(cause instanceof Error ? cause.message : 'No fue posible completar el inicio de sesión.')
    })
  }, [completeLogin])

  return (
    <div className="auth-page auth-page-single">
      <main className="auth-panel">
        <div className="auth-card auth-status" role="status" aria-live="polite">
          <BrandLogo size={64} className="auth-card-logo" />
          {error ? (
            <>
              <header>
                <h2>No pudimos iniciar tu sesión</h2>
                <p>{error}</p>
              </header>
              <Link to="/login" replace className="auth-submit">
                Volver a iniciar sesión
              </Link>
            </>
          ) : (
            <>
              <span className="auth-spinner auth-spinner-dark" aria-hidden />
              <header>
                <h2>Verificando tu sesión</h2>
                <p>Un momento, estamos completando tu acceso seguro.</p>
              </header>
            </>
          )}
        </div>
      </main>
    </div>
  )
}
