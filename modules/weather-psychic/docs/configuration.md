# Backend Configuration

The backend reads its runtime configuration from environment variables
(`backend/src/lib/config.ts` → `loadConfig`). Every variable has a safe
default; **no credentials are required** — the module runs against the free,
keyless Open-Meteo API. Everything is optional.

## How configuration is loaded

- `loadConfig()` parses `process.env` at startup and fails fast on invalid
  values (non-numeric ports, unknown `FEED` mode, ...).
- When the backend is started with `pnpm --filter ./modules/weather-psychic/backend dev` /
  `start`, the package's `.env` file (if present) is loaded via `dotenv/config`
  (`backend/src/index.ts`). **Existing environment variables always win** over
  `.env`, so container / CI-orchestrator env takes precedence.
- Tests never load `.env`; they inject environment explicitly.

## Data source: Open-Meteo

Live weather comes from the free, keyless Open-Meteo API — the forecast
endpoint (`/v1/forecast`, current + hourly + daily) and the geocoding endpoint
(`/v1/search`). No account, registration, or API key is required; only a
location query (a coordinate) is transmitted. The `mock` feed mode
(`FEED=mock`) returns deterministic fixtures so the module runs fully offline
and its tests stay hermetic.

## Reference

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `PORT` | no | `3000` | Port of the REST API (`--http` execution) |
| `MCP_PORT` | no | `3001` | Port of the MCP server (`--mcp` execution) |
| `HOST` | no | `127.0.0.1` | Hostname/interface the servers bind to |
| `FEED` | no | `open-meteo` | Feed implementation: `open-meteo` (live) or `mock` (offline deterministic) |
| `OPEN_METEO_BASE_URL` | no | `https://api.open-meteo.com` | Base URL of the Open-Meteo forecast endpoint |
| `OPEN_METEO_GEOCODING_URL` | no | `https://geocoding-api.open-meteo.com` | Base URL of the Open-Meteo geocoding endpoint |
| `FEED_TIMEOUT_MS` | no | `8000` | Timeout in milliseconds for a single provider request |
| `LOG_LEVEL` | no | `debug` (dev) / `info` (prod) | pino log level |
| `NODE_ENV` | no | `development` | Runtime environment |

## Privacy note

Weather data is inherently external. The module only ever sends a location
query (coordinates) to the keyless Open-Meteo provider — no household data
leaves the home. The `mock` feed keeps the module functional and fully testable
without network access (see the module README for the Local-First exception
rationale).