# Quickstart: Merge Modules into Monorepo

**Feature**: Merge Modules into Monorepo | **Date**: 2026-09-26 | **Spec**: [spec.md](./spec.md)

Runnable validation scenarios proving the feature works end-to-end. References
[data-model.md](./data-model.md) and [contracts/](./contracts/) instead of duplicating
them.

## Prerequisites

- Node.js 24 LTS, pnpm 11, Git, Docker with Buildx, and network access to GitHub
  Packages + GHCR.
- The three source repositories are accessible (they still exist at validation time):
  `Sousa99/procrastinator-tracker`, `Sousa99/fly-over-tracker`, `Sousa99/bus-catcher`.
- This repository is checked out on branch `feature/001-merge-modules`.

## Scenario 1 — Fresh clone installs and runs every module (SC-001, FR-001/FR-002)

```bash
git clone <this-repo> hsh && cd hsh
pnpm install
pnpm --filter ./modules/procrastinator-tracker/backend test
pnpm --filter ./modules/procrastinator-tracker/frontend build
pnpm --filter ./modules/fly-over-tracker/backend test
pnpm --filter ./modules/fly-over-tracker/frontend build
pnpm --filter ./modules/bus-catcher/backend test
pnpm --filter ./modules/bus-catcher/frontend build
```

**Expected**: all six package installs/builds/tests succeed from a single `pnpm install`;
no command references the old repositories; the workspace lockfile covers all packages.

## Scenario 2 — Uniform gates run on every package (SC-002, FR-003/FR-004)

```bash
pnpm lint
pnpm format
pnpm typecheck
pnpm test
```

**Expected**: each gate passes and covers all modules. A deliberately broken module makes
the aggregate `✅ Check` fail on a PR. No scaffolding/scaffold-check step is part of the
gates (FR-015).

## Scenario 3 — History preserved under module paths (FR-012)

```bash
git log --oneline -- modules/procrastinator-tracker | wc -l   # > 0
git log --oneline -- modules/fly-over-tracker | wc -l          # > 0
git log --oneline -- modules/bus-catcher | wc -l               # > 0
git log --oneline -- packages/config | wc -l                   # > 0
```

**Expected**: non-zero commit counts per module/config path, matching the source
repositories' commit counts; `git blame` works within each module directory.

## Scenario 4 — Per-module independent release via changesets (SC-003/SC-004, FR-005/FR-006/FR-013)

```bash
pnpm changeset           # add a changeset for modules/fly-over-tracker only
pnpm changeset version   # apply version bump locally
```

**Expected**:

- Only `@sousa99/fly-over-tracker-backend` and `@sousa99/fly-over-tracker-components`
  are bumped — both to the SAME next version (fixed group), starting from `0.0.1` on the
  first release.
- `@sousa99/procrastinator-tracker-*`, `@sousa99/bus-catcher-*`, and the tooling package
  `@sousa99/homesweethome-config` keep their versions unchanged (G1).
- A `CHANGELOG.md` is generated for the released packages (FR-008).

Repeat with a changeset for the tooling package (`packages/config`) and confirm only that
package bumps.

## Scenario 5 — Full release publishes all artifacts of the released module (FR-007/FR-008)

Trigger the `Release` workflow by merging the `changeset-release` PR for a single module.

**Expected**:

- npm packages `@sousa99/<slug>-backend` and `@sousa99/<slug>-components` published to
  GitHub Packages at the module version.
- Images `ghcr.io/sousa99/<slug>-backend:<v>` (+ `:latest`) and
  `ghcr.io/sousa99/<slug>-frontend:<v>` (+ `:latest`) pushed (see
  [published-packages.md](./contracts/published-packages.md)).
- A GitHub release with the changelog for that module.
- No other module's artifacts changed.

## Scenario 6 — Old repos/packages removed only after verification (FR-011)

After Scenarios 1–5 pass for every module:

1. Confirm the uniform gates (Scenario 2) pass and the module index in `docs/` is current.
2. Delete the old published packages (GitHub Packages / GHCR) for the three modules.
3. Delete/archive the source repositories and the `home-sweet-home-tools` repository.

**Expected**: the monorepo remains fully functional after deletion — re-run
`pnpm install` and Scenario 2 gates to confirm no registry or repo dependency remains.

## Scenario 7 — New module added directly in-repo (FR-015)

```bash
mkdir -p modules/my-new-module/backend modules/my-new-module/frontend
pnpm install                     # workspace globs pick the new packages up
pnpm --filter ./modules/my-new-module/backend test
```

**Expected**: the new module is part of the workspace with zero root config changes; no
scaffolding CLI or template-stamping step is involved. Adding its fixed group in
`.changeset/config.json` (see [workspace-layout.md](./contracts/workspace-layout.md))
makes it releaseable independently like the others.

## Notes

- Implementation details (exact workflows, scripts, changesets config) belong in
  `tasks.md` and the implementation phase, not here.
- Scenario 4 uses `changeset version` locally; in the real workflow this happens on the
  `changeset-release` PR (see [release-model.md](./contracts/release-model.md)).