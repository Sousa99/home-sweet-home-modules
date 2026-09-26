# Module Readme — Procrastinator Tracker

Module-level overview for `sousa99/procrastinator-tracker`, a Home Sweet Home module
([umbrella](https://github.com/)).

## 🪪 Identity

| Field | Value |
|-------|-------|
| Name | Procrastinator Tracker |
| Slug | procrastinator-tracker |
| Description | Local-first task tracker with REST + MCP backend and a React SPA frontend |
| npm scope | `@sousa99` |
| Repository | `sousa99/procrastinator-tracker` |
| GHCR org | `ghcr.io/sousa99` |
| Home Sweet Home | https://github.com/ |

## 🧩 Package organization

| Package | Name | Purpose |
|---------|------|---------|
| backend | `@sousa99/procrastinator-tracker-backend` | Dual-mode: REST API (--http) + MCP server (--mcp) |
| frontend | `@sousa99/procrastinator-tracker-components` | SPA app + Storybook + published components |

## 📚 Documentation

- **Setup guide**: [setup.md](../setup.md) — prerequisites, quality gates, pipelines, package
  organization, good practices.
- **Foundational clarify**: [docs/clarify.md](../docs/clarify.md) — decisions to settle at
  module creation (runtime defaults, registries, tech variants).
- **This feature spec**: features live under `specs/NNN-*/` following the Spec Kit workflow.

## 🧰 Stack

| Layer | Technology |
|-------|------------|
| Backend | Node 24, Hono, Drizzle ORM, SQLite |
| Frontend | Vite, React 19, Tailwind CSS v4 |
| Tooling | pnpm 11, TypeScript, ESLint, Prettier, Vitest |

## 🔒 Quality gates

`pnpm lint`, `pnpm format`, `pnpm test`, `pnpm typecheck`, and
`node scripts/scaffold.mjs --check` must all pass before merge (see
[setup.md](../setup.md)).
