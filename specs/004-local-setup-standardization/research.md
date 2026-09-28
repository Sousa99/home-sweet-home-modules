# Research: Local Setup & Module Standardization

**Date**: 2026-09-27 | **Plan**: [plan.md](plan.md)

Consolidates the technical inventory and decisions that resolve the unknowns from the plan's
Technical Context. Each decision records what was chosen, why, and the alternatives considered.

## Decision 1: Compose stack shape and run modes via Compose profiles

**Decision**: A single root `docker-compose.yml`. Compose **profiles** select the run mode; service
**names** select the module scope. Service naming is deterministic: `<slug>-backend`,
`<slug>-mcp`, `<slug>-spa`, `<slug>-storybook`.

| Profile | Services enabled (all modules) |
|---------|--------------------------------|
| `mcp` | every `<slug>-mcp` (bus-catcher, fly-over-tracker, procrastinator-tracker) |
| `rest+spa` | every `<slug>-backend` + `<slug>-spa` |
| `rest+storybook` | every `<slug>-backend` + `<slug>-storybook` |
| `full` | every backend, mcp, spa, storybook |
| `backend` | every `<slug>-backend` + `<slug>-mcp` |

Single-module scope: `docker compose --profile rest+spa up bus-catcher-backend bus-catcher-spa`.
`current-time` contributes only `spa` and `storybook` (frontend-only).

**Rationale**: Profiles map 1:1 onto the five clarified run modes (FR-002) with zero duplication;
selecting services by name gives per-module scoping with the standard Compose CLI (no extra tooling).
`docker compose down`/`up` cleanly switches modes without rebuilds (FR-007).

**Alternatives considered**: A custom script wrapper around Compose (rejected — hides the standard
CLI); separate per-module compose files (rejected — duplicates the profile logic); Docker Compose
`--project-name` variants (unnecessary — profiles suffice).

## Decision 2: Fixed host-port allocation (no collisions by construction)

**Decision**: Each module owns a fixed, reserved host-port block; nothing is shared or dynamic.
Scheme by service kind: REST `31xx`, MCP `32xx`, SPA `33xx`, Storybook `34xx`. Full table in
[contracts/ports.md](contracts/ports.md). Inside the Compose network every container keeps its own
default port (backends listen on 3000, MCP on 3001) — host mappings are the only place collision can
occur, and the fixed scheme makes it impossible.

**Rationale**: Satisfies FR-003 and clarification Q2:A (collision-free by construction, stable
documented addresses). The `3x` ranges sit far from native-dev defaults (3000/3001/5173/6006) so a
Compose stack and native dev servers can coexist.

**Alternatives considered**: Docker auto-assigned ephemeral ports (rejected — addresses would not be
fixed/documented); one shared base with offsets (equivalent outcome; the kind-based `31xx` scheme is
more readable).

## Decision 3: SPA ↔ backend wiring — same-origin nginx `/api` reverse proxy

**Decision**: Each module's SPA stays same-origin `/api`. Each module's `deploy/nginx.spa.conf`
gains an `/api` location that reverse-proxies to the module backend, with the upstream templated at
container start via `envsubst` from the `BACKEND_UPSTREAM` env var. The Compose sets
`BACKEND_UPSTREAM=<slug>-backend:3000` for the SPA and Storybook services. A new `Dockerfile.storybook`
serves the built `dist-storybook` under the same templated nginx.

**Rationale**: Mirrors the existing Vite dev proxy (`/api` → `localhost:3000`), keeps requests
same-origin (no CORS), reuses the built backend image unchanged, and is a small, explicitly accepted
low-risk conformance fix required by FR-005/FR-006. Storybook assets are static, so the identical
proxy serves the REST + Storybook mode.

**Alternatives considered**: (a) SPA reads a runtime `API_BASE_URL` env pointing at the published
host port + permissive CORS on all backends (rejected — requires cross-origin calls and CORS
middleware in `bus-catcher`/`fly-over-tracker`, which have none; more invasive and a larger security
surface); (b) bake the upstream into the image (rejected — couples the module image to Compose
service names and breaks standalone deployments).

## Decision 4: Storybook image (missing today)

**Decision**: Add `Dockerfile.storybook` per frontend module: build stage runs
`pnpm --filter @sousa99/<slug>-components build-storybook`, final stage serves `dist-storybook` with
the same env-templated nginx (`/api` proxy). Required for FR-006; it is a new compose artifact, not
an existing image.

**Rationale**: No module today produces a Storybook container; the REST + Storybook mode cannot be
delivered without one. Per-module images respect module-first (each module self-contained).

**Alternatives considered**: Extending `Dockerfile.frontend` to also emit `dist-storybook`
(rejected — one image serving both SPA and Storybook complicates the nginx entrypoint and mode
selection); serving Storybook from the dev `storybook` command inside a node container (rejected —
not production-like per Q1:B).

## Decision 5: Shared host data directory

**Decision**: Repo-root `data/` (already gitignored) is the common data directory. Compose bind-mounts
`./data:/data` into the DB-backed backend containers and sets `DB_PATH=/data/bus-catcher.db`
(bus-catcher) and `DATABASE_URL=/data/procrastinator.db` (procrastinator-tracker). `fly-over-tracker`
is stateless — no volume. Native (non-Docker) runs currently default to `modules/<slug>/backend/data/`,
so aligning native defaults to the root `data/` is recorded as a **deferred conformance item** in the
gap assessment (FR-018 native half), consistent with Q2:C.

**Rationale**: Fulfils FR-018's Compose half now (persistence + common directory + bind mount);
keeps the feature's scope within "low-risk fixes only" by deferring the native-side default change.

**Alternatives considered**: Named volumes (rejected — user chose a documented host directory, and a
bind mount makes the files directly visible/backable); ephemeral databases (rejected by Q3:C).

## Decision 6: Backend port env-var naming drift (`PORT` vs `HTTP_PORT`)

**Decision**: The Compose sets the correct env var per module (`PORT` for bus-catcher and
procrastinator-tracker, `HTTP_PORT` for fly-over-tracker). Unifying the names is a **deferred
conformance item** in the gap assessment, not implemented here.

**Rationale**: Compose works regardless; changing env-var names across modules is a behavior change
best covered by its own conformance pass.

## Decision 7: Container health / startup ordering

**Decision**: Compose uses `depends_on: condition: service_healthy` so SPA/Storybook start only after
their backend is healthy. Healthchecks per module: `bus-catcher` → `GET /api/health`,
`procrastinator-tracker` → `GET /health`; `fly-over-tracker` → TCP/Wget probe on the REST port
(no health endpoint). This gives the SPA a ready backend on first paint (edge case: backend not yet
ready).

**Rationale**: Simple, uses existing endpoints where they exist; avoids relying on the SPA's own
retry behavior for ordering.

## Decision 8: Environment surface

**Decision**: All values default inside `docker-compose.yml`; `.env.example` documents the
overridable surface: `HSH_BUS_CATCHER_REST_PORT`-style port overrides and `BACKEND_UPSTREAM` per
module. No secret material is required (matches fly-over-tracker's "no credentials" convention).

**Rationale**: One command works with zero configuration (SC-001); overrides stay conventional.

## Deferred items (gap assessment, per Q2:C)

1. SPA `API_BASE_URL` runtime env + component `baseUrl` prop in bus-catcher/procrastinator-tracker
   (fly-over-tracker already has the prop) — FR-008/FR-009.
2. Backend port env-var naming unification — `HTTP_PORT` → `PORT` alias.
3. Native-run DB defaults pointed at root `data/` — FR-018 native half.
4. Full documentation/workbench/test conformance for all modules — FR-013/FR-014/FR-015.