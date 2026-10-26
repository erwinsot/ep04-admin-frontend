import { Link, useSearchParams } from 'react-router-dom'
import { useMemo, useState } from 'react'
import { ACTIVE_OPERATION_STATUSES } from '@/constants/catalogs'
import { useOperations } from '@/features/tenants/hooks'
import { ApiError } from '@/lib/api'
import { friendlyError } from '@/lib/error-messages'
import { clamp, cn, copyText, formatDuration, formatRelativeDate, shortId } from '@/lib/utils'
import { OperationStatusBadge } from '@/components/operation-status-badge'
import { EmptyState } from '@/components/empty-state'
import { SkeletonTableRows } from '@/components/skeleton-table-rows'
import { CopyIcon, RefreshIcon, SearchIcon } from '@/components/icons'
import type { OperationStatus, OperationType, ProvisioningOperation, PullRequestStatus } from '@/types/ep04'

const DEFAULT_SIZE = 20
const VIEW_STORAGE_KEY = 'ep04.operations.view-mode'

type ViewMode = 'table' | 'cards'

const STATUS_FILTERS: Array<{ label: string; value: OperationStatus | '' }> = [
  { label: 'Todos', value: '' },
  { label: 'Success', value: 'SUCCESS' },
  { label: 'Failed', value: 'FAILED' },
]

const TYPE_FILTERS: Array<{ label: string; value: OperationType | '' }> = [
  { label: 'Todos', value: '' },
  { label: 'Create', value: 'CREATE' },
  { label: 'Retry', value: 'RETRY' },
  { label: 'Delete', value: 'DELETE' },
]

const TYPE_CLASS: Record<OperationType, string> = {
  CREATE: 't-c',
  RETRY: 't-r',
  DELETE: 't-d',
}

const PR_LABEL: Record<PullRequestStatus['estado'], { text: string; tone: 'g' | 'a' | 'x' }> = {
  FUSIONADO: { text: 'Fusionado', tone: 'g' },
  PENDIENTE_REVISION: { text: 'Pendiente revisión', tone: 'a' },
  PENDIENTE_PUBLICACION: { text: 'Pendiente publicación', tone: 'a' },
  CERRADO_SIN_FUSIONAR: { text: 'Cerrado sin fusionar', tone: 'x' },
}

function barColor(status: OperationStatus) {
  if (status === 'FAILED') return '#A12A20'
  if (status === 'SUCCESS') return '#0E6B4F'
  return '#1B4F86'
}

function readStoredView(): ViewMode | null {
  if (typeof window === 'undefined') return null
  const value = window.localStorage.getItem(VIEW_STORAGE_KEY)
  return value === 'table' || value === 'cards' ? value : null
}

function PullRequestPill({ pr }: { pr: PullRequestStatus | null }) {
  if (!pr || (pr.numero === null && !pr.url)) return <span className="na">—</span>

  const meta = PR_LABEL[pr.estado] ?? { text: pr.estado, tone: 'x' as const }
  const text = `${pr.numero !== null ? `#${pr.numero} · ` : ''}${meta.text}`

  return pr.url ? (
    <a className={cn('pr', meta.tone)} href={pr.url} target="_blank" rel="noreferrer">
      {text}
    </a>
  ) : (
    <span className={cn('pr', meta.tone)}>{text}</span>
  )
}

export function OperationsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const page = clamp(Number(searchParams.get('page') ?? '0') || 0, 0, Number.MAX_SAFE_INTEGER)
  const size = clamp(Number(searchParams.get('size') ?? String(DEFAULT_SIZE)) || DEFAULT_SIZE, 1, 200)
  const tenantId = searchParams.get('tenantId') ?? ''
  const status = (searchParams.get('status') as OperationStatus | null) ?? ''
  const type = (searchParams.get('type') as OperationType | null) ?? ''
  const viewParam = searchParams.get('view')
  const view: ViewMode = (viewParam === 'table' || viewParam === 'cards' ? viewParam : readStoredView()) ?? 'table'

  const query = useOperations({ page, size, status, type, tenantId: tenantId || undefined })

  const items = useMemo(() => query.data?.items ?? [], [query.data])
  const total = query.data?.total ?? 0
  const totalPages = query.data ? Math.max(1, Math.ceil(query.data.total / query.data.size)) : 1

  const counts = useMemo(
    () => ({
      active: items.filter((item) => ACTIVE_OPERATION_STATUSES.includes(item.status)).length,
      success: items.filter((item) => item.status === 'SUCCESS').length,
      failed: items.filter((item) => item.status === 'FAILED').length,
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

  const handleCopy = async (operationId: string) => {
    if (!(await copyText(operationId))) return
    setCopiedId(operationId)
    window.setTimeout(() => setCopiedId((current) => (current === operationId ? null : current)), 1500)
  }

  const error = query.error as ApiError | null

  const renderEmpty = () => (
    <EmptyState
      title="Sin operaciones para mostrar"
      description="No hay operaciones para los filtros actuales. Ajusta tenant, estado o tipo para continuar."
      action={
        <button className="btn" type="button" onClick={() => updateParams({ tenantId: '', status: '', type: '' }, true)}>
          Limpiar filtros
        </button>
      }
    />
  )

  const copyButton = (item: ProvisioningOperation) => (
    <button
      type="button"
      className={cn('cp', copiedId === item.operationId && 'copied')}
      aria-label="Copiar ID de operación"
      title={copiedId === item.operationId ? 'Copiado' : 'Copiar ID de operación'}
      onClick={() => handleCopy(item.operationId)}
    >
      <CopyIcon />
    </button>
  )

  return (
    <section className="stack-lg">
      <div className="page-head">
        <div>
          <h1>Operaciones</h1>
          <p>Seguimiento global de CREATE, RETRY y DELETE con su estado asíncrono.</p>
        </div>
        <button className="btn" type="button" onClick={() => query.refetch()}>
          <RefreshIcon />
          Refrescar
        </button>
      </div>

      <div className="kpis">
        <button type="button" className={cn('kpi', status === '' && 'sel')} onClick={() => updateParams({ status: '' }, true)}>
          <span className="l">Total</span>
          <span className="n">{total}</span>
        </button>
        <div className="kpi">
          <span className="l" style={{ color: '#1B4F86' }}>
            Activas
          </span>
          <span className="n">{counts.active}</span>
        </div>
        <button
          type="button"
          className={cn('kpi', status === 'SUCCESS' && 'sel')}
          onClick={() => updateParams({ status: 'SUCCESS' }, true)}
        >
          <span className="l" style={{ color: '#0B5A42' }}>
            Exitosas
          </span>
          <span className="n">{counts.success}</span>
        </button>
        <button
          type="button"
          className={cn('kpi', status === 'FAILED' && 'sel')}
          onClick={() => updateParams({ status: 'FAILED' }, true)}
        >
          <span className="l" style={{ color: '#A12A20' }}>
            Fallidas
          </span>
          <span className="n" style={{ color: '#A12A20' }}>
            {counts.failed}
          </span>
        </button>
      </div>

      <div className="toolbar">
        <label className="search sm">
          <span className="sr">Buscar por tenant</span>
          <SearchIcon />
          <input
            type="text"
            value={tenantId}
            placeholder="Tenant ID, ej. acme-co"
            onChange={(event) => updateParams({ tenantId: event.target.value.trim() }, true)}
          />
        </label>

        <div className="chips" role="group" aria-label="Filtrar por estado">
          <span className="lab">Estado</span>
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

        <div className="chips" role="group" aria-label="Filtrar por tipo">
          <span className="lab">Tipo</span>
          {TYPE_FILTERS.map((option) => (
            <button
              key={option.label}
              type="button"
              className={cn('chip', type === option.value && 'on')}
              onClick={() => updateParams({ type: option.value }, true)}
            >
              {option.label}
            </button>
          ))}
        </div>

        <div className="seg" role="group" aria-label="Modo de visualización">
          <button type="button" className={cn('chip', view === 'table' && 'on')} onClick={() => setView('table')}>
            Tabla
          </button>
          <button type="button" className={cn('chip', view === 'cards' && 'on')} onClick={() => setView('cards')}>
            Tarjetas
          </button>
        </div>
      </div>

      {error && <div className="error-box">{friendlyError(error.code, error.message)}</div>}

      {view === 'table' && (
        <section className="box">
          <table>
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
              {!query.isLoading && items.length === 0 && (
                <tr>
                  <td colSpan={8}>{renderEmpty()}</td>
                </tr>
              )}
              {items.map((item) => (
                <tr key={item.operationId} className={cn(item.status === 'FAILED' && 'fail')}>
                  <td>
                    <OperationStatusBadge status={item.status} />
                  </td>
                  <td>
                    <span className={cn('ty', TYPE_CLASS[item.operationType])}>{item.operationType}</span>
                    <span className="try">intento {item.attemptNumber}</span>
                  </td>
                  <td>
                    <Link to={`/tenants/${item.tenantId}?operationId=${item.operationId}`}>{item.tenantId}</Link>
                  </td>
                  <td>
                    <span className="idc">
                      <span className="mono" title={item.operationId}>
                        {shortId(item.operationId)}
                      </span>
                      {copyButton(item)}
                    </span>
                  </td>
                  <td>{item.requestedBy}</td>
                  <td className="nw">{formatRelativeDate(item.startedAt)}</td>
                  <td className="nw">{formatDuration(item.startedAt, item.endedAt)}</td>
                  <td>
                    <PullRequestPill pr={item.pullRequest} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

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
          {items.map((item) => (
            <article key={item.operationId} className="t-card">
              <div className="bar" style={{ background: barColor(item.status) }} />
              <div className="t-top">
                <OperationStatusBadge status={item.status} />
                <span className="when">{formatRelativeDate(item.startedAt)}</span>
              </div>
              <div className="t-id">
                <h2>
                  <Link to={`/tenants/${item.tenantId}?operationId=${item.operationId}`}>{item.tenantId}</Link>
                </h2>
                <span className="idc">
                  <span className="tid" title={item.operationId}>
                    {shortId(item.operationId)}
                  </span>
                  {copyButton(item)}
                </span>
              </div>
              <div className="meta">
                <span className={cn('ty', TYPE_CLASS[item.operationType])}>{item.operationType}</span>
                <span className="tag">intento {item.attemptNumber}</span>
                <span className="tag">{item.requestedBy}</span>
                <span className="tag">{formatDuration(item.startedAt, item.endedAt)}</span>
              </div>
              <div className="foot">
                <PullRequestPill pr={item.pullRequest} />
              </div>
            </article>
          ))}
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

      <footer className="foot-note left">
        Mostrando {items.length} de {total} operaciones · más recientes primero
      </footer>
    </section>
  )
}
