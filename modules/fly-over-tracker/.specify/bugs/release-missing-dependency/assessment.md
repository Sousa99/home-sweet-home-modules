# Bug Assessment: Release pipeline fails — semantic-release not installed

- **Slug**: release-missing-dependency
- **Created**: 2026-09-21
- **Source**: pasted text (no URL supplied; URL trust policy not applicable)
- **Verdict**: valid
- **Severity**: high

## Report (verbatim or summarized)

> "there is a bug on this repository. the latest execution of release failed. can you look into it and access what happened?"

No URL was provided; the report is freeform text. Investigated against the repository and the GitHub Actions "Release" workflow run history.

## Symptom

The latest Release workflow run (#35541009996, head `1b7d80b`) failed in the `🚀 Run semantic-release` step (`release.yml:112`). A release was expected to be published; instead the step exited 1 with:

```
[ERR_PNPM_RECURSIVE_EXEC_FIRST_FAIL] Command "semantic-release" not found
```

The `validate` job, docker QEMU/Buildx setup, and GHCR login all succeeded — only the semantic-release step failed. Both Release runs on record (#1 and #2) failed; no successful release has ever occurred.

## Reproduction

1. Trigger `release.yml` (push to `main` or `workflow_dispatch`).
2. `validate` job passes; `release` job reaches step `🚀 Run semantic-release` (`pnpm exec semantic-release`).
3. Step fails with `[ERR_PNPM_RECURSIVE_EXEC_FIRST_FAIL] Command "semantic-release" not found` → exit code 1.

## Suspected Code Paths

- `.github/workflows/release.yml:112` — invokes `pnpm exec semantic-release`; no such binary is installed.
- `package.json:27-37` — root `devDependencies` contain only lint/format/type tooling; `semantic-release` and the `@semantic-release/*` plugins are absent.
- `.releaserc.json:1-24` — configures the full plugin pipeline (commit-analyzer, release-notes-generator, changelog, exec, npm, git, github) that can never run without the CLI.
- `pnpm-lock.yaml` — 0 references to `semantic-release`; also absent from `node_modules/.bin`.

## Root Cause Hypothesis

`semantic-release` was never added as a dependency. The scaffold template generated the release workflow, `.releaserc.json`, and the release scripts (`scripts/apply-release-version.mjs`, `scripts/publish-artifacts.sh`), but omitted the CLI package, so `pnpm exec semantic-release` cannot resolve a binary. Confidence: high.

## Proposed Remediation

**Preferred**: Add `semantic-release` and the plugins referenced in `.releaserc.json` (`@semantic-release/commit-analyzer`, `@semantic-release/release-notes-generator`, `@semantic-release/changelog`, `@semantic-release/exec`, `@semantic-release/npm`, `@semantic-release/git`, `@semantic-release/github`) to root `devDependencies`. Because `package.json` is scaffold-generated, edit `package.json.tpl` first, re-render with `node scripts/scaffold.mjs`, then run `pnpm install` to update `pnpm-lock.yaml` (commit the lockfile). Pin exact versions for reproducibility.

**Alternatives**:
- Switch `release.yml` to `npx semantic-release` — no dependency change, but fetches at runtime (network/supply-chain risk, non-reproducible versions).
- Use a prebuilt action (e.g. `cycjimmy/semantic-release-action`) — less pnpm integration, hides what runs.

**Files likely to change**:
- `package.json.tpl` (and regenerated `package.json`)
- `pnpm-lock.yaml`
- `.github/workflows/release.yml` (only if adopting an alternative)

**Tests to add or update**:
- Add a smoke check in the `validate` job / CI: `pnpm exec semantic-release --version` resolves — guards against future missing-binary regressions.
- `node scripts/scaffold.mjs --check` will catch drift if template and generated file diverge.

## Risks & Considerations

- Version pinning needed for reproducibility; unpinned `^` ranges can pull breaking plugin updates.
- `@semantic-release/npm` publishes `frontend/` to GH Packages — requires `GH_PACKAGES_TOKEN`/`NPM_TOKEN` secrets configured and a publishable `frontend/package.json`.
- Missing a plugin in devDeps surfaces only at release time.
- Secondary (out of scope): all CI runs report 0 jobs / never started — separate issue worth a follow-up.
- Earlier release run (#1, head `97e1fae`) failed on a stale lockfile (`ERR_PNPM_OUTDATED_LOCKFILE`); already resolved by the time of `1b7d80b`.

## Open Questions

- [NEEDS CLARIFICATION: Is `GH_PACKAGES_TOKEN` configured in repository secrets?]
- [NEEDS CLARIFICATION: Why do CI runs start 0 jobs? Is that a separate bug?]