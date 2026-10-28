import { Link, useParams, useSearchParams } from 'react-router-dom'
import { useEffect, useMemo, useRef, useState } from 'react'
import { EmptyState } from '@/components/empty-state'
import { OperationStatusBadge } from '@/components/operation-status-badge'
import { SkeletonTableRows } from '@/components/skeleton-table-rows'
import { StatusBadge } from '@/components/status-badge'
import { AlertIcon, CheckIcon, CloseIcon, CopyIcon, DotsIcon } from '@/components/icons'
import { IngestionPanel } from '@/components/ingestion-panel'
import { StoragePanel } from '@/components/storage-panel'
import {
  useDeleteTenant,
  useIngestionRuns,
  useOperationDetail,
  useRetryTenant,
  useTenantDetail,
  useTenantEvents,
  useTenantOperations,
  useTenantPullRequest,
  useTenantReadiness,
} from '@/features/tenants/hooks'
import { cn, copyText, erpLabel, eventLabel, formatDate, formatRelativeDate, splitDateTime } from '@/lib/utils'
import { ApiError } from '@/lib/api'
import { friendlyError } from '@/lib/error-messages'
import {
  ACTIVE_STATUSES,
  READY_TENANT_STATUSES,
  TERMINAL_OPERATION_STATUSES,
  TERMINAL_TENANT_STATUSES,
} from '@/constants/catalogs'

const TENANT_OPERATIONS_PAGE_SIZE = 10

const STEP_LABEL: Record<string, string> = {
  CREATE_REQUESTED: 'Solicitud aceptada',
  VALIDATING: 'Restricciones validadas',
  PROVISIONING: 'Recursos para el PR',
  PULL_REQUEST_OPENED: 'Pull request abierto',
}

type Tone = 'ok' | 'bad' | 'warn'

function toneFromStatus(status: string | null | undefined): Tone {
  if (!status) return 'warn'
  const value = status.toUpperCase()
  if (value.includes('FAIL') || value.includes('ERROR')) return 'bad'
  if (/(READY|OK|COMPLETED|SUCCESS|DONE|HEALTHY)/.test(value)) return 'ok'
  return 'warn'
}

function ToneIcon({ tone }: { tone: Tone }) {
  if (tone === 'ok') return <CheckIcon />
  if (tone === 'bad') return <CloseIcon />
  return <DotsIcon />
}

function ReadinessRow({ label, tone, value }: { label: string; tone: Tone; value: string }) {
  return (
    <div className={cn('ready-row', tone)}>
      <span className="ic">
        <ToneIcon tone={tone} />
      </span>
      {label}
      <span className="v">{value}</span>
    </div>
  )
}

function shortSchema(value: string, prefix: string) {
  if (prefix && value.startsWith(prefix) && value.length > prefix.length) {
    return `…${prefix.slice(-5)}${value.slice(prefix.length)}`
  }
  return value
}

function compactOperationId(id: string) {
  return id.length > 30 ? `${id.slice(0, 14)}…${id.slice(-13)}` : id
}

function DateCell({ iso }: { iso: string | null }) {
  const parts = splitDateTime(iso)
  if (!parts) return <span className="na">n/a</span>
  return (
    <>
      {parts[0]}
      <br />
      {parts[1]}
    </>
  )
}

const PR_STATE_LABEL: Record<string, string> = {
  FUSIONADO: 'Fusionado',
  PENDIENTE_REVISION: 'Pendiente revisión',
  PENDIENTE_PUBLICACION: 'Pendiente publicación',
  CERRADO_SIN_FUSIONAR: 'Cerrado sin fusionar',
}

export function TenantDetailPage() {
  const { tenantId = '' } = useParams()
  const [searchParams, setSearchParams] = useSearchParams()
  const [copiedKey, setCopiedKey] = useState<string | null>(null)

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
  const tenantOperations = useTenantOperations(tenantId, { page: 0, size: TENANT_OPERATIONS_PAGE_SIZE }, shouldPoll)

  const ingestionEligible = detail.data ? READY_TENANT_STATUSES.includes(detail.data.status) : false
  const ingestionRuns = useIngestionRuns(tenantId, ingestionEligible)

  // Al detener el polling la ultima lectura puede ser anterior al estado final; se refresca una vez mas.
  const wasPolling = useRef(shouldPoll)
  useEffect(() => {
    if (wasPolling.current && !shouldPoll) {
      const options = { cancelRefetch: false }
      void readiness.refetch(options)
      void pullRequest.refetch(options)
      void events.refetch(options)
      void tenantOperations.refetch(options)
    }
    wasPolling.current = shouldPoll
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shouldPoll])
  const retryMutation = useRetryTenant()
  const deleteMutation = useDeleteTenant()

  const orderedEvents = useMemo(() => [...(events.data ?? [])].sort((a, b) => a.id - b.id), [events.data])

  // Un paso por acción (orden de aparición); el resultado refleja el último evento de esa acción.
  const flowSteps = useMemo(() => {
    const byAction = new Map<string, (typeof orderedEvents)[number]>()
    orderedEvents.forEach((event) => byAction.set(event.action, event))
    return [...byAction.values()].map((event) => ({
      code: event.action,
      bad: event.result === 'FAILED',
      description: STEP_LABEL[event.action] ?? event.details,
    }))
  }, [orderedEvents])

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
        <Link to="/" className="btn" style={{ width: 'fit-content' }}>
          Volver al listado
        </Link>
      </div>
    )
  }

  const tenant = detail.data
  const retryError = retryMutation.error as ApiError | null
  const deleteError = deleteMutation.error as ApiError | null
  const canDelete = tenant.status !== 'DELETED'
  const isBusy = ACTIVE_STATUSES.includes(tenant.status)
  const ingestionHidden = (ingestionRuns.error as ApiError | null)?.code === 'KUBERNETES_DISABLED'
  const showIngestionTab = ingestionEligible && !ingestionHidden
  const activeTab = showIngestionTab && searchParams.get('tab') === 'ingesta' ? 'ingesta' : 'resumen'
  const hasActiveRun = ingestionRuns.data?.runs.some((run) => run.status === 'PENDING' || run.status === 'RUNNING')
  const isFailed = tenant.status === 'FAILED' || operation.data?.status === 'FAILED'

  const latestFailedEvent = [...orderedEvents].reverse().find((event) => event.result === 'FAILED')
  const alertTitle =
    operation.data?.errorSummary ??
    latestFailedEvent?.details ??
    readiness.data?.dataPlaneError ??
    'El aprovisionamiento falló'
  const timelineOperationId =
    trackedOperationId || events.data?.[0]?.operationId || tenantOperations.data?.items[0]?.operationId || ''

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

  const selectTab = (next: 'resumen' | 'ingesta') => {
    const params = new URLSearchParams(searchParams)
    if (next === 'ingesta') params.set('tab', 'ingesta')
    else params.delete('tab')
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

  const platform = tenant.dataPlatform
  const prefix = platform.schemaPrefix

  return (
    <section className="stack-lg">
      <div className="detail-top">
        <Link to="/" className="back">
          ← Tenants
        </Link>
        <div className="detail-head">
          <div>
            <div className="detail-title">
              <h1>
                {tenant.companyName} <span>({tenant.country})</span>
              </h1>
              <StatusBadge status={tenant.status} />
            </div>
            <div className="mono detail-sub">
              {tenant.tenantId} · Actualizado {formatRelativeDate(tenant.updatedAt).toLowerCase()}
            </div>
          </div>
          <div className="detail-actions">
            {tenant.status === 'FAILED' && (
              <button type="button" className="btn pri" disabled={retryMutation.isPending} onClick={handleRetry}>
                {retryMutation.isPending ? 'Reintentando…' : 'Reintentar'}
              </button>
            )}
            {canDelete && (
              <button
                type="button"
                className="btn dng"
                disabled={deleteMutation.isPending || isBusy}
                title={isBusy ? 'Hay una operación en curso para este tenant' : undefined}
                onClick={handleDelete}
              >
                {deleteMutation.isPending ? 'Solicitando baja…' : 'Eliminar tenant'}
              </button>
            )}
            {trackedOperationId && (
              <button type="button" className="btn" onClick={clearTrackedOperation}>
                Ocultar tracking
              </button>
            )}
          </div>
        </div>
      </div>

      {isFailed && (
        <section className="alert" role="alert">
          <div className="ai">
            <AlertIcon />
          </div>
          <div>
            <b>{alertTitle}</b>
            <span>{readiness.data?.message ?? 'Tenant is not ready yet; check dataPlaneStatus and argoCd status.'}</span>
          </div>
        </section>
      )}

      {retryError && <div className="error-box">{friendlyError(retryError.code, retryError.message)}</div>}
      {deleteError && <div className="error-box">{friendlyError(deleteError.code, deleteError.message)}</div>}
      {operationError && <div className="error-box">{friendlyError(operationError.code, operationError.message)}</div>}

      {showIngestionTab && (
        <div className="tabs" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'resumen'}
            className={cn('tab', activeTab === 'resumen' && 'active')}
            onClick={() => selectTab('resumen')}
          >
            Resumen
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'ingesta'}
            className={cn('tab', activeTab === 'ingesta' && 'active')}
            onClick={() => selectTab('ingesta')}
          >
            Ingesta
            {hasActiveRun && <span className="tab-dot" aria-label="Corrida en curso" />}
          </button>
        </div>
      )}

      <div className="detail-grid">
        <div className="col">
          {activeTab === 'ingesta' ? (
            <IngestionPanel
              tenantId={tenant.tenantId}
              runs={ingestionRuns}
              readyForIngestion={readiness.data?.readyForIngestion === true}
            />
          ) : (
            <>
          <section className="panel">
            <h2>Progreso del aprovisionamiento</h2>
            {flowSteps.length === 0 ? (
              <p className="panel-note" style={{ margin: 0 }}>
                {events.isLoading ? 'Consultando eventos…' : 'Aún no hay eventos de aprovisionamiento.'}
              </p>
            ) : (
              <div className="flow">
                {flowSteps.map((step) => (
                  <div key={step.code} className={cn('s', step.bad ? 'bad' : 'ok')}>
                    <b>{step.code}</b>
                    <span>{step.description}</span>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="panel">
            <h2>Timeline de eventos</h2>
            {timelineOperationId && <div className="mono tl-sub">Operación {timelineOperationId}</div>}

            {events.isLoading && (
              <div className="stack-lg" style={{ gap: 12 }}>
                <div className="skeleton-line skeleton-line-2" />
                <div className="skeleton-line skeleton-line-0" />
                <div className="skeleton-line skeleton-line-1" />
              </div>
            )}

            {!events.isLoading && (events.data?.length ?? 0) === 0 && (
              <EmptyState title="Sin eventos" description="No se encontraron eventos para este tenant por ahora." />
            )}

            {(events.data?.length ?? 0) > 0 && (
              <ol className="tl">
                {events.data?.map((event) => (
                  <li key={event.id}>
                    <span className={cn('dot', event.result === 'FAILED' && 'bad')} />
                    <div className="h">
                      <b title={event.action}>{eventLabel(event.action)}</b>
                      <span>{formatDate(event.createdAt)}</span>
                    </div>
                    <p>{event.details}</p>
                    <span className={cn('pill', event.result === 'FAILED' && 'bad')}>result={event.result}</span>
                    <span className="pill">actor={event.actor}</span>
                  </li>
                ))}
              </ol>
            )}
          </section>

          <section className="panel">
            <h2>Historial de operaciones</h2>
            <div className="tbl">
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
                  {tenantOperations.isLoading && <SkeletonTableRows columns={7} rows={3} />}
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
                        <button
                          type="button"
                          className="linkbtn mono"
                          title={item.operationId}
                          onClick={() => trackOperation(item.operationId)}
                        >
                          {compactOperationId(item.operationId)}
                        </button>
                      </td>
                      <td>{item.operationType}</td>
                      <td>
                        <OperationStatusBadge status={item.status} />
                      </td>
                      <td className="nw">
                        <DateCell iso={item.startedAt} />
                      </td>
                      <td className="nw">
                        <DateCell iso={item.endedAt} />
                      </td>
                      <td>{item.errorSummary ?? <span className="na">n/a</span>}</td>
                      <td>
                        {item.pullRequest?.url ? (
                          <a href={item.pullRequest.url} target="_blank" rel="noreferrer">
                            #{item.pullRequest.numero} · {PR_STATE_LABEL[item.pullRequest.estado] ?? item.pullRequest.estado}
                          </a>
                        ) : (
                          <span className="na">n/a</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {!trackedOperationId && (
              <div className="panel-note">
                Sin operación en seguimiento. Selecciona una del historial para ver el tracking detallado.
              </div>
            )}

            {trackedOperationId && (
              <div className="track">
                {operation.isLoading && <p className="panel-note">Consultando operación {trackedOperationId}…</p>}
                {operation.data && (
                  <dl>
                    <div className="kv-row">
                      <dt>Operation ID</dt>
                      <dd className="mono">{operation.data.operationId}</dd>
                    </div>
                    <div className="kv-row">
                      <dt>Tipo</dt>
                      <dd>{operation.data.operationType}</dd>
                    </div>
                    <div className="kv-row">
                      <dt>Estado</dt>
                      <dd>
                        <OperationStatusBadge status={operation.data.status} />
                      </dd>
                    </div>
                    <div className="kv-row">
                      <dt>Intento</dt>
                      <dd>{operation.data.attemptNumber}</dd>
                    </div>
                    <div className="kv-row">
                      <dt>Solicitado por</dt>
                      <dd>{operation.data.requestedBy}</dd>
                    </div>
                    <div className="kv-row">
                      <dt>Inicio</dt>
                      <dd>{formatDate(operation.data.startedAt)}</dd>
                    </div>
                    <div className="kv-row">
                      <dt>Fin</dt>
                      <dd>{formatDate(operation.data.endedAt)}</dd>
                    </div>
                    <div className="kv-row">
                      <dt>Error</dt>
                      <dd>{operation.data.errorSummary ?? <span className="na">n/a</span>}</dd>
                    </div>
                  </dl>
                )}
              </div>
            )}
          </section>
            </>
          )}
        </div>

        <aside className="col">
          <section className="panel">
            <h2>Readiness</h2>
            {!readiness.data && <p className="panel-note" style={{ margin: 0 }}>Consultando readiness…</p>}
            {readiness.data && (
              <>
                <ReadinessRow
                  label="Ready for ingestion"
                  tone={readiness.data.readyForIngestion ? 'ok' : 'bad'}
                  value={readiness.data.readyForIngestion ? 'YES' : 'NO'}
                />
                <ReadinessRow
                  label="Data plane ready"
                  tone={readiness.data.dataPlaneReady ? 'ok' : 'bad'}
                  value={readiness.data.dataPlaneReady ? 'YES' : 'NO'}
                />
                <ReadinessRow
                  label="Argo ready"
                  tone={readiness.data.argoReady ? 'ok' : 'bad'}
                  value={readiness.data.argoReady ? 'YES' : 'NO'}
                />
                <ReadinessRow
                  label="Data plane status"
                  tone={toneFromStatus(readiness.data.dataPlaneStatus)}
                  value={readiness.data.dataPlaneStatus}
                />
              </>
            )}
          </section>

          <StoragePanel key={tenant.tenantId} tenantId={tenant.tenantId} status={tenant.status} />

          <section className="panel">
            <h2>General</h2>
            <dl>
              <div className="kv-row">
                <dt>ERP</dt>
                <dd>
                  {erpLabel(tenant.erpType)} · {tenant.integrationMode}
                </dd>
              </div>
              <div className="kv-row">
                <dt>Environment</dt>
                <dd>{tenant.environment}</dd>
              </div>
              <div className="kv-row">
                <dt>Resources</dt>
                <dd>
                  {tenant.cpu} CPU / {tenant.memoryGib}Gi
                </dd>
              </div>
              <div className="kv-row">
                <dt>Modules</dt>
                <dd className="tags">
                  {tenant.modules.map((module) => (
                    <span key={module} className="tag">
                      {module}
                    </span>
                  ))}
                </dd>
              </div>
              <div className="kv-row">
                <dt>Tracking activo</dt>
                <dd className={cn(!trackedOperationId && 'na')}>
                  {trackedOperationId ? <span className="mono">{trackedOperationId}</span> : 'n/a'}
                </dd>
              </div>
            </dl>
          </section>

          <section className="panel">
            <h2>Pull Request</h2>
            {pullRequestError &&
              (pullRequestError.code === 'PULL_REQUEST_NOT_FOUND' ? (
                <p className="panel-note note-flush">{friendlyError(pullRequestError.code, pullRequestError.message)}</p>
              ) : (
                <div className="error-box">{friendlyError(pullRequestError.code, pullRequestError.message)}</div>
              ))}
            {!pullRequestError && !pullRequest.data && <p className="panel-note" style={{ margin: 0 }}>Consultando estado del PR…</p>}
            {pullRequest.data && (
              <dl>
                <div className="kv-row">
                  <dt>Estado</dt>
                  <dd>
                    <span className="tag">{PR_STATE_LABEL[pullRequest.data.estado] ?? pullRequest.data.estado}</span>
                  </dd>
                </div>
                <div className="kv-row">
                  <dt>Número</dt>
                  <dd className={cn(pullRequest.data.numero === null && 'na')}>{pullRequest.data.numero ?? 'n/a'}</dd>
                </div>
                <div className="kv-row">
                  <dt>URL</dt>
                  <dd className={cn(!pullRequest.data.url && 'na')}>
                    {pullRequest.data.url ? (
                      <a className="tlink" href={pullRequest.data.url} target="_blank" rel="noreferrer">
                        Abrir pull request
                      </a>
                    ) : (
                      'n/a'
                    )}
                  </dd>
                </div>
              </dl>
            )}
            {pullRequest.data?.estado === 'PENDIENTE_PUBLICACION' && (
              <p className="panel-note">El Pull Request se está publicando en GitHub.</p>
            )}
            {pullRequest.data?.estado === 'PENDIENTE_REVISION' && (
              <p className="panel-note">
                Pendiente de revisión/merge: una persona debe revisar y fusionar el PR en GitHub para continuar.
              </p>
            )}
          </section>

          <section className="panel">
            <h2>GitOps</h2>
            <dl>
              <div className="kv-row">
                <dt>Branch</dt>
                <dd className="mono">{tenant.gitOps.branch ?? 'n/a'}</dd>
              </div>
              <div className="kv-row">
                <dt>Reference</dt>
                <dd className={cn(!tenant.gitOps.lastReference ? 'na' : 'mono')}>{tenant.gitOps.lastReference ?? 'n/a'}</dd>
              </div>
              <div className="kv-stack">
                <dt>Repo</dt>
                <dd>
                  <span className={cn(tenant.gitOps.repositoryUrl ? 'mono' : 'na')}>{tenant.gitOps.repositoryUrl ?? 'n/a'}</span>
                </dd>
              </div>
            </dl>
          </section>

          <section className="panel">
            <h2>Argo CD</h2>
            <dl>
              <div className="kv-row">
                <dt>Application</dt>
                <dd className="mono">{tenant.argoCd.applicationName ?? 'n/a'}</dd>
              </div>
              <div className="kv-row">
                <dt>Sync</dt>
                <dd>
                  <span className="tag">{tenant.argoCd.syncStatus}</span>
                </dd>
              </div>
              <div className="kv-row">
                <dt>Health</dt>
                <dd>
                  <span className="tag">{tenant.argoCd.healthStatus}</span>
                </dd>
              </div>
              <div className="kv-row">
                <dt>Ready</dt>
                <dd>{tenant.argoCd.ready ? 'yes' : 'no'}</dd>
              </div>
            </dl>
          </section>

          <section className="panel">
            <h2>Data Platform</h2>
            <dl>
              <div className="kv-stack">
                <dt>Tenant UUID</dt>
                <dd>
                  <span className="mono">{platform.tenantUuid}</span>
                  {copyButton('tenantUuid', 'Tenant UUID', platform.tenantUuid)}
                </dd>
              </div>
              <div className="kv-stack">
                <dt>Schema prefix</dt>
                <dd>
                  <span className="mono">{prefix}</span>
                  {copyButton('schemaPrefix', 'Schema prefix', prefix)}
                </dd>
              </div>
              {(
                [
                  ['ODS', platform.odsSchema],
                  ['Staging', platform.stagingSchema],
                  ['Dimensional', platform.dimensionalSchema],
                  ['Cube', platform.cubeSchema],
                ] as const
              ).map(([label, value]) => (
                <div key={label} className="kv-stack">
                  <dt>{label}</dt>
                  <dd>
                    <span className="mono" title={value}>
                      {shortSchema(value, prefix)}
                    </span>
                  </dd>
                </div>
              ))}
              <div className="kv-row" style={{ marginTop: 4 }}>
                <dt>Bootstrap</dt>
                <dd>
                  <span
                    className={cn(
                      'badge',
                      toneFromStatus(platform.bootstrapStatus) === 'bad'
                        ? 'b-f'
                        : toneFromStatus(platform.bootstrapStatus) === 'ok'
                          ? 'b-ok'
                          : 'b-p',
                    )}
                  >
                    {platform.bootstrapStatus}
                  </span>
                </dd>
              </div>
              <div className="kv-row">
                <dt>Bootstrap at</dt>
                <dd className={cn(!platform.bootstrapAt && 'na')}>{formatDate(platform.bootstrapAt)}</dd>
              </div>
            </dl>
          </section>
        </aside>
      </div>
    </section>
  )
}
