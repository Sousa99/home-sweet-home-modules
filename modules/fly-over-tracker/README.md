# fly-over-tracker

[![Part of Home Sweet Home](https://img.shields.io/badge/Home%20Sweet%20Home-Module-blue)](https://github.com/)

Track which aircraft are flying over a given location — REST API, MCP tool, and React SPA.

## Overview

Ask "what's flying over here right now?" and get a live picture of the aircraft above a
GPS point and radius, plus where each flight is heading (origin/destination airports) and
closest-aircraft details. The module is built around the free, open
[adsb.lol](https://adsb.lol) feed and works with **no credentials or configuration**.

## Features

- Query aircraft over any GPS point + radius (up to ~463 km).
- Resolves origin and destination airports for each matched flight from route data.
- Closest-aircraft calculation and "up to" live refresh from the feed.
- REST API **and** an MCP `planes_over` tool — the same service powers both.
- React SPA with a Leaflet map, aircraft cards, and embeddable dashboard widgets.

## Architecture

- **Backend** — one dual-mode package (`@sousa99/fly-over-tracker-backend`):
  - `--http` → REST API on `:3000`
  - `--mcp` → MCP server over streamable HTTP on `:3001`
  - Both share the same service/feed/cache layer; no separate packages.
- **Frontend** — one package (`@sousa99/fly-over-tracker-components`) producing the SPA,
  a Storybook workbench, and a publishable components library.

## Backend

### REST API

| Endpoint | Description |
|----------|-------------|
| `GET /api/fly-overs?lat=&lng=&radiusKm=` | Aircraft currently over a GPS point and radius |
| `GET /api/health` | Health check |

### MCP tool

| Tool | Input | Returns |
|------|-------|---------|
| `planes_over` | `lat`, `lng`, `radiusKm` | Aircraft over the point and radius, with destinations |

### Configuration

All runtime configuration is optional and environment-driven — defaults are safe and no
secrets are needed. See [docs/configuration.md](./docs/configuration.md) for the full
reference (ports, feed timeouts, retry/backoff, cache TTLs, `FEED=mock` for offline
development).

```bash
cp backend/.env.example backend/.env
```

## Frontend

The SPA is a location-focused dashboard built with React 19, Tailwind CSS v4, and Leaflet:
a form to pick a location, a map with live aircraft markers, aircraft/closest-aircraft
cards, refresh-rate control, and a compact embeddable widget. Components are documented in
Storybook.

## Run

From the repository root:

```bash
pnpm --filter ./modules/fly-over-tracker/backend dev          # REST API in dev (--http)
pnpm --filter ./modules/fly-over-tracker/backend dev:mcp      # MCP server in dev (--mcp)
pnpm --filter ./modules/fly-over-tracker/backend start        # REST API (--http)
pnpm --filter ./modules/fly-over-tracker/backend start:mcp    # MCP server (--mcp)
pnpm --filter ./modules/fly-over-tracker/frontend dev         # SPA dev server
pnpm --filter ./modules/fly-over-tracker/frontend storybook   # Storybook workbench
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
- [docs/configuration.md](./docs/configuration.md) — backend environment reference.
- [docs/clarify.md](./docs/clarify.md) — foundational decisions settled at creation.

## Governance

See the [constitution](../.specify/memory/constitution.md) for the project's governing
principles.