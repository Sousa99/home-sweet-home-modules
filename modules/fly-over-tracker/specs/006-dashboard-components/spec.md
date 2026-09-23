# Feature Specification: Dashboard Embed Components

**Feature Branch**: `feature/006-dashboard-components`

**Created**: 2026-09-23

**Status**: Draft

**Input**: User description: "i want to focus now on the deliverable components. i want two deliverables. i want one which is a full-fledged component that shows a map and the listing of planes under it, like we have on the spa. but this component is configurable through props, like location, radius, auto-refresh. it is meant to be configured and used within a bigger scoped dashboard (homesweethome). and a second card component which simply displays the closest plan (also with the same configuration) using the list cards of the SPA. note that both components should fill the available space. the map + items should fill horizontally and then require whatever space it requires under it for the list. and the card component whatever available horizontally and then vertically also what it needs. for this second component, the closest plane (maybe there is a better endpoint to call from adsblol, evaluate it) but it should have some sort of smooth transition if the closest plane changed. ohhh and dont forget to have some sort of small feedback when updating, like top corner loading or something you know?"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Embed the map + aircraft list widget (Priority: P1)

A dashboard host (homesweethome) mounts a widget configured with a location, a
radius, and an auto-refresh cadence. The widget renders a map centered on that
location showing the radius area and every aircraft within it, with the same
list of aircraft presented beneath the map using the standard aircraft cards.
The widget fills the available width; the map expands to fill the available
vertical space, and the list below takes only the vertical space it needs,
scrolling when the list is long. The dashboard host is a non-technical
consumer — it only supplies configuration, not data.

**Why this priority**: This is the primary deliverable — a full-fledged, drop-in
version of the SPA's fly-over experience for a dashboard.

**Independent Test**: Can be fully tested by mounting the widget with a location,
radius, and auto-refresh setting in a container of arbitrary width/height and
verifying the map, its markers, and the list beneath it all render and match the
query result.

**Acceptance Scenarios**:

1. **Given** a dashboard host provides a location, radius, and auto-refresh
   setting, **When** the widget mounts, **Then** it displays a map centered on the
   location with the radius area drawn and every aircraft within it marked, and
   lists those same aircraft beneath the map using the standard aircraft cards.
2. **Given** a wide container, **When** the widget renders, **Then** it expands to
   fill the full width; the map fills the available vertical space and the list
   beneath takes only the height its content needs, scrolling when longer than
   the available space.
3. **Given** a location with no aircraft in range, **When** the widget refreshes,
   **Then** it shows a clear empty state rather than an error or stale data.
4. **Given** the data source is temporarily unavailable, **When** the widget
   refreshes, **Then** it shows a clear error state without crashing.
5. **Given** the dashboard changes the location, radius, or auto-refresh
   configuration, **When** the widget re-renders, **Then** it applies the new
   configuration and refreshes accordingly.

---

### User Story 2 - Embed the closest-plane card (Priority: P1)

A dashboard host mounts a compact card configured with the same location, radius,
and auto-refresh settings. The card displays exactly one aircraft — the closest
one to the configured location within the radius — using the standard aircraft
card presentation. The card fills the available width and only the vertical space
its content needs. When the closest aircraft changes between refreshes, the card
updates with a smooth transition rather than an abrupt swap.

**Why this priority**: This is the second deliverable — a small, glanceable widget
sharing the same configuration surface as the map widget.

**Independent Test**: Can be fully tested by mounting the card with a location,
radius, and auto-refresh setting and verifying it always shows the nearest
aircraft within the radius (checked against the query result), including when
that aircraft changes.

**Acceptance Scenarios**:

1. **Given** a location with air traffic within the radius, **When** the card
   mounts, **Then** it displays the single aircraft nearest to the location with
   its full details via the standard aircraft card.
2. **Given** a wider container, **When** the card renders, **Then** it fills the
   width and uses only the vertical space its content requires.
3. **Given** the closest aircraft changes between refreshes, **When** the card
   updates, **Then** the change is presented with a smooth visual transition,
   never an abrupt replacement.
4. **Given** the closest aircraft is always deterministically selected, **When**
   multiple aircraft are equally close, **Then** the same aircraft is chosen on
   every refresh.
5. **Given** no aircraft are within the radius, **When** the card refreshes,
   **Then** it shows a clear empty state, and resumes showing the closest plane
   once one exists.
6. **Given** the data source is unavailable, **When** the card refreshes, **Then**
   it shows a clear error state and never presents stale data as fresh.

---

### User Story 3 - Live updates with feedback (Priority: P2)

Both widgets refresh automatically at the configured cadence and also support
manual refresh. While a background update is in progress, each widget shows a
small, unobtrusive updating indicator in its top corner. The indicator appears
only during the fetch and disappears when the update completes.

**Why this priority**: Keeps the dashboard live and gives users confidence updates
are happening, but both widgets are already independently valuable without it.

**Independent Test**: Can be tested by enabling auto-refresh on either widget,
observing the top-corner indicator appear and clear around each update, and
verifying the results change at the configured cadence.

**Acceptance Scenarios**:

1. **Given** auto-refresh is enabled, **When** the configured interval elapses,
   **Then** the widget fetches fresh data and updates without any user action.
2. **Given** a background update is in progress, **When** the widget is rendering,
   **Then** a small updating indicator is visible in the top corner.
3. **Given** an update completes, **When** the indicator is observed, **Then** it
   disappears promptly and never persists after the update ends.
4. **Given** a manual refresh control, **When** the user triggers it, **Then** the
   widget refreshes immediately with the same indicator feedback.

---

### Edge Cases

- What happens when no aircraft are within the radius? → Clear empty state, not an
  error or stale data.
- What happens when the data source is unavailable or rate-limited? → Clear error
  state; never present stale data as fresh.
- What happens when the closest aircraft disappears between refreshes? → Smooth
  transition to the next closest aircraft, or to the empty state if none remains.
- What happens when the list is longer than the available space? → The list
  scrolls within the vertical space it is allotted.
- What happens when the container is very short? → The map shrinks but stays
  usable; the list scrolls.
- What happens on rapid consecutive updates? → No flicker; the indicator is shown
  only while a fetch is actively in progress.
- What happens when multiple aircraft are equally close? → A deterministic single
  selection (stable tie-break), consistent across refreshes.
- What happens when configuration props change while an update is in flight? →
  The latest configuration wins; the widgets converge to the new location/radius
  without drift.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The map + list widget MUST accept a configuration of a location (a
  GPS point), a radius, and an auto-refresh cadence through its public props.
- **FR-002**: The widget MUST render a map centered on the configured location,
  drawing the radius area and marking every aircraft within it.
- **FR-003**: The widget MUST render, beneath the map, a list of the aircraft
  within the radius, each presented using the standard aircraft card.
- **FR-004**: The widget MUST fill the available horizontal space; the map MUST
  expand to fill the available vertical space, and the list MUST occupy only the
  vertical space its content requires (scrolling when it exceeds the available
  space).
- **FR-005**: The closest-plane card MUST accept the same configuration surface
  (location, radius, auto-refresh cadence).
- **FR-006**: The closest-plane card MUST display exactly one aircraft — the one
  nearest to the configured location within the radius — using the standard
  aircraft card presentation.
- **FR-007**: The closest-plane card MUST fill the available horizontal space and
  occupy only the vertical space its content requires.
- **FR-008**: When the closest aircraft changes between refreshes, the card MUST
  update with a smooth visual transition rather than an abrupt replacement.
- **FR-009**: The closest aircraft selection MUST be deterministic — a single,
  stable selection including a defined tie-break for equal distances.
- **FR-010**: Both widgets MUST fetch fresh data for the configured location and
  radius, and MUST refresh automatically at the configured cadence; a manual
  refresh MUST also be available.
- **FR-011**: During any background or manual update, both widgets MUST display a
  small, unobtrusive updating indicator in the top corner that appears only while
  the update is in progress and disappears on completion.
- **FR-012**: When a location, radius, or auto-refresh prop changes, both widgets
  MUST apply the new configuration and refresh accordingly.
- **FR-013**: When no aircraft are within the radius, both widgets MUST show a
  clear empty state; when the data source is unavailable, they MUST show a clear
  error state — in both cases stale data MUST NOT be presented as fresh.

### Key Entities *(include if feature involves data)*

- **Widget Configuration**: The input a dashboard host supplies — a location (GPS
  point), a radius, and an auto-refresh cadence.
- **Aircraft**: A live aircraft within the radius — identification (callsign,
  identifier) and flight state (position, altitude, ground speed, heading,
  on-ground flag) plus its distance from the configured location.
- **Fly-Over Result**: The set of aircraft within the radius at a point in time,
  ordered by distance; the closest aircraft is the first item.
- **Update Feedback**: The transient indicator signaling that a refresh is in
  progress.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A dashboard host can mount both widgets with only a location,
  radius, and auto-refresh setting, and both render valid content within 3
  seconds of mount.
- **SC-002**: Over a 10-minute observation window with auto-refresh enabled, both
  widgets update at at least 90% of the expected refresh intervals.
- **SC-003**: At every refresh, the aircraft listed beneath the map match the
  aircraft marked on the map.
- **SC-004**: The closest-plane card shows the aircraft nearest to the configured
  location within the radius, verified against the query result, in 100% of
  checks.
- **SC-005**: A change in the closest aircraft is presented with a smooth
  transition (no abrupt replacement) in 100% of observed change events.
- **SC-006**: Both widgets fill the available container width and constrain their
  vertical usage as specified, in 100% of tested layout widths and heights.
- **SC-007**: An updating indicator is visible during every background refresh and
  never persists after the update completes.
- **SC-008**: Empty and error states render clearly without crashing, and stale
  data is never shown as fresh, in all tested conditions.
- **SC-009**: All quality gates (lint, format, tests, typecheck, template drift
  check) pass before merge for this feature.

## Assumptions

- **homesweethome**: It is an external consumer of the published
  `@sousa99/fly-over-tracker-components` package; integrating into it is out of
  scope for this feature. Both widgets ship in the existing frontend package
  alongside the SPA, demonstrated in the workbench (Storybook).
- **Data ownership**: Each widget is self-sufficient — it fetches and refreshes
  its own data based on the configured location, radius, and auto-refresh, rather
  than receiving data from the dashboard host.
- **Closest-aircraft query**: Reuses the existing area query (a point and radius).
  Evaluated the aircraft feed's offerings for a dedicated "nearest aircraft"
  endpoint: none exists; the area query already returns aircraft ordered by
  distance, so the closest aircraft is deterministically the first item. No new
  query endpoint is required.
- **Data source**: The widgets query the module's live-aircraft query capability
  for the configured location and radius, the same source the SPA uses. Occasional
  feed outages are expected and handled as error states (FR-013).
- **Update feedback**: Reuses the SPA's top-corner updating indicator convention —
  a small toast-style indicator that appears during background updates.
- **Transition**: A brief, subtle animation (crossfade/slide) for closest-aircraft
  changes; duration in the range of 200–300 ms.
- **Refresh cadence**: Reuses the SPA's cadence range (off, and roughly 5/10/30/60
  seconds), with automatic refresh off by default unless configured.
- **Layout**: Both widgets fill the available width; the map widget allocates the
  map the available vertical space and lets the list take its natural height
  (scrollable); the closest-plane card takes only its natural height.
- **Presentation**: Both widgets reuse the SPA's existing aircraft card
  presentations; no new visual design is introduced.