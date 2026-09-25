# MCP Contract — Next Bus Times (001)

**Date**: 2026-09-23

MCP server (server name `bus-catcher`, transport: HTTP/SSE on
`http://localhost:3001/mcp`). Tools mirror the REST contract and reuse the
**same zod schemas and service layer** (constitution: REST/MCP share one
service layer). Input/output shapes are identical to the REST DTOs.

## Tools

### `get_status`

Freshness + ingest state.

- **Input**: `{}`
- **Output**: `Status` (same shape as `GET /api/status`)

### `list_lines`

- **Input**: `{}`
- **Output**: `{ lines: Line[] }`

### `search_stops`

- **Input**: `{ q: string, limit?: number }` (`q` min 2, default limit 20)
- **Output**: `{ stops: Stop[] }`

### `get_stop`

- **Input**: `{ stopId: string }`
- **Output**: `{ stop: Stop }` — error if unknown

### `get_stop_times`

- **Input**: `{ stopId: string, limit?: number, lines?: string[] }`
- **Output**: `{ stopId, times: Passing[] }`

### `get_config`

- **Input**: `{}`
- **Output**: `{ stops: ConfigStop[] }`

### `add_stop`

- **Input**: `{ stopId: string, lineFilter?: string[], displayOrder?: number, enabled?: boolean }`
- **Output**: `{ stop: ConfigStop }` — error on unknown stop/line or duplicate

### `update_stop`

- **Input**: `{ id: number, lineFilter?: string[], displayOrder?: number, enabled?: boolean }`
- **Output**: `{ stop: ConfigStop }` — error if unknown

### `remove_stop`

- **Input**: `{ id: number }`
- **Output**: `{ removed: true }`

### `refresh_schedule`

- **Input**: `{}`
- **Output**: `{ status: "started" | "in_progress" }`

## Behavior rules

- MCP tool errors mirror REST error semantics (invalid input → error
  response; unknown ids → error response).
- Freshness (FR-009) is always available via `get_status`.