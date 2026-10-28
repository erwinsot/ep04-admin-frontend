# EP04 Admin Frontend

Frontend del modulo administrador de EP04. Esta aplicacion consume el backend en `/api/v1` para gestionar tenants y operaciones de aprovisionamiento.

## Tabla de contenidos

- [Tecnologias](#tecnologias)
- [Rutas de la aplicacion](#rutas-de-la-aplicacion)
- [Requisitos](#requisitos)
- [Inicio rapido](#inicio-rapido)
- [Variables de entorno](#variables-de-entorno)
- [Scripts disponibles](#scripts-disponibles)
- [Ejecucion con Dev Container](#ejecucion-con-dev-container)
- [Ejecucion con Docker Compose](#ejecucion-con-docker-compose)
- [Imagen de produccion](#imagen-de-produccion)
- [Despliegue en Kubernetes](#despliegue-en-kubernetes)
- [Argo CD](#argo-cd)
- [Para que sirve Graphify en este proyecto](#para-que-sirve-graphify-en-este-proyecto)
- [Estado actual del proyecto (para humanos e IA)](#estado-actual-del-proyecto-para-humanos-e-ia)
- [Troubleshooting](#troubleshooting)
- [Funcionalidades implementadas](#funcionalidades-implementadas)
- [Estructura del proyecto](#estructura-del-proyecto)

## Tecnologias

- React 18
- TypeScript
- Vite 5
- React Router DOM
- TanStack Query
- React Hook Form + Zod

## Rutas de la aplicacion

- `/login`: pantalla de acceso (redirige a Cognito).
- `/auth/callback`: retorno del Hosted UI de Cognito.
- `/`: listado de tenants.
- `/tenants/new`: formulario de creacion de tenant.
- `/tenants/:tenantId`: detalle de tenant (pestanas `Resumen` e `Ingesta`).
- `/operations`: historial global de operaciones.

## Requisitos

- Node.js 20+
- npm 10+
- Docker y Docker Compose (opcional)
- kubectl y acceso a cluster (opcional, para despliegue)

## Inicio rapido

1. Instala dependencias:

```bash
npm install
```

2. Crea archivo de entorno local:

```bash
cp .env.example .env
```

3. Inicia modo desarrollo:

```bash
npm run dev
```

4. Abre la aplicacion:

- http://localhost:5173

## Variables de entorno

Variables consumidas por el frontend:

| Variable | Default | Descripcion |
| --- | --- | --- |
| `VITE_API_BASE` | `""` | Base URL del backend. Si queda vacio, el frontend usa rutas relativas (`/api/v1/*`). |
| `VITE_API_PROXY_TARGET` | `http://host.containers.internal:8080` | Destino real del proxy de Vite en desarrollo para peticiones `/api`. |
| `VITE_ADMIN_ROLE` | `admin` | Valor enviado en header `X-Admin-Role` para endpoints administrativos. |
| `VITE_ACTOR` | `admin-ui` | Valor enviado en header `X-Actor`. Con sesion iniciada se usa el usuario del login. |
| `VITE_COGNITO_DOMAIN` / `VITE_COGNITO_CLIENT_ID` | `""` | Solo desarrollo local: dominio del Hosted UI de Cognito y App Client (publico, sin secret). En produccion se inyectan en runtime con `COGNITO_DOMAIN` y `COGNITO_CLIENT_ID` (ConfigMap -> `/config.js`). Sin ellos, `npm run dev` ofrece un acceso de desarrollo; el build de produccion no. |
| `COGNITO_REDIRECT_URI` / `COGNITO_LOGOUT_URI` / `COGNITO_SCOPES` | `<origen>/auth/callback` / `<origen>/login` / `openid email profile` | Opcionales; deben coincidir con el App Client de Cognito. |
| `LOCAL_LOGIN` | `false` | Con `true` y sin Cognito configurado, el login ofrece "modo local" (sin autenticacion real). Solo para pruebas; en produccion debe ser `false`. |

Ejemplo recomendado (`.env`):

```env
VITE_API_BASE=
VITE_API_PROXY_TARGET=http://host.containers.internal:8080
VITE_ADMIN_ROLE=admin
VITE_ACTOR=admin-ui
```

Notas importantes:

- Con `VITE_API_BASE=` la app llama a `/api/v1/*` en el mismo origen.
- En desarrollo, Vite redirige `/api` a `VITE_API_PROXY_TARGET` para evitar CORS.
- En produccion, Nginx redirige `/api` usando `API_UPSTREAM`.

## Scripts disponibles

| Script | Comando | Descripcion |
| --- | --- | --- |
| `dev` | `npm run dev` | Inicia Vite en desarrollo. |
| `build` | `npm run build` | Compila TypeScript y genera `dist/`. |
| `preview` | `npm run preview` | Sirve localmente el build de `dist/`. |

## Ejecucion con Dev Container

Este repositorio incluye configuracion en `.devcontainer/devcontainer.json`.

1. Abre el proyecto en VS Code.
2. Ejecuta `Dev Containers: Reopen in Container`.
3. Espera la ejecucion de `postCreateCommand` (`npm install`).
4. El contenedor levanta la app con `postStartCommand` en puerto `5173`.

## Ejecucion con Docker Compose

`docker-compose.yml` usa el target `dev` del `Dockerfile` para hot reload.

Levantar:

```bash
docker compose up --build
```

Segundo plano:

```bash
docker compose up -d --build
```

Detener:

```bash
docker compose down
```

## Imagen de produccion

El target `production` del `Dockerfile` genera assets con Vite y los sirve con Nginx.

Build:

```bash
docker build --target production -t ep04-admin-frontend:latest .
```

Run:

```bash
docker run --rm -p 8080:80 \
  -e API_UPSTREAM=http://backend:8080 \
  -e COGNITO_DOMAIN=<prefijo>.auth.<region>.amazoncognito.com \
  -e COGNITO_CLIENT_ID=<client-id> \
  ep04-admin-frontend:latest
```

Las variables `COGNITO_*` y `LOCAL_LOGIN` se sirven en runtime desde `/config.js` (no requieren rebuild).

Si necesitas fijar variables `VITE_*` durante el build:

```bash
docker build \
  --target production \
  --build-arg VITE_API_BASE= \
  --build-arg VITE_ADMIN_ROLE=admin \
  --build-arg VITE_ACTOR=admin-ui \
  -t ep04-admin-frontend:latest .
```

## Despliegue en Kubernetes

El manifiesto de deployment espera que el backend sea accesible desde el cluster por DNS interno y lo consume via `API_UPSTREAM`.

Ruta recomendada:

1. Build del frontend con `VITE_API_BASE=` (vacio).
2. Configurar `API_UPSTREAM` hacia el servicio backend interno.
3. Aplicar manifests del directorio `deploy/`.

Ejemplo de upstream interno:

```yaml
API_UPSTREAM: http://ep04-control-plane.ep04-control-plane.svc.cluster.local:80
```

Aplicar manifests:

```bash
kubectl apply -k deploy
```

Manifiestos incluidos:

- `deploy/namespace.yaml`
- `deploy/configmap.yaml`
- `deploy/deployment.yaml`
- `deploy/service.yaml`
- `deploy/ingress.yaml`
- `deploy/hpa.yaml`
- `deploy/pdb.yaml`
- `deploy/kustomization.yaml`

### Checklist de produccion

1. `COGNITO_DOMAIN` y `COGNITO_CLIENT_ID` definidos en `deploy/configmap.yaml` y `LOCAL_LOGIN: "false"`.
2. App Client de Cognito publico (sin secret), con callback `https://<host>/auth/callback` y logout `https://<host>/login`.
3. Ingress con host real y TLS (Cognito exige HTTPS fuera de `localhost`); HSTS se configura en el ingress/ALB.
4. Imagen con tag inmutable en `deploy/deployment.yaml`. Las replicas las gestiona el HPA (minimo 2).
5. Backend con `OIDC_ENABLED` o proteccion de red: hoy `X-Admin-Role` es la unica barrera y no debe exponerse a internet.

## Argo CD

Aplicacion declarativa incluida en:

- `argocd/application-ep04-admin-frontend.yaml`

## Para que sirve Graphify en este proyecto

Graphify se usa como memoria tecnica compartida para humanos y agentes IA.
En vez de releer muchos archivos manualmente, permite consultar un grafo de conocimiento
del proyecto y responder preguntas de arquitectura, dependencias y flujos.

Beneficios practicos:

- Menos tiempo explorando archivos para entender el proyecto.
- Mejor contexto para agentes que llegan por primera vez al repo.
- Estado tecnico consultable en artefactos versionables.

Onboarding rapido para otra persona o IA:

1. Leer `README.md` y `PROJECT_STATE.md`.
2. Revisar `.graphify` (backend/modelo local) y ajustar puerto/modelo si aplica.
3. Cargar variables: `source .graphify`.
4. Construir grafo inicial (solo codigo, sin LLM): `graphify extract . --code-only`.
5. Consultar: `graphify query "<pregunta>"`, `graphify path "A" "B"`, `graphify explain "X"`.
6. Despues de cambios de codigo: `graphify update .`.

Si quieres incluir tambien docs/PDF/imagenes en el grafo semantico, usa:

- `graphify extract .`

Artefactos clave generados por Graphify:

- `graphify-out/graph.json`: grafo completo consultable.
- `graphify-out/GRAPH_REPORT.md`: resumen de arquitectura y comunidades.
- `graphify-out/wiki/index.md`: wiki navegable (si se genera con opcion wiki).

## Estado actual del proyecto (para humanos e IA)

Resumen rapido:

- Producto: frontend administrativo de EP04 para gestionar tenants y operaciones.
- Contrato backend: consumo de `/api/v1` y headers administrativos (`X-Admin-Role`, `X-Actor`).
- Funcionalidad: listado, creacion, detalle, retry, eliminacion y seguimiento de operaciones.
- Runtime: Vite en desarrollo, Nginx en produccion, manifests para Kubernetes y Argo CD.
- Integracion IA: el repo ya incluye configuracion de Graphify para flujos Codex/Claude.

Documento de estado detallado:

- `PROJECT_STATE.md`

## Troubleshooting

### Error `Failed to fetch`

1. Verifica que `VITE_API_BASE` este vacio para usar proxy local.
2. Revisa que `VITE_API_PROXY_TARGET` apunte a una URL alcanzable desde el contenedor.
3. Reinicia el proceso de Vite luego de cambios en `.env`.

Prueba rapida desde contenedor:

```bash
curl -i http://host.containers.internal:8080/api/v1/health
```

### `host.containers.internal` no resuelve

- Usa IP del host o un DNS interno accesible por el contenedor.
- Ajusta `VITE_API_PROXY_TARGET` en `.env`.

## Funcionalidades implementadas

- Listado de tenants con paginacion, busqueda y filtro por estado.
- Creacion de tenant con validaciones de formulario.
- Detalle de tenant con estado, readiness, PR y eventos.
- Retry de tenant en estado `FAILED`.
- Eliminacion asincrona de tenant.
- Tracking de operaciones por `operationId`.
- Historial global de operaciones con filtros (`status`, `type`, `tenantId`).
- Polling en vistas con estados activos.
- Manejo de errores por `code`.
- Login con Amazon Cognito (Hosted UI) y cierre de sesion.
- Bloque de almacenamiento S3 del tenant (secreto visible solo bajo demanda).
- Pestana de ingesta: corridas, ejecucion manual y visor de logs.

## Estructura del proyecto

```text
src/
  components/     # UI reutilizable
  constants/      # Catalogos y constantes
  features/       # Hooks por dominio
  lib/            # API client, config y utilidades
  pages/          # Vistas principales
  types/          # Tipos del contrato EP04
```
