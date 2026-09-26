# Feature Specification: Map View & Selection

**Feature Branch**: `feature/002-map-view-selection`

**Created**: 2026-09-21

**Status**: Draft

**Input**: User description: "i want to expand currenty functionality of our SPA to have two modes, display the flights information on list (current) or through a map. the map should also allow for selection. so now we have two ways to select location (gps coordinates and radius inputs) or map selection. Note that map should be pannable without changing selection. when one point on the map is selected the input values should change so that both input formats stay consistent."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - View fly-overs as a list or on a map (Priority: P1)

A user opens the web app and chooses how the fly-over results are displayed. The app offers two
display modes: a list of aircraft cards (the current behavior) and an interactive map showing the
same aircraft. Switching between the two modes takes a single action, does not lose the current
query or its results, and both modes always reflect the same query result.

**Why this priority**: Displaying the results on a map is the headline request of this feature and
delivers immediate value on top of the existing list; the mode switch is the smallest useful slice.

**Independent Test**: Can be fully tested by submitting a query for a location with air traffic and
switching between list and map modes, verifying both show the identical aircraft set and that
switching preserves the query and results.

**Acceptance Scenarios**:

1. **Given** the app shows a fly-over result in list mode, **When** the user switches to map mode,
   **Then** the map displays the same aircraft at their reported positions, centered on the queried
   location.
2. **Given** the app shows a fly-over result in map mode, **When** the user switches back to list
   mode, **Then** the aircraft list reappears without re-running the query.
3. **Given** the user has not yet submitted a query, **When** the user switches between modes,
   **Then** the app does not run a query and shows the appropriate empty state in each mode.
4. **Given** the map display is selected, **When** the app re-runs the query (e.g., manual refresh),
   **Then** both modes update to reflect the latest result.

---

### User Story 2 - Select a location from the map (Priority: P1)

A user chooses the query location directly on the map instead of typing coordinates. Clicking or
dragging a marker sets the center point; dragging the edge of the radius circle sets the radius.
Every change made on the map is reflected immediately in the latitude, longitude, and radius input
fields, so both ways of specifying a location always agree. Conversely, editing the input fields
moves the map marker and circle to match. Submitting the query still requires the explicit
"Find aircraft" action.

**Why this priority**: This is the second core request — making the map a full input method while
keeping the typed input consistent with it. It delivers the map-based selection capability on its
own.

**Independent Test**: Can be fully tested by selecting a center and radius on the map and verifying
the input fields update to the selected values, and by typing coordinates and a radius and
verifying the map marker and circle move to match.

**Acceptance Scenarios**:

1. **Given** a map is displayed, **When** the user clicks or drags to set a center point, **Then**
   the latitude and longitude inputs update to the selected point within 1 second.
2. **Given** a center point is selected on the map, **When** the user drags the radius circle edge,
   **Then** the radius input updates to the resulting distance within 1 second.
3. **Given** valid values typed in the inputs, **When** the user edits latitude, longitude, or
   radius, **Then** the map marker and circle reposition to match without the user touching the map.
4. **Given** a location selected on the map, **When** the user presses "Find aircraft", **Then** the
   query uses exactly the selected center and radius.
5. **Given** the same location entered via map selection and via typed input, **When** the user
   submits both, **Then** both queries return identical results.

---

### User Story 3 - Pan and zoom without changing the selection (Priority: P2)

A user freely pans and zooms the map to inspect nearby geography without disturbing the selected
location. The selected center and radius — and therefore the query inputs — stay exactly as they
were; only the visible map area changes.

**Why this priority**: Panning/zooming without side effects is a usability requirement for map
navigation, but the feature still works without it; it complements User Stories 1 and 2.

**Independent Test**: Can be fully tested by selecting a location, panning and zooming extensively,
and verifying the selected location, input values, and any displayed results remain unchanged.

**Acceptance Scenarios**:

1. **Given** a location is selected on the map, **When** the user pans the map, **Then** the
   selected center and radius do not change and the input fields are not modified.
2. **Given** a location is selected on the map, **When** the user zooms in or out, **Then** the
   selected center and radius do not change and the input fields are not modified.
3. **Given** a fly-over result is displayed, **When** the user pans or zooms, **Then** no new query
   is run as a result of the navigation.

---

### Edge Cases

- What happens if the map cannot load (network, provider outage)? → The app shows a clear message
  and remains fully usable in list mode with typed input.
- What happens if a map selection would fall outside valid coordinate or radius bounds? → The
  selection is constrained to valid ranges; invalid values are never propagated to the inputs or
  submitted.
- What happens if the user edits an input to an invalid value while a map selection exists? → The
  inputs show validation errors; the last valid selection remains the effective location until a
  valid query is submitted.
- What happens when the user switches modes while a query is loading? → The switch is permitted;
  the loading state is shown in both modes and the result appears in the current mode when ready.
- What happens on very large or very small radii relative to the current zoom? → The map display
  keeps the radius circle visible and the inputs/query reflect the exact value, independent of
  zoom.
- What happens with rapid repeated selections on the map? → Each selection updates the inputs to
  the latest value; only the last selection matters at submit time.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The web app MUST provide two display modes for fly-over results: a list and an
  interactive map, with a single-action control to switch between them.
- **FR-002**: Both display modes MUST show the same query result — the same aircraft, the same
  queried center, and the same radius.
- **FR-003**: Switching modes MUST preserve the current query and its results and MUST NOT
  re-run the query.
- **FR-004**: In map mode, the app MUST render the queried location (center and radius) and the
  aircraft positions from the current result as visual elements on the map.
- **FR-005**: The map MUST support selecting a location: the user can set the center point by
  clicking or dragging, and set the radius by adjusting the circle on the map.
- **FR-006**: When the user selects or changes a location on the map, the latitude, longitude, and
  radius input fields MUST update to match within 1 second.
- **FR-007**: When the user edits the latitude, longitude, or radius input fields, the map
  selection (marker and circle) MUST update to match.
- **FR-008**: The map MUST be pannable and zoomable without changing the selected location, the
  input values, or the displayed result.
- **FR-009**: Panning or zooming the map MUST NOT trigger a new query.
- **FR-010**: A location selected on the map MUST become the location used for a query only when
  the user submits the query with the explicit "Find aircraft" action.
- **FR-011**: The system MUST enforce the same validation bounds for map selections as for typed
  input (valid latitude, longitude, and radius range) and MUST NOT accept out-of-range selections.
- **FR-012**: The selected location MUST be a single shared value regardless of which input method
  was used last, so typed and map entries can never diverge.
- **FR-013**: If the map is unavailable, the app MUST show a clear message and remain fully usable
  in list mode with typed input.
- **FR-014**: The app MUST support the current typed coordinate and radius workflow unchanged,
  including validation and explicit submission.

### Key Entities *(include if feature involves data)*

- **Location Query**: The input to the fly-over capability — a GPS point (latitude, longitude) and
  a radius. Extended in this feature so it can be produced by either typed input or map selection,
  remaining identical either way.
- **Map Selection**: The user's chosen center and radius expressed on the map (a marker and a
  circle). It is a visual representation of the Location Query and stays synchronized with the
  input fields.
- **Fly-Over Result**: The answer to a Location Query — the queried center and radius, the as-of
  timestamp, the count of aircraft, and the list of Aircraft over the area. Displayed identically
  in both list and map modes.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A user can switch between list and map display with a single action and sees the
  same fly-over result in both, for 100% of submitted queries.
- **SC-002**: A location selected on the map appears in the latitude, longitude, and radius inputs
  within 1 second, for 100% of valid selections.
- **SC-003**: Editing the input fields repositions the map selection correctly for 100% of valid
  values.
- **SC-004**: Panning and zooming the map never changes the selected location, the input values, or
  the displayed result, across a 2-minute observation window.
- **SC-005**: Submitting the same location chosen via map selection and via typed input returns
  identical query results in all parity checks.
- **SC-006**: The web app remains fully usable via typed input when the map is unavailable.
- **SC-007**: All quality gates (lint, format, tests, typecheck, template drift check) pass before
  merge for this feature.

## Assumptions

- **Scope**: This feature is limited to the web app (frontend). No backend changes are required;
  the existing query capability is reused as-is.
- **Display mode default**: The app opens in list mode by default; the user's last chosen mode is
  not required to be remembered across reloads.
- **Bidirectional consistency**: "Both input formats stay consistent" means map selection updates
  the inputs AND input edits update the map selection; both directions are in scope.
- **Radius control**: The map allows the user to set the center point and to adjust the radius
  circle directly on the map; the inputs reflect both.
- **Query trigger**: Map selection updates the inputs only; the query runs on the explicit
  "Find aircraft" submit, matching the current behavior.
- **Map rendering**: Aircraft are rendered at their reported positions from the current result; no
  new data source is introduced by this feature.
- **"My current location"**: The geolocation-based location method is out of scope for this
  feature.
- **Existing components**: The list display and typed form are reused and extended rather than
  replaced.