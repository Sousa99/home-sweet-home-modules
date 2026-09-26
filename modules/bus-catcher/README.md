---
module: bus-catcher
slug: bus-catcher
description: A Home Sweet Home module (bus-catcher)
home: https://github.com/
packages: backend frontend
---

# bus-catcher

[![Part of Home Sweet Home](https://img.shields.io/badge/Home%20Sweet%20Home-Module-blue)](https://github.com/)

A Home Sweet Home module (bus-catcher)

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

```bash
pnpm install
```

See [setup.md](setup.md) for the full module setup guide, quality gates, pipelines, and
package organization. See [docs/clarify.md](docs/clarify.md) for the foundational decisions
to settle when creating this module.


## ⚙️ Backend

One dual-mode package — **REST API** (`--http`) and **MCP server** (`--mcp`)
— sharing the same service/db layer. Package: `@sousa99/bus-catcher-backend`.

```bash
pnpm --filter ./backend dev          # REST API in dev (--http)
pnpm --filter ./backend dev:mcp      # MCP server in dev (--mcp)
pnpm --filter ./backend start        # REST API (--http)
pnpm --filter ./backend start:mcp    # MCP server (--mcp)
```

> Runtime defaults (server name, database filename, ports) are hand-written per module — see
> `docs/clarify.md`.



## 🎨 Frontend

One package — **SPA app**, **Storybook workbench**, and a **publishable components library**
— built from the same source. Package: `@sousa99/bus-catcher-components`. Styling uses Tailwind CSS v4
with the Home Sweet Home theme (configurable via `module.config.yaml` → `theme`).

```bash
pnpm --filter ./frontend dev             # SPA dev server
pnpm --filter ./frontend storybook       # Storybook workbench
pnpm --filter ./frontend build           # SPA build (dist-app)
pnpm --filter ./frontend build:lib       # components library (dist-lib)
```


## 🔒 Quality gates

```bash
pnpm lint       # ESLint
pnpm format     # Prettier check
pnpm test       # Vitest
pnpm typecheck  # tsc --noEmit
pnpm --filter ./frontend build:lib 2>/dev/null; node scripts/scaffold.mjs --check  # template drift check
```

All gates must pass before commit/merge. The `CI` workflow enforces them on every pull
request; merging to `main` triggers the `Release` workflow.

## 🏛️ Governance

See `.specify/memory/constitution.md` for the project's governing principles.
