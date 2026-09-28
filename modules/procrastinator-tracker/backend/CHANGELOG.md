# @sousa99/procrastinator-tracker-backend

## 0.1.0

### Minor Changes

- c21181d: Standardize local setup: the SPA resolves its backend API base URL at runtime from
  `/config.json` (`API_BASE_URL`) and the published `TaskDeckWrapper` gains an optional
  `baseUrl` prop (precedence: prop > SPA env > same-origin `/api`); the backend defaults
  `DATABASE_URL` to `../../data/procrastinator.db` per the shared `data/` convention
  (`drizzle.config.ts` updated). Container (backend/frontend/storybook) and nginx
  deployment files updated.
