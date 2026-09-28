# Implementation Plan: Local Setup & Module Standardization

**Branch**: `feature/004-local-setup-standardization` | **Date**: 2026-09-27 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/004-local-setup-standardization/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command; its definition describes the execution workflow.

## Summary

Deliver two things: (1) a repository-root Docker Compose environment that launches all modules
behind five run modes (MCP only, REST + SPA, REST + Storybook, full, backend only), each launchable
for all modules or a single module, using fixed collision-free host ports, production-like built
images, and a shared host data directory; and (2) a written module standard plus a per-module gap
assessment (full module conformance is deferred per clarification Q2:C). The compose connects each
SPA/Storybook to its own backend via a same-origin nginx `/api` reverse proxy — the minimal
conformance fix required for the REST + SPA and REST + Storybook modes.

## Technical Context

**Language/Version**: YAML (Compose spec), Dockerfile, nginx templates, pnpm 11 / Node 24 for build stages; no new runtime language.

**Primary Dependencies**: Docker Compose (v2), existing module images built from each module's `Dockerfile.backend` / `Dockerfile.frontend`, plus a new `Dockerfile.storybook` per module (no storybook image exists today).

**Storage**: SQLite per module; only `bus-catcher` (`DB_PATH`) and `procrastinator-tracker` (`DATABASE_URL`) persist data — `fly-over-tracker` is stateless (external feed only). Common host data directory: repo-root `data/` (already gitignored), bind-mounted into DB-backed backend containers.

**Testing**: Vitest suites remain untouched; new/changed frontend client behavior follows test-first (Vitest + Testing Library). Compose correctness is validated through the runtime scenarios in `quickstart.md` (no unit tests for YAML).

**Target Platform**: Developer machine (macOS/Linux), Docker Engine + Compose v2; containers run Node 24 / nginx images as already defined by the modules.

**Project Type**: Developer tooling + infrastructure as code (Compose) and documentation standard; not an application module.

**Performance Goals**: N/A (local dev tooling). Reference: services start within minutes on a clean build; mode switching requires no rebuild.

**Constraints**: Production-like (built images, no source mounting, no hot reload) per clarification Q1:B; fixed, collision-free, documented host ports per clarification Q2:A (one REST + one MCP per module); data persists in one common host directory per clarification Q3:C; switching modes requires no code change and no image rebuild (FR-007); only low-risk conformance fixes land in this feature (Q2:C).

**Scale/Scope**: 4 modules (`bus-catcher`, `fly-over-tracker`, `procrastinator-tracker`, `current-time`), 3 backend + 1 frontend-only; up to 3 REST, 3 MCP, 4 SPA, 4 Storybook containers. Standardization conformance for modules is deferred to follow-up work.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **I. Module-First**: PASS — this feature is repository-level tooling and documentation (root `docker-compose.yml`, `docs/module-standard.md`, gap assessment). It does not add an organizational-only module; the constitution explicitly scopes module-first to features/capabilities, and shared tooling lives at the root (as `packages/config` does).
- **II. Local-First & Private by Default**: PASS — the Compose environment runs on the developer's own machine; module data stays in the local common data directory; no external access or sync is introduced.
- **III. Declared Identity & Uniform Tooling**: PASS — no package identity changes; any frontend/nginx changes keep extending the shared presets. The standard reinforces, not replaces, declared identity.
- **IV. Test-First (NON-NEGOTIABLE)**: PASS — any code behavior change (e.g., SPA base-URL resolution, nginx proxy template) must land with a failing Vitest test first, then implementation. Compose wiring itself is validated via the `quickstart.md` runtime scenarios.
- **V. Contract & Integration Testing**: PASS — the Compose environment is an integration surface; `quickstart.md` proves REST ↔ MCP parity containers and SPA↔backend connectivity end-to-end. Any contract change on a module's REST/MCP surface remains covered by that module's existing suites.
- **Quality gates**: PASS — lint/format/typecheck/tests must pass; new YAML/MD files are covered by Prettier (`pnpm format`). No per-module config drift.
- **Releases**: NOTE — Dockerfile/nginx changes affect module container images; `version-analyser` must evaluate whether a changeset/version bump is required before any PR. This feature itself ships no new packages.

## Project Structure

### Documentation (this feature)

```text
specs/004-local-setup-standardization/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
│   ├── compose.md       # Compose CLI, profiles, service naming, env surface
│   ├── ports.md         # Fixed host-port allocation table (no-collision scheme)
│   ├── base-url.md      # SPA env var + component prop contract (module standard)
│   └── module-standard.md # The written standard outline + conformance checklist
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
# Compose environment (this feature)
docker-compose.yml            # root Compose file: 5 profiles, per-module services
.env.example                  # documented overrides (host ports, upstreams)
docs/module-standard.md       # the written module standard (deliverable, FR-012)
docs/module-gap-assessment.md # per-module conformance status (deliverable, FR-017)

# Per backend-connected module (required, low-risk conformance fixes for FR-005/FR-006)
modules/<slug>/Dockerfile.storybook        # NEW: static Storybook image (build-storybook + nginx)
modules/<slug>/deploy/nginx.spa.conf       # MODIFIED: add /api reverse proxy (env-templated upstream)
modules/<slug>/deploy/nginx.spa.proxy.conf.template  # NEW: /api location template
modules/<slug>/deploy/nginx-entrypoint.d/  # NEW: envsubst entrypoint scripts
modules/<slug>/Dockerfile.frontend         # MODIFIED: envsubst entrypoint + optional npm_token secret
modules/<slug>/Dockerfile.backend          # MODIFIED: optional npm_token; ship drizzle/ migrations

# Frontend-only module (also given compose images so current-time participates)
modules/current-time/Dockerfile.frontend   # NEW
modules/current-time/Dockerfile.storybook  # NEW
modules/current-time/deploy/               # NEW (nginx conf + template + entrypoint)

# Deferred conformance (gap-assessment items only, NOT implemented in this feature)
#  - SPA API_BASE_URL runtime env + component baseUrl prop (FR-008/FR-009)
#  - Align backend port env var naming (PORT vs HTTP_PORT)
#  - Point native-run DB defaults at the root common data/ directory (FR-018 native half)
```

**Structure Decision**: Repository-level Compose plus per-module deploy artifacts, mirroring the
existing convention where each module owns its `Dockerfile.*` and `deploy/` files. The standard and
gap assessment live in repo-root `docs/` (repository-level guidance, alongside the existing docs/).

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

No constitutional violations require justification. One scope note is recorded here for
transparency: adding a `Dockerfile.storybook` per module creates a new build artifact per module,
but the constitution's module-first principle (each module self-contained and independently
deployable) makes per-module images the conformant choice over a shared root image.