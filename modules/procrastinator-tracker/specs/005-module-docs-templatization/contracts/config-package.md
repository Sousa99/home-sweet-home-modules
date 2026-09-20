# Contract: `@sousa99/homesweethome-config`

The shared tooling preset package (FR-009) — the single source of tooling truth across all
Home Sweet Home module repos. Lives in `packages/config` of the `home-sweet-home-tools` repo.

## Package

| Attribute | Value |
|-----------|-------|
| Package name | `@sousa99/homesweethome-config` |
| Registry | npm (default) — installable by any module repo |
| Exports | ESLint flat preset, Prettier preset, TypeScript base tsconfig |
| Versioning | Versioned together with the `homesweethome` CLI (same tools repo) |

## Exports

| Export | File | Content |
|--------|------|---------|
| `@sousa99/homesweethome-config/eslint` | `eslint.js` | Flat-config array (JS/TS + Node-aware), mirroring the reference module |
| `@sousa99/homesweethome-config/prettier` | `prettier.js` | Prettier options matching the reference module's config |
| `@sousa99/homesweethome-config/tsconfig.base` | `tsconfig.base.json` | TypeScript base compiler options matching the reference repo |

## Consumption contract (modules)

- Install `@sousa99/homesweethome-config` as a devDependency.
- Keep a thin local config file that imports the presets and adds only module-specific
  overrides. The scaffolded module ships `eslint.config.mjs` and `prettier.config.mjs` that
  import the presets directly (see the template's `eslint.config.mjs.tpl` and
  `prettier.config.mjs.tpl`).
- The presets must load **without any local override required** (spec US4 acceptance
  scenario): a scaffolded module's tooling resolves identically to every other module
  (SC-006).
- Presets must be environment-independent — no machine paths, no absolute paths.

## Versioning contract

- The tools repo publishes the package and the CLI together; a config change ships with the
  CLI that scaffolds it (research decision #5).
- `@sousa99/homesweethome-config` is **published to GitHub Packages** (`npm.pkg.github.com`,
  public scope `@sousa99`). GitHub Packages requires auth for installs even for public
  packages: CI uses `NODE_AUTH_TOKEN`/`GITHUB_TOKEN` (wired via `setup-node registry-url`);
  local installs need a PAT with `read:packages` in the user-level `~/.npmrc`.
- Module repos pin a version (or range); `--check` does not verify the pinned version — tool
  version consistency is a release-process concern, not a scaffold concern.