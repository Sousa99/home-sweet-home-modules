# Quickstart: Planes Over a Location (MVP)

Runnable validation guide for `specs/001-planes-over-location`. It proves the feature works
end-to-end; implementation details live in `tasks.md` and the implementation phase. For the
full wire shapes see [contracts/](./contracts/) and [data-model.md](./data-model.md).

## Prerequisites

- Node.js 24 LTS, pnpm 11
- `pnpm install` (workspace: `backend`, `frontend`)

## 1. Start the backend

Two executions of the same dual-mode package (shared service layer):

```bash
pnpm --filter ./backend dev          # REST API (--http) on :3000
pnpm --filter ./backend dev:mcp      # MCP server (--mcp) on :3001
```

Both use the **live OpenSky Network feed** (anonymous tier). To validate fully offline or
deterministically, run with the mock feed:

```bash
FEED=mock pnpm --filter ./backend dev
```

**Expected**: pino logs show the server listening (colored in dev via `pino-pretty`).

## 2. Validate the REST API

Use the request collection `backend/http/fly-overs.http` (VS Code / JetBrains REST Client), or
`curl`. Pick a location with known air traffic, e.g. near CDG airport:

```bash
curl 'http://localhost:3000/api/fly-overs?lat=48.8566&lng=2.3522&radiusKm=50'
```

**Expected**: `200` with a `FlyOverResult` — `asOf`, `count`, and an `aircraft` array; each
aircraft has `icao24`, `callsign`, position, `altitude`, `velocity`, `trueTrack`,
`verticalRate`, and `distanceKm`.

Also validate:
- **Invalid input**: `curl 'http://localhost:3000/api/fly-overs?lat=999&lng=2&radiusKm=50'`
  → `400` with a flat `errors` list.
- **Empty area**: a remote/ocean location → `200` with `count: 0` and empty `aircraft`.
- **Feed outage**: stop network access or use the mock feed to simulate → `502`/`503` with a
  clear message (never stale data as fresh).

## 3. Validate the MCP server

The server speaks MCP Streamable HTTP at `http://localhost:3001/mcp`, matching the module's
`opencode.json` remote entry. A quick smoke check of tool discovery:

```bash
curl -s -X POST http://localhost:3001/mcp \
  -H 'Content-Type: application/json' \
  -H 'Accept: application/json, text/event-stream' \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'
```

**Expected**: a `tools/list` response advertising `planes_over`. Then `tools/call` with
`{ lat, lng, radiusKm }` returns the same `FlyOverResult` JSON as the REST endpoint (parity).

### Enable in opencode (optional, post-verification)

In `opencode.json`, flip the module entry to `"enabled": true`:

```json
{
  "mcp": {
    "fly-over-tracker": {
      "type": "remote",
      "url": "http://localhost:3001/mcp",
      "enabled": true
    }
  }
}
```

> `opencode.json` is a generated file (scaffold). After a hand edit, run
> `node scripts/scaffold.mjs --check` and re-render or update `module.config.yaml` to resolve
> any drift.

## 4. Validate the SPA

```bash
pnpm --filter ./frontend dev          # SPA dev server on :5173, proxies /api → :3000
```

Open `http://localhost:5173`. Type coordinates (e.g. `48.8566`, `2.3522`) and a radius
(`50`), submit, and see the aircraft list over that area. Then:

- Click **Refresh** — the list updates without resubmitting.
- Enter invalid values — inline validation/clear error, no request fired.
- Submit a remote/ocean location — empty-state message shown.

## 5. Validate the components library

```bash
pnpm --filter ./frontend storybook     # workbench on :6006
pnpm --filter ./frontend build:lib     # publishes dist-lib/ with the fly-over components
```

**Expected**: Storybook renders `FlyOverForm`, `FlyOverList`, and `AircraftCard` against sample
data; `build:lib` succeeds and exports them from `src/index.ts`.

## 6. Quality gates

```bash
pnpm lint
pnpm format
pnpm test
pnpm typecheck
node scripts/scaffold.mjs --check
```

**Expected**: all pass before commit/merge.

## Rate-limit awareness

The live feed is anonymous OpenSky: **400 credits/day, 10 credits/s**, costed by bounding-box
area (1 credit ≤25 sq°, more for larger areas). Frequent manual testing drains the daily budget
fast — prefer the `FEED=mock` mode for repetitive validation. The `429` response surfaces as a
clear `503` feed-unavailable error.