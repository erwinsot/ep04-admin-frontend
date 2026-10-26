export type Session = {
  username: string
  displayName: string
  token?: string
  expiresAt?: number
}

export const UNAUTHORIZED_EVENT = 'ep04:unauthorized'

const STORAGE_KEY = 'ep04.session'
const RETURN_TO_KEY = 'ep04.auth.returnTo'

export class AuthError extends Error {}

export function safeReturnTo(value: string | null | undefined): string {
  return value && value.startsWith('/') && !value.startsWith('//') ? value : '/'
}

export function saveReturnTo(value: string) {
  window.sessionStorage.setItem(RETURN_TO_KEY, safeReturnTo(value))
}

export function peekReturnTo(): string {
  return safeReturnTo(window.sessionStorage.getItem(RETURN_TO_KEY))
}

export function loadSession(): Session | null {
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Session
    if (typeof parsed?.username !== 'string') return null
    if (parsed.expiresAt && parsed.expiresAt <= Date.now()) {
      window.sessionStorage.removeItem(STORAGE_KEY)
      return null
    }
    return parsed
  } catch {
    return null
  }
}

export function saveSession(session: Session) {
  window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(session))
}

export function clearSession() {
  window.sessionStorage.removeItem(STORAGE_KEY)
}
