# Changesets

This repository uses [changesets](https://github.com/changesets/changesets) to version
and publish packages.

## How it works

- Add a changeset with `pnpm changeset` describing your change and which packages it
  affects.
- Merging to `main` opens/updates the `changeset-release` version PR.
- Merging the version PR publishes the affected packages.

## Release model

- Each module's packages (`<slug>-backend`, `<slug>-components`) form a **fixed group**:
  they always version together (one version per module).
- Modules release **independently** of each other and of `@sousa99/homesweethome-config`.

See `specs/001-merge-modules/contracts/release-model.md` for details.