# Feature Specification: Planes Over a Location

**Feature Branch**: `001-planes-over-location`

**Created**: 2026-09-20

**Status**: Draft

**Input**: User description: "Application objective: provide/answer which planes are going over a given location (GPS point & radius). Expose the information through the backend (MCP & REST) and display it in a React SPA, exposing reusable components."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Answer "What's flying over here?" (Priority: P1)

A user supplies a GPS point (latitude/longitude) and a radius. The system returns the aircraft
currently over that circular area, each with identification and flight-state details: callsign,
current position, altitude, ground speed, heading, and distance from the center of the queried
area. The result also reports when the answer was generated. The same query capability is
available through both of the module's programmatic interfaces (REST and MCP), backed by a
single shared service, so both interfaces behave identically for the same input. The data comes
from a free public feed of live aircraft positions; the answer reflects the most recent feed
snapshot (pull model).

**Why this priority**: This is the core value of the module — answering the primary question
"what is flying over X?" — and it is the foundation the SPA and the component library build on.
Without it there is no product.

**Independent Test**: Can be fully tested by sending a query (GPS point + radius) for a
location with known air traffic through either interface and verifying the returned aircraft
match the reference feed within the given radius, with all required detail fields present.

**Acceptance Scenarios**:

1. **Given** a location with active air traffic (e.g., near an airport), **When** a user queries
   it with a GPS point and radius, **Then** the system returns every aircraft currently within
   that radius, each with callsign, position, altitude, ground speed, heading, and distance from
   the center.
2. **Given** the same GPS point, radius, and feed snapshot, **When** a user queries through the
   REST interface and through the MCP interface, **Then** both return the identical aircraft set
   and details.
3. **Given** a location with no aircraft in range, **When** a user queries it, **Then** the
   system returns an empty aircraft list with an as-of timestamp — not an error.
4. **Given** an invalid GPS point or radius (out-of-range, non-numeric, radius ≤ 0 or above the
   maximum allowed), **When** a user submits the query, **Then** the system rejects it with a
   clear, actionable error message.
5. **Given** the live feed is temporarily unavailable, **When** a user queries, **Then** the
   system responds with a clear error indicating the feed is unavailable, without crashing or
   returning stale data labeled as fresh.

---

### User Story 2 - Find fly-overs from the web app (Priority: P2)

A user opens the web app, chooses a location in one of three ways — typing coordinates and a
radius, picking the center and adjusting the radius on a map, or using "my current location" —
and the app displays the aircraft currently over that area with their details. The user can
refresh the view, either manually or automatically, at a configurable cadence of roughly once or
twice per minute. If location access or map selection is unavailable, the app still works via
the typed input.

**Why this priority**: This makes the capability usable by non-technical people and is the
primary face of the module, but it depends on User Story 1.

**Independent Test**: Can be tested by opening the app, selecting a location via each of the
three input methods, and verifying the displayed aircraft match the query result for the same
location, including refresh at the configured cadence.

**Acceptance Scenarios**:

1. **Given** the app is open, **When** a user types a GPS point and radius and submits, **Then**
   the app displays the aircraft over that area with their details.
2. **Given** a map is available, **When** a user clicks a point on the map and adjusts the radius
   circle, **Then** the app queries and displays the aircraft over that area.
3. **Given** the user grants location permission, **When** the user chooses "my current
   location", **Then** the app queries the user's position and displays the aircraft over it
   with the configured radius.
4. **Given** the user denies location permission or the map fails to load, **When** the user
   attempts to use those methods, **Then** the app shows a clear fallback message and remains
   fully usable through typed input.
5. **Given** an automatic refresh cadence of one or two times per minute is configured, **When**
   the view is open, **Then** the displayed results refresh at that cadence without the user
   needing to act.

---

### User Story 3 - Reuse the fly-over experience as components (Priority: P3)

The module publishes the fly-over user interface as a set of reusable, documented components
from its frontend package, so the SPA and other consumers can assemble the fly-over experience
in their own applications. The components are demonstrated in the workbench and shipped as a
publishable library. The exact set of components and their public APIs are decided during
design and implementation; this specification documents the capability without prescribing
specific component names, props, or behaviors.

**Why this priority**: It extends the value of User Stories 1 and 2 to other consumers and is
the module's distribution story, but it is not required for the primary SPA flow.

**Independent Test**: Can be tested by verifying the published library builds successfully, the
components render correctly in the workbench against live or sample data, and a minimal external
consumer can install and render the fly-over experience.

**Acceptance Scenarios**:

1. **Given** the frontend package, **When** a build of the components library is produced, **Then**
   it succeeds and the fly-over components are included.
2. **Given** the component workbench, **When** the fly-over components are loaded with sample
   data, **Then** they render without error and display the fly-over information.
3. **Given** an external consumer application, **When** it installs the published package and
   mounts the fly-over components, **Then** they render and function against the module's query
   capability.

---

### Edge Cases

- What happens when the queried area contains no aircraft (empty result)? → Empty list with an
  as-of timestamp, not an error.
- How does the system handle an out-of-range or malformed GPS point or radius? → Rejected with a
  clear error message before any external call.
- What happens when the radius exceeds the maximum allowed? → Rejected with a message stating the
  limit.
- How does the system behave when the aircraft feed is unavailable or rate-limited? → Clear error
  indicating feed unavailability; no stale data presented as fresh.
- What happens when a queried area is larger than the feed's coverage (e.g., open ocean)? → The
  result reflects only aircraft the feed reports within the area; empty if none.
- What happens if the user denies location permission or the map cannot load? → Clear fallback
  message; typed input remains available.
- How are rapidly changing positions handled between feed snapshots? → The answer reflects the
  latest feed snapshot (pull model); out-of-scope interpolation is documented as a future
  enhancement.
- What happens with many concurrent queries? → Queries are served without one user's request
  degrading another's.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST answer, for a given GPS point and radius, which aircraft are currently
  over that circular area.
- **FR-002**: Each aircraft in a query result MUST include identification (callsign and aircraft
  identifier) and flight state (current position, altitude, ground speed, heading, and distance
  from the center of the queried area).
- **FR-003**: Query results MUST include an as-of timestamp indicating when the answer reflects
  the aircraft feed.
- **FR-004**: The same query capability MUST be available through both programmatic interfaces
  (REST and MCP), backed by a single shared service, with identical semantics for identical
  input.
- **FR-005**: The system MUST validate GPS points and radii and reject invalid input (out-of-range
  coordinates, non-numeric values, radius ≤ 0 or above the configured maximum) with a clear,
  actionable error.
- **FR-006**: A query for an area with no aircraft MUST return an empty aircraft list with an
  as-of timestamp, not an error.
- **FR-007**: The system MUST source live aircraft positions from a free public feed; feed
  registration for higher limits MUST be optional and non-blocking.
- **FR-008**: When the aircraft feed is unavailable or rate-limited, the system MUST respond with
  a clear error indicating feed unavailability and MUST NOT present stale data as fresh.
- **FR-009**: The web app MUST let a user specify a location by typed GPS point and radius.
- **FR-010**: When map selection is available, the web app MUST also let a user pick the center on
  a map and adjust the radius.
- **FR-011**: When the user grants location permission, the web app MUST support "use my current
  location" with the configured radius.
- **FR-012**: When map or location features are unavailable, the web app MUST fall back gracefully
  to typed input with a clear message.
- **FR-013**: The web app MUST refresh displayed results at a configurable cadence of
  approximately once or twice per minute, and also support manual refresh.
- **FR-014**: The frontend package MUST publish the fly-over user interface as reusable,
  documented components usable by the SPA and external consumers, in addition to the SPA itself.
- **FR-015**: The system MUST respect the aircraft feed's usage limits (pull cadence and query
  volume) and operate within them.

### Key Entities *(include if feature involves data)*

- **Location Query**: The input to the capability — a GPS point (latitude, longitude) and a
  radius (distance). Optionally carries a requested refresh cadence in the web app context.
- **Aircraft**: A live aircraft as reported by the feed — identification (callsign, aircraft
  identifier) and flight state (position, altitude, ground speed, heading). Relates to a Location
  Query via its distance from the query center.
- **Fly-Over Result**: The answer to a Location Query — the queried center and radius, the as-of
  timestamp, the count of aircraft, and the list of Aircraft over the area.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A user querying a location with active air traffic receives the complete set of
  aircraft within the radius, matching the reference feed, for 100% of verified test locations.
- **SC-002**: 95% of queries return their answer to the caller in under 2 seconds, measured from
  request to response.
- **SC-003**: The same query returns identical aircraft sets and details through both the REST
  and MCP interfaces in all parity tests.
- **SC-004**: A user who selects a location in the web app sees the aircraft over that area
  within 3 seconds of submission.
- **SC-005**: The web app honors a configured refresh cadence of once or twice per minute across
  a 10-minute observation window, with results updating at least 90% of the expected intervals.
- **SC-006**: The components library builds and publishes successfully, and every published
  fly-over component renders in the workbench and in an external consumer.
- **SC-007**: The system serves 10 concurrent queries without degradation in correctness or
  noticeable increase in response time.
- **SC-008**: All quality gates (lint, format, tests, typecheck, template drift check) pass before
  merge for this feature.

## Assumptions

- **Aircraft data source**: live positions come from a free public aviation feed; registration
  (for higher usage limits) is optional. No paid data contract is assumed.
- **Query model**: pull/snapshot — each request returns the answer based on the most recent feed
  snapshot. No push/streaming of live positions.
- **Refresh cadence**: default automatic refresh of once per minute, configurable in the range of
  roughly every 30 seconds to every 5 minutes.
- **Interpolation**: estimating aircraft positions between feed snapshots is a future enhancement
  and is OUT OF SCOPE for this feature.
- **Authentication**: consumers of the query capability and the web app are public; no user
  accounts or authentication are assumed.
- **Radius limits**: a configurable maximum radius is enforced (default 500 km), configurable to
  match feed coverage.
- **Component specifics**: the set of reusable components and their public APIs are NOT prescribed
  by this specification; they are determined during design and implementation. This document
  captures the capability and its acceptance, documentation-only.
- **Feed reliability**: occasional feed outages are expected; the system must fail gracefully
  (FR-008) rather than maintain its own cached copy of aircraft positions.
- **Single shared backend service**: the REST and MCP interfaces are both built on one shared
  service layer, per the module's package organization, so parity (FR-004) is achieved by
  construction.