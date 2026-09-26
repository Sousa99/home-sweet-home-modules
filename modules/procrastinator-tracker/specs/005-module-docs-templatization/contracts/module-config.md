# Contract: Module Config (`module.config.yaml`)

The `module.config.yaml` schema — the single source of truth for a module's identity
(FR-001). Consumed by the scaffold renderer ([scaffold.md](scaffold.md)) to produce all
documentation and packaging.

## Location

- **Template repo**: `module.config.yaml` at the repository root, shipped as a filled-in
  example (values for a "template module").
- **Module repo**: a committed copy at the repository root, filled with the module's real
  identity. This committed copy is the source of truth for `--check`.

## Schema

```yaml
# Identity
module_name:            # string, required — display name, e.g. "Procrastinator Tracker"
module_slug:            # string, required — kebab-case, e.g. "procrastinator-tracker"
module_description:     # string, required — one line for README + package.json

# Registries / ownership
npm_scope:              # string, required — alphanumeric, no "@", e.g. "sousa99"
repo_owner:             # string, required — GitHub owner, e.g. "sousa99"
repo_name:              # string, required — repository name, e.g. "procrastinator-tracker"
ghcr_org:               # string, required — registry + owner, e.g. "ghcr.io/sousa99"

# Package organization (both optional, at least one required)
packages:               # list[string], required, 1-2 entries from backend / frontend
  - backend
  - frontend

# Technology baseline (rendered into README stack table + setup.md)
stack:
  backend:              # string, required — e.g. "Node 24, Hono, Drizzle ORM, SQLite"
  frontend:             # string, required — e.g. "Vite, React 19, Tailwind CSS v4"
  tooling:              # string, required — e.g. "pnpm 11, TypeScript, ESLint, Prettier, Vitest"

# Umbrella identity
umbrella_link:          # string, required — Home Sweet Home hub link (placeholder until org)

# Styling theme (optional; defaults match the Home Sweet Home reference theme)
theme:
  primary:              # string, optional — CSS color, default "#d97706" (amber)
  font_sans:            # string, optional — CSS font stack, default = reference font-sans

# Docs-only backend display values (never wired into runtime code)
backend:
  http_entry:           # string, optional — e.g. "--http"
  mcp_entry:            # string, optional — e.g. "--mcp"
```

## Validation rules

| Field | Rule |
|-------|------|
| `module_name` | required, non-empty |
| `module_slug` | required; `^[a-z0-9]+(-[a-z0-9]+)*$` |
| `module_description` | required, non-empty |
| `npm_scope` | required; `^[a-z0-9]+$` |
| `repo_owner` | required, non-empty |
| `repo_name` | required, non-empty |
| `ghcr_org` | required; must match `^ghcr\.io/[a-z0-9]+$` (registry + owner) |
| `packages` | required; subset of `{backend, frontend}`; ≥ 1 entry |
| `stack.backend` / `stack.frontend` / `stack.tooling` | required, non-empty |
| `umbrella_link` | required; valid URL form |
| `theme.primary` | optional; any CSS color value |
| `theme.font_sans` | optional; any CSS font stack |

Any violation aborts render (and `--check`) with a message naming the offending key (FR-001,
SC-002).

## Derived values (computed, not stored)

| Derivation | Formula |
|------------|---------|
| Backend package name | `@<npm_scope>/<module_slug>-backend` |
| Frontend package name | `@<npm_scope>/<module_slug>-components` |
| Backend GHCR image | `<ghcr_org>/<module_slug>-backend` |
| SPA GHCR image | `<ghcr_org>/<module_slug>-frontend` |
| npm scope mapping | `@<npm_scope>:registry=https://npm.pkg.github.com/` |
| MCP server display name | `<module_slug>` (docs only) |

## Token exposure

Every field and derived value is exposed to templates as an `{{UPPER_SNAKE_CASE}}` token.
The exact token inventory is in [templates.md](templates.md).

## Edge cases

- A backend-only module omits `frontend` from `packages`; the renderer skips frontend
  templates (no dead files). A frontend-only module omits `backend` and skips backend
  templates.
- `umbrella_link` is a placeholder (`https://github.com/`) until a GitHub org exists; flipping
  it and re-rendering updates every module.