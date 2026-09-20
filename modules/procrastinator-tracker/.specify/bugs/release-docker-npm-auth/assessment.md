# Bug Assessment: Release fails at Docker publish (npm auth inside image build)

- **Slug**: release-docker-npm-auth
- **Created**: 2026-09-20
- **Source**: pasted text — "the release of procrastinator failed on main after squash merge. evaluate why and proprose a fix, we can fix it directly on main as an hotfix"
- **Verdict**: valid
- **Severity**: high

## Report (verbatim or summarized)

The Release workflow failed on `main` after the squash-merge of PR #5. The `🚀 Release` job
aborted while publishing the Docker images. User requested evaluation and a fix applied
directly on `main` as a hotfix.

CI run `35512805252` (Release, `main`):
- `🧪 Validate` — success.
- `🚀 Release` — failure at `scripts/publish-artifacts.sh 1.1.0` (Docker build).

Key log excerpt:

```
#11 7.887 [ERR_PNPM_FETCH_401] GET https://npm.pkg.github.com/@sousa99%2Fhomesweethome-config: Unauthorized - 401
#11 ERROR: process "/bin/sh -c pnpm install --frozen-lockfile" did not complete successfully
ERROR: failed to build: failed to solve: ... docker build
```

## Symptom

The release pipeline computes a new version (1.1.0), creates the tag and version commit, then
fails when building the backend/frontend Docker images because `pnpm install` inside the image
cannot authenticate to GitHub Packages to fetch `@sousa99/homesweethome-config`. Expected: the
images build and publish.

## Reproduction

1. Squash-merge PR #5 (`feat: add Home Sweet Home module template (005)`) to `main`.
2. The `Release` workflow runs (push to `main`).
3. `🧪 Validate` passes (runner has npm auth via `setup-node`).
4. `🚀 Release` → semantic-release → `@semantic-release/exec` `publishCmd` →
   `scripts/publish-artifacts.sh 1.1.0`.
5. `docker buildx build` runs `Dockerfile.backend` / `Dockerfile.frontend`, whose build stage
   runs `pnpm install --frozen-lockfile` with **no npm auth** in the build context →
   `401` fetching `@sousa99/homesweethome-config` → build fails → release aborts.

## Suspected Code Paths

- `Dockerfile.backend:7` — `RUN pnpm install --frozen-lockfile` (build stage, no auth context).
- `Dockerfile.frontend:7` — same.
- `scripts/publish-artifacts.sh` — both `docker buildx build` invocations pass no npm
  credentials into the build context.
- `.github/workflows/release.yml` — semantic-release step already exports `NPM_TOKEN` (=
  `GITHUB_TOKEN`), forwarded to `publish-artifacts.sh` by `@semantic-release/exec`.
- `package.json` / `pnpm-lock.yaml` — root devDependency `@sousa99/homesweethome-config`
  (published from `home-sweet-home-tools`), which `pnpm install` must fetch.

## Root Cause Hypothesis

The workspace depends on `@sousa99/homesweethome-config` from GitHub Packages. CI jobs run
`pnpm install` directly on the runner where `setup-node` supplies `NODE_AUTH_TOKEN`, so they
pass. The Release job, however, builds the images via `docker buildx build`, and the Docker
build context **does not inherit the runner's npm auth**. `pnpm install --frozen-lockfile`
inside the image therefore gets `401 Unauthorized`. The release is now unreleasable — a
regression introduced by feature 005's shared-config dependency.

Confidence: **high** — log shows the 401 on the exact package, only the Docker step fails, and
the runner-side install succeeds.

## Proposed Remediation

**Preferred**: Pass the GitHub Packages token into the Docker build as a **BuildKit secret**
(kept out of image layers), and install it before `pnpm install`:

- `scripts/publish-artifacts.sh` (and `.tpl`): add `--secret id=npm_token,env=NPM_TOKEN` to
  both `docker buildx build` invocations. `NPM_TOKEN` is already exported to the publish
  script by `@semantic-release/exec`.
- `Dockerfile.backend` and `Dockerfile.frontend` (and `.tpl`): add `# syntax=docker/dockerfile:1`
  and, before `RUN pnpm install --frozen-lockfile`:
  `RUN --mount=type=secret,id=npm_token cp /run/secrets/npm_token /root/.npmrc`.

Apply the same changes to the template repo's `.tpl` files so future modules inherit the fix.

**Alternatives**:
- `--build-arg NPM_TOKEN=...` — simpler, but the token appears in `docker history` (image
  metadata), leaking the credential on public images. Rejected for the Dockerfiles.
- Remove the root devDependency from the Docker install path — not viable cleanly; the
  backend build still needs workspace devDependencies.

**Files likely to change**:
- `Dockerfile.backend`, `Dockerfile.frontend` (+ `.tpl` in this repo)
- `scripts/publish-artifacts.sh` (+ `.tpl` in this repo)
- Template repo: `Dockerfile.backend.tpl`, `Dockerfile.frontend.tpl`,
  `scripts/publish-artifacts.sh.tpl`

**Tests to add or update**:
- Re-run the Release workflow after the hotfix: both images publish to GHCR at `1.1.0`
  (`latest` too).
- Verify `@sousa99/procrastinator-tracker-components@1.1.0` exists on GitHub Packages (npm
  publish was skipped last run because the Docker step failed first in the plugin chain).
- `node scripts/scaffold.mjs --check` → exit 0 (generated files stay in sync with `.tpl`).

## Risks & Considerations

- BuildKit secret requires Buildx (already used by the workflow) — no new infra.
- The one-time "Manage Actions access" grant from the prior bug remains required for
  cross-repo reads; this fix supplies the credential inside the image build.
- Hotfix on `main` must be based on `origin/main` (which contains the `chore(release): 1.1.0`
  commit and tag `v1.1.0`), not the stale local `1.0.0` working tree.

## Open Questions

- None. Root cause confirmed via release logs and Docker build behavior.