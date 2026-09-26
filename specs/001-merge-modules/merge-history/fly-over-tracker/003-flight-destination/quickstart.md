# Quickstart: Flight Destination Enrichment

Validation guide for `specs/003-flight-destination`. These scenarios prove the feature works
end-to-end. Wire shapes: [`contracts/`](./contracts/); domain model: [`data-model.md`](./data-model.md);
implementation details live in `tasks.md` and the implementation phase.

## Prerequisites

- Node.js 24 LTS, pnpm 11; `pnpm install` (no new dependencies added).
- No credentials required — the feeds use the free, open adsb.lol API. The
  simplest setup is to copy the example:

  ```bash
  cp backend/.env.example backend/.env
  ```

## 1. Start the backend

```bash
pnpm --filter ./backend dev          # REST API (--http) on :3000
pnpm --filter ./backend dev:mcp      # MCP server (--mcp) on :3001
```

For deterministic, offline validation use the mock feed (includes fixture routes):

```bash
FEED=mock pnpm --filter ./backend dev
```

**Expected**: pino logs show the servers listening (colored in dev via `pino-pretty`).

## 2. Validate the REST API

```bash
curl 'http://localhost:3000/api/fly-overs?lat=48.8566&lng=2.3522&radiusKm=50'
```

**Expected**: `200` with a `FlyOverResult` where each aircraft has populated
`originAirport`/`originCountry` and `destinationAirport`/`destinationCountry` where the data
source identifies the route, and `destinationEnrichment` is `"complete"` (or `"partial"` if the
route lookup was rate-limited).

Also validate:

- **No route feed**: a service built without a route feed reports `destinationEnrichment`
  `"unavailable"` and null origins/destinations — the core answer still works.
- **Unknown route**: an aircraft whose route is unidentified (e.g. general aviation, or on the
  ground) returns `null` origins/destinations, not an error.
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
succeeds; persistent `429` → bounded attempts then `503 rate_limited`; and independent
position/route retry budgets.

## 5. Validate the SPA

```bash
pnpm --filter ./frontend dev
```

Open `http://localhost:5173`. Query a busy location; each aircraft card's **Origin** and
**Destination** rows (`AircraftCard.tsx` / `AircraftMapCard.tsx`) show the airport country/code
instead of `—`; aircraft on the ground show `—` for both.

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

adsb.lol enforces dynamic, load-based rate limits (free, no key today; a future API key may be
required for production use) and **rejects generic User-Agent strings with `403`** — the feeds
always send a descriptive `fly-over-tracker/…` User-Agent. `429` surfaces as `503` only after
bounded retries honoring the retry-after header. Route lookups are one static
`GET /routes/{xx}/{callsign}.json` per aircraft (bounded concurrency). Prefer `FEED=mock` for
repetitive validation.

## Feasibility evaluation (deliverable)

The path-line feasibility evaluation (source, cost, latency, frontend fit, go/no-go) is in
[`research.md`](./research.md) Decision 8. Recommendation: **GO for on-demand per-selected-aircraft
tracks only** — no path-line implementation in this feature.