# Contract: Release Model

**Feature**: Merge Modules into Monorepo | **Date**: 2026-09-26 | **Spec**: [spec.md](./spec.md)

Defines how a change becomes a release in the monorepo, including the trigger, the
versioning rule, the artifacts produced, and the guarantees each release must honor.
This is the contract that replaces the previous per-repo semantic-release behavior.

## Release units

- **Module release**: one module's fixed group — `@sousa99/<slug>-backend` +
  `@sousa99/<slug>-components` — versioned together (FR-013).
- **Tooling release**: `@sousa99/homesweethome-config`, versioned independently of
  modules. (The former scaffolding CLI `@sousa99/homesweethome` is dropped and not
  released from this repo.)

## Trigger & flow

1. A contributor records a change with `pnpm changeset` (creates a changeset file in
   `.changeset/`), committing it with the feature.
2. On push to `main`, `@changesets/action` opens/updates a `changeset-release` PR that
   applies `changeset version` — bumping the versions and updating changelogs of only the
   affected release units.
3. Merging that PR to `main` triggers the `Release` workflow, which:
   - runs the uniform quality gates;
   - runs `changeset publish` for npm packages (GitHub Packages);
   - for each module that was versioned, builds and pushes its GHCR images at the
     module's new version and creates a GitHub release with the changelog (FR-008).

## Guarantees

| # | Guarantee | Source |
|---|-----------|--------|
| G1 | Releasing module A MUST NOT change the version, changelog, or artifacts of any other module or tooling package | FR-005 |
| G2 | All packages of a released module are published at the same version | FR-013 |
| G3 | The first release of every package is `0.0.1` | FR-006 |
| G4 | Every release produces a changelog entry and a GitHub release | FR-008 |
| G5 | No release occurs when `main` has no changesets | FR-005 |

## Fixed groups (`/contracts/../.changeset/config.json`)

```json
{
  "fixed": [
    ["@sousa99/procrastinator-tracker-backend", "@sousa99/procrastinator-tracker-components"],
    ["@sousa99/fly-over-tracker-backend", "@sousa99/fly-over-tracker-components"],
    ["@sousa99/bus-catcher-backend", "@sousa99/bus-catcher-components"]
  ]
}
```

Tooling packages have no fixed group, so they release independently. Adding a module
means adding one group entry (see [workspace-layout.md](./workspace-layout.md)).

## Image tagging

For a released module at version `X.Y.Z`:

- `ghcr.io/sousa99/<slug>-backend:X.Y.Z` and `ghcr.io/sousa99/<slug>-backend:latest`
- `ghcr.io/sousa99/<slug>-frontend:X.Y.Z` and `ghcr.io/sousa99/<slug>-frontend:latest`

## Concurrency

The `Release` workflow uses a `concurrency` group keyed on the release ref with
`cancel-in-progress: false` so two version-PR merges cannot interleave image pushes.