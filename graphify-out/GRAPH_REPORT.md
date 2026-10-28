# Graph Report - front_modulo_administrator  (2026-10-28)

## Corpus Check
- 43 files · ~19,043 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 7 file(s) not represented in the graph (top: (none) 4, .example 1, .template 1)

## Summary
- 330 nodes · 672 edges · 17 communities (10 shown, 7 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 2 edges (avg confidence: 0.9)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `c695667b`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- auth-context.tsx
- package.json
- hooks.ts
- tenant-detail-page.tsx
- compilerOptions
- App.tsx
- compilerOptions
- tsconfig.json
- vite-env.d.ts
- 3) Contratos request/response (tipado real)
- EP04 Admin Frontend
- EP04 Admin Frontend - Project State
- AGENTS.md
- CLAUDE.md
- .claude/CLAUDE.md

## God Nodes (most connected - your core abstractions)
1. `TenantDetailPage()` - 28 edges
2. `OperationsPage()` - 20 edges
3. `compilerOptions` - 19 edges
4. `EP04 Admin Frontend` - 18 edges
5. `3) Contratos request/response (tipado real)` - 17 edges
6. `request()` - 16 edges
7. `TenantsListPage()` - 16 edges
8. `cn()` - 13 edges
9. `react` - 11 edges
10. `App()` - 11 edges

## Surprising Connections (you probably didn't know these)
- `3.3 Listar tenants` --references--> `TenantStatus`  [INFERRED]
  FRONTEND_HANDOFF_EP04.md → src/types/ep04.ts
- `useHealth()` --indirect_call--> `healthCheck()`  [INFERRED]
  src/features/tenants/hooks.ts → src/lib/api.ts
- `App()` --calls--> `OperationsPage()`  [EXTRACTED]
  src/App.tsx → src/pages/operations-page.tsx
- `App()` --calls--> `TenantDetailPage()`  [EXTRACTED]
  src/App.tsx → src/pages/tenant-detail-page.tsx
- `App()` --calls--> `TenantsListPage()`  [EXTRACTED]
  src/App.tsx → src/pages/tenants-list-page.tsx

## Import Cycles
- None detected.

## Communities (17 total, 7 thin omitted)

### Community 0 - "auth-context.tsx"
Cohesion: 0.13
Nodes (27): AuthContext, AuthProvider(), AuthValue, AuthError, clearSession(), loadSession(), safeReturnTo(), saveReturnTo() (+19 more)

### Community 1 - "package.json"
Cohesion: 0.06
Nodes (34): dependencies, clsx, @hookform/resolvers, react, react-dom, react-hook-form, react-router-dom, @tanstack/react-query (+26 more)

### Community 2 - "hooks.ts"
Cohesion: 0.08
Nodes (52): ACTIVE_OPERATION_STATUSES, ACTIVE_STATUSES, ENVIRONMENTS, ERP_TYPES, INTEGRATION_MODES, MODULES, MODULES_BY_ERP, OPERATION_STATUSES (+44 more)

### Community 3 - "tenant-detail-page.tsx"
Cohesion: 0.08
Nodes (59): EmptyState(), EmptyStateProps, AlertIcon(), base, CheckIcon(), CloseIcon(), CopyIcon(), DotsIcon() (+51 more)

### Community 4 - "compilerOptions"
Cohesion: 0.10
Nodes (20): compilerOptions, allowImportingTsExtensions, baseUrl, isolatedModules, jsx, lib, module, moduleDetection (+12 more)

### Community 6 - "App.tsx"
Cohesion: 0.20
Nodes (16): react, react-dom, react-router-dom, @tanstack/react-query, App(), BrandLogo(), BrandLogoProps, Layout() (+8 more)

### Community 8 - "compilerOptions"
Cohesion: 0.22
Nodes (8): compilerOptions, allowSyntheticDefaultImports, composite, module, moduleResolution, skipLibCheck, types, include

### Community 12 - "3) Contratos request/response (tipado real)"
Cohesion: 0.06
Nodes (33): 1) Seguridad, headers y reglas globales, 2) Endpoints disponibles, 3.10 Historial global de operaciones, 3.11 Estado de operación asíncrona, 3.12 Catálogo de política de aprovisionamiento ⚠️, 3.13 Almacenamiento S3 del tenant 🆕⚠️, 3.14 Corridas de ingesta 🆕⚠️, 3.15 Lanzar ingesta manual 🆕⚠️ (+25 more)

### Community 13 - "EP04 Admin Frontend"
Cohesion: 0.10
Nodes (20): Argo CD, Despliegue en Kubernetes, Ejecucion con Dev Container, Ejecucion con Docker Compose, EP04 Admin Frontend, Error `Failed to fetch`, Estado actual del proyecto (para humanos e IA), Estructura del proyecto (+12 more)

### Community 14 - "EP04 Admin Frontend - Project State"
Cohesion: 0.25
Nodes (7): Current Functional Scope, EP04 Admin Frontend - Project State, Graphify in this Repository, Maintenance Rule, Purpose, Quick Start for a New Contributor or Agent, Runtime and Deployment

## Knowledge Gaps
- **5 isolated node(s):** `clsx`, `@types/node`, `@types/react`, `@types/react-dom`, `typescript`
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 160 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **7 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `TenantStatus` connect `hooks.ts` to `tenant-detail-page.tsx`, `3) Contratos request/response (tipado real)`?**
  _High betweenness centrality (0.140) - this node is a cross-community bridge._
- **What connects `clsx`, `@types/node`, `@types/react` to the rest of the system?**
  _5 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `auth-context.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.13257575757575757 - nodes in this community are weakly interconnected._
- **Why does `3.3 Listar tenants` connect `3) Contratos request/response (tipado real)` to `hooks.ts`?**
  _High betweenness centrality (0.135) - this node is a cross-community bridge._
- **Should `package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.05689900426742532 - nodes in this community are weakly interconnected._
- **Should `hooks.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.07622504537205081 - nodes in this community are weakly interconnected._
- **Should `tenant-detail-page.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.07885763000852515 - nodes in this community are weakly interconnected._