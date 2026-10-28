# EP04 Admin Frontend - Project State

Last update: 2026-10-28

## Purpose

This project is the admin frontend for EP04.
It manages tenants and provisioning operations through the backend API under `/api/v1`.

## Current Functional Scope

- Tenants list with pagination, search and status filter.
- Tenant creation form with client-side validation.
- Tenant detail with readiness/status/PR/event data.
- Retry flow for failed tenants.
- Async tenant deletion flow.
- Global operations page with filters (`status`, `type`, `tenantId`).
- Polling on active states and API error-code handling.
- Login via Amazon Cognito Hosted UI (Authorization Code + PKCE); config injected at runtime through `/config.js`.
- Tenant S3 storage block (secret revealed on demand) and ingestion tab (runs, manual run, logs).
- Backend contract reference: `FRONTEND_HANDOFF_EP04.md`. Not implemented yet: forms driven by `/catalogs/provisioning-policy`.

## Runtime and Deployment

- Development runtime: Vite dev server.
- Production runtime: static build served by Nginx (security headers, immutable asset cache, `/config.js` runtime config).
- Container flow: Dockerfile with `dev` and `production` targets.
- Cluster manifests: `deploy/` (namespace, configmap, deployment, service, ingress, hpa, pdb, kustomization).
- GitOps manifest: `argocd/application-ep04-admin-frontend.yaml`.

## Graphify in this Repository

Goal: help any human or AI agent understand architecture and current status quickly.

Repository-level integration already exists:

- `AGENTS.md`
- `.codex/skills/graphify/SKILL.md`
- `.codex/hooks.json`
- `CLAUDE.md`

Local model config for semantic extraction is stored in `.graphify`.
Current default points to a local llama.cpp OpenAI-compatible server:

- `OPENAI_BASE_URL=http://127.0.0.1:8085/v1`
- `OPENAI_MODEL=Qwen3.8-27B-UD-Q4_K_S.gguf`

Adjust these values per machine if needed.

## Quick Start for a New Contributor or Agent

1. Read `README.md` and this file (`PROJECT_STATE.md`).
2. If Graphify is not installed:
   - `uv tool install graphifyy`
3. In project root:
   - `source .graphify`
   - `graphify extract . --code-only`
4. Ask graph-first questions:
   - `graphify query "how does tenant creation flow work?"`
   - `graphify path "tenants-list-page" "api.ts"`
   - `graphify explain "create-tenant-page"`
5. After code changes:
   - `graphify update .`

## Maintenance Rule

After meaningful product or architecture changes, update this file and run `graphify update .`.
This keeps onboarding context and graph state aligned.