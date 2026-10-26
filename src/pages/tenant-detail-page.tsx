import { Link, useParams, useSearchParams } from 'react-router-dom'
import { useMemo, useState } from 'react'
import { EmptyState } from '@/components/empty-state'
import { OperationStatusBadge } from '@/components/operation-status-badge'
import { SkeletonTableRows } from '@/components/skeleton-table-rows'
import { StatusBadge } from '@/components/status-badge'
import {
  useDeleteTenant,
  useOperationDetail,
  useRetryTenant,
  useTenantDetail,
  useTenantEvents,
  useTenantOperations,
  useTenantPullRequest,
  useTenantReadiness,
} from '@/features/tenants/hooks'
import { formatDate } from '@/lib/utils'
import { ApiError } from '@/lib/api'
import { friendlyError } from '@/lib/error-messages'
import { TERMINAL_OPERATION_STATUSES, TERMINAL_TENANT_STATUSES } from '@/constants/catalogs'

const TENANT_OPERATIONS_PAGE_SIZE = 10

const PROVISION_STEPS = [
  { code: 'CREATE_REQUESTED', label: 'CREATE_REQUESTED', description: 'Solicitud aceptada' },
  { code: 'VALIDATING', label: 'VALIDATING', description: 'Restricciones validadas' },
  { code: 'PROVISIONING', label: 'PROVISIONING', description: 'Recursos para el PR' },
  { code: 'PROVISIONING_FAILED', label: 'PROVISIONING_FAILED', description: 'Falló el aprovisionamiento' },
]

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

function formatPullRequestState(state: string) {
  if (!state) return 'n/a'
  const words = state.toLowerCase().split('_')
  return words.map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')
}

export function TenantDetailPage() {
  const { tenantId = '' } = useParams()
  const [searchParams, setSearchParams] = useSearchParams()
  const [copiedField, setCopiedField] = useState<string | null>(null)

  const trackedOperationId = searchParams.get('operationId') ?? ''

  const detail = useTenantDetail(tenantId)
  const tenantIsTerminal = detail.data?.status ? TERMINAL_TENANT_STATUSES.includes(detail.data.status) : false
  const operation = useOperationDetail(trackedOperationId, Boolean(trackedOperationId))
  const operationIsTerminal = operation.data
    ? TERMINAL_OPERATION_STATUSES.includes(operation.data.status)
    : !trackedOperationId
  const shouldPoll = !tenantIsTerminal || !operationIsTerminal

  const events = useTenantEvents(tenantId, shouldPoll)
  const readiness = useTenantReadiness(tenantId, shouldPoll)
  const pullRequest = useTenantPullRequest(tenantId, shouldPoll)
  const tenantOperations = useTenantOperations(
    tenantId,
    { page: 0, size: TENANT_OPERATIONS_PAGE_SIZE },
    shouldPoll,
  )
  const retryMutation = useRetryTenant()
  const deleteMutation = useDeleteTenant()

  const detailError = detail.error as ApiError | null
  const operationError = operation.error as ApiError | null
  const pullRequestError = pullRequest.error as ApiError | null

  const steps = useMemo(() => {
    const actions = new Set((events.data ?? []).map((event) => event.action))
    const failed = (events.data ?? []).some((event) => event.result === 'FAILED')

    return PROVISION_STEPS.map((step, index) => {
      const seen = actions.has(step.code)
      const active = seen && (!actions.has(PROVISION_STEPS[index + 1]?.code) || index === PROVISION_STEPS.length - 1)
      const isFailedStep = failed && step.code.includes('FAILED')
      return {
        ...step,
        seen,
        active,
        isFailedStep,
      }
    })
  }, [events.data])

  if (detail.isLoading) {
    return (
      <div className="panel stack-lg">
        <div className="skeleton-line skeleton-line-2" />
        <div className="skeleton-line skeleton-line-1" />
        <div className="skeleton-line skeleton-line-0" />
      </div>
    )
  }

  if (!detail.data) {
    return (
      <div className="stack-lg">
        <div className="error-box">{friendlyError(detailError?.code, detailError?.message)}</div>
        <Link to="/" className="btn secondary inline-btn">
          Volver al listado
        </Link>
      </div>
    )
  }

  const tenant = detail.data
  const retryError = retryMutation.error as ApiError | null
  const deleteError = deleteMutation.error as ApiError | null
  const canDelete = tenant.status !== 'DELETING' && tenant.status !== 'DELETED'

  const latestFailedEvent = (events.data ?? []).find((event) => event.result === 'FAILED')
  const alertTitle = operation.data?.errorSummary ?? latestFailedEvent?.details ?? readiness.data?.dataPlaneError

  const trackOperation = (operationId: string) => {
    const params = new URLSearchParams(searchParams)
    params.set('operationId', operationId)
    setSearchParams(params)
  }

  const clearTrackedOperation = () => {
    const params = new URLSearchParams(searchParams)
    params.delete('operationId')
    setSearchParams(params)
  }

  const handleRetry = async () => {
    const response = await retryMutation.mutateAsync(tenant.tenantId)
    trackOperation(response.operationId)
  }

  const handleDelete = async () => {
    const confirmed = window.confirm(
      `Se solicitará la baja del tenant ${tenant.tenantId}. Esto iniciará una operación DELETE asíncrona. ¿Deseas continuar?`,
    )
    if (!confirmed) return
    const response = await deleteMutation.mutateAsync(tenant.tenantId)
    trackOperation(response.operationId)
  }

  const copyField = async (key: string, value: string) => {
    if (typeof navigator === 'undefined' || !navigator.clipboard) return
    try {
      await navigator.clipboard.writeText(value)
      setCopiedField(key)
      window.setTimeout(() => setCopiedField((current) => (current === key ? null : current)), 1500)
    } catch {
      setCopiedField(null)
    }
  }

  return (
    <section className="stack-lg detail-page">
      <Link to="/" className="detail-back-link">
        ← Tenants
      </Link>

      <div className="panel detail-head">
        <div className="detail-head-main">
          <div className="detail-title-row">
            <h1>
              {tenant.companyName} ({tenant.country})
            </h1>
            <StatusBadge status={tenant.status} />
          </div>
          <p>
            {tenant.tenantId} · Actualizado {formatRelativeDate(tenant.updatedAt)}
          </p>
        </div>

        <div className="detail-head-actions">
          {tenant.status === 'FAILED' && (
            <button
              type="button"
              className="btn warning"
              disabled={retryMutation.isPending}
              onClick={handleRetry}
            >
              {retryMutation.isPending ? 'Procesando retry...' : 'Reintentar'}
            </button>
          )}
          {canDelete && (
            <button
              type="button"
              className="btn danger"
              disabled={deleteMutation.isPending}
              onClick={handleDelete}
            >
              {deleteMutation.isPending ? 'Solicitando baja...' : 'Eliminar tenant'}
            </button>
          )}
          {trackedOperationId && (
            <button type="button" className="btn secondary" onClick={clearTrackedOperation}>
              Ocultar tracking
            </button>
          )}
        </div>
      </div>

      {alertTitle && (
        <div className="detail-alert" role="alert">
          <strong>{alertTitle}</strong>
          <span>Tenant is not ready yet; revisa dataPlaneStatus y estado de Argo CD.</span>
        </div>
      )}

      {retryError && <div className="error-box">{friendlyError(retryError.code, retryError.message)}</div>}
      {deleteError && <div className="error-box">{friendlyError(deleteError.code, deleteError.message)}</div>}
      {operationError && <div className="error-box">{friendlyError(operationError.code, operationError.message)}</div>}

      <div className="detail-layout">
        <div className="detail-main">
          <article className="panel">
            <h3>Progreso del aprovisionamiento</h3>
            <div className="provision-steps">
              {steps.map((step) => (
                <div
                  key={step.code}
                  className={[
                    'provision-step',
                    step.seen ? 'seen' : '',
                    step.active ? 'active' : '',
                    step.isFailedStep ? 'failed' : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                >
                  <strong>{step.label}</strong>
                  <span>{step.description}</span>
                </div>
              ))}
            </div>
          </article>

          <article className="panel">
            <h3>Timeline de eventos</h3>
            <p className="detail-subtext">Operación {trackedOperationId || tenantOperations.data?.items[0]?.operationId || 'n/a'}</p>

            {events.isLoading && (
              <ul className="timeline">
                {Array.from({ length: 4 }).map((_, index) => (
                  <li key={`timeline-skeleton-${index}`}>
                    <div className="skeleton-line skeleton-line-2" />
                    <div className="skeleton-line skeleton-line-0" />
                    <div className="skeleton-line skeleton-line-1" />
                  </li>
                ))}
              </ul>
            )}

            {!events.isLoading && (events.data?.length ?? 0) === 0 && (
              <EmptyState title="Sin eventos" description="No se encontraron eventos para este tenant por ahora." />
            )}

            {(events.data?.length ?? 0) > 0 && (
              <ul className="timeline">
                {events.data?.map((event) => (
                  <li key={event.id}>
                    <div className="timeline-head">
                      <strong>{event.action}</strong>
                      <span>{formatDate(event.createdAt)}</span>
                    </div>
                    <p>{event.details}</p>
                    <small>
                      result={event.result} · actor={event.actor}
                    </small>
                  </li>
                ))}
              </ul>
            )}
          </article>

          <article className="panel">
            <h3>Historial de operaciones</h3>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Operación</th>
                    <th>Tipo</th>
                    <th>Estado</th>
                    <th>Inicio</th>
                    <th>Fin</th>
                    <th>Error</th>
                    <th>PR</th>
                  </tr>
                </thead>
                <tbody>
                  {tenantOperations.isLoading && <SkeletonTableRows columns={7} rows={4} />}
                  {!tenantOperations.isLoading && (tenantOperations.data?.items.length ?? 0) === 0 && (
                    <tr>
                      <td colSpan={7}>
                        <EmptyState title="Sin operaciones registradas" description="Aún no hay operaciones para este tenant." />
                      </td>
                    </tr>
                  )}
                  {tenantOperations.data?.items.map((item) => (
                    <tr key={item.operationId}>
                      <td>
                        <button type="button" className="linkish" onClick={() => trackOperation(item.operationId)}>
                          {item.operationId}
                        </button>
                      </td>
                      <td>{item.operationType}</td>
                      <td>
                        <OperationStatusBadge status={item.status} />
                      </td>
                      <td>{formatDate(item.startedAt)}</td>
                      <td>{formatDate(item.endedAt)}</td>
                      <td>{item.errorSummary ?? 'n/a'}</td>
                      <td>
                        {item.pullRequest?.url ? (
                          <a href={item.pullRequest.url} target="_blank" rel="noreferrer">
                            #{item.pullRequest.numero} · {formatPullRequestState(item.pullRequest.estado)}
                          </a>
                        ) : (
                          'n/a'
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {!trackedOperationId && (
              <p className="detail-subtext">
                Sin operación en seguimiento. Selecciona una del historial para ver el tracking detallado.
              </p>
            )}
          </article>
        </div>

        <aside className="detail-side">
          <article className="panel detail-info-card">
            <h3>Readiness</h3>
            {!readiness.data && <p>Consultando readiness...</p>}
            {readiness.data && (
              <div className="readiness-list">
                <div>
                  <span>Ready for ingestion</span>
                  <strong>{readiness.data.readyForIngestion ? 'YES' : 'NO'}</strong>
                </div>
                <div>
                  <span>Data plane ready</span>
                  <strong>{readiness.data.dataPlaneReady ? 'YES' : 'NO'}</strong>
                </div>
                <div>
                  <span>Argo ready</span>
                  <strong>{readiness.data.argoReady ? 'YES' : 'NO'}</strong>
                </div>
                <div>
                  <span>Data plane status</span>
                  <strong>{readiness.data.dataPlaneStatus}</strong>
                </div>
              </div>
            )}
          </article>

          <article className="panel detail-info-card">
            <h3>General</h3>
            <dl className="detail-kv">
              <div>
                <dt>ERP</dt>
                <dd>
                  {tenant.erpType} · {tenant.integrationMode}
                </dd>
              </div>
              <div>
                <dt>Environment</dt>
                <dd>{tenant.environment}</dd>
              </div>
              <div>
                <dt>Resources</dt>
                <dd>
                  {tenant.cpu} CPU / {tenant.memoryGib}Gi
                </dd>
              </div>
              <div>
                <dt>Modules</dt>
                <dd>{tenant.modules.join(' ')}</dd>
              </div>
              <div>
                <dt>Tracking activo</dt>
                <dd>{trackedOperationId || 'n/a'}</dd>
              </div>
            </dl>
          </article>

          <article className="panel detail-info-card">
            <h3>Pull Request</h3>
            {pullRequestError && <p className="error-inline">{friendlyError(pullRequestError.code, pullRequestError.message)}</p>}
            {!pullRequestError && !pullRequest.data && <p>Consultando estado del PR...</p>}
            {pullRequest.data && (
              <dl className="detail-kv">
                <div>
                  <dt>Estado</dt>
                  <dd>{formatPullRequestState(pullRequest.data.estado)}</dd>
                </div>
                <div>
                  <dt>Número</dt>
                  <dd>{pullRequest.data.numero ?? 'n/a'}</dd>
                </div>
                <div>
                  <dt>URL</dt>
                  <dd className="word-break">
                    {pullRequest.data.url ? (
                      <a href={pullRequest.data.url} target="_blank" rel="noreferrer">
                        Abrir pull request
                      </a>
                    ) : (
                      'n/a'
                    )}
                  </dd>
                </div>
              </dl>
            )}
          </article>

          <article className="panel detail-info-card">
            <h3>GitOps</h3>
            <dl className="detail-kv">
              <div>
                <dt>Branch</dt>
                <dd>{tenant.gitOps.branch ?? 'n/a'}</dd>
              </div>
              <div>
                <dt>Reference</dt>
                <dd className="word-break">{tenant.gitOps.lastReference ?? 'n/a'}</dd>
              </div>
              <div>
                <dt>Repo</dt>
                <dd className="word-break">{tenant.gitOps.repositoryUrl ?? 'n/a'}</dd>
              </div>
            </dl>
          </article>

          <article className="panel detail-info-card">
            <h3>Argo CD</h3>
            <dl className="detail-kv">
              <div>
                <dt>Application</dt>
                <dd>{tenant.argoCd.applicationName ?? 'n/a'}</dd>
              </div>
              <div>
                <dt>Sync</dt>
                <dd>{tenant.argoCd.syncStatus}</dd>
              </div>
              <div>
                <dt>Health</dt>
                <dd>{tenant.argoCd.healthStatus}</dd>
              </div>
              <div>
                <dt>Ready</dt>
                <dd>{tenant.argoCd.ready ? 'yes' : 'no'}</dd>
              </div>
            </dl>
          </article>

          <article className="panel detail-info-card">
            <h3>Data Platform</h3>
            <dl className="detail-kv">
              <div>
                <dt>Tenant UUID</dt>
                <dd className="detail-copy-row word-break">
                  <span>{tenant.dataPlatform.tenantUuid}</span>
                  <button type="button" onClick={() => copyField('tenantUuid', tenant.dataPlatform.tenantUuid)}>
                    {copiedField === 'tenantUuid' ? 'Copiado' : 'Copiar'}
                  </button>
                </dd>
              </div>
              <div>
                <dt>Schema prefix</dt>
                <dd className="detail-copy-row word-break">
                  <span>{tenant.dataPlatform.schemaPrefix}</span>
                  <button type="button" onClick={() => copyField('schemaPrefix', tenant.dataPlatform.schemaPrefix)}>
                    {copiedField === 'schemaPrefix' ? 'Copiado' : 'Copiar'}
                  </button>
                </dd>
              </div>
              <div>
                <dt>ODS</dt>
                <dd>{tenant.dataPlatform.odsSchema}</dd>
              </div>
              <div>
                <dt>Staging</dt>
                <dd>{tenant.dataPlatform.stagingSchema}</dd>
              </div>
              <div>
                <dt>Dimensional</dt>
                <dd>{tenant.dataPlatform.dimensionalSchema}</dd>
              </div>
              <div>
                <dt>Cube</dt>
                <dd>{tenant.dataPlatform.cubeSchema}</dd>
              </div>
              <div>
                <dt>Bootstrap</dt>
                <dd>{tenant.dataPlatform.bootstrapStatus}</dd>
              </div>
              <div>
                <dt>Bootstrap at</dt>
                <dd>{formatDate(tenant.dataPlatform.bootstrapAt)}</dd>
              </div>
            </dl>
          </article>
        </aside>
      </div>
    </section>
  )
}
