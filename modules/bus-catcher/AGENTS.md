# AGENTS.md — bus-catcher

Guidance for contributors (human or AI) working in the **bus-catcher** module.

## Purpose

Bus arrival tracking for Lisbon's **Carris Metropolitana**: search lines and stops, see next
arrivals at a stop (static schedule + live ETAs), and keep a personal stop list with alert
thresholds. Local-first — your stop list persists in this module's SQLite database.

## Packages & layout

```text
backend/    @sousa99/bus-catcher-backend    — one dual-mode package: REST (--http) + MCP (--mcp)
frontend/   @sousa99/bus-catcher-components — one package: SPA, Storybook, components library
Dockerfile.backend / Dockerfile.frontend    — build inputs for the GHCR images
deploy/     deployment manifests
docs/       module guides (clarify.md)
```

## Common commands (from the repo root)

```bash
pnpm --filter ./modules/bus-catcher/backend dev          # REST API in dev (--http, :3000)
pnpm --filter ./modules/bus-catcher/backend dev:mcp      # MCP server in dev (--mcp, :3001)
pnpm --filter ./modules/bus-catcher/backend start        # REST API (--http)
pnpm --filter ./modules/bus-catcher/backend start:mcp    # MCP server (--mcp)
pnpm --filter ./modules/bus-catcher/frontend dev         # SPA dev server
pnpm --filter ./modules/bus-catcher/frontend storybook   # Storybook workbench
```

Backend tests / typecheck / lint run through the shared gates:
`pnpm --filter ./modules/bus-catcher/backend test` (or the root `pnpm test` / `pnpm typecheck` /
`pnpm lint`).

## Conventions

- **Dual-mode parity**: REST and MCP share the same service/db layer — a contract change must be
  covered on both surfaces.
- **Local-first**: user data (stop list, alert thresholds) stays in the module's SQLite database;
  no external sync by default.
- **Quality gates**: ESLint, Prettier, typecheck, and Vitest must pass; module extends the shared
  presets from `@sousa99/homesweethome-config`.
- **Release**: the fixed changeset group is `@sousa99/bus-catcher-backend` +
  `@sousa99/bus-catcher-components` — they version together.

## Agent & skill routing

Same as the repository root: git/GitHub → `github-helper`, version bumps/changesets →
`version-analyser`, test-first implementation → `implementer`, test verdicts → `tester`,
pre-merge review → `reviewer`, architecture → `architect`, final polish → `nitpicker`,
docs → `documenter`. The main assistant must not run git/GitHub operations.