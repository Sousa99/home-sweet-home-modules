# Bug Assessment: Release pipeline fails with ERR_PNPM_INVALID_VERSION_BUMP

- **Slug**: release-version-bump
- **Created**: 2026-09-27
- **Source**: pasted text
- **Verdict**: valid
- **Severity**: high

## Report (verbatim or summarized)

> there is a problem on main with my release pipeline. look into it and access

No URL supplied. The repository is `Sousa99/home-sweet-home-modules`; the Release
workflow runs on pushes to `main`. Live CI evidence was gathered via `gh run list` /
`gh run view`.

## Symptom

Every push to `main` that lands with a pending changeset fails the **Release** workflow's
"🚀 Run changesets" step. The changesets action runs `pnpm version` (no argument), which is
pnpm's built-in package version command — not a changesets version step — so it exits with
`ERR_PNPM_INVALID_VERSION_BUMP` ("A version argument is required"). Expected: the changesets
`version` command runs, versions the packages, and opens/updates the "chore(release): version
packages" commit or release PR. 6 of the last 10 Release runs failed; the latest (run
`36347547581`, merge of PR #4 to `main` on 2026-09-27T20:18:33Z) failed at exactly this step.

## Reproduction

1. Have at least one pending changeset in `.changeset/` (currently
   `.changeset/current-time-module.md`).
2. Push a commit to `main` (or merge a PR). The `Release` workflow triggers on
   `push: branches: [main]`.
3. The `release` job reaches the "🚀 Run changesets (version PR, or publish when none pending)"
   step; the changesets action runs `version: pnpm version`.
4. The step fails with:
   `[ERR_PNPM_INVALID_VERSION_BUMP] A version argument is required. Must be a valid semver version
   (e.g. 1.2.3) or one of: major, minor, patch, premajor, preminor, prepatch, prerelease, from-git`.

## Suspected Code Paths

- `.github/workflows/release.yml:95-96` — `version: pnpm version` passed to
  `changesets/action@v1`. `pnpm version` invokes pnpm's built-in version command, not the
  package.json `version` script, and requires an explicit semver bump argument — hence the CI
  failure.
- `package.json:18` — the root `"version": "changeset version"` script. The author presumably
  intended `pnpm version` to run this script, but pnpm resolves `version` to its built-in command
  first, so the script is never reached.
- `package.json:19` — `"release": "changeset publish"` (unused by the workflow; it passes
  `publish: pnpm changeset publish` directly, which is fine).

## Root Cause Hypothesis

**Confidence: high.**

`.github/workflows/release.yml:95` sets the changesets action's `version` input to
`pnpm version`. With no argument, pnpm's built-in `version` command is invalid and exits non-zero
(`ERR_PNPM_INVALID_VERSION_BUMP`). The changesets action therefore aborts before versioning or
publishing anything, and every subsequent release step (publish, tags, GHCR images, GitHub
releases) never runs. This is a misconfiguration introduced in the release pipeline wiring — the
fix is to point `version` at the changesets version command (or the root script that wraps it),
e.g. `pnpm changeset version` or `pnpm run version`.

## Proposed Remediation

**Preferred**: Change `.github/workflows/release.yml:95` from `version: pnpm version` to
`version: pnpm changeset version` (explicit, unambiguous). This matches the existing
`publish: pnpm changeset publish` style and removes reliance on npm-script-name resolution.
Alternatively `version: pnpm run version` would use the root `version` script (`changeset version`),
but the explicit form is clearer and less fragile.

**Alternatives** (optional):
- `version: pnpm run version` — uses the declared root script; keeps the canonical command in
  `package.json`, but couples workflow behavior to a script name that shadows a pnpm built-in.
- Leave `version` unset — the changesets action default is `changeset version`, which is
  correct; but being explicit documents intent.

**Files likely to change**:
- `.github/workflows/release.yml`

**Tests to add or update**:
- The existing `actionlint` CI job (`ci.yml:189`) is static-only and cannot catch this semantic
  misuse. Consider a lightweight CI step asserting the configured version command resolves to the
  changesets CLI, e.g. run `pnpm changeset status` after `version` — or, minimally, a shell check
  in CI that greps `release.yml` for `version: pnpm changeset version`. No unit tests are
  appropriate here; the regression is best locked by a successful end-to-end Release run.

## Risks & Considerations

- **No data/image risk** — failure occurs before any publish; nothing was half-released.
- **Backlog**: the pending `.changeset/current-time-module.md` is stuck until the fix lands, so
  `@sousa99/current-time-components` cannot be versioned/released.
- **Downstream flow**: once `version` is fixed, verify the subsequent steps (changesets publish,
  tag push, `scripts/release-modules.sh`) behave; the version PR flow may surface follow-on
  issues in image publishing.
- **Low** — one-line config change; no API/migration/security impact.

## Open Questions

- None blocking.