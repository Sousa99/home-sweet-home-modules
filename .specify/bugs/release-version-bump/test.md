# Bug Verification: Release pipeline fails with ERR_PNPM_INVALID_VERSION_BUMP

- **Slug**: release-version-bump
- **Tested**: 2026-09-27
- **Assessment**: ./assessment.md
- **Fix**: ./fix.md
- **Result**: verified

## Summary

The bug mechanism is confirmed eliminated: the Release workflow no longer invokes `pnpm version`
(pnpm's built-in, which fails without an argument), and now invokes `pnpm changeset version` (the
changesets CLI, which runs cleanly). The original failure command reproduces the exact
`ERR_PNPM_INVALID_VERSION_BUMP` error on the old value; the new command is a valid changesets
invocation. No regressions found in the touched CI config.

## Checks Performed

| Check | Command / Action | Result | Notes |
|-------|------------------|--------|-------|
| Reproduction (post-fix) | `pnpm changeset version --help` | pass | Resolves to the changesets CLI, exit 0 — no `ERR_PNPM_INVALID_VERSION_BUMP`. The real end-to-end path (push to `main` triggering the Release workflow) is not runnable locally; see Residual Risks. |
| Original failure command | `pnpm version` | pass (confirmatory) | Reproduces `ERR_PNPM_INVALID_VERSION_BUMP` exactly as recorded — proves the old wiring was the failure mechanism and the fix removes it. |
| New / updated guard | `grep -Eq '^\s*version: pnpm changeset version$' .github/workflows/release.yml` | pass | Guard step matches the fixed value. |
| Workflow lint | `actionlint .github/workflows/release.yml .github/workflows/ci.yml` | pass | Both workflows valid. |
| Formatting | `pnpm format .github/workflows/release.yml .github/workflows/ci.yml` | pass | Prettier-clean. |
| Regression suite | `pnpm test` | skipped | Only GitHub Actions YAML changed (`.github/workflows/`); no source/package code touched, so the Vitest suite is unaffected. Not run to avoid unnecessary full-workspace cost. |

## Output Excerpts

```
$ pnpm version
[ERR_PNPM_INVALID_VERSION_BUMP] A version argument is required. Must be a valid semver version ...

$ pnpm changeset version --help
  Usage
    $ changeset version [--ignore] [--snapshot <?name>] [--snapshot-prerelease-template <template>]
EXIT: 0
```

```
guard check: PASS
actionlint: PASS
All matched files use Prettier code style!
```

## Residual Risks

- **End-to-end not exercised**: the definitive proof is a green Release run on `main` after the fix
  is merged. That requires git/GitHub operations and a live runner, so it was not executed here.
  A `.changeset/current-time-module.md` is still pending, so the next `main` push will exercise the
  version step for real.
- **Downstream steps**: per the assessment, once `version` is fixed, later steps (changesets
  publish, tag push, `scripts/release-modules.sh` image/release publishing) could surface follow-on
  issues. These are outside this bug's scope but should be watched on the next release.

## Recommendation

Close the bug — verified locally at the level the change is testable. After the fix is merged to
`main`, confirm the next Release run is green end-to-end as a final confirmation.