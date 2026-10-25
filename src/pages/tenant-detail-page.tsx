import { Link, useParams, useSearchParams } from 'react-router-dom'
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

export function TenantDetailPage() {
  const { tenantId = '' } = useParams()
  const [searchParams, setSearchParams] = useSearchParams()

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
      `Se solicitara la baja del tenant ${tenant.tenantId}. Esto iniciara una operacion DELETE asyncrona. Deseas continuar?`,
    )
    if (!confirmed) return
    const response = await deleteMutation.mutateAsync(tenant.tenantId)
    trackOperation(response.operationId)
  }

  return (
    <section className="stack-lg">
      <div className="page-head">
        <div>
          <h1>{tenant.tenantId}</h1>
          <p>
            {tenant.companyName} ({tenant.country})
          </p>
        </div>
        <div className="head-actions">
          <StatusBadge status={tenant.status} />
          {tenant.status === 'FAILED' && (
            <button
              type="button"
              className="btn warning"
              disabled={retryMutation.isPending}
              onClick={handleRetry}
            >
              {retryMutation.isPending ? 'Procesando retry...' : 'Retry'}
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

      <div className="status-spotlight panel">
        <div>
          <span>Tenant status</span>
          <strong>{tenant.status}</strong>
        </div>
        <div>
          <span>Tracking activo</span>
          <strong>{trackedOperationId || 'n/a'}</strong>
        </div>
        <div>
          <span>Ultima actualizacion</span>
          <strong>{formatDate(tenant.updatedAt)}</strong>
        </div>
      </div>

      {retryError && <div className="error-box">{friendlyError(retryError.code, retryError.message)}</div>}
      {deleteError && <div className="error-box">{friendlyError(deleteError.code, deleteError.message)}</div>}

      <div className="grid-3">
        <article className="panel">
          <h3>General</h3>
          <dl>
            <dt>ERP</dt>
            <dd>
              {tenant.erpType} / {tenant.integrationMode}
            </dd>
            <dt>Environment</dt>
            <dd>{tenant.environment}</dd>
            <dt>Resources</dt>
            <dd>
              {tenant.cpu} CPU / {tenant.memoryGib}Gi
            </dd>
            <dt>Modules</dt>
            <dd>{tenant.modules.join(', ')}</dd>
            <dt>Updated</dt>
            <dd>{formatDate(tenant.updatedAt)}</dd>
          </dl>
        </article>

        <article className="panel">
          <h3>Pull Request</h3>
          {pullRequestError && <p className="error-inline">{friendlyError(pullRequestError.code, pullRequestError.message)}</p>}
          {!pullRequestError && !pullRequest.data && <p>Consultando estado del PR...</p>}
          {pullRequest.data && (
            <dl>
              <dt>Estado</dt>
              <dd>{pullRequest.data.estado}</dd>
              <dt>Numero</dt>
              <dd>{pullRequest.data.numero ?? 'n/a'}</dd>
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
            </dl>
          )}
        </article>

        <article className="panel">
          <h3>GitOps</h3>
          <dl>
            <dt>Branch</dt>
            <dd>{tenant.gitOps.branch ?? 'n/a'}</dd>
            <dt>Repo</dt>
            <dd className="word-break">{tenant.gitOps.repositoryUrl ?? 'n/a'}</dd>
            <dt>Reference</dt>
            <dd className="word-break">{tenant.gitOps.lastReference ?? 'n/a'}</dd>
          </dl>
        </article>

        <article className="panel">
          <h3>Argo CD</h3>
          <dl>
            <dt>Application</dt>
            <dd>{tenant.argoCd.applicationName ?? 'n/a'}</dd>
            <dt>Sync</dt>
            <dd>{tenant.argoCd.syncStatus}</dd>
            <dt>Health</dt>
            <dd>{tenant.argoCd.healthStatus}</dd>
            <dt>Ready</dt>
            <dd>{tenant.argoCd.ready ? 'yes' : 'no'}</dd>
          </dl>
        </article>
      </div>

      <div className="grid-2">
        <article className="panel">
          <h3>Operacion en seguimiento</h3>
          {!trackedOperationId && (
            <EmptyState
              title="Sin operacion en seguimiento"
              description="Selecciona una operacion del historial para activar el tracking detallado."
            />
          )}
          {trackedOperationId && operation.isLoading && <p>Consultando operacion {trackedOperationId}...</p>}
          {trackedOperationId && operationError && (
            <div className="error-box">{friendlyError(operationError.code, operationError.message)}</div>
          )}
          {operation.data && (
            <dl>
              <dt>Operation ID</dt>
              <dd className="word-break">{operation.data.operationId}</dd>
              <dt>Tipo</dt>
              <dd>{operation.data.operationType}</dd>
              <dt>Estado</dt>
              <dd>
                <OperationStatusBadge status={operation.data.status} />
              </dd>
              <dt>Intento</dt>
              <dd>{operation.data.attemptNumber}</dd>
              <dt>Solicitado por</dt>
              <dd>{operation.data.requestedBy}</dd>
              <dt>Inicio</dt>
              <dd>{formatDate(operation.data.startedAt)}</dd>
              <dt>Fin</dt>
              <dd>{formatDate(operation.data.endedAt)}</dd>
              <dt>Error</dt>
              <dd>{operation.data.errorSummary ?? 'n/a'}</dd>
            </dl>
          )}
        </article>

        <article className="panel">
          <h3>Data Platform</h3>
          <dl>
            <dt>Tenant UUID</dt>
            <dd className="word-break">{tenant.dataPlatform.tenantUuid}</dd>
            <dt>Schema prefix</dt>
            <dd>{tenant.dataPlatform.schemaPrefix}</dd>
            <dt>ODS</dt>
            <dd>{tenant.dataPlatform.odsSchema}</dd>
            <dt>Staging</dt>
            <dd>{tenant.dataPlatform.stagingSchema}</dd>
            <dt>Dimensional</dt>
            <dd>{tenant.dataPlatform.dimensionalSchema}</dd>
            <dt>Cube</dt>
            <dd>{tenant.dataPlatform.cubeSchema}</dd>
            <dt>Bootstrap</dt>
            <dd>{tenant.dataPlatform.bootstrapStatus}</dd>
            <dt>Bootstrap at</dt>
            <dd>{formatDate(tenant.dataPlatform.bootstrapAt)}</dd>
          </dl>
        </article>

        <article className="panel">
          <h3>Readiness</h3>
          {!readiness.data && <p>Consultando readiness...</p>}
          {readiness.data && (
            <dl>
              <dt>Ready for ingestion</dt>
              <dd>{readiness.data.readyForIngestion ? 'yes' : 'no'}</dd>
              <dt>Data plane ready</dt>
              <dd>{readiness.data.dataPlaneReady ? 'yes' : 'no'}</dd>
              <dt>Argo ready</dt>
              <dd>{readiness.data.argoReady ? 'yes' : 'no'}</dd>
              <dt>Data plane status</dt>
              <dd>{readiness.data.dataPlaneStatus}</dd>
              <dt>Data plane error</dt>
              <dd>{readiness.data.dataPlaneError ?? 'n/a'}</dd>
              <dt>Message</dt>
              <dd>{readiness.data.message}</dd>
            </dl>
          )}
        </article>
      </div>

      <article className="panel">
        <h3>Historial de operaciones del tenant</h3>
        {tenantOperations.isLoading && (
          <div className="table-wrap">
            <table>
              <tbody>
                <SkeletonTableRows columns={7} rows={4} />
              </tbody>
            </table>
          </div>
        )}
        {!tenantOperations.isLoading && (tenantOperations.data?.items.length ?? 0) === 0 && (
          <EmptyState title="Sin operaciones registradas" description="Aun no hay operaciones para este tenant." />
        )}
        {tenantOperations.data && tenantOperations.data.items.length > 0 && (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Operacion</th>
                  <th>Tipo</th>
                  <th>Estado</th>
                  <th>Inicio</th>
                  <th>Fin</th>
                  <th>Error</th>
                  <th>PR</th>
                </tr>
              </thead>
              <tbody>
                {tenantOperations.data.items.map((item) => (
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
      </article>

      <article className="panel">
        <h3>Timeline de eventos</h3>
        {events.isLoading && (
          <ul className="timeline">
            {Array.from({ length: 3 }).map((_, index) => (
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
                  result={event.result} actor={event.actor} operation={event.operationId ?? 'n/a'}
                </small>
              </li>
            ))}
          </ul>
        )}
      </article>
    </section>
  )
}
