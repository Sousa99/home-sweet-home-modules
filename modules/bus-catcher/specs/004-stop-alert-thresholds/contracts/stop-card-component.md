# Component Contract — StopCard thresholds prop (004)

**Date**: 2026-09-25

The published widget `@sousa99/bus-catcher-components` exports `StopCard` (and
the `Passing`/`StopTimesResponse` types). This feature adds one optional prop,
and the package's public type surface MUST also export `DepartureThresholds`
and `UrgencyLevel` from `frontend/src/index.ts` so consumers can type the prop
and handle the derived levels.

## `thresholds?: DepartureThresholds`

```ts
interface DepartureThresholds {
  headsUpMinutes: number;
  leaveNowMinutes: number;
  missedMinutes: number;
}
```

- **Optional** — when omitted (or the individual fields are), the widget
  applies the documented defaults: `headsUp 10`, `leaveNow 5`, `missed 1`.
- **Contract**: the three values MUST be non-negative and ordered
  `headsUpMinutes >= leaveNowMinutes >= missedMinutes`. Invalid values are the
  consumer's responsibility; the widget does not re-validate but MUST NOT
  crash — it clamps to the documented default ordering (undefined behavior
  only on ordering, which consumers must guarantee).
- **Effect**: the widget derives each bus row's urgency level from
  `minutesUntil` using the shared `urgency.ts` module (see
  `urgency-levels.md`) and renders a small colored dot (no text label).

## Derivation and rendering

- Level and dot hue come from the shared pure module
  `frontend/src/lib/urgency.ts` — the SPA and the published widget call the
  same code, so they can never diverge (single shared implementation).
- The dot is `h-2 w-2 rounded-full` rendered at the start of each row, left of
  the line badge. Hues: green `relaxed`, amber `heads-up`, orange `leave-now`,
  dark slate `missed`.
- The existing props (`stopId`, `stopName`, `lines`, `limit`,
  `refetchIntervalMs`, `fetchTimes`, `missing`) are unchanged; thresholds are
  presentation-only and do not affect fetching or filtering.

## Storybook

`StopCard.stories.tsx` / `StopCard.mdx` MUST be updated so the widget is
demonstrable with the new prop:

- Add a `thresholds` control to the props/controls table (documented in the
  MDX alongside the level semantics from `urgency-levels.md`).
- Add threshold-driven story variants using fixtures whose `minutesUntil`
  values land in each zone, e.g. with default thresholds (10 / 5 / 1):
  - `Relaxed` — a bus at `minutesUntil: 25`
  - `HeadsUp` — a bus at `minutesUntil: 10` (boundary → heads-up)
  - `LeaveNow` — a bus at `minutesUntil: 5` (boundary → leave-now)
  - `Missed` — a bus at `minutesUntil: 1` (boundary → missed) plus a
    `minutesUntil: 0` row (never relaxed)
  - `CustomThresholds` — a mixed list under a non-default `thresholds` prop
- Keep the existing stories (Default, ScheduleOnly, Empty, Loading, Error,
  Missing) working — they render under the default-thresholds behavior.