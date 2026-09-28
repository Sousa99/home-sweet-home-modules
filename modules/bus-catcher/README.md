# bus-catcher

[![Part of Home Sweet Home](https://img.shields.io/badge/Home%20Sweet%20Home-Module-blue)](https://github.com/)

Bus arrival tracking for Lisbon's **Carris Metropolitana** — REST API, MCP tools, and a React SPA.

## Overview

Watch the buses you care about: search lines and stops from the Carris Metropolitana feed, see the
next arrivals at a stop (static schedule enriched with live ETAs when the realtime feed is up), and
keep a personal list of stops with configurable alert thresholds. The module is local-first — you
choose and persist your own stop list; it stays in this module's SQLite database.

One dual-mode backend serves both the REST API (`--http`) and the MCP server (`--mcp`), sharing the
same service/db layer, and the frontend package produces the SPA, a Storybook workbench, and a
publishable components library.

## 🧰 Stack

| Layer | Technology |
|-------|------------|
| Backend | Node 24, Hono, Drizzle ORM, better-sqlite3, MCP TypeScript SDK |
| Frontend | Vite, React 19, Tailwind CSS v4, TanStack Query |
| Tooling | pnpm 11, TypeScript, ESLint (flat config), Prettier, Vitest, Testing Library |

The backend is a single codebase with a **dual-mode entry**: `--http` serves the REST API on
`:3000` (`PORT`), `--mcp` serves the MCP server over streamable HTTP on `:3001` (`MCP_PORT`). Both
modes share the same service/db layer — no separate backend packages.

## ✨ Features

- **Stop search** — search stops by name from the ingested Carris Metropolitana feed.
- **Next arrivals** — per-stop waiting times: static schedule plus live ETAs, delay, and a
  realtime availability indicator (degrades gracefully to schedule-only when the feed is down).
- **Stop coverage** — a per-stop notice showing whether live realtime data is available.
- **Config list with thresholds** — manage a personal stop list with optional line filters and
  per-stop alert thresholds (defaults: heads-up `10` min, leave-now `5` min, missed `1` min);
  each configured stop renders as a `StopCard` on the dashboard.
- **Feed lifecycle** — a refresh service ingests the upstream GTFS feed; status shows staleness
  and you can trigger a refresh on demand.
- REST API **and** MCP tools — the same service powers both.

## 🧰 Prerequisites

- Node 24, pnpm 11 (see the repository root `AGENTS.md` / `setup.md`)

## 🚀 Getting Started

From the repository root:

```bash
pnpm install                                             # install the whole workspace
pnpm --filter ./modules/bus-catcher/backend dev          # REST API in dev (--http, default :3000)
pnpm --filter ./modules/bus-catcher/backend dev:mcp      # MCP server in dev (--mcp, default :3001)
pnpm --filter ./modules/bus-catcher/frontend dev         # SPA dev server (default :5173, proxies /api)
pnpm --filter ./modules/bus-catcher/frontend storybook   # component workbench (default :6006)
```

Or run the module in the shared Docker Compose environment (repo-root `data/` directory for the
database, fixed host ports per `specs/004-local-setup-standardization/contracts/ports.md`):

```bash
docker compose --profile rest+spa up -d        # REST backend (:3100) + SPA (:3300)
docker compose --profile rest+storybook up -d  # REST backend (:3100) + Storybook (:3400)
docker compose --profile mcp up -d             # MCP server (:3200)
docker compose --profile full up -d            # backend, MCP, SPA, and Storybook together
```

Compose services: `bus-catcher-backend` (REST, host `3100`), `bus-catcher-mcp` (MCP, host `3200`),
`bus-catcher-spa` (host `3300`), and `bus-catcher-storybook` (host `3400`).

## 🧪 Quality Gates

```bash
pnpm --filter ./modules/bus-catcher/backend test        # Vitest suite
pnpm --filter ./modules/bus-catcher/backend typecheck   # tsc --noEmit
pnpm --filter ./modules/bus-catcher/frontend test       # Vitest suite
pnpm --filter ./modules/bus-catcher/frontend typecheck  # tsc --noEmit
pnpm --filter ./modules/bus-catcher/frontend build      # SPA build (dist-app)
pnpm --filter ./modules/bus-catcher/frontend build:lib  # publishable library build (dist-lib)
pnpm --filter ./modules/bus-catcher/frontend build-storybook # static workbench (dist-storybook)
```

The module extends the shared presets from `@sousa99/homesweethome-config`, so the repository-wide
`pnpm lint`, `pnpm format`, `pnpm typecheck`, and `pnpm test` cover it too.

## 📦 Package

| Package | Registry | Purpose |
|---------|----------|---------|
| `@sousa99/bus-catcher-components` | GitHub Packages (`npm.pkg.github.com`) | SPA + publishable components library |

The public surface is the `StopCard` widget, the `resolveThresholds` helper with
`DEFAULT_THRESHOLDS`, and the types `StopCardProps`, `FetchStopTimes`, `Passing`, `RealtimeInfo`,
`StopTimesResponse`, `DepartureThresholds`, and `UrgencyLevel`. Releases are independent via its
own changesets fixed group (`@sousa99/bus-catcher-backend` + `@sousa99/bus-catcher-components`),
starting at `0.0.1`.

### Embedding the StopCard

```tsx
import '@sousa99/bus-catcher-components/styles.css';
import { StopCard } from '@sousa99/bus-catcher-components';

function NextBus() {
  return (
    <StopCard
      stopId="060201"
      stopName="Rua da Prata"
      lines={['3701']}
      baseUrl="https://bus.example.com" // optional — empty means same-origin /api
    />
  );
}
```

`StopCard` fetches the next arrivals itself, polling on `refetchIntervalMs` (default `15000`). The
optional `baseUrl` prop points the built-in client at a remote backend; when empty it targets the
same-origin `/api` path. See the `StopCard.mdx` workbench page for the full prop reference.

## 📚 Learn More

- Repository layout, conventions, and delegation: root `AGENTS.md`
- Module-specific run commands and troubleshooting: [`setup.md`](setup.md)
- Module guidance for contributors: [`AGENTS.md`](AGENTS.md)
- Foundational decisions: [`docs/clarify.md`](docs/clarify.md)