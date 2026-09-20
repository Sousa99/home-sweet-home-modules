# Research: Planes Over a Location (MVP)

Phase 0 output for `specs/001-planes-over-location`. Every decision is recorded with its
rationale and the alternatives considered. All `NEEDS CLARIFICATION` items from the spec and
plan were resolved during planning (user decisions: manual refresh only; anonymous OpenSky;
Hono + zod; REST-only `.http` collection; pino logger with pretty console output).

---

## Decision 1: Live aircraft data source — OpenSky Network (anonymous)

- **Decision**: Use the OpenSky Network REST API (`GET /api/states/all`) as the live aircraft
  position feed, anonymous tier.
- **Rationale**: Free and public; no API key required; provides live state vectors with
  position, altitude, velocity, heading, and identification for all tracked aircraft; queryable
  by geographic bounding box, which fits the "point + radius" use case.
- **Alternatives considered**:
  - Self-hosted ADS-B receiver — full control but requires hardware/network setup; out of scope.
  - Commercial feeds (FlightAware, ADS-B Exchange, FlightRadar24) — reliable but paid; user
    chose free.

**Key API facts** (verified against OpenSky REST docs):
- `GET https://opensky-network.org/api/states/all?lamin=&lomin=&lamax=&lomax=&extended=1`
- Response `{ time, states: [...] }`; each state vector is an array:
  | Index | Field |
  |-------|-------|
  | 0 | `icao24` |
  | 1 | `callsign` |
  | 2 | `origin_country` |
  | 3 | `time_position` |
  | 4 | `last_contact` |
  | 5 | `longitude` |
  | 6 | `latitude` |
  | 7 | `baro_altitude` |
  | 8 | `on_ground` |
  | 9 | `velocity` (m/s) |
  | 10 | `true_track` (deg) |
  | 11 | `vertical_rate` (m/s) |
  | 12 | `sensors` |
  | 13 | `geo_altitude` |
  | 14 | `squawk` |
  | 15 | `spi` |
  | 16 | `position_source` |
  | 17 | `category` (only with `extended=1`) |
- Fields may be `null` (position/velocity omitted when stale >15s). Aircraft without a current
  position must be filtered out.
- **Rate limits** (credit system): anonymous = 400 credits/day, 10 credits/s; cost scales with
  bbox area (1 credit ≤25 sq°, up to 4 for >400 sq°). `429 Too Many Requests` +
  `X-Rate-Limit-Retry-After-Seconds` on exhaustion.
- Anonymous time resolution is 10 seconds.
- **Auth change**: since 2026-03-18 basic auth is removed; authenticated access requires
  OAuth2 client credentials. MVP uses anonymous only (user decision Q2: A).

## Decision 2: Geometry — bounding box + haversine filter

- **Decision**: Convert the circle (point + radius) to a bounding box, query the feed with the
  box, then compute the great-circle (haversine) distance from the center for every aircraft
  and keep those `distance ≤ radius`.
- **Rationale**: The feed only supports bbox queries; the box is the superset we must filter
  down to an exact circle. Haversine gives accurate geodesic distance on a sphere (sufficient
  at our radii).
- **Details**: km→degrees latitude is constant (~1° ≈ 111.19 km); km→degrees longitude scales
  by `cos(lat)`; longitude wrap-around at the antimeridian is a handled edge case.
- **MVP limitation (documented)**: `bboxFromCircle` clamps to `[-90, 90]` latitude and
  `[-180, 180]` longitude instead of wrapping across the antimeridian, so a box straddling the
  date line may miss aircraft on its far edge for very large radii. Near the poles the
  longitude span is widened to the full `[-180, 180]`. See the JSDoc in `geometry.ts`.

## Decision 3: REST framework — Hono + zod

- **Decision**: `hono` served on Node via `@hono/node-server`; request validation with
  `@hono/zod-validator` against shared zod v4 schemas.
- **Rationale**: Web-standard, lightweight, first-class zod validation with typed
  `c.req.valid()`, `hono/testing` `testClient()` for in-process contract tests, and the MCP SDK
  ships a first-class Hono integration (see Decision 4) so both servers share one framework.
- **Alternatives considered**: `node:http` built-in (rejected — no validation middleware, no
  typed requests, more boilerplate); Express (rejected — heavier, no SDK adapter advantage);
  Fastify (rejected — no SDK adapter).
- **zod v4**: pin one zod major (v4) workspace-wide; `@hono/zod-validator` 0.8+ supports zod
  3 and 4. MCP SDK input schemas accept `zod/v4` objects directly — same schema instance is
  reused across REST and MCP (parity by construction).

## Decision 4: MCP server — `createMcpHonoApp` + `createMcpHandler` factory

- **Decision**: Use `@modelcontextprotocol/hono` (`createMcpHonoApp`) and
  `@modelcontextprotocol/server` (`McpServer`, `createMcpHandler`), mounted on a single
  `app.all('/mcp', c => handler.fetch(c.req.raw, { parsedBody: c.get('parsedBody') }))` route,
  served on port 3001 via `@hono/node-server`.
- **Rationale**: This is the SDK's current recommended remote-server pattern. The factory
  produces a fresh `McpServer` per request and serves 2025-era streamable-HTTP clients —
  exactly what the module's `opencode.json` remote entry
  (`http://localhost:3001/mcp`, `type: remote`) expects. `createMcpHonoApp` arms localhost
  Host/Origin (DNS-rebinding) guards by default and pre-parses JSON bodies.
- **Alternatives considered**: per-session `NodeStreamableHTTPServerTransport` state map
  (rejected — more moving parts; factory pattern covers remote clients, incl. opencode);
  stdio transport (rejected — not compatible with the `remote` opencode config).

## Decision 5: Logging — pino + pino-pretty

- **Decision**: `pino` structured logger with a small Hono-native request-logging middleware
  (method, path, status, duration) on the REST app; `pino-pretty` as a dev-only transport for
  readable console output. Silent in tests.
- **Rationale**: Industry-standard structured JSON logging; the middleware logs the same fields
  `pino-http` would (method, path, status, duration) without the Express-style adapter friction;
  `pino-pretty` satisfies the requirement for "nice to the eyes on the console" during
  development while prod stays JSON for observability.
- **Implementation note**: `pino-http` was initially planned but is Express-style middleware and
  does not fit Hono's `app.use`; a native middleware was chosen instead (same output, fully
  typed). The `pino-http` dependency was removed.
- **Alternatives considered**: zero-dep custom logger (rejected — hand-rolled levels/JSON/pretty
  and request middleware for little benefit); user explicitly chose pino.

## Decision 6: Shared zod schemas as single source of truth

- **Decision**: Define `LocationQuerySchema`, `AircraftSchema`, `FlyOverResultSchema` in
  `backend/src/domain/schemas.ts`; use them for REST query validation, the MCP tool
  `inputSchema`, and `z.infer` domain types.
- **Rationale**: Guarantees the MCP tool and REST endpoint accept and produce identical shapes
  (spec FR-004/FR-015 parity) with a single definition; no schema drift between interfaces.

## Decision 7: Feed abstraction + mock

- **Decision**: Define an `AircraftFeed` interface (implemented by `opensky.ts` and `mock.ts`);
  the service depends on the interface; `--mock` flag (or `FEED=mock`) selects the
  deterministic mock feed.
- **Rationale**: Unit/contract/parity tests run without network and are deterministic; quickstart
  can validate offline; the real feed swap is one implementation.
- **Note**: tests never hit the live feed; anonymous daily credit budget is preserved for manual
  dev/quickstart use.

## Decision 8: No caching / persistence / interpolation (MVP)

- **Decision**: Each request queries the feed directly; no DB, no cache, no interpolation of
  positions between snapshots.
- **Rationale**: Explicit user scope for the MVP ("current status mapped directly through the
  api"); keeps complexity low; OpenSky position staleness (>15s) is accepted as-is and the
  `asOf` timestamp communicates freshness. Interpolation is documented as a future enhancement
  in the spec.

## Decision 9: SPA — manual refresh, components-first, final look/feel

- **Decision**: SPA = app shell + `FlyOverForm` (lat/lng/radius inputs) + `FlyOverList` with a
  manual "Refresh" button; built on the existing HSH theme and `ui/` primitives; the same
  components are exported from the library entry (`src/index.ts`) and demoed in Storybook.
- **Rationale**: User chose manual refresh for the MVP (auto-refresh deferred) and requested the
  SPA already reflect the final look/feel; a components-first build means the SPA and the
  publishable library share the same source, per the module's package organization.
- **Frontend notes**: `index.html`, `src/main.tsx`, `src/App.tsx`, and `src/index.ts` do not
  exist yet and must be created (the SPA and library entries are currently absent).

## Decision 10: Testing strategy

- **Decision**: Vitest in both packages. Backend: pure-function unit tests (geometry, schemas,
  mapping, logger, errors), service tests with mocked feed, REST contract tests via
  `hono/testing` `testClient`, MCP tool/parity tests via an in-process MCP `Client` driving
  `handler.fetch`. Frontend: Testing Library component tests with mocked `fetch`.
- **Rationale**: Fast, deterministic, no network/ports in tests; parity is provable by
  asserting REST and MCP return identical payloads for identical input.

## Decision 11: Dockerfile fix (no DB in MVP)

- **Decision**: Remove the `node dist/migrate.js &&` prefix from the backend image `CMD` and the
  `COPY backend/drizzle` step, since the MVP has no database or migrations.
- **Rationale**: The template's Dockerfile expects `dist/migrate.js` and a `drizzle/` dir that
  no longer exist; without the fix the release image build fails.