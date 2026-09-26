# Data Model: Merge Modules into Monorepo

**Feature**: Merge Modules into Monorepo | **Date**: 2026-09-26 | **Spec**: [spec.md](./spec.md)

This document models the *build-system* entities introduced by the feature (the module
monorepo and its release machinery). It does not describe the runtime data of any module
(each module's own data model stays in its own `backend/`).

## Entities

### Module

The self-contained Home Sweet Home capability unit (Procrastinator Tracker,
fly-over-tracker, bus-catcher, …).

| Field | Description |
|-------|-------------|
| slug | Stable identifier and directory name, e.g. `procrastinator-tracker` |
| description | One-line capability summary (from the module packages' `package.json`) |
| packages | The set of workspace packages belonging to the module (`<slug>-backend`, `<slug>-components`) |
| releaseGroup | The changesets fixed group; all packages in it share one version |
| version | Single release version shared by all packages in the module |

**Validation rules (from requirements)**

- A module MUST be anchored at `modules/<slug>/` where `<slug>` matches the module's
  package name prefix (`@sousa99/<slug>-*`) (FR-001, FR-015).
- A module MUST NOT contain per-repo release config (`.releaserc.json`) or per-repo
  workflows after migration (uniformity, FR-004).
- A module MUST NOT depend on scaffolding machinery (`module.config.yaml`,
  `scaffold.mjs`) — identity is declared in `package.json` (FR-015).

**State transitions**: A module moves through
`imported → adapted → released (0.0.1) → releasing (n) → released (n)`; the source
repository and prior published packages are deleted only after the module is verified in
the monorepo (FR-011).

### Package

A publishable workspace package. Two kinds exist:

| Kind | Examples | Artifacts |
|------|----------|-----------|
| Module package | `@sousa99/<slug>-backend`, `@sousa99/<slug>-components` | npm package + GHCR image(s) |
| Tooling package | `@sousa99/homesweethome-config` | npm package |

**Fields**: name (`@sousa99/<pkg>`), version (starts 0.0.1, FR-006), publishConfig
(registry = GitHub Packages, access = public), path in workspace
(`modules/<slug>/{backend,frontend}` or `packages/config`).

**Validation rules**

- Every package version MUST start at `0.0.1` after migration (FR-006).
- Module packages MUST reference the local config presets via `workspace:*` (uniformity,
  FR-009).
- A package MUST NOT be published to a registry other than GitHub Packages (Technology &
  Packaging Standards).

**State transitions**: `version-reset → draft (changeset pending) → versioned → published`.

### ChangeEntry (changeset)

The recorded description of a change destined for a module's release — the unit that
decides which release groups get released.

**Fields**: summary; affected packages; bump type (major/minor/patch). Stored as a
changeset file in `.changeset/`.

**Validation rules**

- A changeset MUST reference at least one workspace package (else no release occurs).
- Because fixed groups are per module, a changeset touching any package of a module
  triggers the whole module's release (FR-005).
- Merge to `main` with no changesets MUST NOT produce a release.

**State transitions**: `draft (feature branch) → merged to changeset-release branch →
consumed by version bump → cleared`.

### Release

An independent publication event for exactly one module (or one tooling package).

**Fields**: module slug; version (from its fixed group); changelog entry; GitHub release;
published artifacts (npm package, GHCR images).

**Validation rules**

- A release MUST change the version of exactly one module and no other (FR-005, SC-003).
- A release MUST publish the module's npm package and its GHCR images at the same version
  (FR-007).
- A release MUST produce a changelog entry and GitHub release (FR-008).

**State transitions**: `created (changesets version) → published → recorded`.

### PublishedArtifact

The externally visible output of a release.

| Artifact | Registry | Naming |
|----------|----------|--------|
| npm package | GitHub Packages (`npm.pkg.github.com`, `@sousa99`) | `@sousa99/<module>-components`, `@sousa99/homesweethome-config` (module backends are private, image-only) |
| Backend image | GHCR | `ghcr.io/sousa99/<slug>-backend:<v>` (+ `:latest`) |
| Frontend image | GHCR | `ghcr.io/sousa99/<slug>-frontend:<v>` (+ `:latest`) |
| GitHub release | GitHub | per released module |

**Validation rules**

- Artifact naming MUST follow the registry mapping in [contracts/published-packages.md](./contracts/published-packages.md).
- Old published artifacts are removed from the registries only after the monorepo is
  verified (FR-011).

## Relationships

```text
Module 1 ── has many ──▶ Package (backend, components)
Module 1 ── owns one ──▶ ChangeEntry (set)
ChangeEntry ── triggers ──▶ Release (per module fixed group)
Release 1 ── produces many ──▶ PublishedArtifact
ReleaseGroup (changesets fixed group) = the packages of one module, versioned together
```

## Configuration shape (declared state)

The `.changeset/config.json` encodes the release model:

- `fixed`: one entry per module listing that module's packages (e.g.
  `["@sousa99/procrastinator-tracker-backend", "@sousa99/procrastinator-tracker-components"]`).
- `access`: `public`.
- `baseBranch`: `main`.
- `changelog`: generated (per-package `CHANGELOG.md`).

The `pnpm-workspace.yaml` encodes membership:
`packages: [modules/*/backend, modules/*/frontend, packages/*]`.

Validation: any package added outside these globs is not part of the workspace; any
module added as a new `modules/<slug>/` directory is automatically included.