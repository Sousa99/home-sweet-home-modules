# Bug Assessment: PR CI fails on npm package auth (403)

- **Slug**: ci-npm-packages-auth
- **Created**: 2026-09-20
- **Source**: pasted text — "the pipeline is failing on the pull request due to auth for node packages you know"
- **Verdict**: valid
- **Severity**: high

## Report (verbatim or summarized)

The user reported: "the pipeline is failing on the pull request due to auth for node packages."

CI run `35511626446` on PR #5 (`feature/005-module-docs-templatization`) fails in 9 of 11 jobs.
Only `📝 PR format` and `🔬 actionlint` pass — the two jobs that do not run `pnpm install`.

The failing jobs all stop at the install step:

```
✗ Lockfile failed supply-chain policy check (919 entries in 6.8s)
[ERR_PNPM_FETCH_403] GET https://npm.pkg.github.com/@sousa99%2Fhomesweethome-config: Forbidden - 403

An authorization header was used: ***
//npm.pkg.github.com/:_authToken=ghs_[hidden]
@sousa99:registry=https://npm.pkg.github.com/
```

## Symptom

CI jobs that run `pnpm install` fail during pnpm's supply-chain policy check when fetching
`@sousa99/homesweethome-config` from `npm.pkg.github.com` with a `403 Forbidden`. Expected:
the install succeeds (locally it does, using a user-level PAT with `read:packages`).

## Reproduction

1. Push `feature/005-module-docs-templatization` and open PR #5 against `main`.
2. Observe the `CI` workflow run on the PR.
3. Every job that runs `pnpm install --frozen-lockfile` fails at the supply-chain policy
   check with `ERR_PNPM_FETCH_403` fetching `@sousa99/homesweethome-config`.
4. Jobs that skip `pnpm install` (`📝 PR format`, `🔬 actionlint`) pass.

[NEEDS CLARIFICATION: none — reproduction is complete and observed in run 35511626446.]

## Suspected Code Paths

- `.github/workflows/ci.yml` — install steps for format/lint/typecheck/test/scaffold-check/
  build-backend/build-spa/build-lib use `NODE_AUTH_TOKEN: ${{ secrets.GITHUB_TOKEN }}`
  with `registry-url: https://npm.pkg.github.com/` (added in commit `aba9977`).
- `.github/workflows/release.yml` — same pattern in the `validate` job.
- `package.json` / `pnpm-lock.yaml` — the workspace now depends on
  `@sousa99/homesweethome-config@0.1.0` (devDependency), published from
  `Sousa99/home-sweet-home-tools`, not from this repo.
- `home-sweet-home-tools/packages/config/package.json` — the package's `name` and
  `publishConfig.registry` (published to GitHub Packages under scope `@sousa99`).

## Root Cause Hypothesis

`@sousa99/homesweethome-config` is published from the **`home-sweet-home-tools`** repository.
GitHub Packages scopes a repository's `GITHUB_TOKEN` to packages published by **that same
repository** (or packages the repository has been explicitly granted access to). Because
`procrastinator-tracker`'s CI uses `NODE_AUTH_TOKEN: ${{ secrets.GITHUB_TOKEN }}` to install a
package that belongs to a *different* repo, GitHub returns **403 Forbidden** even though the
package is public. Locally the install works because the user-level `~/.npmrc` carries a PAT
with `read:packages`; CI has no such grant.

Confidence: **high** — the error message, the auth header actually sent (`ghs_...`), the
cross-repo package origin, and the local-success/CI-failure asymmetry all corroborate this.

## Proposed Remediation

**Preferred**: Grant `Sousa99/procrastinator-tracker` read access to the
`@sousa99/homesweethome-config` package in GitHub Packages settings
(Package → Settings → "Manage Actions access" → add `procrastinator-tracker`). This lets the
existing `GITHUB_TOKEN` flow work with no workflow changes and no new secrets. Repeat this
one-time grant for each future Home Sweet Home module repo that consumes the shared config
package.

**Alternatives**:
- Use a dedicated PAT (with `read:packages`) as a repository secret (e.g. `GH_PACKAGES_TOKEN`)
  in `procrastinator-tracker` and reference it instead of `GITHUB_TOKEN` in
  `.github/workflows/ci.yml` and `release.yml`. Works without per-repo package grants, but
  adds a secret to maintain in every module repo.
- Publish the config package to npmjs.com (no auth needed for public installs) — rejected
  earlier: diverges from the established `@sousa99/...` GitHub Packages pattern.

**Files likely to change**:
- None (repo-side) for the preferred option — the grant is a GitHub Packages settings action.
- If Option B is chosen: `.github/workflows/ci.yml`, `.github/workflows/release.yml` (swap
  `GITHUB_TOKEN` → `GH_PACKAGES_TOKEN`), plus a new repo secret.

**Tests to add or update**:
- Re-run the CI workflow on PR #5 after the grant; all install-dependent jobs must pass the
  supply-chain policy check.
- Verify `node scripts/scaffold.mjs --check` still exits 0 (no repo files change for the
  preferred option).

## Risks & Considerations

- The grant is scoped to GitHub Packages; no code, credentials, or repo secrets change for
  the preferred option.
- Each future module repo needs the same one-time grant (or Option B secrets) — worth
  documenting in the template's `docs/clarify.md` / tools README so it is not rediscovered.
- pnpm's supply-chain policy check re-fetches metadata from the registry on every install,
  so the failure is deterministic, not cache-related.

## Open Questions

- None. Root cause confirmed via CI logs and GitHub Packages behavior.