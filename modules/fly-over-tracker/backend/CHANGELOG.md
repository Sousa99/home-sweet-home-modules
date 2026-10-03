# @sousa99/fly-over-tracker-backend

## 0.3.0

## 0.2.0

## 0.1.1

## 0.1.0

### Minor Changes

- c21181d: Standardize local setup: the published `FlyOverWidget` and `ClosestAircraftCard`
  resolve their `baseUrl` default from runtime config (`/config.json`, `API_BASE_URL`)
  while keeping the explicit prop, and the backend REST port is standardized on `PORT`
  (`HTTP_PORT` kept as a backward-compatible alias). Container (backend/frontend/storybook)
  and nginx deployment files updated.
