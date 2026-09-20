# Contract: Templates

The template file contract — token inventory, substitution rules, escape mechanism, and the
`.tpl` → output path mapping (FR-002, FR-003, FR-004).

## File naming and output mapping

- Template files end in `.tpl`.
- The generated output path is the template path **minus** the `.tpl` suffix.
- A template whose output is a directory tree mirrors that tree (e.g.
  `.github/workflows/ci.yml.tpl` → `.github/workflows/ci.yml`).
- `module.config.yaml` is itself rendered: the template repo's example config is the template
  input, and a module repo commits its filled config (which then drives `--check`).

## Token syntax

- Tokens are `{{UPPER_SNAKE_CASE}}`: `^[A-Z][A-Z0-9_]*$` between `{{` and `}}`.
- Every token corresponds to a config field or a derived value (see
  [module-config.md](module-config.md)).

## Token inventory

| Token | Source |
|-------|--------|
| `{{MODULE_NAME}}` | `module_name` |
| `{{MODULE_SLUG}}` | `module_slug` |
| `{{MODULE_DESCRIPTION}}` | `module_description` |
| `{{NPM_SCOPE}}` | `npm_scope` |
| `{{REPO_OWNER}}` | `repo_owner` |
| `{{REPO_NAME}}` | `repo_name` |
| `{{GHCR_ORG}}` | `ghcr_org` |
| `{{UMBRELLA_LINK}}` | `umbrella_link` |
| `{{STACK_BACKEND}}` | `stack.backend` |
| `{{STACK_FRONTEND}}` | `stack.frontend` |
| `{{STACK_TOOLING}}` | `stack.tooling` |
| `{{BACKEND_PACKAGE}}` | derived: `@<scope>/<slug>-backend` |
| `{{FRONTEND_PACKAGE}}` | derived: `@<scope>/<slug>-components` |
| `{{BACKEND_IMAGE}}` | derived: `<ghcr_org>/<slug>-backend` |
| `{{SPA_IMAGE}}` | derived: `<ghcr_org>/<slug>-frontend` |
| `{{NPM_SCOPE_MAPPING}}` | derived: `@<scope>:registry=...` |
| `{{MCP_SERVER_NAME}}` | derived: `<slug>` (docs only) |
| `{{HTTP_ENTRY}}` / `{{MCP_ENTRY}}` | `backend.http_entry` / `backend.mcp_entry` |
| `{{THEME_PRIMARY}}` | `theme.primary` (default `#d97706`) |
| `{{THEME_FONT_SANS}}` | `theme.font_sans` (default = reference font-sans) |

This is a **closed inventory**: a template may only use tokens from this table (or escaped
literals). Anything else is an unresolved token and fails the render/check.

## Conditional directive

Single-file sections can be included/excluded per package with:

```text
{{#if backend}}  ...  {{/if}}
{{#if frontend}} ...  {{/if}}
```

The renderer strips a non-matching block (including its markers) before token substitution.
Used for the README's backend/frontend sections and the root `package.json.tpl` scripts, so a
backend-only module renders a README/package.json with no frontend content (and vice versa).

## Substitution rules

1. The renderer scans each template file for token matches.
2. Each match is replaced with the config value (or derived value).
3. Substitution **applies inside fenced code blocks** — README code examples containing
   `@{{NPM_SCOPE}}/{{MODULE_SLUG}}-components` must render real values.
4. After substitution, any remaining `{{...}}` that is not a literal escape is an
   **unresolved token** → render/`--check` fails, listing the file and token.

## Escape mechanism

- `\{{TOKEN}}` in a template renders as the literal `{{TOKEN}}` (backslash consumed).
- A token not in the inventory can be emitted literally as `\{{ANYTHING}}` — the escape
  collapses `\{{` → `{{` and leaves the rest untouched.
- Rationale: authors can emit literal brace text (e.g. example JSON containing
  `{{MCP_SERVER_NAME}}` placeholders that are not tokens) deterministically.

## Render mode vs check mode

- **render** (writes): every template in the module's enabled package set is rendered; output
  files written; unresolved token or invalid config → non-zero exit, no partial writes (atomic:
  render all in memory, then write).
- **`--check`** (no writes): render all in memory, compare to disk; report every
  `drifted` / `missing` / `unexpected` file; exit 0 iff all `in_sync`.

## Template inventory (the "single template" surface)

The template scaffolds **as much of a module repo as possible** — documentation, packaging,
publishing, CI/CD, Dockerfiles, agent/tooling config, Spec Kit setup, and a foundational
clarify doc. Runtime application defaults (MCP server name, DB filename, SPA title, module's
own MCP entry in `opencode.json`) stay hand-written per module (FR-012); everything below is
config-driven.

| Template | Output | Purpose |
|----------|--------|---------|
| `module.config.yaml` | module config | committed identity (drives `--check`) |
| `README.md.tpl` | README.md | badges + frontmatter + module-specific sections (FR-003) |
| `AGENTS.md.tpl` | AGENTS.md | agent instructions (GitHub delegation, multi-phase rules) |
| `setup.md.tpl` | setup.md | setup, gates, pipelines, package org, good practices (FR-005) |
| `docs/clarify.md.tpl` | docs/clarify.md | **foundational clarify**: decisions to settle when creating a module (runtime defaults, tech variants, registries) |
| `package.json.tpl` | package.json | root package name/description/scripts |
| `backend/package.json.tpl` | backend/package.json | `@<scope>/<slug>-backend` (FR-004) |
| `frontend/package.json.tpl` | frontend/package.json | `@<scope>/<slug>-components` (SPA + Storybook + components) (FR-004) |
| `frontend/src/index.css.tpl` | frontend/src/index.css | Tailwind v4 `@theme` using `{{THEME_PRIMARY}}`/`{{THEME_FONT_SANS}}` |
| `frontend/src/lib/utils.ts.tpl` | frontend/src/lib/utils.ts | `cn()` class-merge helper |
| `frontend/src/components/ui/button.tsx.tpl` | button.tsx | shadcn-style `Button` (theme-consistent) |
| `frontend/src/components/ui/badge.tsx.tpl` | badge.tsx | shadcn-style `Badge` |
| `frontend/src/components/ui/card.tsx.tpl` | card.tsx | shadcn-style `Card` + subcomponents |
| `frontend/src/components/ui/input.tsx.tpl` | input.tsx | shadcn-style `Label`/`Input`/`Textarea`/`Select` |
| `frontend/vite.config.ts.tpl` | vite.config.ts | SPA build + `@tailwindcss/vite` + `/api` proxy |
| `frontend/vite.lib.config.ts.tpl` | vite.lib.config.ts | components-library build (dist-lib) |
| `pnpm-workspace.yaml.tpl` | pnpm-workspace.yaml | workspace packages + allowBuilds |
| `tsconfig.base.json.tpl` | tsconfig.base.json | base TS compiler options |
| `eslint.config.mjs.tpl` | eslint.config.mjs | flat ESLint config (consumes `@sousa99/homesweethome-config`) |
| `prettier.config.mjs.tpl` | prettier.config.mjs | Prettier config (consumes `@sousa99/homesweethome-config`) |
| `.gitignore.tpl` | .gitignore | standard ignores (deps, dist, db, env, tooling) |
| `.npmrc.tpl` | .npmrc | scope mapping |
| `Dockerfile.backend.tpl` | Dockerfile.backend | multi-stage backend image (`{{BACKEND_IMAGE}}`) |
| `Dockerfile.frontend.tpl` | Dockerfile.frontend | multi-stage SPA image (`{{SPA_IMAGE}}`) |
| `deploy/nginx.spa.conf.tpl` | deploy/nginx.spa.conf | SPA fallback nginx server block |
| `scripts/apply-release-version.mjs.tpl` | scripts/apply-release-version.mjs | writes release version to all package.json |
| `scripts/publish-artifacts.sh.tpl` | scripts/publish-artifacts.sh | GHCR image names |
| `.releaserc.json.tpl` | .releaserc.json | semantic-release plugin chain |
| `.github/workflows/ci.yml.tpl` | ci.yml | standard CI incl. `scaffold --check` (FR-006, FR-007) |
| `.github/workflows/release.yml.tpl` | release.yml | standard release pipeline |
| `.github/PULL_REQUEST_TEMPLATE.md.tpl` | PR template | guided PR body |
| `opencode.json.tpl` | opencode.json | GitHub MCP setup + `github-helper` subagent config; the module's own remote MCP entry is a hand-written placeholder |
| `.specify/init-options.json.tpl` | .specify/init-options.json | Spec Kit init options |
| `.specify/integration.json.tpl` | .specify/integration.json | Spec Kit integration (opencode) |
| `.vscode/settings.json.tpl` | .vscode/settings.json | IDE/TypeScript parity settings |
| `.prettierignore.tpl` | .prettierignore | module prettier ignores (tracks as a generated file) |
| `specs/000-module-readme.md.tpl` | specs/000-module-readme.md | module-level spec doc linking to `setup.md` + clarify |

## Skipping templates per `packages`

- `backend` absent → skip backend templates (`backend/package.json.tpl`,
  `Dockerfile.backend.tpl`, `scripts/publish-artifacts.sh.tpl` backend section) and the
  backend section of the README.
- `frontend` absent → skip frontend templates (`frontend/**`, `Dockerfile.frontend.tpl`,
  `deploy/nginx.spa.conf.tpl`) and the frontend section of the README.
- At least one of `backend`/`frontend` is always present (a Home Sweet Home module ships at
  least one).
- Skipped templates must not leave `missing` files in `--check` — the renderer derives the
  enabled set from the config.