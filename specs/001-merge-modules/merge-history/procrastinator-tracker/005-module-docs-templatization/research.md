# Research: Module Docs Templatization

Phase 0 output for `specs/005-module-docs-templatization`. Resolves the technical unknowns in
the plan's Technical Context. Every decision records **Decision / Rationale / Alternatives
considered**.

## 1. Template token syntax

**Decision**: Use **`{{UPPER_SNAKE_CASE}}`** tokens (e.g. `{{MODULE_NAME}}`,
`{{NPM_SCOPE}}`, `{{GHCR_ORG}}`) with simple string substitution, plus an **escape rule**:
`\{{TOKEN}}` renders the literal `{{TOKEN}}` and a token inside a fenced code block is **not**
substituted unless its surrounding context matches a template placeholder. The scaffold
renderer walks known template files and replaces every exact `{{TOKEN}}` match that exists in
the config; any `{{...}}` not present in the config is treated as an **unresolved token** and
fails the render (in render mode) or the check (in `--check` mode).

**Rationale**: No template engine is needed for flat, single-pass substitution of ~15 tokens.
The syntax is instantly recognizable, greppable (`grep -r '{{'`), and unambiguous. Treating
unknown tokens as errors is the mechanism that guarantees SC-002 (no unresolved tokens in any
generated repo) and makes drift impossible to hide. The escape rule (`\{{...}}`) covers the
README's JSON examples where literal `{{MCP_SERVER_NAME}}`-style text might otherwise
collide; because templates are finite and versioned, the token set is a closed inventory
(documented in [contracts/templates.md](contracts/templates.md)).

**Alternatives considered**: Handlebars/mustache engines — dependency + syntax surface for
two dozen substitutions, violates the minimal-tooling constraint; regex-replace over the
whole tree — risks corrupting the scaffold script itself and has no clear escape semantics;
per-file frontmatter with no central config — defeats the single-source-of-truth requirement.

## 2. `module.config.yaml` schema and parsing

**Decision**: A **flat YAML** file `module.config.yaml` at the template/module repo root with
~15 top-level keys (module name, slug, description, npm scope, repo owner, repo name, GHCR
org, package organization, technology baseline, umbrella link, MCP/DB/SPA display strings for
docs only). Parsed by the scaffold script.

**Decision on parser**: Use **`yaml` (the `eemeli/yaml` npm package)** as a dev dependency of
the template repo's scaffold tooling — a small, standard, well-maintained YAML 1.2 parser —
rather than a hand-rolled line parser.

**Rationale**: A flat schema is simple, but YAML still has quoting/escaping subtleties
(anchor names, colons in values, list syntax for the package organization) that a hand-rolled
parser would get wrong silently. The `yaml` package is a single, boring, widely-used
dependency (the same category as the repo's existing tooling choices). Keeping the schema
flat (no nesting beyond a `packages` list and a `stack` mapping) keeps validation
trivial — required-key presence plus type checks.

**Alternatives considered**: JSON — YAML is friendlier for hand-authored docs config and
supports comments; TOML — less common in the JS ecosystem and adds a less-standard parser;
hand-rolled parser — fragile YAML edge cases, no validator, rejects the "boring tool" rule.
A flat schema (vs nested) was chosen so validation is a closed set of required keys.

## 3. Scaffold render + `--check` mode

**Decision**: `scripts/scaffold.mjs` with two modes sharing **one render path**:

- `node scripts/scaffold.mjs render` — reads `module.config.yaml`, renders every `.tpl` file
  into its output path (`.tpl` suffix stripped), writes files. Fails on any unresolved token
  or missing required config key.
- `node scripts/scaffold.mjs --check` — runs the render in memory and compares each output
  to the on-disk file; exits non-zero listing every drifted/added/missing file. **Never
  writes.**

Both modes use the same `render(config, templatePath)` function, so a file that renders
correctly by definition passes `--check` unless hand-edited — which is exactly the drift
`--check` exists to catch (SC-003).

**Rationale**: Reusing one render path eliminates the classic generate-vs-verify divergence
(a check that re-implements logic inevitably drifts from the generator). `--check` is pure
and safe to run in CI on every PR (FR-006). Failing the render on unresolved tokens makes
"works locally, broken in CI" impossible.

**Alternatives considered**: A separate linter that regex-scans for leftover `{{...}}` — a
weaker check that cannot catch semantic drift (e.g. a stale package name that happens to
contain no braces); generating into a temp dir and diffing — same result with more
filesystem plumbing.

## 4. GitHub template repo mechanics

**Decision**: The template lives in a **GitHub template repository**
(`sousa99/home-sweet-home-module-template`, created with `is_template: true`). New modules are
created via **`Use this template`** (the GitHub UI/API copies the default branch into a new
repo). The `homesweethome create <module>` CLI automates the same flow (clone template →
scaffold).

**Rationale**: GitHub's native template-repo behavior is confirmed: creating a repo from a
template copies the default branch's directory structure and files into a new repository
with **unrelated history** and **no automatic sync** back to the template. That is exactly the
one-module-per-repo model — each module is an independent repo stamped from the same source,
and template updates do not silently overwrite a module (drift is instead caught by
`--check` against the module's own committed config). The template repo is the "single
template" the user asked for: editing its `.tpl` files and re-running the scaffold updates the
reference for all future modules.

**Alternatives considered**: A shared library that injects docs at build time — modules don't
build their docs, and it couples every module to the library; a git submodule/shared docs
repo — submodules add friction and the user wants self-contained module repos; forking every
module from one repo — forks carry history and a lasting upstream link, unlike templates.

## 5. Config preset package layout (`@sousa99/homesweethome-config`)

**Decision**: A **single npm package** `@sousa99/homesweethome-config` in the tools repo
(`packages/config`) that ships: an **ESLint flat config export** (JS/TS + React/Node-aware
presets mirroring the reference module's `eslint.config.mjs`), a **Prettier config export**
(defaults matching `prettier.config.mjs`), and a **TypeScript base tsconfig** (matching
`tsconfig.base.json`). Modules consume it by installing the package and extending/importing
the presets from their own small config files.

**Rationale**: This is the standard "shared config package" pattern (the same approach as
`eslint-config-prettier` and `@antfu/eslint-config`): one package is the single source of
tooling truth, modules keep a thin local `eslint.config.mjs`/`tsconfig.json` that imports the
presets and adds only module-specific overrides. Because presets and the CLI live in the same
tools repo, they version together (a config change ships with the CLI that scaffolds it),
guaranteeing a scaffolded module's tooling matches the config package it references (FR-009,
SC-006).

**Alternatives considered**: Separate per-tool packages (`@homesweethome/eslint`,
`@homesweethome/prettier`, `@homesweethome/tsconfig`) — more publish/churn surface for no
benefit at this scale; a template that hardcodes the tooling files — drifts across modules and
breaks the "single source of tooling truth" goal; a preset published to the npm registry from
the template repo — splits versioning between the template and the tools that consume it.

## 6. CLI design (`homesweethome create <module>`)

**Decision**: A `homesweethome` CLI (tools repo, `packages/cli`) with a single first command:
`homesweethome create <module-name> [--repo <owner/repo>]`. It clones (or `gh repo create`
from) the template repo into a target directory, asks for/reads the module identity once, and
runs the template repo's `scaffold.mjs render` to produce the module repo, then prints the
follow-up steps (fill `module.config.yaml`, verify with `--check`, push).

**Rationale**: The CLI is the fast path that removes the two manual steps of the raw
"Use this template" flow (creating the repo, then filling the config) while remaining a thin
wrapper over the template + scaffold script — no duplicate logic. Keeping it in the tools repo
versioned with the config presets means a CLI release is always accompanied by the matching
presets and (via the template dependency) the matching scaffold.

**Alternatives considered**: No CLI (UI-only template usage) — workable but slower and
inconsistent for power users; a heavy framework (commander/yargs) — unnecessary for one
command; a global npm binary that owns its own copy of the template — risks the template and
CLI drifting out of sync.

## 7. Umbrella badge block

**Decision**: The generated README frontmatter + a "Part of Home Sweet Home" badge row using
**shields.io static badges**, e.g.:

```markdown
![Part of Home Sweet Home](https://img.shields.io/badge/Home%20Sweet%20Home-Module-blue)
```

The umbrella link (`umbrella_link` in the config) is a **placeholder** by default
(`https://github.com/` until a GitHub org or hub exists, per spec assumptions), and the badge
block links to it.

**Rationale**: shields.io static badges are dependency-free, render consistently, and need no
service to keep alive. The placeholder link matches the user's explicit choice ("Placeholder
link only") and is a single config key to flip when the org exists — re-running the scaffold
updates every module at once (FR-003, SC-004).

**Alternatives considered**: Dynamic badges from a live API — requires an org/service to exist;
inline SVG/HTML in the README — not rendered by GitHub safely and harder to keep consistent;
omitting the link — the user asked for badges *and* links, so the badge row links to the
placeholder.

## 8. Package organization (backend + frontend, both optional)

**Decision**: Backend and frontend are **both optional** (at least one required). The backend
is **one package** `@<scope>/<module>-backend` exposing **two executions** (`--http` REST and
`--mcp` MCP). The frontend is **one package** `@<scope>/<module>-components` producing three
artifacts: the **SPA app**, the **Storybook workbench**, and the **published components
library**. The `module.config.yaml` `packages` list enumerates which of the two a module
ships (so a backend-only module omits the frontend package and the frontend templates are
skipped, and vice versa — the edge case in the spec).

**Rationale**: This encodes the user's explicit constraints: the backend is always a single
dual-mode module with two executions, never split into `backend-rest`/`backend-mcp`; and the
frontend is a single unit whose SPA, Storybook, and components publish always exist together
— matching the existing reference module (one `frontend` package with `build`,
`build-storybook`, and `build:lib` targets). The config-driven `packages` list keeps the
template generic while making the reference module the concrete first instance.

**Alternatives considered**: `backend-rest` + `backend-mcp` as separate packages — explicitly
rejected by the user; `frontend-spa` + `frontend-components` as separate packages — rejected:
the user confirmed the frontend is one package producing SPA + Storybook + components
together; a fixed two-package layout in the template — too rigid (a backend-only or
frontend-only module would carry dead templates).

## 9. Escaping literal `{{...}}` in generated code examples

**Decision**: Renderer rule — **tokens inside fenced code blocks are substituted like any
other text** (the README's real package-name examples *should* be substituted), while
**literal** `{{...}}` text that must survive is written in templates as `\{{...}}` and the
renderer collapses `\{{` → `{{` (standard escape-and-unescape). Unresolved `{{...}}` (not in
the config, not escaped) fails the render/check.

**Rationale**: The spec's edge case (a JSON example containing `{{MCP_SERVER_NAME}}` that
must not be confused with a token) is handled by the escape mechanism, giving authors a
deterministic way to emit literal braces. Substituting inside code fences is required so that
the README's `import { X } from '@{{NPM_SCOPE}}/{{MODULE_SLUG}}-components'` renders real
values — blanket code-fence skipping would break the primary use case.

**Alternatives considered**: Skipping substitution inside all fenced blocks — breaks real
examples; requiring all code examples to be pulled from external files — overkill for READMEs;
no escape mechanism — authors could never emit literal `{{...}}`.

## 10. Expanded scaffold surface (Speck Kit setup, CI/CD, Dockerfiles, tooling config)

**Decision**: The template scaffolds **as much of a module repo as possible**, not just docs:
`.specify/` Spec Kit setup (`init-options.json`, `integration.json`, plus a `docs/clarify.md`
**foundational clarify** whose decisions are finalized at module-creation time), the full
CI/CD pair (`ci.yml` + `release.yml`, semantically identical across repos), release config
(`.releaserc.json`), Dockerfiles (`Dockerfile.backend`, `Dockerfile.frontend`,
`deploy/nginx.spa.conf`), scripts (`apply-release-version.mjs`, `publish-artifacts.sh`),
`AGENTS.md`, `opencode.json` (GitHub MCP + `github-helper` subagent; the module's **own**
remote MCP entry stays hand-written per FR-012), PR template, and the standard tooling files
(`pnpm-workspace.yaml`, `tsconfig.base.json`, `eslint.config.mjs`, `prettier.config.mjs`,
`.gitignore`).

**Rationale**: Every file a module repo needs that is not application runtime code is a
candidate for templatization — this is what makes repos "consistent and matching across
modules" (the user's core goal). The foundational clarify (`docs/clarify.md`) is generated
from the template with the module's config pre-filled and lists the few remaining decisions
(runtime defaults, tech variants) to settle at setup, so scaffolded repos arrive with a
setup checklist, not silent unknowns. CI/CD is a shared pipeline template so every module's
quality gates and release behavior are identical.

**Alternatives considered**: Templating only docs (README/AGENTS/setup) and leaving CI/CD +
tooling per-module — defeats the "consistent across repos" goal (CI drift is the most common
cross-repo divergence); embedding application runtime code in the template — rejected (FR-012,
runtime stays hand-written); requiring modules to manually re-run Speck Kit init — the
template's `.specify/` files + clarify doc make setup one command.

## Consolidated decisions

| # | Question | Decision |
|---|----------|----------|
| 1 | Token syntax | `{{UPPER_SNAKE_CASE}}` simple substitution; `\{{` escape; unknown `{{...}}` = error |
| 2 | Config + parser | Flat `module.config.yaml` (~15 keys); `yaml` npm package as template tooling dep |
| 3 | Render + check | One shared render path; `render` writes, `--check` compares in memory and never writes |
| 4 | Template delivery | GitHub template repo (native `Use this template`); CLI automates the same flow |
| 5 | Config presets | Single `@sousa99/homesweethome-config` (eslint flat + prettier + tsconfig), versioned with CLI |
| 6 | CLI | `homesweethome create <module>` thin wrapper over template + scaffold |
| 7 | Umbrella badge | shields.io static badge row; placeholder `umbrella_link`; single config key |
| 8 | Package org | Backend + frontend both optional (≥1); one dual-mode `backend` (`--http` REST + `--mcp` MCP); one `frontend` package (`@<scope>/<slug>-components`) producing SPA + Storybook + components; config-driven `packages` list |
| 9 | Literal braces | `\{{...}}` escape; substitution inside code fences is intended behavior |
| 10 | Expanded scaffold | Docs + packaging + `.specify/` setup + `docs/clarify.md` foundational clarify + CI/CD pair + Dockerfiles + scripts + `opencode.json` (GitHub MCP/github-helper; own remote MCP hand-written) + tooling files; runtime app defaults stay hand-written (FR-012) |