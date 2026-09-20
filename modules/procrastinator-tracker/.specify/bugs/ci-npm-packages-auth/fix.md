# Bug Fix: PR CI fails on npm package auth (403)

- **Slug**: ci-npm-packages-auth
- **Fixed**: 2026-09-20
- **Assessment**: ./assessment.md
- **Status**: applied

## Summary

The PR CI failed because `GITHUB_TOKEN` could not install `@sousa99/homesweethome-config`
from GitHub Packages. Two independent causes were resolved: (1) the workflow `permissions:`
block revoked the token's `packages` scope, and (2) pnpm's `minimumReleaseAge` supply-chain
policy rejected the freshly published package. After both fixes, CI is fully green.

## Changes

| File | Change | Notes |
|------|--------|-------|
| `.github/workflows/ci.yml` | modified | Added `packages: read` to the top-level `permissions:` block so `GITHUB_TOKEN` can install from GitHub Packages |
| `.github/workflows/release.yml` | modified | Added `packages: read` to the `validate` job `permissions:` block (the `release` job already had `packages: write`) |
| `.github/workflows/ci.yml.tpl` | modified | Same `packages: read` addition, so new modules inherit the fix |
| `.github/workflows/release.yml.tpl` | modified | Same `packages: read` addition |
| `pnpm-workspace.yaml` | modified | Added `minimumReleaseAgeExclude` for `@sousa99/homesweethome-config` and `@sousa99/homesweethome` |
| `pnpm-workspace.yaml.tpl` | modified | Same exclude (tokenized `@{{NPM_SCOPE}}/...`), so new modules inherit it |

## Diff Highlights

```diff
  permissions:
    contents: read
+   packages: read
```

```diff
  allowBuilds:
    '@parcel/watcher': false
    better-sqlite3: true
    esbuild: true
+
+ minimumReleaseAgeExclude:
+   - '@sousa99/homesweethome-config'
+   - '@sousa99/homesweethome'
```

## Tests Added or Updated

No unit tests apply to GitHub Actions workflow permissions. Verification is via CI re-run on
the PR itself (see Local Verification).

## Local Verification

- `node scripts/scaffold.mjs --check` → exit 0 (generated workflows in sync with `.tpl`).
- `pnpm install` → `✓ Lockfile passes supply-chain policies (919 entries)`.
- CI run `35512556942` on PR #5: **all 11 jobs success** (🏗️ Build backend, 🖼️ Build SPA,
  🧪 Test, 🔀 Scaffold check, 🧹 Format, 🔍 Typecheck, 🚨 Lint, 📝 PR format, 🔬 actionlint,
  📦 Build library, ✅ Check).

## Deviations from Assessment

The assessment proposed a single fix (grant `procrastinator-tracker` read access to the
`@sousa99/homesweethome-config` package under "Manage Actions access"). The user performed
that grant in the UI, but CI still failed with the same 403. Investigation of the next CI run
revealed **two** compounding causes the assessment missed:

1. **Workflow `permissions:` block**: `.github/workflows/ci.yml` and the `release.yml`
   `validate` job declared `permissions: contents: read`. Per GitHub's documented behavior,
   any scope not listed is set to `none` — so `GITHUB_TOKEN` had **no `packages` scope at
   all**, making the package grant moot. Adding `packages: read` was required.
2. **pnpm `minimumReleaseAge` policy**: once auth succeeded, pnpm's supply-chain check
   rejected `@sousa99/homesweethome-config@0.1.0` because it was published within the
   `minimumReleaseAge` cutoff. The package had to be listed in `minimumReleaseAgeExclude` in
   `pnpm-workspace.yaml` (and the `.tpl` so new modules inherit it). The scaffold re-render
   had overwritten pnpm's auto-added exclude, which is why it resurfaced in CI.

The package-access grant remains in place and is still required (cross-repo access), but it
was not sufficient on its own.

## Follow-ups

- Document the one-time "Manage Actions access" grant in the template's `docs/clarify.md` so
  each future Home Sweet Home module repo does not rediscover it.
- New modules get the workflow `packages: read` + `minimumReleaseAgeExclude` from the template
  automatically; verify on the next scaffolded module.
- Consider whether `minimumReleaseAgeStrict` should be enabled to gate future prompt-based
  excludes (currently a prompt default).