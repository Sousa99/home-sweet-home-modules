# Quickstart: Validating Weather Psychic

**Feature**: `007-weather-psychic` | **Date**: 2026-10-04 | **Plan**: [plan.md](./plan.md)

This guide proves the feature works end-to-end. It is a validation/run guide — full implementation
lives in `tasks.md` and the implementation phase.

## Prerequisites

- pnpm 11 + Node 24, repo installed (`pnpm install`).
- The weather-psychic module exists (`modules/weather-psychic/`) with its fixed release group
  registered in `.changeset/config.json`, as described in [`plan.md`](./plan.md).
- Tests written first (red → green) per the test-first skill.

## What is validated

| # | Scenario | Proves |
|---|----------|--------|
| 1 | Backend unit + contract tests pass | Shared schemas, WMO→condition mapping, hourly/daily exclusion, REST ↔ MCP parity ([`contracts/backend-api.md`](./contracts/backend-api.md)) |
| 2 | Frontend component tests pass | Both widgets render the right data; hourly excludes current hour; daily excludes today; auto-scroll; selector; persistence ([`contracts/frontend-api.md`](./contracts/frontend-api.md)) |
| 3 | Mock-feed end-to-end | Backend (REST + MCP) serves current/hourly/daily from the deterministic mock — no network needed |
| 4 | Live Open-Meteo end-to-end | Backend serves real weather for a chosen location |
| 5 | SPA + widgets manually | Dashboard shows current + hourly + daily for the selected location; widgets embed elsewhere |
| 6 | Storybook workbench | Both widgets + selector previewable with fixture locations; docs pages present |

## Commands

### 1. Backend tests (mock feed, hermetic)

```bash
pnpm --filter @sousa99/weather-psychic-backend test
pnpm --filter @sousa99/weather-psychic-backend typecheck
```

**Expected**: `weather-service.test.ts` (hourly starts at next hour, daily starts tomorrow, both
ordered, `generatedAt` present), `conditions.test.ts` (WMO-code fixture mapping), and
`contract/rest-mcp-parity.test.ts` (REST response deep-equals MCP tool response for the same
coordinate and query) all pass.

### 2. Frontend tests

```bash
pnpm --filter @sousa99/weather-psychic-components test
pnpm --filter @sousa99/weather-psychic-components typecheck
```

**Expected**: `CurrentWeatherCard.test.tsx` renders detailed current data; its hourly strip's first
entry is the next local hour (current hour absent); auto-scroll advances on an interval and stops
at the end; reduced-motion disables animation; error keeps last-known data. `DailyForecastCard.test.tsx`
starts at tomorrow (today absent) with succinct per-day summaries. `LocationSelector.test.tsx`,
`useLocation.test.ts`, `useAutoScroll.test.ts`, `format.test.ts`, `conditions.test.ts` all pass.

### 3. Mock-feed end-to-end (offline)

```bash
pnpm --filter ./modules/weather-psychic/backend dev            # REST on :3000 (FEED=mock)
pnpm --filter ./modules/weather-psychic/backend dev:mcp        # MCP on :3001
```

- `curl 'http://localhost:3000/api/health'` → 200 `{ ok: true, service: 'weather-psychic' }`.
- `curl 'http://localhost:3000/api/weather?lat=38.72&lng=-9.14'` → 200 with `current`, `hourly`
  (first entry after the current hour), `daily` (first entry tomorrow), `generatedAt`.
- `curl 'http://localhost:3000/api/locations/search?query=lisbon'` → 200 with `results`.
- `curl 'http://localhost:3000/api/weather?lat=abc'` → 400 `validation_error`.
- An MCP client (or a direct Streamable-HTTP call to `/mcp`) calling `weather.get_forecast` and
  `weather.search` returns the identical payloads as the REST endpoints above.

### 4. Live Open-Meteo end-to-end

```bash
FEED=open-meteo pnpm --filter ./modules/weather-psychic/backend dev
```

Repeat the curl checks above — values now come from the live provider (no API key required). Kill
the network and repeat: the module returns the documented `provider_unavailable` error, and the SPA
widgets keep last-known data (never a broken/blank widget).

### 5. SPA + widgets

```bash
pnpm --filter ./modules/weather-psychic/backend dev            # REST on :3000
pnpm --filter ./modules/weather-psychic/frontend dev           # SPA on :5173 (proxy /api → :3000)
```

Open the dashboard: search and select a city → the `CurrentWeatherCard` shows detailed current
weather and its hourly strip auto-scrolls right (excluding the current hour); the
`DailyForecastCard` lists tomorrow onward (excluding today), succinct. Reload: the selection is
remembered. Kill the backend: widgets keep last-known data and report the failure.

Embed check (SC-007): render `CurrentWeatherCard`/`DailyForecastCard` in a demo surface with
`location={cityA}` and `location={cityB}` — each shows its own city's data; no cross-contamination.

### 6. Storybook workbench

```bash
pnpm --filter ./modules/weather-psychic/frontend storybook     # :6006
```

Open `Weather/CurrentWeatherCard`, `Weather/DailyForecastCard`, and `Weather/LocationSelector`:
loading/ready/error/empty variants render correctly with fixture locations; the written
`WeatherPsychic.mdx` page documents both widgets and the selector with runnable previews.

## Gate run (before any PR)

```bash
pnpm lint && pnpm format && pnpm typecheck && pnpm test
```

**Expected**: all four gates green across the workspace, including both weather-psychic packages.