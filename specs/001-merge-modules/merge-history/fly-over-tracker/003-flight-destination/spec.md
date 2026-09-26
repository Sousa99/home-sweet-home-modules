# Feature Specification: Flight Destination Enrichment

**Feature Branch**: `feature/003-flight-destination`

**Created**: 2026-09-21

**Status**: Draft

**Input**: User description: "i want to expand current tool functionalities for the backend now to send (and retrieve from the appropriate data source) the destination of the flight, i belive this will require me to register to OpenSky which is fine, it should also improve rate limiter for current functionality. i want also to evaluate the feasability of showing a path line for the flights that match the filter of the request."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - See the destination of every matching flight (Priority: P1)

A user queries a location through either programmatic interface (REST or MCP) and each returned
aircraft now includes the flight's estimated destination: the destination airport (ICAO code) and
the country that airport is in, resolved live from the registered OpenSky account. The
destination is resolved for every aircraft that matches the query filter, in addition to the
existing identification and flight-state fields. Where the data source cannot identify a
destination, the fields are left empty rather than failing the query.

**Why this priority**: Destination is the headline request of this feature and adds immediate
value on top of the existing aircraft details; it is the smallest useful slice.

**Independent Test**: Can be fully tested by querying a location with known air traffic and
verifying each returned aircraft carries a destination airport and country where the source
identifies one, through both REST and MCP.

**Acceptance Scenarios**:

1. **Given** a registered OpenSky account with valid credentials, **When** a user queries a
   location with active air traffic, **Then** every aircraft in the result carries an estimated
   destination airport (ICAO code) and its country where the data source identifies them.
2. **Given** the same location, **When** a user queries through the REST interface and through the
   MCP interface, **Then** both return identical destination values for every aircraft.
3. **Given** an aircraft whose destination cannot be identified by the data source, **When** the
   result is returned, **Then** its destination airport and country are empty — not an error.
4. **Given** a repeated query for the same flights within a short window, **When** the user
   queries again, **Then** destination lookups are not repeated against the data source (served
   from cache) and the returned values match the first query.

---

### User Story 2 - Queries recover when the data source is rate-limited (Priority: P2)

When OpenSky responds with HTTP 429 (credits exhausted), the backend honors the indicated
retry-after period, waits, and retries the request a bounded number of times before giving up. On
a successful retry the query returns normally. If the data source stays rate-limited for the whole
attempt budget, the user receives a clear, actionable rate-limited error. A query whose aircraft
positions succeed but whose destination lookups are rate-limited still returns the aircraft set,
with empty destinations and a clear note that enrichment was partial.

**Why this priority**: Without recovery, a single 429 aborts an otherwise-fine query; recovery
protects the core fly-over capability, but the feature still functions without the retry polish.

**Independent Test**: Can be fully tested by simulating a feed that returns 429 with a retry-after
header and verifying the backend waits, retries, and returns data on a later success — and that a
persistently rate-limited feed yields the documented error.

**Acceptance Scenarios**:

1. **Given** the data source returns 429 with a retry-after period, **When** the backend performs
   the affected request, **Then** it waits the indicated period, retries, and returns the result
   on a later success.
2. **Given** the data source returns 429 without a retry-after header, **When** the backend
   retries, **Then** it uses a configured default backoff rather than failing immediately.
3. **Given** the data source returns 429 for every attempt, **When** the request is made, **Then**
   the backend stops after a bounded number of attempts and returns a clear rate-limited error
   indicating when to retry.
4. **Given** a query whose aircraft positions succeed but whose destination enrichment is
   rate-limited, **When** the result is returned, **Then** the aircraft set is returned with empty
   destinations and a clear indicator that enrichment was partial.

---

### User Story 3 - A feasibility evaluation for flight path lines (Priority: P3)

The feature delivers a written evaluation of whether and how the backend could show the flight
path line for the aircraft that match a query's filter. The evaluation covers the available data
source for flight paths, the credit cost per query for a typical matched set, expected latency,
and how the paths would fit the existing map display. It ends with an explicit go/no-go
recommendation and the conditions under which the recommendation holds.

**Delivered in**: `research.md` Decision 8 — **GO** for an on-demand, per-selected-aircraft track
feature (backend `/tracks` capability + map polyline), **not** for all-flights-on-every-refresh;
requires caching and a per-query cap. This is the decision record to reference when scoping a
follow-up feature (acceptance scenario 3).

**Why this priority**: The user asked for an evaluation, not an implementation; the document
informs a future feature decision without committing to it.

**Independent Test**: Can be fully tested by reviewing the delivered evaluation and verifying it
contains the required sections and a clear recommendation.

**Acceptance Scenarios**:

1. **Given** the feature is complete, **When** a reviewer reads the evaluation, **Then** it states
   the data source for flight paths, the per-query credit cost for the matched set, the expected
   latency, and the fit with the existing map display.
2. **Given** the evaluation is delivered, **When** a decision is recorded, **Then** it explicitly
   recommends go or no-go, with justification and any necessary constraints (e.g., caching,
   on-demand fetch, caps).
3. **Given** the evaluation recommends implementation, **When** a follow-up feature is scoped,
   **Then** the evaluation is referenced as the basis for that feature's requirements.

---

### Edge Cases

- What happens when the data source cannot identify a flight's destination? → Empty destination
  fields on that aircraft; the query still succeeds.
- What happens when the destination airport is known but its country is not in the lookup table? →
  Destination airport is shown; destination country is empty.
- What happens when the destination lookup source is rate-limited or unavailable mid-query? → The
  aircraft set is still returned with empty destinations and a clear partial-enrichment indicator.
- What happens when an authentication token expires mid-flight (401)? → The backend refreshes the
  token once and retries the request.
- What happens when credentials are missing or invalid? → Per configuration the backend either
  falls back to anonymous access or reports a clear configuration error; it never serves incorrect
  destination data.
- What happens when the retry-after header is absent on a 429? → A configured default backoff is
  used.
- What happens when the aircraft-positions bucket and the destination bucket have independent
  credit limits? → Each is handled separately; exhaustion of one does not fail the other.
- What happens on repeated queries within the cache window? → Cached destination results are
  reused; no extra data-source calls.
- What happens for an aircraft with no current flight or an unresolved route? → Destination fields
  are empty.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The backend MUST enrich every aircraft returned by a fly-over query with the flight's
  estimated destination airport (ICAO code) when the data source identifies it.
- **FR-002**: The backend MUST also provide the country of the destination airport, derived from a
  maintained airport-code-to-country mapping, when the airport is known.
- **FR-003**: The destination MUST be resolved for all aircraft matching the query filter (the
  returned set), with lookups performed with bounded concurrency and cached so repeat queries
  within a short window do not re-call the data source.
- **FR-004**: The REST and MCP interfaces MUST return identical destination values for identical
  input, backed by the shared service and schema.
- **FR-005**: When a destination cannot be identified, the destination airport and country MUST be
  empty and MUST NOT fail the query.
- **FR-006**: When destination enrichment is rate-limited or unavailable, the query MUST still
  return the aircraft set with empty destinations and MUST clearly indicate that enrichment was
  partial.
- **FR-007**: The backend MUST authenticate with the registered OpenSky account using the supported
  OAuth2 client-credentials flow, obtaining and refreshing the token before expiry and on an
  authentication failure.
- **FR-008**: The backend MUST support running without credentials (anonymous access) when
  configured, falling back per configuration rather than failing hard, subject to the lower
  anonymous limits.
- **FR-009**: On HTTP 429 from the data source, the backend MUST honor the retry-after indication
  (or a configured default when absent) and retry the request a bounded number of times before
  returning a clear rate-limited error.
- **FR-010**: The backend MUST treat the credit limits of the aircraft-positions source and the
  destination source independently and MUST NOT fail one due to exhaustion of the other.
- **FR-011**: A feasibility evaluation of showing flight path lines for the aircraft matching a
  query MUST be delivered, covering the data source, per-query credit cost, expected latency,
  frontend fit, and a go/no-go recommendation.

### Key Entities *(include if feature involves data)*

- **Aircraft**: A live aircraft as reported by the feed — identification and flight state. Extended
  by this feature so each aircraft also carries its estimated destination airport and the
  destination country.
- **Flight Route**: The departure/arrival information identified for a flight by the data source,
  keyed by aircraft identity. Provides the estimated destination airport for an Aircraft.
- **Airport**: A destination airport identified by its ICAO code, mapped to its country by a
  maintained lookup table. Related to an Aircraft via its destination airport.
- **Fly-Over Result**: The answer to a location query — the queried center and radius, the as-of
  timestamp, the count, and the list of Aircraft (now including destination details).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: For a location with active air traffic, at least 90% of returned aircraft carry a
  destination airport on a first query, and repeated queries within the cache window make no
  additional destination lookups.
- **SC-002**: REST and MCP return identical destination values for identical input in all parity
  tests.
- **SC-003**: A query whose destination enrichment is rate-limited still returns the full aircraft
  set within 3 seconds, with a clear partial-enrichment indicator.
- **SC-004**: When the data source returns 429 with a retry-after indication, the backend recovers
  automatically in 100% of bounded test cases and returns the result; persistent 429 yields a clear
  rate-limited error after the bounded attempts.
- **SC-005**: No credentials appear in logs or responses, and requests authenticated with valid
  credentials succeed against the data source.
- **SC-006**: The feasibility evaluation is delivered and contains all required sections with a
  clear go/no-go recommendation.
- **SC-007**: All quality gates (lint, format, tests, typecheck, template drift check) pass before
  merge for this feature.

## Assumptions

- **Registration**: The user has or will create a free OpenSky account and API client
  (OAuth2 client credentials); the credentials are supplied through environment or configuration,
  never hard-coded.
- **Optional credentials**: When no credentials are configured, the system runs on the anonymous
  tier; destination enrichment availability and volume are then subject to the lower anonymous
  limits.
- **Destination is an estimate**: The destination comes from live flight data and is an estimate
  derived from the aircraft's flight, not an airline schedule; it can change or be missing.
- **Airport-to-country mapping**: The country is derived from a bundled, static dataset of ICAO
  airport codes to countries, maintained in the repository.
- **Caching**: Destination lookups are cached in memory for a short time window; there is no
  persistence.
- **Best-effort enrichment**: Destination enrichment never blocks or fails the core fly-over
  answer; it degrades to empty destinations with a partial indicator (FR-006).
- **Rate-limiter scope**: Improvement means honoring 429 retry-after with bounded retries and
  independent handling of credit buckets; proactive client-side throttling is out of scope for
  this feature.
- **Path lines**: This feature delivers only a feasibility evaluation for flight path lines; no
  path-line tooling or rendering is implemented (per user decision).
- **Scope**: Backend only. The frontend already declares the destination fields and will consume
  them once the backend populates them.
- **Dependency**: Requires access to the OpenSky authenticated flight endpoints using a registered
  account; requires the existing shared service and schema to be extended, which automatically
  covers both REST and MCP.