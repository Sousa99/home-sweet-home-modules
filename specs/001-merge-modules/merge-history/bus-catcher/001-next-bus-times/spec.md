# Feature Specification: Next Bus Times (Basic Module Setup)

**Feature Branch**: `feature/001-next-bus-times`

**Created**: 2026-09-23

**Status**: Draft

**Input**: User description: "this will be the first 'feature' of the module. its the basic setup. I want a functioning backend rest/mcp and frontend spa. I want a way to define a set of 'lines' and 'stops'. In this case, bus stops. I need to connect to some sort of API for bus times/schedules in Lisbon. Look into Carris or google, because google also shows them. I want to be informed of next buses passing through the respective stations defined. Tell me its scheduled passing time. For now we configure these values on the SPA, on a panel and then it shows a list of times. Makes sense?"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Configure bus stops and lines (Priority: P1)

As a user, I open the configuration panel in the SPA, search for bus stops by name,
pick the stops I care about, and optionally restrict each stop to specific bus
lines. I save my selection and it is remembered for future visits.

**Why this priority**: Without configuration there is nothing to display. This
story establishes the "define a set of lines and stops" requirement and is the
foundation for every other story.

**Independent Test**: Can be fully tested by adding stops through the panel,
reloading the page, and confirming the selected stops and line filters are
still present.

**Acceptance Scenarios**:

1. **Given** an empty configuration, **When** I search for a bus stop by name,
   **Then** matching stops from the Lisbon (Carris) network are shown with
   enough detail to identify them.
2. **Given** a stop is selected, **When** I choose optional line filters,
   **Then** only the selected lines are associated with that stop.
3. **Given** a saved configuration, **When** I reload the application,
   **Then** my configured stops and line filters are restored.

---

### User Story 2 - See next scheduled passing times (Priority: P1)

As a user, I open the dashboard and see, for each configured stop, the next
scheduled buses with their line, destination, scheduled passing time, and how
long until they pass.

**Why this priority**: This is the core value of the module — informing me of
the next buses passing through the stops I defined. It depends on User Story 1
but delivers the "aiding bus catching at home" objective on its own.

**Independent Test**: Can be fully tested by configuring one stop, opening the
dashboard, and confirming the listed buses and times match the official Carris
schedule for today.

**Acceptance Scenarios**:

1. **Given** at least one configured stop, **When** I open the dashboard,
   **Then** I see the next scheduled buses for that stop with line,
   destination, scheduled passing time, and a "in X min" countdown.
2. **Given** a stop filtered to specific lines, **When** I view its times,
   **Then** only the selected lines appear.
3. **Given** the schedule data has a known age, **When** the dashboard renders,
   **Then** it shows when the schedule data was last refreshed.

---

### User Story 3 - Manage configured stops (Priority: P2)

As a user, I can edit or remove stops in my configuration, change line filters,
and reorder how stops appear on the dashboard.

**Why this priority**: Configuration is expected to change rarely but must be
maintainable. This story is independent of the dashboard display.

**Independent Test**: Can be fully tested by editing and removing a configured
stop and confirming the dashboard reflects the change on next load.

**Acceptance Scenarios**:

1. **Given** a configured stop, **When** I remove it, **Then** it no longer
   appears on the dashboard.
2. **Given** a configured stop with line filters, **When** I change the
   filters, **Then** the dashboard shows the updated lines only.

---

### User Story 4 - Refresh schedule data (Priority: P3)

As a user (or operator), I can refresh the underlying stop and schedule data so
the module reflects the latest official timetable.

**Why this priority**: Schedules change over time; this story guarantees a
process exists to keep data current. It is the least frequently used flow.

**Independent Test**: Can be fully tested by triggering a refresh and
confirming a newer schedule is used for upcoming times.

**Acceptance Scenarios**:

1. **Given** schedule data has been refreshed, **When** I query next passing
   times, **Then** the results reflect the newest available schedule.
2. **Given** a refresh is in progress, **When** I query next passing times,
   **Then** I am informed that data may be outdated during the refresh.

---

### Edge Cases

- No stops are configured yet: dashboard shows an empty state inviting the
  user to configure stops.
- A stop has no service today: the dashboard shows "no service" for that stop
  rather than an error.
- End of service: a stop with no more buses today shows that no further buses
  are scheduled today.
- A configured stop or line no longer exists in the refreshed schedule:
  the dashboard flags it as no longer found and suggests removing it.
- Search returns many or zero results: results are limited and scannable, and
  an empty result is explained.
- Countdowns and passing times respect the local timezone (Europe/Lisbon)
  including daylight-saving transitions, and correctly handle service that
  crosses midnight.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST provide access to the scheduled stop, line, and
  passing-time data of the Lisbon (Carris) bus network.
- **FR-002**: System MUST allow users to search bus stops by name.
- **FR-003**: System MUST list the lines that serve a given stop.
- **FR-004**: System MUST return the next N scheduled passing times for a stop
  on the current service day, optionally filtered to specific lines.
- **FR-005**: Users MUST be able to save a set of stops, each with optional
  line filters, from the SPA panel.
- **FR-006**: Saved stop configuration MUST persist across sessions and be
  retrievable by the dashboard.
- **FR-007**: Users MUST be able to edit and remove configured stops and their
  line filters.
- **FR-008**: Dashboard MUST display, for each configured stop, the next
  scheduled buses with line, destination, scheduled passing time, and countdown.
- **FR-009**: Dashboard MUST display the freshness of the schedule data (when
  it was last refreshed).
- **FR-010**: System MUST expose bus information through a single consistent
  interface regardless of the underlying data provider, so a future provider
  (e.g., realtime ETA) can be added without changing the application contract.
- **FR-011**: System MUST provide a process to refresh the underlying schedule
  data and reflect the refresh outcome.
- **FR-012**: System MUST present times in the user's local timezone
  (Europe/Lisbon) with daylight-saving transitions handled, using a canonical
  internal representation.

### Key Entities *(include if feature involves data)*

- **Line**: A Carris bus route (e.g., "736"). Key attributes: short name, long
  name, mode (bus), agency.
- **Stop**: A bus stop in the Lisbon network. Key attributes: identifier, name,
  coordinates.
- **Scheduled Passing Time**: An instance of a line serving a stop on a given
  service day. Key attributes: line, trip, stop, scheduled arrival/departure,
  destination (headsign), service day.
- **Configured Stop**: A user-selected stop with an optional line filter.
  Key attributes: stop, optional line list, display order, enabled state.
  Relates to Stop and Line; represents the user's dashboard configuration.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A user can go from searching for a stop to saving it in under 1
  minute.
- **SC-002**: The dashboard loads and shows next buses for all configured stops
  within 2 seconds on a typical home connection.
- **SC-003**: Scheduled passing times shown match the official Carris schedule
  for the selected service day.
- **SC-004**: 90% of users complete the configure-then-view flow on their first
  attempt without assistance.
- **SC-005**: Adding realtime ETA later requires no changes to the dashboard
  view or the application-facing interface.

## Assumptions

- v1 covers the Carris city bus network using its public static GTFS schedule
  feed; realtime ETA is out of scope for v1.
- The underlying schedule data is ingested into the module and kept queryable
  locally; a manual refresh process exists in v1, with UI-driven refresh not
  required.
- The module runs inside the Home Sweet Home dashboard for a single home user;
  user accounts and multi-user permissions are out of scope.
- The default number of upcoming buses shown per stop is 5.
- Times are handled internally in UTC and displayed in Europe/Lisbon time,
  including daylight-saving transitions.
- Configuration is persisted server-side and survives restarts.
- The data provider is subject to change; the provider abstraction is a
  deliberate seam for future realtime ETA sources.