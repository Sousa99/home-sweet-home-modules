# Feature Specification: Center Map on Selection Submit

**Feature Branch**: `feature/005-map-center-on-submit`

**Created**: 2026-09-22

**Status**: Draft

**Input**: User description: "i want a small feature, when a new selection is submitted to find flights for, i want it to center the map, in a way that the location is centered, and the circle fill almost all the map frame"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - See the selection centered and filling the map after submitting (Priority: P1)

A user submits a new location selection by pressing "Find aircraft" while viewing the map. The map
view animates so the selected center point is at the center of the map frame and the radius circle
fills most of the frame — its full circle remains visible with only a small margin around it. The
user can then pan and zoom freely as before; the view does not move again unless a new selection is
submitted.

**Why this priority**: This is the entire requested feature — a clear, immediate feedback loop that
shows the queried area at a glance. It is the smallest useful slice and the only user story.

**Independent Test**: Can be fully tested by selecting a location and radius, pressing "Find
aircraft" in map mode, and verifying the map centers on the selection with the circle filling most
of the frame.

**Acceptance Scenarios**:

1. **Given** the user is in map mode with a selection, **When** the user presses "Find aircraft",
   **Then** the map animates so the selected center is centered in the frame and the radius circle
   fills most of the frame (fully visible with a small margin).
2. **Given** the map has just refit after a submit, **When** the user pans or zooms, **Then** the
   view stays where the user moved it and does not jump back.
3. **Given** a previous submit already refit the map, **When** the user submits the same selection
   again, **Then** the map refits to that selection.

---

### User Story 2 - The map still fits the selection when submitting from the list view (Priority: P2)

A user submits a new selection while viewing the list. When the user then switches to map mode, the
map applies the same fit to the just-submitted selection instead of showing the previous default
view. If a fit was already applied to that submit (e.g., the user was in map mode at submit time),
switching modes does not re-fit the view.

**Why this priority**: This keeps the experience consistent across modes, but the core value of
User Story 1 is delivered without it; the user could simply submit in map mode.

**Independent Test**: Can be fully tested by submitting a selection in list mode, switching to map
mode, and verifying the map centers on that selection with the circle filling most of the frame.

**Acceptance Scenarios**:

1. **Given** the user submitted a selection while in list mode, **When** the user switches to map
   mode, **Then** the map fits that selection (center centered, circle filling most of the frame).
2. **Given** the user submitted a selection while in map mode (fit already applied), **When** the
   user switches to list and back to map, **Then** the map keeps the view where the fit left it
   and does not re-fit.
3. **Given** the user has never submitted a selection, **When** the user switches to map mode,
   **Then** the map shows the default view and does not attempt a fit.

---

### Edge Cases

- What happens with a very small radius (down to the minimum allowed)? → The map zooms in to the
  maximum useful zoom for the selection; the circle still appears centered and visible.
- What happens with the largest allowed radius? → The map zooms out enough that the full circle
  still fits within the frame.
- What happens when a fit would push the view outside the valid latitude/longitude range (e.g., a
  selection near the poles)? → The map constrains the fit to valid map bounds while keeping the
  center as close to frame center as possible.
- What happens if the user edits the inputs or drags markers after a submit? → The map view does
  not change; a fit occurs only on a new submit.
- What happens if the map failed to load? → The existing fallback to the list view is shown; no
  fit is attempted.
- What happens if a refresh (manual or automatic) runs after a submit? → The map view is
  unchanged; the fit applies to the submitted selection, not to refreshes of the same selection.
- What happens if the user submits twice in quick succession? → The view fits to the latest
  submitted selection.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: When the user submits a new selection while the map is visible, the app MUST move
  the map view so the submitted center point is centered in the map frame.
- **FR-002**: The same fit MUST size the zoom so the selection circle fills most of the map frame —
  the full circle visible with a small margin around it — rather than an arbitrary fixed zoom.
- **FR-003**: When a selection is submitted while the map is not visible (list mode) and the fit
  for that submission has not yet been applied, the app MUST apply the fit when the map becomes
  visible.
- **FR-004**: When a submission's fit has already been applied, switching between list and map
  modes MUST NOT re-fit the view.
- **FR-005**: The app MUST apply the fit only on a new submission, MUST NOT refit on edits to the
  inputs, marker drags, panning, or zooming, and MUST NOT refit when a refresh re-runs the same
  submitted selection.
- **FR-006**: The fit MUST respect the valid map bounds (latitude/longitude range) and MUST apply
  a sensible maximum zoom so very small radii remain centered and visible without over-zooming.
- **FR-007**: When the map cannot be loaded, the existing fallback behavior MUST be preserved and
  no fit MUST be attempted.
- **FR-008**: All existing map interactions (pan, zoom, marker drag, radius drag, map-based
  selection) and the existing selection-consistency behavior MUST continue to work unchanged.

### Key Entities *(include if feature involves data)*

- **Map View**: The map's current center and zoom level. Moved by the fit action on a new
  submission; otherwise freely controlled by the user through pan and zoom.
- **Location Query**: The submitted selection — a GPS point (latitude, longitude) and a radius.
  The fit derives the target map bounds from this selection's center and radius.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: For 100% of submissions made in map mode, the map centers on the submitted location
  with the circle fully visible inside the frame.
- **SC-002**: For 100% of submissions made in list mode, switching to map mode shows the map fitted
  to that submission; switching again does not re-fit.
- **SC-003**: For 100% of valid radius values (minimum to maximum), the fit keeps the circle fully
  visible and centered within the frame.
- **SC-004**: Across a 2-minute observation window, editing inputs, dragging markers, panning, and
  zooming never trigger a map fit or a view jump.
- **SC-005**: When the map fails to load, the app continues to show the list view without any fit
  attempt.
- **SC-006**: All quality gates (lint, format, tests, typecheck, template drift check) pass before
  merge for this feature.

## Assumptions

- **Scope**: This feature is limited to the web app (frontend). No backend changes are required;
  the existing query capability is reused as-is.
- **Fit timing**: The fit happens once per new submission. Manual or automatic refreshes of the
  same submitted selection do not trigger a fit.
- **Fill target**: "Fills almost all the map frame" means the full circle is visible with a small
  margin (roughly 3% of the frame on the short side) around it. The exact margin is a visual
  detail left to implementation.
- **Animation**: The fit may be animated for a smooth transition; an instant jump is acceptable as
  a fallback. Either satisfies the feature.
- **User override**: After a fit, the user's subsequent pan and zoom are respected; the map does
  not move again until a new submission.
- **Mode default**: If the user has never submitted a selection, the map keeps its current default
  view when opened; no fit is attempted.
- **Existing behavior**: The map's draggable selection markers, the shared center/radius state,
  and the list/map toggle are reused unchanged; only the view behavior on submit is added.

## Checklist

Specification quality checklist: `checklists/requirements.md`