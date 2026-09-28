#!/usr/bin/env bash
set -euo pipefail

# Publish GHCR images and GitHub releases for released modules.
#
# A module is "released" when its frontend package version is not yet published to
# GHCR for that version: we push the missing backend/frontend images and create a
# GitHub release. Idempotent — re-running skips versions already on GHCR. This works
# for modules with publishable components (tagged by changesets on npm) AND for
# image-only modules whose packages are private (versions bumped by changesets but
# never published to npm, e.g. bus-catcher).
#
# Usage: release-modules.sh [ghcr-org]

GHCR="${1:-ghcr.io/sousa99}"
PLATFORMS="${PLATFORMS:-linux/amd64}"

MODULES="fly-over-tracker procrastinator-tracker bus-catcher current-time"

release_notes() {
  local changelog="$1"
  local version="$2"
  if [[ ! -f "$changelog" ]]; then
    echo ""
    return 0
  fi
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
  echo "[release] $m @ $version"

  for target in backend frontend; do
    if [[ ! -f "modules/$m/Dockerfile.$target" ]]; then
      echo "[release]   no Dockerfile.$target — skipping ($m is frontend-only for this target)"
      continue
    fi
    image="$GHCR/$m-$target:$version"
    if docker manifest inspect "$image" >/dev/null 2>&1; then
      echo "[release]   $image already exists — skipping"
      continue
    fi
    echo "[release]   pushing $image (+ latest)"
    docker buildx build --platform "$PLATFORMS" --push \
      --secret id=npm_token,env=NPM_TOKEN \
      -t "$image" \
      -t "$GHCR/$m-$target:latest" \
      -f "modules/$m/Dockerfile.$target" .
  done

  tag="@sousa99/$m-components@$version"
  if gh release view "$tag" >/dev/null 2>&1; then
    echo "[release]   GitHub release $tag already exists — skipping"
    continue
  fi
  notes="$(release_notes "modules/$m/frontend/CHANGELOG.md" "$version")"
  if [[ -z "$notes" ]]; then
    notes="Release of $m v$version."
  fi
  echo "[release]   creating GitHub release $tag"
  gh release create "$tag" --title "$m v$version" --notes "$notes"
done