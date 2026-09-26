# Contract — Urgency Levels & Dot Hues (004)

**Date**: 2026-09-25

Single source of truth for the four urgency levels, their derivation, and
their visual encoding. Shared between the SPA dashboard and the published
`StopCard` widget via `frontend/src/lib/urgency.ts`.

## Level

```ts
type UrgencyLevel = 'relaxed' | 'heads-up' | 'leave-now' | 'missed';
```

## Derivation

Strictest-first, **at-or-below** (`<=`) semantics. `minutesUntil` is the
existing per-bus value; thresholds are the stop's resolved values.

```ts
function urgencyLevel(minutesUntil: number, t: DepartureThresholds): UrgencyLevel
```

| Order | Condition | Level |
|-------|-----------|-------|
| 1 | `minutesUntil <= t.missedMinutes` | `missed` |
| 2 | `minutesUntil <= t.leaveNowMinutes` | `leave-now` |
| 3 | `minutesUntil <= t.headsUpMinutes` | `heads-up` |
| 4 | otherwise | `relaxed` |

- Deterministic boundaries: a bus exactly at a threshold minutes value gets
  the stricter level (e.g. `minutesUntil == 5`, `leaveNow == 5` → `leave-now`).
- A `minutesUntil <= 0` bus is always `missed`, never `relaxed`.
- Applies identically to live and scheduled rows.

## Dot hue (Tailwind)

| Level | Hue | Rationale |
|-------|-----|-----------|
| `relaxed` | `bg-green-500` | calm / plenty of time |
| `heads-up` | `bg-amber-500` | caution — start thinking about leaving (amber, not pure yellow, for white-card contrast) |
| `leave-now` | `bg-orange-500` | urgent — should have left |
| `missed` | `bg-slate-900` | departed — dark slate reads as "finished", distinct from warm levels |

- Rendering: `h-2 w-2 rounded-full`, inline at the start of the bus row.
- No text label (user decision); the dot is the sole indicator.
- Must remain visually distinct from the existing Live (`emerald-100`) and
  Schedule (`amber-100`) light-tint pills on the same row.