# @sousa99/procrastinator-tracker-components

## 0.2.0

### Minor Changes

- 593bbad: `TaskDeck` and `TaskDeckWrapper` now render a visible `TaskDeckEmpty` card (exported, with a
  `message` prop) when there are no tasks or no tasks match the active filters, instead of a blank
  area. Both gain an optional `transitionVariant` prop: the default `slide` keeps today's wide pan,
  while `slide-up` exits the card vertically (48px up, no sideways travel) so the deck sits calmly in
  dense dashboards. The deck now defaults to a compact `--deck-height` (16rem) that can be overridden
  via `style`/`className` for larger layouts.

### Patch Changes

- 8a58d69: `TaskDeckWrapper` now renders the standardized `WidgetStatusBar` above the deck:
  `Last updated {YYYY-MM-DD HH:MM:SS <zone>}` (or `Not updated yet` before the first load), an `Updating…`
  indicator while loading, a manual `Refresh` button that reloads the deck, and a failure
  notice that keeps the last successful time (polling is unchanged).

## 0.1.2

### Patch Changes

- 422249b: Fix the MCP server to support multiple clients and reconnects: each client now gets
  its own `McpServer` + transport session (tracked by the generated session id) instead
  of a single shared server that rejected a second initialize with
  "Server already initialized".

## 0.1.1

### Patch Changes

- d44821b: Fix the published component libraries: the release pipeline now builds `dist-lib` before publishing
  and CI verifies the tarball contents (`scripts/check-publishable-libs.mjs`). Previous releases
  shipped empty packages (only `package.json`), so consumers could not import any widget.

## 0.1.0

### Minor Changes

- c21181d: Standardize local setup: the SPA resolves its backend API base URL at runtime from
  `/config.json` (`API_BASE_URL`) and the published `TaskDeckWrapper` gains an optional
  `baseUrl` prop (precedence: prop > SPA env > same-origin `/api`); the backend defaults
  `DATABASE_URL` to `../../data/procrastinator.db` per the shared `data/` convention
  (`drizzle.config.ts` updated). Container (backend/frontend/storybook) and nginx
  deployment files updated.
