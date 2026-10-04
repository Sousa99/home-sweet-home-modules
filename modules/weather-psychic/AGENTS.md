# AGENTS.md — weather-psychic

Guidance for contributors (human or AI) working in the **weather-psychic** module.

## Purpose

What's the weather now and what's coming: a dual-mode backend (REST + MCP) and a frontend (SPA +
Storybook) that publishes two widgets plus a location selector. `CurrentWeatherCard` shows the
current weather in a detailed, graphic format with an auto-scrolling hourly strip (current hour
excluded); `DailyForecastCard` lists the upcoming days starting tomorrow (today excluded) as
succinct day / condition / low-high rows. Data comes from the free keyless Open-Meteo provider with
a deterministic `mock` feed for offline development and hermetic tests.

## Packages & layout

```text
backend/    @sousa99/weather-psychic-backend    — one dual-mode package: REST (--http) + MCP (--mcp)
frontend/   @sousa99/weather-psychic-components — one package: SPA, Storybook, components library
Dockerfile.backend / Dockerfile.frontend / Dockerfile.storybook — build inputs for the GHCR images
deploy/     deployment manifests (nginx confs + templates + entrypoint scripts)
```

## Common commands (from the repo root)

```bash
pnpm --filter ./modules/weather-psychic/backend dev          # REST API in dev (--http, :3000)
pnpm --filter ./modules/weather-psychic/backend dev:mcp      # MCP server in dev (--mcp, :3001)
pnpm --filter ./modules/weather-psychic/backend start        # REST API (--http)
pnpm --filter ./modules/weather-psychic/backend start:mcp    # MCP server (--mcp)
pnpm --filter ./modules/weather-psychic/frontend dev         # SPA dev server (:5173, proxies /api)
pnpm --filter ./modules/weather-psychic/frontend storybook   # Storybook workbench (:6006)
```

Docker Compose (repo-root `docker-compose.yml`): services `weather-psychic-backend|mcp|spa|storybook`
with fixed host ports `3104/3204/3304/3404` (see
`specs/004-local-setup-standardization/contracts/ports.md`). Profiles: `mcp`, `rest+spa`,
`rest+storybook`, `backend`, `full`.

Tests / typecheck / lint run through the shared gates:
`pnpm --filter ./modules/weather-psychic/backend test` (or the root `pnpm test` / `pnpm typecheck` /
`pnpm lint`).

## Conventions & quality gates

- **Dual-mode parity**: REST and MCP share the same service/feed layer and the same zod schemas
  (`domain/schemas.ts`) — a contract change must be covered on both surfaces (backend contract tests
  live under `backend/src/tests/contract/`, including a REST ↔ MCP parity test).
- **Stateless**: the module has no database — weather data comes from the upstream provider only.
  Do not introduce persistence.
- **Feed degradation**: the module degrades gracefully when the live provider is unavailable
  (`ProviderUnavailableError`, HTTP 502), and `FEED=mock` runs a deterministic offline feed; keep
  that behavior intact in changes.
- **No credentials**: the module works with no external configuration — do not introduce required
  secrets.
- **Widgets**: both published widgets self-fetch (injectable `fetchForecast` prop for
  fixtures/tests), render the shared `WidgetStatusBar` on top, and honor the base-url contract
  (optional `baseUrl` prop > SPA `API_BASE_URL` via `/config.json` > same-origin `/api`).
- **Shaping guarantees**: the hourly strip MUST exclude the current hour and the daily list MUST
  exclude the current day (enforced in the backend service and defensively in the frontend).
- **Test-first (non-negotiable)**: any behavior change starts with a failing Vitest test, then
  implementation, then a green run. See `.opencode/skills/test-first`.
- **Quality gates**: ESLint, Prettier, typecheck, and Vitest must pass; module extends the shared
  presets from `@sousa99/homesweethome-config`.
- **Release**: the fixed changeset group is `@sousa99/weather-psychic-backend` +
  `@sousa99/weather-psychic-components` — they version together.

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
  (REST) and `HOST`/`MCP_PORT` (MCP); selects the feed by `FEED`.
- `backend/src/domain/schemas.ts` — the shared zod schemas (`LocationSchema`,
  `ForecastQuerySchema`, `LocationQuerySchema`, response schemas) used by REST and MCP.
- `backend/src/services/weatherService.ts` — the shared query pipeline: validate → feed → shape
  (hourly starts at the next hour, daily starts tomorrow, `generatedAt`).
- `backend/src/feeds/` — `openMeteo.ts` (live forecast + geocoding), `mock.ts` (deterministic
  offline fixtures).
- `backend/src/http/app.ts` + `http/routes.ts` — REST: `GET /api/health`, `GET /api/weather`,
  `GET /api/locations/search`.
- `backend/src/mcp/server.ts` — MCP server (streamable HTTP at `/mcp`) exposing
  `weather.get_forecast` and `weather.search`.
- `backend/src/lib/conditions.ts` — WMO weather-code → `{ label, iconKey }` mapping (mirrored in
  the frontend `src/lib/conditions.ts`).
- `frontend/src/api/` — `baseUrl.ts` (base-url contract), `client.ts` (`getForecast`,
  `searchLocations`), `queries.ts` (TanStack Query hooks), `types.ts`.
- `frontend/src/components/CurrentWeatherCard.tsx` / `HourlyStrip.tsx` / `DailyForecastCard.tsx` /
  `LocationSelector.tsx` — the published widgets (plus `fixtures.ts` for the workbench).
- `frontend/src/pages/DashboardPage.tsx` — the SPA dashboard composing the selector + both widgets.
- `frontend/src/lib/useLocation.ts` — SPA location state + local-storage persistence
  (`weather-psychic:location`).
- `frontend/src/index.ts` — library entry (published surface, locked by the exports test).

The public package surface is documented in `frontend/src/index.ts` (and locked by the exports
test); do not remove or rename exported members without a version bump.