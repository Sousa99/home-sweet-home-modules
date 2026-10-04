# Implementation Plan: Weather Psychic

**Branch**: `007-weather-psychic` | **Date**: 2026-10-04 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/007-weather-psychic/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command; its definition describes the execution workflow.

## Summary

A new self-contained Home Sweet Home module, **weather-psychic**, that shows what the weather is
currently and to come. It ships a **dual-mode backend** (REST + MCP, driven by a free keyless
weather provider with an offline mock feed) and a **frontend** (SPA + Storybook component
workbench) publishing two widgets: **(1)** `CurrentWeatherCard` — the current weather in detailed,
graphic form plus an hourly strip that auto-scrolls to the right and excludes the current hour —
and **(2)** `DailyForecastCard` — a compact, succinct list of the upcoming days starting tomorrow
(excluding today). A `LocationSelector` makes the location selectable in the SPA (choice persisted
locally) and both widgets accept a configurable `location` prop for embedding elsewhere. Data flows
backend → SPA/widgets over the module's REST API; the MCP server exposes the same capabilities for
programmatic/assistant access with REST/MCP parity by construction (shared zod schemas).

## Technical Context

**Language/Version**: TypeScript (ES2023), Node 24, React 19, pnpm 11

**Primary Dependencies**: Backend — Hono (`@hono/node-server`, `@hono/zod-validator`),
`@modelcontextprotocol/sdk` (Streamable HTTP), zod, dotenv, tsx (dev). Frontend — Vite 6 +
`vite-plugin-dts`, Tailwind CSS v4 (`@tailwindcss/vite`), Vitest 3 + @testing-library/react,
TanStack Query v5, react-router (v7) for the SPA shell, lucide-react icons, Storybook
(`@storybook/react-vite` + `addon-docs`). Both packages extend the shared presets from
`@sousa99/homesweethome-config`.

**Storage**: None server-side — the backend is stateless and derives all data from the upstream
weather provider at request time (no DB, no cache persistence). The only persisted state is the
SPA's chosen location, kept in browser local storage (`weather-psychic:location`).

**Testing**: Vitest + @testing-library/react + @testing-library/user-event + jsdom for the
frontend; Vitest for the backend. Backend contract tests assert REST ↔ MCP parity against the
shared schemas (mock feed keeps tests hermetic). Root gates: `pnpm lint`, `pnpm format`,
`pnpm typecheck`, `pnpm test`.

**Target Platform**: Browser (SPA + published React widget library + Storybook); Node 24 server
process running either `--http` or `--mcp`.

**Project Type**: Full-stack module — one dual-mode backend package and one frontend SPA +
components-library package, under `modules/weather-psychic/`.

**Performance Goals**: Per SC-001, a user sees the current weather within 2 s of the data being
available under normal conditions. The hourly strip auto-scroll reveals later hours smoothly
(SC-002) with no layout breakage. Forecast refresh happens on load and periodically while open
(planning decision: 15 min default, matching provider update cadence).

**Constraints**: Full conformance with the repository's [module standard]
(`specs/004-local-setup-standardization/contracts/module-standard.md`) and the shared status-bar
([`005`](../005-standardized-component-status/contracts/status-bar.md)) and [base-url]
(`specs/004-local-setup-standardization/contracts/base-url.md`) contracts: both published
data-fetching widgets MUST render the shared `WidgetStatusBar` on top (`lastUpdatedAt`/`updating`/
`error`/`onRefresh` derived from a common `LoadState`), MUST accept a configurable `location` prop
and an optional `baseUrl` prop, and MUST self-fetch (no host-required React Query setup). Keyless
weather provider required (no account/registration); external fetch is documented as the module's
opt-in integration per Local-First & Private by Default, with a deterministic mock feed for offline
dev and hermetic tests. The hourly strip MUST exclude the current hour; the daily list MUST exclude
the current day (spec FR-003/FR-005).

**Scale/Scope**: 1 new full-stack module (2 packages), 2 published widgets + 1 location selector,
1 REST API surface (2 endpoints) + 1 MCP server (2 tools), REST/MCP parity contract tests, SPA +
Storybook + Dockerfiles + README/setup.md/AGENTS.md, plus a new fixed release group in
`.changeset/config.json`, a host-port allocation update in the ports contract, and a module-standard
conformance self-check against `specs/004-local-setup-standardization/contracts/module-standard.md`.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **I. Module-First** — PASS. A new self-contained module under `modules/weather-psychic/` with
  backend + frontend packages, README, `setup.md`, and Dockerfiles — the standard module shape.
- **II. Local-First & Private by Default** — PASS with a documented, justified exception: weather
  data is inherently external, so the backend integrates a **free, keyless, account-free**
  provider (Open-Meteo) as the module's opt-in external integration; no household data ever leaves
  the home (only weather queries), the provider choice requires no account or registration, and an
  offline **mock feed** keeps the module functional and fully testable without network. Documented
  in the module README/setup.md. See Complexity Tracking.
- **III. Declared Identity & Uniform Tooling** — PASS. Identity declared in `package.json`
  (`@sousa99/weather-psychic-backend`, `@sousa99/weather-psychic-components`); directory name and
  package prefixes match; both extend `@sousa99/homesweethome-config` presets — no drift.
- **IV. Test-First (NON-NEGOTIABLE)** — PASS. Every behavior change is written test-first with
  Vitest (red → green → refactor) per the `test-first` skill — shared schemas, feed/condition
  mapping, REST + MCP parity, both widgets, the selector, and the auto-scroll behavior.
- **V. Contract & Integration Testing** — PASS. REST and MCP share the same zod schemas and the
  same service layer (parity by construction), and a dedicated contract test suite asserts REST ↔
  MCP parity and the endpoint contracts; frontend contract tests lock the published widget props.
- **Releases** — PASS. Registers the module's fixed release group in `.changeset/config.json`
  (`@sousa99/weather-psychic-backend` + `@sousa99/weather-psychic-components` version together,
  starting at 0.0.1), independent of other modules.

Result: all gates PASS; one justified exception (external weather provider) documented in
Complexity Tracking.

## Project Structure

### Documentation (this feature)

```text
specs/007-weather-psychic/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
# New module (workspace globs pick up modules/*/backend and modules/*/frontend automatically)
modules/weather-psychic/
├── AGENTS.md                        # per-module guidance (pattern of existing modules)
├── README.md                        # module overview, stack, features, embedding
├── setup.md                         # run commands and troubleshooting
├── Dockerfile.backend               # builds backend dist, runs --http or --mcp
├── Dockerfile.frontend              # builds SPA dist-app, nginx + /api proxy
├── Dockerfile.storybook             # builds dist-storybook workbench
├── eslint.config.mjs                # extends @sousa99/homesweethome-config/eslint
├── prettier.config.mjs              # extends @sousa99/homesweethome-config/prettier
├── tsconfig.base.json               # extends @sousa99/homesweethome-config/tsconfig.base
├── backend/
│   ├── package.json                 # @sousa99/weather-psychic-backend (dual-mode REST+MCP)
│   ├── tsconfig.json
│   ├── vitest.config.ts
│   └── src/
│       ├── index.ts                 # entry: dotenv, branch on --http | --mcp, build service
│       ├── domain/
│       │   ├── schemas.ts           # SHARED zod schemas: LocationQuerySchema, ForecastSchema…
│       │   └── types.ts             # Location, CurrentWeather, HourlyEntry, DailyEntry, Forecast
│       ├── feeds/
│       │   ├── types.ts             # WeatherFeed + LocationFeed interfaces
│       │   ├── openMeteo.ts         # live provider (geocoding + forecast endpoints)
│       │   └── mock.ts              # deterministic fixtures (hermetic tests, offline dev)
│       ├── services/
│       │   └── weatherService.ts    # validate → feed → map WMO codes → Forecast
│       ├── http/
│       │   ├── app.ts               # Hono app: cors, onError/notFound, mounts /api
│       │   └── routes.ts            # weatherRoutes(service): GET /api/weather, /api/locations/search
│       ├── mcp/
│       │   └── server.ts            # createMcpApp: tools search_locations + get_forecast (shared schemas)
│       ├── lib/
│       │   ├── config.ts            # zod-validated env (PORT, MCP_PORT, FEED, HOST)
│       │   ├── errors.ts            # AppError taxonomy + toErrorResponse (shared REST/MCP)
│       │   ├── conditions.ts        # WMO weather-code → label + icon key mapping
│       │   └── logger.ts            # minimal JSON logger
│       └── tests/
│           ├── contract/            # REST ↔ MCP parity + endpoint contracts
│           └── unit/                # service, conditions, config, errors
└── frontend/
    ├── package.json                 # @sousa99/weather-psychic-components (SPA + lib + Storybook)
    ├── tsconfig.json
    ├── vite.config.ts               # SPA build (dist-app), dev proxy /api → :3104
    ├── vite.lib.config.ts           # library build (dist-lib) via vite-plugin-dts
    ├── vitest.config.ts
    ├── index.html
    ├── .storybook/
    │   ├── main.ts                  # @storybook/react-vite + addon-docs + Tailwind
    │   └── preview.ts
    ├── deploy/                      # nginx entrypoint + proxy conf for Dockerfile.frontend
    └── src/
        ├── index.ts                 # PUBLIC SURFACE: widgets + props + types + lib helpers
        ├── main.tsx                 # loadApiBaseUrl() then render (QueryClientProvider)
        ├── App.tsx                  # SPA shell (routes → DashboardPage)
        ├── index.css                # Tailwind v4 + @theme --color-primary: #d97706
        ├── api/
        │   ├── baseUrl.ts           # base-url contract loader (/config.json + API_BASE_URL)
        │   ├── client.ts            # request<T>() + ApiError; api.searchLocations/getForecast
        │   ├── types.ts             # response types mirroring backend schemas
        │   └── queries.ts           # TanStack Query hooks (useSearchLocations, useForecast)
        ├── lib/
        │   ├── conditions.ts        # WMO code → label/icon (shared with components)
        │   ├── useLocation.ts       # SPA location state + localStorage persistence
        │   ├── useAutoScroll.ts     # hourly-strip auto-scroll-to-right hook
        │   └── format.ts            # temp/date/time formatting helpers
        ├── components/
        │   ├── CurrentWeatherCard.tsx    # WIDGET 1: current detail + HourlyStrip
        │   ├── HourlyStrip.tsx           # auto-scrolling hourly strip (excludes current hour)
        │   ├── DailyForecastCard.tsx     # WIDGET 2: succinct daily list (excludes today)
        │   ├── LocationSelector.tsx      # location picker (search + select)
        │   ├── ui/                       # Card, Badge, Button, Input primitives (amber/slate)
        │   ├── *.stories.tsx             # fixture-driven stories per widget
        │   └── *.mdx                     # written docs per published widget
        └── pages/
            └── DashboardPage.tsx         # composes LocationSelector + both widgets
```

**Structure Decision**: A standard full-stack module mirroring the strongest existing conventions:
the stateless dual-mode backend follows fly-over-tracker (split `http/app.ts` + `http/routes.ts`,
shared zod schemas in `domain/schemas.ts`, feed seam with mock support, zod-validated config,
shared error taxonomy, `tests/contract/` parity tests); the frontend follows bus-catcher /
fly-over-tracker (three-layer `api/` client with the base-url contract, TanStack Query hooks in the
SPA, self-fetching widgets with injectable fetcher + `baseUrl` props for Storybook/hermetic tests,
`--color-primary` amber/slate theme, published surface locked in `src/index.ts`). The two widgets
plus `LocationSelector` are the published surface; the SPA shell and API client stay internal.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| External weather provider (Open-Meteo) under Local-First & Private by Default | Weather data is inherently external — there is no way to report real current/forecast weather without an upstream source; a keyless, account-free provider is the least-privacy-invasive option (no registration, no API key, no personal data transmitted, only a location query). | A fully offline/simulated weather module would fail the spec's core ask ("display what is the weather currently and to come"); a provider requiring an API key/account would violate private-by-default more strongly and burden the user. The mock feed keeps offline capability and hermetic testing. |