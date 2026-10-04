# Feature Specification: Status Bar Placement Outside the Card

**Feature Branch**: `008-status-bar-placement`

**Created**: 2026-10-04

**Status**: Draft

**Input**: User description: "the status bar for the bus-catcher components is within the card. can you move it up outside?"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Status Bar Above the Card (Priority: P1)

As someone looking at a bus-catcher widget (the waiting-time card), I see the status bar as its own block **above** the card, fully outside the card's boundary, so the card itself contains only the stop's content (name, badge, waiting times, coverage) and the status information does not feel like part of the card.

**Why this priority**: This is the entire ask. The status bar must leave the card's interior and sit above it; without this there is no feature.

**Independent Test**: Render the bus-catcher waiting-time widget and confirm the status bar is rendered above and outside the card's border/background, not inside it.

**Acceptance Scenarios**:

1. **Given** the bus-catcher waiting-time widget, **When** it renders, **Then** the status bar is displayed directly above the card, outside the card's boundary.
2. **Given** the widget, **When** I inspect the card's interior, **Then** it contains only the stop's content (name, badge, waiting times, coverage) and no status bar.
3. **Given** the widget, **When** it renders, **Then** the status bar and the card remain clearly separated with no overlapping or interleaved visual elements.

---

### User Story 2 - Each Card Keeps Its Own Status Bar (Priority: P2)

As someone viewing a page that shows several bus-catcher waiting-time cards at once, I see each card with its own status bar directly above it, aligned to that card's width, so I can always tell which card a status belongs to.

**Why this priority**: The move must not degrade multi-card layouts; keeping the bar visibly tied to its card is required once cards are shown side by side. Secondary to the basic move, hence P2.

**Independent Test**: Render two or more waiting-time cards on the same page and confirm each has a status bar directly above its own card, matching its card's width.

**Acceptance Scenarios**:

1. **Given** two or more bus-catcher widgets on the same page, **When** they render, **Then** each status bar sits directly above its own card and spans the same width as that card.
2. **Given** multiple widgets, **When** one card's data updates, **Then** only that card's status bar reflects the update, not the others'.

---

### User Story 3 - Status Bar Behavior Unchanged (Priority: P2)

As someone using the status bar (last-updated time, updating indicator, Refresh, failure notice), I find all its behavior and content exactly as before — only its position changed.

**Why this priority**: The feature is purely about placement; preserving the standardized status bar's content and behavior is a requirement of the move, not a new capability.

**Independent Test**: Compare the status bar's content, wording, controls, and accessibility behavior before and after the move; everything except position must be identical.

**Acceptance Scenarios**:

1. **Given** the moved status bar, **When** I press Refresh, **Then** a new load is triggered and the last-updated time advances on success, exactly as before.
2. **Given** the moved status bar, **When** a load is in flight, **Then** the updating indicator appears above the card, and the Refresh control is disabled, exactly as before.
3. **Given** the moved status bar, **When** a load fails, **Then** the failure notice is shown in the status bar above the card and Refresh remains available to retry.

---

### Edge Cases

- What happens when the widget is very narrow (small embed or side-by-side layout)? → The status bar wraps within its own block above the card and never overlaps the card.
- What happens when there is no data yet? → The status bar shows "Not updated yet" above the card, exactly as the standardized bar does today.
- What happens when the card is a "missing stop" notice? → The status bar still appears above the card; its behavior (no Refresh on missing stops) is unchanged.
- How do cards stacked vertically in a grid remain attributable? → Each status bar stays directly above its own card, aligned to that card's width.
- Do other modules' widgets change? → No; the scope is the bus-catcher components only (per the request).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Every bus-catcher published widget that exposes the status bar MUST render it outside and directly above the card, not within the card's boundary.
- **FR-002**: The card's interior MUST NOT contain the status bar; it contains only the widget's own content (stop name, badge, waiting times, coverage).
- **FR-003**: The status bar and its card MUST remain visually distinct, with no overlap or interleaving between the two.
- **FR-004**: Each status bar MUST align to the width of the card it belongs to and sit directly above that card, so the association is unambiguous even in multi-card layouts.
- **FR-005**: The status bar's content, wording, layout, controls, and accessibility behavior MUST remain exactly as specified by the standardized component status (spec 005) — only its position changes.
- **FR-006**: In a multi-card page, each card MUST keep its own status bar reflecting only that card's load state, so updating one card does not affect another's status.

### Key Entities *(include if feature involves data)*

- **Widget card**: The bus-catcher waiting-time card container holding the stop's content. Its boundary defines where the status bar must not appear.
- **Status bar placement**: The relationship between a widget and its status bar — the bar sits directly above the card, aligned to its width, outside its boundary. This placement is the subject of this feature.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of bus-catcher published widgets with a status bar render it above and outside the card boundary.
- **SC-002**: No card renders a status bar inside its interior — verified for every widget, not a sample.
- **SC-003**: In every multi-card layout, each status bar is positioned directly above its own card and matches that card's width.
- **SC-004**: All pre-existing status bar behavior (last-updated time, updating indicator, Refresh, failure notice, screen-reader announcements) remains fully functional after the move — verified against spec 005's contract.

## Assumptions

- The scope is the bus-catcher published components only, as requested. Other modules' widgets are not affected by this change.
- "Outside the card" means directly above the card, as a separate block that shares the card's horizontal width and does not sit within the card's border or background.
- Only the placement of the status bar changes. Its content, wording, layout, controls, and accessibility behavior are unchanged and remain governed by spec 005 (Standardized Component Status).
- No widget props or public API change as part of this feature; it is a purely presentational placement change.
- Currently only the bus-catcher waiting-time card exposes the standardized status bar; if other bus-catcher widgets later expose it, they follow the same above-the-card placement.