<!--
Sync Impact Report
==================
Version change: 1.0.0 -> 2.0.0 (MAJOR: principle redefinitions for the monorepo)
Modified principles (old title -> new title):
  - I. Module-First (redefined: monorepo under modules/<slug>/; "own repository"
    clause removed)
  - III. Configuration-Driven Consistency -> III. Declared Identity & Uniform Tooling
    (module.config.yaml/scaffold dropped; identity declared in package.json)
  - Development Workflow & Quality Gates (removed CLI-stamping gate; added
    in-repo module addition)
Added sections:
  - Repository Structure & Spec-Driven Development
  - Release clause in Technology & Packaging Standards (per-module independent
    releases via changesets fixed groups)
Removed:
  - "own repository" requirement (Principle I)
  - module.config.yaml + scaffold.mjs --check requirements (Principle III)
  - "stamp new modules via the homesweethome CLI / Use this template" gate
Deferred TODOs: none
-->

# Home Sweet Home — Modules Constitution

## Core Principles

### I. Module-First
Every feature or capability ships as a standalone Home Sweet Home module. Modules live
in this repository under `modules/<slug>/`; each MUST be self-contained, independently
deployable, and documented in its README and `setup.md`. No organizational-only modules.

### II. Local-First & Private by Default
Home Sweet Home solutions MUST operate on in-home infrastructure first and remain
functional offline. Household data MUST stay on-premises by default; external access,
cloud sync, and remote tooling are opt-in and MUST be explicitly documented per module.
Privacy and security are non-negotiable.

### III. Declared Identity & Uniform Tooling
Module identity (name, slug, packages, stack, registries) MUST be declared in each
package's `package.json`, and the directory name `modules/<slug>/` MUST match the package
name prefix (`@sousa99/<slug>-*`). No scaffolding machinery (`module.config.yaml`,
`scaffold.mjs`) is used. All modules MUST extend the shared presets from
`@sousa99/homesweethome-config` so lint, format, and typecheck behave identically across
the ecosystem. No drift between a module's declared identity and its directory/package
names.

### IV. Test-First (NON-NEGOTIABLE)
TDD is mandatory for backend and frontend: tests written, user approved, tests fail,
then implementation. The Red-Green-Refactor cycle is strictly enforced. Vitest is the
standard test runner.

### V. Contract & Integration Testing
Integration tests are required for: REST and MCP contract changes, module-to-module
communication, shared schemas, and the dashboard's API surface. Every exposed contract
change MUST be covered before merge.

## Technology & Packaging Standards

- Backend: Node 24, Hono, Drizzle ORM, SQLite.
- Frontend: Vite, React 19, Tailwind CSS v4.
- Tooling: pnpm 11, TypeScript, ESLint, Prettier, Vitest.
- Modules MUST extend the shared presets from `@sousa99/homesweethome-config` so lint,
  format, and typecheck behave identically across the ecosystem.
- Packages publish to GitHub Packages (`npm.pkg.github.com`) under the `@sousa99` scope;
  container images publish to `ghcr.io/sousa99`.
- Releases are independent per module: each module's packages form a changesets fixed
  group and version together; other modules and the tooling package are untouched. Every
  package starts at version 0.0.1.

## Repository Structure & Spec-Driven Development

- The pnpm workspace globs `modules/*/backend`, `modules/*/frontend`, and `packages/*`
  define membership. Adding a module means creating `modules/<slug>/` (its packages are
  picked up automatically) and registering its fixed release group in
  `.changeset/config.json`; no other root configuration is required.
- Spec-driven development happens at the repository root under `specs/`. Active features
  are `specs/NNN-name/`; modules carry no per-module spec directories.
- Historical module specs from the pre-monorepo modules are archived at
  `specs/001-merge-modules/merge-history/<module-slug>/` — archival only, never treated
  as active features and never included in feature numbering.

## Development Workflow & Quality Gates

- New modules MUST be added directly in this repository under `modules/<slug>/`; no
  scaffolding CLI or template-stamping flow is used.
- Merge gates: shared ESLint/Prettier clean, typecheck passes, and the full test suite
  passes.
- Every PR is code-reviewed; reviewers MUST verify compliance with this constitution.
- Feature work follows the Spec Kit workflow: specify, plan, then tasks — each feature
  is documented before implementation begins.

## Governance

- This constitution supersedes all other project practices; no practice may contradict it.
- Amendments require: documentation of the change, approval, and a migration plan when
  the change is material.
- Versioning is semantic. MAJOR for backward-incompatible principle removals or
  redefinitions; MINOR for new principles or materially expanded guidance; PATCH for
  clarifications, wording, and typo fixes.
- Compliance is reviewed on every PR and revisited on every amendment.
- Runtime development guidance follows each module's `setup.md` and the Spec Kit
  workflow.

**Version**: 2.0.0 | **Ratified**: 2026-09-26 | **Last Amended**: 2026-09-26