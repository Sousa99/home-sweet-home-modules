# Feature Specification: Agents & Skills Profiles

**Feature Branch**: `002-agents-skills-profiles`

**Created**: 2026-09-27

**Status**: Draft

**Input**: User description: "i want to improve the agents/skills on this repository. at the moment i have a github helper agent, but still some tasks are being done by the main agent, like pushing commits and such, i dont like this. similarly, i would like to have like profiles, like nitpicker which would be responsible for final validation and would suggest minor annoying fixes... the reviewer which would review the code. the architect. you know stuff like this. and maybe some nice skills... an AGENTS.md, for the root and for each module would also be nice. suggest more agents and stuff please."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Full Git & GitHub Delegation (Priority: P1)

As a maintainer working in this repository, I expect every git and GitHub operation — commits, pushes, branch creation, pull requests, issues, and CI/Actions inspection — to be performed exclusively by the dedicated GitHub agent. The main assistant must never perform these operations itself; when I ask for them, it delegates to the GitHub agent.

**Why this priority**: This is the user's primary complaint. A GitHub agent already exists but the main assistant still performs git operations such as pushing commits. Until delegation is fixed, the rest of the agent setup is undermined because responsibilities blur.

**Independent Test**: Request "commit and push this change" from the main assistant. The main assistant must hand the operation to the GitHub agent, which performs it. This can be fully verified in one session and delivers correct ownership of git/GitHub work.

**Acceptance Scenarios**:

1. **Given** the main assistant is active and git/GitHub capabilities are available, **When** the user asks it to commit, push, create a branch, open a PR, or touch an issue, **Then** the main assistant delegates to the GitHub agent instead of performing the operation itself.
2. **Given** the GitHub agent receives a delegated git/GitHub request, **When** it executes, **Then** the operation succeeds and the user is informed of the result.
3. **Given** a set of staged changes, **When** the GitHub agent commits them, **Then** the commit follows the repository's commit-message conventions.
4. **Given** the delegation rule, **When** a user explicitly insists the main assistant perform a git operation anyway, **Then** the main assistant still refuses and redirects to the GitHub agent (or the environment prevents it).

---

### User Story 2 - Specialist Agent Profiles (Priority: P1)

As a maintainer, I can call on dedicated specialist assistants — profiles — each with a clearly defined role. The catalog comprises seven profiles: a **nitpicker** for final validation that suggests minor, "annoying" fixes (organization, documentation, tests, naming, dead code, consistency); a **reviewer** that reviews changes against the project's conventions and quality gates; an **architect** that reviews architecture, module boundaries, and specifications before implementation starts; an **implementer** that writes code test-first; a **tester** that builds and runs the test suite against the quality gates; a **documenter** that keeps module docs in sync; and a **version-analyser** that, before every pull request is opened, evaluates which modules need a version bump, what the bump should be, and guarantees the changeset agrees with its observations. I never have to hand-hold one assistant through another role's job.

**Why this priority**: Specialist profiles are the core ask of this feature. Without them the main assistant remains a generalist doing everything.

**Independent Test**: Invoke each profile on a representative sample task and verify the output matches its documented role (e.g., nitpicker returns a list of minor fixes; architect returns a design review of a proposed module boundary). Each profile can be exercised independently.

**Acceptance Scenarios**:

1. **Given** a completed implementation, **When** I invoke the nitpicker, **Then** it produces a prioritized list of minor fixes covering organization, documentation, test coverage, naming, and dead code.
2. **Given** an open change set, **When** I invoke the reviewer, **Then** it produces a review verdict against the project's conventions and quality gates, with actionable comments.
3. **Given** a feature in the design phase, **When** I invoke the architect, **Then** it produces an architecture/design review covering module boundaries, contracts, and spec readiness.
4. **Given** the implementer, **When** I ask it to implement a planned task, **Then** it writes tests first, verifies they fail, then implements to make them pass.
5. **Given** the tester, **When** I ask it to verify a change, **Then** it runs the test suite and reports coverage against the quality gates.
6. **Given** the documenter, **When** module code changes, **Then** it identifies and updates the affected README, `setup.md`, and `docs/` entries.
7. **Given** a change set about to be opened as a pull request, **When** I invoke the version-analyser, **Then** it identifies which modules need a version bump, the bump type, and produces or verifies a changeset that agrees with its observations.
8. **Given** any profile, **When** I ask it for something outside its role, **Then** it says so and recommends the appropriate profile rather than doing the work.

---

### User Story 3 - Reusable Skills Library (Priority: P2)

As a maintainer, I can load focused, reusable skills for recurring workflows — commit hygiene, quality-gate verification, the test-first cycle, the spec-driven development loop, and changelog/release-notes generation. Skills are discoverable and loadable on demand so I (or the agents) get consistent step-by-step guidance instead of ad-hoc behavior.

**Why this priority**: Skills make agent behavior repeatable and consistent across sessions, compounding the value of the profiles.

**Independent Test**: Trigger a skill on a matching task and confirm it loads its guidance and drives the expected outcome. Each skill is independently usable.

**Acceptance Scenarios**:

1. **Given** a skill catalog entry, **When** a task matching its description arises, **Then** the skill is discoverable and loads its guidance on demand.
2. **Given** the commit-hygiene skill, **When** a commit is prepared, **Then** it enforces the repository's commit conventions.
3. **Given** a change to shared presets or module code, **When** the quality-gate skill runs, **Then** it verifies lint, format, typecheck, and test gates in the standard way.
4. **Given** a planned feature, **When** the spec-driven-development skill runs, **Then** it walks through the specify → plan → tasks loop.
5. **Given** a completed change set, **When** the changelog/release-notes skill runs, **Then** it produces a changeset/release note following repository conventions.

---

### User Story 4 - AGENTS.md Documentation (Priority: P3)

As a developer (human or AI) entering this repository or any of its modules, I find an AGENTS.md at the root and one in each module that explains the structure, conventions, commands, and which agent/skill to use for which kind of task — so onboarding and delegation are unambiguous.

**Why this priority**: Documentation consolidates everything else; it is valuable but only once agents, skills, and conventions exist to document.

**Independent Test**: Open the AGENTS.md files — one at root and one in each module — and confirm they cover structure, commands, conventions, and agent/skill guidance and match the actual repository.

**Acceptance Scenarios**:

1. **Given** the repository root, **When** a new contributor (human or AI) starts work, **Then** AGENTS.md explains the repo structure, commands, conventions, and the available agents/skills.
2. **Given** each module directory, **When** a contributor works inside it, **Then** a module-level AGENTS.md explains that module's specifics (run commands, ports, tests, docs).
3. **Given** an AGENTS.md, **When** it is compared against the repository, **Then** its content is accurate and current.

---

### Edge Cases

- The GitHub agent is invoked but lacks valid credentials/tokens — it must surface a clear error explaining the missing access rather than silently failing or falling back to the main assistant.
- A user repeatedly insists the main assistant perform a git operation — behavior must be consistent (delegate or refuse) every time.
- The GitHub agent is invoked mid-session with a dirty working tree or unexpected conflicts — it must report the state and propose a resolution path.
- Module directories vary in structure and documentation depth — AGENTS.md generation must work from what exists and not require every module to be identical.
- Agent role overlap (e.g., reviewer and nitpicker both touch code quality) — boundaries must be documented so work is not duplicated or conflicting.
- A proposed agent or skill is not actually needed — the catalog must be documented with its rationale so unused entries can be removed without disruption.
- A pull request is requested but the version-analyser has not run — the PR MUST NOT be opened until the version-analyser has evaluated the change set and verified (or produced) a matching changeset.
- A new module is added later — the AGENTS.md convention must describe how the module gets its own AGENTS.md (e.g., created following the module AGENTS.md template).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: All git and GitHub operations (commit, push, branch, PR, issue, CI/Actions inspection) MUST be performed by the dedicated GitHub agent, never by the main assistant. Delegation is hard-enforced: the main assistant MUST NOT have access to git/GitHub capabilities; only the GitHub agent has them.
- **FR-002**: The main assistant MUST delegate any git/GitHub request to the GitHub agent instead of performing it (enforced by the main assistant lacking git/GitHub capabilities).
- **FR-003**: The GitHub agent MUST support committing, pushing, creating and switching branches, opening and managing pull requests, managing issues, and inspecting CI/Actions runs.
- **FR-004**: A `nitpicker` profile MUST exist whose role is final validation and suggesting minor fixes: organization, documentation, test coverage, naming, dead code, and consistency.
- **FR-005**: A `reviewer` profile MUST exist whose role is reviewing changes against project conventions and quality gates before merge.
- **FR-006**: An `architect` profile MUST exist whose role is reviewing architecture, module boundaries, and specification readiness before implementation.
- **FR-007**: An `implementer` profile MUST exist whose role is test-first implementation of planned work (write tests, verify they fail, then implement).
- **FR-008**: A `tester` profile MUST exist whose role is building and running the test suite and verifying coverage against the quality gates.
- **FR-009**: A `documenter` profile MUST exist whose role is keeping module READMEs, `setup.md`, and `docs/` accurate and in sync with code.
- **FR-010**: A `version-analyser` profile MUST exist whose role is, before every pull request is opened, evaluating which modules need a version bump and what the bump is, and guaranteeing the changeset agrees with its observations.
- **FR-011**: Every profile MUST be invokable as a delegated sub-agent and MUST have a documented description, role boundary, and scope.
- **FR-012**: A set of reusable skills MUST exist covering: commit hygiene, quality-gate verification (lint, format, typecheck, test), the test-first cycle, the spec-driven development loop, and changelog/release-notes generation.
- **FR-013**: Each skill MUST be discoverable (has a name and description) and loadable on demand.
- **FR-014**: An AGENTS.md MUST exist at the repository root.
- **FR-015**: An AGENTS.md MUST exist in each module directory.
- **FR-016**: AGENTS.md files MUST document structure, commands, conventions, and guidance on which agent/skill to use for which task.
- **FR-017**: All agents, skills, and documentation MUST be consistent with the constitution (module-first, test-first, local-first/private, shared tooling presets).

### Key Entities *(include if feature involves data)*

- **Agent profile**: A named assistant role with a description, responsibility boundary, and permitted scope. Attributes: name, role, responsibilities, out-of-scope items, tool access.
- **Skill**: A named, discoverable procedure for a recurring workflow. Attributes: name, description, trigger conditions, step-by-step guidance.
- **AGENTS.md document**: Root-level or module-level guidance file. Attributes: scope (root or module), required sections (structure, commands, conventions, agent/skill guidance).
- **Delegation contract**: The rule governing which assistant performs which class of operation (git/GitHub operations → GitHub agent; others → profiles by role).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: In a working session, 100% of git/GitHub operations are performed by the GitHub agent (zero performed by the main assistant).
- **SC-002**: Every profile in scope is invokable and returns output matching its documented role.
- **SC-003**: Every skill in scope is discoverable and loadable on demand.
- **SC-004**: An AGENTS.md exists at the root and in every module; each covers all required sections and accurately reflects the repository.
- **SC-005**: No agent, skill, or AGENTS.md entry contradicts the constitution's principles or quality gates.
- **SC-006**: A user following the AGENTS.md guidance can complete a representative task (e.g., implement a small fix, run gates, and open a PR) without asking the main assistant to perform a git operation.
- **SC-007**: Before every pull request opened in a session, the version-analyser has evaluated which modules need a version bump and verified or produced a changeset that agrees with its observations (100% of PRs).

## Assumptions

- The tooling surface is opencode; agents are sub-agent profiles and skills are loadable guidance documents, configured through the standard project configuration.
- The in-scope agent catalog is fixed at seven profiles: nitpicker, reviewer, architect, implementer, tester, documenter, version-analyser.
- The in-scope skill set is fixed at five skills: commit hygiene, quality-gate verification, test-first cycle, spec-driven development loop, and changelog/release-notes generation.
- AGENTS.md content is derived from existing READMEs, `setup.md`, and `docs/` material to keep it accurate without new documentation efforts.
- Modules in scope for per-module AGENTS.md are the currently registered modules in `modules/`; future modules follow the same convention.
- No changes to the constitution are required; agents, skills, and docs must comply with it as-is.
- Git/GitHub capability removal applies to the main assistant only; all other profiles inherit standard read/write tooling as scoped per role.