# Implementation Plan: Module Docs Templatization

**Branch**: `feature/005-module-docs-templatization` | **Date**: 2026-09-20 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/005-module-docs-templatization/spec.md`

## Summary

Make every Home Sweet Home module repository consistent by extracting module identity into a
**single source of truth** and generating documentation + packaging from one shared template.
A new **template repository** (`home-sweet-home-module-template`) ships a `module.config.yaml`
manifest plus tokenized templates; a `scaffold.mjs` script renders them into a fresh module
repo (with a `--check` mode so CI verifies generated files stay in sync with the config). A
**tools repository** (`home-sweet-home-tools`) provides the `homesweethome` CLI
(`create <module>`) and the `@sousa99/homesweethome-config` shared preset package (eslint/prettier/
tsconfig). The `procrastinator-tracker` repo is migrated in place as the reference module:
README "Part of Home Sweet Home" badges (placeholder link), YAML frontmatter, generated
package names, and a `setup.md`. **Backend and frontend are both optional (at least one
required)**: the backend is always a single dual-mode package (`--http` REST + `--mcp` MCP),
and the frontend is a single package covering SPA + Storybook + published components.
Runtime defaults (MCP name, DB file, SPA title, opencode key) remain hand-written per module.

Primary requirement: a single template, instantiated per module, that keeps docs, packaging,
tooling, and pipelines identical across all Home Sweet Home repos.

## Technical Context

**Language/Version**: Node.js 24 LTS, pnpm 11 (existing workspace). New code is plain Node
ESM (`.mjs`) — no build step needed for the scaffold script or CLI.

**Primary Dependencies**:
- Template repo: **none** beyond Node stdlib (`node:fs`, `node:path`, `node:process`). A
  minimal YAML parser is the only optional dependency decision to resolve in research (avoid
  adding a full YAML engine if a hand-rolled line parser suffices for a flat config schema).
- Tools repo (`homesweethome` CLI + `@sousa99/homesweethome-config`): stdlib + the CLI consumes the
  template repo over HTTPS/git; the config package ships flat eslint config (shared-config
  package pattern) + prettier + tsconfig presets.
- Reference migration: no new runtime dependencies for `procrastinator-tracker`; only
  generated-file updates (README, frontmatter, package-name fields, `setup.md`).

**Storage**: N/A — this feature generates files; the only "state" is the config file and the
rendered output it drives. Runtime storage (SQLite) is unchanged and hand-written.

**Testing**: The scaffold command's `--check` mode is the primary validation mechanism
(fails on drift between config and generated files). The CLI is validated via quickstart
scenarios. No new unit test suites required; existing Vitest suites remain untouched.

**Target Platform**: GitHub (template repo + `Use this template` + PRs); npm/GitHub Packages
for `@sousa99/homesweethome-config`; GHCR/GitHub Packages naming conventions referenced by the
generated publish script.

**Project Type**: docs/template scaffolding tooling (template repo), CLI + shared config
package (tools repo), plus a docs/packaging migration of an existing pnpm workspace module.

**Performance Goals**: Scaffold command completes a module render in under a few seconds;
`--check` runs in CI on every PR.

**Constraints**: Docs + packaging are config-driven; runtime defaults stay hand-written.
Backend is always a single dual-mode package; frontend is a single package (SPA + Storybook +
components); both are optional with at least one required. Umbrella link is a placeholder.
Personal-project scope — minimal tooling, no gold-plating (stdlib over frameworks). All
GitHub operations delegated to `github-helper`; agent never merges.

**Scale/Scope**: Three repositories; one template repo (templates + scaffold script), one
tools repo (CLI + config package), one reference module migration. Per-module instantiation
is designed to scale to any number of future Home Sweet Home modules.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Gate | Verdict | Justification |
|------|---------|---------------|
| I. Pragmatic Code Quality | PASS | The scaffold script is a small, boring file renderer; `--check` reuses the same render path (no duplication). YAGNI: tokens are a simple substitution, no template engine. |
| II. Automated Formatting | PASS | Existing Prettier config stays the single formatter; generated files are formatted by the same Prettier that the repo gates use, and `--check` enforces sync so formatting cannot drift. |
| III. Automated Linting | PASS | Existing ESLint untouched; the scaffold script and CLI are covered by the standard lint config. No new lint surface. |
| IV. Testable & Maintainable | PASS | Entities are small and cohesive: one config, one renderer, one check mode, one preset package. The reference module proves the template works end-to-end. |
| V. Living Documentation | PASS | Documentation is generated from the config and kept in sync by `--check`; `setup.md`, README, and frontmatter all update together. This feature *is* the documentation work. |
| Additional Constraints (Practicality) | PASS | Stdlib-only rendering; shared preset package is the standard "config package" pattern; GitHub template repos are a native feature — no bespoke scaffold framework. |
| Workflow & Quality Gates | PASS | `--check` runs in CI; the reference migration passes `pnpm lint/format/typecheck/test` before merge; PR format gate (feature/NNN-kebab-case) is respected by the branch name. |

**Complexity Tracking**: No constitution violations anticipated. Three repositories is
justified by the one-module-per-repo decision (the user explicitly rejected modules coexisting
in one repo): the template repo, the tools repo, and the module itself must be separate.

**Re-check after Phase 1 design**: PASS. The delivered design (research.md, data-model.md,
contracts/{module-config,templates,scaffold,config-package}.md, quickstart.md) introduces no
new app complexity: one small stdlib renderer, one read-only drift check, one thin CLI, one
shared preset package. The token system is a closed inventory with a single escape rule
(no template engine). The `yaml` package is the only new tooling dependency, and it is the
boring, standard choice. The reference module's runtime and quality gates are untouched —
only generated docs/packaging change, verified by `--check` in CI. All gates remain green.

## Project Structure

### Documentation (this feature)

```text
specs/005-module-docs-templatization/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/
│   ├── module-config.md # Phase 1: module.config.yaml schema contract
│   ├── templates.md     # Phase 1: template token contract + file inventory
│   ├── scaffold.md      # Phase 1: scaffold command + --check contract
│   └── config-package.md# Phase 1: @sousa99/homesweethome-config preset exports contract
├── spec.md              # Feature specification
├── checklists/          # Spec-quality checklist
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
# Template repo: sousa99/home-sweet-home-module-template
module.config.yaml          # NEW: single source of truth (module identity + package org + tech baseline)
README.md.tpl               # NEW: tokenized README (badges + frontmatter + module-specific sections)
AGENTS.md.tpl               # NEW: tokenized agent instructions (GitHub delegation, multi-phase rules)
setup.md.tpl                # NEW: setup, quality gates, pipelines, package org, good practices
docs/clarify.md.tpl         # NEW: foundational clarify — decisions to settle at module creation
package.json.tpl            # NEW: root package.json (name, description, scripts)
pnpm-workspace.yaml.tpl     # NEW: workspace packages + allowBuilds
tsconfig.base.json.tpl      # NEW: base TS compiler options
eslint.config.mjs.tpl       # NEW: flat ESLint config (consumes @sousa99/homesweethome-config)
prettier.config.mjs.tpl     # NEW: Prettier config (consumes @sousa99/homesweethome-config)
.gitignore.tpl              # NEW: standard ignores
backend/package.json.tpl    # NEW: backend package name @<scope>/<module>-backend
frontend/package.json.tpl   # NEW: frontend package name @<scope>/<module>-components (SPA + Storybook + components)
scripts/scaffold.mjs        # NEW: render templates from config; --check mode
scripts/apply-release-version.mjs.tpl  # NEW: release version sync
scripts/publish-artifacts.sh.tpl       # NEW: GHCR image names derived from config
.npmrc.tpl                 # NEW: npm scope mapping derived from config
Dockerfile.backend.tpl      # NEW: multi-stage backend image ({{BACKEND_IMAGE}})
Dockerfile.frontend.tpl     # NEW: multi-stage SPA image ({{SPA_IMAGE}})
deploy/nginx.spa.conf.tpl   # NEW: SPA fallback nginx server block
.releaserc.json.tpl         # NEW: semantic-release plugin chain
opencode.json.tpl           # NEW: GitHub MCP + github-helper subagent (module's own remote MCP hand-written)
.github/workflows/ci.yml.tpl       # NEW: standard CI pipeline (incl. scaffold --check)
.github/workflows/release.yml.tpl  # NEW: standard release pipeline
.github/PULL_REQUEST_TEMPLATE.md.tpl  # NEW: PR template
.specify/init-options.json.tpl   # NEW: Spec Kit init options
.specify/integration.json.tpl    # NEW: Spec Kit integration (opencode)
specs/000-module-readme.md.tpl   # NEW: module-level spec doc linking to setup.md + clarify

# Tools repo: sousa99/home-sweet-home-tools
packages/config/            # NEW: @sousa99/homesweethome-config (eslint flat preset, prettier, tsconfig)
packages/cli/               # NEW: homesweethome CLI (create <module> → template + scaffold)
pnpm-workspace.yaml         # NEW

# Reference module: sousa99/procrastinator-tracker (this repo, migrated in place)
module.config.yaml          # NEW: this module's identity
README.md                   # MODIFY: badges + frontmatter from template render
AGENTS.md                   # MODIFY: title/context from template render
setup.md                    # NEW: generated setup documentation
docs/clarify.md             # NEW: generated foundational clarify
package.json                # MODIFY: name/description sourced from config
backend/package.json        # MODIFY: package name sourced from config
frontend/package.json       # MODIFY: package name sourced from config
opencode.json               # MODIFY: GitHub MCP block from template; own remote MCP entry hand-written
```

**Structure Decision**: The template is a **standalone GitHub template repository** so each
module instantiates it via `Use this template` (GitHub copies the default branch; no
auto-sync — the intended one-module-per-repo model). Templates live at the root of that repo
as `.tpl` files mirroring the final module layout, so the rendered output path equals the
source path minus the `.tpl` suffix. The tools repo is a separate pnpm workspace with
`packages/config` and `packages/cli`, versioned together. The reference module adopts the
generated layout in place.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

No violations to justify (see Constitution Check).

## Phase 0: Research (research.md)

Resolve the remaining technical decisions (full detail in `research.md`):

- **Template token syntax**: `{{UPPER_SNAKE}}` simple substitution vs a template engine —
  decision favors minimal tokens with a documented escape rule.
- **Config schema & parsing**: flat `module.config.yaml` schema and whether to use a YAML
  parser dependency or a stdlib line parser.
- **Scaffold render + `--check`**: one render path reused for generate and drift-check.
- **GitHub template repo mechanics**: confirmed native behavior (copies default branch, no
  auto-sync, unrelated history).
- **Config preset package layout**: flat eslint config export + prettier + tsconfig base.
- **CLI design**: `homesweethome create <module>` clone-and-scaffold flow.
- **Umbrella badge block**: shields.io "Part of Home Sweet Home" badges with placeholder link.
- **Expanded scaffold surface**: `.specify/` Spec Kit setup + `docs/clarify.md` foundational
  clarify, CI/CD pair, Dockerfiles, release config, scripts, `opencode.json` (GitHub MCP +
  github-helper; module's own remote MCP hand-written), and standard tooling files —
  everything a module repo needs except application runtime code.

## Phase 1: Design (data-model.md, contracts/, quickstart.md)

- **data-model.md**: The **ModuleConfig** entity (identity fields, package organization,
  tech baseline, umbrella link), the **TemplateFile** entity (path, token set, escape rule),
  the **GeneratedModuleFile** entity (rendered output, drift-check lifecycle), and the
  **ConfigPreset** entity (eslint/prettier/tsconfig exports).
- **contracts/module-config.md**: `module.config.yaml` schema — required fields, types,
  validation rules, and the derived naming conventions (`backend` dual-mode; `frontend`
  covering SPA + Storybook + components).
- **contracts/templates.md**: token inventory, substitution rules, escape mechanism for
  literal `{{...}}` inside code blocks, the `.tpl` → output path mapping, and the full
  template inventory (docs, packaging, CI/CD, Dockerfiles, scripts, tooling config, Speck Kit
  setup, clarify doc).
- **contracts/scaffold.md**: `scaffold.mjs` command schema (render/`--check`), exit codes,
  and CLI `homesweethome create <module>` behavior.
- **contracts/config-package.md**: `@sousa99/homesweethome-config` exports and how modules consume
  the presets.
- **quickstart.md**: Runnable validation — scaffold a scratch module, assert zero leftover
  tokens, mutate a generated file and see `--check` fail, restore and pass, verify presets in
  two scratch projects, confirm backend-only/frontend-only modules skip the absent side, and
  confirm the reference module is in sync.