# Research: Status Bar Placement Outside the Card

**Feature**: `008-status-bar-placement` | **Date**: 2026-10-04

The feature spec (008) introduced no `NEEDS CLARIFICATION` markers; the scope and meaning
("status bar above and outside the card, bus-catcher only, behavior unchanged") are explicit.
The research below resolves the design questions that remained: how to group the bar with its card,
how to lock the placement in tests, and how the change interacts with spec 005's status-bar contract.

## R1 — How to group the status bar with its card

- **Decision**: Wrap the widget in a single root `<div>` (Tailwind `space-y-2`) whose first child is
  `WidgetStatusBar` and second child is the `Card`. Add `data-testid="stop-card-widget"` to the root.
- **Rationale**: A single group root keeps the bar attached to *its* card (FR-006): in the SPA's
  stacked `space-y-4` dashboard and in multi-card layouts, the bar and card move together, align to
  the same width, and can't drift apart. `space-y-2` matches the repo's Tailwind spacing idiom
  (the Dashboard already uses `space-y-4`); it yields a small, even gap between the bar and the card
  so the card's border/background never touches the bar (FR-003).
- **Alternatives considered**:
  - *`flex flex-col gap-2`* — equivalent outcome; `space-y` is the more common idiom in this codebase.
  - *Bottom padding on the status bar only* — leaves the bar floating without a group root; does not
    bind the bar to its card in multi-card layouts (fails FR-006).
  - *Passing `className` into `StopCard`* — rejected: the spec Assumptions forbid a public prop change.

## R2 — How to assert "outside the card" in tests

- **Decision**: Lock the placement with DOM-structure assertions plus one `data-testid`:
  - `const widget = container.querySelector('[data-testid="stop-card-widget"]')` — the group root.
  - The status bar (the `role="status"` live region or `Last updated …` text) is a descendant of
    `widget.children[0]`, and the card (located via `getByRole('heading', { name: stopName }).closest('.rounded-xl')`)
    is a descendant of `widget.children[1]`.
  - Assert `card.contains(statusText) === false` and that the card interior's `textContent` contains
    no `Last updated` / `Not updated yet` / `Refresh` / `Updating…` text.
- **Rationale**: `@testing-library/react`'s user-centric queries (role/text) cannot distinguish
  inside vs. outside the card, so placement requires containment checks. A single `data-testid` on
  the widget root is a stable, minimal hook (the repo already uses `data-testid` on `urgency-dot`
  and `status-bar-controls`); walking the DOM from there (`children[0]` / `children[1]`,
  `contains`, `closest`) is robust and self-documenting.
- **Alternatives considered**:
  - *CSS-class selectors on the card (`querySelector('.rounded-xl')`)* — works but is fragile if the
    card's classes change; still needed as the fallback to locate the card from the heading.
  - *Asserting `toBeInTheDocument` only* — insufficient; the bar is already in the document today,
    so it would not fail on the old (inside-card) layout.

## R3 — Interaction with spec 005's identical-by-construction guarantee

- **Decision**: Only the *container placement* changes. `WidgetStatusBar` receives the exact same
  props (`lastUpdatedAt`, `updating`, `error`, `onRefresh`), and its render contract (wording,
  layout, right-aligned controls, live regions, `role="alert"` failure notice) is defined once in
  the shared component and remains untouched.
- **Rationale**: 005's FR-004 "identical by construction" governs the bar's *internal* wording,
  layout, and behavior across widgets — not where a widget chooses to mount it. This feature moves
  the mount point for the bus-catcher widget only, preserving every guarantee that lives inside the
  shared component. The user scoped the request to bus-catcher; other modules' widgets are not part
  of this feature (spec Assumptions).
- **Alternatives considered**:
  - *Move the bar for all modules* — rejected: out of the user's stated scope.
  - *Add a placement knob to `WidgetStatusBar`* — rejected: the bar stays a controlled,
    presentational element; placement is the widget's concern, not the bar's.

## R4 — Existing test compatibility

- **Decision**: Keep every existing `StopCard.test.tsx` assertion unchanged; add placement tests
  alongside them. Verify the whole existing status-bar behavior suite still passes after the move.
- **Rationale**: The current assertions query by role and text (`getByRole('status')`,
  `getByText(/Last updated …/)`, `getByRole('button', { name: 'Refresh' })`) — none depend on the
  bar living inside the card. Moving the bar must not regress the FR-005 behavior suite from 005.
- **Alternatives considered**: none — this is a verification requirement, not a design choice.

## R5 — Visual/documentation touchpoints

- **Decision**: Update the `StopCard.mdx` "Status bar" section (it currently says "In the card
  header the widget renders…") to describe the bar rendering above the card; add a multi-widget
  Storybook story to demonstrate per-card attribution.
- **Rationale**: Docs and stories must describe what the widget actually renders; the placement
  change makes the old wording wrong. A two-widget story is the cheapest visual proof of FR-006.
- **Alternatives considered**: leaving the MDX unchanged — rejected, it would describe the old
  layout.

## Consolidated decisions

| # | Topic | Decision |
|---|-------|----------|
| R1 | Grouping bar + card | Root `<div data-testid="stop-card-widget" class="space-y-2">`, bar first, card second |
| R2 | Placement test | `data-testid` root + DOM containment/order assertions; card located via heading → `.closest('.rounded-xl')` |
| R3 | Spec 005 interaction | Bar props and shared render contract unchanged; only the mount point moves (bus-catcher only) |
| R4 | Existing tests | All existing assertions unchanged and must keep passing |
| R5 | Docs/stories | Update `StopCard.mdx` wording; add a multi-widget attribution story |