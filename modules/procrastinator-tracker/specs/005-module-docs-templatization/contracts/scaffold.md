# Contract: Scaffold Command & CLI

The `scaffold.mjs` command contract and the `homesweethome create <module>` CLI flow
(FR-002, FR-006, FR-007, FR-008).

## `scaffold.mjs` (template repo)

Location: `scripts/scaffold.mjs` in the template repo. Plain Node ESM (`.mjs`), Node 24.

### Invocation

```text
node scripts/scaffold.mjs            # render (default)
node scripts/scaffold.mjs --check     # drift check (read-only)
node scripts/scaffold.mjs --help
```

| Mode | Behavior |
|------|----------|
| `render` (default) | Read `module.config.yaml`, render the enabled template set in memory (see [templates.md](templates.md)), then write all output files. Atomic: validate + render everything before writing anything. |
| `--check` | Render in memory and compare each expected output to disk. Report a table of `in_sync` / `drifted` / `missing` / `unexpected`. **Never writes.** Exit 0 iff every expected file is `in_sync` and no unexpected files exist. |

### Exit codes

| Code | Meaning |
|------|---------|
| 0 | render succeeded / check passed |
| 1 | render failed (unresolved token, invalid config) / check found drift |
| 2 | usage error (bad flag) |

### Output on failure

`render` and `--check` print, for each problem: the **file path** and the **reason**
(e.g. `README.md.tpl: unresolved token {{FOO}}` or `README.md: drifted (expected X, got Y)`).
Render aborts before writing on any validation failure — no partial output (SC-002, SC-003).

### `--check` state rules

- `drifted` — file exists but content differs from render output. The report prints a
  line-based unified diff (expected render vs on-disk, first 20 differing lines + a count of
  the rest) so the drift cause is visible (e.g. a backend section on disk while the config is
  frontend-only).
- `missing` — file expected per config (enabled package set) but absent.
- `unexpected` — file present that the renderer would not produce for this config
  (e.g. leftover `backend/` files in a frontend-only module, or leftover `frontend/` files in
  a backend-only module).
- `in_sync` — file exists and matches exactly.

## Config requirements

- Required keys per [module-config.md](module-config.md). Missing/invalid key → exit 1 with
  the key named.
- The committed `module.config.yaml` in a module repo is the config used by `--check`, so
  `--check` validates the repo against its own declared identity.

## CI integration (FR-006)

The generated `ci.yml` includes a job running `node scripts/scaffold.mjs --check` so a PR
that introduces drift (hand-edited generated file, stale config) fails checks. The reference
module wires this into its own CI.

## `homesweethome` CLI (tools repo)

Location: `packages/cli` in `home-sweet-home-tools`. A single command to start with.

### `homesweethome create <module-name> [--repo <owner/repo>]`

| Step | Behavior |
|------|----------|
| 1 | Resolve the template source: clone `sousa99/home-sweet-home-module-template` (or create the target repo via `gh repo create --template`) into the target directory. |
| 2 | Collect module identity once (prompt or `--repo`; default module slug = the provided `<module-name>` kebab-cased). |
| 3 | Write the filled `module.config.yaml`. |
| 4 | Run `node scripts/scaffold.mjs` (the template repo's renderer) to generate the module files. |
| 5 | Print follow-up steps: run `node scripts/scaffold.mjs --check` to verify, then commit/push. |

### CLI constraints

- Thin wrapper: all rendering logic lives in the template repo's `scaffold.mjs`; the CLI must
  not re-implement rendering (no drift between CLI and template).
- Exit non-zero on any failed step.
- No interactive session in non-TTY environments (CI): `--repo` + explicit config flags
  allow fully non-interactive creation.