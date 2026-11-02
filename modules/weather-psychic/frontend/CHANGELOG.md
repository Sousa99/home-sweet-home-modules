# @sousa99/weather-psychic-components

## 0.2.0

### Minor Changes

- 94a79a7: Introduce the shared neo-brutalist light/dark theme package and restyle every
  published widget to consume its semantic tokens. The fly-over map card/view
  also gain optional `tileAttribution` support for dark basemaps.

### Patch Changes

- Updated dependencies [94a79a7]
  - @sousa99/homesweethome-theme@0.1.0

## 0.1.0

### Minor Changes

- 91daa7c: Adds the new **weather-psychic** module (initial release of both fixed-group packages). The
  backend ships a dual-mode service (REST `--http` + MCP `--mcp`) sharing the same zod schemas and
  query pipeline: validate → feed → shape, with a free keyless Open-Meteo feed and a deterministic
  `mock` feed for offline development and hermetic tests; routes are `GET /api/health`,
  `GET /api/weather`, `GET /api/locations/search`, and MCP tools `weather.get_forecast` and
  `weather.search`. The frontend ships a SPA + Storybook workbench publishing `CurrentWeatherCard`
  (hourly strip excluding the current hour), `DailyForecastCard` (days starting tomorrow), and
  `LocationSelector`, all self-fetching and honoring the base-url contract.
