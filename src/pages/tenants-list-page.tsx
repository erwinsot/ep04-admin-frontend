import { Link, useSearchParams } from 'react-router-dom'
import { useMemo } from 'react'
import { useTenants } from '@/features/tenants/hooks'
import { ACTIVE_STATUSES, TENANT_STATUSES } from '@/constants/catalogs'
import { clamp, cn, formatDate } from '@/lib/utils'
import { StatusBadge } from '@/components/status-badge'
import { ApiError } from '@/lib/api'
import { friendlyError } from '@/lib/error-messages'
import { EmptyState } from '@/components/empty-state'
import { SkeletonTableRows } from '@/components/skeleton-table-rows'

const DEFAULT_SIZE = 20
type ViewMode = 'table' | 'cards'
const VIEW_STORAGE_KEY = 'ep04.tenants.view-mode'

function readStoredView(): ViewMode | null {
  if (typeof window === 'undefined') return null
  const value = window.localStorage.getItem(VIEW_STORAGE_KEY)
  if (value === 'table' || value === 'cards') return value
  return null
}

export function TenantsListPage() {
  const [searchParams, setSearchParams] = useSearchParams()

  const page = clamp(Number(searchParams.get('page') ?? '0') || 0, 0, Number.MAX_SAFE_INTEGER)
  const size = clamp(Number(searchParams.get('size') ?? String(DEFAULT_SIZE)) || DEFAULT_SIZE, 1, 200)
  const q = searchParams.get('q') ?? ''
  const status = (searchParams.get('status') as typeof TENANT_STATUSES[number] | '') ?? ''
  const viewParam = searchParams.get('view')
  const view = (viewParam === 'table' || viewParam === 'cards' ? viewParam : readStoredView()) ?? 'cards'

  const query = useTenants({ page, size, q, status })

  const totalPages = useMemo(() => {
    if (!query.data) return 1
    return Math.max(1, Math.ceil(query.data.total / query.data.size))
  }, [query.data])

  const summary = useMemo(() => {
    const items = query.data?.items ?? []
    const activeCount = items.filter((item) => ACTIVE_STATUSES.includes(item.status)).length
    const failedCount = items.filter((item) => item.status === 'FAILED').length
    return {
      total: query.data?.total ?? 0,
      activeCount,
      failedCount,
      shown: items.length,
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

  return (
    <section className="stack-lg">
      <div className="page-head">
        <div>
          <h1>Tenants</h1>
          <p>Administra aprovisionamiento, estado operativo y readiness para ingestion.</p>
        </div>
        <div className="actions-inline">
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
          <Link to="/operations" className="btn secondary inline-btn">
            Ver operaciones
          </Link>
          <button className="btn secondary" onClick={() => query.refetch()} type="button">
            Refrescar
          </button>
        </div>
      </div>

      <div className="summary-grid">
        <article className="summary-card">
          <span>Total tenants</span>
          <strong>{summary.total}</strong>
          <small>Registros totales en la consulta actual</small>
        </article>
        <article className="summary-card">
          <span>Activos</span>
          <strong>{summary.activeCount}</strong>
          <small>Provisioning y validacion en curso</small>
        </article>
        <article className="summary-card">
          <span>Fallidos</span>
          <strong>{summary.failedCount}</strong>
          <small>Tenants que permiten accion de retry</small>
        </article>
        <article className="summary-card">
          <span>Mostrados</span>
          <strong>{summary.shown}</strong>
          <small>Resultados visibles en esta pagina</small>
        </article>
      </div>

      <div className="panel filters">
        <label>
          Buscar
          <input
            value={q}
            onChange={(event) => updateFilters({ q: event.target.value })}
            placeholder="tenantId o company"
          />
        </label>

        <label>
          Estado
          <select value={status} onChange={(event) => updateFilters({ status: event.target.value })}>
            <option value="">Todos</option>
            {TENANT_STATUSES.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </label>

        <label>
          Tamano pagina
          <select value={size} onChange={(event) => updateFilters({ size: event.target.value })}>
            {[10, 20, 50, 100, 200].map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </label>
      </div>

      {error && <div className="error-box">{friendlyError(error.code, error.message)}</div>}

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

          {query.data?.items.map((item) => (
            <article key={item.tenantId} className="panel entity-card">
              <div className="entity-card-head">
                <div>
                  <p className="entity-meta">Tenant ID</p>
                  <Link to={`/tenants/${item.tenantId}`} className="entity-card-title word-break">
                    {item.tenantId}
                  </Link>
                </div>
                <StatusBadge status={item.status} />
              </div>

              <dl className="entity-kv">
                <div className="entity-kv-row">
                  <dt>Company</dt>
                  <dd>{item.companyName}</dd>
                </div>

                <div className="entity-kv-row">
                  <dt>ERP</dt>
                  <dd>
                    {item.erpType} / {item.integrationMode}
                  </dd>
                </div>

                <div className="entity-kv-row">
                  <dt>Environment</dt>
                  <dd>{item.environment}</dd>
                </div>

                <div className="entity-kv-row">
                  <dt>Actualizacion</dt>
                  <dd>{formatDate(item.updatedAt)}</dd>
                </div>
              </dl>

              <div className="entity-actions">
                <Link to={`/tenants/${item.tenantId}`} className="btn secondary inline-btn">
                  Ver detalle
                </Link>
              </div>
            </article>
          ))}
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
    </section>
  )
}
