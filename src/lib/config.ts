function normalizeApiBase(input: string | undefined): string {
  if (!input) return ''
  if (input === '/') return ''
  return input.endsWith('/') ? input.slice(0, -1) : input
}

// /config.js lo genera nginx en runtime desde el ConfigMap; en dev se usan las VITE_*.
const runtime = window.__EP04_CONFIG__ ?? {}

function pick(runtimeValue: string | undefined, buildValue: string | undefined): string {
  return (runtimeValue || buildValue || '').trim()
}

const apiBase = normalizeApiBase(import.meta.env.VITE_API_BASE)
const cognitoDomain = pick(runtime.cognitoDomain, import.meta.env.VITE_COGNITO_DOMAIN)
  .replace(/^https?:\/\//, '')
  .replace(/\/$/, '')
const cognitoClientId = pick(runtime.cognitoClientId, import.meta.env.VITE_COGNITO_CLIENT_ID)

export const env = {
  apiBase,
  adminRole: import.meta.env.VITE_ADMIN_ROLE ?? 'admin',
  actor: import.meta.env.VITE_ACTOR,
  cognito: {
    domain: cognitoDomain,
    clientId: cognitoClientId,
    redirectUri:
      pick(runtime.cognitoRedirectUri, import.meta.env.VITE_COGNITO_REDIRECT_URI) ||
      `${window.location.origin}/auth/callback`,
    logoutUri:
      pick(runtime.cognitoLogoutUri, import.meta.env.VITE_COGNITO_LOGOUT_URI) ||
      `${window.location.origin}/login`,
    scopes: pick(runtime.cognitoScopes, import.meta.env.VITE_COGNITO_SCOPES) || 'openid email profile',
  },
}

export const cognitoConfigured = Boolean(cognitoDomain && cognitoClientId)

// Acceso sin Cognito: solo en `vite dev` o si se activa a proposito con LOCAL_LOGIN=true (pruebas en minikube).
export const localLoginEnabled =
  !cognitoConfigured &&
  (import.meta.env.DEV || pick(runtime.localLogin, import.meta.env.VITE_LOCAL_LOGIN) === 'true')
