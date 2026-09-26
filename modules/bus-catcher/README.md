# bus-catcher

[![Part of Home Sweet Home](https://img.shields.io/badge/Home%20Sweet%20Home-Module-blue)](https://github.com/)

Bus arrival tracking — REST API, MCP tool, and React SPA.

## 🧰 Stack

| Layer | Technology |
|-------|------------|
| Backend | Node 24, TypeScript |
| Frontend | Vite, React 19, Tailwind CSS v4 |
| Tooling | pnpm 11, TypeScript, ESLint, Prettier, Vitest |

## 🧰 Prerequisites

- Node.js 24 LTS
- pnpm 11

## 🚀 Setup

From the repository root:

```bash
pnpm install
```

See [setup.md](setup.md) for the full module setup guide, quality gates, and pipelines.
See [docs/clarify.md](docs/clarify.md) for the foundational decisions settled at module
creation.

## ⚙️ Backend

One dual-mode package — **REST API** (`--http`) and **MCP server** (`--mcp`) — sharing the
same service/db layer. Package: `@sousa99/bus-catcher-backend`.

```bash
pnpm --filter ./modules/bus-catcher/backend dev          # REST API in dev (--http)
pnpm --filter ./modules/bus-catcher/backend dev:mcp      # MCP server in dev (--mcp)
pnpm --filter ./modules/bus-catcher/backend start        # REST API (--http)
pnpm --filter ./modules/bus-catcher/backend start:mcp    # MCP server (--mcp)
```

> Runtime defaults (server name, database filename, ports) are hand-written per module — see
> `docs/clarify.md`.

## 🎨 Frontend

One package — **SPA app**, **Storybook workbench**, and a **publishable components library**
— built from the same source. Package: `@sousa99/bus-catcher-components`. Styling uses
Tailwind CSS v4 with the Home Sweet Home theme.

```bash
pnpm --filter ./modules/bus-catcher/frontend dev             # SPA dev server
pnpm --filter ./modules/bus-catcher/frontend storybook       # Storybook workbench
pnpm --filter ./modules/bus-catcher/frontend build           # SPA build (dist-app)
pnpm --filter ./modules/bus-catcher/frontend build:lib       # components library (dist-lib)
```

## 🔒 Quality gates

Uniform gates, enforced on every pull request for every module:

```bash
pnpm lint       # ESLint (shared flat config)
pnpm format     # Prettier check (shared config)
pnpm test       # Vitest
pnpm typecheck  # tsc --noEmit
```

## 🚀 Releases

This module releases independently via changesets: its `backend` and `components` packages
share one version, and a release publishes the components package (npm) and the
backend/frontend container images (GHCR) plus a GitHub release. See the [repository
README](../README.md) and [.changeset/README.md](../.changeset/README.md).

## 🏛️ Governance

See the [constitution](../.specify/memory/constitution.md) for the project's governing
principles.