# AGENTS.md — bus-catcher

Guidance for contributors (human or AI) working in the **bus-catcher** module.

## Purpose

Bus arrival tracking for Lisbon's **Carris Metropolitana**: search lines and stops, see next
arrivals at a stop (static schedule + live ETAs), and keep a personal stop list with alert
thresholds. Local-first — your stop list persists in this module's SQLite database. The backend
is a single dual-mode package serving both the REST API and the MCP server from the same
service/db layer; the frontend publishes the `StopCard` widget.

## Packages & layout

```text
backend/    @sousa99/bus-catcher-backend    — one dual-mode package: REST (--http) + MCP (--mcp)
frontend/   @sousa99/bus-catcher-components — one package: SPA, Storybook, components library
Dockerfile.backend / Dockerfile.frontend / Dockerfile.storybook — build inputs for the GHCR images
deploy/     deployment manifests (nginx confs + templates + entrypoint scripts)
docs/       module guides (clarify.md)
```

## Common commands (from the repo root)

```bash
pnpm --filter ./modules/bus-catcher/backend dev          # REST API in dev (--http, :3000)
pnpm --filter ./modules/bus-catcher/backend dev:mcp      # MCP server in dev (--mcp, :3001)
pnpm --filter ./modules/bus-catcher/backend start        # REST API (--http)
pnpm --filter ./modules/bus-catcher/backend start:mcp    # MCP server (--mcp)
pnpm --filter ./modules/bus-catcher/backend db:generate  # if schema changed
pnpm --filter ./modules/bus-catcher/backend db:migrate   # applies SQL migrations
pnpm --filter ./modules/bus-catcher/frontend dev         # SPA dev server (:5173, proxies /api)
pnpm --filter ./modules/bus-catcher/frontend storybook   # Storybook workbench (:6006)
```

Docker Compose (repo-root `docker-compose.yml`): services `bus-catcher-backend|mcp|spa|storybook`
with fixed host ports `3100/3200/3300/3400` (see
`specs/004-local-setup-standardization/contracts/ports.md`) and the shared `data/` directory.

Tests / typecheck / lint run through the shared gates:
`pnpm --filter ./modules/bus-catcher/backend test` (or the root `pnpm test` / `pnpm typecheck` /
`pnpm lint`).

## Conventions & quality gates

- **Dual-mode parity**: REST and MCP share the same service/db layer — a contract change must be
  covered on both surfaces.
- **Local-first**: user data (stop list, alert thresholds) stays in the module's SQLite database;
  no external sync by default.
- **Feed degradation**: the module degrades gracefully when the realtime feed is unavailable —
  schedule-only fallback; keep that behavior intact in changes.
- **Base URL convention**: the SPA reads `API_BASE_URL` at runtime via `/config.json`
  (`src/api/baseUrl.ts`); `StopCard` accepts an optional `baseUrl` prop. Precedence: prop > SPA env
  > same-origin `/api` (see `docs/module-standard.md` §2).
- **Test-first (non-negotiable)**: any behavior change starts with a failing Vitest test, then
  implementation, then a green run. See `.opencode/skills/test-first`.
- **Quality gates**: ESLint, Prettier, typecheck, and Vitest must pass; module extends the shared
  presets from `@sousa99/homesweethome-config`.
- **Release**: the fixed changeset group is `@sousa99/bus-catcher-backend` +
  `@sousa99/bus-catcher-components` — they version together.

## Agent & skill routing

Delegate by task; the main assistant must not perform git/GitHub operations.

| Task | Delegate to |
|------|-------------|
| Commit, push, branches, PRs, issues, CI/Actions | `github-helper` |
| Implementation (test-first) | `implementer` |
| Test suite / coverage verdict | `tester` |
| Pre-merge code review | `reviewer` |
| Version bumps + changeset verification (pre-PR) | `version-analyser` |
| Final minor-fix polish | `nitpicker` |
| README / setup.md / docs sync | `documenter` |

Skills: load on demand — `test-first`, `quality-gates`, `commit-hygiene`,
`changelog-release-notes`, `spec-driven-development`.

## Codebase orientation

- `backend/src/index.ts` — dual-mode entry: `--http` → REST, `--mcp` → MCP.
- `backend/src/config.ts` — runtime config: `PORT` (3000), `MCP_PORT` (3001), `DB_PATH`
  (default `../../data/bus-catcher.db`), GTFS/realtime URLs, realtime TTL/staleness.
- `backend/src/http/app.ts` — REST routes (`/api/lines`, `/api/stops`, `/api/stops/:id/times`,
  `/api/status`, `/api/refresh`, `/api/config` and the stop-list CRUD under `/api/config/stops`).
- `backend/src/mcp/index.ts` — MCP tools: `list_lines`, `search_stops`, `get_stop`,
  `get_stop_times`, `get_status`, `refresh_schedule`, `get_config`, `add_stop`, `update_stop`,
  `remove_stop`.
- `backend/src/services/` — `schedule.ts` (next arrivals + realtime availability),
  `refresh.ts` (feed ingestion), `config.ts` (personal stop list + thresholds).
- `backend/src/providers/carris-metropolitana/` — GTFS and realtime feed adapters.
- `backend/src/db/` — Drizzle schema, client, `migrate.ts`.
- `frontend/src/api/baseUrl.ts` — SPA runtime base URL: `loadApiBaseUrl()` reads `/config.json`
  before rendering; empty ⇒ same-origin `/api`.
- `frontend/src/components/StopCard.tsx` — the published widget (props: `stopId`, `stopName`,
  `lines`, `limit`, `refetchIntervalMs`, `fetchTimes`, `baseUrl`, `missing`, `thresholds`).
- `frontend/src/lib/urgency.ts` — threshold defaults (`10 / 5 / 1`) and urgency levels.
- `frontend/src/pages/Dashboard.tsx` / `Config.tsx` — the SPA's two tabs.

The public package surface is documented in `frontend/src/index.ts` and the `StopCard.mdx`
workbench page; do not remove or rename exported members without a version bump.