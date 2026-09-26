# Quickstart: Dashboard Embed Components

Runnable validation guide for `specs/006-dashboard-components`. It proves the two widgets work
end-to-end against the module backend; implementation details live in `tasks.md` and the
implementation phase. For the public API see [contracts/](./contracts/) and for the domain
concepts [data-model.md](./data-model.md).

## Prerequisites

- Node.js 24 LTS, pnpm 11
- `pnpm install` (workspace: `backend`, `frontend`)

## Published surface

The package `@sousa99/fly-over-tracker-components` publishes **only the two dashboard
widgets** — `FlyOverWidget` and `ClosestAircraftCard` (plus their prop types and the shared
types they reference). The SPA components and the API client are internal.

```tsx
import { FlyOverWidget, ClosestAircraftCard } from '@sousa99/fly-over-tracker-components';
import '@sousa99/fly-over-tracker-components/styles.css';
```

## 1. Start the backend

```bash
pnpm --filter ./backend dev          # REST API (--http) on :3000
```

**Expected**: pino logs show the server listening. The backend serves the same
`GET /api/fly-overs` the widgets consume (closest = `aircraft[0]`, already distance-sorted).

## 2. Validate the widgets in Storybook

```bash
pnpm --filter ./frontend storybook   # workbench on :6006
```

Open the **`DashboardWidgets`** section: an `Overview` MDX page plus a doc page per widget
(usage, interactive props via Controls, and a full props table via ArgTypes), alongside the
state stories. The stories render against mocked `fetch` sample data, so they work offline.

**Expected**:
- **FlyOverWidget** renders a map centered on the configured location with the radius circle and
  aircraft markers, and the compact `AircraftMapCard` list beneath it. It fills the container
  width; the map expands to the available height and the list takes its natural height.
- **ClosestAircraftCard** renders the single nearest aircraft with the full `AircraftCard`
  presentation, filling the width at natural height.
- Changing the widget's `location`/`autoRefresh` in the story re-configures and re-fetches.
- The top-corner `Updating…` indicator appears during a refresh and disappears on completion.

## 3. Validate against the live backend

Either point a story at the running backend (`baseUrl: 'http://localhost:3000'`, CORS/proxy
permitting) or mount the widgets in the SPA dev server (which proxies `/api` → `:3000`):

```bash
pnpm --filter ./frontend dev         # SPA dev on :5173
```

Pick a location with air traffic (e.g. near an airport, `48.8566, 2.3522`, radius `50`) and
observe:

- **Closest-plane behavior**: the card shows the nearest aircraft within the radius; when a
  refresh yields a different closest aircraft, the card transitions smoothly (fade + slide),
  never abruptly.
- **Empty state**: configure a remote/ocean location → both widgets show a clear empty message.
- **Error state**: stop the backend (or block network) and refresh → clear error, no stale data
  presented as fresh.
- **Auto-refresh**: set `autoRefresh` to `5` → results update every ~5s with the indicator
  appearing around each update.

## 4. Tests and quality gates

```bash
pnpm --filter ./frontend test        # widget unit tests (react-leaflet mock + mocked fetch)
pnpm typecheck
pnpm lint
pnpm format
node scripts/scaffold.mjs --check
```

**Expected**: all pass before commit/merge. The exports regression test
(`src/lib/__tests__/exports.test.ts`) asserts the package publishes exactly the two widgets
(and no SPA components or API client).

## Rate-limit awareness

The module backend queries the live ADS-B feed (adsb.lol). Frequent auto-refresh testing can
hit its usage limits; the `503` feed-unavailable error surfaces as the widgets' clear error
state. For repetitive validation prefer the mocked-fetch stories.