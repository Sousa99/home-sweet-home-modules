# Contract — Stop Card Widget (`StopCard`)

**Date**: 2026-09-25

The public contract of the stop card widget, shared by the SPA, the Storybook
showcase, and the published `@sousa99/bus-catcher-components` package. This is
the interface the feature publishes and documents; implementation specifics
live in `tasks.md`.

## Component signature

```
StopCard(props: StopCardProps)
```

- A **self-fetching widget**: given a stop and a set of buses, it fetches and
  displays the waiting times itself (FR-010) — no caller-supplied times.
- Rendering is deterministic for a given set of props; the fetch lifecycle
  owns loading, error, and ready states.
- This is the **exposed component** — consumers receive the widget (which
  contains the stop list), not the inner list alone (FR-009).

## Props

| Prop | Type | Required | Default | Contract |
|------|------|----------|---------|----------|
| `stopId` | `string` | yes | — | The stop whose waiting times to display |
| `stopName` | `string` | yes | — | Stop display name shown in the card header |
| `lines` | `string[]` | no | `[]` | The set of buses (line short names) to show; empty = all lines; header badge when non-empty |
| `limit` | `number` | no | `5` | Max number of buses to list |
| `refetchIntervalMs` | `number` | no | `15000` | Poll interval in ms; `0` disables polling |
| `fetchTimes` | `FetchStopTimes` | no | built-in API client | Custom fetcher override (fixtures / different API); keep the reference stable |
| `missing` | `boolean` | no | `false` | Stop no longer exists; shows a notice and skips fetching |

## Fetcher contract

```
FetchStopTimes = (input: { stopId: string; limit: number; lines: string[] }) => Promise<StopTimesResponse>
```

- `StopTimesResponse = { stopId, times: Passing[], realtime: RealtimeInfo }`
  (see [data-model.md](../data-model.md) for the shapes).
- The built-in fetcher calls `GET /api/stops/:id/times?limit=…&line=…`.

## Behaviors

1. **Fetch lifecycle** (FR-010): on mount and when `stopId`/`lines`/`limit`
   change, the widget fetches; it shows `loading`, then `ready` (list +
   coverage) or `error`, and re-fetches every `refetchIntervalMs` while
   mounted. `missing: true` skips fetching entirely.
2. **Header**: renders `stopName` as the card title and, when `lines` is
   non-empty, a badge listing the filtered line short names.
3. **Body precedence** (`missing` > `loading` > `error` > list):
   - `missing` → "This stop no longer exists in the schedule — remove it in
     Config."
   - `loading` → "Loading…"
   - `error` → "Stop not found in the current schedule."
   - otherwise → the stop list (`times`) and, below it, the realtime coverage
     notice.
4. **Stop list** (inner `StopTimesList`): empty `times` renders "No more
   buses scheduled today."; each row renders the line badge, headsign, delay
   delta (when `delayMinutes` is set), arrival time, and exactly one pill.
5. **Live/scheduled attribution** (spec 002, preserved):
   - `source === 'live'` **and** `predictedAt` defined → arrival time is
     `predictedAt`, pill is **Live** (emerald).
   - otherwise → arrival time is `scheduledAt`, pill is **Schedule** (amber).
   - Every rendered row MUST show one of the two pills; never an unlabelled
     time.
6. **Coverage notice** (`StopCoverage`): no `realtime` → no notice;
   `available: false` → "Live times unavailable — showing schedule.";
   `liveCount: 0` → no notice; otherwise "Live times for N of M buses ·
   updated X".

## Rendered output (text content)

For a populated widget: `stopName` (title), optional line-filter badge, then
per row `lineShortName`, `headsign`, delay delta (`"+4 min"` / `"-2 min"` /
`"on time"` / empty), `HH:MM` arrival time (Europe/Lisbon), and `Live` /
`Schedule`; below the list, the coverage notice text when applicable.

## Storybook docs contract (this feature)

- `StopCard.stories.tsx` exposes exactly the six states as stories —
  `Default`, `ScheduleOnly`, `Empty`, `Loading`, `Error`, `Missing` — each
  with typed `args` and a static `fetchTimes` fixture (offline).
- `StopCard.mdx` renders, on one page, written documentation (purpose, props,
  states), a readable `<Controls>` props table, and an interactive `<Canvas>`
  for each story (FR-004, FR-005, SC-003).
- The showcased widget is the single shared implementation imported from
  `frontend/src/components/StopCard.tsx` — no duplicated copy (FR-002,
  SC-004).

## Package contract (FR-009, SC-006)

- `frontend/src/index.ts` re-exports `StopCard`, `StopCardProps`,
  `FetchStopTimes`, `Passing`, `RealtimeInfo`, and `StopTimesResponse`;
  `build:lib` bundles them into `dist-lib/` with the package's `exports` map
  (`types` → `dist-lib/index.d.ts`, `import` → `dist-lib/index.js`,
  `./styles.css` for the Tailwind styles).

## Favicon contract

- `frontend/index.html` references the favicon via
  `<link rel="icon" type="image/svg+xml" href="/favicon.svg" />` (FR-006).
- `frontend/public/favicon.svg` is a bus-front icon, ~1KB, self-contained
  (no scripts/external resources), with a 24×24 viewBox, explicit stroke
  colors readable in light and dark themes, and no animation (FR-007).