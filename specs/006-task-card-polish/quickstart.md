# Quickstart: Validating the Task Card Polish

**Feature**: `006-task-card-polish` | **Date**: 2026-10-04

This guide proves the feature works end-to-end. It is a validation/run guide — full
implementation lives in `tasks.md` and the implementation phase.

## Prerequisites

- pnpm 11 + Node 24, repo installed (`pnpm install`).
- The procrastinator-tracker frontend package exists as described in [`plan.md`](./plan.md), with
  tests written first (red → green).

## What is validated

| # | Scenario | Proves |
|---|----------|--------|
| 1 | Deck component tests pass | Empty state at the deck level, gentle-variant travel, compact `--deck-height` + override ([`contracts/task-deck-api.md`](./contracts/task-deck-api.md)) |
| 2 | Wrapper component tests pass | Empty state at the wrapper level (message preserved), `transitionVariant` passthrough |
| 3 | Manual Storybook check | Empty card, gentle transition, and compact/override look correct in a widget row |
| 4 | Manual SPA check | Empty state appears when the household has no tasks and recovers when tasks appear |
| 5 | Default-unchanged check | Existing consumers see today's wide pan, today's size overrides, and today's exports |

## Commands

### 1. Component tests — deck level

```bash
pnpm --filter @sousa99/procrastinator-tracker-components test
pnpm --filter @sousa99/procrastinator-tracker-components typecheck
```

**Expected**: `tests/task-deck.test.tsx` passes including the new cases — empty array and a
fully-filtered-out set both render `TaskDeckEmpty` (`data-testid="task-deck-empty"`, message
`No tasks yet.` / `No tasks match these filters.`), the gentle variant resolves to the reduced
travel (80px vs the default 500px), the stage carries `--deck-height: 16rem`, and a
`style={{ '--deck-height': '24rem' }}` override is honored. All pre-existing deck tests still pass
(wide pan remains the default).

### 2. Component tests — wrapper level

Same command (`tests/task-deck-wrapper.test.tsx`): the empty case renders `TaskDeckEmpty` with the
preserved `/No tasks yet/i` message, and `transitionVariant` is forwarded to the inner deck. All
existing status-bar/refresh/error tests still pass (they use defaults → `slide`).

### 3. Storybook visual check

```bash
pnpm --filter ./modules/procrastinator-tracker/frontend storybook   # :6006
```

Open `Task/TaskDeck` and `Task/TaskDeck (self-fetching)`:

- **Empty**: a card-styled empty state with an icon + message fills the compact stage (not blank).
- **Gentle transition**: with `transitionVariant="gentle"`, advancing cards slide mostly in place
  with far less sideways travel than the default `slide` story; manual swipes still dismiss
  left/right.
- **Compact + override**: default deck is noticeably shorter than the pre-change 24–26rem; a story
  passing `style={{ '--deck-height': '24rem' }}` shows a larger card.

### 4. SPA end-to-end

```bash
pnpm --filter ./modules/procrastinator-tracker/backend dev          # REST on :3000
pnpm --filter ./modules/procrastinator-tracker/frontend dev         # SPA on :5173
```

Create no tasks (or filter to none): the dashboard widget shows the empty card, not blank space.
Add a task: the deck reappears. Place two widgets side by side (e.g. two decks): the compact default
fits the row and the gentle variant is calmer next to other widgets.

### 5. Default-unchanged check (SC-004)

```bash
pnpm --filter ./modules/procrastinator-tracker/frontend build:lib
```

Inspect `dist-lib/index.d.ts`: `TaskDeck`, `TaskDeckCard`, `TaskDeckWrapper` and their existing
props are intact; `TaskDeckEmpty` and the new props are additive. No export was removed or renamed.

## Gate run (before any PR)

```bash
pnpm lint && pnpm format && pnpm typecheck && pnpm test
```

**Expected**: all four gates green across the workspace, including the procrastinator-tracker
frontend package.