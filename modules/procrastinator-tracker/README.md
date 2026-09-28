# Procrastinator Tracker

[![Part of Home Sweet Home](https://img.shields.io/badge/Home%20Sweet%20Home-Module-blue)](https://github.com/)

A local-first task tracker: a Hono REST API (with OpenAPI/Swagger) plus an MCP server, a
SQLite database via Drizzle, and a lightweight React single-page app that makes it easy to
push tasks to done.

## Overview

Track tasks through a fixed lifecycle — `to-start → started → in-progress → validating →
finished` (with `on-hold` and reopen) — with flat tags, lightweight users (no accounts), optional
location and urgency (1–5), recurring tasks, and status-aware comments. The module is local-first:
all household data (tasks, users, comments) persists in this module's SQLite database.

One dual-mode backend serves both the REST API (`--http`) and the MCP server (`--mcp`), sharing the
same service/db layer, and the frontend package produces the SPA, a Storybook workbench, and a
publishable components library.

## 🧰 Stack

| Layer | Technology |
|-------|------------|
| Backend | Node 24, Hono, `@hono/zod-openapi`, Drizzle ORM, better-sqlite3, MCP TypeScript SDK |
| Frontend | Vite, React 19, Tailwind CSS v4, shadcn-style primitives, TanStack Query, React Router, motion, Lucide icons |
| Tooling | pnpm 11, TypeScript, ESLint (flat config), Prettier, Vitest |

The backend is a single codebase with a **dual-mode entry**: `--http` serves the REST API on
`:3000` (`PORT`), `--mcp` serves the MCP server over streamable HTTP on `:3001` (`MCP_PORT`). Both
modes share the same service/db layer — no separate backend packages.

## ✨ Features

- **Fixed task lifecycle** — `to-start → started → in-progress → validating → finished`, with
  `on-hold` and reopen; invalid transitions are rejected (`409`).
- **Flat tags** — lightweight, deduplicated labels for filtering.
- **Lightweight users** — simple names, no accounts or authentication.
- **Location & urgency** — optional location string and urgency 1–5 per task.
- **Recurring tasks** — recurrence rules with a catch-up process for past-due occurrences.
- **Status-aware comments** — comments are stored with the task status context.
- **REST API with OpenAPI/Swagger** — interactive contract at `/doc` and `/ui`.
- **MCP tools** — the same service exposed as `task.*`, `tag.list`, and `user.list` tools.
- **SPA dashboard** — Deck | List toggle: a swipeable `TaskDeck` card stack or a classic task list,
  with filters and a task detail page.

## 🧰 Prerequisites

- Node 24, pnpm 11 (see the repository root `AGENTS.md` / `setup.md`)

## 🚀 Getting Started

From the repository root:

```bash
pnpm install                                             # install the whole workspace
pnpm --filter ./modules/procrastinator-tracker/backend db:migrate   # create/upgrade the SQLite db
pnpm --filter ./modules/procrastinator-tracker/backend dev          # REST API in dev (--http, default :3000)
pnpm --filter ./modules/procrastinator-tracker/backend dev:mcp      # MCP server in dev (--mcp, default :3001)
pnpm --filter ./modules/procrastinator-tracker/frontend dev         # SPA dev server (default :5173, proxies /api)
pnpm --filter ./modules/procrastinator-tracker/frontend storybook   # component workbench (default :6006)
```

Or run the module in the shared Docker Compose environment (repo-root `data/` directory for the
database, fixed host ports per `specs/004-local-setup-standardization/contracts/ports.md`; the
Compose backend runs `node dist/migrate.js` before startup):

```bash
docker compose --profile rest+spa up -d        # REST backend (:3102) + SPA (:3302)
docker compose --profile rest+storybook up -d  # REST backend (:3102) + Storybook (:3402)
docker compose --profile mcp up -d             # MCP server (:3202)
docker compose --profile full up -d            # backend, MCP, SPA, and Storybook together
```

Compose services: `procrastinator-tracker-backend` (REST, host `3102`),
`procrastinator-tracker-mcp` (MCP, host `3202`), `procrastinator-tracker-spa` (host `3302`), and
`procrastinator-tracker-storybook` (host `3402`).

## 🧪 Quality Gates

```bash
pnpm --filter ./modules/procrastinator-tracker/backend test        # Vitest suite
pnpm --filter ./modules/procrastinator-tracker/backend typecheck   # tsc --noEmit
pnpm --filter ./modules/procrastinator-tracker/frontend test       # Vitest suite
pnpm --filter ./modules/procrastinator-tracker/frontend typecheck  # tsc --noEmit
pnpm --filter ./modules/procrastinator-tracker/frontend build      # SPA build (dist-app)
pnpm --filter ./modules/procrastinator-tracker/frontend build:lib  # publishable library build (dist-lib)
pnpm --filter ./modules/procrastinator-tracker/frontend build-storybook # static workbench (dist-storybook)
```

The module extends the shared presets from `@sousa99/homesweethome-config`, so the repository-wide
`pnpm lint`, `pnpm format`, `pnpm typecheck`, and `pnpm test` cover it too.

## 📦 Package

| Package | Registry | Purpose |
|---------|----------|---------|
| `@sousa99/procrastinator-tracker-components` | GitHub Packages (`npm.pkg.github.com`) | SPA + publishable components library |

The public surface is the `TaskDeck` swipeable card stack, its `TaskDeckCard`, and the
self-fetching `TaskDeckWrapper`, plus the task/types surface (`Task`, `TaskFilters`, `TaskStatus`,
`Assignee`, `Comment`, `CreateTaskInput`, `UpdateTaskInput`, `Recurrence`, `RecurrenceFrequency`,
`Tag`, `User`) and the prop types. Releases are independent via its own changesets fixed group
(`@sousa99/procrastinator-tracker-backend` + `@sousa99/procrastinator-tracker-components`),
starting at `0.0.1`. The package is ESM-only — CommonJS consumers use dynamic import.

### Embedding the TaskDeck

```tsx
import '@sousa99/procrastinator-tracker-components/styles.css';
import { TaskDeckWrapper } from '@sousa99/procrastinator-tracker-components';

function PendingTasks() {
  return (
    <TaskDeckWrapper
      filters={{ status: 'started' }}
      autoRotateMs={5000}
      baseUrl="https://tasks.example.com" // optional — empty means same-origin /api
    />
  );
}
```

`TaskDeckWrapper` fetches and refreshes the task list itself (`refreshRateMs`, default `30000`).
The optional `baseUrl` prop points the built-in client at a remote backend; when empty it targets
the same-origin `/api` path. `react`, `react-dom`, `motion`, and `lucide-react` are peer
dependencies (consumers provide them). See the `TaskDeckWrapper.mdx` workbench page for the full
prop reference.

## 📚 Learn More

- Repository layout, conventions, and delegation: root `AGENTS.md`
- Module-specific run commands and troubleshooting: [`setup.md`](setup.md)
- Module guidance for contributors: [`AGENTS.md`](AGENTS.md)
- Foundational decisions: [`docs/clarify.md`](docs/clarify.md)