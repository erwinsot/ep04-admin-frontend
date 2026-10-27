import { Link, useSearchParams } from 'react-router-dom'
import { useMemo, useState } from 'react'
import { useRetryTenant, useTenants } from '@/features/tenants/hooks'
import { clamp, cn, erpLabel, formatRelativeDate } from '@/lib/utils'
import { StatusBadge } from '@/components/status-badge'
import { ApiError } from '@/lib/api'
import { friendlyError } from '@/lib/error-messages'
import { EmptyState } from '@/components/empty-state'
import { SkeletonTableRows } from '@/components/skeleton-table-rows'
import { RefreshIcon, SearchIcon } from '@/components/icons'
import type { TenantStatus, TenantSummary } from '@/types/ep04'

const DEFAULT_SIZE = 20
const VIEW_STORAGE_KEY = 'ep04.tenants.view-mode'

type ViewMode = 'table' | 'cards'

const STATUS_FILTERS: Array<{ label: string; value: TenantStatus | '' }> = [
  { label: 'Todos', value: '' },
  { label: 'Failed', value: 'FAILED' },
  { label: 'Pending', value: 'PENDING' },
  { label: 'Provisioning', value: 'PROVISIONING' },
  { label: 'Ready', value: 'READY' },
]

const BAR_COLOR: Record<TenantStatus, string> = {
  PENDING: '#D9A441',
  VALIDATING: '#1B4F86',
  PROVISIONING: '#1B4F86',
  READY: '#0E6B4F',
  READY_FOR_INGESTION: '#0E6B4F',
  FAILED: '#A12A20',
  DELETING: '#9AA8A1',
  DELETED: '#9AA8A1',
}

// Segmentos de progreso: d = completado, c = en curso.
const PROGRESS: Partial<Record<TenantStatus, Array<'d' | 'c' | ''>>> = {
  PROVISIONING: ['d', 'd', 'c', ''],
  VALIDATING: ['d', 'd', 'd', 'c'],
}

function readStoredView(): ViewMode | null {
  if (typeof window === 'undefined') return null
  const value = window.localStorage.getItem(VIEW_STORAGE_KEY)
  return value === 'table' || value === 'cards' ? value : null
}

export function TenantsListPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [retryingId, setRetryingId] = useState<string | null>(null)

  const page = clamp(Number(searchParams.get('page') ?? '0') || 0, 0, Number.MAX_SAFE_INTEGER)
  const size = clamp(Number(searchParams.get('size') ?? String(DEFAULT_SIZE)) || DEFAULT_SIZE, 1, 200)
  const q = searchParams.get('q') ?? ''
  const status = (searchParams.get('status') as TenantStatus | null) ?? ''
  const viewParam = searchParams.get('view')
  const view: ViewMode = (viewParam === 'table' || viewParam === 'cards' ? viewParam : readStoredView()) ?? 'cards'

  const query = useTenants({ page, size, q, status })
  const retry = useRetryTenant()

  const items = useMemo(() => query.data?.items ?? [], [query.data])
  const total = query.data?.total ?? 0
  const totalPages = query.data ? Math.max(1, Math.ceil(query.data.total / query.data.size)) : 1

  const counts = useMemo(
    () => ({
      failed: items.filter((item) => item.status === 'FAILED').length,
      pending: items.filter((item) => item.status === 'PENDING').length,
      provisioning: items.filter((item) => item.status === 'PROVISIONING').length,
    }),
    [items],
  )

  const updateParams = (next: Record<string, string>, resetPage = false) => {
    const params = new URLSearchParams(searchParams)
    Object.entries(next).forEach(([key, value]) => {
      if (value) params.set(key, value)
      else params.delete(key)
    })
    if (resetPage) params.set('page', '0')
    setSearchParams(params)
  }

  const setView = (next: ViewMode) => {
    window.localStorage.setItem(VIEW_STORAGE_KEY, next)
    updateParams({ view: next })
  }

  const handleRetry = async (tenantId: string) => {
    setRetryingId(tenantId)
    try {
      await retry.mutateAsync(tenantId)
      await query.refetch()
    } finally {
      setRetryingId(null)
    }
  }

  const error = query.error as ApiError | null
  const retryError = retry.error as ApiError | null

  const kpis: Array<{ label: string; value: number; filter: TenantStatus | ''; color?: string; strong?: string }> = [
    { label: 'Total', value: total, filter: '' },
    { label: 'Fallidos', value: counts.failed, filter: 'FAILED', color: '#A12A20', strong: '#A12A20' },
    { label: 'Pendientes', value: counts.pending, filter: 'PENDING', color: '#7A4B00' },
    { label: 'En provisioning', value: counts.provisioning, filter: 'PROVISIONING', color: '#1B4F86' },
  ]

  const renderEmpty = () => (
    <EmptyState
      title="Sin tenants para mostrar"
      description="No hay resultados para los filtros actuales. Ajusta la búsqueda o limpia los filtros."
      action={
        <button className="btn" type="button" onClick={() => updateParams({ q: '', status: '' }, true)}>
          Limpiar filtros
        </button>
      }
    />
  )

  const renderCard = (item: TenantSummary) => {
    const progress = PROGRESS[item.status]
    const failed = item.status === 'FAILED'

    return (
      <article
        key={item.tenantId}
        className="t-card"
        style={{ '--status-color': BAR_COLOR[item.status] } as React.CSSProperties}
      >
        <div className="bar" style={{ background: BAR_COLOR[item.status] }} />
        <div className="t-top">
          <StatusBadge status={item.status} />
          <span className="when">{formatRelativeDate(item.updatedAt)}</span>
        </div>
        <div className="t-id">
          <h2>{item.companyName}</h2>
          <span className="tid" title={item.tenantId}>
            {item.tenantId}
          </span>
        </div>
        <div className="meta">
          <span className="tag">
            {erpLabel(item.erpType)} · {item.integrationMode}
          </span>
          <span className="tag">{item.environment}</span>
        </div>
        {progress && (
          <div>
            <div className="steps">
              {progress.map((step, index) => (
                <i key={index} className={step} />
              ))}
            </div>
            <div className="stl">
              <span>Creado</span>
              <span>Infra</span>
              <span>Validación</span>
              <span>Listo</span>
            </div>
          </div>
        )}
        <div className="foot">
          <div className="act">
            {failed && (
              <button
                type="button"
                className="btn red"
                disabled={retry.isPending}
                onClick={() => handleRetry(item.tenantId)}
              >
                {retryingId === item.tenantId ? 'Reintentando…' : 'Reintentar'}
              </button>
            )}
            <Link to={`/tenants/${item.tenantId}`} className={cn('btn', !failed && 'go')}>
              Ver detalle
            </Link>
          </div>
        </div>
      </article>
    )
  }

  return (
    <section className="stack-lg">
      <div className="page-head">
        <div>
          <h1>Tenants</h1>
          <p>Aprovisionamiento, estado operativo y readiness para ingestión.</p>
        </div>
        <button className="btn" type="button" onClick={() => query.refetch()}>
          <RefreshIcon />
          Refrescar
        </button>
      </div>

      <div className="kpis">
        {kpis.map((kpi) => (
          <button
            key={kpi.label}
            type="button"
            className={cn('kpi', status === kpi.filter && 'sel')}
            onClick={() => updateParams({ status: kpi.filter }, true)}
          >
            <span className="l" style={kpi.color ? { color: kpi.color } : undefined}>
              {kpi.label}
            </span>
            <span className="n" style={kpi.strong ? { color: kpi.strong } : undefined}>
              {kpi.value}
            </span>
          </button>
        ))}
      </div>

      <div className="toolbar">
        <label className="search">
          <span className="sr">Buscar tenant</span>
          <SearchIcon />
          <input
            type="text"
            value={q}
            placeholder="Buscar por tenantId o company"
            onChange={(event) => updateParams({ q: event.target.value }, true)}
          />
        </label>

        <div className="chips" role="group" aria-label="Filtrar por estado">
          {STATUS_FILTERS.map((option) => (
            <button
              key={option.label}
              type="button"
              className={cn('chip', status === option.value && 'on')}
              onClick={() => updateParams({ status: option.value }, true)}
            >
              {option.label}
            </button>
          ))}
        </div>

        <div className="seg" role="group" aria-label="Modo de visualización">
          <button type="button" className={cn('chip', view === 'cards' && 'on')} onClick={() => setView('cards')}>
            Tarjetas
          </button>
          <button type="button" className={cn('chip', view === 'table' && 'on')} onClick={() => setView('table')}>
            Tabla
          </button>
        </div>
      </div>

      {error && <div className="error-box">{friendlyError(error.code, error.message)}</div>}
      {retryError && <div className="error-box">{friendlyError(retryError.code, retryError.message)}</div>}

      {view === 'cards' && (
        <div className="cards">
          {query.isLoading &&
            Array.from({ length: 4 }).map((_, index) => (
              <article key={index} className="t-card">
                <div className="skeleton-line skeleton-line-2" />
                <div className="skeleton-line skeleton-line-1" />
                <div className="skeleton-line skeleton-line-0" />
              </article>
            ))}
          {!query.isLoading && items.length === 0 && <div className="box">{renderEmpty()}</div>}
          {items.map(renderCard)}
        </div>
      )}

      {view === 'table' && (
        <div className="box">
          <table style={{ minWidth: 820 }}>
            <thead>
              <tr>
                <th>Estado</th>
                <th>Tenant</th>
                <th>Company</th>
                <th>ERP</th>
                <th>Entorno</th>
                <th>Actualización</th>
                <th aria-label="Acciones" />
              </tr>
            </thead>
            <tbody>
              {query.isLoading && <SkeletonTableRows columns={7} />}
              {!query.isLoading && items.length === 0 && (
                <tr>
                  <td colSpan={7}>{renderEmpty()}</td>
                </tr>
              )}
              {items.map((item) => (
                <tr key={item.tenantId} className={cn(item.status === 'FAILED' && 'fail')}>
                  <td>
                    <StatusBadge status={item.status} />
                  </td>
                  <td>
                    <Link to={`/tenants/${item.tenantId}`}>{item.tenantId}</Link>
                  </td>
                  <td>{item.companyName}</td>
                  <td>
                    {erpLabel(item.erpType)} · {item.integrationMode}
                  </td>
                  <td>{item.environment}</td>
                  <td className="nw">{formatRelativeDate(item.updatedAt)}</td>
                  <td>
                    {item.status === 'FAILED' && (
                      <button
                        type="button"
                        className="btn red"
                        disabled={retry.isPending}
                        onClick={() => handleRetry(item.tenantId)}
                      >
                        {retryingId === item.tenantId ? 'Reintentando…' : 'Reintentar'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {totalPages > 1 && (
        <div className="pager">
          <button
            className="btn"
            type="button"
            onClick={() => updateParams({ page: String(clamp(page - 1, 0, totalPages - 1)) })}
            disabled={page <= 0}
          >
            Anterior
          </button>
          <span>
            Página {page + 1} de {totalPages}
          </span>
          <button
            className="btn"
            type="button"
            onClick={() => updateParams({ page: String(clamp(page + 1, 0, totalPages - 1)) })}
            disabled={page + 1 >= totalPages}
          >
            Siguiente
          </button>
        </div>
      )}

      <footer className="foot-note">
        Mostrando {items.length} de {total} tenants
      </footer>
    </section>
  )
}
