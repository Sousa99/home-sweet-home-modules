# Contract: Compose CLI, Profiles, and Service Naming

**Date**: 2026-09-27 | **Plan**: [../plan.md](../plan.md)

The single entry point for the local environment (FR-001). Root `docker-compose.yml`; Docker Compose
v2 (no custom wrapper).

## Run modes (profiles)

| Mode | Command |
|------|---------|
| MCP only | `docker compose --profile mcp up -d` |
| REST + SPA | `docker compose --profile rest+spa up -d` |
| REST + Storybook | `docker compose --profile rest+storybook up -d` |
| Full (everything) | `docker compose --profile full up -d` |
| Backend only (REST + MCP) | `docker compose --profile backend up -d` |

## Single-module scope

Append the module's service names to any mode command. Service names are deterministic:

| Module | backend | mcp | spa | storybook |
|--------|---------|-----|-----|-----------|
| bus-catcher | `bus-catcher-backend` | `bus-catcher-mcp` | `bus-catcher-spa` | `bus-catcher-storybook` |
| fly-over-tracker | `fly-over-tracker-backend` | `fly-over-tracker-mcp` | `fly-over-tracker-spa` | `fly-over-tracker-storybook` |
| procrastinator-tracker | `procrastinator-tracker-backend` | `procrastinator-tracker-mcp` | `procrastinator-tracker-spa` | `procrastinator-tracker-storybook` |
| current-time | — | — | `current-time-spa` | `current-time-storybook` |

Example: `docker compose --profile rest+spa up -d bus-catcher-backend bus-catcher-spa`

`current-time` has no `backend`/`mcp` service (frontend-only).

## Teardown and mode switching

- Stop a mode: `docker compose --profile <mode> down` (or `docker compose stop` for a pause).
- Switching modes never rebuilds images (FR-007): images are built once
  (`docker compose build`), then any profile selects from the same built images.

## Build inputs

| Service kind | Image source |
|--------------|--------------|
| backend / mcp | `<module>/Dockerfile.backend` (same image; mcp runs `node dist/index.js --mcp`) |
| spa | `<module>/Dockerfile.frontend` |
| storybook | `<module>/Dockerfile.storybook` |

`current-time` gained both `Dockerfile.frontend` and `Dockerfile.storybook` (and a `deploy/`
directory) so it participates in the compose SPA/Storybook modes. The backend images ship their
`drizzle/` migration folders, and the procrastinator-tracker services run
`node dist/migrate.js` before starting, so fresh databases work on first launch.

## Service environment

| Service kind | Env vars (Compose sets) |
|--------------|--------------------------|
| backend | `PORT`; `DB_PATH` / `DATABASE_URL` for DB-backed modules |
| mcp | `MCP_PORT`; `DB_PATH` / `DATABASE_URL` for DB-backed modules |
| spa / storybook | `BACKEND_UPSTREAM=<slug>-backend:3000` (nginx `/api` proxy target) |

## Overridable surface (.env.example)

All values default inside `docker-compose.yml`; document overrides in `.env.example`:

- Host port overrides, e.g. `HSH_BUS_CATCHER_REST_PORT=3100`.
- `BACKEND_UPSTREAM` per SPA/Storybook service.

## Startup ordering

`depends_on: condition: service_healthy` — SPA/Storybook start only after their backend is healthy.
Healthchecks: bus-catcher `GET /api/health`; procrastinator-tracker `GET /health`;
fly-over-tracker TCP probe on the REST port.

## Data

Repo-root `data/` bind-mounted to `/data` in DB-backed backend and mcp containers
(`DB_PATH=/data/bus-catcher.db`, `DATABASE_URL=/data/procrastinator.db`). Data persists across
restarts; the native dev workflow must not run concurrently against the same files (edge case).