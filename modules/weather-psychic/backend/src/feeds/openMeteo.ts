import { loadConfig } from '../lib/config';
import { conditionForCode } from '../lib/conditions';
import { ProviderUnavailableError } from '../lib/errors';
import type { CurrentWeather, DailyEntry, HourlyEntry, Location } from '../domain/types';
import type { LocationFeed, RawForecast, WeatherFeed } from './types';

/** Descriptive user-agent for the Open-Meteo API. */
const OPEN_METEO_USER_AGENT = 'weather-psychic/0.1 (https://github.com/sousa99)';

/** Days of daily forecast to request (forecast window minus today). */
const DAILY_DAYS = 7;
/** Hours of hourly forecast to request. */
const HOURLY_HOURS = 48;

export interface OpenMeteoFeedOptions {
  /** Base URL of the Open-Meteo forecast endpoint. */
  baseUrl?: string;
  /** Base URL of the Open-Meteo geocoding endpoint. */
  geocodingUrl?: string;
  /** Timeout in milliseconds for a single request. */
  timeoutMs?: number;
  /** fetch implementation override (for tests). */
  fetchImpl?: typeof fetch;
}

interface OpenMeteoForecastResponse {
  latitude?: number;
  longitude?: number;
  timezone?: string;
  current?: {
    time?: string;
    temperature_2m?: number;
    apparent_temperature?: number;
    relative_humidity_2m?: number;
    precipitation_probability?: number;
    weather_code?: number;
    wind_speed_10m?: number;
    wind_direction_10m?: number;
    uv_index?: number;
    is_day?: number;
  };
  hourly?: {
    time?: string[];
    temperature_2m?: number[];
    precipitation_probability?: number[];
    weather_code?: number[];
    is_day?: number[];
  };
  daily?: {
    time?: string[];
    weather_code?: number[];
    temperature_2m_max?: number[];
    temperature_2m_min?: number[];
    precipitation_probability_max?: number[];
  };
}

interface OpenMeteoGeocodingResponse {
  results?: Array<{
    id?: number;
    name?: string;
    latitude?: number;
    longitude?: number;
    timezone?: string;
    country?: string;
    admin1?: string;
  }>;
}

function asNumber(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

/**
 * Map an Open-Meteo forecast payload into the {@link RawForecast} shape.
 * Exported for unit testing.
 */
export function mapOpenMeteoForecast(data: OpenMeteoForecastResponse): RawForecast {
  const currentRaw = data.current;
  const location: Location = {
    id: 0,
    name: `(${data.latitude?.toFixed(2)}, ${data.longitude?.toFixed(2)})`,
    latitude: asNumber(data.latitude),
    longitude: asNumber(data.longitude),
    timezone: data.timezone ?? 'UTC',
  };

  const current: CurrentWeather | null =
    currentRaw === undefined
      ? null
      : {
          time: currentRaw.time ?? '',
          temperature: asNumber(currentRaw.temperature_2m),
          apparentTemperature: asNumber(currentRaw.apparent_temperature),
          weatherCode: asNumber(currentRaw.weather_code),
          condition: conditionForCode(asNumber(currentRaw.weather_code)).label,
          humidity: asNumber(currentRaw.relative_humidity_2m),
          windSpeed: asNumber(currentRaw.wind_speed_10m),
          windDirection: asNumber(currentRaw.wind_direction_10m),
          precipitationProbability: asNumber(currentRaw.precipitation_probability),
          uvIndex: asNumber(currentRaw.uv_index),
          isDay: (currentRaw.is_day ?? 1) === 1,
        };

  const times = asArray(data.hourly?.time) as string[];
  const temperatures = asArray(data.hourly?.temperature_2m) as number[];
  const probabilities = asArray(data.hourly?.precipitation_probability) as number[];
  const codes = asArray(data.hourly?.weather_code) as number[];
  const days = asArray(data.hourly?.is_day) as number[];

  const hourly: HourlyEntry[] = times.map((time, i) => {
    const code = asNumber(codes[i]);
    return {
      time,
      temperature: asNumber(temperatures[i]),
      weatherCode: code,
      condition: conditionForCode(code).label,
      precipitationProbability: asNumber(probabilities[i]),
      isDay: (days[i] ?? 1) === 1,
    };
  });

  const dailyTimes = asArray(data.daily?.time) as string[];
  const dailyCodes = asArray(data.daily?.weather_code) as number[];
  const maxes = asArray(data.daily?.temperature_2m_max) as number[];
  const mins = asArray(data.daily?.temperature_2m_min) as number[];
  const dailyProbabilities = asArray(data.daily?.precipitation_probability_max) as number[];

  const daily: DailyEntry[] = dailyTimes.map((date, i) => {
    const code = asNumber(dailyCodes[i]);
    return {
      date,
      weatherCode: code,
      condition: conditionForCode(code).label,
      temperatureMin: asNumber(mins[i]),
      temperatureMax: asNumber(maxes[i]),
      precipitationProbability: asNumber(dailyProbabilities[i]),
    };
  });

  return { location, current, hourly, daily };
}

/**
 * Live weather provider backed by the free, keyless Open-Meteo API: the
 * forecast endpoint for current + hourly + daily data and the geocoding API
 * for location search. No account, registration, or API key is required.
 */
export class OpenMeteoWeatherFeed implements WeatherFeed {
  private readonly baseUrl: string;
  private readonly timeoutMs: number;
  private readonly fetchImpl: typeof fetch;

  constructor(options: OpenMeteoFeedOptions = {}) {
    const cfg = loadConfig();
    this.baseUrl = options.baseUrl ?? cfg.openMeteoBaseUrl;
    this.timeoutMs = options.timeoutMs ?? cfg.feedTimeoutMs;
    this.fetchImpl = options.fetchImpl ?? fetch;
  }

  async getForecast(lat: number, lng: number, timezone: string): Promise<RawForecast> {
    const params = new URLSearchParams({
      latitude: String(lat),
      longitude: String(lng),
      current:
        'temperature_2m,apparent_temperature,relative_humidity_2m,precipitation_probability,weather_code,wind_speed_10m,wind_direction_10m,uv_index,is_day',
      hourly: 'temperature_2m,precipitation_probability,weather_code,is_day',
      daily: 'weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max',
      timezone,
      forecast_days: String(DAILY_DAYS),
      forecast_hours: String(HOURLY_HOURS),
    });
    const url = new URL(`/v1/forecast?${params.toString()}`, this.baseUrl);

    let response: Response;
    try {
      response = await this.fetchImpl(url, {
        signal: AbortSignal.timeout(this.timeoutMs),
        headers: { 'user-agent': OPEN_METEO_USER_AGENT },
      });
    } catch (err) {
      throw new ProviderUnavailableError('Weather provider request failed', { cause: err });
    }

    if (!response.ok) {
      throw new ProviderUnavailableError(`Weather provider returned HTTP ${response.status}`);
    }

    let data: unknown;
    try {
      data = await response.json();
    } catch (err) {
      throw new ProviderUnavailableError('Weather provider returned an unreadable payload', {
        cause: err,
      });
    }

    return mapOpenMeteoForecast(data as OpenMeteoForecastResponse);
  }
}

/**
 * Live location search backed by the Open-Meteo geocoding API.
 */
export class OpenMeteoLocationFeed implements LocationFeed {
  private readonly geocodingUrl: string;
  private readonly timeoutMs: number;
  private readonly fetchImpl: typeof fetch;

  constructor(options: OpenMeteoFeedOptions = {}) {
    const cfg = loadConfig();
    this.geocodingUrl = options.geocodingUrl ?? cfg.openMeteoGeocodingUrl;
    this.timeoutMs = options.timeoutMs ?? cfg.feedTimeoutMs;
    this.fetchImpl = options.fetchImpl ?? fetch;
  }

  async search(query: string): Promise<Location[]> {
    const params = new URLSearchParams({ name: query, count: '10', language: 'en' });
    const url = new URL(`/v1/search?${params.toString()}`, this.geocodingUrl);

    let response: Response;
    try {
      response = await this.fetchImpl(url, {
        signal: AbortSignal.timeout(this.timeoutMs),
        headers: { 'user-agent': OPEN_METEO_USER_AGENT },
      });
    } catch (err) {
      throw new ProviderUnavailableError('Location provider request failed', { cause: err });
    }

    if (!response.ok) {
      throw new ProviderUnavailableError(`Location provider returned HTTP ${response.status}`);
    }

    let data: OpenMeteoGeocodingResponse;
    try {
      data = (await response.json()) as OpenMeteoGeocodingResponse;
    } catch (err) {
      throw new ProviderUnavailableError('Location provider returned an unreadable payload', {
        cause: err,
      });
    }

    return (data.results ?? []).map((entry) => ({
      id: entry.id ?? 0,
      name: entry.name ?? '',
      latitude: asNumber(entry.latitude),
      longitude: asNumber(entry.longitude),
      timezone: entry.timezone ?? 'UTC',
      country: entry.country,
      admin1: entry.admin1,
    }));
  }
}
