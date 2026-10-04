# @sousa99/bus-catcher-components

## 0.2.0

### Minor Changes

- fa7419e: The published `StopCard` widget now renders its standardized status bar (`Last updated …`, `Not updated yet`, `Updating…`, `Refresh`, failure notice) as its own block directly **above and outside** the card, aligned to the card's width. The card interior now contains only the stop's content (name, badge, waiting times, coverage), and each widget keeps its own status bar in multi-card layouts. Props and the public export surface are unchanged.

## 0.1.3

### Patch Changes

- 8a58d69: `StopCard` now renders the standardized `WidgetStatusBar` in the card header:
  `Last updated {YYYY-MM-DD HH:MM:SS <zone>}` (or `Not updated yet` before the first load), an `Updating…`
  indicator while loading, a manual `Refresh` button that re-runs the current load, and a
  failure notice that keeps the last successful time (polling is unchanged).

## 0.1.2

### Patch Changes

- d82697f: Fix the in-container `POST /api/refresh`: the ingest worker no longer runs
  `migrateDb` concurrently with the server (which already migrates at boot). The
  race left the database inconsistent (`table calendar already exists`) and
  crash-looped startup with an orphaned multi-GB WAL. The CLI ingest path
  (`pnpm ingest`) is unaffected.

## 0.1.1

### Patch Changes

- d44821b: Fix the published component libraries: the release pipeline now builds `dist-lib` before publishing
  and CI verifies the tarball contents (`scripts/check-publishable-libs.mjs`). Previous releases
  shipped empty packages (only `package.json`), so consumers could not import any widget.

## 0.1.0

### Minor Changes

- c21181d: Standardize local setup: the SPA resolves its backend API base URL at runtime from
  `/config.json` (`API_BASE_URL`), the published `StopCard` gains an optional `baseUrl`
  prop (precedence: prop > SPA env > same-origin `/api`), and the backend defaults
  `DB_PATH` to `../../data/bus-catcher.db` per the shared `data/` convention. Container
  (backend/frontend/storybook) and nginx deployment files updated.
