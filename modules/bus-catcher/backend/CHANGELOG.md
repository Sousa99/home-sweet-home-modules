# @sousa99/bus-catcher-backend

## 0.2.0

### Minor Changes

- fa7419e: The published `StopCard` widget now renders its standardized status bar (`Last updated …`, `Not updated yet`, `Updating…`, `Refresh`, failure notice) as its own block directly **above and outside** the card, aligned to the card's width. The card interior now contains only the stop's content (name, badge, waiting times, coverage), and each widget keeps its own status bar in multi-card layouts. Props and the public export surface are unchanged.

## 0.1.3

## 0.1.2

## 0.1.1

## 0.1.0

### Minor Changes

- c21181d: Standardize local setup: the SPA resolves its backend API base URL at runtime from
  `/config.json` (`API_BASE_URL`), the published `StopCard` gains an optional `baseUrl`
  prop (precedence: prop > SPA env > same-origin `/api`), and the backend defaults
  `DB_PATH` to `../../data/bus-catcher.db` per the shared `data/` convention. Container
  (backend/frontend/storybook) and nginx deployment files updated.
