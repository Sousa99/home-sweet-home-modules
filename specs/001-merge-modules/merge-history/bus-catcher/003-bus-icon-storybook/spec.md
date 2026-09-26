# Feature Specification: Bus Icon Favicon & Stop List Component Showcase

**Feature Branch**: `003-bus-icon-storybook`

**Created**: 2026-09-25

**Status**: Draft

**Input**: User description: "switch the favicon, i want a icon with a bus or something. and i also want you to develop storybook and components. the component is just one. it is the list of stops. the same you show on the spa. storybook should have addon docs, .mdx files with canvas and some documentation around the published component"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Browse the stop card widget in an isolated showcase (Priority: P1)

As a developer, I can open a dedicated component workspace and see the same
stop card widget the SPA dashboard renders for each configured stop — a
self-contained widget that displays the waiting times for a given stop and a
set of buses. It fetches the waiting times itself, renders the card header
with the stop's name, and shows the list of buses with their line,
destination, delay, arrival time, and Live/Schedule label — without having to
start the full application or depend on live data. I can step through each
state of the widget (mixed live and scheduled, schedule-only, empty / no more
buses, loading, error, and missing) one at a time. This widget is also the
component published through the frontend package, so external consumers
receive the self-fetching widget, not just the inner list.

**Why this priority**: This is the core of the requested work — a standalone
home for the stop card widget. It lets the component be built, reviewed,
and verified in isolation, which is the main value requested.

**Independent Test**: Can be fully tested by opening the component workspace,
selecting a state of the stop card widget, and confirming the rendered widget
matches what the SPA shows for the same data.

**Acceptance Scenarios**:

1. **Given** the component workspace, **When** I open it, **Then** I can view
   the stop card widget rendered without running the full application.
2. **Given** the component workspace, **When** I select a state, **Then** the
   widget renders that state (e.g. a mix of Live and Schedule rows) with no
   errors.
3. **Given** the widget in the workspace, **When** I compare it to the SPA,
   **Then** it is the same widget the SPA uses — there is a single shared
   implementation, not a duplicated copy.
4. **Given** the published package, **When** I consume it, **Then** it exposes
   the stop card widget (and its data types), not only the inner stop list.

---

### User Story 2 - See a bus icon in the browser tab (Priority: P1)

As a visitor to the application, I see a bus icon in my browser tab (favicon)
instead of the default blank page icon, so the app is instantly recognizable
as a transit tool.

**Why this priority**: It is the first branded element a user sees; it is
small, independent, and delivers immediate polish.

**Independent Test**: Can be fully tested by opening the SPA in a browser and
confirming the tab shows a bus icon rather than the default icon.

**Acceptance Scenarios**:

1. **Given** I open the application in a browser, **When** the page loads,
   **Then** the browser tab displays a bus icon favicon.
2. **Given** the bus favicon, **When** the tab is small or the icon is
   rendered at a small size, **Then** the bus symbol remains legible and
   recognizable.

---

### User Story 3 - Read documentation next to a live example (Priority: P2)

As a developer, when I open a state of the stop card widget in the component
workspace, I can read written documentation about the widget and its props
directly alongside a live, interactive example of it, including a visible
props/controls table. The documentation explains what the widget does, its
states, and how to use it, without switching between separate views.

**Why this priority**: Documented, self-explanatory components raise the value
of the showcase, but the showcase and favicon work first; documentation
completes the story.

**Independent Test**: Can be fully tested by opening a component's
documentation page in the workspace and confirming that narrative
documentation and a live interactive example are visible together.

**Acceptance Scenarios**:

1. **Given** the component workspace, **When** I open the documentation for
   the stop card, **Then** I see written documentation alongside an embedded,
   interactive example of the component (a canvas).
2. **Given** the documentation, **When** I read it, **Then** it describes the
   component's purpose, its props, and its states.
3. **Given** a documented example, **When** I interact with it (for example by
   selecting a story variant), **Then** the embedded example updates to match.

---

### Edge Cases

- The stop list inside the card is empty (no more buses scheduled today): the
  card shows the "No more buses scheduled today." state, matching the SPA.
- Schedule-only data: rows show the Schedule label, and no Live pill appears.
- Mixed data: some rows show Live and others Schedule within the same list.
- Delay present vs. absent: rows render the delay text when available and
  blank space when it is not, without layout breakage.
- The workspace shows a component that is out of date relative to the SPA:
  the shared single implementation prevents divergence — any change is visible
  in both places.
- The favicon must not break when a browser caches it: users who visited
  before may still see the old icon until their cache refreshes (acceptable,
  non-blocking).
- Invalid or missing favicon asset: the app still loads and falls back to the
  default icon, never an error.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST provide a runnable component workspace in which
  the stop card widget is displayed in isolation, without starting the full
  application or requiring live network data.
- **FR-002**: The widget shown in the workspace MUST be the same shared
  widget the SPA dashboard renders for each configured stop; the workspace
  MUST NOT contain a separate or duplicated implementation.
- **FR-003**: The workspace MUST demonstrate the stop card widget across its
  states — mixed live/scheduled rows, schedule-only rows, empty "no more
  buses", loading, error (stop not found), and missing (stop no longer
  exists).
- **FR-004**: The workspace MUST render written documentation for the stop
  card widget alongside a live, interactive example of it, visible on the
  same page, and MUST display the widget's props in a readable table.
- **FR-005**: The documentation MUST explain the widget's purpose, its
  inputs (props), and its states, so a developer can use it without reading
  the source.
- **FR-010**: The widget MUST fetch the waiting times for the given stop and
  bus set itself (no caller-provided times), refresh them on a regular
  interval, and expose loading, error, and ready states to the user.
- **FR-006**: The SPA MUST display a bus icon as its browser-tab favicon.
- **FR-007**: The favicon MUST be legible at typical browser-tab sizes and
  MUST render correctly in current browsers.
- **FR-008**: The component workspace MUST run on the frontend's existing
  tooling and conventions, so it stays in sync with the SPA's build and test
  gates.
- **FR-009**: The frontend package MUST publish the stop card component —
  with its props and data types — as its public interface, so consumers
  receive the card (which contains the stop list) rather than the inner list
  alone.

### Key Entities *(include if feature involves data)*

- **Stop Card Widget**: The reusable, self-fetching widget that displays the
  waiting times for a given stop and a set of buses. It fetches
  `StopTimesResponse` itself (on an interval), renders a header with the
  stop's name (and optional line-filter badge), a body with the stop's bus
  rows plus a realtime coverage notice, and loading/error/missing states. It
  is consumed by the SPA dashboard, showcased in the component workspace, and
  exported through the frontend package. The inner stop list is a private
  building block of this widget.
- **Passing**: The data item a row renders: line id and short name, headsign,
  scheduled time, predicted (live) time, delay minutes, and source
  (`live`/`scheduled`).
- **Realtime Info**: Per-stop realtime coverage — whether live data is
  available, when it was last updated, and how many of the listed buses are
  live.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A developer can open the component workspace and view the stop
  card widget rendered within 1 minute of starting the workspace, without
  running the full application.
- **SC-002**: Every state of the stop card widget (mixed, schedule-only,
  empty, loading, error, missing) is demonstrable in the workspace with a
  live, interactive example.
- **SC-003**: Every state shown in the workspace is accompanied by written
  documentation visible on the same page as the example, and the widget's
  props are readable in a table.
- **SC-004**: The stop card widget rendered in the workspace behaves
  identically to the one rendered in the SPA, since both use a single shared
  implementation with no divergence.
- **SC-005**: A user opening the SPA in a current browser sees a bus icon in
  the tab — verified in at least one evergreen browser.
- **SC-006**: The frontend package build publishes the stop card widget with
  its props and data types, so an external consumer can render waiting times
  for a stop without accessing the SPA source.
- **SC-007**: The widget displays waiting times for the given stop and bus set
  without the caller supplying the times, and refreshes them on its configured
  interval.

## Assumptions

- The exposed component is the stop card widget the SPA dashboard already
  renders for each configured stop: a self-fetching widget for a given stop
  and set of buses, with the card header (stop name + optional line-filter
  badge) and a body showing the rows of buses with line, headsign, delay,
  arrival time, and Live/Schedule label, plus the per-stop realtime notice.
- The widget fetches its own data through the existing stop-times interface
  and refreshes on an interval; consumers may override the fetcher (e.g. for
  fixtures or a different API host).
- The component workspace is built with Storybook, as requested, using its
  docs addon; documentation pages are authored as MDX files that embed an
  interactive canvas next to prose.
- The favicon is a bus icon; the specific icon asset (style, color, source)
  is chosen during planning. A simple, recognizable bus silhouette is the
  expected default.
- The workspace is a developer tool: it does not ship to end users and is not
  part of the public SPA bundle.
- The workspace is documented and verified through the project's existing
  quality gates (lint, typecheck, tests) like any other frontend code.
- The frontend already depends on React, Vite, and Tailwind; the workspace
  reuses those conventions rather than introducing new framework choices.