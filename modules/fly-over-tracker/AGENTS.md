# AGENTS.md — fly-over-tracker

Guidance for contributors (human or AI) working in the **fly-over-tracker** module.

## Purpose

Track which aircraft are flying over a given location: query aircraft over a GPS point + radius,
resolve origin/destination airports, and show closest-aircraft details. Built on the free
[adsb.lol](https://adsb.lol) feed — no credentials or configuration required. The backend is a
single dual-mode package serving both the REST API and the MCP server from the same
service/feed/cache layer (stateless — no database); the frontend publishes the `FlyOverWidget`
and `ClosestAircraftCard` dashboard widgets.

## Packages & layout

```text
backend/    @sousa99/fly-over-tracker-backend    — one dual-mode package: REST (--http) + MCP (--mcp)
frontend/   @sousa99/fly-over-tracker-components — one package: SPA, Storybook, components library
Dockerfile.backend / Dockerfile.frontend / Dockerfile.storybook — build inputs for the GHCR images
deploy/     deployment manifests (nginx confs + templates + entrypoint scripts)
docs/       module guides (configuration.md, clarify.md)
```

## Common commands (from the repo root)

```bash
pnpm --filter ./modules/fly-over-tracker/backend dev          # REST API in dev (--http, :3000)
pnpm --filter ./modules/fly-over-tracker/backend dev:mcp      # MCP server in dev (--mcp, :3001)
pnpm --filter ./modules/fly-over-tracker/backend start        # REST API (--http)
pnpm --filter ./modules/fly-over-tracker/backend start:mcp    # MCP server (--mcp)
pnpm --filter ./modules/fly-over-tracker/frontend dev         # SPA dev server (:5173, proxies /api)
pnpm --filter ./modules/fly-over-tracker/frontend storybook   # Storybook workbench (:6006)
```

Docker Compose (repo-root `docker-compose.yml`): services `fly-over-tracker-backend|mcp|spa|storybook`
with fixed host ports `3101/3201/3301/3401` (see
`specs/004-local-setup-standardization/contracts/ports.md`) and the shared repo-root `data/`
directory convention (used by the DB-backed modules; fly-over-tracker persists nothing). Profiles:
`mcp`, `rest+spa`, `rest+storybook`, `backend`, `full`.

Tests / typecheck / lint run through the shared gates:
`pnpm --filter ./modules/fly-over-tracker/backend test` (or the root `pnpm test` / `pnpm typecheck` /
`pnpm lint`).

## Conventions & quality gates

- **Dual-mode parity**: REST and MCP share the same service/feed/cache layer and the same
  `LocationQuerySchema` — a contract change must be covered on both surfaces (backend contract
  tests live under `backend/src/tests/contract/`).
- **Stateless**: the module has no database — live data comes from the external feed only. Do not
  introduce persistence.
- **Feed degradation**: the module degrades gracefully when the live feed is unavailable (bounded
  retries on `429`, `FEED=mock` for offline development); keep that behavior intact in changes.
- **No credentials**: the module works with no external configuration — do not introduce required
  secrets.
- **Base URL convention**: the SPA reads `API_BASE_URL` at runtime via `/config.json`
  (`src/api/baseUrl.ts`); `FlyOverWidget` / `ClosestAircraftCard` accept an optional `baseUrl` prop
  and `getFlyOvers(query, baseUrl)` accepts a base-URL argument. Precedence: prop > SPA env >
  same-origin `/api` (see `docs/module-standard.md` §2).
- **Test-first (non-negotiable)**: any behavior change starts with a failing Vitest test, then
  implementation, then a green run. See `.opencode/skills/test-first`.
- **Quality gates**: ESLint, Prettier, typecheck, and Vitest must pass; module extends the shared
  presets from `@sousa99/homesweethome-config`.
- **Release**: the fixed changeset group is `@sousa99/fly-over-tracker-backend` +
  `@sousa99/fly-over-tracker-components` — they version together.

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

- `backend/src/index.ts` — dual-mode entry: `--http` → REST, `--mcp` → MCP; binds `HOST`/`PORT`
  (REST) and `HOST`/`MCP_PORT` (MCP).
- `backend/src/lib/config.ts` — runtime config: `PORT` (3000), `HTTP_PORT` (backward-compatible
  alias, wins when both set), `MCP_PORT` (3001), `HOST`, `MAX_RADIUS_KM` (463),
  `ADSB_BASE_URL`, `ADSB_ROUTE_BASE_URL`, `FEED` (`adsb` | `mock`), `FEED_TIMEOUT_MS`, retry/backoff
  and destination-cache TTLs (full reference in `docs/configuration.md`).
- `backend/src/http/app.ts` + `http/routes.ts` — REST: the single `GET /api/fly-overs` route
  (mounted under `/api`), consistent 404 / error responses.
- `backend/src/mcp/server.ts` — MCP server (streamable HTTP at `/mcp`) exposing the `planes_over`
  tool; reuses `LocationQuerySchema` (parity by construction).
- `backend/src/services/flyOverService.ts` — the shared query pipeline: validate → feed snapshot →
  distance sort/filter → route enrichment with positive/negative cache.
- `backend/src/feeds/` — `adsbLol.ts` / `adsbRoutes.ts` (live), `mock.ts` / `mockRoutes.ts`
  (deterministic offline data).
- `backend/src/domain/schemas.ts` — the shared `LocationQuerySchema` (lat/lng/radiusKm).
- `frontend/src/api/baseUrl.ts` — SPA runtime base URL: `loadApiBaseUrl()` reads `/config.json`
  before first render; empty ⇒ same-origin `/api`.
- `frontend/src/api/client.ts` — `getFlyOvers(query, baseUrl?)` shared client helper.
- `frontend/src/components/FlyOverWidget.tsx` / `ClosestAircraftCard.tsx` — the two published
  widgets (props: `location`, `autoRefresh`, `baseUrl`, `className`); each self-fetches through its
  own isolated TanStack Query client.
- `frontend/src/App.tsx` — the SPA dashboard: query form, list/map toggle, refresh-rate control,
  `FlyOverMap` behind `MapErrorBoundary`.
- `frontend/src/components/*.mdx` + `*.stories.tsx` — workbench docs and previews
  (`FlyOverWidget.mdx`, `ClosestAircraftCard.mdx`, `DashboardWidgets.mdx`).
- `frontend/src/index.ts` — library entry (published surface: widgets + prop/API types).

The public package surface is documented in `frontend/src/index.ts` (and locked by the exports
test); do not remove or rename exported members without a version bump.