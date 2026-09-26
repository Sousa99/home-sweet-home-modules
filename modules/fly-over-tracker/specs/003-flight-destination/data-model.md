# Data Model: Flight Destination Enrichment

Phase 1 output for `specs/003-flight-destination`. Backend change to the shared domain model
(`backend/src/domain/schemas.ts`); the SPA renders the enriched fields. As with the MVP
(feature 001) there is **no persistence** — the only new runtime state is an in-memory,
process-scoped destination cache.

> **Update (bug fix `empty-destinations`)** — the route source moved from OpenSky
> `/flights/aircraft` (historical, night-batched) to the adsb.lol `/api/0/routeset` endpoint,
> which resolves the current route per callsign. `Aircraft` gained an `originAirport` field
> and origin/country are now derived from the route's departure airport. See
> `research.md` Decision 2/3.

## Entities

### Aircraft (extended)

A live aircraft over the queried area. Origin and destination fields are populated by route
enrichment; they are `null` when the aircraft has no resolvable route (e.g. on the ground or
general aviation).

| Field | Type | Nullable | Notes |
|-------|------|----------|-------|
| `originAirport` | string \| null | yes | Estimated origin airport ICAO code, from the route's departure airport |
| `originCity` | string \| null | yes | City of the origin airport (adsb `location`) |
| `originAirportName` | string \| null | yes | Full origin airport name (adsb `name`) |
| `originCountry` | string \| null | yes | Country of `originAirport`, from the ISO-2→country map |
| `destinationAirport` | string \| null | yes | Estimated destination airport ICAO code, from the route's arrival airport |
| `destinationCity` | string \| null | yes | City of the destination airport (adsb `location`) |
| `destinationAirportName` | string \| null | yes | Full destination airport name (adsb `name`) |
| `destinationCountry` | string \| null | yes | Country of `destinationAirport`, from the ISO-2→country map |

- `null` means "not identified", never an error (spec FR-005).
- An airport may be set while its country is `null` (airport not in the map).

### Fly-Over Result (extended — one new field)

The answer to a Location Query. A new additive field reports the state of destination enrichment.

| Field | Type | Notes |
|-------|------|-------|
| `destinationEnrichment` | enum | `'complete'` \| `'partial'` \| `'unavailable'` |

- `'complete'` — every matched aircraft received a route lookup; origins/destinations filled
  where identified (spec FR-001).
- `'partial'` — the route lookup failed or was rate-limited; routes are `null` (spec FR-006).
- `'unavailable'` — no route feed provided; enrichment skipped (spec FR-008).

### DestinationInfo (internal — not on the wire)

The data a `FlightRouteFeed` returns for one aircraft, used to fill `Aircraft.origin*` and
`Aircraft.destination*`. Each route end is a `RouteAirport { icao, city, name, countryIso2 }`.

| Field | Type | Notes |
|-------|------|-------|
| `icao24` | string | Matches the aircraft being enriched |
| `estDepartureAirport` | `RouteAirport \| null` | Becomes `originAirport` / `originCity` / `originAirportName` / `originCountry` |
| `estArrivalAirport` | `RouteAirport \| null` | Becomes `destinationAirport` / `destinationCity` / `destinationAirportName` / `destinationCountry` |

### Airport (internal — route metadata)

Airport metadata carried by the route feed per route end (adsb.lol standing-data
`_airports[]`), plus the two static lookup maps.

| Field | Type | Notes |
|-------|------|-------|
| `icao` | string | ICAO airport code (e.g. `LPPR`) |
| `city` | string \| null | City the airport serves (e.g. `Porto`) |
| `name` | string \| null | Full airport name (e.g. `Francisco de Sá Carneiro Airport`) |
| `countryIso2` | string \| null | ISO 3166-1 alpha-2 code (e.g. `PT`) → `countryForIso2` in `lib/countries.ts` |

## Relationships

```
LocationQuery ──▶ FlyOverResult (1 ── 0..* Aircraft)
Aircraft ──enriched by──▶ DestinationInfo (via FlightRouteFeed.resolveRoutes, keyed by icao24)
DestinationInfo.estArrivalAirport ──maps via──▶ countryForIso2(countryIso2) ──▶ destinationCountry
DestinationInfo.estDepartureAirport ──maps via──▶ countryForIso2(countryIso2) ──▶ originCountry
```

## Validation rules

- `destinationEnrichment` is one of `'complete' | 'partial' | 'unavailable'` (zod `z.enum`).
- `originAirport` / `originCountry` / `destinationAirport` / `destinationCountry` are
  `string | null`.

## State transitions

The request/result model is immutable per query, as in feature 001. The only stateful runtime
component is the destination cache:

| Cache entry | TTL | Purpose |
|-------------|-----|---------|
| Positive (found route) | 10 min | Avoid repeat routeset calls on repeated queries (spec FR-003) |
| Negative (not found) | 60 s | Avoid hammering unknown aircraft (bounded spend) |

## Interface Parity

Because REST and MCP are validated and typed by the same shared schemas and served by the same
service, the extended `FlyOverResult` (with `destinationEnrichment` and populated
origins/destinations) is identical across interfaces by construction (spec FR-004). The
frontend type mirror (`frontend/src/api/types.ts`) is updated additively so parity tests stay
green. See `contracts/`.