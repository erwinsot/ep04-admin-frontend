export type ErrorResponse = {
  code: string
  message: string
  timestamp: string
}

export type HealthResponse = {
  status: string
  service: string
  timestamp: string
  quarkusHealthEndpoint: string
}

export type CreateTenantRequest = {
  tenantId: string
  company: { name: string; country: string }
  erp: { type: string; integrationMode: 'API' | 'FILE' | 'HYBRID' }
  environment: 'dev' | 'qa' | 'production'
  modules: string[]
  resources: { cpu: string; memory: string }
}

export type PullRequestStatus = {
  numero: number | null
  url: string | null
  estado: 'PENDIENTE_PUBLICACION' | 'PENDIENTE_REVISION' | 'FUSIONADO' | 'CERRADO_SIN_FUSIONAR'
}

export type OperationStatus = 'PENDING' | 'VALIDATING' | 'PROVISIONING' | 'SUCCESS' | 'FAILED'

export type OperationType = 'CREATE' | 'RETRY' | 'DELETE'

export type OperationAcceptedResponse = {
  operationId: string
  tenantId: string
  status: OperationStatus
  message: string
  pr?: PullRequestStatus | null
}

export type TenantStatus =
  | 'PENDING'
  | 'VALIDATING'
  | 'PROVISIONING'
  | 'READY'
  | 'READY_FOR_INGESTION'
  | 'FAILED'
  | 'DELETING'
  | 'DELETED'

export type TenantSummary = {
  tenantId: string
  companyName: string
  country: string
  erpType: string
  integrationMode: string
  environment: string
  modules: string[]
  status: TenantStatus
  createdAt: string
  updatedAt: string
}

export type PagedResponse<T> = {
  items: T[]
  page: number
  size: number
  total: number
}

export type ProvisioningOperation = {
  operationId: string
  tenantId: string
  operationType: OperationType
  status: OperationStatus
  attemptNumber: number
  requestedBy: string
  startedAt: string
  endedAt: string | null
  errorSummary: string | null
  gitReference: string | null
  workingBranch: string | null
  argoCdApplicationName: string | null
  pullRequest: PullRequestStatus | null
}

export type TenantDetail = {
  tenantId: string
  companyName: string
  country: string
  erpType: string
  integrationMode: string
  environment: string
  modules: string[]
  cpu: number
  memoryGib: number
  status: TenantStatus
  gitOps: { branch: string; repositoryUrl: string | null; lastReference: string | null }
  argoCd: {
    applicationName: string | null
    syncStatus: string
    healthStatus: string
    ready: boolean
  }
  dataPlatform: {
    tenantUuid: string
    schemaPrefix: string
    odsSchema: string
    stagingSchema: string
    dimensionalSchema: string
    cubeSchema: string
    bootstrapStatus: string
    bootstrapError: string | null
    bootstrapAt: string | null
  }
  createdAt: string
  updatedAt: string
}

export type TenantEvent = {
  id: number
  tenantId: string
  operationId: string | null
  actor: string
  action: string
  result: string
  details: string
  createdAt: string
}

export type TenantReadiness = {
  tenantId: string
  readyForIngestion: boolean
  dataPlaneReady: boolean
  argoReady: boolean
  dataPlaneStatus: string
  dataPlaneError: string | null
  message: string
}
