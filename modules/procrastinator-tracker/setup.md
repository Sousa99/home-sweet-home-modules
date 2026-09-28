# Procrastinator Tracker — Setup

A local-first task tracker: Hono REST API (OpenAPI/Swagger) plus an MCP server, SQLite via
Drizzle, and a lightweight React SPA. The module lives in the Home Sweet Home modules monorepo at
`modules/procrastinator-tracker/`.

## 🧰 Prerequisites

- Node 24 and pnpm 11 (repository-wide toolchain)
- Docker (optional) for the Docker Compose environment

## 📦 Install

From the repository root:

```bash
pnpm install
```

Create/upgrade the SQLite database:

```bash
pnpm --filter ./modules/procrastinator-tracker/backend db:migrate   # creates the SQLite db
pnpm --filter ./modules/procrastinator-tracker/backend db:generate  # only if the schema changed
```

Native runs default to the repo-root common data directory: `DATABASE_URL` defaults to
`../../data/procrastinator.db` (backend runtime and `drizzle.config.ts`), the same location the
Docker Compose stack uses.

## 🏃 Run

From the repository root.

### Backend — REST API

```bash
pnpm --filter ./modules/procrastinator-tracker/backend dev    # tsx watch, --http
```

Serves the REST API on `http://localhost:3000` (`PORT`), with the OpenAPI 3.0 contract at
`/doc` and interactive Swagger UI at `/ui`:

| Endpoint | Description |
|----------|-------------|
| `GET /api/tasks` · `POST /api/tasks` | List / create tasks |
| `GET /api/tasks/{id}` · `PATCH /api/tasks/{id}` · `DELETE /api/tasks/{id}` | Get / update / delete a task |
| `POST /api/tasks/{id}/status` | Move a task through its lifecycle (`to-start → started → in-progress → validating → finished`, `on-hold` / reopen) |
| `POST /api/tasks/{id}/comments` | Add a status-aware comment |
| `GET /api/tags` · `POST /api/tags` | Flat tags |
| `GET /api/users` · `POST /api/users` · `DELETE /api/users/{id}` | Lightweight users (no accounts) |

### Backend — MCP server

```bash
pnpm --filter ./modules/procrastinator-tracker/backend dev:mcp    # tsx watch, --mcp
```

Serves the MCP server over streamable HTTP at `http://localhost:3001/mcp` (`MCP_PORT`). Tools:
`task.create`, `task.list`, `task.get`, `task.update`, `task.set_status`, `task.comment`,
`task.delete`, `tag.list`, `user.list`.

### Frontend — SPA

```bash
pnpm --filter ./modules/procrastinator-tracker/frontend dev
```

Open the printed URL (default `http://localhost:5173`). The Vite dev server proxies `/api` to
`http://localhost:3000`. The SPA reads `API_BASE_URL` at runtime from `/config.json`
(`src/api/baseUrl.ts`); empty means same-origin `/api`.

### Frontend — Storybook workbench

```bash
pnpm --filter ./modules/procrastinator-tracker/frontend storybook
```

Open the printed URL (default `http://localhost:6006`). Browse the `TaskDeck` / `TaskCard` /
`TaskDeckWrapper` previews and their `.mdx` docs pages.

### Docker Compose

```bash
docker compose --profile rest+spa up -d        # REST (:3102) + SPA (:3302)
docker compose --profile rest+storybook up -d  # REST (:3102) + Storybook (:3402)
docker compose --profile mcp up -d             # MCP (:3202)
docker compose --profile full up -d            # everything
```

Host ports are fixed per `specs/004-local-setup-standardization/contracts/ports.md` and overridable
via `.env` (`HSH_PROCRASTINATOR_TRACKER_REST_PORT`, `HSH_PROCRASTINATOR_TRACKER_MCP_PORT`,
`HSH_PROCRASTINATOR_TRACKER_SPA_PORT`, `HSH_PROCRASTINATOR_TRACKER_STORYBOOK_PORT`). Databases live
in the shared repo-root `data/` directory; the Compose backend runs `node dist/migrate.js` before
startup.

## 🔒 Quality Gates

```bash
pnpm --filter ./modules/procrastinator-tracker/backend test        # Vitest suite
pnpm --filter ./modules/procrastinator-tracker/backend typecheck   # tsc --noEmit
pnpm --filter ./modules/procrastinator-tracker/frontend test       # Vitest suite
pnpm --filter ./modules/procrastinator-tracker/frontend typecheck  # tsc --noEmit
pnpm --filter ./modules/procrastinator-tracker/frontend build      # SPA build -> dist-app/
pnpm --filter ./modules/procrastinator-tracker/frontend build:lib  # library build -> dist-lib/ (publishable)
pnpm --filter ./modules/procrastinator-tracker/frontend build-storybook # static workbench -> dist-storybook/
```

The repository-wide `pnpm lint`, `pnpm format`, `pnpm typecheck`, and `pnpm test` also cover
this module via the shared workspace scripts.

## ✅ Manual Validation

1. Start the backend (`pnpm --filter ./modules/procrastinator-tracker/backend dev`) and open
   `http://localhost:3000/doc` — the OpenAPI contract loads; `http://localhost:3000/ui` shows the
   Swagger UI.
2. Create a task from the SPA — it appears on the dashboard.
3. Move the task through the lifecycle (`to-start → started → in-progress → validating →
   finished`) using the status controls; invalid transitions are rejected.
4. Set a task `on-hold` and reopen it — the state machine accepts only valid transitions.
5. Add tags, an assignee (a lightweight user), a location, and urgency 1–5 — they render on the
   card.
6. Add a comment to a task — it is stored with the task's status context.
7. Create a recurring task — the recurrence rule is stored and the catch-up process considers it.
8. Toggle the Deck | List view — `TaskDeckWrapper` shows the same tasks as the list.
9. In the workbench, embed `TaskDeckWrapper` and preview the deck, filters, and card states.
10. Run `docker compose --profile full up -d` — the SPA at `:3302` proxies `/api` to the REST
    backend at `:3102` and shows the same dashboard.

## 🗂️ Project Layout

```text
backend/
├── src/
│   ├── index.ts                 dual-mode entry (--http / --mcp), PORT, MCP_PORT
│   ├── app.ts                   OpenAPIHono app: /doc, /ui, CORS, error handling
│   ├── routes/                  tasks, tags, users REST routes
│   ├── services/                tasks, tags, users, comments, recurrence
│   ├── mcp/                     MCP server + tools (task.*, tag.list, user.list)
│   ├── domain/                  status (lifecycle transitions), urgency, errors
│   ├── models/                  task DTOs + zod schemas
│   └── db/                      Drizzle schema, client (DATABASE_URL, WAL)
├── drizzle/                     SQL migrations
└── drizzle.config.ts
frontend/
├── src/
│   ├── components/              task/ (TaskDeck, TaskDeckCard, TaskDeckWrapper, TaskCard,
│   │                            TaskCreateForm, TaskFilters, TaskComments, ...), ui/
│   ├── pages/                   DashboardPage (Deck | List), TaskDetailPage
│   ├── api/                     client, tasks, meta, baseUrl (runtime /config.json)
│   ├── lib/                     utils
│   └── index.ts                 library entry (published surface)
├── .storybook/                  Storybook config (addon-docs, Tailwind)
├── tests/                       Vitest + Testing Library
├── vite.config.ts               app build (dist-app)
└── vite.lib.config.ts           library build (dist-lib)
Dockerfile.backend / Dockerfile.frontend / Dockerfile.storybook
deploy/                          deployment manifests
docs/                            module guides (clarify.md)
LICENSE                          module license
```

## 🔧 Troubleshooting

- **Port already in use**: Vite picks the next free port automatically; use the printed URL. For
  the backend, set `PORT` / `MCP_PORT` explicitly.
- **"Could not load tasks" in the SPA**: make sure the backend is running on `:3000` (dev) or the
  `procrastinator-tracker-backend` service is healthy (Compose); the SPA proxies `/api` to it.
- **Missing database / tables**: run `pnpm --filter ./modules/procrastinator-tracker/backend
  db:migrate` — the SQLite db is created at `../../data/procrastinator.db` (repo-root `data/`);
  override with `DATABASE_URL` if you need a different file.
- **Invalid status transition**: the lifecycle is fixed — a `409` means the requested transition is
  not in the state machine (see `src/domain/status.ts`).
- **Typecheck/lint failures**: run `pnpm format:write` then the module typecheck.

## 📦 Versioning & Releases

The module releases **independently** via changesets: `@sousa99/procrastinator-tracker-backend`
and `@sousa99/procrastinator-tracker-components` share one version (fixed group) and start at
`0.0.1`. A release publishes the components package to GitHub Packages and the backend/frontend
container images to GHCR, plus a GitHub release. See the repository root `AGENTS.md` for the
release workflow.