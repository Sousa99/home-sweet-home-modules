# AGENTS.md — fly-over-tracker

Guidance for contributors (human or AI) working in the **fly-over-tracker** module.

## Purpose

Track which aircraft are flying over a given location: query aircraft over a GPS point + radius,
resolve origin/destination airports, and show closest-aircraft details. Built on the free
[adsb.lol](https://adsb.lol) feed — no credentials or configuration required.

## Packages & layout

```text
backend/    @sousa99/fly-over-tracker-backend    — one dual-mode package: REST (--http) + MCP (--mcp)
frontend/   @sousa99/fly-over-tracker-components — one package: SPA, Storybook, components library
Dockerfile.backend / Dockerfile.frontend         — build inputs for the GHCR images
deploy/     deployment manifests
docs/       module guides (clarify.md, configuration.md)
```

## Common commands (from the repo root)

```bash
pnpm --filter ./modules/fly-over-tracker/backend dev          # REST API in dev (--http, :3000)
pnpm --filter ./modules/fly-over-tracker/backend dev:mcp      # MCP server in dev (--mcp, :3001)
pnpm --filter ./modules/fly-over-tracker/backend start        # REST API (--http)
pnpm --filter ./modules/fly-over-tracker/backend start:mcp    # MCP server (--mcp)
pnpm --filter ./modules/fly-over-tracker/frontend dev         # SPA dev server
pnpm --filter ./modules/fly-over-tracker/frontend storybook   # Storybook workbench
```

Backend tests / typecheck / lint run through the shared gates:
`pnpm --filter ./modules/fly-over-tracker/backend test` (or the root `pnpm test` / `pnpm typecheck` /
`pnpm lint`).

## Conventions

- **Dual-mode parity**: REST and MCP share the same service/feed/cache layer — a contract change
  must be covered on both surfaces.
- **Feed degradation**: the module degrades gracefully when the live feed is unavailable; keep that
  behavior intact in changes.
- **No credentials**: the module works with no external configuration — do not introduce required
  secrets.
- **Quality gates**: ESLint, Prettier, typecheck, and Vitest must pass; module extends the shared
  presets from `@sousa99/homesweethome-config`.
- **Release**: the fixed changeset group is `@sousa99/fly-over-tracker-backend` +
  `@sousa99/fly-over-tracker-components` — they version together.

## Agent & skill routing

Same as the repository root: git/GitHub → `github-helper`, version bumps/changesets →
`version-analyser`, test-first implementation → `implementer`, test verdicts → `tester`,
pre-merge review → `reviewer`, architecture → `architect`, final polish → `nitpicker`,
docs → `documenter`. The main assistant must not run git/GitHub operations.