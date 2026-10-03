# @sousa99/bus-catcher-backend

## 0.1.2

## 0.1.1

## 0.1.0

### Minor Changes

- c21181d: Standardize local setup: the SPA resolves its backend API base URL at runtime from
  `/config.json` (`API_BASE_URL`), the published `StopCard` gains an optional `baseUrl`
  prop (precedence: prop > SPA env > same-origin `/api`), and the backend defaults
  `DB_PATH` to `../../data/bus-catcher.db` per the shared `data/` convention. Container
  (backend/frontend/storybook) and nginx deployment files updated.
