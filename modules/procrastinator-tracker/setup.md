# Procrastinator Tracker — Setup

This guide covers prerequisites, quality gates, pipelines, package organization, and good
practices for this module. The module lives in the Home Sweet Home modules monorepo at
`modules/procrastinator-tracker/`.

## 🧰 Prerequisites

- Node.js 24 LTS
- pnpm 11 (`packageManager: pnpm@11.25.0`)

## 📦 Install

From the repository root:

```bash
pnpm install
```

## 🧩 Package organization

Home Sweet Home modules share a consistent package layout. This module ships:

- **`backend`** (`@sousa99/procrastinator-tracker-backend`) — a single dual-mode package with two executions:
  - REST API via `--http`
  - MCP server via `--mcp`
  Both share the same service/db layer. The backend is never split into separate
  REST/MCP packages. It is private; it ships as a container image, not an npm package.
- **`frontend`** (`@sousa99/procrastinator-tracker-components`) — a single package producing three artifacts
  from the same source:
  - SPA app (`pnpm --filter ./modules/procrastinator-tracker/frontend build` → `dist-app/`)
  - Storybook workbench (`pnpm --filter ./modules/procrastinator-tracker/frontend storybook`)
  - Published components library (`pnpm --filter ./modules/procrastinator-tracker/frontend build:lib` → `dist-lib/`)
  Styling uses Tailwind CSS v4 with the Home Sweet Home theme.

## ⚙️ Backend

Run from the repository root:

```bash
pnpm --filter ./modules/procrastinator-tracker/backend dev          # REST API (--http), tsx watch
pnpm --filter ./modules/procrastinator-tracker/backend dev:mcp      # MCP server (--mcp), tsx watch
pnpm --filter ./modules/procrastinator-tracker/backend start        # REST API (--http)
pnpm --filter ./modules/procrastinator-tracker/backend start:mcp    # MCP server (--mcp)
pnpm --filter ./modules/procrastinator-tracker/backend build        # esbuild bundle → dist/
pnpm --filter ./modules/procrastinator-tracker/backend test         # Vitest
pnpm --filter ./modules/procrastinator-tracker/backend typecheck    # tsc --noEmit
```

## 🎨 Frontend

```bash
pnpm --filter ./modules/procrastinator-tracker/frontend dev             # SPA dev server
pnpm --filter ./modules/procrastinator-tracker/frontend storybook       # Storybook workbench
pnpm --filter ./modules/procrastinator-tracker/frontend build           # SPA build → dist-app/
pnpm --filter ./modules/procrastinator-tracker/frontend build:lib       # components library → dist-lib/
pnpm --filter ./modules/procrastinator-tracker/frontend test            # Vitest
pnpm --filter ./modules/procrastinator-tracker/frontend typecheck       # tsc --noEmit
```

## 🔒 Quality gates

All of the following MUST pass before commit/merge (enforced by the uniform CI pipeline
for every module):

```bash
pnpm lint          # ESLint (shared flat config)
pnpm format        # Prettier check (shared config)
pnpm test          # Vitest (workspace)
pnpm typecheck     # tsc --noEmit (workspace)
```

## 🚀 Pipelines

CI/CD is uniform at the repository root (`.github/workflows/`):

- **CI** runs on every pull request and validates every module: format, lint, typecheck,
  tests, backend/SPA/library builds, actionlint, and PR format. A single `✅ Check`
  aggregator is the required gate on `main`.
- **Release** runs on push to `main`: changesets creates a version PR; merging it publishes
  the affected modules' components package (npm) and GHCR images, and creates a GitHub
  release. Modules release independently (see the repository README).

## 🔀 Pull requests

- **Title**: conventional commit `<type>(<scope>)?: <subject>` — enforced by the `📝 PR
  format` check.
- **Branch**: `feature/NNN-kebab-case` or `fix/NNN-kebab-case`.

## 💡 Good practices

- **Formatting is automated**: one formatter (Prettier), never hand-debated; formatting runs
  in the quality gates.
- **Linting is non-negotiable**: ESLint must pass before merge; exceptions are documented
  inline with justification.
- **Living documentation**: docs update in the same change as the code they describe; the
  README and this setup guide stay current.
- **Dependency hygiene**: after dependency changes run `pnpm install`/`pnpm dedupe`; keep a
  single instance of each critical package (`pnpm ls <pkg>` shows exactly one).

## 🏛️ Governance

See the [constitution](../.specify/memory/constitution.md) for the project's governing
principles. Foundational decisions to settle for this module are listed in `docs/clarify.md`.
