# Research: Merge Modules into Monorepo

**Feature**: Merge Modules into Monorepo | **Date**: 2026-09-26 | **Spec**: [spec.md](./spec.md)

Phase 0 output. Every "NEEDS CLARIFICATION" and design unknown from the plan's Technical
Context is resolved here. Each item records a Decision, its Rationale, and the
Alternatives considered.

## 1. Merging three repos with full history preserved

- **Decision**: Use `git filter-repo --to-subdirectory-filter <dir>` on a clone of each
  source repository to rewrite its history so all files live under the target module
  directory (e.g. `modules/procrastinator-tracker/`), then fetch that rewritten branch
  into this repo and merge with `--allow-unrelated-histories`. Preserve the source
  default branch (`main`) and any release tags.
- **Rationale**: FR-012 requires full history preserved under each module path.
  Rewriting into the subdirectory keeps the entire history reachable via
  `git log -- modules/<slug>`, `git blame`, and release tags, which is the explicit
  requirement now that the source repos will be deleted.
- **Alternatives considered**:
  - `git subtree add --prefix modules/<slug> <remote> main`: also preserves history
    under the prefix and needs no extra tooling, but embeds subtree maintenance
    metadata and rewrites commits; filter-repo gives a cleaner single-rooted history.
  - Squash to a single commit per module: rejected — violates FR-012.
  - Import the modules as git submodules: rejected — submodules break the single
    workspace/install/uniform-CI model this feature requires.

## 2. Independent releases with one version per module (changesets)

- **Decision**: Adopt `@changesets/cli`. Configure `.changeset/config.json` with one
  **fixed group** per module: `"fixed": [["@sousa99/<slug>-backend",
  "@sousa99/<slug>-components"]]`. A change to any package of a module bumps every
  package in that module's group to the same new version, and packages in different
  modules (and the tooling packages) are released independently.
- **Rationale**: FR-013 requires per-module releases (one version per module, all
  artifacts in sync) with independence between modules. Changesets fixed groups express
  exactly this: group = release unit, groups = independent. It replaces the current
  per-repo semantic-release setups with one monorepo-native mechanism.
- **Alternatives considered**:
  - semantic-release per module in one repo: rejected — multiple semantic-release
    instances in one repo are fragile (shared tags, lockfile churn, single version
    coupling) and it is the mechanism being replaced.
  - `release-it` or bespoke version script: rejected — changesets is the user-chosen
    mechanism (spec FR/Assumptions) and is the pnpm-workspace standard.
  - Per-package independent versions (no fixed groups): rejected — splits a module's
    backend/frontend versions, contradicting the per-module release model.

## 3. Version-reset and initial release to 0.0.1

- **Decision**: On migration, set every package's `version` to `0.0.1` and make the
  first release of each module/tool package start from `0.0.1`. Remove each module's
  existing `CHANGELOG.md` and `.releaserc.json`; changesets regenerates changelogs.
- **Rationale**: FR-006 mandates a 0.0.1 reset. Starting from `0.0.1` means the first
  released artifact of every package is `0.0.1`, matching the user's plan to delete the
  old published packages.
- **Alternatives considered**: Keep historical versions — rejected by explicit user
  decision.

## 4. Changesets release workflow (version PR + publish)

- **Decision**: Use the standard two-phase flow:
  1. Contributors run `pnpm changeset` to add a changeset; the `Release` PR is produced
     automatically by `@changesets/action` on `main` (creates/updates a `changeset-release`
     branch and PR that runs `changeset version`).
  2. On merge to `main`, the publish workflow runs `changeset publish` (npm), then a
     custom per-module publish step reads the new versions and pushes GHCR images and
     creates a GitHub release per released module.
- **Rationale**: This is the canonical changesets pattern for monorepos, keeps release
  content human-reviewable (the version PR), and gives one workflow shape for all
  modules (FR-004/FR-007).
- **Alternatives considered**: Automatic publish on push without a version PR — rejected;
  the version PR is the review point that keeps release decisions explicit and uniform.

## 5. Publishing npm packages to GitHub Packages from one repo

- **Decision**: Keep the `@sousa99` scope registry mapping in a single repo-level
  `.npmrc` (`@sousa99:registry=https://npm.pkg.github.com/`). Every published package
  sets `publishConfig.registry` + `publishConfig.access: public`. `changeset publish`
  uses the repo-level auth token (`GH_PACKAGES_TOKEN` / `GITHUB_TOKEN`) to publish all
  changed packages.
- **Rationale**: Uniformity (FR-009/FR-010): one auth config, one publish command for
  every package, matching the existing `@sousa99` scope on GitHub Packages.
- **Alternatives considered**: Per-package publish workflows — rejected (duplication,
  drift).

## 6. Publishing per-module container images (GHCR)

- **Decision**: Keep the existing per-module Dockerfiles (`Dockerfile.backend`,
  `Dockerfile.frontend`) inside each module directory. The release step, for each module
  whose packages were versioned by changesets, runs `docker buildx build --push` tagging
  `ghcr.io/sousa99/<slug>-backend:<version>`, `...-frontend:<version>`, plus `:latest`
  (as today's `scripts/publish-artifacts.sh` does). The version used is the module's
  single version from its fixed group.
- **Rationale**: FR-007 requires backend/frontend images per module; reusing the proven
  buildx pattern from the module template keeps image naming and build behavior uniform.
- **Alternatives considered**: Build one combined image per module — rejected; backend
  and frontend have different runtimes and deployment units (Node vs nginx).

## 7. Module identity without scaffolding

- **Decision**: No `module.config.yaml`, no `scripts/scaffold.mjs`, and no template-drift
  check. Module identity (name, slug, description, version) lives in each package's
  `package.json`; the directory name `modules/<slug>/` is the module anchor.
- **Rationale**: The user explicitly dropped module scaffolding and the CLI (FR-003,
  FR-015). Scaffolding was the reason `module.config.yaml` existed; without generation
  there is nothing to drift-check. Uniform quality gates plus code review prevent drift.
- **Alternatives considered**: Keep a per-module `module.config.yaml` for identity only —
  rejected; adds a redundant config file with no enforcement value; keep
  `scaffold.mjs --check` in CI — rejected by explicit user decision.

## 8. Uniform CI across all packages

- **Decision**: One `ci.yml` with a job matrix over the packages (the 3 modules' backend
  + frontend, plus the config package) running the shared gates, and an aggregate `✅ Check`
  job (needs all matrix jobs) as the required status check on `main`. `actionlint` and the
  PR-format check are retained.
- **Rationale**: FR-003/FR-004 — gates defined once, all packages validated on every PR,
  one merge-blocking check.
- **Alternatives considered**: Per-module workflows — rejected (drift); a single
  non-matrix job running everything serially — rejected (slow, loses per-package
  reporting).

## 9. Shared config presets in the workspace

- **Decision**: `@sousa99/homesweethome-config` becomes a workspace package under
  `packages/config/`, and every module references it with `workspace:*` in
  `devDependencies`. The CLI (`@sousa99/homesweethome`) is **not** carried over — it is
  dropped. The config package is added to the pnpm workspace and its version reset to
  0.0.1.
- **Rationale**: FR-009 — the shared config now lives in this repository; using
  `workspace:*` means CI installs once and every module resolves the same local presets,
  guaranteeing identical lint/format/typecheck behavior (uniformization). The CLI exists
  to scaffold new module repos, which no longer happens.
- **Alternatives considered**: Keep referencing the published config package — rejected;
  reintroduces registry dependency and version skew across modules; keep the CLI — rejected
  by explicit user decision (no more scaffolding).

## 10. Repository layout and future modules

- **Decision**: `modules/<slug>/` for application modules, `packages/` for the config
  presets, `docs/` for repo-level docs, `specs/` for this repo's Spec Kit features (the
  single, repo-root location for spec-driven development — modules carry no per-module
  `specs/` directories). Historical module specs are archived inside the merge feature at
  `specs/001-merge-modules/merge-history/<module-slug>/` so all spec artifacts live in
  one place and the root `specs/` namespace stays reserved for active features. New
  modules are added as new `modules/<slug>/` directories; the existing workspace globs
  (`modules/*/backend`, `modules/*/frontend`) already cover them with zero root config
  changes — only a fixed release group is added in `.changeset/config.json`.
- **Rationale**: The layout keeps modules self-contained (mirroring the module template
  minus scaffolding), and the globs make the workspace automatically extensible
  (Assumption: future modules). Spec-driven work lives at the repo root so features are
  tracked and planned in one place rather than scattered across modules.
- **Alternatives considered**: Everything under a flat `packages/` — rejected; would blur
  the module/tool distinction; a scaffolding CLI — rejected (in-repo addition is simpler);
  keeping per-module `specs/` directories — rejected by user decision (repo-root only).

## Open items for implementation

- Exact `git filter-repo` invocation and tag mapping to run at implementation time
  (tool availability); the pure-git fallback is `git subtree add`.
- At import, per-module `.specify` and `opencode.json` from the source repos are dropped
  from the working tree (they remain in the preserved git history). Historical module
  `specs/` directories are archived via `git mv` into
  `specs/001-merge-modules/merge-history/<module-slug>/` (preserving their original
  `NNN-name` structure) — archival only, excluded from feature numbering; note any
  deviation in the PR.