# Tasks: Module Docs Templatization

**Input**: Design documents from `/specs/005-module-docs-templatization/`

**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: No test tasks — the feature spec does not request unit tests. Validation is via the
scaffold command's `--check` mode and the quickstart scenarios.

**Organization**: Tasks are grouped by user story to enable independent implementation and
testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

This feature spans three repositories. Paths below are relative to the **template repo**
(`home-sweet-home-module-template`) unless a task explicitly names another repo (tools repo =
`home-sweet-home-tools`, reference module = this `procrastinator-tracker` repo).

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Create the template and tools repositories and their base tooling.

- [ ] T001 Create the template repo structure under `home-sweet-home-module-template` (templates at root as `.tpl` files mirroring the final module layout, `scripts/`, `.github/workflows/`)
- [ ] T002 [P] Create the tools repo `home-sweet-home-tools` with `pnpm-workspace.yaml` and `packages/config` + `packages/cli` directories
- [ ] T003 [P] Add `scripts/scaffold.mjs` skeleton in the template repo with `render` / `--check` / `--help` argument parsing and exit-code contract (0/1/2 per contracts/scaffold.md)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [x] T004 Implement config validation per contracts/module-config.md — `module.config.yaml` schema (required keys, `module_slug`/`npm_scope`/`ghcr_org` regexes, `packages` subset of {backend, frontend} with ≥1) in `scripts/scaffold.mjs`
- [x] T005 [P] Implement the token renderer in `scripts/scaffold.mjs`: `{{UPPER_SNAKE_CASE}}` substitution from the closed inventory (contracts/templates.md), `\{{...}}` escape collapse, unresolved-token → error naming file+token
- [x] T006 [P] Implement atomic render (validate + render all in memory, then write) and `--check` mode (in-memory compare, `drifted`/`missing`/`unexpected`/`in_sync`, never writes) in `scripts/scaffold.mjs`
- [x] T007 Implement derived-name computation (backend/frontend package names, GHCR images, npm scope mapping, MCP display name) per data-model.md and expose them as tokens
- [x] T008 [P] Create `module.config.yaml` example in the template repo with `{{...}}` token values and full field set per contracts/module-config.md

**Checkpoint**: Foundation ready — the renderer validates config, substitutes tokens, and
checks drift. User story implementation can now begin in parallel.

---

## Phase 3: User Story 1 - Scaffold a new Home Sweet Home module from the template (Priority: P1) 🎯 MVP

**Goal**: A developer can clone the template repo, fill `module.config.yaml`, and generate a
complete module repo with no leftover placeholders.

**Independent Test**: Scaffold a scratch module, assert zero `{{...}}` tokens remain
(quickstart §1), and run `--check` successfully.

### Implementation for User Story 1

- [x] T009 [P] [US1] Create `README.md.tpl` in the template repo (badges + frontmatter + module-specific sections, substitution inside code fences)
- [x] T010 [P] [US1] Create `AGENTS.md.tpl` in the template repo (GitHub delegation to github-helper, multi-phase work rules)
- [x] T011 [P] [US1] Create `package.json.tpl` in the template repo (root package name/description/scripts from config)
- [x] T012 [P] [US1] Create `backend/package.json.tpl` in the template repo (`{{BACKEND_PACKAGE}}`, dual-mode `--http`/`--mcp` scripts)
- [x] T013 [P] [US1] Create `frontend/package.json.tpl` in the template repo (`{{FRONTEND_PACKAGE}}` = `@<scope>/<slug>-components`, SPA + Storybook + build:lib scripts)
- [x] T014 [P] [US1] Create `pnpm-workspace.yaml.tpl`, `tsconfig.base.json.tpl`, `.gitignore.tpl` in the template repo (standard workspace + tooling baseline)
- [x] T015 [US1] Wire `packages` skip logic in `scripts/scaffold.mjs`: backend absent → skip backend templates/Dockerfile/publish backend section; frontend absent → skip frontend templates/Dockerfile/nginx conf (contracts/templates.md)

**Checkpoint**: At this point, User Story 1 is functional — a scratch module scaffolds with
real values and passes `--check`.

---

## Phase 4: User Story 2 - Identify a module as part of Home Sweet Home (Priority: P1)

**Goal**: Every generated module README declares its Home Sweet Home identity via the badge
row, YAML frontmatter, and a generated `setup.md`.

**Independent Test**: Inspect a generated module README — badge row + frontmatter present
(quickstart §1), `setup.md` exists and documents setup/gates/pipelines/package org (SC-004, SC-007).

### Implementation for User Story 2

- [x] T016 [P] [US2] Add the "Part of Home Sweet Home" shields.io badge block + YAML frontmatter to `README.md.tpl` using `{{UMBRELLA_LINK}}` (placeholder) per research decision #7
- [x] T017 [US2] Create `setup.md.tpl` in the template repo — prerequisites, quality gates, pipeline conventions, dual-mode backend + single frontend package organization, good practices (FR-005)
- [x] T018 [P] [US2] Create `docs/clarify.md.tpl` in the template repo — the **foundational clarify**: decisions to settle at module creation (runtime defaults, tech variants, registries), pre-filled with config values (FR-001, research #10)
- [x] T019 [P] [US2] Create `specs/000-module-readme.md.tpl` in the template repo linking to `setup.md` + `docs/clarify.md`

**Checkpoint**: A scaffolded module reads as a first-class Home Sweet Home repo with
self-documenting setup.

---

## Phase 5: User Story 3 - Enforce documentation/packaging consistency (Priority: P2)

**Goal**: `--check` runs in CI on every module PR so config/generated-file drift is caught
before merge.

**Independent Test**: Deliberately edit a generated file out of sync → `--check` fails naming
the file; restore → passes (quickstart §2, SC-003).

### Implementation for User Story 3

- [x] T020 [US3] Add a `scaffold --check` job to `.github/workflows/ci.yml.tpl` in the template repo (FR-006) — parallel, emoji-labeled, with the standard quality gates (format/lint/typecheck/test/builds)
- [x] T021 [US3] Create `.github/workflows/release.yml.tpl` in the template repo — validate → semantic-release → publish (Docker + npm) per research #4/#9
- [x] T022 [P] [US3] Create `.releaserc.json.tpl` in the template repo (semantic-release plugin chain, version sync via `scripts/apply-release-version.mjs.tpl`)
- [x] T023 [P] [US3] Create `.github/PULL_REQUEST_TEMPLATE.md.tpl` in the template repo (guided PR body, conventional-commit title hint, format checklist)

**Checkpoint**: Any module repo generated from the template enforces consistency mechanically
in CI.

---

## Phase 6: User Story 4 - Create a module with shared tooling and CLI (Priority: P2)

**Goal**: A `homesweethome create <module>` CLI bootstraps a module, and
`@sousa99/homesweethome-config` provides identical tooling presets across modules.

**Independent Test**: Run the CLI to scaffold a module and confirm it passes `--check`; install
the config package in two scratch projects and confirm identical preset resolution (quickstart §4–§5, SC-006).

### Implementation for User Story 4

- [x] T024 [P] [US4] Implement `@sousa99/homesweethome-config` presets in `home-sweet-home-tools/packages/config` — eslint flat preset, prettier preset, tsconfig base (contracts/config-package.md)
- [x] T025 [P] [US4] Implement `homesweethome create <module>` CLI in `home-sweet-home-tools/packages/cli` — clone template → collect identity → write `module.config.yaml` → run scaffold render → print verify/push steps (contracts/scaffold.md)
- [x] T026 [P] [US4] Create `eslint.config.mjs.tpl` and `prettier.config.mjs.tpl` in the template repo consuming `@sousa99/homesweethome-config` (thin local config, no override required)
- [x] T027 [US4] Create `opencode.json.tpl` in the template repo — GitHub MCP setup + `github-helper` subagent config; the module's own remote MCP entry is a hand-written placeholder (research #10)
- [x] T028 [P] [US4] Create `.specify/init-options.json.tpl` and `.specify/integration.json.tpl` in the template repo (Spec Kit setup per research #10)
- [x] T029 [P] [US4] Create `Dockerfile.backend.tpl`, `Dockerfile.frontend.tpl`, `deploy/nginx.spa.conf.tpl`, `scripts/apply-release-version.mjs.tpl`, `scripts/publish-artifacts.sh.tpl` in the template repo (Docker/scripts use `{{BACKEND_IMAGE}}`/`{{SPA_IMAGE}}`/`{{GHCR_ORG}}`/`{{MODULE_SLUG}}`)
- [x] T030 [US4] Mark `home-sweet-home-module-template` as a GitHub template repository (`is_template: true`) via `github-helper` so modules use `Use this template` (FR-007)

**Checkpoint**: A new module is one command away, with identical tooling and pipeline.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Reference-module migration, full validation, and quality gates.

- [x] T031 [P] Migrate `procrastinator-tracker` (this repo) to the generated layout — add `module.config.yaml`, `setup.md`, `docs/clarify.md`, update `README.md`/`AGENTS.md`/`package.json`/`backend/package.json`/`frontend/package.json`/`opencode.json` from template renders (FR-010, SC-005)
- [x] T032 [P] Run `node scripts/scaffold.mjs --check` in the reference module and confirm exit 0 (SC-004, SC-005)
- [x] T033 Run the quickstart.md validation scenarios (§1–§9) and record results
- [x] T034 Run `pnpm format`, `pnpm lint`, `pnpm typecheck`, `pnpm test` on the reference module — all green
- [x] T035 Create the `home-sweet-home-module-template` and `home-sweet-home-tools` repos on GitHub via `github-helper` (owner `sousa99`, per FR-013)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3+)**: All depend on Foundational phase completion
  - User stories can then proceed in parallel (if staffed)
  - Or sequentially in priority order (P1 → P2 → P3)
- **Polish (Final Phase)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1, MVP)**: Can start after Foundational — no dependencies on other stories
- **User Story 2 (P1)**: Can start after Foundational — no file overlap with US1 (README/template surface split across both; README template authored in US1, badge/frontmatter finalized in US2)
- **User Story 3 (P2)**: Can start after Foundational — CI/CD templates are independent files
- **User Story 4 (P2)**: Can start after Foundational — presets/CLI/Docker/opencode/speckit templates are independent files

### Within Each User Story

- Models before services (renderer → config validation → derived names)
- Core implementation before integration
- Story complete before moving to next priority

### Parallel Opportunities

- All Setup tasks marked [P] can run in parallel
- All Foundational tasks marked [P] can run in parallel (within Phase 2)
- Once Foundational phase completes, all four user stories can start in parallel (distinct
  files per story)
- All templates within a story marked [P] can run in parallel
- Different user stories can be worked on in parallel by different team members

---

## Parallel Example: User Story 1

```bash
# Launch all templates for User Story 1 together:
Task: "Create README.md.tpl in the template repo"
Task: "Create AGENTS.md.tpl in the template repo"
Task: "Create package.json.tpl in the template repo"
Task: "Create backend/package.json.tpl in the template repo"
Task: "Create frontend/package.json.tpl in the template repo"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL - blocks all stories)
3. Complete Phase 3: User Story 1
4. **STOP and VALIDATE**: Scaffold a scratch module, assert zero leftover tokens, run `--check`
5. Deploy/demo if ready

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready (renderer + config + tokens + `--check`)
2. Add User Story 1 → scaffold works (MVP!)
3. Add User Story 2 → identity/badges/frontmatter/setup.md/clarify
4. Add User Story 3 → CI/CD enforcement
5. Add User Story 4 → CLI + presets + Docker/scripts/opencode/speckit
6. Polish → reference-module migration + full validation

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together
2. Once Foundational is done:
   - Developer A: User Story 1 (templates)
   - Developer B: User Story 2 (badges/frontmatter/setup/clarify)
   - Developer C: User Story 3 (CI/CD)
   - Developer D: User Story 4 (presets/CLI/Docker/opencode/speckit)
3. Stories complete and integrate independently

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- Runtime application defaults (MCP server name, DB filename, SPA title, module's own remote
  MCP entry) stay hand-written — NOT templated (FR-012)
- GitHub repo creation and template-repo marking are delegated to `github-helper` (AGENTS.md);
  the agent never merges