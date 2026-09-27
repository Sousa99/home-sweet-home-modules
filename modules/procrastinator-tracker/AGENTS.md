# AGENTS.md — procrastinator-tracker

Guidance for contributors (human or AI) working in the **procrastinator-tracker** module.

## Purpose

A local-first task tracker: Hono REST API (OpenAPI/Swagger) plus an MCP server, SQLite via Drizzle,
and a lightweight React SPA. Tasks move through a fixed lifecycle (`to-start → started →
in-progress → validating → finished`, with `on-hold` and reopen), with flat tags, lightweight
users (no accounts), optional location and urgency (1–5), recurring tasks, and status-aware
comments.

## Packages & layout

```text
backend/    @sousa99/procrastinator-tracker-backend    — one dual-mode package: REST (--http) + MCP (--mcp)
frontend/   @sousa99/procrastinator-tracker-components — one package: SPA, Storybook, components library
Dockerfile.backend / Dockerfile.frontend               — build inputs for the GHCR images
deploy/     deployment manifests
docs/       module guides (clarify.md)
LICENSE     module license
```

## Common commands (from the repo root)

```bash
pnpm --filter ./modules/procrastinator-tracker/backend dev          # REST API in dev (--http, :3000)
pnpm --filter ./modules/procrastinator-tracker/backend dev:mcp      # MCP server in dev (--mcp, :3001)
pnpm --filter ./modules/procrastinator-tracker/backend start        # REST API (--http)
pnpm --filter ./modules/procrastinator-tracker/backend start:mcp    # MCP server (--mcp)
pnpm --filter ./modules/procrastinator-tracker/frontend dev         # SPA dev server
pnpm --filter ./modules/procrastinator-tracker/frontend storybook   # Storybook workbench
pnpm --filter ./modules/procrastinator-tracker/backend db:generate  # if schema changed
pnpm --filter ./modules/procrastinator-tracker/backend db:migrate   # creates the SQLite db
```

Backend tests / typecheck / lint run through the shared gates:
`pnpm --filter ./modules/procrastinator-tracker/backend test` (or the root `pnpm test` /
`pnpm typecheck` / `pnpm lint`).

## Conventions

- **Dual-mode parity**: REST and MCP share the same service/db layer — a contract change must be
  covered on both surfaces.
- **Local-first**: household data (tasks, users, comments) stays in the module's SQLite database;
  no external sync by default.
- **Task lifecycle**: preserve the fixed task state machine and its transitions when changing task
  behavior.
- **Quality gates**: ESLint, Prettier, typecheck, and Vitest must pass; module extends the shared
  presets from `@sousa99/homesweethome-config`.
- **Release**: the fixed changeset group is `@sousa99/procrastinator-tracker-backend` +
  `@sousa99/procrastinator-tracker-components` — they version together.

## Agent & skill routing

Same as the repository root: git/GitHub → `github-helper`, version bumps/changesets →
`version-analyser`, test-first implementation → `implementer`, test verdicts → `tester`,
pre-merge review → `reviewer`, architecture → `architect`, final polish → `nitpicker`,
docs → `documenter`. The main assistant must not run git/GitHub operations.