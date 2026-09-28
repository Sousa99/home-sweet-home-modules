---
"@sousa99/fly-over-tracker-backend": minor
"@sousa99/fly-over-tracker-components": minor
---

Standardize local setup: the published `FlyOverWidget` and `ClosestAircraftCard`
resolve their `baseUrl` default from runtime config (`/config.json`, `API_BASE_URL`)
while keeping the explicit prop, and the backend REST port is standardized on `PORT`
(`HTTP_PORT` kept as a backward-compatible alias). Container (backend/frontend/storybook)
and nginx deployment files updated.