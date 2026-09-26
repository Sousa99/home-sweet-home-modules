# Feature Specification: Module Docs Templatization

**Feature Branch**: `005-module-docs-templatization`

**Created**: 2026-09-20

**Status**: Draft

**Input**: User description: "this repository is only one fo the modules of what I intend to be a full fledged product called 'Home Sweet Home'. I want to change the documentation to be modularized, meaning that it defined the module as part of Home Sweet Home. Meaning you know a frontmatter or something, some badges on README, the name of packagees, links etc, all in a way that can be changed for other modules in a single template you know. If you see anything else that needs to be 'templatized' let me know."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Scaffold a new Home Sweet Home module from the template (Priority: P1)

As a developer starting a new Home Sweet Home module, I clone the shared template
repository, fill in a single configuration file with my module's identity, and run one
command to generate the complete documentation and packaging for my module repository.

**Why this priority**: Without the ability to generate a module from the template, none of
the consistency goals are achievable. Everything else (badges, frontmatter, tooling,
pipelines) exists to make every module repo look and behave the same, and that starts here.

**Independent Test**: Can be fully tested by taking a blank copy of the template repo,
editing only the config file, running the scaffold command, and confirming that every
generated file is filled with the new module's values with no leftover placeholders.
Delivers the primary value: a consistent module repo in minutes.

**Acceptance Scenarios**:

1. **Given** the template repository and a valid module config, **When** I run the scaffold
   command, **Then** all documentation, packaging, and CI files are generated with my
   module's values substituted.
2. **Given** a generated module repo, **When** I search for template placeholder tokens,
   **Then** no unresolved tokens remain.
3. **Given** an existing generated module repo, **When** I change the config and re-run the
   scaffold command in check mode, **Then** it reports whether the repo is in sync and does
   not modify any files.
4. **Given** a generated module repo, **When** I inspect the README and packaging files,
   **Then** they identify the module as part of Home Sweet Home.

---

### User Story 2 - Identify a module as part of Home Sweet Home (Priority: P1)

As a maintainer or visitor, when I open any Home Sweet Home module repository, I can
immediately tell it is part of the Home Sweet Home product: the README carries a badge row
declaring "Part of Home Sweet Home", YAML frontmatter defines the module metadata, and the
package names follow the shared naming convention.

**Why this priority**: Product identity is the core of the request — the user explicitly
wants documentation that defines the module as part of Home Sweet Home. This is the visible
outcome that all other work supports.

**Independent Test**: Can be fully tested by viewing any generated module repo and
confirming the badge block, frontmatter, and package names are present and consistent with
the shared conventions. Delivers the identity value on its own.

**Acceptance Scenarios**:

1. **Given** any generated module repo, **When** I view the README, **Then** I see a
   "Part of Home Sweet Home" badge row linking to the product hub (placeholder link until an
   org exists).
2. **Given** any generated module repo, **When** I read the README frontmatter, **Then** it
   lists the module name, slug, repo, scope, and umbrella identity.
3. **Given** any generated module repo, **When** I inspect package names, **Then** they
   follow the shared convention (`backend` dual-mode, `frontend` with SPA + Storybook +
   components).

---

### User Story 3 - Enforce documentation/packaging consistency (Priority: P2)

As a developer contributing to a module repo, I can run a single check command in CI (and
locally) that verifies the generated files are in sync with the module config, so
inconsistencies are caught before merge.

**Why this priority**: Consistency is only durable if it is enforced automatically. This
story turns the template into a living contract rather than a one-time scaffold.

**Independent Test**: Can be fully tested by deliberately editing a generated file out of
sync with the config and confirming the check command fails, then restoring it and
confirming it passes. Delivers the enforcement value on its own.

**Acceptance Scenarios**:

1. **Given** a generated module repo, **When** I run the scaffold command with the check
   flag, **Then** it exits successfully if all generated files match the config.
2. **Given** a generated module repo whose README has been manually edited out of sync,
   **When** I run the check command, **Then** it exits with a failure identifying the
   offending file.
3. **Given** the check command available in CI, **When** a PR introduces drift, **Then** the
   PR fails its checks.

---

### User Story 4 - Create a module with shared tooling and CLI (Priority: P2)

As a developer, I can install a shared `@sousa99/homesweethome-config` package providing identical
lint, format, and TypeScript presets across modules, and use a `homesweethome` CLI to
bootstrap new modules from the template.

**Why this priority**: Guaranteeing identical tooling across modules eliminates the
largest source of cross-module inconsistency and speeds up setup. This builds directly on
the template and identity stories.

**Independent Test**: Can be fully tested by installing the config package in two scratch
projects and confirming the presets resolve identically, and by running the CLI to scaffold
a module. Delivers consistency and speed independently.

**Acceptance Scenarios**:

1. **Given** a module repo, **When** I install `@sousa99/homesweethome-config`, **Then** the lint,
   format, and typecheck presets load without local override.
2. **Given** the `homesweethome` CLI and the template repo, **When** I run
   `homesweethome create <module>`, **Then** it produces a scaffolded module repo with all
   files generated.
3. **Given** a scaffolded repo, **When** I open its setup documentation, **Then** it
   documents prerequisites, quality gates, pipelines, and good practices.

---

### Edge Cases

- What happens when the config file is missing a required field (e.g. no module slug)?
- How does the scaffold command behave when the target directory already contains files?
- How does the check command handle files that were intentionally removed from the module
  (e.g. a module that does not ship a frontend)?
- What happens when a generated file has been hand-edited intentionally (local customization
  that must be preserved)?
- How are placeholders inside code blocks (e.g. `{{MCP_SERVER_NAME}}` in JSON examples)
  handled so they are not confused with template tokens?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST provide a single module configuration file (e.g. `module.config.yaml`)
  that is the sole source of truth for a module's identity: name, slug, npm scope, repo
  owner/name, GHCR org, package organization, technology baseline, and umbrella link.
- **FR-002**: System MUST provide a scaffold command that renders all documentation and
  packaging files from the config, substituting values for placeholder tokens.
- **FR-003**: System MUST generate a README that includes a "Part of Home Sweet Home" badge
  block and YAML frontmatter declaring the module metadata.
- **FR-004**: System MUST generate packaging files (root/backend/frontend `package.json`,
  `.npmrc`, publish script) using the shared naming convention: backend and frontend are both
  optional (at least one required), the backend is a single dual-mode `backend` package, and
  the frontend is a single `frontend` package covering SPA, Storybook, and published
  components.
- **FR-005**: System MUST document the module setup, quality gates, pipeline conventions,
  package organization, and good practices in a `setup.md` generated by the template.
- **FR-006**: System MUST provide a check mode for the scaffold command that verifies
  generated files are in sync with the config without modifying them.
- **FR-007**: System MUST ship the template repo as a GitHub template repository so new
  modules can be created via "Use this template".
- **FR-008**: System MUST provide a `homesweethome` CLI with a `create <module>` command that
  bootstraps a new module from the template.
- **FR-009**: System MUST provide a shared `@sousa99/homesweethome-config` package with consistent
  lint, format, and TypeScript presets for use across modules.
- **FR-010**: System MUST apply the generated layout to the procrastinator-tracker
  repository as the reference implementation of a Home Sweet Home module.
- **FR-011**: System MUST leave the backend as a single dual-mode package (HTTP and MCP) and
  document this as the standard package organization; the spec MUST NOT imply a backend split.
  The frontend is a single package covering SPA, Storybook, and published components.
- **FR-012**: System MUST keep runtime defaults (MCP server name, DB filename, SPA title,
  opencode.json key) hand-written per module — only documentation and packaging are
  config-driven.
- **FR-013**: System MUST create the template and tools repositories under the user's GitHub
  account as `home-sweet-home-module-template` and `home-sweet-home-tools` (owner confirmed
  as `sousa99` pending repo creation).

### Key Entities *(include if feature involves data)*

- **Module Config**: The single source of truth describing one module's identity and
  organization; drives all generated output.
- **Template File**: A documentation/packaging file containing placeholder tokens, rendered
  from the module config.
- **Generated Module File**: The rendered output living in a module repository, kept in sync
  with the config by the check command.
- **Config Package**: The shared `@sousa99/homesweethome-config` preset package used across modules.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A new module repository can be scaffolded from the template with a single
  command in under 5 minutes, requiring edits only to the config file.
- **SC-002**: 100% of template placeholder tokens are substituted in generated output — a
  scan finds no unresolved tokens in any generated module repo.
- **SC-003**: The check command catches 100% of tested drift cases (manually edited
  generated files) with a clear failure.
- **SC-004**: Every generated module README displays the "Part of Home Sweet Home" badge
  block and YAML frontmatter — verifiable by inspection of at least the reference module.
- **SC-005**: Package names in every generated module follow the shared convention (dual-mode
  `backend`; `frontend` covering SPA + Storybook + components) — no deviations found in the
  reference module.
- **SC-006**: The `@sousa99/homesweethome-config` presets install and resolve identically in at
  least two independent projects.
- **SC-007**: `setup.md` exists in the reference module and documents prerequisites,
  quality gates, pipelines, package organization, and good practices.

## Assumptions

- Each Home Sweet Home module lives in its own repository; modules never coexist in one
  repository, so the template is a separate template repository instantiated per module.
- The backend is always a single dual-mode package exposing HTTP and MCP executions; no
  backend split is planned.
- The umbrella "Home Sweet Home" identity uses a placeholder link until a GitHub org or hub
  exists.
- Runtime defaults (MCP server name, DB filename, SPA title, opencode.json key) remain
  hand-written per module unless otherwise confirmed.
- Historical spec documents (`specs/00x/`) in the reference repository are records and are
  not retroactively templatized.
- The reference module is `procrastinator-tracker`; it will be migrated in place as the
  reference implementation.
- GitHub operations (repo creation, PRs) are delegated to the `github-helper` subagent and
  are never finalized/merged by the agent.
- Work on new repositories is done in the pre-approved temporary directory outside the
  workspace, sequenced phase-by-phase with pauses for user review.