import { Link, useSearchParams } from 'react-router-dom'
import { useMemo } from 'react'
import { ACTIVE_OPERATION_STATUSES, OPERATION_STATUSES, OPERATION_TYPES } from '@/constants/catalogs'
import { useOperations } from '@/features/tenants/hooks'
import { ApiError } from '@/lib/api'
import { friendlyError } from '@/lib/error-messages'
import { clamp, cn, formatDate } from '@/lib/utils'
import { OperationStatusBadge } from '@/components/operation-status-badge'
import { EmptyState } from '@/components/empty-state'
import { SkeletonTableRows } from '@/components/skeleton-table-rows'

const DEFAULT_SIZE = 20
type ViewMode = 'table' | 'cards'
const VIEW_STORAGE_KEY = 'ep04.operations.view-mode'

function readStoredView(): ViewMode | null {
  if (typeof window === 'undefined') return null
  const value = window.localStorage.getItem(VIEW_STORAGE_KEY)
  if (value === 'table' || value === 'cards') return value
  return null
}

export function OperationsPage() {
  const [searchParams, setSearchParams] = useSearchParams()

  const page = clamp(Number(searchParams.get('page') ?? '0') || 0, 0, Number.MAX_SAFE_INTEGER)
  const size = clamp(Number(searchParams.get('size') ?? String(DEFAULT_SIZE)) || DEFAULT_SIZE, 1, 200)
  const tenantId = searchParams.get('tenantId') ?? ''
  const status = (searchParams.get('status') as (typeof OPERATION_STATUSES)[number] | '') ?? ''
  const type = (searchParams.get('type') as (typeof OPERATION_TYPES)[number] | '') ?? ''
  const viewParam = searchParams.get('view')
  const view = (viewParam === 'table' || viewParam === 'cards' ? viewParam : readStoredView()) ?? 'cards'

  const query = useOperations({ page, size, status, type, tenantId: tenantId || undefined })

  const totalPages = useMemo(() => {
    if (!query.data) return 1
    return Math.max(1, Math.ceil(query.data.total / query.data.size))
  }, [query.data])

  const summary = useMemo(() => {
    const items = query.data?.items ?? []
    const activeCount = items.filter((item) => ACTIVE_OPERATION_STATUSES.includes(item.status)).length
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

  const error = query.error as ApiError | null

  return (
    <section className="stack-lg">
      <div className="page-head">
        <div>
          <h1>Operaciones</h1>
          <p>Seguimiento global de CREATE, RETRY y DELETE con su estado asyncrono.</p>
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

          <button className="btn secondary" onClick={() => query.refetch()} type="button">
            Refrescar
          </button>
        </div>
      </div>

      <div className="summary-grid">
        <article className="summary-card">
          <span>Total operaciones</span>
          <strong>{summary.total}</strong>
          <small>CREATE, RETRY y DELETE acumuladas</small>
        </article>
        <article className="summary-card">
          <span>Activas</span>
          <strong>{summary.activeCount}</strong>
          <small>Pendientes de estado terminal</small>
        </article>
        <article className="summary-card">
          <span>Fallidas</span>
          <strong>{summary.failedCount}</strong>
          <small>Operaciones con error para seguimiento</small>
        </article>
        <article className="summary-card">
          <span>Mostradas</span>
          <strong>{summary.shown}</strong>
          <small>Resultados visibles en esta pagina</small>
        </article>
      </div>

      <div className="panel filters filters-4">
        <label>
          Tenant ID
          <input
            value={tenantId}
            onChange={(event) => updateFilters({ tenantId: event.target.value.trim() })}
            placeholder="acme-co"
          />
        </label>

        <label>
          Estado
          <select value={status} onChange={(event) => updateFilters({ status: event.target.value })}>
            <option value="">Todos</option>
            {OPERATION_STATUSES.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </label>

        <label>
          Tipo
          <select value={type} onChange={(event) => updateFilters({ type: event.target.value })}>
            <option value="">Todos</option>
            {OPERATION_TYPES.map((value) => (
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
                <th>Operacion</th>
                <th>Tenant</th>
                <th>Tipo</th>
                <th>Estado</th>
                <th>Intento</th>
                <th>Solicitado por</th>
                <th>Inicio</th>
                <th>Fin</th>
                <th>PR</th>
              </tr>
            </thead>
            <tbody>
              {query.isLoading && <SkeletonTableRows columns={9} />}
              {!query.isLoading && query.data?.items.length === 0 && (
                <tr>
                  <td colSpan={9}>
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
                  <td className="word-break">{item.operationId}</td>
                  <td>
                    <Link to={`/tenants/${item.tenantId}?operationId=${item.operationId}`} className="tenant-link">
                      {item.tenantId}
                    </Link>
                  </td>
                  <td>{item.operationType}</td>
                  <td>
                    <OperationStatusBadge status={item.status} />
                  </td>
                  <td>{item.attemptNumber}</td>
                  <td>{item.requestedBy}</td>
                  <td>{formatDate(item.startedAt)}</td>
                  <td>{formatDate(item.endedAt)}</td>
                  <td>
                    {item.pullRequest?.url ? (
                      <a href={item.pullRequest.url} target="_blank" rel="noreferrer">
                        #{item.pullRequest.numero} · {item.pullRequest.estado}
                      </a>
                    ) : (
                      item.pullRequest?.estado ?? 'n/a'
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
            </div>
          )}

          {query.data?.items.map((item) => (
            <article key={item.operationId} className="panel entity-card operation-card">
              <div className="entity-card-head">
                <div>
                  <p className="entity-meta">Operacion</p>
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
                  <dd className="operation-time">{formatDate(item.startedAt)}</dd>
                </div>

                <div className="entity-kv-row">
                  <dt>Fin</dt>
                  <dd className="operation-time">{formatDate(item.endedAt)}</dd>
                </div>

                <div className="entity-kv-row">
                  <dt>PR</dt>
                  <dd className="operation-pr">
                    {item.pullRequest?.url ? (
                      <a href={item.pullRequest.url} target="_blank" rel="noreferrer">
                        #{item.pullRequest.numero} · {item.pullRequest.estado}
                      </a>
                    ) : (
                      item.pullRequest?.estado ?? 'n/a'
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
