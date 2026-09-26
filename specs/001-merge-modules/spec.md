# Feature Specification: Merge Modules into Monorepo

**Feature Branch**: `feature/001-merge-modules`

**Created**: 2026-09-26

**Status**: Draft

**Input**: User description: "the first feature i want to develop is the merging of the modules, which existed across various repos, into this single repo. please open a feature branch for this functionality. the repositories to merge are: https://github.com/Sousa99/procrastinator-tracker, https://github.com/Sousa99/fly-over-tracker, and https://github.com/Sousa99/bus-catcher. Note that by merging i dont mean just having them all here. Until now there was a set of common tools defined for the modules, now they can exist on thsi repository. I want publishing, ci, cd, documentation ... all to be uniformized. However I still want their releases to be independent. This should be posisble, and my idea is to rely on changesets. if you have any other questions on how they would be merged, do let me know. Btw we can reset the packages and start from 0.0.1 for all of them, my plan is to delete the packages and repositories from github."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Consolidate all modules into a single repository (Priority: P1)

The maintainer moves the three existing Home Sweet Home modules (Procrastinator Tracker, fly-over-tracker, bus-catcher) from their separate repositories into this single repository. All module source, config, and documentation now live in one place, sharing a single workspace; all spec-driven development happens at the repository root. The maintainer can clone one repo, run one setup, and work on every module without switching repositories.

**Why this priority**: This is the foundation of the entire feature — nothing else (uniform tooling, releases, docs) is possible until the modules physically live together. Without it, there is no feature.

**Independent Test**: Clone the repository on a clean machine, run the single documented setup command, and confirm all three modules are present, install cleanly, and run their basic workflows (backend starts, frontend builds). No step may reference the old repositories.

**Acceptance Scenarios**:

1. **Given** a fresh clone of this repository, **When** the single setup command is run, **Then** the workspace installs without errors and all three modules are present and runnable.
2. **Given** a module imported from an old repository, **When** its code is inspected in this repo, **Then** no source file references the old repository location and all paths resolve within this repo.

---

### User Story 2 - Uniformize quality gates, CI and CD across all modules (Priority: P1)

The maintainer wants every module to be held to the same standard: one shared set of quality gates (lint, format, typecheck, tests), one CI pipeline that validates every module on every pull request, and one release pipeline shape. This is what makes the merge meaningful — "not just having them all here".

**Why this priority**: Uniformization is the explicit core ask ("publishing, ci, cd, documentation ... all to be uniformized"). Until every module passes the same gates through the same pipeline, the merged repo is still three projects stacked together.

**Independent Test**: Open a pull request that modifies any module and confirm all gates run against all modules, and that a single aggregate check gate must pass before merge. The same shared config presets are used by every module.

**Acceptance Scenarios**:

1. **Given** a pull request touching only one module, **When** CI runs, **Then** all three modules are still linted, formatted, typechecked, and tested, and the single aggregate check passes.
2. **Given** a module with a deliberately failing test, **When** CI runs, **Then** the aggregate check fails and the PR cannot merge.
3. **Given** any module, **When** the quality gates are inspected, **Then** they are the same commands and presets as every other module.

---

### User Story 3 - Release each module independently (Priority: P2)

The maintainer wants each module to keep its own release cycle even though they share one repository. A change to one module bumps only that module's version, changelog, and published artifacts; the other modules are untouched. All modules start fresh at version 0.0.1.

**Why this priority**: Independent releases were an explicit requirement and the reason to adopt changesets. It is a strong part of the ask, but it can only be demonstrated after consolidation and uniform CI exist, so it sits below P1.

**Independent Test**: Add a change restricted to one module, create the corresponding change entry, and run the release flow. Confirm only that module's version increments and publishes; the other modules' versions remain unchanged.

**Acceptance Scenarios**:

1. **Given** a change entry that references only module A, **When** the release flow runs, **Then** only module A's version, changelog, and artifacts are published and the other modules are untouched.
2. **Given** the first release of any module after migration, **When** it is published, **Then** its version starts at 0.0.1.
3. **Given** two release cycles for different modules, **When** both complete, **Then** each module has its own independent version number and release record.

---

### User Story 4 - Uniform documentation and onboarding (Priority: P3)

The maintainer wants one coherent documentation story: a repo-level overview explaining what Home Sweet Home is, per-module documentation that follows the same structure, and consistent setup guides. Any contributor can learn the pattern once and apply it to any module.

**Why this priority**: Documentation adds polish and reduces maintenance friction, but consolidation and uniform gates/releases deliver the functional value first.

**Independent Test**: Read the repository-level README and one module's README/setup guide and verify the same documentation structure and conventions are used across all modules.

**Acceptance Scenarios**:

1. **Given** the repository README, **When** a new contributor reads it, **Then** it lists all modules and explains how each is structured and run.
2. **Given** any two module documentation sets, **When** they are compared, **Then** they follow the same structure, headings, and conventions.

---

### Edge Cases

- What happens if a module has uncommitted local changes or unpublished work at merge time?
- How does the system handle module code that references packages or paths from its old repository layout?
- What happens if one module's tests depend on network services that are unavailable during CI?
- How are version collisions handled if two modules publish to the same package registry namespace at the same time?
- What happens to the old repositories and published packages if a step in the migration fails partway through?
- How is a future module added to the workspace without disturbing the existing ones?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The repository MUST contain all three modules (Procrastinator Tracker, fly-over-tracker, bus-catcher) including their backend and frontend source, in a single shared workspace.
- **FR-002**: A single documented setup command MUST install the entire workspace so all modules build and run.
- **FR-003**: Quality gates (lint, format, typecheck, tests) MUST be defined once and MUST run against every module.
- **FR-004**: CI MUST validate all modules on every pull request and expose a single aggregate check required for merge.
- **FR-005**: Each module MUST be releaseable independently: releasing one module MUST NOT change the version, changelog, or published artifacts of any other module.
- **FR-006**: All modules MUST reset their versions to 0.0.1 at migration.
- **FR-007**: The release flow MUST publish each module's artifacts (backend container image, frontend container image, components package) to the established registries.
- **FR-008**: Each release MUST produce a per-module changelog entry and GitHub release.
- **FR-009**: The shared config presets (lint, format, typecheck tooling) MUST live in this repository and be usable by every module. A module-scaffolding CLI MUST NOT be carried over.
- **FR-010**: Documentation MUST be uniform: a repository-level overview plus per-module docs following a shared structure.
- **FR-011**: Old repositories and previously published packages MUST be removed only after the migrated repository is verified to work.
- **FR-012**: The merged repository MUST preserve the full git history of each source repository, imported under its module path.
- **FR-013**: Release independence MUST be per-module: one version per module, with all of that module's artifacts bumped and published together; other modules' versions MUST remain unchanged.
- **FR-014**: The shared config presets from home-sweet-home-tools MUST be moved into this repository as part of this feature (the CLI is dropped), and the tools repository MUST be deleted afterwards.
- **FR-015**: New modules MUST be addable directly within this repository (a new module directory picked up by the workspace) without any scaffolding CLI or template-stamping flow.

### Key Entities *(include if feature involves data)*

- **Module**: A self-contained Home Sweet Home capability (e.g., Procrastinator Tracker, fly-over-tracker, bus-catcher) with its own backend, frontend, docs, and release cycle. Key attributes: slug, description, packages, version.
- **Package**: A publishable unit within a module (backend package, frontend/components package). Owns its version and published artifacts.
- **Release**: An independent publication event for one module, composed of a version bump, changelog entry, container images, and npm package.
- **Change entry**: A recorded description of a change destined for a module's release (the unit used to decide which modules get released).
- **Common tooling**: The shared config presets (lint, format, typecheck) used across all modules; moving from the tools repository into this repository. No scaffolding CLI is retained.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A fresh clone can be set up and all three modules verified runnable using only commands documented in the repository README, within 15 minutes on a clean machine.
- **SC-002**: 100% of modules run the same defined quality gates through the same CI pipeline, with a single merge-blocking check.
- **SC-003**: Releasing any single module changes the version of exactly that module and no other — verified across two consecutive independent releases.
- **SC-004**: The first release of every module after migration is published at 0.0.1.
- **SC-005**: 100% of modules follow the same documentation structure and the same gate definitions, verified by doc review and the uniform CI pipeline.

## Assumptions

- The three source repositories are publicly accessible and contain the final state to be migrated.
- Shared config presets from home-sweet-home-tools move into this repository as part of this feature; the scaffolding CLI is not carried over and the tools repository is deleted afterwards.
- New modules are added directly inside this repository (create a module directory; the workspace picks it up) — no scaffolding CLI or template-stamping flow is used.
- Spec-driven development happens at the repository root (`specs/`); modules carry no per-module spec directories. Historical per-module specs from the source repos are archived inside this feature directory under `specs/001-merge-modules/merge-history/<module-slug>/` — archival only, never treated as active features and never included in feature numbering.
- The repository layout must accommodate future modules beyond the initial three.
- The npm scope (`@sousa99`) and registries (GitHub Packages for npm, GHCR for container images) remain unchanged.
- The technology baseline (Node 24, pnpm 11, TypeScript, and existing test/build tooling) is retained.
- Old repositories and published packages are deleted only after the migrated monorepo is verified working.
- Release independence is achieved through a changeset-based workflow, as proposed by the user, defined per-module (all of a module's artifacts share one version).
- Full git history of all three source repositories is preserved in the merged monorepo.
- The home-sweet-home-tools repository is deleted after its content is migrated here.