# EP04 Frontend Handoff (contrato backend completo)

Este documento es para que otro agente implemente un frontend **bien hecho** consumiendo el backend EP04 (`/api/v1`).  
Base API sugerida en local: `http://localhost:8080` (env `VITE_API_BASE`).

## 1) Seguridad, headers y reglas globales

- Endpoints de administración (`/api/v1/tenants/**`, `/api/v1/operations/**`, `/api/v1/catalogs/**`) requieren header obligatorio:
  - `X-Admin-Role: admin`
- Header opcional para trazabilidad:
  - `X-Actor: <usuario>`
- Header opcional para idempotencia (create/retry/delete):
  - `Idempotency-Key: <uuid-o-string-unico>`
- `Content-Type: application/json` para POST.
- CORS ya habilitado en backend para `http://localhost:5173`.

## 2) Endpoints disponibles

| Método | Endpoint | Auth header | Uso |
|---|---|---|---|
| GET | `/api/v1/health` | No | Health check simple |
| POST | `/api/v1/tenants` | Sí | Crear tenant (asíncrono) |
| GET | `/api/v1/tenants?page=0&size=20&q=&status=` | Sí | Listado paginado y filtros |
| GET | `/api/v1/tenants/{tenantId}` | Sí | Detalle de tenant |
| GET | `/api/v1/tenants/{tenantId}/events` | Sí | Timeline de eventos |
| GET | `/api/v1/tenants/{tenantId}/operations?page=0&size=20&status=&type=` | Sí | Historial de operaciones por tenant |
| GET | `/api/v1/tenants/{tenantId}/readiness` | Sí | Estado de readiness para ingesta |
| POST | `/api/v1/tenants/{tenantId}/retry` | Sí | Reintento (si última operación falló) |
| DELETE | `/api/v1/tenants/{tenantId}` | Sí | Solicitar baja vía PR |
| GET | `/api/v1/tenants/{tenantId}/pull-request` | Sí | Estado actual del PR |
| GET | `/api/v1/operations?page=0&size=20&status=&type=&tenantId=` | Sí | Historial global de operaciones (panel admin) |
| GET | `/api/v1/operations/{operationId}` | Sí | Estado detallado de operación asíncrona |
| GET | `/api/v1/catalogs/provisioning-policy` | Sí | Catálogos y límites para formularios |

---

## 3) Contratos request/response (tipado real)

### 3.1 Health

**GET** `/api/v1/health`

```json
{
  "status": "UP",
  "service": "ep04-control-plane",
  "timestamp": "2026-10-23T20:30:10.123Z",
  "quarkusHealthEndpoint": "/q/health"
}
```

### 3.2 Crear tenant

**POST** `/api/v1/tenants`

Request:

```json
{
  "tenantId": "acme-co",
  "company": { "name": "Acme Colombia", "country": "CO" },
  "erp": { "type": "SAP_BUSINESS_ONE", "integrationMode": "API" },
  "environment": "production",
  "modules": ["integration", "analytics"],
  "resources": { "cpu": "4", "memory": "8Gi" }
}
```

Response `202 Accepted`:

```json
{
  "operationId": "2a8fd6ec-8f2d-4259-8f4f-5a9cb3d66ad3",
  "tenantId": "acme-co",
  "status": "PENDING",
  "message": "Provisioning request registered",
  "pr": null
}
```

Además, devuelve header `Location: /api/v1/tenants/{tenantId}`.

> Nota: `pr` puede ser `null` al inicio. Consulta el progreso por `GET /api/v1/operations/{operationId}` y/o `GET /api/v1/tenants/{tenantId}/pull-request`.

### 3.3 Listar tenants

**GET** `/api/v1/tenants?page=0&size=20&q=acme&status=PROVISIONING`

Response `200`:

```json
{
  "items": [
    {
      "tenantId": "acme-co",
      "companyName": "Acme Colombia",
      "country": "CO",
      "erpType": "SAP_BUSINESS_ONE",
      "integrationMode": "API",
      "environment": "production",
      "modules": ["analytics", "integration"],
      "status": "PROVISIONING",
      "createdAt": "2026-10-23T20:00:00Z",
      "updatedAt": "2026-10-23T20:00:10Z"
    }
  ],
  "page": 0,
  "size": 20,
  "total": 1
}
```

Reglas:
- `page >= 0`
- `size` entre `1` y `200`
- `q` busca por `tenantId` y `companyName` (case-insensitive)
- `status` debe ser enum válido de `TenantStatus`

### 3.4 Detalle tenant

**GET** `/api/v1/tenants/{tenantId}`

```json
{
  "tenantId": "acme-co",
  "companyName": "Acme Colombia",
  "country": "CO",
  "erpType": "SAP_BUSINESS_ONE",
  "integrationMode": "API",
  "environment": "production",
  "modules": ["analytics", "integration"],
  "cpu": 4,
  "memoryGib": 8,
  "status": "READY_FOR_INGESTION",
  "gitOps": {
    "branch": "main",
    "repositoryUrl": "https://github.com/your-org/gitops-repo.git",
    "lastReference": "refs/heads/main@abc123"
  },
  "argoCd": {
    "applicationName": "tenant-acme-co",
    "syncStatus": "Synced",
    "healthStatus": "Healthy",
    "ready": true
  },
  "dataPlatform": {
    "tenantUuid": "....",
    "schemaPrefix": "acme_co",
    "odsSchema": "acme_co_ods",
    "stagingSchema": "acme_co_staging",
    "dimensionalSchema": "acme_co_dimensional",
    "cubeSchema": "acme_co_cube",
    "bootstrapStatus": "SUCCESS",
    "bootstrapError": "n/a",
    "bootstrapAt": "2026-10-23T20:05:00Z"
  },
  "createdAt": "2026-10-23T20:00:00Z",
  "updatedAt": "2026-10-23T20:05:00Z"
}
```

### 3.5 Eventos por tenant

**GET** `/api/v1/tenants/{tenantId}/events`

```json
[
  {
    "id": 101,
    "tenantId": "acme-co",
    "operationId": "2a8fd6ec-8f2d-4259-8f4f-5a9cb3d66ad3",
    "actor": "test-user",
    "action": "CREATE_REQUESTED",
    "result": "OK",
    "details": "Tenant provisioning request accepted",
    "createdAt": "2026-10-23T20:00:01Z"
  }
]
```

Orden: más reciente primero (`createdAt desc`).

### 3.6 Readiness

**GET** `/api/v1/tenants/{tenantId}/readiness`

```json
{
  "tenantId": "acme-co",
  "readyForIngestion": true,
  "dataPlaneReady": true,
  "argoReady": true,
  "dataPlaneStatus": "SUCCESS",
  "dataPlaneError": "n/a",
  "message": "Tenant is ready for ingestion"
}
```

### 3.7 Retry

**POST** `/api/v1/tenants/{tenantId}/retry`

Response `202 Accepted`:

```json
{
  "operationId": "7d14541c-88e3-4ca0-9258-8f988f131e0b",
  "tenantId": "acme-co",
  "status": "PENDING",
  "message": "Retry request registered",
  "pr": null
}
```

### 3.8 Delete

**DELETE** `/api/v1/tenants/{tenantId}`

Response `202 Accepted`:

```json
{
  "operationId": "9b825fbf-5e26-4f7f-9d86-6f0a8fa4850c",
  "tenantId": "acme-co",
  "status": "PENDING",
  "message": "Delete request registered",
  "pr": null
}
```

### 3.9 Estado de Pull Request

**GET** `/api/v1/tenants/{tenantId}/pull-request`

- Si el PR aún no fue creado:

```json
{
  "numero": null,
  "url": null,
  "estado": "PENDIENTE_PUBLICACION"
}
```

- Cuando ya existe:

```json
{
  "numero": 42,
  "url": "https://github.com/org/repo/pull/42",
  "estado": "PENDIENTE_REVISION"
}
```

### 3.10 Historial global de operaciones

**GET** `/api/v1/operations?page=0&size=20&status=&type=&tenantId=`

- `status` y `type` son opcionales.
- `tenantId` es opcional y permite filtrar el historial global a un tenant específico.

```json
{
  "items": [
    {
      "operationId": "2a8fd6ec-8f2d-4259-8f4f-5a9cb3d66ad3",
      "tenantId": "acme-co",
      "operationType": "CREATE",
      "status": "PROVISIONING",
      "attemptNumber": 1,
      "requestedBy": "test-user",
      "startedAt": "2026-10-23T20:00:01Z",
      "endedAt": null,
      "errorSummary": null,
      "gitReference": "abc123...",
      "workingBranch": "tenant/alta-acme-co",
      "argoCdApplicationName": "tenant-acme-co",
      "pullRequest": {
        "numero": 42,
        "url": "https://github.com/org/repo/pull/42",
        "estado": "PENDIENTE_REVISION"
      }
    }
  ],
  "page": 0,
  "size": 20,
  "total": 1
}
```

### 3.11 Estado de operación asíncrona

**GET** `/api/v1/operations/{operationId}`

```json
{
  "operationId": "2a8fd6ec-8f2d-4259-8f4f-5a9cb3d66ad3",
  "tenantId": "acme-co",
  "operationType": "CREATE",
  "status": "PROVISIONING",
  "attemptNumber": 1,
  "requestedBy": "test-user",
  "startedAt": "2026-10-23T20:00:01Z",
  "endedAt": null,
  "errorSummary": null,
  "gitReference": "abc123...",
  "workingBranch": "tenant/alta-acme-co",
  "argoCdApplicationName": "tenant-acme-co",
  "pullRequest": {
    "numero": 42,
    "url": "https://github.com/org/repo/pull/42",
    "estado": "PENDIENTE_REVISION"
  }
}
```

---

## 4) Errores (formato único)

Todos los errores de negocio/validación regresan:

```json
{
  "code": "ERROR_CODE",
  "message": "human readable message",
  "timestamp": "2026-10-23T20:10:00Z"
}
```

Errores importantes para UX:

- `403 FORBIDDEN` → `code: FORBIDDEN` (falta `X-Admin-Role: admin`)
- `404 NOT_FOUND` → `code: TENANT_NOT_FOUND`
- `404 NOT_FOUND` → `code: OPERATION_NOT_FOUND`
- `409 CONFLICT`:
  - `DUPLICATE_TENANT`
  - `OPERATION_IN_PROGRESS`
  - `RETRY_NOT_ALLOWED`
  - `IDEMPOTENCY_KEY_REUSED_WITH_DIFFERENT_REQUEST`
- `400 BAD_REQUEST`:
  - `INVALID_PAGINATION`
  - `INVALID_STATUS_FILTER`
  - `INVALID_OPERATION_STATUS_FILTER`
  - `INVALID_OPERATION_TYPE_FILTER`
  - `INVALID_IDEMPOTENCY_KEY`
  - `INVALID_TENANT_ID`
  - `INVALID_ENVIRONMENT`
  - `INVALID_ERP`
  - `UNSUPPORTED_ERP`
  - `INVALID_INTEGRATION_MODE`
  - `INVALID_MODULES`
  - `INVALID_MODULES_FOR_ERP`
  - `INVALID_CPU`
  - `CPU_OUT_OF_RANGE`
  - `INVALID_MEMORY`
  - `MEMORY_OUT_OF_RANGE`
  - `VALIDATION_ERROR` (Bean Validation)
- `500` → `UNEXPECTED_ERROR`

---

## 5) Catálogos y restricciones para formulario

### Allowed values (según backend actual)

- `environment`: `dev`, `qa`, `production`
- `integrationMode`: `API`, `FILE`, `HYBRID`
- `erp.type` soportados:
  - `SAP_BUSINESS_ONE`
  - `ODOO`
  - `DYNAMICS_365`
  - `NETSUITE`
  - `SIIGO`
  - `WORD_OFFICE`
- `modules` permitidos globalmente:
  - `integration`, `analytics`, `monitoring`
- Compatibilidad ERP->módulos:
  - SAP_BUSINESS_ONE: integration, analytics, monitoring
  - ODOO: integration, monitoring
  - DYNAMICS_365: integration, analytics
  - NETSUITE: integration, analytics, monitoring
  - SIIGO: integration, analytics
  - WORD_OFFICE: integration, analytics, monitoring
- `resources.cpu`: entero string entre `1` y `16` (regex `^\d{1,2}$`)
- `resources.memory`: formato `NGi` entre `1Gi` y `64Gi`
- `tenantId`: minúsculas, números y guiones (`^[a-z0-9]([a-z0-9-]{1,61}[a-z0-9])?$`)

---

## 6) Estados y comportamiento asíncrono (clave para UX)

### TenantStatus
- `PENDING`
- `VALIDATING`
- `PROVISIONING`
- `READY`
- `READY_FOR_INGESTION`
- `FAILED`
- `DELETING`
- `DELETED`

### OperationStatus
- `PENDING`
- `VALIDATING`
- `PROVISIONING`
- `SUCCESS`
- `FAILED`

### Recomendación de polling frontend

1. Al crear/retry/delete, guardar `operationId`.
2. Poll cada 5s:
   - `GET /api/v1/operations/{operationId}`
   - `GET /api/v1/tenants/{tenantId}`
   - `GET /api/v1/tenants/{tenantId}/events`
   - `GET /api/v1/tenants/{tenantId}/pull-request`
   - opcional: `GET /api/v1/tenants/{tenantId}/readiness`
3. Detener polling cuando:
   - `operation.status` esté en `SUCCESS` o `FAILED`, o
   - `tenant.status` esté en `READY`, `READY_FOR_INGESTION`, `FAILED` o `DELETED`.

---

## 7) Tipos TypeScript sugeridos (copiar/pegar)

```ts
export type ErrorResponse = {
  code: string
  message: string
  timestamp: string
}

export type CreateTenantRequest = {
  tenantId: string
  company: { name: string; country: string }
  erp: { type: string; integrationMode: 'API' | 'FILE' | 'HYBRID' }
  environment: 'dev' | 'qa' | 'production'
  modules: string[]
  resources: { cpu: string; memory: string } // ej: "4", "8Gi"
}

export type OperationAcceptedResponse = {
  operationId: string
  tenantId: string
  status: 'PENDING' | 'VALIDATING' | 'PROVISIONING' | 'SUCCESS' | 'FAILED'
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

export type PullRequestStatus = {
  numero: number | null
  url: string | null
  estado:
    | 'PENDIENTE_PUBLICACION'
    | 'PENDIENTE_REVISION'
    | 'FUSIONADO'
    | 'CERRADO_SIN_FUSIONAR'
}

export type ProvisioningOperation = {
  operationId: string
  tenantId: string
  operationType: 'CREATE' | 'RETRY' | 'DELETE'
  status: 'PENDING' | 'VALIDATING' | 'PROVISIONING' | 'SUCCESS' | 'FAILED'
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
  argoCd: { applicationName: string | null; syncStatus: string; healthStatus: string; ready: boolean }
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
```

---

## 8) Alcance funcional mínimo del frontend (Definition of Done)

1. Pantalla de listado con:
   - paginación (`page`, `size`)
   - búsqueda (`q`)
   - filtro por estado (`status`)
   - refresh manual
2. Formulario de creación con validaciones cliente alineadas a backend.
3. Vista de detalle con bloques:
   - estado general
   - GitOps
   - Argo CD
   - Data Platform (schemas + bootstrap)
4. Timeline de eventos en orden descendente.
5. Acción retry visible solo si estado es `FAILED`.
6. Polling automático en tenants activos.
7. Manejo de errores por `code` con mensajes amigables.
8. Variables de entorno:
   - `VITE_API_BASE`
   - `VITE_ADMIN_ROLE` (default `admin`)
   - opcional `VITE_ACTOR`

---

## 9) Nota de implementación recomendada

Ya existe un frontend base en `web-admin/src/App.tsx` con integración básica.  
Se puede usar como semilla, pero falta robustez (tipado completo, paginación real, filtro status, polling, detalle/readiness, manejo de errores por code, UX/estados de carga).
