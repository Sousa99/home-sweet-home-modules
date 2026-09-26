# 🏠 Home Sweet Home — Modules

Home Sweet Home is a set of solutions for our new home, delivered through an all-in-one
dashboard and related tools. This repository is the single home for every Home Sweet Home
**module** — each module is a self-contained capability with its own backend, frontend,
documentation, and independent release cycle.

## Modules

| Module | Description | Backend | Frontend |
|--------|-------------|---------|----------|
| [fly-over-tracker](./modules/fly-over-tracker/README.md) | Track which aircraft are flying over a given location | REST + MCP | React SPA + components |
| [procrastinator-tracker](./modules/procrastinator-tracker/README.md) | Local-first task tracker | REST + MCP + SQLite | React SPA + components |
| [bus-catcher](./modules/bus-catcher/README.md) | Bus arrival tracking | REST + MCP | React SPA + components |

## Prerequisites

- Node.js 24 LTS
- pnpm 11

## Setup

```bash
pnpm install
```

That installs the entire workspace: every module's backend and frontend, plus the shared
config presets (`packages/config`).

## Quality gates

One shared set of gates, enforced on every pull request by the uniform CI pipeline:

```bash
pnpm lint       # ESLint (shared flat config)
pnpm format     # Prettier check (shared config)
pnpm typecheck  # tsc --noEmit for every package
pnpm test       # Vitest for every package
```

Builds (backend, SPA, components library) are verified per module in CI. See
[`docs/modules.md`](./docs/modules.md) for how to add a new module.

## Releases

Each module releases **independently** via [changesets](.changeset/README.md):

- A module's `backend` and `components` packages share one version (a changesets fixed
  group).
- Releasing one module never bumps another.
- Every package starts at `0.0.1`.
- A release publishes the components package to GitHub Packages and the backend/frontend
  container images to GHCR, and creates a GitHub release.

See [`.changeset/README.md`](.changeset/README.md) for how to record a change.

## Governance

The project is governed by the [constitution](.specify/memory/constitution.md). Feature
work follows the Spec Kit workflow (specify → plan → tasks) and all spec-driven
development lives under [`specs/`](./specs/).