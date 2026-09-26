---

description: "Task list for feature implementation"
---

# Tasks: Merge Modules into Monorepo

**Input**: Design documents from `/specs/001-merge-modules/`

**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: The feature spec defines independent tests per user story and runnable validation scenarios in `quickstart.md`. Instead of unit-test tasks, this infrastructure/migration feature uses **verification tasks** that run the relevant quickstart scenario as its test gate. No new unit tests are written; existing per-module Vitest suites are preserved and gated in CI.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

**Pilot**: Per user decision, the module-import procedure is piloted with **fly-over-tracker** first (end-to-end, with a validation checkpoint) before importing the other two modules. Hold any push of the feature branch until all phases are validated (user confirmation).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- Monorepo workspace: `modules/<slug>/backend`, `modules/<slug>/frontend`, `packages/config`
- Root files: `pnpm-workspace.yaml`, `package.json`, `.npmrc`, `.gitignore`, `.changeset/`, `.github/workflows/`
- All paths are relative to the repository root

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic monorepo structure

- [ ] T001 Create monorepo skeleton: `pnpm-workspace.yaml` with `packages: [modules/*/backend, modules/*/frontend, packages/*]` and root `package.json` (name `home-sweet-home-modules`, private, packageManager `pnpm@11.25.0`, engines `node >=24`, scripts: `lint`, `format`, `format:write`, `typecheck`, `test`, `changeset`, `version`, `release`)
- [ ] T002 Create root `.npmrc` mapping `@sousa99` to `https://npm.pkg.github.com/` and root `.gitignore` (node_modules, dist, dist-app, dist-lib, dist-storybook, *.db, CHANGELOG-local artifacts)
- [ ] T003 [P] Migrate `@sousa99/homesweethome-config` presets into `packages/config/` (`eslint.js`, `prettier.js`, `tsconfig.base.json`, `package.json` with version `0.0.1` and `publishConfig` registry GitHub Packages); drop the home-sweet-home-tools CLI (do NOT carry it over, FR-009/FR-014)
- [ ] T004 [P] Configure changesets: `.changeset/config.json` with `baseBranch: main`, `access: public`, changelog enabled, and fixed groups `[["@sousa99/procrastinator-tracker-backend","@sousa99/procrastinator-tracker-components"],["@sousa99/fly-over-tracker-backend","@sousa99/fly-over-tracker-components"],["@sousa99/bus-catcher-backend","@sousa99/bus-catcher-components"]]`; add `.changeset/README.md`
- [ ] T005 [P] Wire root quality gates: root `eslint.config.mjs` and `prettier.config.mjs` extending `packages/config` presets; confirm `pnpm install` resolves the workspace (single lockfile)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [ ] T006 Verify `git-filter-repo` availability (`git filter-repo --version`); if unavailable, install it or record the `git subtree add` fallback decision in a repo-local note under `specs/001-merge-modules/` (research.md Open items)
- [ ] T007 Fetch the three source repos locally (clone/fetch `Sousa99/fly-over-tracker`, `Sousa99/procrastinator-tracker`, `Sousa99/bus-catcher`) to confirm access and capture their latest `main` commit and tag list for the history-preserving import (FR-012)
- [ ] T008 Confirm the root workspace installs cleanly (`pnpm install` generates `pnpm-lock.yaml` with all three module package globs and `packages/config`) — prerequisite for importing module code

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Consolidate all modules into a single repository (Priority: P1) 🎯 MVP

**Goal**: All three modules live under `modules/<slug>/` in this repository with full git history preserved; historical module specs archived under `specs/001-merge-modules/merge-history/<slug>/`

**Independent Test**: quickstart.md **Scenario 1** (fresh clone, one setup, all three modules present and runnable) + **Scenario 3** (history preserved under `modules/<slug>/`)

### Pilot: fly-over-tracker first (per user decision)

- [ ] T009 [US1] PILOT — Import `fly-over-tracker` with full history: clone, `git filter-repo --to-subdirectory-filter modules/fly-over-tracker`, then merge `--allow-unrelated-histories` into this repo on the feature branch (FR-012)
- [ ] T010 [US1] Adapt `modules/fly-over-tracker`: reset `backend/package.json` and `frontend/package.json` versions to `0.0.1` (FR-006); add `@sousa99/homesweethome-config` as `workspace:*` devDependency; delete `.releaserc.json`; delete per-repo `.github/workflows/`; delete `.specify/` and `opencode.json` (FR-003/FR-015)
- [ ] T011 [US1] Archive fly-over-tracker historical specs: `git mv modules/fly-over-tracker/specs specs/001-merge-modules/merge-history/fly-over-tracker` (archival only, excluded from numbering — constitution v2.0.0)
- [ ] T012 [US1] VALIDATE PILOT CHECKPOINT: `pnpm install`, gates pass for `modules/fly-over-tracker/backend` and `/frontend` (lint, format, typecheck, test, build). STOP until pilot is validated before importing other modules

### Remaining modules (parallel after pilot validation)

- [ ] T013 [P] [US1] Import `procrastinator-tracker` using the validated pilot procedure (filter-repo → `--allow-unrelated-histories` merge → reset versions to `0.0.1` → `workspace:*` config → remove `.releaserc.json`/workflows/`.specify`/`opencode.json`); archive specs via `git mv` to `specs/001-merge-modules/merge-history/procrastinator-tracker`
- [ ] T014 [P] [US1] Import `bus-catcher` using the validated pilot procedure (same steps); archive specs via `git mv` to `specs/001-merge-modules/merge-history/bus-catcher`
- [ ] T015 [US1] Verify full consolidation: run quickstart **Scenario 1** (all three modules present and runnable from one setup) and **Scenario 3** (history preserved per module path); confirm no source file references an old repository location

**Checkpoint**: At this point, User Story 1 should be fully functional and testable independently (MVP)

---

## Phase 4: User Story 2 - Uniformize quality gates, CI and CD (Priority: P1)

**Goal**: One shared set of quality gates and one CI pipeline validate every module on every PR, with a single aggregate merge-blocking check

**Independent Test**: quickstart.md **Scenario 2** (gates defined once, run against all modules; deliberately broken module fails the aggregate `✅ Check`)

- [ ] T016 [US2] Create uniform CI workflow `.github/workflows/ci.yml`: matrix over `modules/*/backend`, `modules/*/frontend`, `packages/config`; jobs for 🧹 Format, 🚨 Lint, 🔍 Typecheck, 🧪 Test, 🏗️ Build backend, 🖼️ Build SPA, 📦 Build lib, 🔬 actionlint, 📝 PR format; single aggregate `✅ Check` job that `needs` all jobs and is the required status check on `main` (FR-003/FR-004)
- [ ] T017 [US2] Confirm root gates run across all packages via shared presets (`pnpm lint`, `pnpm format`, `pnpm typecheck`, `pnpm test` at root resolve every workspace package through `packages/config`) — same commands for every module (FR-003)
- [ ] T018 [US2] Validate CI shape: quickstart **Scenario 2** — a PR touching one module still checks all modules; a deliberately failing module makes the aggregate check fail and blocks merge

**Checkpoint**: At this point, User Stories 1 AND 2 should both work independently

---

## Phase 5: User Story 3 - Release each module independently (Priority: P2)

**Goal**: Per-module independent releases via changesets fixed groups; each module publishes its artifacts at one shared version starting at `0.0.1`; other modules untouched

**Independent Test**: quickstart.md **Scenario 4** (changeset for one module bumps only that module, both packages to the same version, from `0.0.1`) + **Scenario 5** (release publishes npm + GHCR images + GitHub release at the module version)

- [ ] T019 [US3] Create release workflow `.github/workflows/release.yml`: `@changesets/action` version PR on push to `main`, publish on merge; `concurrency` group on the release ref with `cancel-in-progress: false` (contracts/release-model.md)
- [ ] T020 [US3] Implement per-module publish step in the release workflow: after `changeset version`, for each versioned module build and push GHCR images `ghcr.io/sousa99/<slug>-backend:<v>` (+ `latest`) and `<slug>-frontend:<v>` (+ `latest`) from `modules/<slug>/Dockerfile.backend` and `Dockerfile.frontend` (FR-007)
- [ ] T021 [US3] Publish npm packages via `changeset publish` (GitHub Packages, `@sousa99` scope, repo-level `.npmrc` auth) and create a GitHub release per released module with its changelog (FR-008)
- [ ] T022 [US3] Validate independent release model: quickstart **Scenario 4** (only the changed module bumps; fixed group keeps its two packages in sync; starts at `0.0.1`) and **Scenario 5** (artifacts published at the same version; other modules unchanged)

**Checkpoint**: All user stories should now be independently functional

---

## Phase 6: User Story 4 - Uniform documentation and onboarding (Priority: P3)

**Goal**: Repo-level overview plus per-module docs following one shared structure and conventions

**Independent Test**: spec.md US4 acceptance scenarios — repo README lists all modules and explains structure/run; any two module doc sets follow the same structure and headings

- [ ] T023 [US4] Create root `README.md`: Home Sweet Home overview, module index (fly-over-tracker, procrastinator-tracker, bus-catcher), single setup command, quality gates, release model summary (FR-010/FR-002)
- [ ] T024 [US4] Create `docs/` repo-level guides: `docs/modules.md` (module index + how to add a new module in-repo, FR-015) and repo-structure/governance overview referencing the constitution
- [ ] T025 [P] [US4] Refresh per-module documentation to a uniform structure across `modules/fly-over-tracker/setup.md`, `modules/procrastinator-tracker/setup.md`, `modules/bus-catcher/setup.md` and their READMEs (same headings, gates, run commands) (FR-010)
- [ ] T026 [US4] Validate documentation uniformity: repo README lists all modules; any two module doc sets match in structure and conventions (US4 acceptance scenarios; SC-005)

**Checkpoint**: All user stories complete

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [ ] T027 [P] Run the full `quickstart.md` validation from a fresh clone (Scenarios 1-7), confirming FR-001..FR-015 and SC-001..SC-005 end-to-end
- [ ] T028 Delete old published packages (GitHub Packages npm + GHCR images) for the three modules ONLY after validation passes (FR-011) — manual ops step
- [ ] T029 Archive/delete source repositories (`Sousa99/procrastinator-tracker`, `Sousa99/fly-over-tracker`, `Sousa99/bus-catcher`, `Sousa99/home-sweet-home-tools`) ONLY after validation passes (FR-011/FR-014) — manual ops step
- [ ] T030 Final review + commit: verify every FR-001..FR-015 is covered, commit all changes on `feature/001-merge-modules`; **HOLD the push until the user confirms the feature is ready** (per decision: no push until ready)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3+)**: All depend on Foundational phase completion
  - User stories can then proceed in priority order (P1 → P2 → P3)
- **Polish (Final Phase)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories. Inside US1: fly-over-tracker pilot (T009-T012) MUST validate before T013/T014.
- **User Story 2 (P2... P1)**: Depends on US1 (all three modules must exist before uniform CI validates them). Independently testable once US1 is done.
- **User Story 3 (P2)**: Depends on US2 (release pipeline runs the uniform gates). Independently testable once US2 is done.
- **User Story 4 (P3)**: Depends on US1 (modules present). Can start alongside US2/US3.

### Within Each User Story

- Pilot module import validated before remaining module imports (US1)
- CI workflow (US2) before release workflow (US3)
- Per-module release independence demonstrated before any real publish

### Parallel Opportunities

- All Setup tasks marked [P] (T003, T004, T005) can run in parallel
- Module imports T013 and T014 can run in parallel after the pilot checkpoint T012
- Docs refresh T025 is parallelizable per module
- Quickstart validation T027 and cleanup T028/T029 are independent of each other

---

## Parallel Example: User Story 1 (after pilot checkpoint)

```bash
# Launch the two remaining module imports in parallel (different directories):
Task: "Import procrastinator-tracker into modules/procrastinator-tracker (pilot procedure)"
Task: "Import bus-catcher into modules/bus-catcher (pilot procedure)"
```

```bash
# Parallel verification after imports:
Task: "Run quickstart Scenario 1 (fresh clone, all modules runnable)"
Task: "Run quickstart Scenario 3 (history preserved per module path)"
```

---

## Implementation Strategy

### Pilot First (per user decision)

1. Complete Phase 1: Setup (monorepo skeleton + config presets + changesets + gates)
2. Complete Phase 2: Foundational (filter-repo verified, source access, workspace installs)
3. **PILOT**: Import **fly-over-tracker** end-to-end (T009-T012) and STOP at the checkpoint to validate the procedure before touching the other modules
4. Import procrastinator-tracker and bus-catcher in parallel (T013, T014)
5. Verify full consolidation (T015) → US1 = MVP complete

### Incremental Delivery

1. Setup + Foundational → Foundation ready
2. US1 (all three modules consolidated) → Test independently → **MVP** (fresh clone runs all modules)
3. US2 (uniform CI/CD gates) → Test independently
4. US3 (independent per-module releases via changesets) → Test independently
5. US4 (uniform docs) → Test independently
6. Polish: full quickstart validation, then delete old repos/packages (FR-011)

### Hold Push Until Ready

- Commit work on `feature/001-merge-modules` incrementally (commit after each task or logical group)
- **Do NOT push the feature branch** until the full validation (T027) passes and the user confirms readiness (T030)
- Open the PR only after explicit user confirmation

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story is independently completable and testable
- Verification tasks reference the exact quickstart scenario used as that story's test gate
- Commit after each task or logical group; stop at any checkpoint to validate
- Avoid: vague tasks, same file conflicts, cross-story dependencies that break independence
- The existing per-module Vitest suites are preserved and enforced by the uniform CI; no new unit tests are required for this migration feature