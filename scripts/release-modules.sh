#!/usr/bin/env bash
set -euo pipefail

# Publish GHCR images and GitHub releases for the modules released by the
# current `changeset publish` run.
#
# Detection: a module is released when `changeset publish` created a git tag for
# its components package at the version currently in package.json, and that tag
# did not exist before this run. Modules without a new tag are untouched, which
# keeps releases independent (releasing module A never releases B or C).
#
# Usage: release-modules.sh <tags-before-file> [ghcr-org]

TAGS_BEFORE="${1:?usage: release-modules.sh <tags-before-file> [ghcr-org]}"
GHCR="${2:-ghcr.io/sousa99}"
PLATFORMS="${PLATFORMS:-linux/amd64}"

MODULES="fly-over-tracker procrastinator-tracker bus-catcher"

release_notes() {
  local changelog="$1"
  local version="$2"
  node -e '
    const fs = require("fs");
    const [path, version] = process.argv.slice(1);
    const txt = fs.readFileSync(path, "utf8");
    const escaped = version.replace(/[.+\-]/g, "\\$&");
    const m = txt.match(new RegExp(`## ${escaped}([\\s\\S]*?)(?=^## |\\Z)`, "m"));
    process.stdout.write(m ? m[1].trim() : "");
  ' "$changelog" "$version"
}

for m in $MODULES; do
  version=$(node -p "require('./modules/$m/frontend/package.json').version")
  tag="@sousa99/$m-components@$version"

  if grep -Fxq "$tag" "$TAGS_BEFORE"; then
    echo "[release] $m: no new tag ($tag already existed) — skipping"
    continue
  fi
  if ! git tag -l "$tag" | grep -q .; then
    echo "[release] $m: tag $tag not present after publish — skipping"
    continue
  fi

  echo "[release] releasing $m @ $version"
  docker buildx build --platform "$PLATFORMS" --push \
    --secret id=npm_token,env=NPM_TOKEN \
    -t "$GHCR/$m-backend:$version" \
    -t "$GHCR/$m-backend:latest" \
    -f "modules/$m/Dockerfile.backend" .
  docker buildx build --platform "$PLATFORMS" --push \
    --secret id=npm_token,env=NPM_TOKEN \
    -t "$GHCR/$m-frontend:$version" \
    -t "$GHCR/$m-frontend:latest" \
    -f "modules/$m/Dockerfile.frontend" .

  notes="$(release_notes "modules/$m/frontend/CHANGELOG.md" "$version")"
  gh release create "$tag" --title "$m v$version" --notes "$notes"
done