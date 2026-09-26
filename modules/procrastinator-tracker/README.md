# Procrastinator Tracker

[![Part of Home Sweet Home](https://img.shields.io/badge/Home%20Sweet%20Home-Module-blue)](https://github.com/)

A local-first task tracker: a Hono REST API (with OpenAPI/Swagger) plus an MCP server, a
SQLite database via Drizzle, and a lightweight React single-page app that makes it easy to
push tasks to done.

Track tasks through a fixed lifecycle — `to-start → started → in-progress → validating →
finished` (with `on-hold` and reopen) — with flat tags, lightweight users (no accounts),
optional location and urgency (1–5), recurring tasks, and status-aware comments.

## 🧰 Stack

| Layer | Technology |
|-------|------------|
| Backend | Node 24, Hono, `@hono/zod-openapi`, Drizzle ORM, better-sqlite3, MCP TypeScript SDK |
| Frontend | Vite, React 19, Tailwind CSS v4, shadcn-style primitives, TanStack Query, React Router |
| Tooling | pnpm 11, TypeScript, ESLint (flat config), Prettier, Vitest |

The backend is a single codebase with a **dual-mode entry**: `--http` serves the REST API,
`--mcp` serves the MCP server over **streamable HTTP**. Both modes share the same
service/db layer — no separate backend packages.

## 🧰 Prerequisites

- Node.js 24 LTS
- pnpm 11

## 🚀 Setup

From the repository root:

```bash
pnpm install
pnpm --filter ./modules/procrastinator-tracker/backend db:generate   # if schema changed
pnpm --filter ./modules/procrastinator-tracker/backend db:migrate    # creates the SQLite db
```

## 🏃 Run

| Mode | Command | Notes |
|------|---------|-------|
| REST API + Swagger | `pnpm --filter ./modules/procrastinator-tracker/backend start` | http://localhost:3000 · OpenAPI at `/doc` · Swagger UI at `/ui` |
| MCP server (HTTP) | `pnpm --filter ./modules/procrastinator-tracker/backend start:mcp` | Streamable HTTP MCP at http://localhost:3001/mcp (`MCP_PORT`) |
| MCP auto-reload (dev) | `pnpm --filter ./modules/procrastinator-tracker/backend dev:mcp` | Same, but `tsx watch` reloads on source edits |
| Frontend (dev) | `pnpm --filter ./modules/procrastinator-tracker/frontend dev` | http://localhost:5173, proxies `/api` to the backend |
| Storybook (workbench) | `pnpm --filter ./modules/procrastinator-tracker/frontend storybook` | http://localhost:6006 · static build → `dist-storybook/` |

Both backend modes share `modules/procrastinator-tracker/backend/data/procrastinator.db`
(SQLite WAL allows concurrent access). To run REST and MCP simultaneously, start two
instances of the same process — which also means you can restart the MCP process without
affecting the REST API.

## Backend

### REST API

OpenAPI 3.0 contract served at `/doc`, interactive Swagger UI at `/ui`:

| Endpoint | Description |
|----------|-------------|
| `GET /api/tasks` · `POST /api/tasks` | List / create tasks |
| `GET /api/tasks/{id}` · `PUT /api/tasks/{id}` · `DELETE /api/tasks/{id}` | Get / update / delete a task |
| `POST /api/tasks/{id}/status` | Move a task through its lifecycle (`to-start → started → in-progress → validating → finished`, `on-hold` / reopen) |
| `GET /api/tasks/{id}/comments` · `POST /api/tasks/{id}/comments` | Status-aware comments |
| `GET /api/tags` | Flat tags |
| `GET /api/users` · `GET /api/users/{id}` | Lightweight users (no accounts) |

### MCP tools

`task.create`, `task.list`, `task.get`, `task.update`, `task.set_status`,
`task.comment`, `task.delete`, `tag.list`, `user.list`.

## 🎨 Frontend: Storybook & the TaskDeck component

The frontend ships a **Storybook workbench** (`pnpm --filter
./modules/procrastinator-tracker/frontend storybook` → http://localhost:6006) for
developing and documenting components in isolation. Stories are co-located with components.

The **`TaskDeck`** component renders tasks as a **swipeable card stack** (Deck Standard 1
style): the top card fully visible, the next `stackSize` cards scaled/fanned behind it. It
supports drag-to-skip and an **auto-rotate** timer. Key props:

- `filters` — which tasks to show (fetched via the existing API client).
- `refreshRateMs` (default 30000) — how often to re-fetch; `0` disables.
- `autoRotateMs` (default 4000) — auto-advance interval; `0` disables; pauses during drag and
  resets after a manual skip.
- `slideDurationMs` (default 500) — swipe/exit animation duration.
- `loop` (default true) — cycles back to the first task instead of showing an empty state.

The app dashboard offers a **Deck | List** toggle: Deck renders `TaskDeckWrapper`
(self-fetching), List renders the classic vertical task list.

### Exportable package

`pnpm --filter ./modules/procrastinator-tracker/frontend build:lib` produces
`modules/procrastinator-tracker/frontend/dist-lib/` — an ESM bundle (`index.js` +
`index.d.ts`) plus a compiled `styles.css`, so the component can be installed and used in
other React 19 apps:

```tsx
import { TaskDeckWrapper } from '@sousa99/procrastinator-tracker-components';
import '@sousa99/procrastinator-tracker-components/styles.css';

<TaskDeckWrapper filters={{ status: 'started' }} autoRotateMs={5000} />;
```

`react`, `react-dom`, `motion`, and `lucide-react` are peer dependencies (consumers provide
them). The package is ESM-only — CommonJS consumers use dynamic import.

## 🔒 Quality gates

Uniform gates, enforced on every pull request for every module:

```bash
pnpm lint       # ESLint (shared flat config)
pnpm format     # Prettier check (shared config)
pnpm test       # Vitest: backend (hono app + in-memory SQLite) + frontend (RTL)
pnpm typecheck  # tsc --noEmit
```

## 🚀 Releases

This module releases independently via changesets: its `backend` and `components` packages
share one version, and a release publishes the components package (npm) and the
backend/frontend container images (GHCR) plus a GitHub release. See the [repository
README](../README.md) and [.changeset/README.md](../.changeset/README.md).

## 📚 Historical specs

The feature specs developed in this module's original repository are archived (read-only)
at `specs/001-merge-modules/merge-history/procrastinator-tracker/`.

## 🏛️ Governance

See the [constitution](../.specify/memory/constitution.md) for the project's governing
principles.