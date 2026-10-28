# EP04 Frontend Handoff (contrato backend completo)

Este documento es para que otro agente implemente un frontend **bien hecho** consumiendo el backend EP04 (`/api/v1`).  
Base API sugerida en local: `http://localhost:8080` (env `VITE_API_BASE`).

> Última revisión: 2026-10-28. Refleja el backend con almacenamiento **Amazon S3 nativo** (credencial por tenant) e **ingesta operable por API** (corridas manuales, estado y logs). Los endpoints marcados 🆕 son nuevos respecto a la versión anterior de este documento; los marcados ⚠️ no están aún en `src/lib/api.ts`.

## 1) Seguridad, headers y reglas globales

- Endpoints de administración (`/api/v1/tenants/**`, `/api/v1/operations/**`, `/api/v1/catalogs/**`) requieren header obligatorio:
  - `X-Admin-Role: admin`
- Header opcional para trazabilidad:
  - `X-Actor: <usuario>`
- Header opcional para idempotencia (create/retry/delete):
  - `Idempotency-Key: <uuid-o-string-unico>`
- `Content-Type: application/json` para POST con cuerpo (create). `POST .../retry` y `POST .../ingestion/run` no llevan cuerpo; `ingestion/run` acepta cualquier `Content-Type` (o ninguno).
- CORS habilitado en backend para el origen de `CORS_ORIGINS` (por defecto `http://localhost:5173`). Cabeceras permitidas: `accept, authorization, content-type, x-requested-with, x-admin-role, x-actor, idempotency-key`. En despliegue el navegador llama a `/api/...` en el mismo host y nginx lo reenvía al backend (`API_UPSTREAM`), por lo que CORS no interviene.
- Autorización (MVP): el backend acepta `X-Admin-Role: admin` **o** un token con rol `admin` si se activa OIDC (`OIDC_ENABLED`). El login del frontend (Cognito) es independiente y hoy no sustituye al header. Cualquiera que alcance la API es admin, por eso la consola/API no deben exponerse a internet (ver deuda técnica HU-7).
- ⚠️ **`GET /tenants/{id}/storage` devuelve el `secretAccessKey` S3 del tenant en claro.** Muéstralo solo bajo demanda (botón "Revelar"), enmascarado por defecto, sin guardarlo en `localStorage` ni en logs, y nunca lo incluyas en polling.

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
| GET | `/api/v1/tenants/{tenantId}/storage` 🆕⚠️ | Sí | Endpoint, bucket, prefijo y credenciales S3 del tenant |
| GET | `/api/v1/tenants/{tenantId}/ingestion/runs?limit=20` 🆕⚠️ | Sí | Últimas corridas de ingesta (programadas y manuales) |
| POST | `/api/v1/tenants/{tenantId}/ingestion/run` 🆕⚠️ | Sí | Lanzar una corrida de ingesta manual |
| GET | `/api/v1/tenants/{tenantId}/ingestion/runs/{runName}/logs?tail=200` 🆕⚠️ | Sí | Log del runner de una corrida |
| POST | `/api/v1/tenants/{tenantId}/retry` | Sí | Reintento (si última operación falló) |
| DELETE | `/api/v1/tenants/{tenantId}` | Sí | Solicitar baja vía PR |
| GET | `/api/v1/tenants/{tenantId}/pull-request` | Sí | Estado actual del PR |
| GET | `/api/v1/operations?page=0&size=20&status=&type=&tenantId=` | Sí | Historial global de operaciones (panel admin) |
| GET | `/api/v1/operations/{operationId}` | Sí | Estado detallado de operación asíncrona |
| GET | `/api/v1/catalogs/provisioning-policy` ⚠️ | Sí | Catálogos y límites para formularios (el front hoy usa constantes en `src/constants/catalogs.ts`) |

Flujo de ingesta de un tenant (contexto para la UI): el cliente sube CSV a `s3://<bucket>/<prefix>/incoming/<ods|staging>/<tabla>/<archivo>.csv[.gz]` con las credenciales de `/storage`; un CronJob por tenant (cada 5 min) los carga a ODS/staging, los archiva en `processed/` o `failed/` y ejecuta las transformaciones al dimensional. `ingestion/run` fuerza esa corrida sin esperar.

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

### 3.12 Catálogo de política de aprovisionamiento ⚠️

**GET** `/api/v1/catalogs/provisioning-policy`

```json
{
  "allowedEnvironments": ["dev", "qa", "production"],
  "allowedModules": ["integration", "analytics", "monitoring"],
  "integrationModes": ["API", "FILE", "HYBRID"],
  "tenantStatuses": ["PENDING", "VALIDATING", "PROVISIONING", "READY", "READY_FOR_INGESTION", "FAILED", "DELETING", "DELETED"],
  "operationStatuses": ["PENDING", "VALIDATING", "PROVISIONING", "SUCCESS", "FAILED"],
  "resourceLimits": { "minCpu": 1, "maxCpu": 16, "minMemoryGib": 1, "maxMemoryGib": 64 },
  "erpProfiles": [
    { "key": "SAP_BUSINESS_ONE", "type": "SAP_BUSINESS_ONE", "connector": "sap-b1", "supportedModules": ["integration", "analytics", "monitoring"] }
  ]
}
```

Recomendado: usarlo para poblar selects y límites del formulario en lugar de constantes duplicadas.

### 3.13 Almacenamiento S3 del tenant 🆕⚠️

**GET** `/api/v1/tenants/{tenantId}/storage`

Devuelve dónde y con qué credencial el cliente sube sus archivos. Cada tenant tiene un usuario IAM que solo ve su prefijo `<uuid>/`.

```json
{
  "endpoint": "https://s3.us-east-1.amazonaws.com",
  "region": "us-east-1",
  "bucket": "edecision-ingest-prod",
  "pathStyle": false,
  "accessKeyId": "AKIA...",
  "secretAccessKey": "••••",
  "uploadLayout": "<prefix>/incoming/<ods|staging>/<table>/<file>.csv[.gz]",
  "prefix": "3f1c2d9e-....../"
}
```

Errores:
- `404 STORAGE_DISABLED`: el backend no tiene S3 habilitado (ocultar el bloque).
- `409 STORAGE_NOT_READY`: el tenant aún no terminó de aprovisionarse (mostrar "disponible cuando el tenant esté listo").
- `404 TENANT_NOT_FOUND`.

UI sugerida: mostrar bucket, región, `prefix` y `uploadLayout` siempre; `accessKeyId` copiable; `secretAccessKey` solo tras pulsar "Revelar" (ver aviso de seguridad en §1).

### 3.14 Corridas de ingesta 🆕⚠️

**GET** `/api/v1/tenants/{tenantId}/ingestion/runs?limit=20` (`limit` por defecto 20, máximo 100)

```json
{
  "tenantId": "acme-co",
  "namespace": "t-acme-co",
  "runs": [
    {
      "name": "tenant-ingest-manual-20261028153000",
      "trigger": "MANUAL",
      "status": "RUNNING",
      "startedAt": "2026-10-28T15:30:00Z",
      "finishedAt": null,
      "durationSeconds": null,
      "triggeredBy": "admin-ui",
      "message": null
    },
    {
      "name": "tenant-ingest-29412345",
      "trigger": "SCHEDULED",
      "status": "SUCCEEDED",
      "startedAt": "2026-10-28T15:25:00Z",
      "finishedAt": "2026-10-28T15:25:41Z",
      "durationSeconds": 41,
      "triggeredBy": null,
      "message": null
    }
  ]
}
```

- `trigger`: `SCHEDULED` | `MANUAL`.
- `status`: `PENDING` | `RUNNING` | `SUCCEEDED` | `FAILED`. `message` trae el motivo cuando es `FAILED`.
- Orden: más reciente primero. Se conservan las últimas 3 corridas programadas exitosas y las manuales durante 24 h.
- **Alcance:** informa el estado del Job de Kubernetes, **no** cuántos archivos o filas se cargaron; para el detalle usa el endpoint de logs.

### 3.15 Lanzar ingesta manual 🆕⚠️

**POST** `/api/v1/tenants/{tenantId}/ingestion/run` (sin cuerpo; `X-Actor` opcional queda como `triggeredBy`)

Respuesta `202 Accepted`: un objeto igual a un elemento de `runs` (`status: "PENDING"`).

Errores:
- `409 TENANT_NOT_READY`: el tenant no está `READY`/`READY_FOR_INGESTION` o el bootstrap de datos no fue `SUCCESS`. Habilitar el botón solo si `readiness.readyForIngestion`.
- `409 INGESTION_RUN_IN_PROGRESS`: ya hay una corrida `PENDING`/`RUNNING`.
- `409 INGESTION_NOT_PROVISIONED`: el tenant no tiene CronJob (tenant antiguo sin migrar).
- `404 TENANT_NOT_FOUND`.
- `502` `KUBERNETES_*` / `503 KUBERNETES_DISABLED` (ver §4).

Se registra el evento `INGESTION_TRIGGERED` (`result: ACCEPTED`) en `/events`.

### 3.16 Logs de una corrida 🆕⚠️

**GET** `/api/v1/tenants/{tenantId}/ingestion/runs/{runName}/logs?tail=200` (`tail` por defecto 200, máximo 1000)

```json
{
  "tenantId": "acme-co",
  "run": "tenant-ingest-manual-20261028153000",
  "tailLines": 200,
  "logs": "2026-10-28 15:30:02 INFO loaded ods.sales_orders rows=1200\n..."
}
```

- `runName` debe ser el `name` devuelto por `/ingestion/runs` (patrón `tenant-ingest-[a-z0-9-]{1,40}`); si no → `400 INVALID_RUN_NAME`.
- `404 INGESTION_LOGS_NOT_FOUND`: el pod ya fue eliminado o no existe todavía. Mostrar en un visor monoespaciado con scroll.

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
- `404 NOT_FOUND` → `code: PULL_REQUEST_NOT_FOUND` (tenant sin PR asociado), `STORAGE_DISABLED`, `INGESTION_LOGS_NOT_FOUND`
- `409 CONFLICT`:
  - `DUPLICATE_TENANT`
  - `OPERATION_IN_PROGRESS`
  - `RETRY_NOT_ALLOWED`
  - `IDEMPOTENCY_KEY_REUSED_WITH_DIFFERENT_REQUEST`
  - `STORAGE_NOT_READY` (aún no hay credencial S3)
  - `TENANT_NOT_READY` (ingesta manual con tenant no listo)
  - `INGESTION_RUN_IN_PROGRESS` (ya hay una corrida activa)
  - `INGESTION_NOT_PROVISIONED` (el tenant no tiene CronJob)
- `5xx` de ingesta (el backend habla con la API de Kubernetes):
  - `503 KUBERNETES_DISABLED`: integración apagada (`EP04_KUBERNETES_ENABLED=false`); ocultar la pestaña Ingesta.
  - `502 KUBERNETES_FORBIDDEN`: falta el Role del tenant (`tenant-ep04-access`); tenant creado con plantilla antigua. Mensaje: "Contacta a plataforma".
  - `502 KUBERNETES_UNAVAILABLE` / `KUBERNETES_ERROR` / `KUBERNETES_BAD_RESPONSE`: reintentable; mostrar "No se pudo consultar el clúster, intenta de nuevo".
- `400 BAD_REQUEST`:
  - `INVALID_RUN_NAME`
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
3. Detener polling **solo** cuando `tenant.status` sea terminal: `READY`, `READY_FOR_INGESTION`, `FAILED` o `DELETED`.
   - ⚠️ No pares por `operation.status = SUCCESS`: la operación pasa a `SUCCESS` en cuanto el PR se fusiona, pero el tenant sigue en `PROVISIONING` hasta que Argo CD queda `Synced/Healthy` y termina el bootstrap de datos. Parar ahí dejaría la UI mostrando "aprovisionando" para siempre.
   - Frecuencia de refresco del backend (para no sobre-consultar): consulta el PR cada ~20 s y Argo CD/bootstrap cada ~30 s; polling del front cada 5 s es suficiente.

### Ciclo de vida de un tenant (qué debe reflejar la UI)

1. `POST /tenants` → `202`, tenant `PENDING` → `VALIDATING` → el backend abre un Pull Request en el repo GitOps (`PENDIENTE_PUBLICACION` → `PENDIENTE_REVISION`).
2. **Una persona debe revisar y fusionar el PR en GitHub** (no hay auto-merge). Mientras tanto el tenant queda esperando: la UI debe mostrar el enlace `pullRequest.url` con el texto "Pendiente de revisión/merge" y no tratarlo como error ni como atasco.
3. PR `FUSIONADO` → operación `SUCCESS`, tenant `PROVISIONING` (Argo CD crea namespace, Postgres, Cube, CronJob y bootstrap de schemas).
4. Argo `Synced/Healthy` + bootstrap `SUCCESS` → tenant `READY` / `READY_FOR_INGESTION` (`readiness.readyForIngestion = true`). Solo entonces habilitar ingesta y mostrar credenciales S3.
5. Si el PR se cierra sin fusionar o falla el aprovisionamiento → tenant `FAILED`, operación `FAILED` con `errorSummary`; se ofrece **Retry** (nuevo intento, `attemptNumber + 1`).
6. `DELETE /tenants/{id}` → tenant `DELETING` y se abre un PR de baja que también debe fusionarse → `DELETED`. Si el PR de baja se cierra sin fusionar, el tenant **vuelve a su estado anterior** (p. ej. `READY_FOR_INGESTION`) y la operación queda `FAILED` (evento `DELETE_PULL_REQUEST_CLOSED`). Un tenant `DELETED` sigue apareciendo en el listado (filtrable con `status=DELETED`) y su `tenantId` **no se puede reutilizar** (`409 DUPLICATE_TENANT`); ocultar acciones (retry/delete/ingesta) en ese estado.
7. Solo puede haber una operación activa por tenant: `409 OPERATION_IN_PROGRESS` si se intenta create/retry/delete mientras otra no terminó. Deshabilitar los botones mientras `status` ∈ {`PENDING`, `VALIDATING`, `PROVISIONING`, `DELETING`}.
8. Idempotencia: reenviar el mismo `Idempotency-Key` con el mismo cuerpo devuelve la operación ya existente (no crea otra); con cuerpo distinto → `409 IDEMPOTENCY_KEY_REUSED_WITH_DIFFERENT_REQUEST`. Genera un `crypto.randomUUID()` por intento de envío del formulario para evitar dobles clics.

### Polling de ingesta

- Pestaña "Ingesta" del detalle: `GET .../ingestion/runs` una vez al abrir.
- Tras `POST .../ingestion/run`, repetir cada 5 s mientras alguna corrida esté `PENDING` o `RUNNING`; parar cuando todas sean `SUCCEEDED`/`FAILED`. Sin corridas activas no hacer polling (el CronJob corre cada 5 min; refresco manual).
- Deshabilitar "Ejecutar ahora" mientras haya una corrida activa o `readiness.readyForIngestion` sea `false`.
- Eventos de timeline adicionales a mapear con etiqueta amigable: `CREATE_REQUESTED`, `RETRY_REQUESTED`, `DELETE_REQUESTED`, `PULL_REQUEST_OPENED|MERGED|CLOSED`, `DELETE_PULL_REQUEST_OPENED|MERGED|CLOSED`, `PROVISIONING_FAILED`, `ARGO_HEALTH_CHECK`, `STORAGE_READY`, `STORAGE_REVOKE_FAILED`, `INGESTION_TRIGGERED`. Tratar cualquier acción desconocida mostrando el texto crudo.
- `PullRequestStatus.estado`: `PENDIENTE_PUBLICACION`, `PENDIENTE_REVISION`, `FUSIONADO`, `CERRADO_SIN_FUSIONAR`.

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

export type StorageInfo = {
  endpoint: string
  region: string
  bucket: string
  pathStyle: boolean
  accessKeyId: string
  secretAccessKey: string // sensible: mostrar solo bajo demanda
  uploadLayout: string
  prefix: string
}

export type IngestionTrigger = 'SCHEDULED' | 'MANUAL'
export type IngestionStatus = 'PENDING' | 'RUNNING' | 'SUCCEEDED' | 'FAILED'

export type IngestionRun = {
  name: string
  trigger: IngestionTrigger
  status: IngestionStatus
  startedAt: string | null
  finishedAt: string | null
  durationSeconds: number | null
  triggeredBy: string | null
  message: string | null
}

export type IngestionRunsResponse = {
  tenantId: string
  namespace: string
  runs: IngestionRun[]
}

export type IngestionRunLogs = {
  tenantId: string
  run: string
  tailLines: number
  logs: string
}

export type ProvisioningPolicyCatalog = {
  allowedEnvironments: string[]
  allowedModules: string[]
  integrationModes: string[]
  tenantStatuses: TenantStatus[]
  operationStatuses: OperationStatus[]
  resourceLimits: { minCpu: number; maxCpu: number; minMemoryGib: number; maxMemoryGib: number }
  erpProfiles: { key: string; type: string; connector: string; supportedModules: string[] }[]
}
```

Funciones sugeridas para `src/lib/api.ts`:

```ts
export const getTenantStorage = (id: string) => request<StorageInfo>(`/api/v1/tenants/${id}/storage`)
export const listIngestionRuns = (id: string, limit = 20) =>
  request<IngestionRunsResponse>(`/api/v1/tenants/${id}/ingestion/runs?limit=${limit}`)
export const triggerIngestion = (id: string) =>
  request<IngestionRun>(`/api/v1/tenants/${id}/ingestion/run`, { method: 'POST' })
export const getIngestionLogs = (id: string, run: string, tail = 200) =>
  request<IngestionRunLogs>(`/api/v1/tenants/${id}/ingestion/runs/${run}/logs?tail=${tail}`)
export const getProvisioningPolicy = () => request<ProvisioningPolicyCatalog>('/api/v1/catalogs/provisioning-policy')
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
7. Manejo de errores por `code` con mensajes amigables (incluidos los nuevos de §4; añadirlos a `src/lib/error-messages.ts`).
8. Variables de entorno:
   - `VITE_API_BASE` (vacío en despliegue: nginx proxea `/api` al backend)
   - `VITE_ADMIN_ROLE` (default `admin`)
   - opcional `VITE_ACTOR`
9. 🆕 Bloque "Almacenamiento" en el detalle: bucket, región, prefijo, `uploadLayout`, `accessKeyId` copiable y `secretAccessKey` solo bajo "Revelar". Ocultar si `STORAGE_DISABLED`; mensaje informativo si `STORAGE_NOT_READY`.
10. 🆕 Pestaña "Ingesta" en el detalle:
    - tabla de corridas (`GET .../ingestion/runs`) con trigger, estado, inicio, duración y quién la lanzó;
    - botón "Ejecutar ahora" (`POST .../ingestion/run`), solo si `readyForIngestion` y sin corrida activa, con feedback de los errores 409;
    - visor de logs por corrida (`GET .../logs`), modal monoespaciado con botón refrescar;
    - polling solo mientras haya corridas activas (§6).
11. Poblar formularios desde `GET /catalogs/provisioning-policy` (opcional; hoy hay constantes locales).

### Pendiente en backend (no implementar en UI aún)

- No hay endpoint para rotar/revocar la credencial S3, listar archivos del bucket ni pausar/reanudar la ingesta de un tenant.
- No hay autorización real por usuario: `X-Admin-Role` es la única barrera (deuda HU-7). No exponer la consola públicamente.

---

## 9) Nota de implementación

El frontend ya existe en este repositorio (`src/`: `lib/api.ts`, `types/ep04.ts`, `lib/error-messages.ts`, `features/tenants/hooks.ts`, páginas en `src/pages/`) con login Cognito, listado, creación, detalle con readiness/PR/eventos, retry, delete asíncrono y operaciones globales. Lo que falta respecto a este contrato son los puntos 9–11 de la sección 8 (almacenamiento, ingesta y catálogo dinámico).

Despliegue: imagen `ep04-admin-frontend` en ECR (`deploy/deployment.yaml`), servida por nginx con proxy `/api` → backend. Ver `README.md` y `PROJECT_STATE.md` del repo para variables y runtime.
