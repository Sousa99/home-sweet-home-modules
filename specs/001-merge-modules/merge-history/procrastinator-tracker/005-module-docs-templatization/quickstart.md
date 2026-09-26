# Quickstart: Module Docs Templatization

Runnable validation guide for feature 005. Proves the scaffold render, the `--check` drift
detection, the CLI bootstrap, the preset package, and the reference-module migration. See
[contracts/module-config.md](contracts/module-config.md),
[contracts/templates.md](contracts/templates.md),
[contracts/scaffold.md](contracts/scaffold.md), and
[contracts/config-package.md](contracts/config-package.md) for the contracts referenced here.

## Prerequisites

- Node 24, pnpm 11.
- The template repo available locally (clone of `sousa99/home-sweet-home-module-template`)
  with `module.config.yaml` and the `.tpl` templates present.
- For CLI scenarios: the tools repo (`sousa99/home-sweet-home-tools`) built/available.

## 1. Scaffold a scratch module (SC-001, SC-002)

In a temp directory, copy the template repo and fill only `module.config.yaml`:

```bash
git clone <template-repo> scratch-module
cd scratch-module
# edit module.config.yaml: module_name, module_slug, npm_scope, repo_owner,
# repo_name, ghcr_org, packages, stack, umbrella_link
node scripts/scaffold.mjs
```

**Expected**:

- All `.tpl` files render into their output paths (`README.md`, `AGENTS.md`, `setup.md`,
  `package.json`, `backend/package.json`, `frontend/package.json`, `scripts/publish-artifacts.sh`,
  `.npmrc`, `.github/workflows/*.yml`, `.github/PULL_REQUEST_TEMPLATE.md`).
- The README shows the "Part of Home Sweet Home" badge row, YAML frontmatter, and package
  names using the new module's values (FR-003, FR-004).
- No `{{...}}` tokens remain:

```bash
grep -rn '{{' README.md AGENTS.md setup.md package.json .npmrc .github 2>/dev/null || echo "no tokens"
```

**Expected**: `grep` finds nothing (SC-002).

## 2. Drift detection with `--check` (SC-003, FR-006)

Still in `scratch-module`:

```bash
node scripts/scaffold.mjs --check   # expect: exit 0, all in_sync
# now break a generated file:
printf '\n# hand edit\n' >> README.md
node scripts/scaffold.mjs --check   # expect: exit 1, README.md reported as drifted
git checkout -- README.md
node scripts/scaffold.mjs --check   # expect: exit 0 again
```

**Expected**: `--check` is read-only (never writes — verify the file mtime is unchanged after
a failing run), reports the offending file, and passes again once restored (SC-003).

## 3. Invalid config / unresolved token rejection (FR-001)

```bash
# remove a required key (e.g. module_slug) from module.config.yaml
node scripts/scaffold.mjs           # expect: exit 1, names the missing key, writes nothing
# add an unknown token to README.md.tpl: "Hi {{UNKNOWN_TOKEN}}"
node scripts/scaffold.mjs           # expect: exit 1, README.md.tpl + unresolved token listed
```

**Expected**: render fails atomically (no partial writes) and reports the exact cause.

## 4. CLI bootstrap (`homesweethome create`) (FR-008)

```bash
homesweethome create sample-module --repo sousa99/sample-module
```

**Expected**: the CLI clones the template, collects identity, writes `module.config.yaml`,
runs the scaffold render, and prints the verify-and-push follow-up steps. The produced repo
passes `node scripts/scaffold.mjs --check`.

## 5. Preset package resolves identically (SC-006, FR-009)

In two independent scratch projects, install the tools repo's config package:

```bash
pnpm add -D @sousa99/homesweethome-config
# eslint.config.mjs:  import config from '@sousa99/homesweethome-config/eslint'; export default [...config]
# prettier.config.mjs: import config from '@sousa99/homesweethome-config/prettier'; export default config
# tsconfig.json:      { "extends": "@sousa99/homesweethome-config/tsconfig.base" }
pnpm lint && pnpm format && pnpm typecheck
```

**Expected**: both projects load the presets with **no local override**, and
`pnpm lint` / `pnpm format` / `pnpm typecheck` behave identically in both (SC-006).

## 6. Backend stays a single dual-mode package; frontend is one package (FR-011)

In the scratch module, inspect the generated README/package:

```bash
grep -i 'backend' README.md backend/package.json
grep -i 'components' README.md frontend/package.json
```

**Expected**: one `backend` package (e.g. `@sousa99/sample-module-backend`) exposing two
executions (`--http`, `--mcp`) — no `backend-rest`/`backend-mcp` split anywhere (FR-011).
One `frontend` package (e.g. `@sousa99/sample-module-components`) covering SPA + Storybook +
components (FR-004).

## 7. Backend-only and frontend-only modules skip the absent side

In a scratch module with `packages: [backend]`:

```bash
node scripts/scaffold.mjs
ls frontend 2>/dev/null || echo "no frontend dir"
node scripts/scaffold.mjs --check   # expect: exit 0
```

**Expected**: no frontend files are generated, no `missing`/`unexpected` reports in `--check`,
and the README omits the frontend section. Repeat with `packages: [frontend]` for the
symmetric case (no backend files).

## 8. Reference module is in sync (FR-010, SC-005)

In this repo (`procrastinator-tracker`) after the migration:

```bash
node scripts/scaffold.mjs --check   # expect: exit 0 — all generated files match module.config.yaml
```

**Expected**: the reference module passes `--check`, README carries the badge row +
frontmatter, `setup.md` exists (SC-004, SC-007), and package names follow the convention
(dual-mode `backend`; `frontend` covering SPA + Storybook + components).

## 9. Runtime defaults stay hand-written (FR-012)

**Expected (by inspection)**: `backend/src/mcp/index.ts` (MCP server name),
`backend/src/db/client.ts` (DB filename), `frontend/index.html` (SPA title), and
`opencode.json` (MCP key) are **not** produced by the scaffold and are not in
`module.config.yaml` — they remain hand-written per module (FR-012).

## Gate: full quality checks (pre-merge)

```bash
pnpm format
pnpm lint
pnpm typecheck
pnpm test
```

**Expected**: all green for the reference-module migration.

## References

- Config schema: [contracts/module-config.md](contracts/module-config.md)
- Template + token contract: [contracts/templates.md](contracts/templates.md)
- Scaffold + CLI contract: [contracts/scaffold.md](contracts/scaffold.md)
- Preset package contract: [contracts/config-package.md](contracts/config-package.md)
- Entity/model details: [data-model.md](data-model.md)
- Design decisions: [research.md](research.md)

## Validation results (2026-09-20)

Feature implemented across staged phases; the reference module (`procrastinator-tracker`) was
migrated in place as the first Home Sweet Home module. Results:

| Scenario | Result |
|----------|--------|
| §1 Scaffold a scratch module, zero leftover tokens, `--check` passes | ✓ (template repo, Stages 2–6) |
| §2 Drift detection: hand-edit → `--check` exit 1 → restore → exit 0 | ✓ |
| §3 Invalid config / unresolved token rejected atomically | ✓ |
| §4 `homesweethome create` CLI scaffolds a module that passes `--check` | ✓ (tools repo) |
| §5 Presets resolve identically in independent projects | ✓ (tools repo workspace) |
| §6 Backend single dual-mode; frontend one package (SPA+Storybook+components) | ✓ (grep confirmed) |
| §7 Backend-only / frontend-only modules skip the absent side | ✓ (Stages 3–5) |
| §8 Reference module in sync: `node scripts/scaffold.mjs --check` → exit 0 | ✓ |
| §9 Runtime defaults stay hand-written (not in `module.config.yaml`) | ✓ |
| Gate: `pnpm format` / `lint` / `typecheck` / `test` | ✓ all green (64 tests) |