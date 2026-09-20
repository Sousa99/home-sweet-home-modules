# Foundational Clarify — {{MODULE_NAME}}

This document lists the foundational decisions to **settle when creating this module**. It is
generated from `module.config.yaml` by `scripts/scaffold.mjs` and pre-filled with the current
config values. For each item, confirm the value or edit the config (and re-run
`node scripts/scaffold.mjs`) — never hand-edit the generated output.

> These decisions are finalized at module-creation time. The **runtime defaults** below are
> hand-written application code by design (FR-012): the template deliberately does not wire
> them into runtime.

## 🪪 Identity

| Decision | Current value | Status |
|----------|---------------|--------|
| Module name | `{{MODULE_NAME}}` | Confirm |
| Module slug | `{{MODULE_SLUG}}` | Confirm |
| Description | `{{MODULE_DESCRIPTION}}` | Confirm |
| npm scope | `@{{NPM_SCOPE}}` | Confirm |
| Repo | `{{REPO_OWNER}}/{{REPO_NAME}}` | Confirm |
| GHCR org | `{{GHCR_ORG}}` | Confirm |
| Umbrella link | `{{UMBRELLA_LINK}}` | Confirm |

## 🧩 Package organization

- [x] Backend: single dual-mode package `{{BACKEND_PACKAGE}}` (REST `{{HTTP_ENTRY}}` + MCP `{{MCP_ENTRY}}`)
{{#if frontend}}
- [x] Frontend: single package `{{FRONTEND_PACKAGE}}` (SPA + Storybook + components)
{{/if}}

Confirm the included sides below:
{{#if backend}}
- [x] Backend IS included
{{/if}}{{#if frontend}}
- [x] Frontend IS included
{{/if}}

## 🖊️ Runtime defaults (hand-written — NOT config-driven)

These are application code defaults that live in the module's source and are written by hand
(FR-012). Confirm each for this module:
{{#if backend}}
- [ ] MCP server name: `{{MCP_SERVER_NAME}}` (see `backend/src/mcp/index.ts`)
- [ ] Database filename: `./data/<module>.db` (see `backend/src/db/client.ts`)
- [ ] `opencode.json` module MCP entry key: `{{MODULE_SLUG}}`
{{/if}}{{#if frontend}}
- [ ] SPA title: `{{MODULE_NAME}}` (see `frontend/index.html`)
{{/if}}
- [ ] API/SPA ports, `/api` proxy target

## 📦 Registries & publishing

- [ ] Confirm `{{GHCR_ORG}}` is the correct GHCR namespace for this module's images
- [ ] Confirm `@{{NPM_SCOPE}}` is the correct npm/GitHub Packages scope
- [ ] Confirm the umbrella link `{{UMBRELLA_LINK}}` (placeholder until a Home Sweet Home org exists)
- [ ] **One-time grant**: if this module installs shared packages published from another repo
  (e.g. `@{{NPM_SCOPE}}/homesweethome-config`), grant this repo read access in that package's
  GitHub Packages settings → "Manage Actions access". CI then works with `GITHUB_TOKEN`
  (the workflows already declare `packages: read`).

## 🧬 Technology variants

- [ ] Confirm the stack matches this module's needs: backend `{{STACK_BACKEND}}`; frontend
  `{{STACK_FRONTEND}}`; tooling `{{STACK_TOOLING}}`
- [ ] Confirm the styling theme (primary `{{THEME_PRIMARY}}`) — see `module.config.yaml` → `theme`

## 🔁 How to apply a change

1. Edit `module.config.yaml`.
2. Run `node scripts/scaffold.mjs` to re-render generated files.
3. Run `node scripts/scaffold.mjs --check` to verify the repo is in sync.
4. Hand-edit any runtime default listed above in the application source.