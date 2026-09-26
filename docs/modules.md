# Adding or managing modules

This repository is a pnpm workspace monorepo. Modules live under `modules/<slug>/` and are
picked up automatically by the workspace globs (`modules/*/backend`, `modules/*/frontend`).

## Adding a new module

1. **Create the module directory** with its packages:

   ```text
   modules/<slug>/
   ├── backend/        # @sousa99/<slug>-backend   (REST + MCP, private, image-only)
   ├── frontend/       # @sousa99/<slug>-components (SPA + publishable components lib)
   ├── Dockerfile.backend
   ├── Dockerfile.frontend
   ├── deploy/nginx.spa.conf
   ├── eslint.config.mjs        # extends @sousa99/homesweethome-config/eslint
   ├── prettier.config.mjs      # extends @sousa99/homesweethome-config/prettier
   ├── tsconfig.base.json
   ├── README.md
   └── setup.md
   ```

   No scaffolding CLI or template-stamping step is involved — the workspace globs pick the
   new packages up automatically.

2. **Register the release group** in `.changeset/config.json` (fixed groups keep a
   module's packages at one version):

   ```json
   ["@sousa99/<slug>-backend", "@sousa99/<slug>-components"]
   ```

3. **Extend `scripts/release-modules.sh`**: add the new slug to the `MODULES` list so its
   GHCR images and GitHub release are published on release.

4. **Document it**: add a row in the [module index](../README.md) and follow the
   per-module doc conventions.

## Module conventions

- **Identity** is declared in each package's `package.json`; the directory name
  `modules/<slug>/` MUST match the `@sousa99/<slug>-*` package prefix.
- **Scripts** are uniform: `build`, `build:lib` (frontend), `test`, `typecheck` exist in
  every package so the shared CI matrix and root gates work unchanged.
- **No scaffolding**: modules carry no `module.config.yaml`, `scaffold.mjs`, or per-module
  CI/release workflows. CI/CD is uniform at the repository root.
- **Spec-driven development** happens only under the repo-root `specs/`; modules carry no
  per-module spec directories.

## Repository structure

```text
modules/<slug>/   self-contained application modules
packages/config/  @sousa99/homesweethome-config (shared eslint/prettier/tsconfig presets)
.changeset/       changesets config + change files
.github/workflows/ci.yml     uniform CI (module matrix)
.github/workflows/release.yml changesets version + publish (npm, GHCR, GitHub releases)
docs/             repository-level guides (this directory)
specs/            all Spec Kit features (specs, plans, contracts, tasks)
```

See the [constitution](../.specify/memory/constitution.md) for the governing principles.