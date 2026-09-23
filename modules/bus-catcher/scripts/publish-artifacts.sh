#!/usr/bin/env bash
set -euo pipefail

VERSION="${1:?usage: publish-artifacts.sh <version>}"
PLATFORMS="${PLATFORMS:-linux/amd64}"
GHCR="ghcr.io/sousa99"


docker buildx build --platform "$PLATFORMS" --push \
  --secret id=npm_token,env=NPM_TOKEN \
  -t "$GHCR/bus-catcher-backend:$VERSION" \
  -t "$GHCR/bus-catcher-backend:latest" \
  -f Dockerfile.backend .


docker buildx build --platform "$PLATFORMS" --push \
  --secret id=npm_token,env=NPM_TOKEN \
  -t "$GHCR/bus-catcher-frontend:$VERSION" \
  -t "$GHCR/bus-catcher-frontend:latest" \
  -f Dockerfile.frontend .



echo "[publish] pushed $GHCR/bus-catcher-backend:$VERSION"

echo "[publish] pushed $GHCR/bus-catcher-frontend:$VERSION"
