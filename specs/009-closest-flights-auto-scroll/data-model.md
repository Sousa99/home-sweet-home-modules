# Data Model: Slow Auto-Scroll for the Closest-Flights List

**Feature**: `009-closest-flights-auto-scroll` | **Date**: 2026-10-04

The feature introduces **no persistence** and no backend data changes. The "entities" below are the
runtime **render/behavior invariants** of the published `FlyOverClosestPanel` widget — the list
surface the animation is attached to and the animation behavior itself. The public UI behavior
contract is defined in [`contracts/closest-list-auto-scroll.md`](./contracts/closest-list-auto-scroll.md).

## Entity: ClosestList

The scrollable list region of `FlyOverClosestPanel` — the `maxResults`-capped list of aircraft that
follow the closest tile. This is the only surface the animation acts on (see `research.md` R5).

| Field | Type | Value / Rules |
|-------|------|---------------|
| `container` | element | A `<div>` with `overflow-y-auto` — the scroll container the hook's `ref` attaches to. |
| `content` | ordered list | The remaining aircraft after the closest tile, closest-first, capped at `maxResults` (unchanged from today, FR-007). |
| `overflow` | boolean | `scrollHeight > clientHeight`. When `false`, the container MUST stay static (FR-008). |
| `scrollPosition` | px | `scrollTop`, managed by the animation loop (0 → `scrollHeight - clientHeight`). |

**Rules**: The container's content, ordering, and refresh behavior are unchanged (FR-007). The
auto-scroll only runs while `overflow` is true (FR-008). Empty, loading, and error renders never
attach to a scrolling list (FR-009).

## Entity: AutoScrollBehavior

The vertical, slow, looping auto-scroll — the behavior borrowed from the weather day + hour strip.

| Field | Type | Value / Rules |
|-------|------|---------------|
| `axis` | `'vertical'` | Advances `scrollTop` (the list's natural direction), per spec Assumptions. |
| `speedPxPerSecond` | number | Default `25` px/s — **slower** than the weather strip's `45` px/s (FR-002, `research.md` R2). |
| `resetPauseMs` | number | Default `2000` ms hold at the end before snapping back to the top (FR-003, R2). |
| `loop` | behavior | `advance → hold at end (resetPauseMs) → snap to top → advance` — continuous while visible and overflowing (FR-003). |
| `hoverPaused` | boolean | `true` while the pointer is over the container (position held); `false` resumes advancing (FR-006, R3). |
| `reducedMotion` | boolean | When `true`: never start, and stop immediately if toggled mid-scroll (FR-005, R4). |

**State transition**: The loop only runs in one condition — `overflow && !reducedMotion && !hoverPaused`
(and the element is mounted). Any of those flipping off halts advancement immediately; the position
is simply held, never torn down while mounted.

## Unchanged entities

- `FlyOverClosestPanelProps` (incl. `location`, `autoRefresh`, `baseUrl`, `maxResults`, `className`)
  — unchanged; no prop added, removed, or renamed.
- The closest-aircraft tile, `AircraftCard`, `AircraftMapCard`, the status bar wiring, the
  `useFlyOversQuery` hook, the API client, and `selectClosest` — untouched.
- `ClosestAircraftCard`, `FlyOverList`, `FlyOverMap`, and the backend/MCP are out of scope (spec
  Assumptions; `research.md` R5).