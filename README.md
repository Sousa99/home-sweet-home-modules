# 🏠 Home Sweet Home — Modules

Home Sweet Home is a set of solutions for our new home, delivered through an all-in-one
dashboard and related tools. This repository is the single home for every Home Sweet Home
**module** — a self-contained capability with its own backend, frontend, documentation,
and an **independent release cycle**.

## What's in here

| Module | Description | Backend | Frontend |
|--------|-------------|---------|----------|
| [fly-over-tracker](./modules/fly-over-tracker/README.md) | Track which aircraft are flying over a given location | REST + MCP | React SPA + components |
| [procrastinator-tracker](./modules/procrastinator-tracker/README.md) | Local-first task tracker (REST + MCP + SQLite) | REST + MCP | React SPA + components |
| [bus-catcher](./modules/bus-catcher/README.md) | Bus arrival tracking for Lisbon's Carris Metropolitana | REST + MCP | React SPA + components |

Every module shares the same shape:

- **`backend/`** — a single dual-mode package: a REST API (`--http`) and an MCP server
  (`--mcp`) over the same service/db layer.
- **`frontend/`** — a single package producing three artifacts from the same source: the
  **SPA app**, a **Storybook workbench**, and a **publishable components library**.
- **Dockerfiles** + `deploy/` — build inputs for the GHCR images.

## Repository structure

```text
modules/<slug>/      self-contained application modules (backend + frontend + Dockerfiles)
packages/config/     @sousa99/homesweethome-config — shared eslint/prettier/tsconfig presets
.changeset/          changesets config + change files
.github/workflows/   ci.yml (uniform CI) + release.yml (changesets version + publish)
docs/                repository-level guides (module index, structure)
specs/               all Spec Kit features (specs, plans, contracts, tasks)
```

## Prerequisites

- Node.js 24 LTS
- pnpm 11 (`packageManager: pnpm@11.25.0`)

## Getting started

```bash
pnpm install
```

That installs the entire workspace in one shot: every module's backend and frontend plus
the shared config presets. Run any package from the repo root with a filter, e.g.:

```bash
pnpm --filter ./modules/fly-over-tracker/backend dev
pnpm --filter ./modules/procrastinator-tracker/frontend dev
```

See each module's README for its run commands, ports, and configuration.

## Quality gates

One shared set of gates, enforced on every pull request by the uniform CI pipeline for
**every** module:

```bash
pnpm lint       # ESLint (shared flat config)
pnpm format     # Prettier check (shared config)
pnpm typecheck  # tsc --noEmit for every package
pnpm test       # Vitest for every package
```

CI also verifies backend, SPA, and components-library builds per module, runs actionlint,
and enforces conventional-commit PR titles and `feature/NNN-…` branch names. A single
`✅ Check` aggregator is the required status check on `main`.

## Releases

Each module releases **independently** via [changesets](.changeset/README.md):

- A module's `backend` and `components` packages form a **fixed group** — they always
  share one version.
- Releasing module A never bumps module B or the config package.
- Every package starts at `0.0.1`.
- A release publishes the components package to GitHub Packages (`@sousa99`), pushes the
  backend/frontend container images to GHCR (`ghcr.io/sousa99`), and creates a GitHub
  release with the module's changelog.

To record a change: `pnpm changeset`, commit the changeset, and merge. The version PR and
publishing happen automatically on `main`.

## Adding a module

New modules are added **directly in this repository** — no scaffolding CLI or
template-stamping step. See [docs/modules.md](./docs/modules.md) for the steps (create
`modules/<slug>/`, register a fixed group in `.changeset/config.json`, extend the release
script, document it).

## Development workflow

- Feature work follows the **Spec Kit** workflow: specify → plan → tasks. All spec-driven
  development lives under [`specs/`](./specs/).
- PRs must pass all quality gates and be reviewed; reviewers verify compliance with the
  constitution.

## Documentation

- [docs/modules.md](./docs/modules.md) — adding/managing modules and repository structure.
- [.changeset/README.md](.changeset/README.md) — the release workflow.
- Per-module READMEs, `setup.md`, and `docs/` for the details.

## Governance

The project is governed by the [constitution](.specify/memory/constitution.md): module
independence, local-first and private-by-default data, uniform tooling, and contract
testing are non-negotiable.