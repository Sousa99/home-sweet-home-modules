# Data Model: Module Docs Templatization

Phase 1 output for `specs/005-module-docs-templatization`. Entities involved in the
scaffold-and-check lifecycle, the config schema, and the preset package. This is a
file-rendering model (no database); "persistence" is files on disk.

## Overview

The feature has four entities:

1. **ModuleConfig** — the single source of truth describing one module.
2. **TemplateFile** — a `.tpl` file with placeholder tokens.
3. **GeneratedModuleFile** — the rendered output committed in a module repo.
4. **ConfigPreset** — the shared tooling presets in `@sousa99/homesweethome-config`.

```
ModuleConfig (module.config.yaml)
        │  drives
        ▼
TemplateFile (templates/*.tpl) ──render──▶ GeneratedModuleFile (module repo)
        │                                        ▲
        │                                        │ --check compares
        └────── ConfigPreset (@sousa99/homesweethome-config) ── consumed by ──┘
```

## Entity: ModuleConfig

The `module.config.yaml` file — the sole source of truth for a module's identity (FR-001).
See [contracts/module-config.md](contracts/module-config.md) for the full schema.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `module_name` | string | Yes | Display name, e.g. `Procrastinator Tracker` |
| `module_slug` | string | Yes | kebab-case slug, e.g. `procrastinator-tracker` |
| `module_description` | string | Yes | One-line description used in README + package.json |
| `npm_scope` | string | Yes | npm scope without `@`, e.g. `sousa99` |
| `repo_owner` | string | Yes | GitHub owner, e.g. `sousa99` |
| `repo_name` | string | Yes | Repository name (equals `module_slug` for modules) |
| `ghcr_org` | string | Yes | GHCR namespace, e.g. `ghcr.io/sousa99` (owner prefix + registry) |
| `packages` | list[string] | Yes | Packages shipped (both optional, ≥1): `backend`, `frontend` |
| `stack` | map[string→string] | Yes | Technology baseline per layer (backend/frontend/tooling) |
| `umbrella_link` | string | Yes | Home Sweet Home hub link (placeholder until org exists) |
| `backend` | map | Optional | Backend display values used only in docs (e.g. port, entry names) |
| `mcp_server_name` | string | No | Only if present in docs — **not** wired into runtime code |
| `db_filename` | string | No | Only if present in docs — **not** wired into runtime code |
| `spa_title` | string | No | Only if present in docs — **not** wired into runtime code |
| `theme` | map | No | Styling theme: `primary` (default `#d97706`), `font_sans` (default = reference font-sans) |

**Validation rules** (FR-001):
- All `Required: Yes` fields must be present and non-empty, else render fails.
- `module_slug` must match `^[a-z0-9]+(-[a-z0-9]+)*$` (kebab-case; drives package names).
- `npm_scope` must match `^[a-z0-9]+$` (no `@`, no hyphens) — npm scopes are alphanumeric.
- `packages` values must be a subset of `{backend, frontend}`;
  at least one entry required.
- `stack` must be a non-empty mapping with `backend`, `frontend`, `tooling` keys recommended.

**Derived names** (computed, not stored):
- Backend package: `@<npm_scope>/<module_slug>-backend`
- Frontend package: `@<npm_scope>/<module_slug>-components`
- Backend GHCR image: `<ghcr_org>/<module_slug>-backend`
- SPA GHCR image: `<ghcr_org>/<module_slug>-frontend`
- npm scope mapping in `.npmrc`: `@<npm_scope>:registry=https://npm.pkg.github.com/`

## Entity: TemplateFile

A `.tpl` file in the template repo. Each maps to exactly one generated output file by
stripping the `.tpl` suffix. See [contracts/templates.md](contracts/templates.md).

| Attribute | Description |
|-----------|-------------|
| `path` | Template path, e.g. `README.md.tpl` |
| `output_path` | Derived: `path` minus `.tpl`, e.g. `README.md` |
| `tokens` | The set of `{{TOKEN}}` placeholders appearing in the file |
| `escape` | `\{{TOKEN}}` sequences that render as literal `{{TOKEN}}` |

**Lifecycle / state transitions**:
- **Source**: authored in the template repo.
- **Rendered**: scaffold consumes the config + template → GeneratedModuleFile.
- **Never mutated in place by the scaffold** — templates are read-only inputs.

**Representative inventory** (defined in full in the template repo):
`module.config.yaml`, `README.md.tpl`, `AGENTS.md.tpl`, `setup.md.tpl`,
`docs/clarify.md.tpl` (foundational clarify), `package.json.tpl` (root),
`backend/package.json.tpl`, `frontend/package.json.tpl` (frontend package: SPA + Storybook +
components), `pnpm-workspace.yaml.tpl`, `tsconfig.base.json.tpl`, `eslint.config.mjs.tpl`,
`prettier.config.mjs.tpl`, `.gitignore.tpl`, `.npmrc.tpl`, `Dockerfile.backend.tpl`,
`Dockerfile.frontend.tpl`, `deploy/nginx.spa.conf.tpl`, `scripts/apply-release-version.mjs.tpl`,
`scripts/publish-artifacts.sh.tpl`, `.releaserc.json.tpl`, `.github/workflows/ci.yml.tpl`,
`.github/workflows/release.yml.tpl`, `.github/PULL_REQUEST_TEMPLATE.md.tpl`,
`opencode.json.tpl` (GitHub MCP + github-helper; module's own remote MCP entry stays
hand-written), `.specify/init-options.json.tpl`, `.specify/integration.json.tpl`,
`specs/000-module-readme.md.tpl`.

**Validation rules**:
- A template must not reference a token not defined by the config (render fails).
- Token names are `^[A-Z][A-Z0-9_]*$`.
- `module.config.yaml` is itself a rendered template so a module can carry a filled copy
  (the module's committed config drives future `--check` runs).

## Entity: GeneratedModuleFile

The committed, rendered output in a module repo. The object of `--check`.

| Attribute | Description |
|-----------|-------------|
| `path` | Output path in the module repo, e.g. `README.md` |
| `expected_content` | What the renderer produces from the module's committed config |
| `actual_content` | What is currently on disk |
| `state` | `in_sync` / `drifted` / `missing` / `unexpected` |

**Lifecycle / state transitions**:
- **created**: first `render`.
- **in_sync**: on-disk content equals render output.
- **drifted**: on-disk content differs from render output (hand-edit, stale config).
- **missing**: file should exist per config but is absent.
- **unexpected**: file exists that the renderer would not produce for this config
  (e.g. frontend templates left behind in a backend-only module).

**State transitions**:
```
created ──┐
          ▼
        in_sync ──(hand edit / config change)──▶ drifted
          ▲                                            │
          └──────(re-render or restore)───────────────┘
```

**Validation rules**:
- `--check` must be a no-write operation (FR-006) — it reports state and exits non-zero on
  any non-`in_sync` file, never modifying disk.
- Expected content is derived only from the committed `module.config.yaml` and the template
  files — no ambient state.

## Entity: ConfigPreset

The shared tooling presets shipped by `@sousa99/homesweethome-config` (tools repo). See
[contracts/config-package.md](contracts/config-package.md).

| Attribute | Description |
|-----------|-------------|
| `package_name` | `@sousa99/homesweethome-config` |
| `eslint_preset` | Flat-config export (JS/TS + Node/React-aware), mirroring the reference module |
| `prettier_preset` | Prettier options matching the reference module's config |
| `tsconfig_base` | TypeScript base compiler options matching the reference repo's `tsconfig.base.json` |
| `consumers` | Module repos that install the package and import the presets |

**Validation rules**:
- The presets must resolve identically in any consuming project (SC-006) — no
  environment-specific values.
- The presets must not require local override to load (spec US4 acceptance scenario).

## Relationships

- **ModuleConfig → TemplateFile**: one config drives many templates (1:N).
- **TemplateFile → GeneratedModuleFile**: one template produces one output (1:1).
- **ModuleConfig → GeneratedModuleFile**: the config's committed copy is the source of truth
  for `--check` (1:N).
- **ConfigPreset → module repos**: consumed by any module that installs the package (N:M).