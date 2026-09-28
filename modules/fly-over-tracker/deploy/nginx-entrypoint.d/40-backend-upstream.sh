#!/bin/sh
set -e

# Publish the SPA runtime backend base URL (module standard: SPA reads API_BASE_URL at
# runtime, default '' => same-origin /api). Served as /config.json; the app fetches it
# before rendering.
echo "{\"apiBaseUrl\":\"${API_BASE_URL:-}\"}" > /usr/share/nginx/html/config.json

# Emit the /api reverse-proxy location when a backend upstream is configured.
# Empty BACKEND_UPSTREAM keeps the SPA fully same-origin (no proxy).
if [ -n "$BACKEND_UPSTREAM" ]; then
  mkdir -p /etc/nginx/conf.d/proxy
  envsubst '$BACKEND_UPSTREAM' \
    < /etc/nginx/backend-proxy.conf.template \
    > /etc/nginx/conf.d/proxy/backend.conf
fi