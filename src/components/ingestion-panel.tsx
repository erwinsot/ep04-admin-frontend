import { useEffect, useState } from 'react'
import type { UseQueryResult } from '@tanstack/react-query'
import { EmptyState } from '@/components/empty-state'
import { RefreshIcon } from '@/components/icons'
import { SkeletonTableRows } from '@/components/skeleton-table-rows'
import { ACTIVE_INGESTION_STATUSES } from '@/constants/catalogs'
import { useIngestionLogs, useTriggerIngestion } from '@/features/tenants/hooks'
import { ApiError } from '@/lib/api'
import { friendlyError } from '@/lib/error-messages'
import { cn, formatDate, formatSeconds } from '@/lib/utils'
import type { IngestionRunsResponse, IngestionStatus, IngestionTrigger } from '@/types/ep04'

const STATUS_BADGE: Record<IngestionStatus, string> = {
  PENDING: 'b-p',
  RUNNING: 'b-v',
  SUCCEEDED: 'b-ok',
  FAILED: 'b-f',
}

const TRIGGER_LABEL: Record<IngestionTrigger, string> = {
  SCHEDULED: 'Programada',
  MANUAL: 'Manual',
}

function LogsModal({ tenantId, runName, onClose }: { tenantId: string; runName: string; onClose: () => void }) {
  const logs = useIngestionLogs(tenantId, runName, true)
  const error = logs.error as ApiError | null

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-label="Logs de la corrida"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="modal-head">
          <div>
            <h2>Logs de la corrida</h2>
            <span className="mono">{runName}</span>
          </div>
          <div className="modal-actions">
            <button type="button" className="btn" onClick={() => logs.refetch()} disabled={logs.isFetching}>
              <RefreshIcon /> {logs.isFetching ? 'Actualizando…' : 'Actualizar'}
            </button>
            <button type="button" className="btn" onClick={onClose} autoFocus>
              Cerrar
            </button>
          </div>
        </header>

        <div className="modal-body">
          {logs.isLoading && (
            <div className="stack-lg" style={{ gap: 12 }}>
              <div className="skeleton-line skeleton-line-2" />
              <div className="skeleton-line skeleton-line-0" />
              <div className="skeleton-line skeleton-line-1" />
            </div>
          )}
          {error && <div className="error-box">{friendlyError(error.code, error.message)}</div>}
          {logs.data && <pre className="log-view">{logs.data.logs || 'La corrida no ha generado salida todavía.'}</pre>}
        </div>
      </div>
    </div>
  )
}

type IngestionPanelProps = {
  tenantId: string
  runs: UseQueryResult<IngestionRunsResponse, Error>
  readyForIngestion: boolean
}

export function IngestionPanel({ tenantId, runs, readyForIngestion }: IngestionPanelProps) {
  const trigger = useTriggerIngestion()
  const [logRun, setLogRun] = useState<string | null>(null)

  const items = runs.data?.runs ?? []
  const hasActive = items.some((run) => ACTIVE_INGESTION_STATUSES.includes(run.status))
  const canRun = readyForIngestion && !hasActive && !trigger.isPending

  const runsError = runs.error as ApiError | null
  const triggerError = trigger.error as ApiError | null

  return (
    <section className="panel">
      <div className="panel-head">
        <div>
          <h2>Ingesta</h2>
          <p className="panel-note note-flush">
            Una corrida programada carga los CSV subidos a S3 cada 5 minutos. Puedes forzarla sin esperar.
          </p>
        </div>
        <div className="modal-actions">
          <button type="button" className="btn" onClick={() => runs.refetch()} disabled={runs.isFetching}>
            <RefreshIcon /> Actualizar
          </button>
          <button type="button" className="btn pri" onClick={() => trigger.mutate(tenantId)} disabled={!canRun}>
            {trigger.isPending ? 'Lanzando…' : 'Ejecutar ahora'}
          </button>
        </div>
      </div>

      {!readyForIngestion && (
        <p className="panel-note">El tenant debe estar listo para ingesta (readiness) para ejecutar una corrida.</p>
      )}
      {readyForIngestion && hasActive && (
        <p className="panel-note">Hay una corrida en curso; podrás lanzar otra cuando termine.</p>
      )}

      {triggerError && <div className="error-box panel-gap">{friendlyError(triggerError.code, triggerError.message)}</div>}
      {runsError && <div className="error-box panel-gap">{friendlyError(runsError.code, runsError.message)}</div>}

      <div className="tbl panel-gap">
        <table>
          <thead>
            <tr>
              <th>Corrida</th>
              <th>Origen</th>
              <th>Estado</th>
              <th>Inicio</th>
              <th>Duración</th>
              <th>Lanzada por</th>
              <th>Mensaje</th>
              <th>Logs</th>
            </tr>
          </thead>
          <tbody>
            {runs.isLoading && <SkeletonTableRows columns={8} rows={3} />}
            {!runs.isLoading && !runsError && items.length === 0 && (
              <tr>
                <td colSpan={8}>
                  <EmptyState
                    title="Sin corridas de ingesta"
                    description="Aún no hay corridas. La primera programada se ejecutará en pocos minutos o puedes lanzarla manualmente."
                  />
                </td>
              </tr>
            )}
            {items.map((run) => (
              <tr key={run.name}>
                <td className="mono">{run.name}</td>
                <td>{TRIGGER_LABEL[run.trigger] ?? run.trigger}</td>
                <td>
                  <span className={cn('badge', STATUS_BADGE[run.status] ?? 'b-n')}>{run.status}</span>
                </td>
                <td className="nw">{formatDate(run.startedAt)}</td>
                <td className="nw">{run.finishedAt ? formatSeconds(run.durationSeconds) : 'En curso'}</td>
                <td>{run.triggeredBy ?? <span className="na">n/a</span>}</td>
                <td>{run.message ?? <span className="na">n/a</span>}</td>
                <td>
                  <button type="button" className="linkbtn" onClick={() => setLogRun(run.name)}>
                    Ver logs
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="panel-note">
        El estado corresponde al Job de Kubernetes; no indica cuántos archivos o filas se cargaron. Consulta los logs
        para el detalle.
      </p>

      {logRun && <LogsModal tenantId={tenantId} runName={logRun} onClose={() => setLogRun(null)} />}
    </section>
  )
}
