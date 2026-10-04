# fly-over-tracker

[![Part of Home Sweet Home](https://img.shields.io/badge/Home%20Sweet%20Home-Module-blue)](https://github.com/)

Aircraft tracking over any GPS location — REST API, MCP tool, and a React SPA.

## Overview

Ask "what's flying over here right now?" and get a live picture of the aircraft above a GPS point
and radius, plus where each flight is heading (origin/destination airports) and closest-aircraft
details. The module is built on the free, open [adsb.lol](https://adsb.lol) feed and works with
**no credentials or configuration**; when the feed is unavailable it degrades gracefully instead of
crashing.

One dual-mode backend serves both the REST API (`--http`) and the MCP server (`--mcp`) from the
same service/feed/cache layer, and the frontend package produces the SPA, a Storybook workbench,
and a publishable components library.

## 🧰 Stack

| Layer | Technology |
|-------|------------|
| Backend | Node 24, Hono, zod, MCP TypeScript SDK (`@modelcontextprotocol/server` + `@modelcontextprotocol/hono`), pino |
| Frontend | Vite, React 19, Tailwind CSS v4, TanStack Query, Leaflet / react-leaflet |
| Tooling | pnpm 11, TypeScript, ESLint (flat config), Prettier, Vitest, Testing Library |

The backend is a single codebase with a **dual-mode entry**: `--http` serves the REST API on
`:3000` (`PORT`), `--mcp` serves the MCP server over streamable HTTP on `:3001` (`MCP_PORT`). Both
modes share the same service/feed/cache layer — no separate backend packages. The module is
**stateless**: there is no database; live data comes from the external feed only.

## ✨ Features

- **Query aircraft over any GPS point + radius** — up to `MAX_RADIUS_KM` (default `463` km), the
  adsb.lol `/v2/point` cap.
- **Origin/destination airport resolution** — every matched flight is enriched with origin and
  destination airports (and cities/countries) from adsb.lol route data, with positive/negative
  caching; aircraft without a resolvable route report `null`.
- **Closest-aircraft card** — a deterministic nearest-aircraft pick (minimum `distanceKm`, with an
  `icao24` tie-break).
- **Map mode** — a Leaflet map with aircraft markers, plus a list view; both share one query.
- **Refresh-rate control** — auto-refresh at a chosen cadence, with stale/updating indicators.
- **Standardized status bar** — every widget shows the shared status bar (`Last updated
  {HH:MM:SS}` or `Not updated yet`, an `Updating…` indicator, a manual `Refresh` button, and a
  failure notice that keeps the last successful time) — identical wording and behavior across
  all Home Sweet Home modules.
- **Graceful degradation** — bounded retries on upstream `429`, clear user-facing errors when the
  feed is down, and `FEED=mock` for deterministic offline development.
- **REST API and MCP tool** — the same service powers both; the MCP `planes_over` tool reuses the
  identical zod schema (parity by construction).
- **Storybook workbench** — written `.mdx` docs pages for the embeddable widgets.

## 🧰 Prerequisites

- Node 24, pnpm 11 (see the repository root `AGENTS.md` / `setup.md`)

## 🚀 Getting Started

From the repository root:

```bash
pnpm install                                             # install the whole workspace
pnpm --filter ./modules/fly-over-tracker/backend dev     # REST API in dev (--http, default :3000)
pnpm --filter ./modules/fly-over-tracker/backend dev:mcp # MCP server in dev (--mcp, default :3001)
pnpm --filter ./modules/fly-over-tracker/frontend dev    # SPA dev server (default :5173, proxies /api)
pnpm --filter ./modules/fly-over-tracker/frontend storybook # component workbench (default :6006)
```

Or run the module in the shared Docker Compose environment (fixed host ports per
`specs/004-local-setup-standardization/contracts/ports.md`; fly-over-tracker is stateless, so no
database is involved):

```bash
docker compose --profile rest+spa up -d        # REST backend (:3101) + SPA (:3301)
docker compose --profile rest+storybook up -d  # REST backend (:3101) + Storybook (:3401)
docker compose --profile mcp up -d             # MCP server (:3201)
docker compose --profile backend up -d         # REST + MCP backends only
docker compose --profile full up -d            # backend, MCP, SPA, and Storybook together
```

Compose services: `fly-over-tracker-backend` (REST, host `3101`), `fly-over-tracker-mcp` (MCP, host
`3201`), `fly-over-tracker-spa` (host `3301`), and `fly-over-tracker-storybook` (host `3401`).

## 🧪 Quality Gates

```bash
pnpm --filter ./modules/fly-over-tracker/backend test      # Vitest suite (REST + MCP contracts)
pnpm --filter ./modules/fly-over-tracker/backend typecheck # tsc --noEmit
pnpm --filter ./modules/fly-over-tracker/frontend test     # Vitest suite
pnpm --filter ./modules/fly-over-tracker/frontend typecheck # tsc --noEmit
pnpm --filter ./modules/fly-over-tracker/frontend build    # SPA build (dist-app)
pnpm --filter ./modules/fly-over-tracker/frontend build:lib # publishable library build (dist-lib)
pnpm --filter ./modules/fly-over-tracker/frontend build-storybook # static workbench (dist-storybook)
```

The module extends the shared presets from `@sousa99/homesweethome-config`, so the repository-wide
`pnpm lint`, `pnpm format`, `pnpm typecheck`, and `pnpm test` cover it too.

## 📦 Package

| Package | Registry | Purpose |
|---------|----------|---------|
| `@sousa99/fly-over-tracker-components` | GitHub Packages (`npm.pkg.github.com`) | SPA + publishable components library |

The public surface is the two self-sufficient dashboard widgets — `FlyOverWidget` (map + aircraft
list) and `ClosestAircraftCard` (nearest aircraft) — together with the prop types
`FlyOverWidgetProps`, `ClosestAircraftCardProps`, and `RefreshRate`, and the API types `Aircraft`,
`Center`, `FlyOverResult`, and `LocationQuery`. The backend (`@sousa99/fly-over-tracker-backend`)
is private and ships as a container image, not an npm package. The package is ESM-only — CommonJS
consumers use dynamic import — and declares `react`, `react-dom`, `leaflet`, and `react-leaflet` as
peer dependencies. Releases are independent via its own changesets fixed group (`backend` +
`components`), starting at `0.0.1`.

### Embedding the widgets

```tsx
import '@sousa99/fly-over-tracker-components/styles.css';
import { ClosestAircraftCard, FlyOverWidget } from '@sousa99/fly-over-tracker-components';

function WatchAircraft() {
  const location = { lat: 48.8566, lng: 2.3522, radiusKm: 50 };
  return (
    <div className="h-96 w-full">
      <FlyOverWidget
        location={location}
        autoRefresh={10}
        baseUrl="https://fly.example.com" // optional — empty means same-origin /api
      />
      <ClosestAircraftCard location={location} autoRefresh={60} />
    </div>
  );
}
```

Both widgets fetch and auto-refresh their own data (an isolated TanStack Query client — no host
wiring required). Each shows the standardized status bar (`Last updated {HH:MM:SS}` — or
`Not updated yet` before the first load — plus an `Updating…` indicator, a `Refresh` button, and
a failure notice when the feed is down). The optional `baseUrl` prop points the built-in client
at a remote backend; when empty it targets the runtime-configured value (`/config.json` /
`API_BASE_URL`) or the same-origin `/api` path. `FlyOverWidget` fills the available width and
expands the map into the available vertical space; `ClosestAircraftCard` fills the width and only
the height its content needs. See the `FlyOverWidget.mdx` / `ClosestAircraftCard.mdx` workbench
pages for the full prop reference.

## 📚 Learn More

- Repository layout, conventions, and delegation: root `AGENTS.md`
- Module-specific run commands and troubleshooting: [`setup.md`](setup.md)
- Module guidance for contributors: [`AGENTS.md`](AGENTS.md)
- Backend environment reference: [`docs/configuration.md`](docs/configuration.md)
- Foundational decisions: [`docs/clarify.md`](docs/clarify.md)