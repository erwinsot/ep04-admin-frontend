# Graph Report - front_modulo_administrator  (2026-10-26)

## Corpus Check
- 36 files · ~15,139 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 7 file(s) not represented in the graph (top: (none) 4, .example 1, .template 1)

## Summary
- 279 nodes · 543 edges · 21 communities (14 shown, 7 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 2 edges (avg confidence: 0.9)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `02a4994b`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- operations-page.tsx
- package.json
- hooks.ts
- tenant-detail-page.tsx
- compilerOptions
- tenants-list-page.tsx
- dependencies
- cn
- compilerOptions
- tsconfig.json
- 3) Contratos request/response (tipado real)
- EP04 Admin Frontend
- EP04 Admin Frontend - Project State
- AGENTS.md
- CLAUDE.md
- .claude/CLAUDE.md
- devDependencies
- utils.ts
- ApiError

## God Nodes (most connected - your core abstractions)
1. `TenantDetailPage()` - 28 edges
2. `OperationsPage()` - 20 edges
3. `compilerOptions` - 19 edges
4. `EP04 Admin Frontend` - 18 edges
5. `TenantsListPage()` - 16 edges
6. `request()` - 15 edges
7. `cn()` - 13 edges
8. `3) Contratos request/response (tipado real)` - 12 edges
9. `EP04 Frontend Handoff (contrato backend completo)` - 10 edges
10. `friendlyError()` - 9 edges

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

## Communities (21 total, 7 thin omitted)

### Community 0 - "operations-page.tsx"
Cohesion: 0.16
Nodes (16): react, EmptyState(), EmptyStateProps, friendlyError(), map, copyText(), formatDuration(), shortId() (+8 more)

### Community 1 - "package.json"
Cohesion: 0.07
Nodes (32): name, private, scripts, build, dev, preview, type, version (+24 more)

### Community 2 - "hooks.ts"
Cohesion: 0.08
Nodes (47): ACTIVE_OPERATION_STATUSES, ACTIVE_STATUSES, MODULES, OPERATION_STATUSES, OPERATION_TYPES, TENANT_STATUSES, TERMINAL_OPERATION_STATUSES, TERMINAL_TENANT_STATUSES (+39 more)

### Community 3 - "tenant-detail-page.tsx"
Cohesion: 0.20
Nodes (17): AlertIcon(), base, CheckIcon(), CloseIcon(), CopyIcon(), DotsIcon(), IconProps, compactOperationId() (+9 more)

### Community 4 - "compilerOptions"
Cohesion: 0.10
Nodes (20): compilerOptions, allowImportingTsExtensions, baseUrl, isolatedModules, jsx, lib, module, moduleDetection (+12 more)

### Community 5 - "tenants-list-page.tsx"
Cohesion: 0.20
Nodes (14): RefreshIcon(), SearchIcon(), SkeletonTableRows(), SkeletonTableRowsProps, useRetryTenant(), useTenants(), clamp(), erpLabel() (+6 more)

### Community 6 - "dependencies"
Cohesion: 0.22
Nodes (9): dependencies, clsx, @hookform/resolvers, react, react-dom, react-hook-form, react-router-dom, @tanstack/react-query (+1 more)

### Community 7 - "cn"
Cohesion: 0.32
Nodes (6): OperationStatusBadge(), statusMap, StatusBadge(), statusMap, cn(), PullRequestPill()

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

### Community 18 - "devDependencies"
Cohesion: 0.29
Nodes (7): devDependencies, @types/node, @types/react, @types/react-dom, typescript, vite, @vitejs/plugin-react

### Community 19 - "utils.ts"
Cohesion: 0.57
Nodes (6): ERP_LABELS, formatDate(), formatDatePart(), formatRelativeDate(), formatTimePart(), splitDateTime()

## Knowledge Gaps
- **5 isolated node(s):** `clsx`, `@types/node`, `@types/react`, `@types/react-dom`, `typescript`
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 141 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **7 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `TenantStatus` connect `hooks.ts` to `3) Contratos request/response (tipado real)`, `tenants-list-page.tsx`, `cn`?**
  _High betweenness centrality (0.122) - this node is a cross-community bridge._
- **What connects `clsx`, `@types/node`, `@types/react` to the rest of the system?**
  _5 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.06951219512195123 - nodes in this community are weakly interconnected._
- **Why does `3.3 Listar tenants` connect `3) Contratos request/response (tipado real)` to `hooks.ts`?**
  _High betweenness centrality (0.118) - this node is a cross-community bridge._
- **Should `hooks.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.08272859216255443 - nodes in this community are weakly interconnected._
- **Should `compilerOptions` be split into smaller, more focused modules?**
  _Cohesion score 0.09523809523809523 - nodes in this community are weakly interconnected._
- **Should `3) Contratos request/response (tipado real)` be split into smaller, more focused modules?**
  _Cohesion score 0.07692307692307693 - nodes in this community are weakly interconnected._