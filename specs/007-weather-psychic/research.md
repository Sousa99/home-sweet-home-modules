# Research: Weather Psychic

**Feature**: `007-weather-psychic` | **Date**: 2026-10-04 | **Plan**: [plan.md](./plan.md)

Researches every unknown flagged in the Technical Context and the technology choices for the
weather-psychic module.

## R-001 — Weather data source (upstream provider)

- **Decision**: Integrate **Open-Meteo** as the module's weather + geocoding provider: its
  Forecast API (`https://api.open-meteo.com/v1/forecast`) for current/hourly/daily data and its
  Geocoding API (`https://geocoding-api.open-meteo.com/v1/search`) for location search.
- **Rationale**: Free, keyless, and account-free for open-source/non-commercial use ("No API key is
  required"); worldwide coverage; a single forecast call returns current, hourly, and daily data;
  a companion geocoding API resolves named locations to WGS84 coordinates + timezone; hourly data
  includes the WMO `weather_code` needed for graphic condition display; timestamps are returned
  local-time when `timezone` is supplied. It keeps the module private-by-default (no account, no
  registration, no personal data — only a location query) and requires no secret to manage in the
  repo or Dockerfiles.
- **Alternatives considered**: OpenWeatherMap and WeatherAPI (both require a registration + API
  key, contradict private-by-default and add secret-management burden); Met.no (free and keyless
  but requires attribution/user-agent compliance and a separate geocoding source); NWS (US-only).
  Mock/simulated data alone fails the spec's core ask (real current + forecast).

## R-002 — Backend architecture (REST + MCP parity)

- **Decision**: Stateless dual-mode backend: one entry (`--http` | `--mcp`), a single service layer
  over a **feed seam** (`WeatherFeed` + `LocationFeed` interfaces with a live Open-Meteo impl and a
  deterministic mock impl), shared zod schemas in `domain/schemas.ts` consumed by both REST
  (`zValidator`) and MCP (`inputSchema`), and a shared error taxonomy mapped to consistent REST
  error bodies and MCP `isError` responses.
- **Rationale**: Matches the repo's strongest existing patterns (fly-over-tracker's split
  `http/app.ts` + `http/routes.ts`, shared-schema REST/MCP parity, mock-vs-live feed seam, and
  `tests/contract/` parity tests). Stateless means no DB migration, no persistence, and trivially
  restartable compose services. Sharing schemas makes REST ↔ MCP parity "by construction" rather
  than by test alone (constitution Principle V).
- **Alternatives considered**: bus-catcher's inline-route + DB-backed style (unnecessary without
  persistence); procrastinator-tracker's OpenAPIHono + Drizzle (heavier than needed for a read-only
  query module). Dotted tool names (`weather.search`, `weather.get_forecast`) vs flat snake_case —
  dotted namespaces win for discoverability and match the procrastinator convention.

## R-003 — Frontend data-fetching & widget self-sufficiency

- **Decision**: Three-layer API client (`api/baseUrl.ts` base-url contract + `api/client.ts`
  `request<T>()` + `api/types.ts`), TanStack Query hooks in the SPA (`api/queries.ts`), and
  **self-fetching widgets** that do not depend on a host-created QueryClient: each widget takes an
  injectable `fetch` prop (for Storybook fixtures and hermetic tests) and an optional `baseUrl`
  prop, using internal `useState` + a small poll loop (bus-catcher `StopCard` pattern) or an
  internally-scoped QueryClient (fly-over pattern).
- **Rationale**: Published widgets must render correctly when embedded in any dashboard without
  requiring the host to set up TanStack Query (this is the established convention — bus-catcher
  `StopCard` self-fetches via injectable `fetchTimes`; fly-over widgets ship their own isolated
  QueryClient). The base-url resolution order `prop > SPA env > same-origin /api` is the locked
  contract in `specs/004-local-setup-standardization/contracts/base-url.md`.
- **Alternatives considered**: Relying on a shared host QueryClient (rejected — breaks embedding);
  build-time env for the API URL (rejected — violates the runtime base-url contract).

## R-004 — Hourly auto-scroll implementation

- **Decision**: The hourly strip auto-scrolls to the right via a timer-driven horizontal scroll
  advance (`useAutoScroll` hook: a fixed advance interval, e.g. every few seconds scrolls by one
  slot width), pausing/stopping gracefully at the end of the available hours and wrapping or
  stopping without layout breakage. The strip is seeded to exclude the current hour (data starts at
  the next hour) and re-seeds on the hour boundary.
- **Rationale**: A CSS transform/marquee alone cannot reliably reveal "later hours" based on data
  length and container width; a timer advancing `scrollLeft`/a translate on an overflow-x container
  is simple, testable with fake timers, accessible (respects `prefers-reduced-motion`), and
  deterministic for Storybook previews. The "exclude current hour" requirement is enforced at the
  data-shaping step (unit-tested), not in the animation.
- **Alternatives considered**: Pure CSS marquee (`animation` translate) — rejected for lack of
  end-of-data handling and reduced-motion control; `requestAnimationFrame`-driven continuous scroll
  — rejected as heavier and harder to test.

## R-005 — Condition display (WMO weather codes)

- **Decision**: A pure `conditions.ts` mapping (backend + frontend each have one, kept in sync by
  contract tests on a shared fixture) that maps Open-Meteo's WMO `weather_code` (0–99) to a
  human-readable condition label and an icon key, used by the graphic current display, the hourly
  strip, and the daily list. The backend returns the raw `weatherCode` plus the derived `condition`
  label in its JSON; the frontend maps codes to icons.
- **Rationale**: WMO codes are the provider's canonical condition signal and are already present in
  `current`, `hourly`, and `daily` responses, so one mapping powers all three views. Deriving the
  label server-side keeps the published components simple; keeping the icon mapping client-side
  avoids shipping an icon dependency in the backend.
- **Alternatives considered**: Shipping icons from the backend (rejected — adds binary/asset
  complexity to a JSON API); using the provider's raw code only (rejected — not human-friendly).

## R-006 — Localization / units

- **Decision**: Celsius temperatures and km/h wind (Open-Meteo defaults), returned as-is from the
  provider and formatted in the frontend (`format.ts`) with locale-aware date/time formatting for
  the user's browser locale. No unit toggle in v1.
- **Rationale**: The spec requires a succinct, readable display; metric units are the provider
  default and the repo's sibling modules have no unit-preference surface. A unit toggle is a clear
  future addition, out of scope for v1.
- **Alternatives considered**: Fahrenheit / imperial config (rejected for v1 — no request, adds
  config surface to every widget); hard-coding `en-US` formatting (rejected — locale-aware
  `Intl` is free).

## R-007 — Location selection & persistence

- **Decision**: The SPA's `DashboardPage` renders a `LocationSelector` (debounced search against
  `GET /api/locations/search`, select from results) bound to a `useLocation` hook that persists the
  chosen location in browser local storage under `weather-psychic:location`. Both published widgets
  accept a required `location` prop (a resolved location: name, lat, lng, timezone) and an optional
  `baseUrl`; they are configurable per embed and never persist anything themselves.
- **Rationale**: Matches the spec (location selectable in the SPA, configurable per component) and
  the current-time precedent for local-storage preference keys (`current-time:time-format`).
  Persisting the resolved location object (not just the query string) avoids a re-search on reload.
- **Alternatives considered**: Persisting the search query and re-searching on load (rejected —
  extra network hop and non-deterministic); a global module-level location registry shared across
  widgets (rejected — breaks per-embed configurability).

## R-008 — Ports & release registration

- **Decision**: Register the module as slug index **4** in the fixed host-port contract: REST
  `3104`, MCP `3204`, SPA `3304`, Storybook `3404` (index 3's `3303`/`3403` are already taken by
  the frontend-only current-time module). Native dev defaults stay `3000`/`3001` inside compose
  containers. Add the fixed release group
  `["@sousa99/weather-psychic-backend", "@sousa99/weather-psychic-components"]` to
  `.changeset/config.json` (version together from 0.0.1).
- **Rationale**: The ports contract in `specs/004-local-setup-standardization/contracts/ports.md`
  allocates `3xxx` blocks indexed by module slug order; using the next free index (4) keeps zero
  collisions. The changesets fixed-group convention is per-module (constitution, Releases).
- **Alternatives considered**: Reusing index 3 for weather-psychic (rejected — collides with
  current-time's `3303`/`3403`); separate release groups per package (rejected — fixed group keeps
  the module's two packages versioning together per convention).

## Consolidated decisions

| # | Decision | Rationale summary |
|---|----------|-------------------|
| R-001 | Open-Meteo (keyless) + mock feed | Free, account-free, worldwide, single-call current+hourly+daily, geocoding; private-by-default; mock keeps offline/hermetic dev |
| R-002 | Stateless dual-mode backend, shared zod schemas, feed seam | Repo's strongest parity pattern; no persistence needed |
| R-003 | Self-fetching widgets with injectable fetch + baseUrl | Embeddable anywhere; locked base-url contract |
| R-004 | Timer-driven horizontal auto-scroll, data excludes current hour | Simple, testable, reduced-motion friendly, end-of-data safe |
| R-005 | WMO-code → condition label/icon mapping (both sides) | One canonical signal powers all three views |
| R-006 | Metric units, locale-aware formatting, no unit toggle v1 | Provider default; succinct display; no extra config surface |
| R-007 | SPA `LocationSelector` + `useLocation` (localStorage); widgets take `location` prop | Selectable + configurable per spec; current-time persistence precedent |
| R-008 | Ports `3104/3204/3304/3404`; new fixed release group | Zero-collision port allocation; per-module versioning convention |