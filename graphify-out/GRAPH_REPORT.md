# Graph Report - front_modulo_administrator  (2026-10-26)

## Corpus Check
- 35 files · ~27,053 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 7 file(s) not represented in the graph (top: (none) 4, .example 1, .template 1)

## Summary
- 255 nodes · 471 edges · 15 communities (9 shown, 6 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 2 edges (avg confidence: 0.9)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `1646d4f3`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- operations-page.tsx
- package.json
- hooks.ts
- compilerOptions
- App.tsx
- compilerOptions
- tsconfig.json
- 3) Contratos request/response (tipado real)
- EP04 Admin Frontend
- EP04 Admin Frontend - Project State
- AGENTS.md
- CLAUDE.md
- .claude/CLAUDE.md

## God Nodes (most connected - your core abstractions)
1. `TenantDetailPage()` - 19 edges
2. `compilerOptions` - 19 edges
3. `EP04 Admin Frontend` - 18 edges
4. `TenantsListPage()` - 16 edges
5. `request()` - 15 edges
6. `OperationsPage()` - 15 edges
7. `3) Contratos request/response (tipado real)` - 12 edges
8. `EP04 Frontend Handoff (contrato backend completo)` - 10 edges
9. `friendlyError()` - 9 edges
10. `formatDate()` - 9 edges

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

## Communities (15 total, 6 thin omitted)

### Community 0 - "operations-page.tsx"
Cohesion: 0.12
Nodes (37): react, EmptyState(), EmptyStateProps, OperationStatusBadge(), statusMap, SkeletonTableRows(), SkeletonTableRowsProps, StatusBadge() (+29 more)

### Community 1 - "package.json"
Cohesion: 0.06
Nodes (33): dependencies, clsx, @hookform/resolvers, react, react-dom, react-hook-form, react-router-dom, @tanstack/react-query (+25 more)

### Community 2 - "hooks.ts"
Cohesion: 0.07
Nodes (54): @hookform/resolvers, ACTIVE_OPERATION_STATUSES, ACTIVE_STATUSES, ENVIRONMENTS, ERP_TYPES, INTEGRATION_MODES, MODULES, MODULES_BY_ERP (+46 more)

### Community 4 - "compilerOptions"
Cohesion: 0.10
Nodes (20): compilerOptions, allowImportingTsExtensions, baseUrl, isolatedModules, jsx, lib, module, moduleDetection (+12 more)

### Community 6 - "App.tsx"
Cohesion: 0.27
Nodes (8): react-dom, react-router-dom, @tanstack/react-query, App(), Layout(), useHealth(), queryClient, CreateTenantPage()

### Community 8 - "compilerOptions"
Cohesion: 0.22
Nodes (8): compilerOptions, allowSyntheticDefaultImports, composite, module, moduleResolution, skipLibCheck, types, include

### Community 12 - "3) Contratos request/response (tipado real)"
Cohesion: 0.08
Nodes (25): 1) Seguridad, headers y reglas globales, 2) Endpoints disponibles, 3.10 Historial global de operaciones, 3.11 Estado de operación asíncrona, 3.1 Health, 3.2 Crear tenant, 3.3 Listar tenants, 3.4 Detalle tenant (+17 more)

### Community 13 - "EP04 Admin Frontend"
Cohesion: 0.10
Nodes (20): Argo CD, Despliegue en Kubernetes, Ejecucion con Dev Container, Ejecucion con Docker Compose, EP04 Admin Frontend, Error `Failed to fetch`, Estado actual del proyecto (para humanos e IA), Estructura del proyecto (+12 more)

### Community 14 - "EP04 Admin Frontend - Project State"
Cohesion: 0.25
Nodes (7): Current Functional Scope, EP04 Admin Frontend - Project State, Graphify in this Repository, Maintenance Rule, Purpose, Quick Start for a New Contributor or Agent, Runtime and Deployment

## Knowledge Gaps
- **5 isolated node(s):** `clsx`, `@types/node`, `@types/react`, `@types/react-dom`, `typescript`
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 132 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **6 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `TenantStatus` connect `hooks.ts` to `operations-page.tsx`, `3) Contratos request/response (tipado real)`?**
  _High betweenness centrality (0.127) - this node is a cross-community bridge._
- **What connects `clsx`, `@types/node`, `@types/react` to the rest of the system?**
  _5 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `operations-page.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.11594202898550725 - nodes in this community are weakly interconnected._
- **Why does `3.3 Listar tenants` connect `3) Contratos request/response (tipado real)` to `hooks.ts`?**
  _High betweenness centrality (0.122) - this node is a cross-community bridge._
- **Should `package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.05855855855855856 - nodes in this community are weakly interconnected._
- **Should `hooks.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.06927551560021153 - nodes in this community are weakly interconnected._
- **Should `compilerOptions` be split into smaller, more focused modules?**
  _Cohesion score 0.09523809523809523 - nodes in this community are weakly interconnected._