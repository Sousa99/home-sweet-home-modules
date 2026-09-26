# MCP Contract — Live ETA (002)

**Date**: 2026-09-25

MCP server (`bus-catcher`, HTTP/SSE on `http://localhost:3001/mcp`). Tools
mirror the REST contract and reuse the same zod schemas and service layer
(constitution: REST/MCP share one service layer). Evolution of the 001
contract; all new fields are optional/backward-compatible.

## Tools

### `get_stop_times`

- **Input**: `{ stopId: string, limit?: number, lines?: string[] }`
- **Output**: `{ stopId, times: Passing[], realtime: RealtimeInfo }` — same
  enriched payload as `GET /api/stops/:id/times` (times carry `source`,
  `predictedAt`, `delayMinutes` when a fresh live prediction exists).

### `get_status`

- **Input**: `{}`
- **Output**: `Status` — includes `realtimeLastUpdate`, `realtimeAvailable`,
  `realtimeStale`.

### All other 001 tools

Unchanged (`search_stops`, `get_stop`, `list_lines`, `get_config`,
`add_stop`, `update_stop`, `remove_stop`, `refresh_schedule`).

## Behavior rules

- Real-time prediction merge happens in the shared service layer, so REST and
  MCP return identical enriched results for the same stop.
- Feed down / stale ⇒ `source: "scheduled"` for all rows and
  `realtime.available === false`; never a tool error.
- Invalid input / unknown ids keep the 001 error semantics.