# Bug Fix: Release pipeline fails with ERR_PNPM_INVALID_VERSION_BUMP

- **Slug**: release-version-bump
- **Fixed**: 2026-09-27
- **Assessment**: ./assessment.md
- **Status**: applied

## Summary

The Release workflow passed `version: pnpm version` to `changesets/action@v1`, but `pnpm version`
resolves to pnpm's built-in package version command (which requires an explicit bump argument), not
the changesets version step. Changed it to `version: pnpm changeset version`, matching the existing
`publish: pnpm changeset publish` style, and added a CI regression guard so the misconfiguration
cannot silently return.

## Changes

| File | Change | Notes |
|------|--------|-------|
| `.github/workflows/release.yml` | modified | `version: pnpm version` → `version: pnpm changeset version` in the changesets action step |
| `.github/workflows/ci.yml` | modified | Added a "Verify release version command" step in the `actionlint` job that greps `release.yml` for `version: pnpm changeset version` |

## Diff Highlights

```yaml
# .github/workflows/release.yml
         with:
-          version: pnpm version
+          version: pnpm changeset version
           publish: pnpm changeset publish
```

```yaml
# .github/workflows/ci.yml (actionlint job)
       - name: 🔬 Check workflow files
         uses: docker://rhysd/actionlint:latest

+      - name: 🔬 Verify release version command
+        run: |
+          grep -Eq '^\s*version: pnpm changeset version$' .github/workflows/release.yml \
+            || { echo "::error::release.yml changesets 'version' must be 'pnpm changeset version' (pnpm version is the built-in, not changesets)."; exit 1; }
```

## Tests Added or Updated

- `.github/workflows/ci.yml` — "Verify release version command" step: pins the changesets
  `version` command to `pnpm changeset version` on every PR, since the existing `actionlint` check
  is static-only and cannot detect this semantic misuse.

## Local Verification

- Commands run:
  - `grep -Eq '^\s*version: pnpm changeset version$' .github/workflows/release.yml` → PASS
  - `pnpm format .github/workflows/release.yml .github/workflows/ci.yml` → all matched files use Prettier code style
  - `actionlint .github/workflows/release.yml .github/workflows/ci.yml` → PASS
- Manual checks: re-read the modified workflow sections to confirm the new value and the guard step
  are correctly placed and syntactically valid YAML.

## Deviations from Assessment

None. The preferred remediation (`version: pnpm changeset version`) was applied exactly as
proposed, and the assessment's suggested regression guard (a shell check in CI that greps
`release.yml`) was added as the "Tests to add or update" section recommended.

## Follow-ups

- Land the fix on `main` and confirm the next Release run succeeds end-to-end (changesets version,
  publish, tag push, `scripts/release-modules.sh` image/release publishing) — this is the real
  regression lock, since the pending `.changeset/current-time-module.md` currently blocks a release.
- Watch the downstream release steps for follow-on issues the assessment flagged (image publishing
  after a version PR), as the pipeline has not run green past the version step recently.