---
'@sousa99/fly-over-tracker-components': minor
---

Slow auto-scroll for the `FlyOverClosestPanel` closest-flights list: when the list overflows its
container it now glides smoothly on its own via a new vertical `useAutoScroll` hook (frame-driven
`requestAnimationFrame` at a calm 25 px/s — slower than the weather strip), pauses briefly at the
end, then loops back to the top. The animation pauses while the pointer is over the list so manual
scrolling stays possible, and it honors `prefers-reduced-motion` (never scrolls, and stops
immediately if the preference is enabled mid-scroll). List content, closest-first ordering,
`maxResults` capping, and refresh behavior are unchanged; no public props or exports change.
Storybook story and docs updated to demonstrate the behavior.
