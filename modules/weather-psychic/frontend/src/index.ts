/**
 * weather-psychic dashboard widgets library entry.
 *
 * Publishes the embeddable weather widgets for a dashboard:
 * - `CurrentWeatherCard` — detailed current weather + auto-scrolling hourly strip;
 * - `DailyForecastCard` — compact list of the upcoming days (starting tomorrow);
 * - `LocationSelector` — search-and-select control for the location.
 * Together with the types their public props reference. The SPA components, the
 * UI primitives, and the backend API client are internal implementation details
 * and are not part of the published surface.
 */
export { CurrentWeatherCard } from './components/CurrentWeatherCard';
export type {
  CurrentWeatherCardProps,
  FetchForecast as FetchWeatherForecast,
} from './components/CurrentWeatherCard';
export { DailyForecastCard } from './components/DailyForecastCard';
export type {
  DailyForecastCardProps,
  FetchForecast as FetchDailyForecast,
} from './components/DailyForecastCard';
export { LocationSelector } from './components/LocationSelector';
export type {
  LocationSelectorProps,
  SearchLocations as SearchWeatherLocations,
} from './components/LocationSelector';
export type { CurrentWeather, DailyEntry, Forecast, HourlyEntry, Location } from './api/types';
