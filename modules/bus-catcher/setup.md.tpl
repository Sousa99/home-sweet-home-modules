# {{MODULE_NAME}} — Setup

This guide covers prerequisites, quality gates, pipelines, package organization, and good
practices for this module. It is generated from `module.config.yaml` by
`scripts/scaffold.mjs`.

## 🧰 Prerequisites

- Node.js 24 LTS
- pnpm 11 (`packageManager: pnpm@11.25.0`)

## 📦 Install

```bash
pnpm install
```

## 🧩 Package organization

Home Sweet Home modules share a consistent package layout. This module ships:

{{#if backend}}
- **`backend`** (`{{BACKEND_PACKAGE}}`) — a single dual-mode package with two executions:
  - REST API via `{{HTTP_ENTRY}}`
  - MCP server via `{{MCP_ENTRY}}`
  Both share the same service/db layer. **The backend is never split** into separate
  REST/MCP packages.
{{/if}}

{{#if frontend}}
- **`frontend`** (`{{FRONTEND_PACKAGE}}`) — a single package producing three artifacts from
  the same source:
  - SPA app (`pnpm --filter ./frontend build` → `dist-app/`)
  - Storybook workbench (`pnpm --filter ./frontend storybook` / `build-storybook`)
  - Published components library (`pnpm --filter ./frontend build:lib` → `dist-lib/`)
  Styling uses Tailwind CSS v4 with the Home Sweet Home theme (see `module.config.yaml` →
  `theme`).
{{/if}}

{{#if backend}}
## ⚙️ Backend

```bash
pnpm --filter ./backend dev          # REST API ({{HTTP_ENTRY}}), tsx watch
pnpm --filter ./backend dev:mcp      # MCP server ({{MCP_ENTRY}}), tsx watch
pnpm --filter ./backend start        # REST API ({{HTTP_ENTRY}})
pnpm --filter ./backend start:mcp    # MCP server ({{MCP_ENTRY}})
pnpm --filter ./backend build        # esbuild bundle → dist/
pnpm --filter ./backend test         # Vitest
pnpm --filter ./backend typecheck    # tsc --noEmit
```

> Runtime defaults (server name, database filename, ports) are hand-written per module — see
> `docs/clarify.md`.
{{/if}}

{{#if frontend}}
## 🎨 Frontend

```bash
pnpm --filter ./frontend dev             # SPA dev server
pnpm --filter ./frontend storybook       # Storybook workbench
pnpm --filter ./frontend build           # SPA build → dist-app/
pnpm --filter ./frontend build:lib       # components library → dist-lib/
pnpm --filter ./frontend test            # Vitest
pnpm --filter ./frontend typecheck       # tsc --noEmit
```
{{/if}}

## 🔒 Quality gates

All of the following MUST pass before commit/merge:

```bash
pnpm lint          # ESLint (flat config)
pnpm format        # Prettier check
pnpm test          # Vitest (workspace)
pnpm typecheck     # tsc --noEmit (workspace)
node scripts/scaffold.mjs --check   # template drift check
```

### 🔀 Template drift check

`module.config.yaml` is the single source of truth for documentation and packaging. The
generated files (README, AGENTS, setup, package names) are rendered by
`scripts/scaffold.mjs`. After any hand edit to a generated file, run
`node scripts/scaffold.mjs --check`; a failure must be resolved by re-rendering or updating
the config — never by bypassing the check.

## 🚀 Pipelines

- **CI** (`.github/workflows/ci.yml`) runs on every pull request: format, lint, typecheck,
  tests, builds, PR format, and the scaffold `--check`. A single aggregator check is the
  required gate on `main`.
- **Release** (`.github/workflows/release.yml`) runs on push to `main`: re-validates the
  gates, then semantic-release derives the version from conventional commits and publishes
  the artifacts (Docker images, npm package) at one shared version.

## 🔀 Pull requests

- **Title**: conventional commit `<type>(<scope>)?: <subject>` — enforced by the `📝 PR
  format` check.
- **Branch**: `feature/NNN-kebab-case` or `fix/NNN-kebab-case`.
- A guided **PR template** pre-fills every new PR body.

## 💡 Good practices

- **Formatting is automated**: one formatter (Prettier), never hand-debated; formatting runs
  in the quality gates.
- **Linting is non-negotiable**: ESLint must pass before merge; exceptions are documented
  inline with justification.
- **Living documentation**: docs update in the same change as the code they describe; the
  README and this setup guide stay current (the drift check enforces it).
- **Dependency hygiene**: after dependency changes run `pnpm install`/`pnpm dedupe`; keep a
  single instance of each critical package (`pnpm ls <pkg>` shows exactly one).
- **IDE/TypeScript parity**: the IDE uses the workspace TypeScript (see
  `.vscode/settings.json`); spurious IDE errors that do not reproduce in `tsc` are a
  toolchain mismatch to fix, not to ignore.

## 🏛️ Governance

See `.specify/memory/constitution.md` for the project's governing principles. Foundational
decisions to settle when creating this module are listed in `docs/clarify.md`.