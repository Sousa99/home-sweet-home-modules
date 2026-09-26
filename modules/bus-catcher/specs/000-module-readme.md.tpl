# Module Readme — {{MODULE_NAME}}

Module-level overview for `{{REPO_OWNER}}/{{REPO_NAME}}`, a Home Sweet Home module
([umbrella]({{UMBRELLA_LINK}})).

## 🪪 Identity

| Field | Value |
|-------|-------|
| Name | {{MODULE_NAME}} |
| Slug | {{MODULE_SLUG}} |
| Description | {{MODULE_DESCRIPTION}} |
| npm scope | `@{{NPM_SCOPE}}` |
| Repository | `{{REPO_OWNER}}/{{REPO_NAME}}` |
| GHCR org | `{{GHCR_ORG}}` |
| Home Sweet Home | {{UMBRELLA_LINK}} |

## 🧩 Package organization

| Package | Name | Purpose |
|---------|------|---------|
{{#if backend}}| backend | `{{BACKEND_PACKAGE}}` | Dual-mode: REST API ({{HTTP_ENTRY}}) + MCP server ({{MCP_ENTRY}}) |
{{/if}}{{#if frontend}}| frontend | `{{FRONTEND_PACKAGE}}` | SPA app + Storybook + published components |

{{/if}}## 📚 Documentation

- **Setup guide**: [setup.md](../setup.md) — prerequisites, quality gates, pipelines, package
  organization, good practices.
- **Foundational clarify**: [docs/clarify.md](../docs/clarify.md) — decisions to settle at
  module creation (runtime defaults, registries, tech variants).
- **This feature spec**: features live under `specs/NNN-*/` following the Spec Kit workflow.

## 🧰 Stack

| Layer | Technology |
|-------|------------|
{{#if backend}}| Backend | {{STACK_BACKEND}} |
{{/if}}{{#if frontend}}| Frontend | {{STACK_FRONTEND}} |
{{/if}}| Tooling | {{STACK_TOOLING}} |

## 🔒 Quality gates

`pnpm lint`, `pnpm format`, `pnpm test`, `pnpm typecheck`, and
`node scripts/scaffold.mjs --check` must all pass before merge (see
[setup.md](../setup.md)).