# Data Model: Flight Destination Enrichment

Phase 1 output for `specs/003-flight-destination`. Backend-only additive change to the shared
domain model (`backend/src/domain/schemas.ts`); the SPA renders the enriched fields with no UI
change. As with the MVP (feature 001) there is **no persistence** — the only new runtime state is
an in-memory, process-scoped destination cache.

## Entities

### Aircraft (extended — fields already present, now populated)

A live aircraft over the queried area. The two destination fields existed in the schema since
feature 001 but were always `null`; this feature populates them.

| Field | Type | Nullable | Notes |
|-------|------|----------|-------|
| `destinationAirport` | string \| null | yes | Estimated destination airport ICAO code, from the flight's live route (OpenSky `estArrivalAirport`) |
| `destinationCountry` | string \| null | yes | Country of `destinationAirport`, from the bundled ICAO→country map; `null` when the airport is unknown |

- `null` means "not identified", never an error (spec FR-005).
- `destinationAirport` may be set while `destinationCountry` is `null` (airport not in the map).

### Fly-Over Result (extended — one new field)

The answer to a Location Query. A new additive field reports the state of destination enrichment.

| Field | Type | Notes |
|-------|------|-------|
| `destinationEnrichment` | enum | `'complete'` \| `'partial'` \| `'unavailable'` |

- `'complete'` — every matched aircraft received a destination lookup; destinations filled where
  identified (spec FR-001).
- `'partial'` — at least one lookup failed or was rate-limited; some destinations are `null`
  (spec FR-006).
- `'unavailable'` — no OpenSky credentials configured (anonymous tier); enrichment skipped
  (spec FR-008).

### DestinationInfo (internal — not on the wire)

The data a `FlightRouteFeed` returns for one aircraft, used to fill `Aircraft.destination*`.

| Field | Type | Notes |
|-------|------|-------|
| `icao24` | string | Matches the aircraft being enriched |
| `estDepartureAirport` | string \| null | From the chosen flight record (informational) |
| `estArrivalAirport` | string \| null | Becomes `destinationAirport` |

### Airport (internal — static lookup)

The bundled ICAO→country mapping.

| Field | Type | Notes |
|-------|------|-------|
| `icao` | string | ICAO airport code (e.g. `EDDF`) |
| `country` | string | Country name (e.g. `Germany`) |

## Relationships

```
LocationQuery ──▶ FlyOverResult (1 ── 0..* Aircraft)
Aircraft ──enriched by──▶ DestinationInfo (via FlightRouteFeed, keyed by icao24)
DestinationInfo.estArrivalAirport ──maps via──▶ Airport(icao) ──▶ destinationCountry
```

## Validation rules

- `destinationEnrichment` is one of `'complete' | 'partial' | 'unavailable'` (zod `z.enum`).
- `destinationAirport` / `destinationCountry` remain `string | null` (no schema change to
  `AircraftSchema`).

## State transitions

The request/result model is immutable per query, as in feature 001. The only stateful runtime
component is the destination cache:

| Cache entry | TTL | Purpose |
|-------------|-----|---------|
| Positive (found destination) | 10 min | Avoid repeat `/flights/*` spend on repeated queries (spec FR-003) |
| Negative (not found) | 60 s | Avoid hammering unknown aircraft (bounded spend) |

## Interface Parity

Because REST and MCP are validated and typed by the same shared schemas and served by the same
service, the extended `FlyOverResult` (with `destinationEnrichment` and populated destinations)
is identical across interfaces by construction (spec FR-004). The frontend type mirror
(`frontend/src/api/types.ts`) is updated additively so parity tests stay green. See `contracts/`.