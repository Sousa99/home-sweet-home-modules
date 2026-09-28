#!/bin/sh
set -e

# Emit the /api reverse-proxy location when a backend upstream is configured.
# Empty BACKEND_UPSTREAM keeps the SPA fully same-origin (no proxy).
if [ -n "$BACKEND_UPSTREAM" ]; then
  mkdir -p /etc/nginx/conf.d/proxy
  envsubst '$BACKEND_UPSTREAM' \
    < /etc/nginx/backend-proxy.conf.template \
    > /etc/nginx/conf.d/proxy/backend.conf
fi