# AGENTS.md — procrastinator-tracker

Guidance for contributors (human or AI) working in the **procrastinator-tracker** module.

## Purpose

A local-first task tracker: Hono REST API (OpenAPI/Swagger) plus an MCP server, SQLite via Drizzle,
and a lightweight React SPA. Tasks move through a fixed lifecycle (`to-start → started →
in-progress → validating → finished`, with `on-hold` and reopen), with flat tags, lightweight
users (no accounts), optional location and urgency (1–5), recurring tasks, and status-aware
comments. The backend is a single dual-mode package serving both the REST API and the MCP server
from the same service/db layer; the frontend publishes the `TaskDeck` widget family.

## Packages & layout

```text
backend/    @sousa99/procrastinator-tracker-backend    — one dual-mode package: REST (--http) + MCP (--mcp)
frontend/   @sousa99/procrastinator-tracker-components — one package: SPA, Storybook, components library
Dockerfile.backend / Dockerfile.frontend / Dockerfile.storybook — build inputs for the GHCR images
deploy/     deployment manifests
docs/       module guides (clarify.md)
LICENSE     module license
```

## Common commands (from the repo root)

```bash
pnpm --filter ./modules/procrastinator-tracker/backend dev          # REST API in dev (--http, :3000)
pnpm --filter ./modules/procrastinator-tracker/backend dev:mcp      # MCP server in dev (--mcp, :3001)
pnpm --filter ./modules/procrastinator-tracker/backend start        # REST API (--http)
pnpm --filter ./modules/procrastinator-tracker/backend start:mcp    # MCP server (--mcp)
pnpm --filter ./modules/procrastinator-tracker/backend db:generate  # if schema changed
pnpm --filter ./modules/procrastinator-tracker/backend db:migrate   # creates/upgrades the SQLite db
pnpm --filter ./modules/procrastinator-tracker/frontend dev         # SPA dev server (:5173, proxies /api)
pnpm --filter ./modules/procrastinator-tracker/frontend storybook   # Storybook workbench (:6006)
```

Docker Compose (repo-root `docker-compose.yml`): services
`procrastinator-tracker-backend|mcp|spa|storybook` with fixed host ports `3102/3202/3302/3402` (see
`specs/004-local-setup-standardization/contracts/ports.md`) and the shared `data/` directory.

Tests / typecheck / lint run through the shared gates:
`pnpm --filter ./modules/procrastinator-tracker/backend test` (or the root `pnpm test` /
`pnpm typecheck` / `pnpm lint`).

## Conventions & quality gates

- **Dual-mode parity**: REST and MCP share the same service/db layer — a contract change must be
  covered on both surfaces.
- **Task lifecycle**: preserve the fixed task state machine and its transitions
  (`src/domain/status.ts`) when changing task behavior.
- **Local-first**: household data (tasks, users, comments) stays in the module's SQLite database;
  no external sync by default.
- **Base URL convention**: the SPA reads `API_BASE_URL` at runtime via `/config.json`
  (`src/api/baseUrl.ts`); `TaskDeckWrapper` accepts an optional `baseUrl` prop. Precedence: prop >
  SPA env > same-origin `/api` (see `docs/module-standard.md` §2).
- **Test-first (non-negotiable)**: any behavior change starts with a failing Vitest test, then
  implementation, then a green run. See `.opencode/skills/test-first`.
- **Quality gates**: ESLint, Prettier, typecheck, and Vitest must pass; module extends the shared
  presets from `@sousa99/homesweethome-config`.
- **Release**: the fixed changeset group is `@sousa99/procrastinator-tracker-backend` +
  `@sousa99/procrastinator-tracker-components` — they version together.

## Agent & skill routing

Delegate by task; the main assistant must not perform git/GitHub operations.

| Task | Delegate to |
|------|-------------|
| Commit, push, branches, PRs, issues, CI/Actions | `github-helper` |
| Implementation (test-first) | `implementer` |
| Test suite / coverage verdict | `tester` |
| Pre-merge code review | `reviewer` |
| Version bumps + changeset verification (pre-PR) | `version-analyser` |
| Final minor-fix polish | `nitpicker` |
| README / setup.md / docs sync | `documenter` |

Skills: load on demand — `test-first`, `quality-gates`, `commit-hygiene`,
`changelog-release-notes`, `spec-driven-development`.

## Codebase orientation

- `backend/src/index.ts` — dual-mode entry: `--http` → REST, `--mcp` → MCP; `PORT` (3000) and
  `MCP_PORT` (3001).
- `backend/src/db/client.ts` — SQLite via Drizzle; `DATABASE_URL` (default
  `../../data/procrastinator.db`), WAL mode, `mkdir` on demand.
- `backend/src/app.ts` — OpenAPIHono app: routes, `/doc` + `/ui`, CORS, validation/error handling.
- `backend/src/routes/` — tasks, tags, users REST routes.
- `backend/src/services/` — tasks (create/list/get/update/setStatus/comments/delete + recurrence
  catch-up), tags, users, recurrence.
- `backend/src/domain/status.ts` — the fixed lifecycle transitions (`to-start → started →
  in-progress → validating → finished`, `on-hold` / reopen).
- `backend/src/mcp/` — MCP server + tools (`task.create`, `task.list`, `task.get`, `task.update`,
  `task.set_status`, `task.comment`, `task.delete`, `tag.list`, `user.list`).
- `frontend/src/api/baseUrl.ts` — SPA runtime base URL: `loadApiBaseUrl()` reads `/config.json`
  before rendering; empty ⇒ same-origin `/api`.
- `frontend/src/components/task/TaskDeck.tsx` — `TaskDeck` (swipeable card stack) and
  `TaskDeckCard` (published).
- `frontend/src/components/task/TaskDeckWrapper.tsx` — self-fetching wrapper (props: `filters`,
  `refreshRateMs`, `baseUrl`, `dataSource`, `autoRotateMs`, `loop`, `stackSize`,
  `slideDurationMs`, `renderCard`, `onCardChange`).
- `frontend/src/pages/DashboardPage.tsx` — Deck | List dashboard with filters and task creation.

The public package surface is documented in `frontend/src/index.ts` and the `TaskDeckWrapper.mdx`
workbench page; do not remove or rename exported members without a version bump.