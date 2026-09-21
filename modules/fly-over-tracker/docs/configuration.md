# Backend Configuration

The backend reads its runtime configuration from environment variables
(`backend/src/lib/config.ts` → `loadConfig`). Every variable has a safe
default; **only the OpenSky credentials are required for destination
enrichment** — everything else is optional.

## How configuration is loaded

- `loadConfig()` parses `process.env` at startup and fails fast on invalid
  values (non-numeric ports, unknown `FEED` mode, ...).
- When the backend is started with `pnpm --filter ./backend dev` / `start`,
  the package's `.env` file (if present) is loaded via `dotenv/config`
  (`backend/src/index.ts`). **Existing environment variables always win** over
  `.env`, so container / CI-orchestrator env takes precedence.
- Tests never load `.env`; they inject environment explicitly.

## Getting OpenSky API credentials

Destination enrichment requires an authenticated OpenSky account (the
anonymous tier cannot resolve destinations). Since **2026-03-18** OpenSky only
accepts the **OAuth2 client-credentials flow** — username/password basic auth
is gone.

1. Create a free account at <https://opensky-network.org> (Sign up).
2. Log in and open your **Account** page.
3. In the **API client** card, create a new API client. You receive:
   - `client_id` — ends in `-api-client` (e.g. `abc123-api-client`)
   - `client_secret` — shown once / available in the downloadable
     `credentials.json`
   > Use the **API client** credentials only for the REST API. The feeder and
   > Trino interfaces use your plain website username — do not enter the API
   > client id there.
4. Configure the backend with those two values (see below).

Registered users get the **standard tier** (4,000 credits/day per endpoint
bucket) instead of the anonymous 400/day.

## Reference

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `OPENSKY_CLIENT_ID` | for enrichment | *(empty)* | OpenSky OAuth2 client id |
| `OPENSKY_CLIENT_SECRET` | for enrichment | *(empty)* | OpenSky OAuth2 client secret |
| `OPENSKY_TOKEN_URL` | no | `https://auth.opensky-network.org/auth/realms/opensky-network/protocol/openid-connect/token` | Token endpoint |
| `OPENSKY_BASE_URL` | no | `https://opensky-network.org` | Position feed base URL |
| `FEED` | no | `opensky` | `opensky` or `mock` (deterministic offline data) |
| `FEED_TIMEOUT_MS` | no | `8000` | Per-request feed timeout |
| `HOST` | no | `127.0.0.1` | Bind address |
| `HTTP_PORT` | no | `3000` | REST API port (`--http`) |
| `MCP_PORT` | no | `3001` | MCP server port (`--mcp`) |
| `MAX_RADIUS_KM` | no | `500` | Maximum accepted query radius |
| `RETRY_ATTEMPTS` | no | `3` | Bounded retries on upstream `429` |
| `RETRY_DEFAULT_MS` | no | `2000` | Backoff when no retry-after header |
| `RETRY_CAP_MS` | no | `10000` | Upper bound for a single retry wait |
| `DEST_WINDOW_H` | no | `24` | Destination lookup window (clamped to the current UTC day) |
| `DEST_CONCURRENCY` | no | `8` | Parallel destination lookups per query |
| `DEST_CACHE_TTL_MS` | no | `600000` | Cache TTL for found destinations |
| `DEST_NEGATIVE_TTL_MS` | no | `60000` | Cache TTL for "not found" lookups |
| `LOG_LEVEL` | no | `debug` (dev) / `info` (prod) | pino level |
| `NODE_ENV` | no | `development` | Runtime environment |

## Usage patterns

### Local development

```bash
cp backend/.env.example backend/.env   # then fill in OPENSKY_CLIENT_ID/SECRET
pnpm --filter ./backend dev            # REST on :3000
pnpm --filter ./backend dev:mcp        # MCP on :3001
```

### Docker / orchestrator (released image)

Inject at container runtime — the image itself contains no secrets:

```bash
docker run -p 3000:3000 \
  -e OPENSKY_CLIENT_ID="$OPENSKY_CLIENT_ID" \
  -e OPENSKY_CLIENT_SECRET="$OPENSKY_CLIENT_SECRET" \
  ghcr.io/sousa99/fly-over-tracker-backend
```

or via your orchestrator's secrets mechanism (e.g. Kubernetes `envFrom` a
Secret). Never bake credentials into the image or commit them.

### GitHub Actions

No CI job requires credentials today (tests use the mock feed). If a future
CI/scheduled step needs authenticated access, store the two values as
repository or organization **secrets** named `OPENSKY_CLIENT_ID` and
`OPENSKY_CLIENT_SECRET` and reference them with `${{ secrets.OPENSKY_CLIENT_ID }}`
— never inline them in workflow files.

## Note on generated docs

`README.md` and `setup.md` are scaffold-generated from `module.config.yaml`;
runtime configuration docs deliberately live here to avoid template drift.
Run `node scripts/scaffold.mjs --check` before merge.