# Data Model: Weather Psychic

**Feature**: `007-weather-psychic` | **Date**: 2026-10-04 | **Plan**: [plan.md](./plan.md)

The module is **stateless server-side**: the backend derives all weather data from the Open-Meteo
provider at request time and persists nothing. The "entities" below are the shared domain objects
that travel between backend and frontend (locked by the schemas in
[`contracts/backend-api.md`](./contracts/backend-api.md)) plus the browser-persisted location
preference. No relational model, no migrations.

## Entity: Location

A resolved, selectable place whose weather is displayed. Produced by the geocoding feed
(`search_locations`), selected in the SPA, and passed as a prop to both published widgets.

| Field | Type | Rules |
|-------|------|-------|
| `id` | number | Provider geocoding id. |
| `name` | string | Display name (e.g. "Lisbon"). |
| `latitude` | number | WGS84, `[-90, 90]`. |
| `longitude` | number | WGS84, `[-180, 180]`. |
| `timezone` | string | IANA tz name (e.g. `Europe/Lisbon`); drives local-time forecast timestamps. |
| `country` | string (optional) | Country name, if the provider returns it. |
| `admin1` | string (optional) | First-level administrative area, if available. |

**Validation**: `latitude`/`longitude` in range; `timezone` non-empty string. Used directly as the
`location` prop of `CurrentWeatherCard` and `DailyForecastCard`.

## Entity: CurrentWeather

The weather at a location at the current moment (derived from the provider's `current` block).

| Field | Type | Rules |
|-------|------|-------|
| `time` | string (ISO-8601) | Local-time timestamp of the observation. |
| `temperature` | number | Air temperature at 2m, °C. |
| `apparentTemperature` | number | Feels-like temperature, °C. |
| `weatherCode` | number | WMO weather code (0–99). |
| `condition` | string | Human label derived from `weatherCode` (e.g. "Partly cloudy"). |
| `humidity` | number | Relative humidity, %. |
| `windSpeed` | number | 10m wind speed, km/h. |
| `windDirection` | number | Degrees, `[0, 360)`. |
| `precipitationProbability` | number | Chance of precipitation, %. |
| `uvIndex` | number | UV index. |
| `isDay` | boolean | Day/night flag from the provider. |

**Rules**: `weatherCode` maps through the WMO-code table (shared fixture) to `condition`;
`isDay` influences which icon variant is shown in the graphic display.

## Entity: HourlyEntry

One hour of the hourly forecast strip.

| Field | Type | Rules |
|-------|------|-------|
| `time` | string (ISO-8601) | Local-time hour timestamp. |
| `temperature` | number | °C. |
| `weatherCode` | number | WMO code. |
| `condition` | string | Derived label. |
| `precipitationProbability` | number | % (optional in the mock, always present from live). |
| `isDay` | boolean | Day/night flag. |

**Rules**: The strip is seeded with entries whose `time` is strictly after the current local hour
(the current hour is excluded — FR-003). Entries are ordered ascending by `time`.

## Entity: DailyEntry

One day of the daily forecast list.

| Field | Type | Rules |
|-------|------|-------|
| `date` | string (ISO-8601 date) | The forecast day. |
| `weatherCode` | number | WMO code. |
| `condition` | string | Derived label. |
| `temperatureMin` | number | Daily minimum, °C. |
| `temperatureMax` | number | Daily maximum, °C. |
| `precipitationProbability` | number | % (daily max/mean, as provider provides). |

**Rules**: The list is seeded with entries whose `date` is strictly after the current local date
(the current day is excluded — FR-005). Ordered ascending by `date`. Exactly **5 entries** by
default (planning decision; matches the 7-day horizon minus today's entry, capped for the succinct
list).

## Entity: Forecast

The complete weather payload returned by the backend for one location (one provider call).

| Field | Type | Rules |
|-------|------|-------|
| `location` | `Location` | The requested location echoed back. |
| `current` | `CurrentWeather` | Current conditions. |
| `hourly` | `HourlyEntry[]` | Coming hours; first entry is the next hour (current hour excluded). |
| `daily` | `DailyEntry[]` | Coming days; first entry is tomorrow (today excluded). |
| `generatedAt` | string (ISO-8601) | Server-side generation timestamp; drives the widget "Last updated" status. |

**Transition**: `generatedAt` advances on every fetch. `current.time` advances with the provider;
on an hour boundary the `hourly` list re-seeds (drops the now-current hour) and on midnight the
`daily` list re-seeds (drops today).

## Entity: LocationPreference (persisted, browser-only)

The SPA's chosen location, remembered across visits.

| Field | Type | Rules |
|-------|------|-------|
| Storage key | `weather-psychic:location` | Browser local storage. |
| Stored value | `Location` | The resolved location object (JSON). |
| Absent or invalid | — | Treated as "no selection"; the dashboard prompts to pick a location (fallback per FR-008). |
| Write policy | — | Written only by `useLocation` on the SPA dashboard; published widgets never read/write it. |
| Scope | — | Per browser/device (single household). |

## Relationships

- `Location` → `Forecast` (1 : 1): one resolved location produces one forecast payload.
- `Forecast` → `CurrentWeather` (1 : 1), `Forecast` → `HourlyEntry` (1 : N ordered by time),
  `Forecast` → `DailyEntry` (1 : N ordered by date).
- `CurrentWeatherCard` and `DailyForecastCard` each take a `Location` prop and render slices of a
  `Forecast` fetched for it; `LocationSelector` produces a `Location` that feeds the widgets on the
  dashboard.

## Unchanged entities

- No existing module entity is modified; this feature only adds the weather-psychic module.
- The shared `WidgetStatusBar`/`LoadState` convention (from `005`) is reused by both widgets but is
  not changed.