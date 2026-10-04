---
"@sousa99/weather-psychic-backend": minor
"@sousa99/weather-psychic-components": minor
---

Adds the new **weather-psychic** module (initial release of both fixed-group packages). The
backend ships a dual-mode service (REST `--http` + MCP `--mcp`) sharing the same zod schemas and
query pipeline: validate → feed → shape, with a free keyless Open-Meteo feed and a deterministic
`mock` feed for offline development and hermetic tests; routes are `GET /api/health`,
`GET /api/weather`, `GET /api/locations/search`, and MCP tools `weather.get_forecast` and
`weather.search`. The frontend ships a SPA + Storybook workbench publishing `CurrentWeatherCard`
(hourly strip excluding the current hour), `DailyForecastCard` (days starting tomorrow), and
`LocationSelector`, all self-fetching and honoring the base-url contract.