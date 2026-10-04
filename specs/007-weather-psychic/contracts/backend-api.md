# Backend API Contract: Weather Psychic

**Branch**: `007-weather-psychic` | **Date**: 2026-10-04 | **Spec**: [../spec.md](../spec.md) | **Plan**: [../plan.md](../plan.md)

The backend exposes the same capabilities through two interfaces — a **REST API** and an **MCP
server** — backed by the same service layer and the same shared zod schemas, so parity is by
construction (constitution Principle V). Both interfaces are read-only.

## 1. Shared domain schemas

One set of zod schemas (`backend/src/domain/schemas.ts`) is used by REST validation and MCP
`inputSchema`/responses. Field types are as in [`data-model.md`](../data-model.md).

- `LocationSchema` — `Location` object (id, name, latitude, longitude, timezone, country?, admin1?).
- `LocationQuerySchema` — `{ query: string }` (min 2 chars) for location search.
- `ForecastQuerySchema` — `{ lat: number, lng: number }` (ranges as in the data model) for forecast.
- `CurrentWeatherSchema`, `HourlyEntrySchema`, `DailyEntrySchema`, `ForecastSchema` — response
  shapes (see [`data-model.md`](../data-model.md)).

## 2. REST API

Base path `/api`. JSON bodies; errors use the shared envelope
`{ success: false, message: string, errors?: FieldError[] }` (the same envelope the other modules
use, e.g. fly-over-tracker). Error codes are mapped to HTTP statuses: `validation_error` → 400,
`provider_unavailable` → 502, unknown → 500. No error code or `retryable` flag is serialized in the
body — the status code is the contract.

### `GET /api/health`

- **200**: `{ ok: true, service: 'weather-psychic' }`

### `GET /api/locations/search?query=<text>`

Search for places by name (uses the provider geocoding feed).

- **200**: `{ results: Location[] }` (empty array when no matches).
- **400**: `{ success: false, message: 'Invalid location query', errors }` when `query` is missing
  or shorter than 2 chars.

### `GET /api/weather?lat=<number>&lng=<number>`

Current + hourly + daily forecast for a coordinate.

- **200**: `Forecast` (`{ location, current, hourly, daily, generatedAt }`). The `hourly` array's
  first entry is the next local hour (current hour excluded, FR-003); the `daily` array's first
  entry is tomorrow (current day excluded, FR-005). `generatedAt` is the server generation time.
- **400**: `{ success: false, message: 'Invalid forecast query', errors }` when `lat`/`lng` are
  missing, non-numeric, or out of range.
- **502**: `{ success: false, message }` when the upstream weather provider is unreachable or fails
  (transient); **500** `{ success: false, message: 'Unexpected internal error' }` otherwise.

### Errors (all REST endpoints)

| Status | Message | Meaning |
|--------|---------|---------|
| 400 | `Invalid forecast query` / `Invalid location query` | Invalid/missing query params (with `errors` field detail). |
| 404 | `Not found` | Unknown path. |
| 502 | provider-failure message | Upstream provider failure (transient). |
| 500 | `Unexpected internal error` | Unexpected failure (masked). |

## 3. MCP server

Served over Streamable HTTP at `/mcp` (native dev `MCP_PORT` 3001, host `3204`). Two tools, using
the same shared schemas:

| Tool | inputSchema | Returns |
|------|-------------|---------|
| `weather.search` | `{ query: string }` | `{ results: Location[] }` |
| `weather.get_forecast` | `{ lat: number, lng: number }` | `Forecast` (same shape as `GET /api/weather`) |

Responses: success = `{ content: [{ type: 'text', text: JSON.stringify(value) }] }`; failure =
`{ isError: true, content: [{ type: 'text', text: JSON.stringify({ success: false, message }) }] }`.
The tool result payloads are byte-for-byte the same objects the REST endpoints return (parity
tested in `backend/src/tests/contract/`).

## 4. Validation coverage

- `backend/src/tests/contract/rest-mcp-parity.test.ts` — for a fixed coordinate and a fixed query,
  the REST response and the MCP tool response are identical (deep equal).
- `backend/src/tests/contract/rest-contracts.test.ts` — endpoint contracts: 200 shapes for `/api/health`, `/api/weather`, `/api/locations/search`; 400 validation; 404 unknown path.
- `backend/src/tests/unit/conditions.test.ts` — WMO-code → condition mapping fixture.
- `backend/src/tests/unit/weather-service.test.ts` — hourly excludes current hour; daily excludes
  current day; ordering; generation timestamp.