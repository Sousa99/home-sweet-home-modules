# Data Model: Local Setup & Module Standardization

**Date**: 2026-09-27 | **Plan**: [plan.md](plan.md)

Entities from the feature spec plus the Compose configuration model. Validation rules mirror the
spec requirements (FR-xxx references).

## Entities

### Run mode (profile)

A launch selection that determines which services are started, per the five clarified modes.

| Field | Type | Constraints / Validation |
|-------|------|--------------------------|
| `id` | enum | One of `mcp`, `rest+spa`, `rest+storybook`, `full`, `backend` (FR-002) |
| `enabledServices` | set<Service> | `mcp` ⇒ all `<slug>-mcp`; `rest+spa` ⇒ `<slug>-backend` + `<slug>-spa`; `rest+storybook` ⇒ `<slug>-backend` + `<slug>-storybook`; `full` ⇒ all four kinds; `backend` ⇒ `<slug>-backend` + `<slug>-mcp` (FR-002) |
| `scope` | `all` \| single module | Service-name selection gives single-module scope (FR-002) |

### Service

A Compose service, named `<slug>-<kind>`.

| Field | Type | Constraints / Validation |
|-------|------|--------------------------|
| `name` | string | `<slug>-backend` \| `<slug>-mcp` \| `<slug>-spa` \| `<slug>-storybook` |
| `module` | enum | `bus-catcher`, `fly-over-tracker`, `procrastinator-tracker`, `current-time` |
| `kind` | enum | `backend`, `mcp`, `spa`, `storybook` (current-time has no `backend`/`mcp`) |
| `image` | string | Built from `<module>/Dockerfile.backend` / `Dockerfile.frontend` / `Dockerfile.storybook` |
| `hostPorts` | map<kind → port> | Fixed per module per `contracts/ports.md`; globally unique (FR-003) |
| `env` | map | `BACKEND_UPSTREAM` for spa/storybook; `DB_PATH`/`DATABASE_URL` for DB-backed backends; `PORT` or `HTTP_PORT` + `MCP_PORT` for backends |
| `healthcheck` | probe | `bus-catcher` `/api/health`; `procrastinator-tracker` `/health`; `fly-over-tracker` TCP probe on REST port |

**State transitions**: `stopped → healthy → (mode switch) → stopped`. Switching modes only starts
or stops services; no service is rebuilt or reconfigured mid-flight (FR-007).

### Backend base URL

The location of a module's REST API as seen by its SPA and published components.

| Field | Type | Constraints / Validation |
|-------|------|--------------------------|
| `source` | enum | `same-origin` (default) \| `spa-env` \| `component-prop` |
| `spaEnvName` | string | `API_BASE_URL` (standard; runtime-injected, default '' ⇒ same-origin `/api`) (FR-008) |
| `propName` | string | `baseUrl`, optional, default '' ⇒ same-origin `/api` (FR-009) |
| `precedence` | order | prop > env > same-origin `/api` |

Validation: an unreachable configured base URL must surface a clear user error without crash/hang
(FR-011); default same-origin keeps the Vite dev proxy workflow working (FR-010).

### Module standard (document)

The written convention published at `docs/module-standard.md` (FR-012).

| Section | Content |
|---------|---------|
| Identity & layout | `@sousa99/<slug>-*` package naming, module directory shape (from constitution) |
| Backend base URL | SPA `API_BASE_URL` env + component `baseUrl` prop, precedence, same-origin default |
| Documentation outline | README / setup / AGENTS section order (FR-013) |
| Workbench requirements | story per published component + written `.mdx` docs page; shared setup (FR-014) |
| Test conventions | Vitest + Testing Library; component / page-flow / backend contract (REST + MCP) levels (FR-015) |

### Gap assessment (document)

Per-module conformance record at `docs/module-gap-assessment.md` (FR-016/FR-017).

| Field | Type | Constraints / Validation |
|-------|------|--------------------------|
| `module` | enum | One of the four existing modules |
| `area` | enum | `base-url`, `documentation`, `workbench`, `tests`, `tooling` |
| `status` | enum | `conformant` \| `non-conformant` \| `not-applicable` (frontend-only: base-url N/A for current-time) |
| `requiredChanges` | list<string> | What brings the module into conformance |

### Common data directory

The single host directory holding every module's SQLite database (FR-018).

| Field | Type | Constraints / Validation |
|-------|------|--------------------------|
| `hostPath` | string | repo-root `data/` (gitignored), settled in planning |
| `containerPath` | string | `/data` (bind-mounted) |
| `dbFiles` | map | `bus-catcher.db` (bus-catcher), `procrastinator.db` (procrastinator-tracker); fly-over-tracker: none |
| `concurrency` | rule | Native dev and the Docker stack must not run against the same files simultaneously (edge case) |

## Relationships

- A **module** owns 1–2 Compose **services** per kind (`backend`+`mcp` share one image; `spa` and
  `storybook` each have their own image).
- Each **Service** of kind spa/storybook references its module's **Backend base URL** via
  `BACKEND_UPSTREAM` (nginx proxy) and its own module's **Run mode** membership through the profile.
- Each **module** is assessed against the **Module standard** in the **Gap assessment**.
- DB-backed modules' **backends** read/write their **database file** inside the **Common data
  directory**.