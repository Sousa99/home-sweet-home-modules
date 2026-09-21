# Quickstart: Flight Destination Enrichment

Validation guide for `specs/003-flight-destination`. These scenarios prove the feature works
end-to-end. Wire shapes: [`contracts/`](./contracts/); domain model: [`data-model.md`](./data-model.md);
implementation details live in `tasks.md` and the implementation phase.

## Prerequisites

- Node.js 24 LTS, pnpm 11; `pnpm install` (no new dependencies added).
- **Optional**: a free OpenSky account with an API client (OAuth2
  `client_id`/`client_secret`). Full step-by-step instructions and the env
  reference live in [`docs/configuration.md`](../../docs/configuration.md).
  The simplest setup is to copy the example and fill it in:

  ```bash
  cp backend/.env.example backend/.env   # then fill in OPENSKY_CLIENT_ID/SECRET
  ```

  Without credentials the backend runs on the anonymous tier and enrichment
  reports `destinationEnrichment: "unavailable"` (spec FR-008).

## 1. Start the backend

```bash
pnpm --filter ./backend dev          # REST API (--http) on :3000
pnpm --filter ./backend dev:mcp      # MCP server (--mcp) on :3001
```

For deterministic, offline validation use the mock feed (includes fixture destinations):

```bash
FEED=mock pnpm --filter ./backend dev
```

**Expected**: pino logs show the servers listening (colored in dev via `pino-pretty`).

## 2. Validate the REST API (with credentials)

```bash
curl 'http://localhost:3000/api/fly-overs?lat=48.8566&lng=2.3522&radiusKm=50'
```

**Expected**: `200` with a `FlyOverResult` where each aircraft has a populated
`destinationAirport` (ICAO) and `destinationCountry` where the data source identifies the
destination, and `destinationEnrichment` is `"complete"` (or `"partial"` if some lookups were
rate-limited).

Also validate:

- **No credentials** (unset the env vars, restart): `destinationEnrichment` is `"unavailable"`
  and `destinationAirport`/`destinationCountry` are `null` — the core answer still works.
- **Unknown destination**: an aircraft whose route is unidentified returns `null` destinations,
  not an error.
- **Invalid input**: `curl 'http://localhost:3000/api/fly-overs?lat=999&lng=2&radiusKm=50'`
  → `400` with a flat `errors` list.
- **Empty area**: a remote/ocean location → `200` with `count: 0` and `destinationEnrichment`
  still reported.

## 3. Validate the MCP server

Smoke-check tool discovery:

```bash
curl -s -X POST http://localhost:3001/mcp \
  -H 'Content-Type: application/json' \
  -H 'Accept: application/json, text/event-stream' \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'
```

**Expected**: a `tools/list` response advertising `planes_over`. A `tools/call` with
`{ lat, lng, radiusKm }` returns the same `FlyOverResult` JSON as the REST endpoint, including
destinations and `destinationEnrichment` (parity by construction).

## 4. Validate the 429 backoff behavior

The live feed cannot be forced to 429 deterministically; validate via the automated tests:

```bash
pnpm --filter ./backend test
```

The unit tests cover: a mocked `429` with `X-Rate-Limit-Retry-After-Seconds` → waits, retries,
succeeds; persistent `429` → bounded attempts then `503 rate_limited`; a `401` → token refresh +
single retry; and independent states/flights retry budgets.

## 5. Validate the SPA (no UI change expected)

```bash
pnpm --filter ./frontend dev
```

Open `http://localhost:5173`. Query a busy location; each aircraft card's **Destination** row
(already rendered, `AircraftCard.tsx`) now shows the airport country/code instead of `—`.

## 6. Quality gates

```bash
pnpm lint
pnpm format
pnpm test
pnpm typecheck
node scripts/scaffold.mjs --check
```

**Expected**: all pass before commit/merge.

## Rate-limit awareness (updated)

Authenticated (standard) tier: **4,000 credits/day per bucket** (`/states/*`, `/flights/*`,
`/tracks/*` are independent). Each destination lookup costs **4 credits** (window clamped to the
current UTC day). A 20-aircraft query ≈ 80 `/flights/*` credits ≈ 50 such queries/day. Anonymous
tier: 400/day — prefer `FEED=mock` for repetitive validation. `429` surfaces as `503` only after
bounded retries honoring the retry-after header.

## Feasibility evaluation (deliverable)

The path-line feasibility evaluation (source, cost, latency, frontend fit, go/no-go) is in
[`research.md`](./research.md) Decision 8. Recommendation: **GO for on-demand per-selected-aircraft
tracks only** — no path-line implementation in this feature.