import { cognitoConfigured, env } from '@/lib/config'
import { AuthError, safeReturnTo, saveReturnTo, type Session } from '@/lib/auth'

const PKCE_KEY = 'ep04.auth.pkce'

type PkceRecord = { state: string; verifier: string; returnTo: string }

type TokenResponse = {
  access_token: string
  id_token?: string
  expires_in: number
}

function base64Url(bytes: Uint8Array): string {
  let binary = ''
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte)
  })
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function randomString(byteLength: number): string {
  const bytes = new Uint8Array(byteLength)
  crypto.getRandomValues(bytes)
  return base64Url(bytes)
}

async function challengeFor(verifier: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier))
  return base64Url(new Uint8Array(digest))
}

// Solo para mostrar el nombre: la autorizacion real la valida el backend con la firma del JWT.
function decodeClaims(jwt: string | undefined): Record<string, unknown> {
  if (!jwt) return {}
  try {
    const payload = jwt.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')
    const bytes = Uint8Array.from(atob(payload), (char) => char.charCodeAt(0))
    return JSON.parse(new TextDecoder().decode(bytes)) as Record<string, unknown>
  } catch {
    return {}
  }
}

function claim(claims: Record<string, unknown>, key: string): string | undefined {
  const value = claims[key]
  return typeof value === 'string' && value ? value : undefined
}

export async function beginLogin(returnTo: string): Promise<void> {
  if (!cognitoConfigured) {
    throw new AuthError('El inicio de sesión no está configurado.')
  }
  if (!window.crypto?.subtle) {
    throw new AuthError('El navegador requiere una conexión segura (HTTPS) para iniciar sesión.')
  }

  const state = randomString(16)
  const verifier = randomString(32)
  const record: PkceRecord = { state, verifier, returnTo: safeReturnTo(returnTo) }
  window.sessionStorage.setItem(PKCE_KEY, JSON.stringify(record))

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: env.cognito.clientId,
    redirect_uri: env.cognito.redirectUri,
    scope: env.cognito.scopes,
    state,
    code_challenge: await challengeFor(verifier),
    code_challenge_method: 'S256',
  })

  window.location.assign(`https://${env.cognito.domain}/oauth2/authorize?${params.toString()}`)
}

export async function exchangeCode(search: string): Promise<{ session: Session; returnTo: string }> {
  const params = new URLSearchParams(search)

  if (params.get('error')) {
    throw new AuthError(params.get('error_description') ?? 'Cognito rechazó el inicio de sesión.')
  }

  const raw = window.sessionStorage.getItem(PKCE_KEY)
  window.sessionStorage.removeItem(PKCE_KEY)
  const code = params.get('code')
  const record = raw ? (JSON.parse(raw) as PkceRecord) : null

  if (!code || !record || record.state !== params.get('state')) {
    throw new AuthError('La sesión de inicio expiró o no es válida. Inténtalo de nuevo.')
  }

  let response: Response
  try {
    response = await fetch(`https://${env.cognito.domain}/oauth2/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: env.cognito.clientId,
        code,
        redirect_uri: env.cognito.redirectUri,
        code_verifier: record.verifier,
      }),
    })
  } catch {
    throw new AuthError('No se pudo conectar con el servicio de autenticación.')
  }

  if (!response.ok) {
    throw new AuthError('No se pudo completar el inicio de sesión. Inténtalo de nuevo.')
  }

  const tokens = (await response.json()) as TokenResponse
  const claims = decodeClaims(tokens.id_token)
  const username = claim(claims, 'email') ?? claim(claims, 'cognito:username') ?? 'usuario'

  saveReturnTo(record.returnTo)

  return {
    returnTo: record.returnTo,
    session: {
      username,
      displayName: claim(claims, 'name') ?? username,
      token: tokens.access_token,
      expiresAt: Date.now() + tokens.expires_in * 1000,
    },
  }
}

export function buildLogoutUrl(): string {
  const params = new URLSearchParams({
    client_id: env.cognito.clientId,
    logout_uri: env.cognito.logoutUri,
  })
  return `https://${env.cognito.domain}/logout?${params.toString()}`
}
