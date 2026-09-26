# Feature Specification: Live ETA

**Feature Branch**: `002-live-eta`

**Created**: 2026-09-25

**Status**: Draft

**Input**: User description: "i want to have live eta functionality on this application. I know sometimes we might not have live eta, i want this difference to be visible."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - See live predicted arrival times (Priority: P1)

As a user, I open the dashboard and, for each configured stop, I see the next
buses with their arrival time. Where the network provides live predictions,
the shown time is the live predicted arrival and is marked "Live"; where it
does not, the shown time is the scheduled time and is marked "Schedule".

**Why this priority**: This is the core value of the feature — live ETA when
it exists, with an honest label so I never mistake a schedule for a live
prediction.

**Independent Test**: Can be fully tested by opening the dashboard during
normal service and confirming that, for a stop with realtime coverage, each
listed bus shows either a "Live" prediction or a "Schedule" time.

**Acceptance Scenarios**:

1. **Given** a configured stop with realtime coverage, **When** I open the
   dashboard, **Then** each listed bus shows an arrival time labelled either
   "Live" (predicted) or "Schedule" (timetable), never an unlabelled time.
2. **Given** a bus with a live prediction, **When** I view its row, **Then**
   the arrival time shown is the live predicted time, not the scheduled one.
3. **Given** a bus without a live prediction, **When** I view its row, **Then**
   the arrival time shown is the scheduled time and it is clearly marked as
   such.

---

### User Story 2 - Know when live times are unavailable (Priority: P1)

As a user, I can tell at a glance when a stop is showing schedule-only
times — because realtime data is missing, stale, or the feed is down — and I
can still see the scheduled times without the dashboard failing.

**Why this priority**: The user explicitly expects live ETA to be unavailable
sometimes; making that state visible is the point of the feature. It depends
on the display from User Story 1 and delivers trust on its own.

**Independent Test**: Can be fully tested by viewing a stop while realtime
coverage is absent or stale and confirming the stop shows a clear
"live unavailable" notice alongside its scheduled times.

**Acceptance Scenarios**:

1. **Given** a stop with no realtime coverage, **When** I view it, **Then** I
   see a per-stop notice that live times are unavailable and all rows are
   marked "Schedule".
2. **Given** realtime data that is stale (older than the staleness budget),
   **When** the dashboard renders, **Then** those predictions are not shown as
   live; they are demoted to schedule or dropped, and the stop signals the
   situation.
3. **Given** the realtime feed is down entirely, **When** I open the
   dashboard, **Then** every stop still shows scheduled times with a visible
   notice, and no stop shows an error.

---

### User Story 3 - See how live times differ from the schedule (Priority: P2)

As a user, when a live prediction deviates from the timetable, I can see how
late (or early) the bus is, so I can decide when to leave.

**Why this priority**: Prediction value comes from knowing the deviation; it
builds on User Story 1 but is independently demonstrable.

**Independent Test**: Can be fully tested by finding a live bus that runs late
and confirming its row shows the deviation next to the live time.

**Acceptance Scenarios**:

1. **Given** a live prediction later than the scheduled time, **When** I view
   its row, **Then** the deviation is shown (e.g. "+4 min").
2. **Given** a live prediction earlier than the scheduled time, **When** I
   view its row, **Then** the deviation is shown (e.g. "-2 min").
3. **Given** a live prediction matching the schedule, **When** I view its row,
   **Then** it is shown as on time without a misleading delta.

---

### User Story 4 - See live freshness and coverage (Priority: P3)

As a user, I can see when the realtime feed was last updated and how much of
a stop's listed buses are covered by live predictions, so I can gauge how
current and complete the data is.

**Why this priority**: Trust and transparency; it is the least frequently
needed flow but completes the freshness story (constitution principle II).

**Independent Test**: Can be fully tested by opening a stop with partial
coverage and confirming the coverage and last-update indicators match reality.

**Acceptance Scenarios**:

1. **Given** a stop with a mix of live and scheduled rows, **When** I view it,
   **Then** I can see how many of the listed buses are live and when the
   realtime data was last updated.
2. **Given** realtime data is present, **When** I view the dashboard, **Then**
   the age of the live data (when it was last fetched/updated) is visible.

---

### Edge Cases

- Partial coverage: a single stop lists some buses with live predictions and
  others with scheduled times; each row is labelled independently.
- Realtime feed unavailable at query time: the stop degrades to schedule-only
  with a visible notice, never an error.
- Realtime feed goes down mid-session: rows transition from "Live" to
  "Schedule" on the next refresh without breaking the dashboard.
- Realtime data stale (older than the staleness budget): predictions are
  demoted and never presented as live.
- A realtime prediction references a trip that has no matching schedule row:
  the prediction is skipped (with a warning log), never rendered as a phantom
  bus.
- A stop with no service or no more buses today: existing "no service / no
  more buses" states still apply, with no misleading live indicator.
- Delay deltas and countdowns respect the local timezone (Europe/Lisbon),
  including daylight-saving transitions and service that crosses midnight.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST provide live predicted arrival times for buses at a
  stop using realtime transit data, wherever such data is available for that
  stop/line/trip.
- **FR-002**: Each listed bus time MUST be attributed as either a live
  prediction or a scheduled time; the attribute MUST be visible to the user.
- **FR-003**: When a live prediction is unavailable for a specific bus, the
  system MUST fall back to the scheduled time and label it as scheduled.
- **FR-004**: When realtime data is unavailable for an entire stop — no
  coverage, feed down, or stale — the system MUST show a per-stop notice and
  present the stop's times as schedule-only.
- **FR-005**: Live predictions MUST carry a freshness timestamp; predictions
  older than a defined staleness budget MUST NOT be presented as live.
- **FR-006**: When a live prediction differs from the scheduled time, the
  system MUST surface the deviation to the user.
- **FR-007**: The dashboard MUST remain fully functional in schedule-only mode
  when realtime data is entirely unavailable.
- **FR-008**: Realtime data MUST be reached through the existing provider
  abstraction so adding or changing a realtime source does not change the
  application-facing contract.
- **FR-009**: The dashboard MUST refresh live predictions on a regular
  interval so displayed ETAs stay current while the feed is live.
- **FR-010**: System MUST expose the freshness of the realtime feed and the
  live coverage of a stop's listed buses.

### Key Entities *(include if feature involves data)*

- **Live Prediction**: A realtime predicted arrival of a trip at a stop. Key
  attributes: line, trip reference, stop, predicted arrival time, time the
  prediction was fetched, delay relative to schedule, source.
- **Passing (evolved)**: The existing scheduled passing-time DTO gains live
  attributes — prediction source (`live`/`scheduled`), predicted arrival time,
  and delay minutes — while remaining backward-compatible with consumers that
  only read the scheduled time.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: At least 90% of buses at stops with realtime coverage display a
  live prediction (rather than a schedule-only row) while the feed is live.
- **SC-002**: A user can tell whether each listed bus time is live or
  scheduled within 2 seconds of viewing the dashboard.
- **SC-003**: When realtime data is stale or the feed is down, the dashboard
  shows schedule-only times with a visible notice and no error — verifiable
  at any time, including during an outage.
- **SC-004**: Live predictions shown on the dashboard are no older than the
  refresh interval plus one fetch cycle relative to the source update.
- **SC-005**: Users viewing a live bus can identify its deviation from the
  schedule (on time / early / late) without opening any extra view.

## Assumptions

- The realtime source is the Carris Metropolitana realtime feed, matching the
  existing schedule provider so trip/stop matching is consistent; exact
  endpoints, coverage, and update frequency are confirmed during planning.
- Live ETA coverage is partial by nature: some stops, lines, or times will
  have no live prediction, and the feature explicitly embraces schedule
  fallback.
- The backend is the single poller and cache of realtime data; the SPA
  refreshes via its existing polling pattern (no push/SSE in this feature).
- The default realtime refresh interval is on the order of 15 seconds, with
  the dashboard continuing its current refresh cadence.
- Staleness budget follows the existing schedule-freshness approach; a
  specific budget value is set during planning.
- Single home user, no accounts; the realtime data is treated as non-PII
  (no user locations collected).
- Realtime provider availability must never break the REST/MCP service layer
  (degraded results are reported, not fatal).