# Bug Assessment: Destination enrichment returns no destinations for any aircraft

- **Slug**: empty-destinations
- **Created**: 2026-09-21
- **Source**: pasted text
- **Verdict**: valid
- **Severity**: high

## Report (verbatim or summarized)

> "it seems like i have no destination information in any of the planes. seems weird,
> additionally, for planes on the ground i want to have '-' displayed as the origin, as to me
> it does not make sense to have this information."

## Symptom

Every aircraft in a fly-over result shows '—' for Destination, and grounded planes still show
their registration country as Origin. Expected: live aircraft show the estimated destination
(and origin) airport/country, and grounded aircraft show no origin.

## Reproduction

1. Run the backend with OpenSky OAuth2 credentials (present in `backend/.env`) and
   `FEED=opensky`; query any populated area via `/api/fly-overs?lat=&lng=&radiusKm=`.
2. Observe `aircraft[].destinationAirport` and `destinationCountry` are `null` for every
   aircraft, so the frontend renders '—'.
   [NEEDS CLARIFICATION: verify against a live `/flights/aircraft` response during the fix;
   the docs evidence below already explains the nulls.]
3. Grounded aircraft (`onGround: true`) still display `originCountry` (registration country)
   instead of '—'.

## Suspected Code Paths

- `backend/src/feeds/flightRoutes.ts:145` — `begin = Math.max(now - windowHours*3600, startOfUtcDay(now))` clamps the lookup window to the current UTC day.
- `backend/src/feeds/flightRoutes.ts:45-79` — `mapFlightRouteResponse` returns `null` when the payload has no flight covering/following "now".
- `backend/src/services/flyOverService.ts:164-177` — a null lookup maps to `destinationAirport: null` / `destinationCountry: null`.
- `backend/src/index.ts:23-30` — `selectRouteFeed()` returns `undefined` anonymously (not the cause here; credentials are set).
- `frontend/src/components/AircraftCard.tsx:38` and `frontend/src/components/AircraftMapCard.tsx:36` — origin shown unconditionally, including for `onGround` aircraft.

## Root Cause Hypothesis

OpenSky's `GET /flights/aircraft` is a historical, night-batched endpoint: per the official
REST docs it only returns flights that "departed and arrived within [begin, end]" and only
flights "from the previous day or earlier." The service clamps `begin` to the start of the
current UTC day (to stay in the 4-credit band, spec `research.md` Decision 3), so the queried
window is today-only: today's flights aren't batched yet and yesterday's already arrived before
`begin`. Every lookup returns empty → `null` destination for every aircraft. Confidence: high —
endpoint semantics are documented and the code path is deterministic; the feature's premise
that "/flights/* returns live flight records" is incorrect for this endpoint.

## Proposed Remediation

**Preferred (per user direction — "rely on adsb for everything")**: Replace both OpenSky feeds
with adsb.lol, dropping the OpenSky OAuth2 token manager, credit budgeting, and the broken
`/flights/aircraft` source:

1. New position feed: `GET /v2/point/{lat}/{lon}/{radius}` (radius in nm, max 250 ≈ 463 km).
   Map `hex→icao24`, `flight→callsign`, `alt_baro` ft→m (string `"ground"` → `null` +
   `onGround`), `gs` kt→m/s, `baro_rate` ft/min→m/s, `track→trueTrack`; derive `onGround`
   from `alt_baro === "ground"` or near-zero `gs`; filter `~`-prefixed non-ICAO hex.
2. New route feed: batched `POST /api/0/routeset` for all matched callsigns (≤100/request) →
   one request per query; `estDepartureAirport` = first airport, `estArrivalAirport` = last
   airport in the route. Keep the `FlightRouteFeed`/`DestinationInfo` interface, the
   `destinationEnrichment` field, and the destination cache.
3. Redefine the UI "Origin" as the route's departure airport (ICAO code + country via the
   bundled `airports.ts` map / payload `countryiso2`). Add `originAirport` to the shared
   `Aircraft` schema mirroring `destinationAirport`. A grounded plane has no active route →
   origin and destination render '—', resolving the second half of the report natively.
4. Clamp the effective query radius to 463 km (250 nm) to match the `/v2/point` limit.

**Alternatives**:
- Keep OpenSky for positions, use adsb.lol (or adsbdb `/v0/callsign/…`) only for destinations.
  Less churn but keeps two dependencies and the OpenSky credit budget.
- Keep OpenSky but widen the `/flights/aircraft` window to prior days (~30 credits/lookup) →
  shows last known arrival, misleading for en-route planes; rejected in favor of adsb.

**Files likely to change**:
- `backend/src/feeds/opensky.ts` → `backend/src/feeds/adsbLol.ts` (position feed)
- `backend/src/feeds/flightRoutes.ts` → adsb routeset feed (drop `/flights/aircraft`)
- `backend/src/feeds/openskyAuth.ts` (remove); `backend/src/lib/config.ts` (drop OpenSky/credit
  settings, add adsb base URL + radius cap); `backend/src/index.ts` (feed selection)
- `backend/src/domain/schemas.ts` and `frontend/src/api/types.ts` (+`originAirport`)
- `frontend/src/components/AircraftCard.tsx`, `AircraftMapCard.tsx` (origin = route departure)
- Tests: `feeds.test.ts`, `flightRoutes.test.ts`, `flyOverService.test.ts`, `schemas.test.ts`,
  frontend card tests, contract tests

**Tests to add or update**:
- Unit: adsb point→FeedState mapping incl. unit conversions, `alt_baro:"ground"`→`onGround`,
  `~`-hex filtering; routeset→DestinationInfo mapping incl. country resolution.
- Integration: positions + destinations end-to-end; assert non-null destinations from a
  live-style routeset payload; `destinationEnrichment: 'partial'` degrades gracefully.
- Frontend: grounded aircraft renders '—' origin; origin/destination render country/airport.

## Risks & Considerations

- adsb.lol is community-fed (coverage thinner in some regions); ToS currently free with a
  possible future API key; dynamic rate limits.
- Radius cap change (500 → 463 km) is a schema/UX contract change.
- Origin redefinition (departure airport instead of registration country) changes the data
  contract and UI; parity mirrors (frontend/backend types) and tests must be updated in step.
- Removing OpenSky deletes OAuth/credit config; generic `lib/retry` remains for adsb timeouts.
- No persistence/migration impact; destination cache TTLs unchanged.

## Open Questions

- [NEEDS CLARIFICATION: confirm the app is run against live OpenSky (not `FEED=mock`) when the
  no-destination symptom is seen; mock mode shows fixture destinations.]
- [NEEDS CLARIFICATION: exact adsb.lol `onGround` heuristic (rely on `alt_baro === "ground"`
  vs. a low-ground-speed threshold) — decide during implementation with a live probe.]