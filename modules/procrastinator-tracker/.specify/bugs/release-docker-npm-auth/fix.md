# Bug Fix: Release fails at Docker publish (npm auth inside image build)

- **Slug**: release-docker-npm-auth
- **Fixed**: 2026-09-20
- **Assessment**: ./assessment.md
- **Status**: applied

## Summary

The Release workflow failed on `main` after the squash-merge of PR #5 because the workspace
now depends on `@sousa99/homesweethome-config` from GitHub Packages, and two publish steps
could not authenticate:

1. **Docker image build** — `pnpm install` inside the image had no npm auth → `401`.
2. **npm package publish** — `setup-node registry-url` created a runner temp `.npmrc`
   containing `GITHUB_TOKEN`, which `@semantic-release/npm` used instead of `NPM_TOKEN` →
   `401 unauthenticated: User cannot be authenticated with the token provided`.

All fixed: the Docker build receives the token via a BuildKit secret, the release job no
longer uses `registry-url` (so `@semantic-release/npm` writes its own `NPM_TOKEN`), and npm
publish uses a dedicated PAT (`GH_PACKAGES_TOKEN`) with `write:packages`.

**Verified**: Release run `35526756156` — all jobs success; `@sousa99/procrastinator-tracker-components@1.1.4`,
both GHCR images at `1.1.4`, tag `v1.1.4`, and the GitHub release all published.

## Changes

| File | Change | Notes |
|------|--------|-------|
| `Dockerfile.backend` / `Dockerfile.frontend` (+ `.tpl`) | modified | Added `# syntax=docker/dockerfile:1`; before `pnpm install`, mount the `npm_token` BuildKit secret and write a valid GitHub Packages auth line to `/root/.npmrc` |
| `scripts/publish-artifacts.sh` (+ `.tpl`) | modified | Added `--secret id=npm_token,env=NPM_TOKEN` to both `docker buildx build` invocations |
| `.github/workflows/release.yml` (+ `.tpl`) | modified | `NPM_TOKEN: ${{ secrets.GITHUB_TOKEN }}` → `${{ secrets.GH_PACKAGES_TOKEN }}` (PAT with `write:packages`); `GITHUB_TOKEN` kept for GHCR/Docker + `@semantic-release/github` |
| Template repo: `Dockerfile.backend.tpl`, `Dockerfile.frontend.tpl`, `scripts/publish-artifacts.sh.tpl`, `.github/workflows/release.yml.tpl` | modified | Same changes, so new modules inherit the fix |
| `scripts/scaffold.mjs` (both repos) | modified | `--check` now strips the `version` field from `package.json` comparison — semantic-release owns the version, so a post-release repo stays in sync with templates |

## Diff Highlights

```dockerfile
# Dockerfile build stage
# syntax=docker/dockerfile:1
COPY . .
RUN --mount=type=secret,id=npm_token \
  echo "//npm.pkg.github.com/:_authToken=$(cat /run/secrets/npm_token)" > /root/.npmrc \
  && pnpm install --frozen-lockfile
```

```bash
# publish-artifacts.sh
docker buildx build --platform "$PLATFORMS" --push \
  --secret id=npm_token,env=NPM_TOKEN \
  ...
```

```yaml
# release.yml — semantic-release step
env:
  GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
  NPM_TOKEN: ${{ secrets.GH_PACKAGES_TOKEN }}
```

```js
// scaffold.mjs — version-insensitive drift check
function stripVersion(content) {
  return content.replace(/^\s*"version"\s*:\s*"[^"]*",?\s*$/m, '');
}
```

## Tests Added or Updated

No unit tests apply to CI/CD credentials. Verification is via the Release workflow re-runs:
- After the Docker-secret fix: both GHCR images pushed (backend + frontend at `1.1.2` +
  `latest`) — confirmed in run `35524987996`.
- After the npm PAT fix: npm package publish must succeed (pending final re-run).

## Local Verification

- `docker buildx build --secret id=npm_token,env=NPM_TOKEN -f Dockerfile.backend …` → build
  completed successfully (validated the `.npmrc` auth line locally).
- `node scripts/scaffold.mjs --check` → exit 0 in this repo and the template repo.

## Deviations from Assessment

The assessment proposed passing the GitHub token into the Docker build via a BuildKit secret
— implemented. Two follow-up deviations discovered during the fix:

1. The first attempt (`cp /run/secrets/npm_token /root/.npmrc`) wrote a bare token to
   `/root/.npmrc`, which is not a valid npm auth line. Corrected to write the full
   `//npm.pkg.github.com/:_authToken=…` line.
2. The assessment did not anticipate the **npm package publish** step also failing. After the
   Docker fix, `@semantic-release/npm` got `401 unauthenticated: User cannot be authenticated
   with the token provided`. Root cause was **not** that `GITHUB_TOKEN` cannot publish npm: the
   successful `v1.0.0` release used `GITHUB_TOKEN` as `NPM_TOKEN` and published fine. The
   regression was that feature-005 added `registry-url` to `setup-node` in the release job,
   which makes `setup-node` create a runner temp `.npmrc` (`NPM_CONFIG_USERCONFIG`) carrying
   `GITHUB_TOKEN`; `@semantic-release/npm` then found that existing auth line and used it
   instead of writing `NPM_TOKEN` (compare: successful run had no `registry-url` and logged
   "Wrote NPM_TOKEN"; failing runs had `registry-url` and logged no such line). Fix: removed
   `registry-url` from the release job's `setup-node`, write the install auth explicitly with
   the PAT, and set `NPM_TOKEN` to a dedicated PAT (`GH_PACKAGES_TOKEN`, `write:packages`)
   added as a repository secret.

## Follow-ups

- Document in the template that module releases need a `GH_PACKAGES_TOKEN` PAT secret
  (`write:packages`) for npm publish, and a "Manage Actions access" grant for cross-repo
  package reads (already noted in `docs/clarify.md`).
- The `scaffold --check` version-strip is intentional; do not revert it or releases will fail
  the validate gate on version drift.
- Do not re-add `registry-url` to `setup-node` in the release job — it overrides the
  `NPM_TOKEN` used by `@semantic-release/npm`.