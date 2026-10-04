---
"@sousa99/procrastinator-tracker-components": minor
---

`TaskDeck` and `TaskDeckWrapper` now render a visible `TaskDeckEmpty` card (exported, with a
`message` prop) when there are no tasks or no tasks match the active filters, instead of a blank
area. Both gain an optional `transitionVariant` prop: the default `slide` keeps today's wide pan,
while `slide-up` exits the card vertically (48px up, no sideways travel) so the deck sits calmly in
dense dashboards. The deck now defaults to a compact `--deck-height` (16rem) that can be overridden
via `style`/`className` for larger layouts.