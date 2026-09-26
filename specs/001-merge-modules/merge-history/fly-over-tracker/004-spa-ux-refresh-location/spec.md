# Feature Specification: SPA UX Improvements

**Feature Branch**: `feature/004-spa-ux-refresh-location`

**Created**: 2026-09-21

**Status**: Draft

**Input**: User description: "i want to improve the spa page. i want the following: 1) centered selection panel, at the moment the coordiante selection and map vs list item are already vertical but want them aligned on center 2) i want a favicon for the page 3) i want possibility of selecting auto-refresh rate (off / 5 / 10 / 30 / 60 seconds) 4) i want possibility to use current user location (maybe above the selection of coordinates as it will overwrite inputs"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Center the selection panel (Priority: P1)

A user opens the web app and sees the location selection panel — the coordinate inputs and the
list/map view toggle — aligned on the horizontal center of the page, forming a single clean
column of controls regardless of the current display mode. The change is purely visual: all
existing interactions (typed input, map selection, submission, view switching) behave exactly as
before.

**Why this priority**: This is the user's first request and an immediate, low-risk improvement to
the app's look and feel; it requires no new logic.

**Independent Test**: Can be fully tested by opening the app in both list and map modes and
visually verifying that the selection panel controls are horizontally centered on the page.

**Acceptance Scenarios**:

1. **Given** the app is open in list mode, **When** the page is rendered, **Then** the coordinate
   selection form and the list/map toggle are horizontally centered in the page.
2. **Given** the app is open in map mode, **When** the page is rendered, **Then** the selection
   panel remains horizontally centered and the map below it stays usable.
3. **Given** the centered layout is shown, **When** the user submits a query, switches modes, or
   edits inputs, **Then** all existing behaviors work identically to before.

---

### User Story 2 - Use my current location (Priority: P1)

A user who wants to see aircraft over their own position clicks a "Use my current location"
control placed above the coordinate inputs. The app asks for location permission, and on success
fills the latitude and longitude inputs with the device's position, keeping the radius unchanged.
The query is not run automatically — the user presses "Find aircraft" as usual. If permission is
denied or the location cannot be obtained, the app shows a clear message and the user continues
with typed input.

**Why this priority**: This is a direct user request and a high-value convenience for the primary
"what's flying over me?" use case; it depends only on the existing form and draft state.

**Independent Test**: Can be fully tested by granting location permission, pressing the control,
and verifying the latitude/longitude inputs are filled with the device position while the radius
is preserved, and by denying permission and verifying a clear error message appears.

**Acceptance Scenarios**:

1. **Given** the user grants location permission, **When** the user presses "Use my current
   location", **Then** the latitude and longitude inputs are filled with the device's position
   within 1 second and the radius is unchanged.
2. **Given** the inputs are filled by the current-location action, **When** the user presses
   "Find aircraft", **Then** the query uses exactly the filled position and the existing radius.
3. **Given** the user denies location permission, **When** the user presses "Use my current
   location", **Then** the app shows a clear message and the inputs are not changed.
4. **Given** the location service is unavailable (timeout, no fix), **When** the user presses
   "Use my current location", **Then** the app shows a clear message and the inputs are not
   changed.
5. **Given** a map selection exists, **When** the user fills the inputs via "Use my current
   location", **Then** the map marker moves to match the new center, keeping typed and map
   selection consistent.

---

### User Story 3 - Choose an auto-refresh rate (Priority: P2)

A user wants the displayed fly-over results to stay current without pressing Refresh. The app
offers a selector with the choices off, 5, 10, 30, and 60 seconds. When a rate other than off is
chosen and a query has been submitted, the app re-runs the last submitted query at that cadence.
Switching to off stops automatic refreshing; the manual Refresh action always remains available.
The selection persists across a page reload within the session only.

**Why this priority**: Automatic refresh is a direct user request and useful for live tracking,
but the app is fully functional with manual refresh alone, so it ranks below the panel and
location work.

**Independent Test**: Can be fully tested by submitting a query, selecting each non-off rate, and
verifying the result updates at the chosen cadence, then selecting off and verifying it stops.

**Acceptance Scenarios**:

1. **Given** a query has been submitted and the rate is set to 10 seconds, **When** 10 seconds
   elapse, **Then** the app re-runs the last submitted query and the displayed result updates.
2. **Given** a rate is set to off, **When** any amount of time passes, **Then** the app does not
   re-run the query automatically.
3. **Given** the user changes the rate while auto-refresh is active, **When** the new rate takes
   effect, **Then** the refresh interval adjusts to the newly selected value.
4. **Given** no query has been submitted yet, **When** a non-off rate is selected, **Then** the
   app does not run any query until the user submits one.
5. **Given** an auto-refresh is in flight, **When** the interval elapses again, **Then** the app
   does not start overlapping refreshes.
6. **Given** auto-refresh is active, **When** the user presses the manual Refresh action, **Then**
   a refresh runs immediately and the auto-refresh schedule continues from that point.

---

### User Story 4 - See a favicon in the browser tab (Priority: P3)

A user sees the fly-over-tracker page in a browser tab or bookmark with a small aircraft icon in
the theme color, instead of the default blank tab icon.

**Why this priority**: Branding polish; the app works without it, but it is a requested, quick
improvement.

**Independent Test**: Can be fully tested by loading the page and verifying the browser tab and
bookmark show the aircraft favicon.

**Acceptance Scenarios**:

1. **Given** the web app is loaded in a browser, **When** the page renders, **Then** the browser
   tab shows the aircraft favicon.
2. **Given** the page is bookmarked, **When** the bookmark is inspected, **Then** the bookmark
   shows the same favicon.

---

### Edge Cases

- What happens when the user denies location permission? → A clear message is shown; inputs are
  not changed; typed input remains fully usable.
- What happens when the location lookup times out or returns no fix? → A clear message is shown;
  inputs are not changed.
- What happens if the returned coordinates are out of the valid range? → The app clamps or rejects
  the values to the valid bounds and does not propagate invalid values to a query.
- What happens when a non-off auto-refresh rate is selected before any query exists? → No query is
  run; auto-refresh starts only after a query is submitted.
- What happens when the auto-refresh interval elapses while a previous refresh is still running? →
  The new refresh is skipped; no overlapping requests occur.
- What happens when the auto-refresh rate is changed or the component is unmounted? → The previous
  timer is cleared and replaced, or stopped.
- What happens when the query returns an error during an automatic refresh? → The same error state
  shown for manual refresh is shown; the auto-refresh schedule continues.
- What happens if the browser does not support geolocation (insecure context, old browser)? → The
  control shows a clear message that location is unavailable; typed input remains available.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The selection panel (coordinate inputs and view toggle) MUST be aligned on the
  horizontal center of the page in both list and map display modes.
- **FR-002**: The web app MUST provide a "Use my current location" control placed above the
  coordinate inputs.
- **FR-003**: When the user grants location permission and the position is obtained, the app MUST
  fill the latitude and longitude inputs with the device's position within 1 second and MUST keep
  the radius unchanged.
- **FR-004**: The current-location action MUST NOT submit a query by itself; submission remains an
  explicit user action.
- **FR-005**: When location permission is denied, the lookup times out, or the position cannot be
  obtained, the app MUST show a clear message and MUST NOT change the existing input values.
- **FR-006**: A location filled via "Use my current location" MUST update the shared location so
  any map selection stays consistent with the inputs.
- **FR-007**: The web app MUST provide an auto-refresh rate selector with exactly the choices off,
  5, 10, 30, and 60 seconds, defaulting to off.
- **FR-008**: When a non-off rate is selected and a query has been submitted, the app MUST re-run
  the last submitted query at the selected cadence.
- **FR-009**: When the rate is set to off, the app MUST NOT re-run queries automatically.
- **FR-010**: The app MUST NOT start an automatic refresh if a refresh is already in flight, and
  MUST clear the active timer when the rate changes, a manual refresh runs, or the app is unloaded.
- **FR-011**: The manual Refresh action MUST remain available and MUST trigger an immediate
  refresh regardless of the auto-refresh setting.
- **FR-012**: The web app MUST render an aircraft favicon in the browser tab and bookmarks.
- **FR-013**: All existing behavior — typed input, map selection, validation, submission, and
  list/map switching — MUST continue to work unchanged.

### Key Entities *(include if feature involves data)*

- **Device Location**: The user's current GPS position as reported by the browser. Fills the
  latitude/longitude inputs and becomes part of a Location Query; never stored or transmitted
  beyond a normal query.
- **Refresh Rate**: The user's selected automatic refresh cadence (off, 5, 10, 30, or 60 seconds).
  Governs whether and how often the last submitted Location Query is re-run. A session-level
  preference, not persisted across sessions.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: The selection panel appears horizontally centered in both list and map modes for
  100% of page loads.
- **SC-002**: A user who grants location permission sees the latitude and longitude inputs filled
  with the device's position within 1 second, for 100% of successful lookups.
- **SC-003**: A user who denies or is denied location access always sees a clear message and
  unchanged inputs, in 100% of denial/failure cases.
- **SC-004**: With a non-off rate selected, the displayed result refreshes at the chosen cadence
  in at least 90% of expected intervals over a 10-minute observation window.
- **SC-005**: With the rate set to off, no automatic refreshes occur across a 10-minute
  observation window.
- **SC-006**: The aircraft favicon renders in the browser tab and bookmark for 100% of page loads
  in supported browsers.
- **SC-007**: All quality gates (lint, format, tests, typecheck, template drift check) pass before
  merge for this feature.

## Assumptions

- **Scope**: This feature is limited to the web app (frontend). No backend changes are required;
  the existing query capability is reused as-is.
- **Geolocation availability**: Geolocation works only in secure contexts (HTTPS or localhost);
  in insecure contexts the control shows an availability message. This is a browser-enforced
  constraint, not an app failure.
- **Current-location behavior**: The action fills inputs only; it does not auto-submit (confirmed
  with the user). Radius is preserved from the current input or default.
- **Refresh rate default**: Auto-refresh defaults to off, preserving current behavior.
- **Refresh semantics**: Automatic refresh re-runs the last submitted query; it does not change the
  location and does not read from the form draft.
- **Refresh persistence**: The selected rate is not required to persist across page reloads.
- **Favicon**: The favicon is an aircraft glyph in the theme color (amber), delivered as an image
  asset served by the web app.
- **Existing components**: The list, map, form, and toggle components are reused and extended
  rather than replaced.