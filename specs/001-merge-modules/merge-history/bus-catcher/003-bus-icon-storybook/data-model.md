# Data Model — Bus Icon Favicon & Stop Card Widget Showcase (003)

**Date**: 2026-09-25

This feature adds no runtime data persistence and no new API. The data
surface is the **Stop Card Widget** — a self-fetching widget whose input
contract (`stopId` + `lines` → `StopTimesResponse`) drives the SPA, the
Storybook showcase, and the published package. This document describes that
contract and the widget's rendering states.

## Entities

### Stop Card Widget (`StopCard`)

- **What it represents**: A self-contained widget that displays the waiting
  times for a given stop and a set of buses. It fetches `StopTimesResponse`
  itself (polling on an interval), renders a header with the stop's name and
  an optional line-filter badge, and a body with the stop's bus rows plus a
  per-stop realtime coverage notice. It is consumed by the SPA dashboard,
  showcased in Storybook, and exported through the
  `@sousa99/bus-catcher-components` package (single shared implementation —
  FR-002, FR-009, FR-010).
- **Public contract** (props, `frontend/src/components/StopCard.tsx`):
  | Prop | Type | Required | Default | Rendered outcome |
  |------|------|----------|---------|------------------|
  | `stopId` | `string` | yes | — | The stop whose waiting times are fetched |
  | `stopName` | `string` | yes | — | Card title |
  | `lines` | `string[]` | no | `[]` | Bus (line short names) filter; badge when non-empty |
  | `limit` | `number` | no | `5` | Max buses listed |
  | `refetchIntervalMs` | `number` | no | `15000` | Poll interval; `0` disables |
  | `fetchTimes` | `FetchStopTimes` | no | built-in API client | Custom fetcher override |
  | `missing` | `boolean` | no | `false` | "Stop no longer exists" notice; skips fetching |
- **Fetch lifecycle** (FR-010): on mount (and when `stopId`/`lines`/`limit`
  change) the widget calls the fetcher and renders `loading`; on success it
  renders the list + coverage (`ready`); on failure it renders `error`; then
  it re-fetches every `refetchIntervalMs` while mounted. When `missing` is
  true it does not fetch.
- **State space** (FR-003):
  | State | Trigger | Rendered outcome |
  |-------|---------|------------------|
  | Default (mixed) | fetch returns live + scheduled rows | Each row shows line badge, headsign, delay delta, arrival time, and a `Live` or `Schedule` pill per row |
  | Schedule-only | fetch returns no live rows | All rows show the `Schedule` pill |
  | Empty | fetch returns `times: []` | "No more buses scheduled today." paragraph |
  | Loading | fetch in flight | "Loading…" placeholder |
  | Error | fetch rejected | "Stop not found in the current schedule." |
  | Missing | `missing: true` | "This stop no longer exists in the schedule…" notice |
- **Relationships**: depends on the private `StopTimesList` (the inner list),
  `StopCoverage` (the notice), the `Card` UI primitives, and the `FetchStopTimes`
  contract (defaulting to the API client). The inner list is a building block
  of the widget, not a separate published component.

### Passing (existing DTO — reused, not changed)

- **What it represents**: A single bus arrival at a stop: line, destination,
  scheduled time, and — when realtime is available — a live predicted time.
- **Fields** (from `frontend/src/api/types.ts`):
  | Field | Type | Notes |
  |-------|------|-------|
  | `tripId` | `string \| undefined` | optional |
  | `lineId` | `string` | required |
  | `lineShortName` | `string` | required; rendered in the badge |
  | `headsign` | `string` | required; destination text |
  | `directionId` | `number \| null \| undefined` | optional |
  | `scheduledAt` | `string` | required ISO-8601 UTC instant |
  | `minutesUntil` | `number` | required |
  | `source` | `'live' \| 'scheduled' \| undefined` | optional; `'live'` enables the Live pill |
  | `predictedAt` | `string \| undefined` | required when `source: 'live'` |
  | `delayMinutes` | `number \| null \| undefined` | optional; rendered as delay delta |
- **Validation rules** (existing behavior, preserved):
  - Row is "live" only when `source === 'live'` **and** `predictedAt` is
    defined (`StopTimesList.tsx:14`).
  - A live row renders `predictedAt` as its arrival time; otherwise
    `scheduledAt` (displayed via `formatScheduledTime`, Europe/Lisbon).
  - `delayMinutes` renders via `formatDelay` (`null`/`undefined` → blank
    space, no broken layout).

### Realtime Info (`RealtimeInfo`)

- **What it represents**: Per-stop realtime coverage, driving the coverage
  notice inside the card.
- **Fields** (from `frontend/src/api/types.ts`): `available: boolean`,
  `lastUpdate: string | null`, `liveCount: number`, `totalCount: number`.
- **Behavior** (existing, preserved in `StopCoverage`): no `realtime` → no
  notice; `available: false` → "Live times unavailable — showing schedule.";
  `liveCount: 0` → no notice; otherwise live coverage + freshness.
- **Relationships**: fixture shapes in Storybook stories and the existing
  tests use identical objects so the showcase and tests stay in sync.

## Storybook deliverables contract (data authored, not runtime)

- `StopCard.stories.tsx`: six stories — `Default` (mixed), `ScheduleOnly`,
  `Empty`, `Loading`, `Error`, and `Missing` — one per state above.
- `StopCard.mdx`: `<Meta>` bound to the CSF module, a `<Canvas>` per story,
  and a `<Controls>` props table, with prose covering purpose, props, and
  states (FR-004, FR-005).
- The showcase runs offline: each story supplies a static `fetchTimes`
  fixture (FR-001).

## Package export contract (FR-009)

- `frontend/src/index.ts` is the package entry, exported through
  `build:lib`: it re-exports `StopCard` (value), and `StopCardProps`,
  `FetchStopTimes`, `Passing`, `RealtimeInfo`, and `StopTimesResponse`
  (types). The bundled `dist-lib/index.d.ts` and `dist-lib/index.js` are what
  consumers import as `@sousa99/bus-catcher-components`.