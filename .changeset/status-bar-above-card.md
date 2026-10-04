---
"@sousa99/bus-catcher-backend": minor
"@sousa99/bus-catcher-components": minor
---

The published `StopCard` widget now renders its standardized status bar (`Last updated …`, `Not updated yet`, `Updating…`, `Refresh`, failure notice) as its own block directly **above and outside** the card, aligned to the card's width. The card interior now contains only the stop's content (name, badge, waiting times, coverage), and each widget keeps its own status bar in multi-card layouts. Props and the public export surface are unchanged.