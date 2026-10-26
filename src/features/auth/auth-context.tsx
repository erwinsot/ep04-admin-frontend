import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import {
  UNAUTHORIZED_EVENT,
  clearSession,
  loadSession,
  saveReturnTo,
  saveSession,
  type Session,
} from '@/lib/auth'
import { beginLogin, buildLogoutUrl, exchangeCode } from '@/lib/cognito'
import { cognitoConfigured, env, localLoginEnabled } from '@/lib/config'

type AuthValue = {
  session: Session | null
  login: (returnTo: string) => Promise<void>
  completeLogin: (search: string) => Promise<void>
  devLogin: () => void
  logout: () => void
}

const AuthContext = createContext<AuthValue | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient()
  const [session, setSession] = useState<Session | null>(() => loadSession())

  const login = useCallback((returnTo: string) => beginLogin(returnTo), [])

  const completeLogin = useCallback(async (search: string) => {
    const { session: next } = await exchangeCode(search)
    saveSession(next)
    setSession(next)
  }, [])

  const devLogin = useCallback(() => {
    // Atajo sin Cognito: solo activo en dev o con LOCAL_LOGIN=true.
    if (!localLoginEnabled) return
    const username = env.actor ?? 'dev-admin'
    const next: Session = { username, displayName: username }
    saveSession(next)
    saveReturnTo('/')
    setSession(next)
  }, [])

  const expire = useCallback(() => {
    clearSession()
    queryClient.clear()
    setSession(null)
  }, [queryClient])

  const logout = useCallback(() => {
    expire()
    if (cognitoConfigured) {
      window.location.assign(buildLogoutUrl())
    }
  }, [expire])

  useEffect(() => {
    window.addEventListener(UNAUTHORIZED_EVENT, expire)
    return () => window.removeEventListener(UNAUTHORIZED_EVENT, expire)
  }, [expire])

  useEffect(() => {
    if (!session?.expiresAt) return
    const timer = window.setTimeout(expire, Math.max(session.expiresAt - Date.now(), 0))
    return () => window.clearTimeout(timer)
  }, [session, expire])

  const value = useMemo(
    () => ({ session, login, completeLogin, devLogin, logout }),
    [session, login, completeLogin, devLogin, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth debe usarse dentro de AuthProvider')
  return context
}
