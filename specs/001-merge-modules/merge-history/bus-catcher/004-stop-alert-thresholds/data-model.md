# Data Model — Per-Stop Departure Alert Thresholds (004)

**Date**: 2026-09-25

Entities derived from the feature spec and research. Types are conceptual;
exact SQLite types and drizzle columns are defined during implementation.

## 1. `configured_stops` (extended)

The existing per-stop configuration row gains three nullable integer columns.
`NULL` = "not configured" (server resolves documented defaults when reading).

| Field | Type | Notes |
|-------|------|-------|
| `id` | int | PK, autoincrement (existing) |
| `stop_id` | string | FK → `stops.id` (existing) |
| `line_filter` | string \| null | JSON array of tokens (existing) |
| `display_order` | int | existing |
| `enabled` | int | existing |
| `heads_up_min` | int \| null | **added** — minutes before arrival at which the "heads-up" zone begins; null → default 10 |
| `leave_now_min` | int \| null | **added** — minutes before arrival at which "leave now" begins; null → default 5 |
| `missed_min` | int \| null | **added** — minutes before arrival at which the bus is "missed"; null → default 1 |

- **Default constants** (single source of truth on the backend):
  `heads_up = 10`, `leave_now = 5`, `missed = 1` minutes.
- **Validation** (create and update, after zod shape checks):
  non-negative integers; `heads_up >= leave_now >= missed`. On partial update,
  unspecified fields fall back to the stored values before the ordering check.

## 2. `DepartureThresholds` (value object, API shape)

Resolved, non-null numbers as exposed to clients.

| Field | Type | Notes |
|-------|------|-------|
| `headsUpMinutes` | number | resolved minutes (default 10 when unset) |
| `leaveNowMinutes` | number | resolved minutes (default 5 when unset) |
| `missedMinutes` | number | resolved minutes (default 1 when unset) |

- Serialized inside every `ConfigStop` (see `contracts/rest-api.md`).
- No lifecycle or state transitions: thresholds are static configuration
  compared against the per-bus `minutesUntil` at render time.

## 3. `UrgencyLevel` (derived, not stored)

One of four zones computed on the client from `minutesUntil` and the stop's
thresholds. Not a table — a pure derivation.

| Level | Condition (strictest-first) | Dot hue |
|-------|-----------------------------|---------|
| `missed` | `minutesUntil <= missedMinutes` | dark slate (`bg-slate-900`) |
| `leave-now` | `minutesUntil <= leaveNowMinutes` | orange (`bg-orange-500`) |
| `heads-up` | `minutesUntil <= headsUpMinutes` | amber (`bg-amber-500`) |
| `relaxed` | otherwise | green (`bg-green-500`) |

- Boundary rule: at-or-below a threshold ⇒ the stricter level (deterministic,
  spec SC-004 / FR-007).
- Applies equally to live and scheduled rows (spec FR-008).