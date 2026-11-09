---
'@sousa99/bus-catcher-backend': minor
'@sousa99/bus-catcher-components': minor
---

Bus-catcher now loads the Carris Metropolitana schedule automatically on startup and re-checks it periodically, and ingests the GTFS feed in a streaming, memory-bounded way (no more OOM on the ~71 MB archive). A crash-safe lock prevents the REST and MCP processes from ingesting concurrently, and an unchanged upstream feed is no longer re-ingested.

New options: `SCHEDULE_AUTO_REFRESH` and `SCHEDULE_CHECK_INTERVAL_MS`; `?force=true` on `POST /api/refresh` and a `force` input on the `refresh_schedule` MCP tool; and an optional `refreshError` field in the status response.
