import { Link, useSearchParams } from 'react-router-dom'
import { useMemo, useState } from 'react'
import { ACTIVE_OPERATION_STATUSES } from '@/constants/catalogs'
import { useOperations } from '@/features/tenants/hooks'
import { ApiError } from '@/lib/api'
import { friendlyError } from '@/lib/error-messages'
import { clamp, cn, formatDate } from '@/lib/utils'
import { OperationStatusBadge } from '@/components/operation-status-badge'
import { EmptyState } from '@/components/empty-state'
import { SkeletonTableRows } from '@/components/skeleton-table-rows'
import type { OperationStatus, OperationType } from '@/types/ep04'

const DEFAULT_SIZE = 20

type ViewMode = 'table' | 'cards'

const VIEW_STORAGE_KEY = 'ep04.operations.view-mode'

const STATUS_FILTER_OPTIONS: Array<{ label: string; value: OperationStatus | '' }> = [
  { label: 'Todos', value: '' },
  { label: 'Success', value: 'SUCCESS' },
  { label: 'Failed', value: 'FAILED' },
]

const TYPE_FILTER_OPTIONS: Array<{ label: string; value: OperationType | '' }> = [
  { label: 'Todos', value: '' },
  { label: 'Create', value: 'CREATE' },
  { label: 'Retry', value: 'RETRY' },
  { label: 'Delete', value: 'DELETE' },
]

function readStoredView(): ViewMode | null {
  if (typeof window === 'undefined') return null
  const value = window.localStorage.getItem(VIEW_STORAGE_KEY)
  if (value === 'table' || value === 'cards') return value
  return null
}

function formatRelativeDate(isoDate: string) {
  const date = new Date(isoDate)
  if (Number.isNaN(date.getTime())) return formatDate(isoDate)

  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const yesterday = new Date(today)
  yesterday.setDate(today.getDate() - 1)
  const inputDay = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  const timePart = date.toLocaleTimeString('es-CO', { hour: 'numeric', minute: '2-digit' })

  if (inputDay.getTime() === today.getTime()) return `Hoy, ${timePart}`
  if (inputDay.getTime() === yesterday.getTime()) return `Ayer, ${timePart}`

  return formatDate(isoDate)
}

function formatDuration(startIso: string, endIso: string | null) {
  const start = new Date(startIso)
  const end = endIso ? new Date(endIso) : new Date()
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return 'n/a'

  const diffMs = Math.max(0, end.getTime() - start.getTime())
  const totalMinutes = Math.floor(diffMs / 60000)

  if (totalMinutes < 1) return '< 1 min'
  if (totalMinutes < 60) return `${totalMinutes} min`

  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  return minutes === 0 ? `${hours} h` : `${hours} h ${minutes} min`
}

function compactOperationId(operationId: string) {
  if (operationId.length <= 18) return operationId
  return `${operationId.slice(0, 8)}…${operationId.slice(-6)}`
}

function formatPullRequestState(state: string) {
  if (!state) return 'n/a'
  const words = state.toLowerCase().split('_')
  return words.map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')
}

export function OperationsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [copiedOperationId, setCopiedOperationId] = useState<string | null>(null)

  const page = clamp(Number(searchParams.get('page') ?? '0') || 0, 0, Number.MAX_SAFE_INTEGER)
  const size = clamp(Number(searchParams.get('size') ?? String(DEFAULT_SIZE)) || DEFAULT_SIZE, 1, 200)
  const tenantId = searchParams.get('tenantId') ?? ''
  const status = (searchParams.get('status') as OperationStatus | '') ?? ''
  const type = (searchParams.get('type') as OperationType | '') ?? ''
  const viewParam = searchParams.get('view')
  const view = (viewParam === 'table' || viewParam === 'cards' ? viewParam : readStoredView()) ?? 'table'

  const query = useOperations({ page, size, status, type, tenantId: tenantId || undefined })

  const totalPages = useMemo(() => {
    if (!query.data) return 1
    return Math.max(1, Math.ceil(query.data.total / query.data.size))
  }, [query.data])

  const summary = useMemo(() => {
    const items = query.data?.items ?? []
    const activeCount = items.filter((item) => ACTIVE_OPERATION_STATUSES.includes(item.status)).length
    const failedCount = items.filter((item) => item.status === 'FAILED').length
    const successCount = items.filter((item) => item.status === 'SUCCESS').length

    return {
      total: query.data?.total ?? 0,
      shown: items.length,
      activeCount,
      failedCount,
      successCount,
    }
  }, [query.data])

  const updateFilters = (next: Record<string, string>) => {
    const params = new URLSearchParams(searchParams)
    Object.entries(next).forEach(([key, value]) => {
      if (!value) {
        params.delete(key)
      } else {
        params.set(key, value)
      }
    })
    if (next.tenantId !== undefined || next.status !== undefined || next.type !== undefined || next.size !== undefined) {
      params.set('page', '0')
    }
    setSearchParams(params)
  }

  const movePage = (nextPage: number) => {
    const params = new URLSearchParams(searchParams)
    params.set('page', String(clamp(nextPage, 0, totalPages - 1)))
    setSearchParams(params)
  }

  const setViewMode = (nextView: ViewMode) => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(VIEW_STORAGE_KEY, nextView)
    }
    const params = new URLSearchParams(searchParams)
    params.set('view', nextView)
    setSearchParams(params)
  }

  const copyOperationId = async (operationId: string) => {
    if (typeof navigator === 'undefined' || !navigator.clipboard) return
    try {
      await navigator.clipboard.writeText(operationId)
      setCopiedOperationId(operationId)
      window.setTimeout(() => setCopiedOperationId((current) => (current === operationId ? null : current)), 1500)
    } catch {
      setCopiedOperationId(null)
    }
  }

  const error = query.error as ApiError | null

  return (
    <section className="stack-lg">
      <div className="page-head">
        <div>
          <h1>Operaciones</h1>
          <p>Seguimiento global de CREATE, RETRY y DELETE con su estado asíncrono.</p>
        </div>
        <div className="actions-inline">
          <button className="btn secondary" onClick={() => query.refetch()} type="button">
            Refrescar
          </button>
        </div>
      </div>

      <div className="summary-grid operations-summary">
        <article className="summary-card">
          <span>Total</span>
          <strong>{summary.total}</strong>
        </article>
        <article className="summary-card">
          <span>Activas</span>
          <strong>{summary.activeCount}</strong>
        </article>
        <article className="summary-card">
          <span>Exitosas</span>
          <strong>{summary.successCount}</strong>
        </article>
        <article className="summary-card">
          <span>Fallidas</span>
          <strong>{summary.failedCount}</strong>
        </article>
      </div>

      <div className="operations-toolbar">
        <label className="operations-search" aria-label="Buscar por tenant">
          <span className="operations-search-label">Buscar por tenant</span>
          <span className="operations-search-icon" aria-hidden="true">
            ⌕
          </span>
          <input
            value={tenantId}
            onChange={(event) => updateFilters({ tenantId: event.target.value.trim() })}
            placeholder="Tenant ID, ej. acme-co"
          />
        </label>

        <div className="operations-pill-group">
          <span className="operations-group-label">Estado</span>
          {STATUS_FILTER_OPTIONS.map((option) => (
            <button
              key={option.label}
              type="button"
              className={cn('status-pill', status === option.value && 'active')}
              onClick={() => updateFilters({ status: option.value })}
            >
              {option.label}
            </button>
          ))}
        </div>

        <div className="operations-pill-group">
          <span className="operations-group-label">Tipo</span>
          {TYPE_FILTER_OPTIONS.map((option) => (
            <button
              key={option.label}
              type="button"
              className={cn('status-pill', type === option.value && 'active')}
              onClick={() => updateFilters({ type: option.value })}
            >
              {option.label}
            </button>
          ))}
        </div>

        <div className="view-switch" role="group" aria-label="Modo de visualizacion">
          <button
            type="button"
            className={cn('view-btn', view === 'table' && 'active')}
            onClick={() => setViewMode('table')}
          >
            Tabla
          </button>
          <button
            type="button"
            className={cn('view-btn', view === 'cards' && 'active')}
            onClick={() => setViewMode('cards')}
          >
            Tarjetas
          </button>
        </div>
      </div>

      {error && <div className="error-box">{friendlyError(error.code, error.message)}</div>}

      {view === 'table' && (
        <div className="panel table-wrap operations-table-wrap">
          <table className="operations-table">
            <thead>
              <tr>
                <th>Estado</th>
                <th>Tipo</th>
                <th>Tenant</th>
                <th>Operación</th>
                <th>Origen</th>
                <th>Inicio</th>
                <th>Duración</th>
                <th>Pull request</th>
              </tr>
            </thead>
            <tbody>
              {query.isLoading && <SkeletonTableRows columns={8} />}
              {!query.isLoading && query.data?.items.length === 0 && (
                <tr>
                  <td colSpan={8}>
                    <EmptyState
                      title="Sin operaciones para mostrar"
                      description="No hay operaciones para los filtros actuales. Ajusta tenant, estado o tipo para continuar."
                      action={
                        <button
                          className="btn secondary"
                          type="button"
                          onClick={() => updateFilters({ tenantId: '', status: '', type: '' })}
                        >
                          Limpiar filtros
                        </button>
                      }
                    />
                  </td>
                </tr>
              )}
              {query.data?.items.map((item) => (
                <tr key={item.operationId}>
                  <td>
                    <OperationStatusBadge status={item.status} />
                  </td>
                  <td>
                    <div className="operation-type-cell">
                      <strong>{item.operationType}</strong>
                      <small>intento {item.attemptNumber}</small>
                    </div>
                  </td>
                  <td>
                    <Link to={`/tenants/${item.tenantId}?operationId=${item.operationId}`} className="tenant-link">
                      {item.tenantId}
                    </Link>
                  </td>
                  <td>
                    <div className="operation-id-cell">
                      <span title={item.operationId}>{compactOperationId(item.operationId)}</span>
                      <button type="button" className="copy-id-btn" onClick={() => copyOperationId(item.operationId)}>
                        {copiedOperationId === item.operationId ? 'Copiado' : 'Copiar ID'}
                      </button>
                    </div>
                  </td>
                  <td>{item.requestedBy}</td>
                  <td>{formatRelativeDate(item.startedAt)}</td>
                  <td>{formatDuration(item.startedAt, item.endedAt)}</td>
                  <td>
                    {item.pullRequest?.url ? (
                      <a href={item.pullRequest.url} target="_blank" rel="noreferrer">
                        #{item.pullRequest.numero} · {formatPullRequestState(item.pullRequest.estado)}
                      </a>
                    ) : (
                      '—'
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {view === 'cards' && (
        <div className="cards-grid">
          {query.isLoading &&
            Array.from({ length: 6 }).map((_, index) => (
              <article key={`operation-card-skeleton-${index}`} className="panel entity-card">
                <div className="skeleton-line skeleton-line-2" />
                <div className="skeleton-line skeleton-line-1" />
                <div className="skeleton-line skeleton-line-0" />
              </article>
            ))}

          {!query.isLoading && query.data?.items.length === 0 && (
            <div className="panel">
              <EmptyState
                title="Sin operaciones para mostrar"
                description="No hay operaciones para los filtros actuales. Ajusta tenant, estado o tipo para continuar."
              />
            </div>
          )}

          {query.data?.items.map((item) => (
            <article key={item.operationId} className="panel entity-card operation-card">
              <div className="entity-card-head">
                <div>
                  <p className="entity-meta">Operación</p>
                  <p className="entity-card-title word-break">{item.operationId}</p>
                </div>
                <OperationStatusBadge status={item.status} />
              </div>

              <div className="operation-meta-strip" aria-label="Resumen de operacion">
                <span className="operation-meta-chip">{item.operationType}</span>
                <span className="operation-meta-chip">Intento {item.attemptNumber}</span>
                <span className="operation-meta-chip muted">{item.requestedBy}</span>
              </div>

              <dl className="entity-kv">
                <div className="entity-kv-row">
                  <dt>Tenant</dt>
                  <dd>
                    <Link to={`/tenants/${item.tenantId}?operationId=${item.operationId}`} className="tenant-link">
                      {item.tenantId}
                    </Link>
                  </dd>
                </div>

                <div className="entity-kv-row">
                  <dt>Inicio</dt>
                  <dd className="operation-time">{formatRelativeDate(item.startedAt)}</dd>
                </div>

                <div className="entity-kv-row">
                  <dt>Duración</dt>
                  <dd className="operation-time">{formatDuration(item.startedAt, item.endedAt)}</dd>
                </div>

                <div className="entity-kv-row">
                  <dt>PR</dt>
                  <dd className="operation-pr">
                    {item.pullRequest?.url ? (
                      <a href={item.pullRequest.url} target="_blank" rel="noreferrer">
                        #{item.pullRequest.numero} · {formatPullRequestState(item.pullRequest.estado)}
                      </a>
                    ) : (
                      '—'
                    )}
                  </dd>
                </div>
              </dl>
            </article>
          ))}
        </div>
      )}

      <div className="pager">
        <button className="btn secondary" type="button" onClick={() => movePage(page - 1)} disabled={page <= 0}>
          Anterior
        </button>
        <span>
          Página {page + 1} de {totalPages}
        </span>
        <button
          className="btn secondary"
          type="button"
          onClick={() => movePage(page + 1)}
          disabled={page + 1 >= totalPages}
        >
          Siguiente
        </button>
      </div>

      <p className="tenants-footnote">Mostrando {summary.shown} de {summary.total} operaciones · más recientes primero</p>
    </section>
  )
}
