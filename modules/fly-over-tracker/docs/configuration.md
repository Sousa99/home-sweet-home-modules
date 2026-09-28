# Backend Configuration

The backend reads its runtime configuration from environment variables
(`backend/src/lib/config.ts` → `loadConfig`). Every variable has a safe
default; **no credentials are required** — the feeds run against the free,
open adsb.lol API. Everything is optional.

## How configuration is loaded

- `loadConfig()` parses `process.env` at startup and fails fast on invalid
  values (non-numeric ports, unknown `FEED` mode, ...).
- When the backend is started with `pnpm --filter ./modules/fly-over-tracker/backend dev` / `start`,
  the package's `.env` file (if present) is loaded via `dotenv/config`
  (`backend/src/index.ts`). **Existing environment variables always win** over
  `.env`, so container / CI-orchestrator env takes precedence.
- Tests never load `.env`; they inject environment explicitly.

## Data source: adsb.lol

Live aircraft positions come from the adsb.lol API
(`GET /v2/point/{lat}/{lon}/{radius}`, radius in nautical miles, max
250 nm ≈ 463 km) and flight routes from its standing-data route files
(`GET /routes/{xx}/{callsign}.json` on `vrs-standing-data.adsb.lol`, one
static file per callsign). Both are free and open (ODbL license), require no
API key today, and carry no OpenSky credit budget. The feed resolves origin
and destination airports for every matched aircraft; aircraft without a
resolvable route (e.g. general aviation, or planes on the ground) report
`null` origin/destination.

> **User-Agent**: adsb.lol rejects generic User-Agent strings (e.g. Node's
> default) with HTTP `403 "User-Agent too generic"`. The feeds always send
> `fly-over-tracker/1.2 (https://github.com/sousa99/fly-over-tracker)`, so no
> configuration is needed.

## Reference

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `ADSB_BASE_URL` | no | `https://api.adsb.lol` | adsb.lol API base URL |
| `ADSB_ROUTE_BASE_URL` | no | `https://vrs-standing-data.adsb.lol` | adsb.lol standing-data route files base URL |
| `FEED` | no | `adsb` | `adsb` or `mock` (deterministic offline data) |
| `FEED_TIMEOUT_MS` | no | `8000` | Per-request feed timeout |
| `HOST` | no | `127.0.0.1` | Bind address |
| `PORT` | no | `3000` | REST API port (`--http`) |
| `HTTP_PORT` | no | — | Backward-compatible alias for `PORT`; wins when both are set |
| `MCP_PORT` | no | `3001` | MCP server port (`--mcp`) |
| `MAX_RADIUS_KM` | no | `463` | Maximum accepted query radius (adsb.lol `/v2/point` cap) |
| `RETRY_ATTEMPTS` | no | `3` | Bounded retries on upstream `429` |
| `RETRY_DEFAULT_MS` | no | `2000` | Backoff when no retry-after header |
| `RETRY_CAP_MS` | no | `10000` | Upper bound for a single retry wait |
| `DEST_CACHE_TTL_MS` | no | `600000` | Cache TTL for found routes |
| `DEST_NEGATIVE_TTL_MS` | no | `60000` | Cache TTL for "not found" lookups |
| `LOG_LEVEL` | no | `debug` (dev) / `info` (prod) | pino level |
| `NODE_ENV` | no | `development` | Runtime environment |

## Usage patterns

### Local development

```bash
cp backend/.env.example backend/.env
pnpm --filter ./modules/fly-over-tracker/backend dev            # REST on :3000
pnpm --filter ./modules/fly-over-tracker/backend dev:mcp        # MCP on :3001
```

### Docker / orchestrator (released image)

The image ships with no secrets and needs none:

```bash
docker run -p 3000:3000 ghcr.io/sousa99/fly-over-tracker-backend
```

### GitHub Actions

No CI job requires credentials today (tests use the mock feed). The adsb.lol
feeds need no authentication.

## Note on generated docs

`README.md` and `setup.md` follow the uniform Home Sweet Home module documentation
structure; runtime configuration docs deliberately live here. They are maintained by
hand and reviewed in the same change as the code they describe.