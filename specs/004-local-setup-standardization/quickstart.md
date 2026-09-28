# Quickstart: Local Setup & Module Standardization

**Date**: 2026-09-27 | **Plan**: [plan.md](plan.md)

Runnable validation scenarios that prove the feature works end-to-end. This is a validation/run
guide, not an implementation reference — see [contracts/](contracts/) and [data-model.md](data-model.md)
for the contracts and model details.

## Prerequisites

- Docker Engine + Compose v2 (`docker compose version`).
- No credentials required: the module Dockerfiles tolerate a missing `npm_token` build secret
  (workspace dependencies resolve from the public registry). CI may still pass the secret for
  private-package installs.
- Clean repo (or the four modules present).

## Setup

```bash
pnpm install                       # workspace (not required to build images, but for native fallbacks)
docker compose build               # build all module images once (backend, spa, storybook)
```

Expected: every `Dockerfile.backend`, `Dockerfile.frontend`, and the new `Dockerfile.storybook`
builds successfully.

## Validation scenarios

### Scenario 1 — MCP only mode (FR-004)

```bash
docker compose --profile mcp up -d
```

Expected:
- Services up: `bus-catcher-mcp`, `fly-over-tracker-mcp`, `procrastinator-tracker-mcp`.
- Reachable at documented host addresses: `http://localhost:3200`, `3201`, `3202` (see
  [contracts/ports.md](contracts/ports.md)); an MCP streamable-HTTP handshake (POST initialize)
  succeeds on each.
- `docker compose --profile mcp ps` shows all three healthy.

### Scenario 2 — REST + SPA mode (FR-005)

```bash
docker compose --profile rest+spa up -d
```

Expected:
- Every backend-connected module's REST backend and SPA are up; `current-time-spa` serves its
  dashboard (frontend-only).
- Each SPA reaches its own backend: load `http://localhost:3300` (bus-catcher) and confirm the app
  lists stops/lines (data comes from `bus-catcher-backend`); repeat for `3301`/`3302` and the
  current-time dashboard at `3303`.
- No host port is shared between services (`docker compose --profile rest+spa ps` port listing).

### Scenario 3 — REST + Storybook mode (FR-006)

```bash
docker compose --profile rest+storybook up -d
```

Expected:
- Every backend plus every Storybook workbench (`3400`–`3403`) is up.
- Each workbench renders its published components, and a data-fetching story queries its module's
  backend through the same-origin `/api` proxy (no CORS errors in the browser console).

### Scenario 4 — Full and backend-only modes (FR-002)

```bash
docker compose --profile full up -d      # all services for all modules
docker compose --profile backend up -d   # only REST + MCP backends, no frontends
```

Expected: `full` starts every service; `backend` starts the six backend/MCP services and none of the
SPA/Storybook services.

### Scenario 5 — Single-module scope (FR-002)

```bash
docker compose --profile rest+spa up -d bus-catcher-backend bus-catcher-spa
```

Expected: only bus-catcher services start, on their documented ports (`3100`/`3300`).

### Scenario 6 — No port collisions under all-modules load (FR-003, SC-002)

```bash
docker compose --profile full up -d
docker compose --profile full ps --format '{{.Name}} {{.Ports}}'
```

Expected: every mapped host port is unique; the listing matches
[contracts/ports.md](contracts/ports.md) exactly.

### Scenario 7 — Mode switching without rebuild (FR-007, SC-003)

```bash
docker compose --profile rest+spa up -d
docker compose --profile mcp up -d        # no build output, only start/stop
```

Expected: no image is rebuilt or re-pulled; existing built images are reused.

### Scenario 8 — Data persistence and common directory (FR-018, SC-009)

```bash
docker compose --profile backend up -d
# exercise bus-catcher: add a configured stop; procrastinator-tracker: create a task
docker compose --profile backend down
docker compose --profile backend up -d
```

Expected: the added stop and task are still present after the restart; the files
`data/bus-catcher.db` and `data/procrastinator.db` exist on the host under the repo-root common
directory (bind-mounted `/data`).

### Scenario 9 — Unreachable backend degrades gracefully (FR-011)

Stop a module's backend while its SPA is up (`docker compose stop bus-catcher-backend`) and reload
its SPA. Expected: a clear, user-friendly error is shown; the page does not crash or hang.

### Scenario 10 — Documentation deliverables (FR-012, FR-016, FR-017)

```bash
ls docs/module-standard.md docs/module-gap-assessment.md
```

Expected: both files exist; the standard defines the base-URL convention, documentation outline,
workbench requirements, and test conventions; the gap assessment records every module's conformance
status (data model in [data-model.md](data-model.md), checklist in
[contracts/module-standard.md](contracts/module-standard.md)).

## Cleanup

```bash
docker compose --profile full down        # stop and remove containers
docker compose down                       # full teardown (networks)
```

The common `data/` directory is left on the host by design (SC-009).