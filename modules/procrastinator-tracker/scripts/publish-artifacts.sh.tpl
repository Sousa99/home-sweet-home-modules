#!/usr/bin/env bash
set -euo pipefail

VERSION="${1:?usage: publish-artifacts.sh <version>}"
PLATFORMS="${PLATFORMS:-linux/amd64}"
GHCR="{{GHCR_ORG}}"

{{#if backend}}
docker buildx build --platform "$PLATFORMS" --push \
  -t "$GHCR/{{MODULE_SLUG}}-backend:$VERSION" \
  -t "$GHCR/{{MODULE_SLUG}}-backend:latest" \
  -f Dockerfile.backend .
{{/if}}
{{#if frontend}}
docker buildx build --platform "$PLATFORMS" --push \
  -t "$GHCR/{{MODULE_SLUG}}-frontend:$VERSION" \
  -t "$GHCR/{{MODULE_SLUG}}-frontend:latest" \
  -f Dockerfile.frontend .
{{/if}}

{{#if backend}}
echo "[publish] pushed $GHCR/{{MODULE_SLUG}}-backend:$VERSION"
{{/if}}{{#if frontend}}
echo "[publish] pushed $GHCR/{{MODULE_SLUG}}-frontend:$VERSION"
{{/if}}