# Module Readme — bus-catcher

Module-level overview for `sousa99/bus-catcher`, a Home Sweet Home module
([umbrella](https://github.com/)).

## 🪪 Identity

| Field | Value |
|-------|-------|
| Name | bus-catcher |
| Slug | bus-catcher |
| Description | A Home Sweet Home module (bus-catcher) |
| npm scope | `@sousa99` |
| Repository | `sousa99/bus-catcher` |
| GHCR org | `ghcr.io/sousa99` |
| Home Sweet Home | https://github.com/ |

## 🧩 Package organization

| Package | Name | Purpose |
|---------|------|---------|
| backend | `@sousa99/bus-catcher-backend` | Dual-mode: REST API (--http) + MCP server (--mcp) |
| frontend | `@sousa99/bus-catcher-components` | SPA app + Storybook + published components |

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
