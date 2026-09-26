# Foundational Clarify — Procrastinator Tracker

This document lists the foundational decisions settled when this module was created. The
values below are confirmed as the module's identity; runtime defaults are hand-written
application code by design.

> These decisions are finalized at module-creation time. The **runtime defaults** below are
> hand-written application code by design (FR-012): the template deliberately does not wire
> them into runtime.

## 🪪 Identity

| Decision | Current value | Status |
|----------|---------------|--------|
| Module name | `Procrastinator Tracker` | Confirm |
| Module slug | `procrastinator-tracker` | Confirm |
| Description | `Local-first task tracker with REST + MCP backend and a React SPA frontend` | Confirm |
| npm scope | `@sousa99` | Confirm |
| Repo | `Sousa99/home-sweet-home-modules` | Confirm |
| GHCR org | `ghcr.io/sousa99` | Confirm |
| Umbrella link | `https://github.com/` | Confirm |

## 🧩 Package organization

- [x] Backend: single dual-mode package `@sousa99/procrastinator-tracker-backend` (REST `--http` + MCP `--mcp`)

- [x] Frontend: single package `@sousa99/procrastinator-tracker-components` (SPA + Storybook + components)


Confirm the included sides below:

- [x] Backend IS included

- [x] Frontend IS included


## 🖊️ Runtime defaults (hand-written — NOT config-driven)

These are application code defaults that live in the module's source and are written by hand
(FR-012). Confirm each for this module:

- [ ] MCP server name: `procrastinator-tracker` (see `backend/src/mcp/index.ts`)
- [ ] Database filename: `./data/<module>.db` (see `backend/src/db/client.ts`)
- [ ] `opencode.json` module MCP entry key: `procrastinator-tracker`

- [ ] SPA title: `Procrastinator Tracker` (see `frontend/index.html`)

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

- [ ] Confirm the stack matches this module's needs: backend `Node 24, Hono, Drizzle ORM, SQLite`; frontend
  `Vite, React 19, Tailwind CSS v4`; tooling `pnpm 11, TypeScript, ESLint, Prettier, Vitest`
- [ ] Confirm the styling theme (primary `#d97706`) — see the Home Sweet Home theme

## 🔁 How to apply a change

1. Change the module's identity in its `package.json` files (name/version) or the
   `modules/<slug>/` directory name.
2. Hand-edit any runtime default listed above in the application source.
3. Run the uniform quality gates (see `setup.md`).
