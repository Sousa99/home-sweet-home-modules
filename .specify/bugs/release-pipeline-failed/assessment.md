# Bug Assessment: Release pipeline fails — changesets tries to re-create existing GitHub releases (422 already_exists)

- **Slug**: release-pipeline-failed
- **Created**: 2026-09-28
- **Source**: pasted text
- **Verdict**: valid
- **Severity**: high

## Report (verbatim or summarized)

> the release pipeline failed

No URL supplied (URL trust policy: N/A — nothing to fetch). Live CI evidence was gathered via
`gh run list` / `gh run view` (delegated to `github-helper`). This is a follow-on failure to the
fixed `release-version-bump` bug.

## Symptom

The **Release** workflow fails on pushes to `main` even though the previous fix is in effect.
In the latest failed run (`36398992211`, triggered by the merge of PR #6 "chore(release): version
packages"), the `🚀 Validate` job passed but the `🚀 Release` job died in the "🚀 Run changesets"
step with:

```
##[error]HttpError: Validation Failed: {"resource":"Release","code":"already_exists","field":"tag_name"}
##[error]Validation Failed: {"resource":"Release","code":"already_exists","field":"tag_name"}
```

Expected: `pnpm changeset publish` succeeds and the pipeline continues to tag push and image/
GitHub-release publishing. Observed: packages were published to npm and tags pushed, then the
changesets action aborted trying to create GitHub releases for tags that already exist, skipping
the remaining steps (`📌 Push release tags`, `🖼️ Publish GHCR images + GitHub releases`).

## Reproduction

1. Have at least one pending changeset in `.changeset/` and push it to `main`.
2. The Release run's changesets step opens a "chore(release): version packages" PR. The action
   leaves the workspace checked out on the version branch (`changeset-release/main`), so the
   *same run's* later steps (`📌 Push release tags`, `scripts/release-modules.sh`) run against the
   bumped versions **before the PR is merged** — publishing `0.1.0` GHCR images and creating
   `@sousa99/<module>-components@0.1.0` GitHub releases early (observed in run `36388859152`).
3. Merge the version PR; its push to `main` triggers a new Release run.
4. The run has no pending changesets, so the changesets action runs `pnpm changeset publish`,
   publishes `0.1.0` packages to npm, pushes tags, then — with the default
   `createGithubReleases: true` — tries to create GitHub releases for the same
   `@sousa99/<module>-components@0.1.0` tags that step 2 already created.
5. GitHub returns `422 already_exists`; the changesets step (and the run) fails before the
   image/release steps run. Reproduced in run `36398992211`.

The exact tag that first hit `already_exists` is not named in the error (all four
`@sousa99/<module>-components@0.1.0` releases pre-exist), but the mechanism is unambiguous.

## Suspected Code Paths

- `.github/workflows/release.yml:92-101` — the `changesets/action@v1` step. It relies on the
  action's default `createGithubReleases: true`, so after `publish` it creates GitHub releases for
  every published package tag — colliding with `scripts/release-modules.sh`, which owns the same
  releases.
- `scripts/release-modules.sh:59-69` — creates GitHub releases via
  `gh release create "$tag"` for `@sousa99/$m-components@$version`. Its idempotency guard
  (`gh release view "$tag"`) only protects against re-creating releases within the same run; it
  cannot know that the changesets step will later create (or has created) the same tag.
- `.github/workflows/release.yml:106-110` — the image/release step runs on the same checkout as the
  changesets action, which is left on the version branch. That is how the premature `0.1.0`
  releases/images appeared before the merge (run `36388859152`), which then made the follow-up
  run's changesets release creation collide.
- `.changeset/config.json:5-10` — fixed release groups whose component package names
  (`@sousa99/<slug>-components`) exactly match the tags `release-modules.sh` releases, guaranteeing
  the two mechanisms target the same tags.

## Root Cause Hypothesis

**Confidence: high.**

Two mechanisms create GitHub releases for the same tags. `changesets/action@v1` defaults to
`createGithubReleases: true` and creates releases for every npm-published package after
`publish`; `scripts/release-modules.sh` also creates GitHub releases (plus GHCR images) for all
four modules under identical `@sousa99/<slug>-components@<version>` tags. A workspace-branch side
effect of the changesets action (checkout left on `changeset-release/main`) caused the second run
after the version-PR's creation to publish the `0.1.0` images/releases *before* the version PR
merged. When the version PR merged, the next Release run published `0.1.0` to npm and changesets
attempted to re-create those GitHub releases → `422 already_exists` → step and run fail. The
`release-version-bump` fix (`version: pnpm changeset version`) is merged on `main` and executed
correctly in the failing run — it is not implicated.

## Proposed Remediation

**Preferred**: give GitHub-release creation a single owner. On the `changesets/action@v1` step in
`.github/workflows/release.yml`, set `createGithubReleases: false`. `scripts/release-modules.sh`
already creates GitHub releases (and GHCR images) for every module, idempotently (it skips tags
that `gh release view` confirms exist), so changesets should not also create them. This removes the
collision for all four modules in one line, leaves image/release ownership in one place, and makes
the "📌 Push release tags" + "🖼️ Publish GHCR images + GitHub releases" steps the sole publisher.

**Alternatives** (optional):
- Keep `createGithubReleases: true` and remove `gh release create` from
  `scripts/release-modules.sh`. Trade-off: changesets only creates releases for packages it
  publishes to npm; image-only modules whose packages stay private (e.g. `bus-catcher`, per the
  script's own docstring) would get no GitHub release. Not viable as a full replacement, though it
  works for the currently-published modules.
- Guard the collision instead of removing it: have `scripts/release-modules.sh` skip creating a
  release if the tag exists (it already does), and make changesets tolerate existing tags — it does
  not; there is no skip-if-exists option. Not viable; the two-step ordering cannot be made safe.

**Files likely to change**:
- `.github/workflows/release.yml`

**Tests to add or update**:
- Extend the existing `🔬 Verify release version command` guard in the `actionlint` CI job
  (`ci.yml:216-219`) to also assert `createGithubReleases: false` appears in the changesets step of
  `release.yml`, so the misconfiguration cannot silently return.
- No unit tests are appropriate; the real regression lock is a green end-to-end Release run on
  `main` (the previous fix's follow-up, now blocked by this bug).

## Risks & Considerations

- **No data/package risk** — the failure happens *after* npm publish and tag push; nothing was
  half-released, but the workflow is red and blocks future releases until fixed.
- **Single-owner shift**: with `createGithubReleases: false`, GitHub releases for all modules must
  come from `scripts/release-modules.sh`. Confirm its tags match changesets' convention exactly
  (`@sousa99/<slug>-components@<version>`) — they do today; verify on next release.
- **Existing `0.1.0` state**: the early `0.1.0` GHCR images and GitHub releases are correct and
  will be skipped by the idempotent script; no cleanup needed.
- **Pre-merge publication side effect** (secondary): because the changesets action leaves the
  workspace on the version branch, image/release steps publish bumped versions before the version
  PR merges. This is what created the early `0.1.0` artifacts. It is not itself the reported
  failure, but consider pinning the image/release steps to the pushed ref (e.g.
  `actions/checkout` with `ref: ${{ github.sha }}` for those steps) so releases only go out after
  the version commit lands on `main`.
- **Low residual risk** — a one-line workflow input change; no API/migration/security impact.

## Open Questions

- [NEEDS CLARIFICATION: none blocking — whether to also harden the version-branch checkout side
  effect in the image/release steps is an optional follow-up, not required to fix this bug.]