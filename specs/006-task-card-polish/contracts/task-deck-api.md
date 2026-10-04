# Contract: Published Task Deck API

**Feature**: `006-task-card-polish` | **Date**: 2026-10-04

This feature's only external interface is the **published React component API** of the
procrastinator-tracker components package. All changes are **additive**: no existing prop or export
is removed or renamed (SC-004). Defaults reproduce current behavior exactly.

## Package surface (`src/index.ts`)

Current exports (unchanged):
`TaskDeck`, `TaskDeckCard`, `TaskDeckWrapper`, types `TaskDeckProps`, `TaskDeckWrapperProps`, and
the `Task`/`TaskFilters`/etc. API types.

**Additive**: `TaskDeckEmpty` (component) — the shared empty-state card. Exporting it lets consumers
restyle or replace empty-state messaging.

## `TaskDeckProps` (changes)

| Prop | Type | Required | Default | Change |
|------|------|----------|---------|--------|
| `transitionVariant` | `'slide' \| 'slide-up'` | no | `'slide'` | **NEW.** `slide` = today's wide pan (exit x 500); `slide-up` = vertical exit (48px up, no sideways travel). |
| `style` | `CSSProperties` | no | — | **NEW passthrough.** Forwarded to the stage; used to override the compact `--deck-height` (e.g. `{ '--deck-height': '24rem' }`). |

All existing props (`tasks`, `filters`, `autoRotateMs`, `loop`, `stackSize`, `slideDurationMs`,
`renderCard`, `onCardChange`, `className`) keep their current signatures and defaults.

**New render contract**: when the visible task set is empty, `TaskDeck` renders `TaskDeckEmpty`
(with the compact stage height preserved) instead of `null`. `data-testid="task-deck-card"` on
stacked cards and `data-testid="task-deck-empty"` on the empty card.

## `TaskDeckWrapperProps` (changes)

| Prop | Type | Required | Default | Change |
|------|------|----------|---------|--------|
| `transitionVariant` | `'slide' \| 'slide-up'` | no | `'slide'` | **NEW.** Forwarded to the inner `TaskDeck`. |
| `style` | `CSSProperties` | no | — | **NEW passthrough.** Forwarded to the root container. |

All existing props (`filters`, `refreshRateMs`, `baseUrl`, `dataSource`, `autoRotateMs`, `loop`,
`stackSize`, `slideDurationMs`, `renderCard`, `onCardChange`, `className`) unchanged.

**Render contract change**: the empty case (`tasks.length === 0` after a successful load) renders
`TaskDeckEmpty` instead of the bare `<p>`. Message text is preserved (`No tasks yet.` /
`No tasks match these filters.`) so the existing wrapper test (`/No tasks yet/i`) still passes.

## `DeckCardsProps` (raw deck, internal)

| Prop | Type | Required | Default | Change |
|------|------|----------|---------|--------|
| `exitPreset` | `{ x: number; y: number }` | no | `{ x: 500, y: 0 }` | **NEW.** Exit vector of the top card during `indexChangeDirection`/auto-advance exits. `slide` → `{ x: 500, y: 0 }` (reproduces today's ±500px pan); `slide-up` → `{ x: 0, y: -48 }` (vertical exit). Not part of the published surface (not exported from `src/index.ts`). |

## Behavior guarantees

- **Default is unchanged** (SC-004): `transitionVariant='slide'` and `exitPreset={x:500,y:0}` reproduce the
  current ±500px pan, 500ms duration, rotation, stack depth, and swipe threshold.
- **Slide-up variant** (FR-004): the exiting card rises 48px vertically and fades with **no** sideways
  travel; duration, easing, rotation, stack behavior, loop, and auto-rotate are identical.
- **Swipe always works** (FR-004): manual drag-dismiss left/right is untouched in both variants.
- **Empty state** (FR-001/FR-002/FR-008): a visible card with a friendly message renders at both
  published levels whenever no tasks are displayable; it does not collapse the stage height and
  disappears as soon as a task matches again.
- **Compact size** (FR-006/FR-007): default stage height is `16rem` (`--deck-height`), overridable
  through the existing style surface; longer descriptions stay truncated (`line-clamp`), never
  growing the card.

## Accessibility contract

- The empty card is a readable message (no interactive element needed); it must not trap focus.
- Nothing in this feature removes the existing status bar's live regions, the `Refresh` button, or
  the `alert` on failure (inherited from `005`).

## Validation

- `tests/task-deck.test.tsx`: empty state (empty array + fully filtered) renders the empty card and
  not `null`; the slide-up variant resolves the vertical exit preset `{ x: 0, y: -48 }`; compact stage
  carries `--deck-height: 16rem`; an override style is honored; all existing tests still pass (defaults unchanged).
- `tests/task-deck-wrapper.test.tsx`: empty case renders `TaskDeckEmpty` with preserved message;
  `transitionVariant` is forwarded to the inner deck; existing status-bar/refresh tests still pass.
- Storybook stories document `Empty`, `Slide-up transition`, and `Compact + override` (see
  `quickstart.md`).