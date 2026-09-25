# Data Model — Next Bus Times (001)

**Date**: 2026-09-23

Entities derived from the feature spec and research. Types are conceptual;
exact SQLite types and drizzle columns are defined during implementation.

## 1. `lines` (Carris bus routes)

| Field | Type | Notes |
|-------|------|-------|
| `id` (route_id) | string | PK, from GTFS `routes.txt` |
| `short_name` | string | e.g. "736" |
| `long_name` | string | e.g. "Cais do Sodré — Outurela/Portela" |
| `route_type` | int | GTFS route type; 3 = bus |
| `agency_id` | string | Carris |

- **Source**: GTFS `routes.txt`. Relates to `trips` (one-to-many) and
  `stop_times` (via trips).

## 2. `stops`

| Field | Type | Notes |
|-------|------|-------|
| `id` (stop_id) | string | PK, from GTFS `stops.txt` |
| `name` | string | stop name |
| `lat` / `lon` | float | coordinates |

- **Source**: GTFS `stops.txt`. ~2,344 stops in the feed.

## 3. `trips`

| Field | Type | Notes |
|-------|------|-------|
| `id` (trip_id) | string | PK |
| `line_id` (route_id) | string | FK → `lines.id` |
| `service_id` | string | FK → `calendar.service_id` |
| `headsign` | string | destination text |
| `direction_id` | int | 0/1 |

- **Source**: GTFS `trips.txt`. **Validation**: line/service ids must resolve.

## 4. `stop_times`

| Field | Type | Notes |
|-------|------|-------|
| `trip_id` | string | PK (part 1), FK → `trips.id` |
| `stop_sequence` | int | PK (part 2) |
| `stop_id` | string | FK → `stops.id` |
| `arrival_min` | int | minutes since service-day midnight, may exceed 1440 |
| `departure_min` | int | minutes since service-day midnight |
| `pickup_type` / `drop_off_type` | int | from GTFS |

- **Source**: GTFS `stop_times.txt` (~2.4 M rows).
- **Index**: `(stop_id, arrival_min)` — powers the "next times at stop" query.

## 5. `calendar` and `calendar_dates`

| Field | Type | Notes |
|-------|------|-------|
| `service_id` | string | PK |
| `monday..sunday` | int | weekday flags |
| `start_date` / `end_date` | string (YYYYMMDD) | service range |

`calendar_dates`: `(service_id, date)` PK; `exception_type` 1 = added, 2 = removed.

- **Purpose**: resolves which `service_id`s run on a given calendar date.

## 6. `configured_stops` (user dashboard config)

| Field | Type | Notes |
|-------|------|-------|
| `id` | int | PK, autoincrement |
| `stop_id` | string | FK → `stops.id` |
| `line_filter` | json/text | optional list of `lines.id`; null/empty = all lines |
| `display_order` | int | dashboard sort order |
| `enabled` | int | 1/0 |

- **Validation** (zod, enforced at the API boundary):
  - `stop_id` must exist in `stops`.
  - every `line_filter` entry must exist in `lines` (or be removed).
- **State transitions**: `enabled` toggles visibility without deleting config;
  a stop/line that disappears from a refreshed feed is flagged
  (spec edge case) but kept until the user removes it.

## 7. `metadata`

| Field | Type | Notes |
|-------|------|-------|
| `key` | string | PK (`last_refresh`, `feed_version`, `fetched_at`) |
| `value` | string | |

- **Purpose**: freshness source for FR-009 / constitution II.

## Derived query: next scheduled passing times

For `stop_id = S`, calendar date `D`, cutoff `now`:

1. active `service_id`s = `calendar` matching weekday(D) within
   `[start_date, end_date]`, adjusted by `calendar_dates` exceptions;
2. trips = `trips` where `service_id` active (and `line_id ∈ filter` if set);
3. rows = `stop_times` where `stop_id = S` and `trip_id ∈ trips` and
   `arrival_min ≥ cutoff_min(D)`;
4. order by `arrival_min asc`, limit N; join `lines` + `trips.headsign`.

Countdown and wall-clock rendering use the Europe/Lisbon conversion in
`lib/time.ts` (UTC canonical, DST-aware).