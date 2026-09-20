#!/usr/bin/env bash
set -euo pipefail

VERSION="${1:?usage: publish-artifacts.sh <version>}"
PLATFORMS="${PLATFORMS:-linux/amd64}"
GHCR="ghcr.io/sousa99"


docker buildx build --platform "$PLATFORMS" --push \
  --secret id=npm_token,env=NPM_TOKEN \
  -t "$GHCR/fly-over-tracker-backend:$VERSION" \
  -t "$GHCR/fly-over-tracker-backend:latest" \
  -f Dockerfile.backend .


docker buildx build --platform "$PLATFORMS" --push \
  --secret id=npm_token,env=NPM_TOKEN \
  -t "$GHCR/fly-over-tracker-frontend:$VERSION" \
  -t "$GHCR/fly-over-tracker-frontend:latest" \
  -f Dockerfile.frontend .



echo "[publish] pushed $GHCR/fly-over-tracker-backend:$VERSION"

echo "[publish] pushed $GHCR/fly-over-tracker-frontend:$VERSION"
