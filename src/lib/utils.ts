const LOCALE = 'es-CO'

export function formatDate(dateIso: string | null | undefined): string {
  if (!dateIso) return 'n/a'
  const value = new Date(dateIso)
  if (Number.isNaN(value.getTime())) return dateIso
  return `${formatDatePart(value)}, ${formatTimePart(value)}`
}

function formatDatePart(value: Date) {
  return value.toLocaleDateString(LOCALE, { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function formatTimePart(value: Date) {
  return value.toLocaleTimeString(LOCALE, { hour: 'numeric', minute: '2-digit' })
}

export function splitDateTime(dateIso: string | null | undefined): [string, string] | null {
  if (!dateIso) return null
  const value = new Date(dateIso)
  if (Number.isNaN(value.getTime())) return null
  return [formatDatePart(value), formatTimePart(value)]
}

export function formatRelativeDate(dateIso: string | null | undefined): string {
  if (!dateIso) return 'n/a'
  const value = new Date(dateIso)
  if (Number.isNaN(value.getTime())) return dateIso

  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const yesterday = new Date(today)
  yesterday.setDate(today.getDate() - 1)
  const day = new Date(value.getFullYear(), value.getMonth(), value.getDate())

  if (day.getTime() === today.getTime()) return `Hoy, ${formatTimePart(value)}`
  if (day.getTime() === yesterday.getTime()) return `Ayer, ${formatTimePart(value)}`
  return formatDate(dateIso)
}

export function formatDuration(startIso: string, endIso: string | null): string {
  if (!endIso) return 'En curso'
  const start = new Date(startIso).getTime()
  const end = new Date(endIso).getTime()
  if (Number.isNaN(start) || Number.isNaN(end)) return 'n/a'

  const minutes = Math.floor(Math.max(0, end - start) / 60000)
  if (minutes < 1) return '< 1 min'
  if (minutes < 60) return `${minutes} min`
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  return rest === 0 ? `${hours} h` : `${hours} h ${rest} min`
}

export function shortId(id: string, head = 8, tail = 6): string {
  return id.length <= head + tail + 1 ? id : `${id.slice(0, head)}…${id.slice(-tail)}`
}

const ERP_LABELS: Record<string, string> = {
  SAP_BUSINESS_ONE: 'SAP Business One',
  ODOO: 'Odoo',
  DYNAMICS_365: 'Dynamics 365',
  NETSUITE: 'NetSuite',
  SIIGO: 'Siigo',
  WORD_OFFICE: 'Word Office',
}

export function erpLabel(erpType: string): string {
  if (ERP_LABELS[erpType]) return ERP_LABELS[erpType]
  return erpType
    .toLowerCase()
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

const EVENT_LABELS: Record<string, string> = {
  CREATE_REQUESTED: 'Creación solicitada',
  RETRY_REQUESTED: 'Reintento solicitado',
  DELETE_REQUESTED: 'Baja solicitada',
  PULL_REQUEST_OPENED: 'Pull request abierto',
  PULL_REQUEST_MERGED: 'Pull request fusionado',
  PULL_REQUEST_CLOSED: 'Pull request cerrado sin fusionar',
  DELETE_PULL_REQUEST_OPENED: 'PR de baja abierto',
  DELETE_PULL_REQUEST_MERGED: 'PR de baja fusionado',
  DELETE_PULL_REQUEST_CLOSED: 'PR de baja cerrado sin fusionar',
  PROVISIONING_FAILED: 'Falló el aprovisionamiento',
  ARGO_HEALTH_CHECK: 'Verificación de Argo CD',
  STORAGE_READY: 'Almacenamiento listo',
  STORAGE_REVOKE_FAILED: 'Falló la revocación del almacenamiento',
  INGESTION_TRIGGERED: 'Ingesta manual lanzada',
}

// Las acciones desconocidas se muestran tal cual las envia el backend.
export function eventLabel(action: string): string {
  return EVENT_LABELS[action] ?? action
}

export function formatSeconds(seconds: number | null | undefined): string {
  if (seconds === null || seconds === undefined) return 'n/a'
  if (seconds < 60) return `${seconds} s`
  const minutes = Math.floor(seconds / 60)
  const rest = seconds % 60
  return rest === 0 ? `${minutes} min` : `${minutes} min ${rest} s`
}

export async function copyText(value: string): Promise<boolean> {
  if (typeof navigator === 'undefined' || !navigator.clipboard) return false
  try {
    await navigator.clipboard.writeText(value)
    return true
  } catch {
    return false
  }
}

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

export function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ')
}
