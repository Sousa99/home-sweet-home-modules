# Quickstart — Per-Stop Departure Alert Thresholds (004)

**Date**: 2026-09-25

Runnable validation guide proving the feature works end-to-end. Details live
in [data-model.md](data-model.md) and [contracts/](contracts/); this file is a
run guide only.

## Prerequisites

- Node 24, pnpm 11 (`pnpm install` at repo root).
- A schedule already ingested (`pnpm --filter ./backend ingest`) and the
  backend running (`pnpm dev`), per the 001 quickstart.

## 1. Configure thresholds via the API

```bash
# Add a stop with explicit thresholds
curl -s -X POST localhost:3000/api/config/stops \
  -H 'content-type: application/json' \
  -d '{"stopId":"<id>","thresholds":{"headsUpMinutes":12,"leaveNowMinutes":6,"missedMinutes":2}}'

# Update just the missed threshold (partial) — others keep stored values
curl -s -X PUT localhost:3000/api/config/stops/<configId> \
  -H 'content-type: application/json' \
  -d '{"thresholds":{"missedMinutes":3}}'

# Read back — thresholds always resolved (never null)
curl -s localhost:3000/api/config
```

- **Expected** (`contracts/rest-api.md`): responses include
  `thresholds: { headsUpMinutes, leaveNowMinutes, missedMinutes }` with the
  requested values; a stop added without thresholds returns 10 / 5 / 1.

**Validation failures** (`contracts/rest-api.md`):

```bash
curl -s -X POST localhost:3000/api/config/stops \
  -H 'content-type: application/json' \
  -d '{"stopId":"<id>","thresholds":{"headsUpMinutes":3,"leaveNowMinutes":6,"missedMinutes":2}}'
# → 400 invalid_body (heads-up must be >= leave-now)

curl -s -X PUT localhost:3000/api/config/stops/<configId> \
  -H 'content-type: application/json' \
  -d '{"thresholds":{"missedMinutes":-1}}'
# → 400 invalid_body (negative)
```

## 2. See the dots on the dashboard

1. Open the SPA (`pnpm dev:web`), Config tab, edit a stop and set thresholds
   (e.g. heads-up 10, leave-now 5, missed 1), save.
2. Open the Dashboard tab for that stop and observe each upcoming bus row.

- **Expected** (`contracts/urgency-levels.md`): a small colored dot at the
  start of each row — green (plenty of time), amber (heads-up), orange (leave
  now), dark slate (missed). No text label. A bus with 0 minutes left shows
  dark slate, never green. A bus exactly at the leave-now minute shows orange.
- Watch ~1 min without reloading: as minutes tick down, a row crossing a
  threshold changes its dot on the normal refresh (no manual reload).
- Mixed live/scheduled rows show dots identically.

## 3. Storybook (published component)

```bash
pnpm storybook
```

- Open the StopCard docs page: the `thresholds` prop appears in the controls
  table; the new variants show all four levels — `Relaxed`, `HeadsUp`,
  `LeaveNow`, `Missed` (incl. a `minutesUntil: 0` row), and `CustomThresholds`
  — while the existing state stories (ScheduleOnly, Empty, Loading, Error,
  Missing) still render under default thresholds.
- The published library ships the same logic (single shared implementation):
  `pnpm --filter ./frontend build:lib` succeeds and the built output exposes
  `StopCard` with the `thresholds` prop plus the `DepartureThresholds` /
  `UrgencyLevel` types (check `dist-lib` type declarations).

## 4. Gates

```bash
pnpm lint && pnpm format && pnpm test && pnpm typecheck
node scripts/scaffold.mjs --check
```

All must pass before merge. Vitest covers: threshold validation (ordering,
negative, partial update vs stored values), defaults resolution on read,
urgency-level boundary cases, and dot rendering in `StopTimesList`/
`ConfigPanel`.

## Smoke checklist

- [ ] `POST /api/config/stops` with `thresholds` persists and round-trips
- [ ] Stop without thresholds returns resolved defaults (10 / 5 / 1)
- [ ] Partial `PUT` on one threshold field keeps stored values and validates
- [ ] Out-of-order / negative thresholds rejected with `400 invalid_body`
- [ ] Dashboard rows show the four dots per `urgency-levels.md` boundary rules
- [ ] Dot changes on refresh as a threshold is crossed (no reload needed)
- [ ] Config edit form shows and saves thresholds; existing add/remove/enable/
      line-filter behavior unchanged
- [ ] Storybook documents the `thresholds` prop with all-level variants
- [ ] `pnpm --filter ./frontend build:lib` publishes the same logic and the
      `DepartureThresholds` / `UrgencyLevel` types
- [ ] All quality gates pass