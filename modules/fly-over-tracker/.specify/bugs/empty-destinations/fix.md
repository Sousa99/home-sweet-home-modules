# Bug Fix: Destination enrichment returns no destinations for any aircraft

- **Slug**: empty-destinations
- **Fixed**: 2026-09-21
- **Assessment**: ./assessment.md
- **Status**: applied

## Summary

Replaced the OpenSky position + route feeds (which could never return live destinations —
`/flights/aircraft` is a night-batched historical endpoint) with the free, auth-free adsb.lol
API: positions via `GET /v2/point/{lat}/{lon}/{radius}` and routes via per-callsign
`GET /routes/{xx}/{callsign}.json` on `vrs-standing-data.adsb.lol`. Origin is now the route's
departure airport (new `originAirport` field), so aircraft on the ground — which have no
active route — render '—' for both Origin and Destination.

**Follow-up (UX — origin/destination labels)**: aircraft now display origin/destination as
`<city>, <country>` (e.g. "Porto, Portugal") instead of a raw ICAO code. Route data now carries
city + full airport name + ISO-2 country per route end; a bundled ISO 3166-1 alpha-2 → country
map gives every airport a country (fixing airports missing from the old ICAO map, such as
`LPPR`). The airport name is shown as a hover tooltip only.

**Follow-up (live 403)**: a live run surfaced `403 "User-Agent too generic"` — adsb.lol
rejects Node/undici's generic `node` User-Agent. Both feeds now send a descriptive
`fly-over-tracker/…` User-Agent. In the same pass, the originally-planned `POST /api/0/routeset`
endpoint turned out to be a dead stub on `api.adsb.lol` (returns `201` with an empty body even
with a valid User-Agent), so the route feed was re-pointed at the working standing-data GET
route files instead.

## Changes

| File | Change | Notes |
|------|--------|-------|
| `backend/src/feeds/adsbLol.ts` | added / modified | Position feed (`/v2/point`); unit conversions (kt→m/s, ft→m, ft/min→m/s); `alt_baro==="ground"`/low `gs` → onGround; `~`-hex filtered; **sends descriptive User-Agent** (fixes live 403) |
| `backend/src/feeds/adsbRoutes.ts` | added / modified | Route feed via per-callsign `GET /routes/{xx}/{callsign}.json` (standing-data host) with bounded concurrency; `404` → null; **User-Agent header**; **carries `RouteAirport` metadata (icao/city/name/countryIso2)**; replaces dead `POST /api/0/routeset` |
| `backend/src/feeds/opensky.ts` | removed | Superseded by adsbLol |
| `backend/src/feeds/openskyAuth.ts` | removed | OAuth2 no longer needed |
| `backend/src/feeds/flightRoutes.ts` | removed | Superseded by adsbRoutes |
| `backend/src/feeds/types.ts` | modified | `AircraftFeed.getSnapshot(lat,lng,radiusKm)`; `FlightRouteFeed.resolveRoutes(lookups)`; added `RouteLookup` + `RouteAirport`; `DestinationInfo` route ends are `RouteAirport \| null` |
| `backend/src/feeds/mock.ts` | modified | Point-radius filtering via haversine; `originCountry: null` |
| `backend/src/feeds/mockRoutes.ts` | modified | `resolveRoutes` returning a `Map`; fixtures carry city/name/countryIso2 |
| `backend/src/lib/countries.ts` | added | ISO 3166-1 alpha-2 → country-name map (249 entries) + `countryForIso2` |
| `backend/src/services/flyOverService.ts` | modified | Point query; batched route enrichment (cache → only uncached → one `resolveRoutes`); maps `originAirport/City/Name/Country` + `destinationAirport/City/Name/Country` (country via `countryForIso2` → fallback `countryForIcao`) |
| `backend/src/domain/schemas.ts` | modified | Added `originAirport` + `originCity`/`originAirportName` + `destinationCity`/`destinationAirportName` to `AircraftSchema` |
| `backend/src/lib/config.ts` | modified | `DEFAULT_MAX_RADIUS_KM=463` (adsb `/v2/point` cap); `FEED: 'adsb'\|'mock'`; `ADSB_BASE_URL`; **`ADSB_ROUTE_BASE_URL`** (standing-data host); removed `OPENSKY_*`, `DEST_WINDOW_H`, `DEST_CONCURRENCY` |
| `backend/src/index.ts` | modified | Feed selection → `AdsbLolFeed`/`AdsbRouteFeed`/mock; no credential gate |
| `backend/src/geometry.ts` | modified | Removed `BoundingBox`/`bboxFromCircle` (kept `haversineKm`) |
| `backend/src/tests/unit/feeds.test.ts` | modified | adsb position mapping/conversions/retry/error + MockFeed point tests |
| `backend/src/tests/unit/adsbRoutes.test.ts` | added / modified | standing-data GET URL + User-Agent, 404→null, malformed 200→error, 429 retry, batching |
| `backend/src/tests/unit/flyOverService.test.ts` | modified | Batched enrichment, failing `resolveRoutes`, cache-by-batch, origin/city/country assertions |
| `backend/src/tests/unit/schemas.test.ts` | modified | `originAirport` + city/name fixtures; radius boundaries 463 |
| `backend/src/tests/unit/countries.test.ts` | added | `countryForIso2` mapping + full ISO-2 coverage |
| `backend/src/tests/unit/lib.test.ts` | modified | Config defaults/overrides (adsb, routeBaseUrl) |
| `backend/src/tests/unit/geometry.test.ts` | modified | Dropped bbox tests |
| `backend/src/tests/unit/flightRoutes.test.ts` | removed | Replaced by adsbRoutes.test.ts |
| `backend/src/tests/unit/openskyAuth.test.ts` | removed | Feed removed |
| `backend/src/tests/contract/rest-fly-overs.test.ts` | modified | `resolveRoutes` stub; origin/city/country assertions |
| `frontend/src/api/types.ts` | modified | Added `originAirport` + `originCity`/`originAirportName` + `destinationCity`/`destinationAirportName` |
| `frontend/src/api/client.ts` | modified | `MAX_RADIUS_KM = 463` |
| `frontend/src/components/AircraftCard.tsx` | modified | `airportLabel()` helper (`<city>, <country>` → city/country → ICAO → '—'); airport name as `title` tooltip |
| `frontend/src/components/AircraftMapCard.tsx` | modified | Uses `airportLabel()`; airport name as `title` tooltip |
| `frontend/src/api/__tests__/client.test.ts` + card/list/map/app tests + stories | modified | New fixture fields; `<city>, <country>` + tooltip tests; grounded-'—' origin tests |
| `frontend/src/lib/__tests__/exports.test.ts`, `App.test.tsx` | modified | `MAX_RADIUS_KM` 463 |
| `docs/configuration.md`, `backend/.env.example`, `backend/.env`, `backend/http/fly-overs.http` | modified | Drop OpenSky credentials; document adsb.lol |
| `specs/003-flight-destination/{research,data-model,quickstart}.md` | modified | Decision 2/3 revision, `originAirport`/city/name fields, adsb validation steps |

## Diff Highlights

The enrichment pipeline changed from per-aircraft lookups to a single batched request:

```ts
// flyOverService.ts — only uncached aircraft are sent, in one call
const lookups: RouteLookup[] = aircraft
  .filter((aircraft) => cache.get(aircraft.icao24) === undefined)
  .map((aircraft) => ({ icao24, callsign, latitude, longitude }));
const fresh = await routeFeed.resolveRoutes(lookups); // one batched resolution for all uncached aircraft
```

Origin/destination mapping now derives both ends of the route:

```ts
const origin = info?.estDepartureAirport ?? null;
const destination = info?.estArrivalAirport ?? null;
return { ...aircraft,
  originAirport: origin?.icao ?? null, originCity: origin?.city ?? null,
  originCountry: countryForIso2(origin?.countryIso2 ?? null) ?? countryForIcao(origin?.icao ?? null),
  destinationAirport: destination?.icao ?? null, destinationCity: destination?.city ?? null,
  destinationCountry: countryForIso2(destination?.countryIso2 ?? null) ?? countryForIcao(destination?.icao ?? null) };
```

adsb position mapping (unit conversions in `adsbLol.ts`):

```ts
velocity: gs !== null ? gs * KT_TO_MS : null,      // kt → m/s
baroAltitude: altitudeMeters(altBaro),             // ft → m; "ground" → null
onGround: altBaro === 'ground' || (gs !== null && gs < GROUND_SPEED_KT),
```

## Tests Added or Updated

- `backend/src/tests/unit/feeds.test.ts::mapAdsbLolResponse` — conversions, `"ground"` alt → onGround, `~`-hex filtering, nulls, fallback time, malformed payloads; User-Agent header assertion
- `backend/src/tests/unit/feeds.test.ts::AdsbLolFeed` — `/v2/point` URL + nm radius, 429 retry, 503/502 error mapping
- `backend/src/tests/unit/adsbRoutes.test.ts::mapAdsbRouteResponse` — route→`RouteAirport` metadata (icao/city/name/countryIso2), unknown→null, malformed payloads
- `backend/src/tests/unit/adsbRoutes.test.ts::AdsbRouteFeed` — standing-data GET URL, User-Agent, 404→null, empty batch (no request), 429 retry, error mapping
- `backend/src/tests/unit/countries.test.ts` — `countryForIso2` mapping and full ISO-2 coverage (249)
- `backend/src/tests/unit/flyOverService.test.ts` — complete/partial/unavailable enrichment, cache reuse across queries (single batch), origin/destination city + country filled
- `frontend .../AircraftCard.test.tsx` / `AircraftMapCard.test.tsx` — `<city>, <country>` labels, airport-name tooltip, grounded aircraft shows '—' origin
- `backend/src/tests/contract/rest-fly-overs.test.ts` — `originCity`/`destinationCity` populated; `resolveRoutes` failure → partial

## Local Verification

- `pnpm test` (root) → backend 12 files / 101 tests passed; frontend 12 files / 81 tests passed
- `pnpm -r typecheck` → clean (backend + frontend)
- `pnpm lint` → clean
- `pnpm format` → clean
- `node scripts/scaffold.mjs --check` → no drift
- Live smoke test (via the service, real network, over Porto): `TAP36RC: Lisbon, Portugal → Porto, Portugal [Francisco de Sá Carneiro Airport]` — positions, routes, `<city>, <country>` labels, and airport names all resolve (no 403)

## Deviations from Assessment

- The assessment proposed deriving route countries from the payload's `countryiso2` or the
  bundled `airports.ts` map; the fix uses a bundled ISO 3166-1 alpha-2 → country map
  (`lib/countries.ts`, 249 entries) primary, falling back to `airports.ts` for the ICAO code —
  so every airport gets a country, including ones absent from the small ICAO map (e.g. `LPPR`).
- The assessment specified adsb.lol's `POST /api/0/routeset` as the route source; a live probe
  proved that endpoint is a dead stub on `api.adsb.lol` (always `201` + empty body), so the
  route feed uses the working per-callsign standing-data GET route files instead. Same payload
  schema, same `resolveRoutes` interface.
- The assessment listed `backend/src/lib/retry.ts` as unchanged; it is — but its JSDoc still
  mentions OpenSky. Left as-is (code untouched); flagged as a follow-up.
- Scope expansion (logged per guardrails): env/docs/config files (`backend/.env`,
  `.env.example`, `docs/configuration.md`, `backend/http/fly-overs.http`) and the feature-003
  spec decision records were updated to remove OpenSky credential instructions, since leaving
  them would instruct users to configure a now-unused credential flow.

## Follow-ups

- Live smoke test against `https://api.adsb.lol` and the standing-data route files is done
  (see Local Verification); re-run after any region/network change and tune the `onGround`
  heuristic if needed.
- Consider surfacing `destinationEnrichment` in the SPA so silent '—' is distinguishable from a
  failed lookup.
- Refresh `backend/src/lib/retry.ts` JSDoc, which still references "the OpenSky feeds".
- Historical planning docs (`specs/003-flight-destination/plan.md`, `tasks.md`) still describe
  the OpenSky implementation; leave as phase records or refresh in a later doc pass.