# Feature Specification: Per-Stop Departure Alert Thresholds

**Feature Branch**: `004-stop-alert-thresholds`

**Created**: 2026-09-25

**Status**: Draft

**Input**: User description: "i want to configure, per stop, two thresholds, an early-warning and late-warning and missed-bus threshold (names are not great), something that signified like 'you should think about leaving for the bus', 'you should have left for the bus', its too late to catch the bus"

## Clarifications

### Session 2026-09-25

- Q: What should the minimal-but-noticeable representation of the four urgency levels be on each bus row? → A: Colored dot only (no text label) — green for relaxed, amber for "heads-up", orange for "leave now", dark slate/black for "missed".

## User Scenarios & Testing *(mandatory)*

The dashboard currently shows every configured stop's next buses with how many
minutes remain until each bus arrives (`minutesUntil`). This feature adds, per
stop, a small set of configurable time thresholds that turn that raw "minutes
until" number into an urgency level that answers a real question: **do I still
have time to catch this bus, and if so, do I need to leave soon?**

### User Story 1 - Configure departure thresholds for a stop (Priority: P1)

As a user, when I add or edit a stop in the config, I can set three time
values for that stop, each expressed in minutes before the bus arrives. Each
value answers one question:

- "**Heads-up** for the bus" — the warning zone begins; you should start
  thinking about leaving.
- "**Leave now**" — you are at the point where you should already be heading
  to the stop.
- "**Missed**" — you can no longer make this bus.

I can set these values when I first configure a stop or change them later. The
values are saved with the stop and remembered the next time I open the app.

**Why this priority**: Without configuration there is no feature — the
thresholds are the data the rest of the feature builds on, and the user
explicitly asked for per-stop configuration.

**Independent Test**: Can be fully tested by adding a stop, setting the three
threshold values, saving, and confirming the values persist and are editable on
a later visit.

**Acceptance Scenarios**:

1. **Given** the config screen for a stop, **When** I set three threshold
   values (in minutes), **Then** I can save them and they persist for that stop.
2. **Given** a configured stop, **When** I reopen its config later, **Then** the
   previously saved threshold values are shown and can be changed.
3. **Given** invalid threshold values, **When** I try to save, **Then** I get a
   clear message and the values are not saved.

---

### User Story 2 - See how urgent each upcoming bus is (Priority: P1)

As a user looking at the dashboard, each upcoming bus at a stop shows an
urgency level derived from that stop's thresholds and how many minutes remain
until the bus arrives. At a glance I can tell whether a bus still gives me
comfortable time ("relaxed"), whether I should start thinking about leaving
("heads-up"), whether I should have already left ("leave now"), or whether it
is too late to catch it ("missed"). I do not have to do arithmetic myself.

**Why this priority**: This is the user-facing value of the feature — turning
raw minutes into an actionable "should I leave?" signal.

**Independent Test**: Can be fully tested by configuring a stop's thresholds and
checking that buses with different remaining minutes display the correct
urgency level, including boundary minutes exactly at a threshold.

**Acceptance Scenarios**:

1. **Given** a stop with configured thresholds, **When** a bus has many minutes
   remaining, **Then** it shows the relaxed level.
2. **Given** a stop with configured thresholds, **When** a bus crosses into the
   first threshold, **Then** it shows the "heads-up" level.
3. **Given** a stop with configured thresholds, **When** a bus crosses into the
   second threshold, **Then** it shows the "leave now" level.
4. **Given** a stop with configured thresholds, **When** a bus is within the
   missed threshold, **Then** it shows the "missed" level.
5. **Given** a bus whose remaining minutes exactly equal a threshold value,
   **Then** it is assigned a consistent, documented level (boundary is not
   ambiguous).
6. **Given** buses with no remaining minutes left, **Then** they are marked as
   missed, never as relaxed.

---

### Edge Cases

- Threshold values out of order (e.g. "missed" larger than "leave now"): the
  system rejects the configuration and asks the user to fix it.
- Zero or negative threshold values: rejected with a clear message.
- Two thresholds set to the same value: zones collapse and the bus is assigned
  to the stricter level, without error.
- A bus already at the stop (0 minutes remaining): shown as missed.
- No buses scheduled for a stop: no urgency levels are shown; the existing
  "no more buses" state is unchanged.
- Mixed live and scheduled buses: the urgency level is derived from the
  remaining minutes regardless of whether the time is live or scheduled.
- A configured stop with no explicit thresholds: the documented defaults are
  used.
- Realtime data goes stale: threshold math still uses the remaining-minutes
  value; staleness is already communicated by the existing realtime notice.
- The four dot hues must remain distinguishable from one another and from the
  existing Live/Schedule pills on the same row; the dot-only design relies on
  color, so hues are chosen for maximum mutual contrast.
- A stop is disabled or no longer exists: existing dashboard behavior is
  unchanged; thresholds are kept with the config.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST allow the user to configure, for each configured
  stop, three threshold values expressed in minutes before the bus arrives:
  the "heads-up" threshold, the "leave now" threshold, and the "missed"
  threshold.
- **FR-002**: Threshold values MUST be saved with the stop's configuration,
  persist across sessions, and remain editable at any later time.
- **FR-003**: The system MUST validate thresholds at save time: values MUST be
  non-negative, the "heads-up" value MUST be greater than or equal to the
  "leave now" value, which MUST be greater than or equal to the "missed" value,
  and invalid values MUST be rejected with a user-friendly message without
  saving.
- **FR-004**: The system MUST provide documented default thresholds for any
  configured stop that has no explicit values, so the feature works without
  mandatory configuration.
- **FR-005**: The system MUST display, for each upcoming bus at a stop, an
  urgency level derived from its remaining minutes and the stop's thresholds,
  using at least four distinct levels: relaxed, "heads-up", "leave now", and
  "missed".
- **FR-006**: Each bus row MUST show a small colored dot as the sole indicator
  of its urgency level — no text label — using four distinct hues: green for
  relaxed, amber for "heads-up", orange for "leave now", and dark slate/black
  for "missed".
- **FR-007**: Buses with no remaining minutes, or with remaining minutes at or
  below the "missed" threshold, MUST be shown as not catchable and MUST never
  be shown as relaxed.
- **FR-008**: The urgency level MUST be computed from the remaining-minutes
  value regardless of whether that value comes from live or scheduled data,
  and the existing realtime staleness notice MUST be unaffected.
- **FR-009**: Configuring or editing thresholds MUST NOT change the existing
  add/remove/enable/line-filter behavior of stops.
- **FR-010**: When a threshold is crossed as time passes, the displayed level
  MUST update to match on the dashboard's normal refresh, without requiring a
  manual reload. No notifications outside the dashboard are in scope.

### Key Entities *(include if feature involves data)*

- **Configured Stop**: The existing per-stop entry (stop, optional line filter,
  display order, enabled flag). This feature adds the stop's three departure
  threshold values to this entry.
- **Departure Thresholds**: Three minutes-before-arrival values per stop —
  the "heads-up" value, the "leave now" value, and the "missed" value. They
  define the boundaries between four urgency zones. Stops without explicit
  values use the documented defaults.
- **Upcoming Bus**: The existing bus row (line, headsign, remaining minutes,
  live/scheduled source, delay). Each upcoming bus is assigned one of four
  urgency levels derived from its remaining minutes and the stop's thresholds.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A user can set or change the three threshold values for a stop in
  under 1 minute and confirm they are saved and shown correctly on the next
  visit.
- **SC-002**: A user can tell, from a single glance at a bus row, which of the
  four urgency levels it has, solely from the colored dot — verified without
  clicking or hovering.
- **SC-003**: Every configured stop that has any upcoming buses shows the
  correct urgency level for each bus, with no incorrect "relaxed" label on a
  bus that is missed.
- **SC-004**: Threshold boundary minutes produce a deterministic, documented
  level (e.g. a bus exactly at the "leave now" minute shows that level, not a
  different one on refresh).
- **SC-005**: Invalid threshold values (negative, or out of order) are rejected
  with a clear message every time, with no partial saves.
- **SC-006**: 100% of configured stops without explicit thresholds render
  urgency levels using the documented defaults without error.

## Assumptions

- "Thresholds" are a set of **three** minutes-before-arrival values per stop,
  creating **four** urgency zones (relaxed → heads-up → leave now → missed).
  The user's phrase "two thresholds" is interpreted as the two warning levels
  described ("heads-up" and "leave now") alongside the separate "missed"
  level, all three configurable.
- Thresholds are expressed in **minutes before the bus arrives at the stop**
  (they represent a buffer/walk-time budget), not as wall-clock times. They
  are relative to the already-computed remaining-minutes value.
- A single set of three thresholds applies to **all** buses shown for a stop;
  thresholds are not configured per line or per direction.
- Default thresholds are 10 / 5 / 1 minutes respectively (heads-up / leave now
  / missed). These defaults are documented and the user can override them per
  stop.
- Urgency levels are shown **in-app on the dashboard only**; notifications
  outside the app are out of scope for this feature.
- The level names — "heads-up", "leave now", "missed" — were chosen with the
  user in place of the original "early-warning / late-warning / missed-bus"
  wording.
- Thresholds do not affect which buses are listed or filtered; they only
  change how the remaining minutes are presented.
- The urgency level is presented **on each bus row**; there is no separate
  stop-level summary or headline.
- The indicator is a **small colored dot only, with no text label**, in four
  hues: green (relaxed), amber (heads-up), orange (leave now), and dark
  slate/black (missed). Pure yellow is avoided in favor of amber for contrast
  on the white card; black for "missed" conveys "departed". Color-only
  encoding is an accepted tradeoff (color-blind differentiation is not a
  requirement).
- Time handling follows the project's existing rules: remaining minutes are
  computed centrally, and thresholds do not introduce new timezone/DST
  concerns.