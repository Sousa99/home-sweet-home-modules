# Contract: Published Packages & Registries

**Feature**: Merge Modules into Monorepo | **Date**: 2026-09-26 | **Spec**: [spec.md](./spec.md)

Defines the externally visible package/artifact surface and its registry mapping.
Consumers (npm users, container runtimes) depend on these names; they are stable
contracts.

## npm packages (GitHub Packages, `npm.pkg.github.com`, scope `@sousa99`)

| Package | Source path | Kind |
|---------|-------------|------|
| `@sousa99/procrastinator-tracker-backend` | `modules/procrastinator-tracker/backend` | module |
| `@sousa99/procrastinator-tracker-components` | `modules/procrastinator-tracker/frontend` | module |
| `@sousa99/fly-over-tracker-backend` | `modules/fly-over-tracker/backend` | module |
| `@sousa99/fly-over-tracker-components` | `modules/fly-over-tracker/frontend` | module |
| `@sousa99/bus-catcher-backend` | `modules/bus-catcher/backend` | module |
| `@sousa99/bus-catcher-components` | `modules/bus-catcher/frontend` | module |
| `@sousa99/homesweethome-config` | `packages/config` | tooling |

### Rules

1. Every published package MUST declare `publishConfig.registry` =
   `https://npm.pkg.github.com/` and `publishConfig.access` = `public`.
2. The repo-level `.npmrc` MUST map the `@sousa99` scope to GitHub Packages so a single
   auth token publishes every package.
3. Module backend packages are `private: false` and publishable; the frontend source
   directory publishes only its components library (`<slug>-components`), not the SPA.
4. `@sousa99/homesweethome-config` MUST keep its exports contract:
   `./eslint`, `./prettier`, `./tsconfig.base` (consumers import these paths).

## Container images (GHCR, `ghcr.io/sousa99`)

| Image | Built from |
|-------|-----------|
| `ghcr.io/sousa99/<slug>-backend` | `modules/<slug>/Dockerfile.backend` |
| `ghcr.io/sousa99/<slug>-frontend` | `modules/<slug>/Dockerfile.frontend` |

Tags: `<version>` (from the module's fixed release group) and `latest`.

## Version model

- All packages start at `0.0.1` (FR-006).
- All packages of a module share one version (per-module release, FR-013).
- The tooling package `@sousa99/homesweethome-config` versions independently of modules.
  The former scaffolding CLI (`@sousa99/homesweethome`) is not published from this repo.

## Verification

Run the corresponding checks in [quickstart.md](../quickstart.md) to confirm the mapping
and version behavior before the old published packages are deleted.