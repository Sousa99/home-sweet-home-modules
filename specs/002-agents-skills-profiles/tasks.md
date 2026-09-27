---

description: "Task list for feature implementation: Agents & Skills Profiles"
---

# Tasks: Agents & Skills Profiles

**Input**: Design documents from `/specs/002-agents-skills-profiles/`

**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: No unit tests — this is a configuration/documentation feature. Each user story is validated via its `quickstart.md` scenario (V1–V7). The existing repo gates (`pnpm lint`, `pnpm format`, `pnpm typecheck`, `pnpm test`) must remain green throughout.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Config/docs feature**: files live at the repository root (`opencode.json`, `AGENTS.md`), under `.opencode/agents/`, `.opencode/skills/<name>/`, and `modules/<slug>/AGENTS.md`.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Baseline verification and confirmation of the delegation mechanism before any changes

- [x] T001 Verify baseline: `opencode.json` is schema-valid against https://opencode.ai/config.json and `pnpm lint` + `pnpm format` pass on the current tree before changes
- [x] T002 [P] Confirm the enforcement mechanism per research.md R1: verify `permission: { "github_*": "deny" }` filters GitHub MCP tools and `permission.bash` patterns parse `git`/`gh` commands; record the verdict (or the fallback to `tools: { "github_*": false }`) in `specs/002-agents-skills-profiles/research.md`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Directory scaffolding that all user stories depend on

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T003 Create `.opencode/agents/` directory (foundation for US1 migration and US2 profiles)
- [x] T004 [P] Create `.opencode/skills/` directory (foundation for US3 skills)

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Full Git & GitHub Delegation (Priority: P1) 🎯 MVP

**Goal**: Hard-enforce that every git/GitHub operation is performed only by the `github-helper` agent; the main assistant cannot run git/gh commands or GitHub MCP tools (spec FR-001/FR-002, contracts/delegation-contract.md)

**Independent Test**: Ask the main assistant to "commit and push this change" — it refuses/delegates to `github-helper`, which performs the operation (quickstart V2/V3)

### Implementation for User Story 1

- [x] T005 [P] [US1] Add hard-enforcement permission rules for the main assistant in `opencode.json`: `"permission": { "github_*": "deny", "bash": { "*": "allow", "git": "deny", "git *": "deny", "gh": "deny", "gh *": "deny" } }`
- [x] T006 [P] [US1] Create `.opencode/agents/github-helper.md` with frontmatter (`description`, `mode: subagent`, permission overrides: `github_*: allow`, `bash: { "*": "deny", "git": "allow", "git *": "allow", "gh": "allow", "gh *": "allow" }`) and a prompt body covering commits/pushes/branches/PRs/issues/CI + commit-message conventions + out-of-scope redirection + the rule to run the `version-analyser` before opening any pull request
- [x] T007 [US1] Clean up `opencode.json`: remove the deprecated `tools` field and the inline `github-helper` agent definition (now file-based); keep the `mcp.github` server config and `$schema` (depends on T005, T006)
- [ ] T008 [US1] Validate US1 via quickstart V1–V3: restart opencode, confirm config loads, confirm main assistant cannot run git/gh/github_* and delegates, confirm `github-helper` completes a commit+push

**Checkpoint**: At this point, User Story 1 (the MVP) should be fully functional and testable independently

---

## Phase 4: User Story 2 - Specialist Agent Profiles (Priority: P1)

**Goal**: Seven specialist subagents with documented role boundaries and out-of-scope redirection (spec FR-004–FR-011, contracts/agent-profiles.md)

**Independent Test**: Invoke each profile on a sample task; output matches the documented role, and out-of-role requests are declined with a recommendation (quickstart V4)

### Implementation for User Story 2

- [x] T009 [P] [US2] Create `.opencode/agents/nitpicker.md` (final-validation minor-fix list: organization, docs, tests, naming, dead code, consistency; no git/GitHub access)
- [x] T010 [P] [US2] Create `.opencode/agents/reviewer.md` (review vs conventions + quality gates; read-heavy; no git/GitHub access)
- [x] T011 [P] [US2] Create `.opencode/agents/architect.md` (design review: module boundaries, contracts, spec readiness, constitution conflicts; no git/GitHub access)
- [x] T012 [P] [US2] Create `.opencode/agents/implementer.md` (test-first red-green-refactor implementation; full read/write; no git/GitHub access)
- [x] T013 [P] [US2] Create `.opencode/agents/tester.md` (run `pnpm test`, coverage vs gates; no git/GitHub access)
- [x] T014 [P] [US2] Create `.opencode/agents/documenter.md` (README/setup/docs sync; docs-only writes; no git/GitHub access)
- [x] T015 [P] [US2] Create `.opencode/agents/version-analyser.md` (evaluate which modules need a version bump and the bump type per the changesets fixed-group convention; produce/verify a matching changeset; runs before every PR is opened; writes limited to `.changeset/`)
- [ ] T016 [US2] Validate US2 via quickstart V4: invoke each of the seven profiles on a sample task and on an out-of-role request; confirm the version-analyser produces/verifies a changeset for a sample change set

**Checkpoint**: At this point, User Stories 1 AND 2 should both work independently

---

## Phase 5: User Story 3 - Reusable Skills Library (Priority: P2)

**Goal**: Five discoverable, loadable skills covering recurring workflows (spec FR-011/FR-012, contracts/skills-catalog.md)

**Independent Test**: Trigger each skill on a matching task; the skill loads its guidance and drives the outcome (quickstart V5)

### Implementation for User Story 3

- [x] T017 [P] [US3] Create `.opencode/skills/commit-hygiene/SKILL.md` (name + description frontmatter; staging/commit-message procedure; hands the commit to `github-helper`)
- [x] T018 [P] [US3] Create `.opencode/skills/quality-gates/SKILL.md` (run `pnpm lint`/`pnpm format`/`pnpm typecheck`/`pnpm test`; interpret failures; verdict)
- [x] T019 [P] [US3] Create `.opencode/skills/test-first/SKILL.md` (red-green-refactor cycle, Vitest runner, user approval of tests before implementation)
- [x] T020 [P] [US3] Create `.opencode/skills/spec-driven-development/SKILL.md` (specify → plan → tasks loop, specs under `specs/`)
- [x] T021 [P] [US3] Create `.opencode/skills/changelog-release-notes/SKILL.md` (changesets fixed-group convention, release notes, `.changeset/config.json`; used by the version-analyser)
- [ ] T022 [US3] Validate US3 via quickstart V5: trigger each skill on a matching task

**Checkpoint**: All user stories should now be independently functional

---

## Phase 6: User Story 4 - AGENTS.md Documentation (Priority: P3)

**Goal**: Root and per-module AGENTS.md covering structure, commands, conventions, and agent/skill routing (spec FR-013–FR-015, data-model.md)

**Independent Test**: AGENTS.md files exist at root and in every module and are accurate against the repository (quickstart V6)

### Implementation for User Story 4

- [x] T023 [P] [US4] Create root `AGENTS.md` (repo structure, module one-liners, common commands, quality gates, constitution pointers, agent/skill routing incl. hard git delegation and the pre-PR version-analyser gate, new-module AGENTS.md convention)
- [x] T024 [P] [US4] Create `modules/bus-catcher/AGENTS.md` (module purpose, backend/frontend packages, run/dev/test commands, ports, docs pointers)
- [x] T025 [P] [US4] Create `modules/fly-over-tracker/AGENTS.md` (module purpose, backend/frontend packages, run/dev/test commands, ports, docs pointers)
- [x] T026 [P] [US4] Create `modules/procrastinator-tracker/AGENTS.md` (module purpose, backend/frontend packages, run/dev/test commands, ports, docs pointers)
- [x] T027 [US4] Validate US4 via quickstart V6: confirm all four AGENTS.md files exist and their content is accurate against the repository

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [x] T028 Run `pnpm lint` and `pnpm format` (run `pnpm format:write` first if needed) on all new/changed config and docs
- [x] T029 [P] Run `pnpm typecheck` and `pnpm test` to confirm the full repo gates remain green
- [ ] T030 Run quickstart V1–V8 end-to-end and record the results (a short verification note under `specs/002-agents-skills-profiles/`)
- [x] T031 Cross-check every agent/skill/AGENTS.md entry against `.specify/memory/constitution.md` (FR-017) and fix any contradiction
- [ ] T032 Commit and push the feature branch through `github-helper` only, as an end-to-end demonstration of US1 (the version-analyser must verify the changeset before the PR is opened)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3+)**: All depend on Foundational phase completion
  - US1 (P1) first, then US2 (P1), US3 (P2), US4 (P3) in priority order
- **Polish (Final Phase)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Depends on T001/T002 (mechanism confirmation) and T003 (agents dir). No dependencies on other stories
- **User Story 2 (P1)**: Depends on T003 (agents dir). Independent of US1's config edits (different files)
- **User Story 3 (P2)**: Depends on T004 (skills dir). Independent of US1/US2 files
- **User Story 4 (P3)**: Depends on research/README content. Independent of US1–US3 files

### Within Each User Story

- Config/permission changes before agent migrations (US1: T005/T006 → T007 → T008)
- Agent files before validation (US2)
- Skill files before validation (US3)
- AGENTS.md files before validation (US4)

### Parallel Opportunities

- T001/T002 can run in parallel (Phase 1)
- T003/T004 can run in parallel (Phase 2)
- T005/T006 can run in parallel (US1)
- T009–T015 can all run in parallel (US2 - one file each)
- T017–T021 can all run in parallel (US3 - one folder each)
- T023–T026 can all run in parallel (US4 - one file each)
- T028/T029 can run in parallel (Polish)
- Once Foundational completes, US2/US3/US4 can start in parallel; US1 is the MVP and should land first

---

## Parallel Example: User Story 2

```bash
# Launch all seven profile files together:
Task: "Create .opencode/agents/nitpicker.md"
Task: "Create .opencode/agents/reviewer.md"
Task: "Create .opencode/agents/architect.md"
Task: "Create .opencode/agents/implementer.md"
Task: "Create .opencode/agents/tester.md"
Task: "Create .opencode/agents/documenter.md"
Task: "Create .opencode/agents/version-analyser.md"
```

## Parallel Example: User Story 3

```bash
# Launch all five skill files together:
Task: "Create .opencode/skills/commit-hygiene/SKILL.md"
Task: "Create .opencode/skills/quality-gates/SKILL.md"
Task: "Create .opencode/skills/test-first/SKILL.md"
Task: "Create .opencode/skills/spec-driven-development/SKILL.md"
Task: "Create .opencode/skills/changelog-release-notes/SKILL.md"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001, T002)
2. Complete Phase 2: Foundational (T003, T004 — CRITICAL, blocks all stories)
3. Complete Phase 3: User Story 1 (T005–T008)
4. **STOP and VALIDATE**: quickstart V1–V3 (hard delegation proof)
5. Deploy/demo if ready

### Incremental Delivery

1. Setup + Foundational → Foundation ready
2. US1 (delegation, the primary complaint) → validate V1–V3 → MVP
3. US2 (profiles) → validate V4
4. US3 (skills) → validate V5
5. US4 (AGENTS.md) → validate V6
6. Polish → gates green → full V1–V7 validation → commit/push via `github-helper`

### Parallel Team Strategy

1. Team completes Setup + Foundational together
2. Once Foundational is done:
   - Developer A: User Story 1 (MVP — delegate-first)
   - Developer B: User Story 2
   - Developer C: User Story 3
   - Developer D: User Story 4
3. Stories complete and integrate independently

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- After every config change, restart opencode (config is not hot-reloaded)
- Verify the delegation proof (V2) before anything else after US1
- Commit after each task or logical group, always through `github-helper`
- Avoid: vague tasks, same file conflicts, cross-story dependencies that break independence