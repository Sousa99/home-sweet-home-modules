# Contract: Workspace Layout

**Feature**: Merge Modules into Monorepo | **Date**: 2026-09-26 | **Spec**: [spec.md](./spec.md)

This contract fixes the repository layout so tools, CI, release automation, and
documentation can rely on stable paths. Any change to these paths is a breaking change
for the ecosystem.

## Top-level layout

```text
modules/<slug>/        one directory per module (slug from package name prefix)
packages/config/       @sousa99/homesweethome-config (eslint/prettier/tsconfig presets)
.changeset/            changesets config + change files
.github/workflows/     ci.yml (uniform CI), release.yml (version + publish)
docs/                  repository-level documentation (overview, module index)
specs/                 this repository's Spec Kit feature directories
pnpm-workspace.yaml    workspace globs
package.json           root scripts: gates + changeset commands
.npmrc                 @sousa99 scope -> GitHub Packages registry
```

## Invariants

1. Every application module lives under `modules/<slug>/` and contains `backend/`,
   `frontend/` (when applicable), its Dockerfiles, and docs. No scaffolding files
   (`module.config.yaml`, `scripts/scaffold.mjs`) and no per-module `specs/` directory
   exist in a module.
2. Every workspace package must be matched by exactly one glob in `pnpm-workspace.yaml`:
   `modules/*/backend`, `modules/*/frontend`, or `packages/*`.
3. Module identity is declared in each package's `package.json`; the directory name
   `modules/<slug>/` MUST match the package name prefix (`@sousa99/<slug>-*`).
4. No module directory may contain its own `.releaserc.json` or per-repo GitHub
   workflows after migration; CI/CD is uniform at the root (FR-004).
5. Root `package.json` MUST expose the uniform gates: `lint`, `format`, `format:write`,
   `typecheck`, `test`, plus `changeset`/`release` helpers.
6. Spec-driven development happens ONLY under the repo-root `specs/` directory. Modules
   carry no per-module Spec Kit directories; feature specs, plans, contracts, and tasks
   for all modules live in the repo-root `specs/`. Historical module specs are archived
   inside the merge feature at `specs/001-merge-modules/merge-history/<module-slug>/`
   (keeping their original `NNN-name` structure) — archival only, never treated as active
   features and never included in feature numbering.

## Adding a future module

1. Create `modules/<new-slug>/` with its `backend/` and/or `frontend/` packages.
2. The root workspace globs (`modules/*/backend`, `modules/*/frontend`) pick the new
   packages up automatically — no workspace change needed.
3. Add a fixed release group for the new module in `.changeset/config.json`.
4. Update `docs/` module index.

No scaffolding CLI or template-stamping step is involved (FR-015); no other root
configuration changes are required (SC-005 / future-module assumption).