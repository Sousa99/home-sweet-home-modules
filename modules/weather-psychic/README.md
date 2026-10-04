# weather-psychic

[![Part of Home Sweet Home](https://img.shields.io/badge/Home%20Sweet%20Home-Module-blue)](https://github.com/)

What's the weather now and what's coming — REST API, MCP tool, and a React SPA.

## Overview

Ask "what's the weather like right now and what's coming?" and get the current conditions in
detail plus the forecast ahead for any place on Earth. The module is built on the free, keyless
[Open-Meteo](https://open-meteo.com) provider — **no account, no API key, no configuration** — and
an offline `mock` feed keeps it fully functional and testable without network.

One dual-mode backend serves both the REST API (`--http`) and the MCP server (`--mcp`) from the
same service/feed layer, and the frontend package produces the SPA, a Storybook workbench, and a
publishable components library with two widgets plus a location selector.

## 🧰 Stack

| Layer | Technology |
|-------|------------|
| Backend | Node 24, Hono, zod, MCP TypeScript SDK (`@modelcontextprotocol/server` + `@modelcontextprotocol/hono`), pino |
| Frontend | Vite, React 19, Tailwind CSS v4, React Router, lucide-react |
| Tooling | pnpm 11, TypeScript, ESLint (flat config), Prettier, Vitest, Testing Library |

The backend is a single codebase with a **dual-mode entry**: `--http` serves the REST API on
`:3000` (`PORT`), `--mcp` serves the MCP server over streamable HTTP on `:3001` (`MCP_PORT`). Both
modes share the same service/feed layer — no separate backend packages. The module is
**stateless**: there is no database; weather data comes from the upstream provider only. The only
persisted state is the SPA's chosen location, kept in browser local storage.

## ✨ Features

- **Current weather in detail** — temperature, condition, feels-like, humidity, wind,
  precipitation probability, and UV, with a graphic condition icon.
- **Auto-scrolling hourly strip** — the coming hours (excluding the current hour) advance to the
  right on their own, respecting `prefers-reduced-motion`.
- **Daily forecast list** — the upcoming days (starting tomorrow, today excluded) as a succinct
  day / condition / low-high summary.
- **Selectable, configurable location** — choose a place in the SPA (remembered across visits) or
  pass a `location` to either widget for per-embed configuration.
- **REST + MCP parity** — both interfaces share the same zod schemas, so they accept and return
  identical payloads.
- **Keyless provider** — Open-Meteo requires no registration; a deterministic `mock` feed powers
  offline development and hermetic tests.

## 🧰 Prerequisites

- Node 24, pnpm 11 (see the repository root `AGENTS.md` / `setup.md`)

## 🚀 Getting Started

From the repository root:

```bash
pnpm install                                              # install the whole workspace
pnpm --filter ./modules/weather-psychic/backend dev       # REST API (default :3000)
pnpm --filter ./modules/weather-psychic/frontend dev      # SPA dev server (:5173, proxies /api)
pnpm --filter ./modules/weather-psychic/backend dev:mcp   # MCP server (default :3001)
pnpm --filter ./modules/weather-psychic/frontend storybook # component workbench (:6006)
```

## 🧪 Quality Gates

```bash
pnpm --filter @sousa99/weather-psychic-backend test        # backend Vitest suite (unit + REST/MCP contract)
pnpm --filter @sousa99/weather-psychic-backend typecheck
pnpm --filter @sousa99/weather-psychic-components test     # frontend Vitest suite
pnpm --filter @sousa99/weather-psychic-components typecheck
pnpm --filter @sousa99/weather-psychic-components build    # app build (dist-app)
pnpm --filter @sousa99/weather-psychic-components build:lib # publishable library build (dist-lib)
```

The module extends the shared presets from `@sousa99/homesweethome-config`, so the repository-wide
`pnpm lint`, `pnpm format`, `pnpm typecheck`, and `pnpm test` cover it too.

## 📦 Package

| Package | Registry | Purpose |
|---------|----------|---------|
| `@sousa99/weather-psychic-backend` | GitHub Packages (`npm.pkg.github.com`) | Dual-mode REST + MCP backend |
| `@sousa99/weather-psychic-components` | GitHub Packages (`npm.pkg.github.com`) | SPA + publishable components library |

The public surface is `CurrentWeatherCard`, `DailyForecastCard`, `LocationSelector`, their prop
types and injectable fetcher types, plus the shared API types (`Location`, `Forecast`,
`CurrentWeather`, `HourlyEntry`, `DailyEntry`). The two packages version together in one changesets
fixed group, starting at `0.0.1`.

### Embedding the widgets

```tsx
import '@sousa99/weather-psychic-components/styles.css';
import { CurrentWeatherCard, DailyForecastCard } from '@sousa99/weather-psychic-components';

function Dashboard() {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <CurrentWeatherCard location={lisbon} />
      <DailyForecastCard location={lisbon} />
    </div>
  );
}
```

Each widget self-fetches its own data (no host React Query setup required), renders the shared
`WidgetStatusBar` on top, and honors the base-url contract: an optional `baseUrl` prop defaults to
the runtime-configured API base URL (`/config.json` / `API_BASE_URL`), falling back to
same-origin `/api`.

## 📚 Learn More

- Repository layout, conventions, and delegation: root `AGENTS.md`
- Module-specific run commands and troubleshooting: [`setup.md`](setup.md)
- Module guidance for contributors: [`AGENTS.md`](AGENTS.md)
- Feature specification, plan, and contracts: `specs/007-weather-psychic/`