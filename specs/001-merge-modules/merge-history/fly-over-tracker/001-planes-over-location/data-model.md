# Data Model: Planes Over a Location (MVP)

Phase 1 output for `specs/001-planes-over-location`. The MVP has **no persistence** — these
entities describe the domain model exchanged over the interfaces (REST + MCP), not database
tables. Types are derived from the shared zod schemas (`backend/src/domain/schemas.ts`) via
`z.infer`; the schemas are the single source of truth.

## Entities

### Location Query

The input to the capability: a GPS point and a radius.

| Field | Type | Validation | Notes |
|-------|------|-----------|-------|
| `lat` | number | `-90 ≤ lat ≤ 90` | WGS84 latitude, decimal degrees |
| `lng` | number | `-180 ≤ lng ≤ 180` | WGS84 longitude, decimal degrees |
| `radiusKm` | number | `0 < radiusKm ≤ maxRadiusKm` | Configurable max, default 500 km |

**Validation rules** (from spec FR-005, FR-013): both coordinates must be finite numbers;
radius must be positive and within the configured maximum; invalid input → `400` with a flat
field-errors body (see `contracts/`).

### Aircraft

A live aircraft over the queried area, as reported by the feed and filtered to the circle.

| Field | Type | Nullable | Notes |
|-------|------|----------|-------|
| `icao24` | string | no | Transponder address (hex) |
| `callsign` | string \| null | yes | Trimmed; may be empty/missing |
| `originCountry` | string \| null | yes | From feed state vector |
| `latitude` | number | no | Current position (feed snapshot) |
| `longitude` | number | no | Current position (feed snapshot) |
| `altitude` | number \| null | yes | Barometric altitude (m) |
| `onGround` | boolean | no | From feed state vector |
| `velocity` | number \| null | yes | Ground speed (m/s) |
| `trueTrack` | number \| null | yes | Heading (deg) |
| `verticalRate` | number \| null | yes | Vertical rate (m/s) |
| `distanceKm` | number | no | Great-circle distance from the query center |

**Derivation**: mapped from the OpenSky state vector by index (see `research.md` Decision 1).
Aircraft without a current latitude/longitude (null position) are excluded from results
(spec FR-001, FR-006).

### Fly-Over Result

The answer to a Location Query.

| Field | Type | Notes |
|-------|------|-------|
| `center` | `{ lat, lng }` | Echo of the query center |
| `radiusKm` | number | Echo of the query radius |
| `asOf` | number | Unix seconds the result reflects the feed (feed `time`) |
| `count` | number | Number of aircraft in the list |
| `aircraft` | Aircraft[] | Aircraft over the area (may be empty) |

**Relationships**: a `FlyOverResult` is produced by exactly one `LocationQuery`; it contains
zero or more `Aircraft`; each `Aircraft` carries the `distanceKm` from that query's center.

## State Transitions

None. The model is immutable and request-scoped: a query is created, a result is computed and
returned, nothing persists. Feed outage and empty-area cases produce either an error (spec
FR-008) or an empty `aircraft` list with `asOf` (spec FR-006) — never stale data presented as
fresh.

## Interface Parity

Because both the REST endpoint and the MCP tool are validated and typed by the same schemas and
served by the same `flyOverService`, the `FlyOverResult` shape is identical across interfaces by
construction (spec FR-004, FR-015). See `contracts/`.