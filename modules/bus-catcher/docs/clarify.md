# Foundational Clarify — bus-catcher

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
| Module name | `bus-catcher` | Confirm |
| Module slug | `bus-catcher` | Confirm |
| Description | `A Home Sweet Home module (bus-catcher)` | Confirm |
| npm scope | `@sousa99` | Confirm |
| Repo | `sousa99/bus-catcher` | Confirm |
| GHCR org | `ghcr.io/sousa99` | Confirm |
| Umbrella link | `https://github.com/` | Confirm |

## 🧩 Package organization

- [x] Backend: single dual-mode package `@sousa99/bus-catcher-backend` (REST `--http` + MCP `--mcp`)

- [x] Frontend: single package `@sousa99/bus-catcher-components` (SPA + Storybook + components)


Confirm the included sides below:

- [x] Backend IS included

- [x] Frontend IS included


## 🖊️ Runtime defaults (hand-written — NOT config-driven)

These are application code defaults that live in the module's source and are written by hand
(FR-012). Confirm each for this module:

- [ ] MCP server name: `bus-catcher` (see `backend/src/mcp/index.ts`)
- [ ] Database filename: `./data/<module>.db` (see `backend/src/db/client.ts`)
- [ ] `opencode.json` module MCP entry key: `bus-catcher`

- [ ] SPA title: `bus-catcher` (see `frontend/index.html`)

- [ ] API/SPA ports, `/api` proxy target

## 📦 Registries & publishing

- [ ] Confirm `ghcr.io/sousa99` is the correct GHCR namespace for this module's images
- [ ] Confirm `@sousa99` is the correct npm/GitHub Packages scope
- [ ] Confirm the umbrella link `https://github.com/` (placeholder until a Home Sweet Home org exists)
- [ ] **One-time grant**: if this module installs shared packages published from another repo
  (e.g. `@sousa99/homesweethome-config`), grant this repo read access in that package's
  GitHub Packages settings → "Manage Actions access". CI then works with `GITHUB_TOKEN`
  (the workflows already declare `packages: read`).
- [ ] **`GH_PACKAGES_TOKEN` secret**: the release workflow publishes the npm package with
  `NPM_TOKEN: ${{ secrets.GH_PACKAGES_TOKEN }}` — add a repository secret named
  `GH_PACKAGES_TOKEN` holding a classic PAT with `write:packages` (and `read:packages`)
  scopes.

## 🧬 Technology variants

- [ ] Confirm the stack matches this module's needs: backend `Node 24, TypeScript`; frontend
  `Vite, React 19, Tailwind CSS v4`; tooling `pnpm 11, TypeScript, ESLint, Prettier, Vitest`
- [ ] Confirm the styling theme (primary `#d97706`) — see `module.config.yaml` → `theme`

## 🔁 How to apply a change

1. Edit `module.config.yaml`.
2. Run `node scripts/scaffold.mjs` to re-render generated files.
3. Run `node scripts/scaffold.mjs --check` to verify the repo is in sync.
4. Hand-edit any runtime default listed above in the application source.
