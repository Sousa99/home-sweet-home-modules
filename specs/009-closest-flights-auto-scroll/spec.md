# Feature Specification: Slow Auto-Scroll for the Closest-Flights List

**Feature Branch**: `009-closest-flights-auto-scroll`

**Created**: 2026-10-04

**Status**: Draft

**Input**: User description: "can you implement the slow scroll animation existing on weather for the day + hour on weather-psychic into the N closes flights on the list of fly-catcher."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - The Closest-Flights List Auto-Scrolls Slowly (Priority: P1)

As someone with the fly-over-tracker closest-flights list on my dashboard, I see the list glide slowly and smoothly on its own when there are more flights than fit in view, so the nearest aircraft keep coming into view without me touching the scroll.

**Why this priority**: This is the entire ask — bringing the weather module's slow auto-scroll animation to the N closest flights list. Without the auto-scroll there is no feature.

**Independent Test**: Render the closest-flights list with more aircraft than the visible area can hold and observe it scroll slowly and smoothly without any user interaction.

**Acceptance Scenarios**:

1. **Given** a closest-flights list whose content overflows the visible area, **When** the widget is shown, **Then** the list scrolls slowly and smoothly on its own.
2. **Given** the auto-scrolling list, **When** it reaches the last flight, **Then** it pauses briefly at the end.
3. **Given** the list paused at the end, **When** the pause elapses, **Then** the list returns to the start and continues scrolling, forming a continuous loop.

---

### User Story 2 - Reduced Motion Is Respected (Priority: P1)

As someone who prefers reduced motion, I see the closest-flights list stay perfectly static — no auto-scrolling — the same way the weather module's day + hour strip behaves.

**Why this priority**: The source animation in weather-psychic already honors the user's motion preference; the closest-flights list must match that accessibility behavior, or the feature would exclude a group of users.

**Independent Test**: Enable the "reduce motion" preference and confirm the list never auto-scrolls, including when the preference changes mid-scroll.

**Acceptance Scenarios**:

1. **Given** reduced motion is enabled, **When** the list renders, **Then** no auto-scrolling occurs.
2. **Given** the auto-scrolling list, **When** reduced motion is turned on mid-scroll, **Then** the list stops scrolling.

---

### User Story 3 - List Content and Interaction Stay Intact (Priority: P2)

As someone using the list, all existing content, closest-first ordering, manual scrolling, and data refresh behavior remain exactly as before — only the auto-scroll animation is added.

**Why this priority**: The change is additive; the list must not regress in any way it behaves today.

**Independent Test**: Compare the list's content, ordering, manual-scroll behavior, and refresh behavior before and after; only the presence of auto-scroll may differ.

**Acceptance Scenarios**:

1. **Given** the auto-scrolling list, **When** I scroll manually, **Then** I can still scroll freely and control the list myself.
2. **Given** the list, **When** fresh aircraft data arrives, **Then** the list updates as it does today.
3. **Given** the list, **When** a flight is no longer overhead, **Then** it disappears from the list as it does today.

---

### Edge Cases

- What happens when the list fits fully in the visible area (no overflow)? → No auto-scrolling; the list stays static since there is nothing to scroll.
- What happens when there are no aircraft? → The empty state is unchanged and never auto-scrolls.
- What happens while data is loading or after a refresh? → The auto-scroll continues over the last known list; loading and error states remain unchanged.
- What happens when the list is very long? → The auto-scroll covers the whole list, pausing at the end before looping back to the start.
- What happens when reduced motion is toggled mid-scroll? → The list stops scrolling immediately.
- Does the list change direction or orientation? → No; the list keeps its natural vertical layout and the animation scrolls in that same direction.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The N closest-flights list in fly-over-tracker MUST auto-scroll slowly and smoothly on its own whenever its content overflows the visible area.
- **FR-002**: The auto-scroll pace MUST be slower than the weather module's strip — the list is compact, so the motion must feel calm and unhurried, never rushed.
- **FR-003**: When the auto-scroll reaches the end of the list, it MUST pause briefly before looping back to the start.
- **FR-004**: The auto-scroll MUST loop continuously (scroll → pause at end → return to start) while the list is visible and its content overflows.
- **FR-005**: The animation MUST honor the user's reduced-motion preference: no auto-scrolling when it is enabled, and an immediate stop if the preference changes mid-scroll.
- **FR-006**: Manual scrolling MUST remain fully possible while the auto-scroll is active.
- **FR-007**: The list's content, closest-first ordering, and data-refresh behavior MUST remain unchanged; only the auto-scroll animation is added.
- **FR-008**: A list whose content fits entirely in the visible area MUST stay static (no auto-scrolling).
- **FR-009**: Empty, loading, and error states MUST remain unchanged and MUST never auto-scroll.

### Key Entities *(include if feature involves data)*

- **Closest-flights list**: the ordered list of the nearest aircraft within the configured radius (closest first), capped at N. This is the surface the animation is applied to.
- **Auto-scroll behavior**: the slow, smooth, continuous scroll with a brief end-pause and loop-back — the same behavior the weather module uses on its day + hour strip.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of closest-flights lists whose content overflows the visible area auto-scroll slowly and smoothly without any user interaction.
- **SC-002**: The auto-scroll moves at a slower pace than the weather module's day + hour strip — visibly calmer, matching the compact size of the list.
- **SC-003**: 100% of overflowing lists loop continuously (scroll → pause → return to start) without stopping or stalling over an extended observation period.
- **SC-004**: 100% of lists render static — with no auto-scrolling — whenever reduced motion is enabled.
- **SC-005**: No regression in list content, closest-first ordering, manual scrolling, or refresh behavior — verified against the pre-change behavior.

## Assumptions

- "fly-catcher" refers to the fly-over-tracker module, the repository's closest-aircraft module.
- The animation is applied to the N closest flights list as it exists today, keeping its natural vertical orientation and layout. "Slow scroll animation" means the same behavior the weather module uses on its day + hour strip — smooth, slow, continuous scrolling with a pause at the end and a loop back to the start — not a change to the list's layout or direction.
- Because the closest-flights list is compact, the scroll pace is set slower than the weather strip's so the motion stays calm and readable; the exact pace is tuned during planning/implementation.
- "N" is the existing cap on the number of closest flights the list shows.
- The scope is the closest-flights list in fly-over-tracker; other surfaces (full aircraft list, map) are out of scope unless they present the same N closest flights.
- Reduced-motion behavior matches the weather module's existing behavior for consistency across modules.
- The behavior is a frontend presentation change only; no backend, contract, or data changes are involved.