# Frontend API Contract: Weather Psychic

**Branch**: `007-weather-psychic` | **Date**: 2026-10-04 | **Spec**: [../spec.md](../spec.md) | **Plan**: [../plan.md](../plan.md)

The frontend package `@sousa99/weather-psychic-components` publishes two weather widgets plus a
location selector. The public surface (library entry `src/index.ts`) MUST export exactly the
following; anything else is internal and not part of the contract.

## 1. Shared prop types

- `Location` — the resolved location object (see [`data-model.md`](../data-model.md)); the
  `location` prop accepted by both widgets.
- `Forecast`, `CurrentWeather`, `HourlyEntry`, `DailyEntry` — response types mirroring the backend
  schemas (see [`backend-api.md`](./backend-api.md)).

## 2. `CurrentWeatherCard` (component) — Widget 1

Detailed current weather with a graphic display plus an auto-scrolling hourly strip.

| Prop | Type | Default | Meaning |
|------|------|---------|---------|
| `location` | `Location` | (required) | The place whose current + hourly weather is shown. |
| `fetchForecast` | `(input: { location: Location }) => Promise<Forecast>` | default client | Injectable data fetcher (Storybook fixtures / tests). |
| `baseUrl` | `string` | `''` (same-origin `/api`) | Overrides the resolved API base URL (base-url contract). |
| `refetchIntervalMs` | `number` | `900000` (15 min) | Auto-refresh cadence; `0` disables. |
| `className` | `string` | `undefined` | Extra classes for the widget root. |

Behavior:
- Renders the shared `WidgetStatusBar` **above the card** (per the `005` status-bar contract:
  "Last updated …", "Updating…", Refresh; `lastUpdatedAt`/`updating`/`error`/`onRefresh` derived
  from the widget's load state) — the status row sits outside the card chrome, matching the other
  modules' published widgets.
- Renders the current conditions in a detailed, graphic format (temperature, condition, feels-like,
  humidity, wind, precipitation probability, UV; icon driven by `weatherCode` + `isDay`).
- Below it, an hourly strip of the coming hours **excluding the current hour** (FR-003) that
  auto-scrolls to the right over time, stops/wraps gracefully at the end of data (FR-004), and
  respects `prefers-reduced-motion`.
- Honors the [base-url contract](../004-local-setup-standardization/contracts/base-url.md): the
  `baseUrl` prop is forwarded to the default client; on error keeps last-known data and reports the
  failure.

## 3. `DailyForecastCard` (component) — Widget 2

Compact, succinct list of the upcoming days.

| Prop | Type | Default | Meaning |
|------|------|---------|---------|
| `location` | `Location` | (required) | The place whose daily forecast is shown. |
| `fetchForecast` | `(input: { location: Location }) => Promise<Forecast>` | default client | Injectable data fetcher. |
| `baseUrl` | `string` | `''` | Overrides the resolved API base URL. |
| `refetchIntervalMs` | `number` | `900000` | Auto-refresh cadence; `0` disables. |
| `className` | `string` | `undefined` | Extra classes for the widget root. |

Behavior:
- Renders the shared `WidgetStatusBar` **above the card** (same status-bar contract as
  `CurrentWeatherCard`).
- Lists the upcoming days **starting tomorrow** (today excluded, FR-005) in ascending order, each a
  very succinct summary: day name, condition (icon + label), low/high temperature (FR-006).
- Stays compact and scannable; long horizons are capped (5 entries, planning decision).
- Honors the base-url contract (`baseUrl` prop forwarded to the default client); keeps last-known
  data on error.

## 4. `LocationSelector` (component)

Search-and-select control for choosing the location.

| Prop | Type | Default | Meaning |
|------|------|---------|---------|
| `value` | `Location \| null` | `null` | Currently selected location (controlled). |
| `onChange` | `(location: Location) => void` | (required) | Called when a search result is chosen. |
| `searchLocations` | `(query: string) => Promise<Location[]>` | default client | Injectable search fetcher. |
| `baseUrl` | `string` | `''` | Overrides the resolved API base URL. |
| `placeholder` | `string` | `'Search for a city…'` | Input placeholder. |

Behavior: debounced search as the user types; results list; selecting a result calls `onChange`.
Used by the SPA dashboard; not required to persist anything itself (persistence is the SPA's
`useLocation`, not this component).

## 5. SPA & persistence

- `DashboardPage` composes `LocationSelector` (bound to `useLocation`) with both widgets and is the
  default route of the SPA.
- **Storage key**: `weather-psychic:location` — stores the resolved `Location` JSON in browser
  local storage. Absent/invalid → no selection, dashboard prompts to choose. Written only by the
  SPA `useLocation` hook; widgets never read/write it (FR-007, FR-008).
- The SPA resolves the API base URL via `loadApiBaseUrl()` (base-url contract: `/config.json` +
  `API_BASE_URL` env, fallback same-origin `/api`), precedence `baseUrl` prop > SPA env >
  same-origin `/api`.

## 6. Non-contract guarantees

- Internal modules (`api/`, `components/ui/`, `App.tsx`, `main.tsx`, SPA pages beyond
  `DashboardPage`) and the internal `HourlyStrip`/`useAutoScroll`/`useLocation`/`format.ts`/
  `conditions.ts` helpers are NOT part of the surface and MAY change without a version bump.
- Adding exports is a minor change; renaming/removing a contract member or changing widget props is
  a breaking change requiring a version bump and changeset.

## 7. Component workbench

- `CurrentWeatherCard.stories.tsx` / `DailyForecastCard.stories.tsx` — state/variant matrix
  (loading, ready with fixture forecasts, empty, error, reduced-motion) with injected
  `fetchForecast` fixtures.
- `LocationSelector.stories.tsx` — search + select with a fixture `searchLocations`.
- `WeatherPsychic.mdx` — written documentation page (Meta/Canvas/ArgTypes) covering both widgets
  and the selector (spec FR-013).

## 8. Validation coverage

- `CurrentWeatherCard.test.tsx` — renders detailed current data + hourly strip; strip excludes the
  current hour; auto-scroll advances; end-of-data stops gracefully; reduced-motion; status bar;
  error keeps last-known data.
- `DailyForecastCard.test.tsx` — list starts tomorrow; today excluded; succinct summary per entry;
  compact cap.
- `LocationSelector.test.tsx` — debounced search, result select → `onChange`.
- `useLocation.test.ts` — seeds from stored location, persists on change, invalid-value fallback.
- `useAutoScroll.test.ts` — advances on interval, stops at end, respects reduced motion.
- `format.test.ts` / `conditions.test.ts` — formatting and WMO-code mapping.