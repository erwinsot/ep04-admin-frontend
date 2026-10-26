import { Link, useSearchParams } from 'react-router-dom'
import { useMemo, useState } from 'react'
import { useRetryTenant, useTenants } from '@/features/tenants/hooks'
import { clamp, cn, formatDate } from '@/lib/utils'
import { StatusBadge } from '@/components/status-badge'
import { ApiError } from '@/lib/api'
import { friendlyError } from '@/lib/error-messages'
import { EmptyState } from '@/components/empty-state'
import { SkeletonTableRows } from '@/components/skeleton-table-rows'
import type { TenantStatus } from '@/types/ep04'

const DEFAULT_SIZE = 20
type ViewMode = 'table' | 'cards'
const VIEW_STORAGE_KEY = 'ep04.tenants.view-mode'
const STATUS_FILTER_OPTIONS: Array<{ label: string; value: TenantStatus | '' }> = [
  { label: 'Todos', value: '' },
  { label: 'Failed', value: 'FAILED' },
  { label: 'Pending', value: 'PENDING' },
  { label: 'Provisioning', value: 'PROVISIONING' },
  { label: 'Ready', value: 'READY' },
]

function toStatusClass(status: TenantStatus) {
  return `status-${status.toLowerCase().replace(/_/g, '-')}`
}

function getProgressStep(status: TenantStatus): number | null {
  switch (status) {
    case 'PENDING':
      return 0
    case 'PROVISIONING':
      return 1
    case 'VALIDATING':
      return 2
    case 'READY':
    case 'READY_FOR_INGESTION':
      return 3
    default:
      return null
  }
}

function formatCardTime(isoDate: string) {
  const date = new Date(isoDate)
  if (Number.isNaN(date.getTime())) return 'n/a'

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

function readStoredView(): ViewMode | null {
  if (typeof window === 'undefined') return null
  const value = window.localStorage.getItem(VIEW_STORAGE_KEY)
  if (value === 'table' || value === 'cards') return value
  return null
}

export function TenantsListPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [retryingTenantId, setRetryingTenantId] = useState<string | null>(null)

  const page = clamp(Number(searchParams.get('page') ?? '0') || 0, 0, Number.MAX_SAFE_INTEGER)
  const size = clamp(Number(searchParams.get('size') ?? String(DEFAULT_SIZE)) || DEFAULT_SIZE, 1, 200)
  const q = searchParams.get('q') ?? ''
  const status = (searchParams.get('status') as TenantStatus | '') ?? ''
  const viewParam = searchParams.get('view')
  const view = (viewParam === 'table' || viewParam === 'cards' ? viewParam : readStoredView()) ?? 'cards'

  const query = useTenants({ page, size, q, status })
  const retryMutation = useRetryTenant()

  const totalPages = useMemo(() => {
    if (!query.data) return 1
    return Math.max(1, Math.ceil(query.data.total / query.data.size))
  }, [query.data])

  const summary = useMemo(() => {
    const items = query.data?.items ?? []
    const failedCount = items.filter((item) => item.status === 'FAILED').length
    const pendingCount = items.filter((item) => item.status === 'PENDING').length
    const provisioningCount = items.filter((item) => item.status === 'PROVISIONING').length
    return {
      total: query.data?.total ?? 0,
      shown: items.length,
      failedCount,
      pendingCount,
      provisioningCount,
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
    if (next.q !== undefined || next.status !== undefined || next.size !== undefined) {
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

  const error = query.error as ApiError | null
  const retryError = retryMutation.error as ApiError | null

  const handleRetry = async (tenantId: string) => {
    setRetryingTenantId(tenantId)
    try {
      await retryMutation.mutateAsync(tenantId)
      await query.refetch()
    } finally {
      setRetryingTenantId(null)
    }
  }

  return (
    <section className="stack-lg">
      <div className="page-head">
        <div>
          <h1>Tenants</h1>
          <p>Administra aprovisionamiento, estado operativo y readiness para ingestion.</p>
        </div>
        <div className="actions-inline">
          <button className="btn secondary" onClick={() => query.refetch()} type="button">
            Refrescar
          </button>
        </div>
      </div>

      <div className="summary-grid tenants-summary">
        <article className="summary-card">
          <span>Total</span>
          <strong>{summary.total}</strong>
        </article>
        <article className="summary-card">
          <span>Fallidos</span>
          <strong>{summary.failedCount}</strong>
        </article>
        <article className="summary-card">
          <span>Pendientes</span>
          <strong>{summary.pendingCount}</strong>
        </article>
        <article className="summary-card">
          <span>En provisioning</span>
          <strong>{summary.provisioningCount}</strong>
        </article>
      </div>

      <div className="tenants-toolbar">
        <label className="tenants-search" aria-label="Buscar por tenantId o company">
          <span className="tenants-search-icon" aria-hidden="true">
            ⌕
          </span>
          <input
            value={q}
            onChange={(event) => updateFilters({ q: event.target.value })}
            placeholder="Buscar por tenantId o company"
          />
        </label>

        <div className="status-filter-pills" role="group" aria-label="Filtrar por estado">
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

        <div className="view-switch" role="group" aria-label="Modo de visualizacion">
          <button
            type="button"
            className={cn('view-btn', view === 'cards' && 'active')}
            onClick={() => setViewMode('cards')}
          >
            Tarjetas
          </button>
          <button
            type="button"
            className={cn('view-btn', view === 'table' && 'active')}
            onClick={() => setViewMode('table')}
          >
            Tabla
          </button>
        </div>
      </div>

      {error && <div className="error-box">{friendlyError(error.code, error.message)}</div>}
      {retryError && <div className="error-box">{friendlyError(retryError.code, retryError.message)}</div>}

      {view === 'table' && (
        <div className="panel table-wrap">
          <table>
            <thead>
              <tr>
                <th>Tenant</th>
                <th>Company</th>
                <th>ERP</th>
                <th>Env</th>
                <th>Status</th>
                <th>Actualizacion</th>
              </tr>
            </thead>
            <tbody>
              {query.isLoading && <SkeletonTableRows columns={6} />}
              {!query.isLoading && query.data?.items.length === 0 && (
                <tr>
                  <td colSpan={6}>
                    <EmptyState
                      title="Sin tenants para mostrar"
                      description="No hay resultados para los filtros actuales. Ajusta la busqueda o limpia los filtros."
                      action={
                        <button
                          className="btn secondary"
                          type="button"
                          onClick={() => updateFilters({ q: '', status: '' })}
                        >
                          Limpiar filtros
                        </button>
                      }
                    />
                  </td>
                </tr>
              )}
              {query.data?.items.map((item) => (
                <tr key={item.tenantId}>
                  <td>
                    <Link to={`/tenants/${item.tenantId}`} className="tenant-link">
                      {item.tenantId}
                    </Link>
                  </td>
                  <td>{item.companyName}</td>
                  <td>
                    {item.erpType} / {item.integrationMode}
                  </td>
                  <td>{item.environment}</td>
                  <td>
                    <StatusBadge status={item.status} />
                  </td>
                  <td>{formatDate(item.updatedAt)}</td>
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
              <article key={`tenant-card-skeleton-${index}`} className="panel entity-card">
                <div className="skeleton-line skeleton-line-2" />
                <div className="skeleton-line skeleton-line-1" />
                <div className="skeleton-line skeleton-line-0" />
              </article>
            ))}

          {!query.isLoading && query.data?.items.length === 0 && (
            <div className="panel">
              <EmptyState
                title="Sin tenants para mostrar"
                description="No hay resultados para los filtros actuales. Ajusta la busqueda o limpia los filtros."
                action={
                  <button className="btn secondary" type="button" onClick={() => updateFilters({ q: '', status: '' })}>
                    Limpiar filtros
                  </button>
                }
              />
            </div>
          )}

          {query.data?.items.map((item) => {
            const progressStep = getProgressStep(item.status)
            const isFailed = item.status === 'FAILED'
            const isRetrying = retryMutation.isPending && retryingTenantId === item.tenantId

            return (
              <article key={item.tenantId} className={cn('panel entity-card tenant-card', toStatusClass(item.status))}>
                <div className="tenant-card-top">
                  <StatusBadge status={item.status} />
                  <span className="tenant-card-time">{formatCardTime(item.updatedAt)}</span>
                </div>

                <div className="tenant-card-main">
                  <h3 className="tenant-company-title word-break">{item.companyName}</h3>
                  <Link to={`/tenants/${item.tenantId}`} className="tenant-card-subtitle word-break">
                    {item.tenantId}
                  </Link>
                </div>

                <div className="tenant-chip-row">
                  <span className="tenant-chip">
                    {item.erpType} · {item.integrationMode}
                  </span>
                  <span className="tenant-chip">{item.environment}</span>
                </div>

                {progressStep !== null && (
                  <div className="tenant-progress">
                    <div className="tenant-progress-bar" aria-hidden="true">
                      {[0, 1, 2, 3].map((step) => (
                        <span key={step} className={cn('tenant-progress-segment', step <= progressStep && 'active')} />
                      ))}
                    </div>
                    <div className="tenant-progress-labels">
                      <span className={cn(progressStep >= 0 && 'active')}>Creado</span>
                      <span className={cn(progressStep >= 1 && 'active')}>Infra</span>
                      <span className={cn(progressStep >= 2 && 'active')}>Validacion</span>
                      <span className={cn(progressStep >= 3 && 'active')}>Listo</span>
                    </div>
                  </div>
                )}

                <div className={cn('tenant-actions', isFailed && 'with-retry')}>
                  {isFailed && (
                    <button
                      type="button"
                      className="btn tenant-retry-btn"
                      disabled={retryMutation.isPending}
                      onClick={() => handleRetry(item.tenantId)}
                    >
                      {isRetrying ? 'Reintentando...' : 'Reintentar'}
                    </button>
                  )}
                  <Link to={`/tenants/${item.tenantId}`} className={cn('btn secondary tenant-detail-btn', !isFailed && 'full')}>
                    Ver detalle
                  </Link>
                </div>
              </article>
            )
          })}
        </div>
      )}

      <div className="pager">
        <button className="btn secondary" type="button" onClick={() => movePage(page - 1)} disabled={page <= 0}>
          Anterior
        </button>
        <span>
          Pagina {page + 1} de {totalPages}
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

      <p className="tenants-footnote">Mostrando {summary.shown} de {summary.total} tenants</p>
    </section>
  )
}
