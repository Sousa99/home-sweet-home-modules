# Research: Flight Destination Enrichment

Phase 0 output for `specs/003-flight-destination`. Every decision is recorded with its rationale
and alternatives considered. Spec `NEEDS CLARIFICATION` items were resolved during planning
(user decisions: destination for **all** matched flights; **simpler 429 backoff**; path lines =
**feasibility evaluation only**; destination lookup window **24h clamped to the current UTC day**).

---

## Decision 1: OpenSky authentication — OAuth2 client credentials

- **Decision**: Authenticate to OpenSky with the **OAuth2 client-credentials flow**, mandatory
  since 2026-03-18 (basic auth removed). Credentials (`client_id`, `client_secret`) come from the
  OpenSky Account page → "API client" card and are supplied via environment
  (`OPENSKY_CLIENT_ID` / `OPENSKY_CLIENT_SECRET`). Exchange them for a Bearer token at
  `https://auth.opensky-network.org/auth/realms/opensky-network/protocol/openid-connect/token`
  (`grant_type=client_credentials`), send it as `Authorization: Bearer <token>` on every request.
- **Rationale**: The only supported auth; registered users get the 4,000-credit/day tier vs 400
  anonymous. Tokens expire after 30 minutes; a `401` means "token expired — request a new one".
- **Alternatives considered**: Basic auth (removed 2026-03-18); anonymous-only (kept as the
  fallback when credentials are absent — spec FR-008).
- **Implementation**: a small `OAuth2TokenManager` using plain `fetch` — obtains the token on
  first use, caches it with an expiry margin (refresh ~5 min before the 30-min expiry), and
  refreshes on `401`. No new dependency.

## Decision 2: Destination source — `GET /flights/aircraft`

- **Decision**: For each matched aircraft, query
  `GET /api/flights/aircraft?icao24=<hex>&begin=<t0>&end=<now>` and read
  `estArrivalAirport` (+ `estDepartureAirport`) from the returned flight records. The chosen
  flight is the one whose `[firstSeen, lastSeen]` interval covers `now`; fall back to the most
  recent record. The airport code is looked up in the bundled ICAO→country map to derive
  `destinationCountry`.
- **Rationale**: `/flights/*` returns live flight records with estimated arrival airports, the
  natural source for "destination of the flight". One request per aircraft; cost 4 credits each in
  the independent `/flights/*` bucket.
- **Alternatives considered**:
  - Legacy `GET /api/routes?callsign=` → `{ route: [...] }` — a single request per callsign, but
    no longer in the current official docs and observed to be unreliable; rejected.
  - `GET /flights/all?begin&end` — network-wide, not bbox-filterable; unusable for per-query
    enrichment; rejected.
  - Bundled static route data — stale by definition; rejected.

## Decision 3: Destination lookup window — 24h, clamped to the current UTC day

- **Decision**: `DEST_WINDOW_H = 24`; `begin = max(now − 24h, 00:00 UTC today)`, `end = now`.
- **Rationale**: OpenSky costs `/flights/*` by the **UTC calendar-day partitions crossed**, not
  by window length: within a single day / <24h = **4 credits**, crossing a midnight = **2
  partitions = 30 credits**. A naive rolling `[now−24h, now]` crosses midnight most of the day and
  silently jumps to 30 credits. Clamping to the current UTC day keeps every lookup in the 4-credit
  band while providing up to 24h of lookback.
- **Edge (documented)**: in the first hours of the UTC day, a flight airborne since "yesterday"
  may be outside the window → destination `null` (graceful, spec FR-005). This mirrors the MVP's
  documented antimeridian clamp limitation in `geometry.ts`.

## Decision 4: Airport → country mapping — bundled static data

- **Decision**: Bundle a static ICAO→country map in the backend
  (`backend/src/lib/airports.ts`), generated from a public-domain dataset, loaded once at startup.
- **Rationale**: OpenSky's `FlightData` carries only the airport ICAO code, not the country. The
  lookup is small, offline, deterministic, and testable.
- **Alternatives considered**: A remote airport API per lookup (latency + a second external
  dependency); deriving country from `originCountry` (wrong semantics). Both rejected.
- **Maintenance**: the map lives in-repo and is updated deliberately (spec assumption).

## Decision 5: Credit model & graceful degradation

- **Decision**: Credits are **independent buckets** per endpoint family (`/states/*`, `/flights/*`,
  `/tracks/*`). Standard tier = 4,000/day each; anonymous = 400/day each. Enrichment consumes
  `/flights/*` credits only; exhaustion of one bucket never fails the other (spec FR-010).
- **Degradation** (spec FR-005/FR-006): if a destination lookup fails, times out, or is
  rate-limited, that aircraft's destination stays `null`, the query still succeeds, and the result
  carries `destinationEnrichment`:
  - `complete` — every matched aircraft had a lookup; destinations filled where identified.
  - `partial` — at least one lookup failed / was rate-limited.
  - `unavailable` — no credentials configured (anonymous, or enrichment disabled).
- **Caching**: an in-memory TTL cache (positive results TTL 10 min; negative results TTL 60 s)
  bounds `/flights/*` spend on repeated queries (spec FR-003, SC-001). Bounded concurrency
  (default 8) caps parallel lookups.

## Decision 6: Rate limiter — bounded 429 backoff (user choice)

- **Decision**: On HTTP 429, honor `X-Rate-Limit-Retry-After-Seconds` (or a configured default
  when absent), wait, and retry up to a bounded number of attempts (default 3). If still
  rate-limited, throw the existing `FeedUnavailableError({ retryable: true })` → `503
  rate_limited`. On `401`, refresh the token once and retry once. States and flights buckets use
  independent retry budgets.
- **Rationale**: The user explicitly chose the **simpler backoff** over proactive client-side
  throttling. This preserves the existing error contract (`opensky.ts` today maps 429 → 503
  immediately) while adding automatic recovery.
- **Alternatives considered**: credit-aware proactive throttling/queueing (deferred; not in scope
  per user decision).
- **Implementation**: a `fetchWithRetry` helper in `backend/src/lib/retry.ts` wrapping plain
  `fetch`, applied to both the states feed and the flights feed.

## Decision 7: Mock route feed & fixtures

- **Decision**: Introduce a `FlightRouteFeed` abstraction (`feeds/types.ts`). The OpenSky
  implementation lives in `feeds/flightRoutes.ts`; a deterministic `MockRouteFeed`
  (`feeds/mockRoutes.ts`) returns fixture destinations for the five existing mock fixtures and is
  selected whenever `FEED=mock`. `MockFeed` gains destination fields on its states so the mocked
  end-to-end flow shows destinations.
- **Rationale**: Tests and offline development never hit the live feed (credit budget preserved,
  per `specs/001-planes-over-location/research.md` Decision 7); the two feeds are independently
  mockable and independently rate-limited, mirroring the real credit-bucket separation.

## Decision 8: Path-line feasibility (spec FR-011 / Story 3)

- **Decision**: **Feasibility evaluation only** — no path-line tooling in this feature (user
  decision). Findings below are the deliverable.
- **Data source**: OpenSky `GET /tracks?icao24=<hex>&time=0` returns the live trajectory as
  waypoints `[time, lat, lng, baroAltitude, trueTrack, onGround]` for a specific aircraft. The
  endpoint is documented as **experimental** ("can be out of order at any time") and limited to
  30 days of history. Alternatively, `/flights/aircraft` `firstSeen`/`lastSeen` time bounds can
  anchor a track fetch.
- **Cost**: 4 credits per live track from the independent `/tracks/*` bucket → **4N credits per
  query** for N matched flights. Standard tier (4,000/day) ≈ 100 full-map queries of 10 flights;
  anonymous (400/day) ≈ 10. Cost is the binding constraint.
- **Latency**: one request per aircraft; sequential fetches at ~100–300 ms each would add seconds.
  Bounded concurrency (5–8) keeps a typical result sub-second. Fetching every matched flight on
  every refresh is heavy; fetching on demand for a single selected aircraft is cheap.
- **Frontend fit**: the existing Leaflet/react-leaflet map (feature `002-map-view-selection`)
  already renders aircraft markers; a `Polyline` per selected aircraft is standard and low-risk.
  Track payloads are small (tens to low-hundreds of waypoints).
- **Recommendation**: **GO** for an **on-demand, per-selected-aircraft** track feature — a backend
  track tool/endpoint (`GET /tracks` capability) plus a map polyline for the selected flight —
  **not** for all-flights-on-every-refresh. Must be gated on caching and a per-query cap (e.g., a
  maximum of paths rendered at once). Any follow-up feature should reference this evaluation.