import type { CurrentWeather, DailyEntry, HourlyEntry, Location } from '../domain/types';
import { conditionForCode } from '../lib/conditions';
import type { LocationFeed, RawForecast, WeatherFeed } from './types';

export interface MockFeedOptions {
  /** Milliseconds the mock considers "now"; defaults to a fixed fixture time. */
  now?: number;
}

/** Fixed reference time for deterministic fixtures (2026-10-04T12:00:00Z). */
const DEFAULT_NOW = 1_791_115_200_000;

const FIXTURE_LOCATION: Location = {
  id: 2267057,
  name: 'Lisbon',
  latitude: 38.7167,
  longitude: -9.1333,
  timezone: 'Europe/Lisbon',
  country: 'Portugal',
  admin1: 'Lisbon',
};

const FIXTURE_ALTERNATE_LOCATIONS: Location[] = [
  {
    id: 3128760,
    name: 'Madrid',
    latitude: 40.4165,
    longitude: -3.7026,
    timezone: 'Europe/Madrid',
    country: 'Spain',
  },
  {
    id: 2968815,
    name: 'Paris',
    latitude: 48.8534,
    longitude: 2.3488,
    timezone: 'Europe/Paris',
    country: 'France',
  },
  {
    id: 2643743,
    name: 'London',
    latitude: 51.5085,
    longitude: -0.1257,
    timezone: 'Europe/London',
    country: 'United Kingdom',
  },
];

const HOUR_MS = 3_600_000;
const DAY_MS = 86_400_000;

/**
 * Deterministic fixture location list for search results.
 */
export class MockLocationFeed implements LocationFeed {
  async search(query: string): Promise<Location[]> {
    const q = query.trim().toLowerCase();
    const matches = [FIXTURE_LOCATION, ...FIXTURE_ALTERNATE_LOCATIONS].filter((loc) =>
      loc.name.toLowerCase().includes(q),
    );
    return matches.map((loc) => ({ ...loc }));
  }
}

/**
 * Deterministic weather feed for tests and offline development. Returns the
 * same fixture data on every call so contract tests are hermetic.
 */
export class MockWeatherFeed implements WeatherFeed {
  private readonly now: number;

  constructor(options: MockFeedOptions = {}) {
    this.now = options.now ?? DEFAULT_NOW;
  }

  async getForecast(lat: number, lng: number, timezone: string): Promise<RawForecast> {
    const baseTime = new Date(this.now);
    const current = buildCurrent(baseTime);
    const hourly = buildHourly(baseTime);
    const daily = buildDaily(baseTime);
    return {
      location: {
        ...FIXTURE_LOCATION,
        latitude: lat,
        longitude: lng,
        timezone,
      },
      current,
      hourly,
      daily,
    };
  }
}

function buildCurrent(base: Date): CurrentWeather {
  const code = 2;
  return {
    time: base.toISOString(),
    temperature: 21.4,
    apparentTemperature: 21.1,
    weatherCode: code,
    condition: conditionForCode(code).label,
    humidity: 62,
    windSpeed: 14.4,
    windDirection: 300,
    precipitationProbability: 5,
    uvIndex: 3,
    isDay: true,
  };
}

function buildHourly(base: Date): HourlyEntry[] {
  const entries: HourlyEntry[] = [];
  const start = new Date(base.getTime() - HOUR_MS); // include the current hour so the service must exclude it
  for (let i = 0; i < 48; i += 1) {
    const time = new Date(start.getTime() + i * HOUR_MS);
    const code = [2, 3, 61, 80, 95][i % 5] as number;
    entries.push({
      time: time.toISOString(),
      temperature: 20 + (i % 6),
      weatherCode: code,
      condition: conditionForCode(code).label,
      precipitationProbability: i % 4 === 0 ? 30 : 0,
      isDay: i % 24 < 12,
    });
  }
  return entries;
}

function buildDaily(base: Date): DailyEntry[] {
  const entries: DailyEntry[] = [];
  const start = new Date(base.getTime() - DAY_MS); // include today so the service must exclude it
  for (let i = 0; i < 7; i += 1) {
    const date = new Date(start.getTime() + i * DAY_MS).toISOString().slice(0, 10);
    const code = [2, 61, 3, 80, 0, 95, 45][i % 7] as number;
    entries.push({
      date,
      weatherCode: code,
      condition: conditionForCode(code).label,
      temperatureMin: 14 + (i % 4),
      temperatureMax: 22 + (i % 6),
      precipitationProbability: i % 3 === 0 ? 40 : 0,
    });
  }
  return entries;
}
