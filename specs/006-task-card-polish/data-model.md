# Data Model: Task Card Polish

**Feature**: `006-task-card-polish` | **Date**: 2026-10-04

The feature introduces **no persistence** and no backend data changes. The "entities" below are
the runtime view-state and public props that govern the published task deck's presentation. The
public component contracts are defined in [`contracts/task-deck-api.md`](./contracts/task-deck-api.md).

## Entity: DeckViewState

The set of tasks the deck actually displays. It is derived at render time by applying the active
filters and ordering to the supplied tasks.

| Field | Type | Rules |
|-------|------|-------|
| `visible` | Task[] | `tasks` filtered by `filters` (status/tag/assignee/urgency/location/finished/recurring), ordered by urgency descending with unset urgency last. |
| `isEmpty` | boolean | `visible.length === 0`. When true, the deck renders the empty card (`TaskDeckEmpty`) instead of `null` or the stack (FR-001). |
| `hasActiveFilters` | boolean | Whether the caller supplied at least one filter value. Drives the empty message: `No tasks match these filters.` vs `No tasks yet.` (FR-002). |

**Transition**: `visible` changes whenever `tasks` or `filters` change. `isEmpty` flips
`false → true` when the last matching task disappears (filters tightened or tasks removed) and
`true → false` when any task matches again; the empty card must appear/disappear without collapsing
the stage height (it fills the same compact `--deck-height`).

## Entity: TransitionConfig

Controls how the top card exits during an automatic advance or index change.

| Field | Type | Default | Rules |
|-------|------|---------|-------|
| `transitionVariant` | `'slide' \| 'gentle'` | `'slide'` | Published-level switch. `gentle` selects a small exit travel. |
| `exitTravel` | number (px) | `500` | Raw-deck-level travel distance for the exiting card. `gentle` → `80`. Only horizontal travel of the exiting card changes; duration (`slideDurationMs`, default 500ms), easing, rotation, stack scale/depth, and swipe threshold are unchanged (FR-004). |

**Mapping** (single source of truth, unit-tested): `slide → 500`, `gentle → 80`.

## Entity: DeckStageSize

The vertical extent of the deck stage, which the cards fill (`h-full`).

| Field | Type | Default | Rules |
|-------|------|---------|-------|
| `--deck-height` | CSS length | `16rem` | Set as a CSS custom property on the stage element. Consumers override it through the existing `style`/`className` surface (e.g. `style={{ '--deck-height': '24rem' }}` or a Tailwind arbitrary-property class) — no sizing prop (Assumptions). `style` is forwarded additively through `TaskDeck`/`TaskDeckWrapper`. |

## Entity: EmptyStateView

The card shown when `isEmpty` is true.

| Field | Type | Rules |
|-------|------|-------|
| `message` | string | `No tasks yet.` when `hasActiveFilters` is false, else `No tasks match these filters.` (existing wrapper wording preserved for test compat). |
| `testId` | string | `task-deck-empty` — used by tests to locate the empty card. |

## Unchanged entities

- `Task`, `TaskFilters` (API types), `WidgetStatusBar`/`LoadState` (from `005`), the card stack
  (`DeckCards`/`DeckItem`), and `DashboardPage` are untouched by this feature.
- The `DeckEmpty` primitive in `ui/deck/deck.tsx` remains unused (pre-existing dead code, out of scope).