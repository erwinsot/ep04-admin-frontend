import { env } from '@/lib/config'
import { UNAUTHORIZED_EVENT, loadSession } from '@/lib/auth'
import type {
  CreateTenantRequest,
  ErrorResponse,
  HealthResponse,
  IngestionRun,
  IngestionRunLogs,
  IngestionRunsResponse,
  OperationStatus,
  OperationType,
  OperationAcceptedResponse,
  PagedResponse,
  ProvisioningOperation,
  PullRequestStatus,
  StorageInfo,
  TenantDetail,
  TenantEvent,
  TenantReadiness,
  TenantSummary,
  TenantStatus,
} from '@/types/ep04'

export class ApiError extends Error {
  status: number
  code?: string
  timestamp?: string

  constructor(status: number, message: string, code?: string, timestamp?: string) {
    super(message)
    this.status = status
    this.code = code
    this.timestamp = timestamp
  }
}

type RequestOptions = {
  method?: 'GET' | 'POST' | 'DELETE'
  body?: unknown
  idempotencyKey?: string
}

function requiresAdminHeader(path: string): boolean {
  const pathname = path.split('?')[0]
  return /^\/api\/v1\/(tenants|operations|catalogs)(\/|$)/.test(pathname)
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const headers = new Headers()
  headers.set('Accept', 'application/json')

  if (requiresAdminHeader(path)) {
    headers.set('X-Admin-Role', env.adminRole)
  }

  const session = loadSession()
  const actor = session?.username ?? env.actor
  if (actor) {
    headers.set('X-Actor', actor)
  }

  if (session?.token) {
    headers.set('Authorization', `Bearer ${session.token}`)
  }

  if (options.idempotencyKey) {
    headers.set('Idempotency-Key', options.idempotencyKey)
  }

  let body: string | undefined
  if (options.body !== undefined) {
    headers.set('Content-Type', 'application/json')
    body = JSON.stringify(options.body)
  }

  const response = await fetch(`${env.apiBase}${path}`, {
    method: options.method ?? 'GET',
    headers,
    body,
  })

  const contentType = response.headers.get('content-type')
  const isJson = contentType?.includes('application/json')

  if (response.status === 401 && session) {
    window.dispatchEvent(new Event(UNAUTHORIZED_EVENT))
  }

  if (!response.ok) {
    const fallback = `HTTP ${response.status}`

    if (isJson) {
      const errorPayload = (await response.json()) as ErrorResponse
      throw new ApiError(
        response.status,
        errorPayload.message ?? fallback,
        errorPayload.code,
        errorPayload.timestamp,
      )
    }

    throw new ApiError(response.status, fallback)
  }

  if (!isJson) {
    return {} as T
  }

  return (await response.json()) as T
}

export function healthCheck() {
  return request<HealthResponse>('/api/v1/health')
}

export function listTenants(params: {
  page: number
  size: number
  q?: string
  status?: TenantStatus | ''
}) {
  const search = new URLSearchParams()
  search.set('page', String(params.page))
  search.set('size', String(params.size))
  if (params.q) search.set('q', params.q)
  if (params.status) search.set('status', params.status)

  return request<PagedResponse<TenantSummary>>(`/api/v1/tenants?${search.toString()}`)
}

export function getTenantDetail(tenantId: string) {
  return request<TenantDetail>(`/api/v1/tenants/${tenantId}`)
}

export function getTenantEvents(tenantId: string) {
  return request<TenantEvent[]>(`/api/v1/tenants/${tenantId}/events`)
}

export function getTenantReadiness(tenantId: string) {
  return request<TenantReadiness>(`/api/v1/tenants/${tenantId}/readiness`)
}

export function getTenantPullRequest(tenantId: string) {
  return request<PullRequestStatus>(`/api/v1/tenants/${tenantId}/pull-request`)
}

export function getTenantStorage(tenantId: string) {
  return request<StorageInfo>(`/api/v1/tenants/${tenantId}/storage`)
}

export function listIngestionRuns(tenantId: string, limit = 20) {
  return request<IngestionRunsResponse>(`/api/v1/tenants/${tenantId}/ingestion/runs?limit=${limit}`)
}

export function triggerIngestion(tenantId: string) {
  return request<IngestionRun>(`/api/v1/tenants/${tenantId}/ingestion/run`, { method: 'POST' })
}

export function getIngestionLogs(tenantId: string, runName: string, tail = 200) {
  return request<IngestionRunLogs>(
    `/api/v1/tenants/${tenantId}/ingestion/runs/${encodeURIComponent(runName)}/logs?tail=${tail}`,
  )
}

export function listTenantOperations(
  tenantId: string,
  params: {
    page: number
    size: number
    status?: OperationStatus | ''
    type?: OperationType | ''
  },
) {
  const search = new URLSearchParams()
  search.set('page', String(params.page))
  search.set('size', String(params.size))
  if (params.status) search.set('status', params.status)
  if (params.type) search.set('type', params.type)

  return request<PagedResponse<ProvisioningOperation>>(
    `/api/v1/tenants/${tenantId}/operations?${search.toString()}`,
  )
}

export function listOperations(params: {
  page: number
  size: number
  status?: OperationStatus | ''
  type?: OperationType | ''
  tenantId?: string
}) {
  const search = new URLSearchParams()
  search.set('page', String(params.page))
  search.set('size', String(params.size))
  if (params.status) search.set('status', params.status)
  if (params.type) search.set('type', params.type)
  if (params.tenantId) search.set('tenantId', params.tenantId)

  return request<PagedResponse<ProvisioningOperation>>(`/api/v1/operations?${search.toString()}`)
}

export function getOperationDetail(operationId: string) {
  return request<ProvisioningOperation>(`/api/v1/operations/${operationId}`)
}

export function createTenant(payload: CreateTenantRequest) {
  return request<OperationAcceptedResponse>('/api/v1/tenants', {
    method: 'POST',
    body: payload,
    idempotencyKey: crypto.randomUUID(),
  })
}

export function retryTenant(tenantId: string) {
  return request<OperationAcceptedResponse>(`/api/v1/tenants/${tenantId}/retry`, {
    method: 'POST',
    idempotencyKey: crypto.randomUUID(),
  })
}

export function deleteTenant(tenantId: string) {
  return request<OperationAcceptedResponse>(`/api/v1/tenants/${tenantId}`, {
    method: 'DELETE',
    idempotencyKey: crypto.randomUUID(),
  })
}
