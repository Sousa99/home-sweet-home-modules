# AGENTS.md

Guidance for human and AI contributors working in the **Home Sweet Home — Modules** repository.

## Repository structure

A pnpm monorepo (pnpm 11, Node 24) where every feature ships as a **module**.

```text
modules/<slug>/      self-contained application modules (backend + frontend + Dockerfiles)
packages/config/     @sousa99/homesweethome-config — shared eslint/prettier/tsconfig presets
.changeset/          changesets config + change files (fixed groups per module)
.github/workflows/   ci.yml (uniform CI) + release.yml (changesets version + publish)
docs/                repository-level guides
specs/               all Spec Kit features (specs, plans, contracts, tasks)
.opencode/           opencode agents, skills, and commands
```

Modules: `bus-catcher`, `fly-over-tracker`, `procrastinator-tracker`. Each module has a
`backend/` (dual-mode REST + MCP package), a `frontend/` (SPA + Storybook + components library),
Dockerfiles, a README, and a `setup.md`.

## Common commands

```bash
pnpm install                                        # install the whole workspace
pnpm lint                                           # ESLint across the repo
pnpm format                                         # Prettier check
pnpm format:write                                   # Prettier fix
pnpm typecheck                                      # recursive typecheck
pnpm test                                           # recursive Vitest suite
pnpm changeset                                      # add a changeset
pnpm --filter ./modules/<slug>/backend dev          # run one module's backend (--http)
pnpm --filter ./modules/<slug>/backend dev:mcp      # run one module's MCP server (--mcp)
pnpm --filter ./modules/<slug>/frontend dev         # run one module's SPA
```

## Conventions & quality gates

- **Constitution first**: `.specify/memory/constitution.md` supersedes all practices. Read it before
  major work. Key principles: module-first, local-first/private by default, declared identity
  (directory/package names match `@sousa99/<slug>-*`), test-first (TDD, Vitest), shared presets.
- **Quality gates** (enforced on every PR by CI for every module): ESLint, Prettier, typecheck, and
  the Vitest suite must all pass. All modules extend the shared presets from
  `@sousa99/homesweethome-config` — no per-module config drift.
- **Spec-driven development**: feature work follows the Spec Kit workflow — specify, plan, then
  tasks — under `specs/` at the repository root (no per-module spec directories).
- **Releases**: per-module changesets fixed groups; each module's packages version together.
- **Commits**: conventional-commit style (`type(scope): summary`); pre-commit hook runs lint-staged.

## Agent & skill routing

Delegate by task; the main assistant must not perform git/GitHub operations.

| Task | Delegate to |
|------|-------------|
| Commit, push, branches, PRs, issues, CI/Actions | `github-helper` (only agent with git/GitHub access) |
| Version bumps + changeset verification (before any PR) | `version-analyser` (mandatory pre-PR gate) |
| Implementation (test-first) | `implementer` |
| Test suite / coverage verdict | `tester` |
| Pre-merge code review | `reviewer` |
| Architecture / module-boundary / spec design review | `architect` |
| Final minor-fix polish (organization, docs, tests, naming, dead code) | `nitpicker` |
| README / setup.md / docs sync | `documenter` |

Skills (load on demand): `commit-hygiene`, `quality-gates`, `test-first`,
`spec-driven-development`, `changelog-release-notes`.

## Adding a new module

1. Create `modules/<slug>/` (its packages are picked up automatically by the workspace globs) and
   register its fixed release group in `.changeset/config.json`.
2. Give it the standard shape (backend, frontend, Dockerfiles, README, `setup.md`) and an
   `AGENTS.md` following the pattern of the existing modules.
3. All identity must be declared in `package.json` (`@sousa99/<slug>-*`). No scaffolding CLI.