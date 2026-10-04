# Feature Specification: Standardized Component Status

**Feature Branch**: `005-standardized-component-status`

**Created**: 2026-10-04

**Status**: Draft

**Input**: User description: "i want a new feature. i want to standardize all published components across the various packages. if you see on fly-scanner components all have on top something like found X airplanes around X with radius, a status when updating and a refresh button to trigger manually. i want all published components to have such functionality, like a status, but instead of saying X ammount of stuff, it shows a local time saying when was last update, optionally something displaying its being updated and finally a refresh button."

## Clarifications

### Session 2026-10-04

- Q1: Which published components receive the standardized status bar? → A: Data-fetching widgets only. The standard applies to published widgets that load or refresh data (aircraft widgets, bus waiting-times card, task deck wrapper). Purely presentational or continuously self-updating components (the clock family, the time-format toggle, controlled display components that receive data as props) are exempt — a "last updated" time and a Refresh button have no natural meaning there.
- Q2: How is the cross-package standardization delivered? → A: One shared implementation reused by all modules. A single shared status-bar component is built once and consumed by every module's data-fetching widgets, so consistency is guaranteed by construction.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Last-Update Status on Every Data Widget (Priority: P1)

As someone viewing any published Home Sweet Home widget (aircraft tracker, bus waiting times, task deck), I see a status area at the top of the widget that shows the **local time** the widget's data was last successfully updated — e.g. "Last updated 14:32:05" — instead of a sentence describing how many items were found, so I immediately know whether what I'm looking at is current.

**Why this priority**: This is the core of the ask. Every published data widget must expose its data freshness at a glance; without it there is no feature.

**Independent Test**: Open each published data-fetching widget across every module, confirm a "Last updated <local time>" status is present, and confirm it shows the device's local time and advances when new data arrives.

**Acceptance Scenarios**:

1. **Given** any published data-fetching widget, **When** it has successfully loaded data, **Then** its status area shows the local time of the most recent successful load.
2. **Given** a widget that has loaded data, **When** new data is loaded later, **Then** the displayed last-updated time advances to the new load time.
3. **Given** a widget, **When** I compare the displayed time to the device clock, **Then** they match in the device's local timezone.
4. **Given** a widget, **When** it has never successfully loaded, **Then** it shows a clear "not updated yet" state rather than a misleading timestamp.

---

### User Story 2 - Manual Refresh on Every Data Widget (Priority: P1)

As someone viewing a published widget, I can press a **Refresh** button in the status area to trigger an immediate re-load of the data, so I don't have to wait for the next automatic refresh (or load it myself).

**Why this priority**: The refresh control is an explicit part of the ask, right after the status. It is what makes the status actionable.

**Independent Test**: On each published data-fetching widget, press Refresh and observe a new load is triggered and the last-updated time is refreshed on success.

**Acceptance Scenarios**:

1. **Given** any published data-fetching widget, **When** I press the Refresh control, **Then** a new data load is triggered immediately.
2. **Given** a widget, **When** the triggered load succeeds, **Then** the last-updated time advances to the new load time.
3. **Given** a widget, **When** the triggered load fails, **Then** the previously shown data and its timestamp remain visible and the failure is surfaced.
4. **Given** a widget currently loading, **When** I press Refresh again, **Then** no duplicate or conflicting load is started.

---

### User Story 3 - Update-In-Progress Indicator (Priority: P1)

As someone viewing a published widget, I can tell when data is being fetched or refreshed right now: while a load is in flight the widget shows a small "Updating…" indicator, so I know the status may change momentarily.

**Why this priority**: The "status when updating" is the third explicit element of the ask. It complements the timestamp by showing activity between loads.

**Independent Test**: On each published data-fetching widget, trigger a refresh and observe the indicator appears while the load is in flight and disappears when it finishes.

**Acceptance Scenarios**:

1. **Given** any published data-fetching widget, **When** a load (initial or refresh) is in flight, **Then** an updating indicator is visible in the status area.
2. **Given** a widget with an indicator visible, **When** the load completes, **Then** the indicator disappears and the last-updated time advances.
3. **Given** a widget, **When** no load is in flight, **Then** no updating indicator is shown.

---

### User Story 4 - Identical Status Across All Modules (Priority: P2)

As someone who embeds widgets from different Home Sweet Home modules side by side, I see the same status bar layout, wording, and behavior on every one of them — "Last updated <time>", the same updating indicator, and the same refresh control in the same position — so the whole ecosystem feels like one product family.

**Why this priority**: Consistency is the explicit goal of the feature ("standardize"). It only matters once the individual widgets have the bar, hence P2.

**Independent Test**: Render a widget from each module (aircraft, bus, tasks) and confirm the status bar matches in wording, layout, and behavior across all of them.

**Acceptance Scenarios**:

1. **Given** widgets from different modules, **When** I compare their status areas, **Then** the wording and layout are identical (same label, same time format, same refresh control placement).
2. **Given** widgets from different modules, **When** I trigger a refresh on each, **Then** the behavior and indicator are consistent.

---

### User Story 5 - Failure and Empty States (Priority: P2)

As someone viewing a published widget whose backend is unreachable or has no data, I still see a sensible status area: the last successful update time is preserved, the current failure is shown clearly, and I can still press Refresh to retry.

**Why this priority**: Degraded behavior keeps the standard useful when things go wrong; it is secondary to the happy path but required for the standard to feel finished.

**Independent Test**: Point a widget at a failing backend, confirm the error is surfaced, the previous data/timestamp (if any) is preserved, and Refresh retries the load.

**Acceptance Scenarios**:

1. **Given** a widget that previously loaded data, **When** a later load fails, **Then** the previous data and its timestamp stay visible and an error message is shown.
2. **Given** a widget whose first load fails, **When** I press Refresh, **Then** it retries the load and can recover once the backend responds.

---

### Edge Cases

- What happens the very first time a widget loads (no previous "last updated" time exists)? → Show a "not updated yet"/loading state, never a fabricated timestamp.
- What happens when a refresh fails mid-flight? → Keep the previous data and timestamp, surface the error, and keep the Refresh control available to retry.
- What happens when the user presses Refresh while a load is already in flight? → The widget does not start a conflicting duplicate load; the indicator stays until the in-flight load settles.
- How do existing per-widget auto-refresh settings interact with the status? → Every successful load — manual or automatic — advances the last-updated time.
- How do widgets that present live, continuously updating data (e.g. a clock) fit the standard? → They are exempt: the standard applies to data-fetching widgets only (Q1).
- What happens when the host never calls the widget's data source (purely presentational component)? → Such components are exempt from the standard (Q1); data-fetching widgets always report their last-update status.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Every published data-fetching widget MUST show a status area containing the local time of its most recent successful data load, labeled "Last updated".
- **FR-002**: The status area MUST include a Refresh control that triggers an immediate re-load of the widget's data.
- **FR-003**: While any load (initial or refresh) is in flight, the status area MUST show an updating indicator; the indicator MUST NOT be shown when no load is in flight.
- **FR-004**: The status area wording, layout, time format, indicator, and Refresh control MUST be identical across all modules' published widgets.
- **FR-005**: The last-updated time MUST be rendered in the device's local timezone and advance whenever a subsequent load succeeds (manual or automatic).
- **FR-006**: When a load fails, the widget MUST keep its last successful data and timestamp visible, surface the failure clearly, and leave Refresh available to retry.
- **FR-007**: When a widget has never successfully loaded, it MUST NOT show a fabricated timestamp; it shows a clear "not yet updated" state.
- **FR-008**: The status area MUST be accessible: screen readers MUST announce the update indicator and any failure surfaced in the status.
- **FR-009**: Existing per-widget auto-refresh behavior and controls MUST remain functional and MUST advance the last-updated time on each successful automatic load.
- **FR-010**: The standard applies to published data-fetching widgets only; purely presentational and continuously self-updating published components (clock family, time-format toggle, controlled display components fed by props) are exempt (Q1).
- **FR-011**: The standard is delivered as one shared status-bar implementation reused by all modules' data-fetching widgets, so the wording, layout, and behavior are identical by construction (Q2).

### Key Entities *(include if feature involves data)*

- **Last-update timestamp**: The device-local clock time of the most recent successful data load for a widget. It is the single source of truth for the status area's "Last updated" value and advances on every successful load.
- **Load state**: The widget's current data activity (no data yet / loading / ready with data / failed). It drives whether the updating indicator is visible, whether the last-updated time is shown, and whether a failure notice appears.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of published data-fetching widgets across all modules display the standardized status area (last-updated local time, update indicator, Refresh control).
- **SC-002**: The displayed last-updated time matches the device clock to the minute in every widget.
- **SC-003**: After pressing Refresh, the widget's status reflects the new load (timestamp advances, indicator clears) within 2 seconds under normal conditions.
- **SC-004**: Every published data-fetching widget exposes a working Refresh control — verified for all widgets, not a sample.
- **SC-005**: Cross-module consistency is verified: the status areas of widgets from different modules match in wording and layout with no per-module deviations.

## Assumptions

- "Published components" means the components exported from each module's frontend library package (e.g. aircraft widgets, bus waiting-time card, task deck), not internal UI primitives or the SPA pages themselves.
- The standard applies to published **data-fetching widgets** (Q1). The clock family, the time-format toggle, and controlled display components that receive data as props are exempt.
- The standard is delivered as **one shared implementation** reused by all modules (Q2); this introduces a new shared frontend package in the monorepo.
- The updating indicator is a transient element shown only while a load is in flight ("optionally something displaying its being updated"), matching the current aircraft-widget behavior.
- "Local time" means the viewing device's local timezone, displayed as hours:minutes:seconds.
- Existing per-widget auto-refresh controls and rates are out of scope for standardization; they stay as they are and simply feed the new status.
- SPA dashboards and the Storybook workbench pages are out of scope except as a place to preview the standardized widgets.
- The consistency standard is defined by the shared wording/layout/behavior in this spec, achieved through a single shared status-bar implementation reused by every module (Q2).
- A refresh triggered while a load is already in flight is ignored (no duplicate concurrent loads).