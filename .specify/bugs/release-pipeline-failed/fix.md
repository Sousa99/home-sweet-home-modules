# Bug Fix: Release pipeline fails — changesets tries to re-create existing GitHub releases

- **Slug**: release-pipeline-failed
- **Fixed**: 2026-09-28
- **Assessment**: ./assessment.md
- **Status**: applied

## Summary

Gave GitHub-release creation a single owner: disabled `changesets/action@v1`'s built-in release
creation (`createGithubReleases: false`) so `scripts/release-modules.sh` is the sole publisher of
`@sousa99/<slug>-components@<version>` GitHub releases (and GHCR images). This removes the 422
`already_exists` collision that failed the Release workflow on the last `main` push.

## Changes

| File | Change | Notes |
|------|--------|-------|
| `.github/workflows/release.yml` | modified | Added `createGithubReleases: false` to the `changesets/action@v1` step, so changesets no longer creates GitHub releases after `publish` — `scripts/release-modules.sh` owns them. |
| `.github/workflows/ci.yml` | modified | Renamed the guard step to "Verify release workflow configuration" and added a grep asserting `createGithubReleases: false` in `release.yml`, so the misconfiguration cannot silently return. |

## Diff Highlights

```yaml
# .github/workflows/release.yml
        with:
          version: pnpm changeset version
          publish: pnpm changeset publish
+         createGithubReleases: false
          commit: 'chore(release): version packages'
          title: 'chore(release): version packages'
```

```yaml
# .github/workflows/ci.yml (actionlint job)
-      - name: 🔬 Verify release version command
+      - name: 🔬 Verify release workflow configuration
         run: |
           grep -Eq '^\s*version: pnpm changeset version$' .github/workflows/release.yml \
             || { echo "::error::release.yml changesets 'version' must be 'pnpm changeset version' (pnpm version is the built-in, not changesets)."; exit 1; }
+          grep -Eq '^\s*createGithubReleases: false$' .github/workflows/release.yml \
+            || { echo "::error::release.yml changesets 'createGithubReleases' must be 'false' so GitHub releases are owned only by scripts/release-modules.sh."; exit 1; }
```

## Tests Added or Updated

- `.github/workflows/ci.yml` — "Verify release workflow configuration" step: pins both the
  changesets `version` command (`pnpm changeset version`) and `createGithubReleases: false` on
  every PR, since `actionlint` is static-only and cannot detect this semantic collision.

## Local Verification

- Commands run:
  - `pnpm exec prettier --check .github/workflows/release.yml .github/workflows/ci.yml` → PASS (both files Prettier-clean)
  - `actionlint .github/workflows/release.yml .github/workflows/ci.yml` → PASS (exit 0, no findings)
  - `grep -Eq '^\s*version: pnpm changeset version$' .github/workflows/release.yml` → PASS
  - `grep -Eq '^\s*createGithubReleases: false$' .github/workflows/release.yml` → PASS
- Manual checks: re-read the edited sections to confirm the input is placed correctly inside the
  changesets step's `with:` block and the guard step's shell block is syntactically valid.

## Deviations from Assessment

None. The preferred remediation (`createGithubReleases: false` in `release.yml` + a CI guard) was
applied exactly as proposed. The assessment's optional follow-up (pinning the image/release steps
to the pushed ref to avoid pre-merge publication) is intentionally left out of this fix — it is a
hardening change, not required to resolve the reported failure.

## Follow-ups

- Land this on `main` and confirm the next Release run is green end-to-end (changesets publish,
  tag push, `scripts/release-modules.sh`) — the definitive regression lock; the previous
  `release-version-bump` fix's follow-up has been blocked by this bug.
- On the next release, verify `scripts/release-modules.sh` still creates the expected
  `@sousa99/<slug>-components@<version>` GitHub releases for all four modules (it is now the sole
  owner).
- Consider the assessment's optional hardening: pin the image/release steps to
  `ref: ${{ github.sha }}` so GHCR images and GitHub releases only go out after the version commit
  lands on `main`.