# Implementation Plan: Merge Modules into Monorepo

**Branch**: `feature/001-merge-modules` | **Date**: 2026-09-26 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-merge-modules/spec.md`

## Summary

Consolidate the three Home Sweet Home modules (procrastinator-tracker, fly-over-tracker,
bus-catcher) and the shared config presets (currently in home-sweet-home-tools) into
this single repository. Preserve the full git history of all source repos, reset every
package version to 0.0.1, uniformize CI/CD/publishing/docs across the ecosystem, and
enable independent per-module releases via a changeset-based workflow using changesets
**fixed release groups**. The module-scaffolding CLI is dropped — new modules are added
directly inside this repository. Old repositories and previously published packages are
removed only after the migrated monorepo is verified.

## Technical Context

**Language/Version**: Node 24 LTS; pnpm 11 (packageManager `pnpm@11.25.0`)

**Primary Dependencies**: pnpm workspaces; `@changesets/cli` + `@changesets/action`;
GitHub Actions + Docker Buildx; TypeScript, ESLint, Prettier, Vitest; existing per-module
stacks (Hono / Drizzle / SQLite backend, Vite / React 19 / Tailwind v4 frontend)

**Storage**: N/A — this feature introduces no runtime data store. Per-module SQLite
databases stay inside each module's `backend/`.

**Testing**: Vitest per package. The uniform CI pipeline runs lint, format, typecheck,
test, and build against every package on every pull request.

**Target Platform**: GitHub-hosted monorepo; artifacts publish to GitHub Packages
(`npm.pkg.github.com`, `@sousa99` scope) and GHCR (`ghcr.io/sousa99`).

**Project Type**: Multi-package pnpm monorepo — application modules plus tooling packages.

**Performance Goals**: CI must remain fast enough to be the merge gate for a 3-module
(+ tooling) workspace; incremental, per-package checks are preferred.

**Constraints**: Per-module independent releases; all packages reset to 0.0.1; full git
history preserved; uniform gates, CI/CD, and documentation; old repos/packages removed
only after verification.

**Scale/Scope**: 3 modules × (backend + frontend) + 1 tooling package (config presets);
layout must accommodate future modules.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Module-First | ⚠️ Conflict (justified) | Modules remain self-contained and independently deployable, but the "own repository" clause is intentionally reversed by explicit user decision to adopt a monorepo. Justification recorded in Complexity Tracking; a constitution amendment (MAJOR, Principle I) is recommended as a follow-up. |
| II. Local-First & Private by Default | ✅ Compliant | No change to data residency; per-module SQLite stays local to each module. |
| III. Configuration-Driven Consistency | ⚠️ Conflict (justified) | `module.config.yaml` and `scaffold.mjs --check` are dropped by explicit user decision (no scaffolding). Module identity is declared in each package's `package.json` instead. Justification recorded in Complexity Tracking; a constitution amendment is recommended as a follow-up. |
| IV. Test-First (NON-NEGOTIABLE) | ✅ Compliant | Vitest retained per package; full test suite is a merge gate. |
| V. Contract & Integration Testing | ✅ Compliant | Published package contracts and the release model are documented under `contracts/`; monorepo enables module-to-module integration tests. |
| Development Workflow & Quality Gates (module stamping) | ⚠️ Conflict (justified) | The "stamp new modules from the template via the `homesweethome` CLI / Use this template" gate is overridden: modules are added directly in-repo (FR-015). Recommended for amendment alongside Principle III. |

## Project Structure

### Documentation (this feature)

```text
specs/001-merge-modules/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
modules/
├── procrastinator-tracker/      # module: backend/ + frontend/
│   ├── backend/
│   ├── frontend/
│   ├── Dockerfile.backend
│   ├── Dockerfile.frontend
│   ├── docs/
│   └── setup.md
├── fly-over-tracker/            # module: same layout
│   └── ...
└── bus-catcher/                 # module: same layout
    └── ...
packages/
└── config/                       # @sousa99/homesweethome-config
    ├── eslint.js
    ├── prettier.js
    └── tsconfig.base.json
.changeset/
└── config.json                   # changesets config + per-module fixed groups
.github/
└── workflows/
    ├── ci.yml                    # uniform CI (matrix over modules + tooling)
    └── release.yml               # changesets version + publish (npm + GHCR + GitHub release)
docs/                             # repo-level documentation (overview, module index)
specs/                            # single Spec Kit location: all spec-driven development
└── 001-merge-modules/            # this feature
    └── merge-history/            # archived historical module specs (archival only)
        ├── procrastinator-tracker/
        │   └── 001-task-tracker-core/
        ├── fly-over-tracker/
        └── bus-catcher/
pnpm-workspace.yaml               # packages: modules/*/backend, modules/*/frontend, packages/*
package.json                      # root scripts: lint/format/typecheck/test + changeset scripts
```

**Structure Decision**: Modules live under `modules/<slug>/` (self-contained, mirroring
the module template layout minus scaffolding), and the shared config presets live under
`packages/config/`. The pnpm workspace globs (`modules/*/backend`, `modules/*/frontend`,
`packages/*`) automatically pick up existing and future modules — a new module is added
by creating `modules/<slug>/` and adding a fixed release group; no scaffolding CLI or
template-stamping step is required (FR-015). Spec-driven development is repo-root only:
all active features, specs, plans, contracts, and tasks live under the root `specs/`.
Historical specs from each source repo are archived via `git mv` into
`specs/001-merge-modules/merge-history/<module-slug>/` (keeping their original `NNN-name`
structure) so they stay in one place, namespaced per module, and are never mistaken for
active features.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| Monorepo instead of one-repo-per-module (Principle I, "own repository" clause) | User explicitly decided to unify publishing, CI/CD, and docs across modules in a single repository while keeping independent releases | Keeping three repositories requires maintaining three pipelines, three doc sets, and three release setups — the exact duplication this feature exists to remove; per-module releases are preserved through changesets fixed groups |
| Per-module fixed release groups in changesets | A module's backend and frontend packages must share one version so its images and npm package release together (per-module release model, FR-013) | Fully independent per-package versions would split a module's backend/frontend versions, contradicting the user's per-module release requirement |
| Dropping module scaffolding and the `homesweethome` CLI (Principle III + stamping gate) | User decided modules are added directly in-repo; scaffolding machinery and the CLI add generation/drift complexity with no value in a monorepo | Keeping `scaffold.mjs --check` and a CLI would preserve template-drift enforcement but contradicts the explicit "no scaffold / no CLI" decision; drift is instead prevented by uniform gates and code review |
| One shared CI workflow with a module matrix instead of per-module workflows | Uniformity is an explicit requirement; a single workflow (plus aggregate check) is the merge gate for all modules | Three near-identical workflows reintroduce drift between modules and duplicate maintenance |