function normalizeApiBase(input: string | undefined): string {
  if (!input) return ''
  if (input === '/') return ''
  return input.endsWith('/') ? input.slice(0, -1) : input
}

export const env = {
  apiBase: normalizeApiBase(import.meta.env.VITE_API_BASE),
  adminRole: import.meta.env.VITE_ADMIN_ROLE ?? 'admin',
  actor: import.meta.env.VITE_ACTOR,
}
