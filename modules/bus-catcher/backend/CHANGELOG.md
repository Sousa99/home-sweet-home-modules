# @sousa99/bus-catcher-backend

## 0.4.0

### Minor Changes

- cda4683: Bus-catcher now loads the Carris Metropolitana schedule automatically on startup and re-checks it periodically, and ingests the GTFS feed in a streaming, memory-bounded way (no more OOM on the ~71 MB archive). A crash-safe lock prevents the REST and MCP processes from ingesting concurrently, and an unchanged upstream feed is no longer re-ingested.

  New options: `SCHEDULE_AUTO_REFRESH` and `SCHEDULE_CHECK_INTERVAL_MS`; `?force=true` on `POST /api/refresh` and a `force` input on the `refresh_schedule` MCP tool; and an optional `refreshError` field in the status response.

## 0.3.0

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
