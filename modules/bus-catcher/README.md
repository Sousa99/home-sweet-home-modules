# bus-catcher

[![Part of Home Sweet Home](https://img.shields.io/badge/Home%20Sweet%20Home-Module-blue)](https://github.com/)

Bus arrival tracking for Lisbon's **Carris Metropolitana** — REST API, MCP tool, and React
SPA.

## Overview

Watch the buses you care about: search lines and stops, see the next arrivals at a stop
(static schedule enriched with live ETAs when the realtime feed is up), and keep a personal
list of stops with alert thresholds. The module is local-first — you choose and persist
your own stop list; it stays in this module's database.

## Features

- Search **lines** and **stops** from the Carris Metropolitana feed.
- **Next arrivals** at a stop: schedule + live ETAs, delay, and a realtime availability
  indicator (degrades gracefully to schedule-only when the feed is down).
- **Stop coverage** map showing which lines serve the area.
- Manage a **personal stop list** with configurable alert thresholds (green / amber /
  orange / urgent).
- REST API **and** MCP tools — the same service powers both.

## Architecture

- **Backend** — one dual-mode package (`@sousa99/bus-catcher-backend`):
  - `--http` → REST API (default port `3000`)
  - `--mcp` → MCP server over streamable HTTP (`3001`)
  - SQLite database (Drizzle) for the feed snapshot, config, and stop list; a refresh
    service ingests the upstream Carris Metropolitana feed.
- **Frontend** — one package (`@sousa99/bus-catcher-components`) producing the SPA, a
  Storybook workbench, and a publishable components library.

## Backend

### REST API

| Endpoint | Description |
|----------|-------------|
| `GET /api/health` | Health check |
| `GET /api/lines` | List lines |
| `GET /api/stops` | Search/list stops |
| `GET /api/stops/:id` | Stop details |
| `GET /api/stops/:id/times` | Next arrivals (schedule + live) |
| `GET /api/status` | Feed status (last refresh, staleness) |
| `POST /api/refresh` | Trigger a feed refresh |
| `GET /api/config` | Personal stop list + thresholds |
| `POST /api/config/stops` · `PUT /api/config/stops/:id` · `DELETE /api/config/stops/:id` | Manage the personal stop list |

### MCP tools

| Tool | Purpose |
|------|---------|
| `list_lines` · `search_stops` · `get_stop` · `get_stop_times` | Look up lines, stops, and next arrivals |
| `refresh_schedule` · `get_status` | Feed lifecycle |
| `get_config` · `add_stop` · `update_stop` · `remove_stop` | Personal stop list + thresholds |

## Frontend

The SPA is a bus dashboard built with React 19 and Tailwind CSS v4: stop search, a
coverage map, next-arrival lists with live ETAs, and a configuration panel for the personal
stop list and alert thresholds. Components are documented in Storybook.

## Run

From the repository root:

```bash
pnpm --filter ./modules/bus-catcher/backend dev          # REST API in dev (--http)
pnpm --filter ./modules/bus-catcher/backend dev:mcp      # MCP server in dev (--mcp)
pnpm --filter ./modules/bus-catcher/backend start        # REST API (--http)
pnpm --filter ./modules/bus-catcher/backend start:mcp    # MCP server (--mcp)
pnpm --filter ./modules/bus-catcher/frontend dev         # SPA dev server
pnpm --filter ./modules/bus-catcher/frontend storybook   # Storybook workbench
```

## Quality gates

Uniform gates, enforced on every pull request for every module:

```bash
pnpm lint       # ESLint (shared flat config)
pnpm format     # Prettier check (shared config)
pnpm test       # Vitest
pnpm typecheck  # tsc --noEmit
```

## Releases

This module releases **independently** via changesets: its `backend` and `components`
packages share one version, and a release publishes the components package (npm), the
backend/frontend container images (GHCR), and a GitHub release. See the [repository
README](../README.md) and [.changeset/README.md](../.changeset/README.md).

## Documentation

- [setup.md](./setup.md) — prerequisites, package organization, pipelines.
- [docs/clarify.md](./docs/clarify.md) — foundational decisions settled at creation.

## Governance

See the [constitution](../.specify/memory/constitution.md) for the project's governing
principles.