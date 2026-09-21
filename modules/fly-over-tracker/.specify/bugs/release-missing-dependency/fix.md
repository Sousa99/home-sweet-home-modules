# Bug Fix: Release pipeline fails — semantic-release not installed

- **Slug**: release-missing-dependency
- **Fixed**: 2026-09-21
- **Assessment**: ./assessment.md
- **Status**: applied

## Summary

The Release workflow failed because `semantic-release` and its plugins were never added as dependencies, so `pnpm exec semantic-release` could not resolve a binary. Added the CLI + all plugins referenced in `.releaserc.json` (pinned exact), enabled publishing of the frontend components package, and added a smoke check to the release validate job so a missing binary fails fast.

## Changes

| File | Change | Notes |
|------|--------|-------|
| `package.json.tpl` | added 8 devDependencies | `semantic-release@25.0.9` + 7 `@semantic-release/*` plugins, exact-pinned |
| `package.json` | regenerated | scaffold render; devDeps in sync with template |
| `pnpm-lock.yaml` | modified | lockfile synced via `pnpm install` |
| `frontend/package.json.tpl` | modified | `"private": false`; added `publishConfig` (GH Packages registry, `access: public`) |
| `frontend/package.json` | regenerated | scaffold render; now publishable |
| `.github/workflows/release.yml.tpl` | modified | added `🔍 Semantic-release smoke check` step to validate job |
| `.github/workflows/release.yml` | regenerated | scaffold render; smoke check present |
| `.specify/bugs/release-missing-dependency/fix.md` | added | this report |

## Diff Highlights

```diff
# package.json (devDependencies)
+    "@semantic-release/changelog": "7.0.0",
+    "@semantic-release/commit-analyzer": "13.0.1",
+    "@semantic-release/exec": "7.1.0",
+    "@semantic-release/git": "11.0.1",
+    "@semantic-release/github": "12.0.9",
+    "@semantic-release/npm": "13.1.5",
+    "@semantic-release/release-notes-generator": "14.1.1",
+    "semantic-release": "25.0.9",

# frontend/package.json
-  "private": true,
+  "private": false,
+  "publishConfig": {
+    "registry": "https://npm.pkg.github.com/",
+    "access": "public"
+  },

# .github/workflows/release.yml (validate job)
+      - name: 🔍 Semantic-release smoke check
+        run: pnpm exec semantic-release --version
```

## Tests Added or Updated

- No unit tests — no application logic changed. Regression guard added as a CI step:
  - `release.yml` → validate job → `pnpm exec semantic-release --version` — fails the validate job if the release binary is ever missing again.
- `node scripts/scaffold.mjs --check` — confirms template ↔ generated-file parity is maintained (ran locally, passes).

## Local Verification

- `node scripts/scaffold.mjs` → rendered 35 templates
- `node scripts/scaffold.mjs --check` → PASS (no drift)
- `pnpm install` → added 8 devDependencies, no conflicts
- `pnpm install --frozen-lockfile` → OK (lockfile consistent)
- `pnpm exec semantic-release --version` → `0.1.0` (binary resolves)
- `git diff` → reviewed; only intended files changed

## Deviations from Assessment

- **Scope expansion (user-approved)**: The assessment proposed adding the dependencies only. During the fix I discovered `frontend/package.json` was `"private": true`, which would have made `@semantic-release/npm` fail at the publish step after the binary issue was resolved. Per user decision, the package should be published now, so `private` was set to `false` and a `publishConfig` (GH Packages registry, `access: public`) was added. This changes `frontend/package.json.tpl`/`frontend/package.json`, which the assessment's file list did not include.
- **Smoke check placement**: Assessment said "validate job / CI"; added to the release workflow's validate job (the CI workflow currently starts 0 jobs — a separate issue — so the release workflow is the reliable home for this guard).
- Exact version pinning follows the assessment's recommendation; the rest of the template keeps `^` ranges.

## Follow-ups

- **CI starts 0 jobs**: all `ci.yml` runs report 0 jobs (never started) — separate issue; investigate separately.
- **Secrets**: confirm `GH_PACKAGES_TOKEN` is configured with `write:packages` scope; `NPM_TOKEN` for the publish step is sourced from it. If the publish step fails on auth, that is the cause.
- **First release version**: will be `1.0.0` (head includes a `feat` commit). Verify tag/release/changelog look right after the run.
- **Deprecation warnings**: `eslint@9.39.5` flagged deprecated (pre-existing); unrelated to this fix.
- Consider whether `semantic-release` should stay in the scaffold template for all future modules (it is the shared template root — this fix lands there, so it now applies to all modules scaffolded from this repo).