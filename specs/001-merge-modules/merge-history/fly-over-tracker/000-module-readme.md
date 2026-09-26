# Module Readme — fly-over-tracker

Module-level overview for `sousa99/fly-over-tracker`, a Home Sweet Home module
([umbrella](https://github.com/)).

## 🪪 Identity

| Field | Value |
|-------|-------|
| Name | fly-over-tracker |
| Slug | fly-over-tracker |
| Description | Track which aircraft are flying over a given location - REST API, MCP tool, and React SPA |
| npm scope | `@sousa99` |
| Repository | `sousa99/fly-over-tracker` |
| GHCR org | `ghcr.io/sousa99` |
| Home Sweet Home | https://github.com/ |

## 🧩 Package organization

| Package | Name | Purpose |
|---------|------|---------|
| backend | `@sousa99/fly-over-tracker-backend` | Dual-mode: REST API (--http) + MCP server (--mcp) |
| frontend | `@sousa99/fly-over-tracker-components` | SPA app + Storybook + published components |

## 📚 Documentation

- **Setup guide**: [setup.md](../setup.md) — prerequisites, quality gates, pipelines, package
  organization, good practices.
- **Foundational clarify**: [docs/clarify.md](../docs/clarify.md) — decisions to settle at
  module creation (runtime defaults, registries, tech variants).
- **This feature spec**: features live under `specs/NNN-*/` following the Spec Kit workflow.

## 🧰 Stack

| Layer | Technology |
|-------|------------|
| Backend | Node 24, TypeScript |
| Frontend | Vite, React 19, Tailwind CSS v4 |
| Tooling | pnpm 11, TypeScript, ESLint, Prettier, Vitest |

## 🔒 Quality gates

`pnpm lint`, `pnpm format`, `pnpm test`, `pnpm typecheck`, and
`node scripts/scaffold.mjs --check` must all pass before merge (see
[setup.md](../setup.md)).
