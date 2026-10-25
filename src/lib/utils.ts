export function formatDate(dateIso: string | null | undefined): string {
  if (!dateIso) return 'n/a'
  const value = new Date(dateIso)
  if (Number.isNaN(value.getTime())) return dateIso
  return new Intl.DateTimeFormat('es-CO', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(value)
}

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

export function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ')
}
