<!--
Sync Impact Report
==================
Version change: 0.0.0 (unfilled template) -> 1.0.0 (initial ratification)
Modified principles (placeholder -> title):
  - [PRINCIPLE_1_NAME] -> I. Module-First
  - [PRINCIPLE_2_NAME] -> II. Local-First & Private by Default
  - [PRINCIPLE_3_NAME] -> III. Configuration-Driven Consistency
  - [PRINCIPLE_4_NAME] -> IV. Test-First (NON-NEGOTIABLE)
  - [PRINCIPLE_5_NAME] -> V. Contract & Integration Testing
Added sections:
  - Core Principles (fully populated, 5 principles)
  - Technology & Packaging Standards
  - Development Workflow & Quality Gates
  - Governance (amendment + versioning + compliance rules)
Removed sections: none
Deferred TODOs: none
-->

# Home Sweet Home — Modules Constitution

## Core Principles

### I. Module-First
Every feature or capability ships as a standalone Home Sweet Home module in its own
repository. Modules MUST be self-contained, independently deployable, and documented
in their README and generated `setup.md`. No organizational-only modules.

### II. Local-First & Private by Default
Home Sweet Home solutions MUST operate on in-home infrastructure first and remain
functional offline. Household data MUST stay on-premises by default; external access,
cloud sync, and remote tooling are opt-in and MUST be explicitly documented per module.
Privacy and security are non-negotiable.

### III. Configuration-Driven Consistency
Every module's identity (name, slug, packages, stack, registries, theme) MUST be
declared in a single `module.config.yaml`. Generated files MUST be rendered from the
shared template and verified with `node scripts/scaffold.mjs --check`; the check MUST
pass in CI. No drift from the declared config.

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

## Development Workflow & Quality Gates

- New modules MUST be stamped from the module template via the `homesweethome` CLI or
  GitHub's "Use this template" flow; never hand-scaffolded.
- Merge gates: `scaffold.mjs --check` passes, shared ESLint/Prettier clean, typecheck
  passes, and the full test suite passes.
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
- Runtime development guidance follows each module's generated `setup.md` and the Spec
  Kit workflow.

**Version**: 1.0.0 | **Ratified**: 2026-09-26 | **Last Amended**: 2026-09-26