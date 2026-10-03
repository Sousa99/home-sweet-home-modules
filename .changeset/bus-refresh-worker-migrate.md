---
"@sousa99/bus-catcher-components": patch
---

Fix the in-container `POST /api/refresh`: the ingest worker no longer runs
`migrateDb` concurrently with the server (which already migrates at boot). The
race left the database inconsistent (`table calendar already exists`) and
crash-looped startup with an orphaned multi-GB WAL. The CLI ingest path
(`pnpm ingest`) is unaffected.