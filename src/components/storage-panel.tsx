import { useEffect, useState } from 'react'
import { CopyIcon } from '@/components/icons'
import { READY_TENANT_STATUSES } from '@/constants/catalogs'
import { useTenantStorage } from '@/features/tenants/hooks'
import { ApiError } from '@/lib/api'
import { friendlyError } from '@/lib/error-messages'
import { cn, copyText } from '@/lib/utils'
import type { TenantStatus } from '@/types/ep04'

const HIDDEN_STATUSES: TenantStatus[] = ['FAILED', 'DELETING', 'DELETED']
const REVEAL_TIMEOUT_MS = 60_000
const MASK = '••••••••••••••••'

export function StoragePanel({ tenantId, status }: { tenantId: string; status: TenantStatus }) {
  const isReady = READY_TENANT_STATUSES.includes(status)
  const query = useTenantStorage(tenantId, isReady)
  const [revealed, setRevealed] = useState(false)
  const [copiedKey, setCopiedKey] = useState<string | null>(null)

  useEffect(() => {
    if (!revealed) return
    const timer = window.setTimeout(() => setRevealed(false), REVEAL_TIMEOUT_MS)
    return () => window.clearTimeout(timer)
  }, [revealed])

  const error = query.error as ApiError | null

  if (HIDDEN_STATUSES.includes(status) || error?.code === 'STORAGE_DISABLED') return null

  const handleCopy = async (key: string, value: string) => {
    if (!(await copyText(value))) return
    setCopiedKey(key)
    window.setTimeout(() => setCopiedKey((current) => (current === key ? null : current)), 1500)
  }

  const copyButton = (key: string, label: string, value: string) => (
    <button
      type="button"
      className={cn('cp cp-box', copiedKey === key && 'copied')}
      aria-label={`Copiar ${label}`}
      title={copiedKey === key ? 'Copiado' : `Copiar ${label}`}
      onClick={() => handleCopy(key, value)}
    >
      <CopyIcon size={16} />
    </button>
  )

  const storage = query.data

  return (
    <section className="panel">
      <h2>Almacenamiento</h2>

      {!isReady && <p className="panel-note note-flush">Disponible cuando el tenant esté listo.</p>}

      {isReady && query.isLoading && (
        <div className="stack-lg" style={{ gap: 12 }}>
          <div className="skeleton-line skeleton-line-2" />
          <div className="skeleton-line skeleton-line-1" />
          <div className="skeleton-line skeleton-line-0" />
        </div>
      )}

      {error && error.code === 'STORAGE_NOT_READY' && (
        <p className="panel-note note-flush">{friendlyError(error.code, error.message)}</p>
      )}

      {error && error.code !== 'STORAGE_NOT_READY' && (
        <div className="error-box">{friendlyError(error.code, error.message)}</div>
      )}

      {storage && (
        <dl>
          <div className="kv-row">
            <dt>Bucket</dt>
            <dd className="mono">{storage.bucket}</dd>
          </div>
          <div className="kv-row">
            <dt>Región</dt>
            <dd>{storage.region}</dd>
          </div>
          <div className="kv-stack">
            <dt>Prefijo</dt>
            <dd>
              <span className="mono">{storage.prefix}</span>
              {copyButton('prefix', 'prefijo', storage.prefix)}
            </dd>
          </div>
          <div className="kv-stack">
            <dt>Estructura de carga</dt>
            <dd>
              <span className="mono">{storage.uploadLayout}</span>
            </dd>
          </div>
          <div className="kv-stack">
            <dt>Access key ID</dt>
            <dd>
              <span className="mono">{storage.accessKeyId}</span>
              {copyButton('accessKeyId', 'Access key ID', storage.accessKeyId)}
            </dd>
          </div>
          <div className="kv-stack">
            <dt>Secret access key</dt>
            <dd>
              <span className="mono">{revealed ? storage.secretAccessKey : MASK}</span>
              {revealed && copyButton('secret', 'Secret access key', storage.secretAccessKey)}
            </dd>
            <button
              type="button"
              className="linkbtn secret-toggle"
              onClick={() => setRevealed((value) => !value)}
              aria-pressed={revealed}
            >
              {revealed ? 'Ocultar' : 'Revelar'}
            </button>
          </div>
        </dl>
      )}
    </section>
  )
}
