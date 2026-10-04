---
"@sousa99/procrastinator-tracker-components": minor
---

`TaskDeck` and `TaskDeckWrapper` now render a visible `TaskDeckEmpty` card (exported, with a
`message` prop) when there are no tasks or no tasks match the active filters, instead of a blank
area. Both gain an optional `transitionVariant` prop: the default `slide` keeps today's wide pan,
while `gentle` reduces the exiting card's sideways travel to 80px (internal `exitTravel` on the raw
deck). The deck now defaults to a compact `--deck-height` (16rem) that can be overridden via
`style`/`className` for larger layouts.