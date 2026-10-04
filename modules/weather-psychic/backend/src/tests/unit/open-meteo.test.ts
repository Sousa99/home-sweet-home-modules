import { describe, expect, it } from 'vitest';
import {
  mapOpenMeteoForecast,
  OpenMeteoLocationFeed,
  OpenMeteoWeatherFeed,
} from '../../feeds/openMeteo';
import { ProviderUnavailableError } from '../../lib/errors';

const FORECAST_FIXTURE = {
  latitude: 38.7167,
  longitude: -9.1333,
  timezone: 'Europe/Lisbon',
  current: {
    time: '2026-10-04T12:00',
    temperature_2m: 21.4,
    apparent_temperature: 21.1,
    relative_humidity_2m: 62,
    precipitation_probability: 5,
    weather_code: 2,
    wind_speed_10m: 14.4,
    wind_direction_10m: 300,
    uv_index: 3,
    is_day: 1,
  },
  hourly: {
    time: ['2026-10-04T13:00', '2026-10-04T14:00'],
    temperature_2m: [22, 23],
    precipitation_probability: [0, 10],
    weather_code: [2, 3],
    is_day: [1, 1],
  },
  daily: {
    time: ['2026-10-05', '2026-10-06'],
    weather_code: [61, 3],
    temperature_2m_max: [20, 21],
    temperature_2m_min: [13, 14],
    precipitation_probability_max: [60, 30],
  },
};

describe('mapOpenMeteoForecast', () => {
  it('maps current, hourly, and daily blocks into the shared shape', () => {
    const raw = mapOpenMeteoForecast(FORECAST_FIXTURE);

    expect(raw.location).toEqual({
      id: 0,
      name: '(38.72, -9.13)',
      latitude: 38.7167,
      longitude: -9.1333,
      timezone: 'Europe/Lisbon',
    });
    expect(raw.current).toEqual({
      time: '2026-10-04T12:00',
      temperature: 21.4,
      apparentTemperature: 21.1,
      weatherCode: 2,
      condition: 'Partly cloudy',
      humidity: 62,
      windSpeed: 14.4,
      windDirection: 300,
      precipitationProbability: 5,
      uvIndex: 3,
      isDay: true,
    });
    expect(raw.hourly).toHaveLength(2);
    expect(raw.hourly[0]).toMatchObject({
      time: '2026-10-04T13:00',
      temperature: 22,
      weatherCode: 2,
    });
    expect(raw.daily).toHaveLength(2);
    expect(raw.daily[0]).toMatchObject({
      date: '2026-10-05',
      temperatureMin: 13,
      temperatureMax: 20,
    });
  });

  it('handles a missing current block as null current', () => {
    const raw = mapOpenMeteoForecast({ ...FORECAST_FIXTURE, current: undefined });
    expect(raw.current).toBeNull();
  });

  it('coerces non-finite values to zero and defaults is_day', () => {
    const raw = mapOpenMeteoForecast({
      latitude: 1,
      longitude: 2,
      current: { time: 'x', weather_code: 2 },
      hourly: { time: ['t'], temperature_2m: [Number.NaN] },
      daily: { time: ['2026-10-05'], weather_code: [0] },
    });
    expect(raw.current?.temperature).toBe(0);
    expect(raw.current?.isDay).toBe(true);
    expect(raw.hourly[0]?.temperature).toBe(0);
    expect(raw.daily[0]?.temperatureMin).toBe(0);
  });
});

describe('OpenMeteoWeatherFeed / OpenMeteoLocationFeed error paths', () => {
  it('wraps a network failure as ProviderUnavailableError', async () => {
    const feed = new OpenMeteoWeatherFeed({
      baseUrl: 'https://example.com',
      timeoutMs: 1000,
      fetchImpl: (() => Promise.reject(new Error('network down'))) as typeof fetch,
    });
    await expect(feed.getForecast(1, 2, 'UTC')).rejects.toBeInstanceOf(ProviderUnavailableError);
  });

  it('wraps a non-OK response as ProviderUnavailableError', async () => {
    const feed = new OpenMeteoWeatherFeed({
      baseUrl: 'https://example.com',
      timeoutMs: 1000,
      fetchImpl: (() => Promise.resolve(new Response('oops', { status: 503 }))) as typeof fetch,
    });
    await expect(feed.getForecast(1, 2, 'UTC')).rejects.toBeInstanceOf(ProviderUnavailableError);
  });

  it('wraps an unreadable payload as ProviderUnavailableError', async () => {
    const feed = new OpenMeteoWeatherFeed({
      baseUrl: 'https://example.com',
      timeoutMs: 1000,
      fetchImpl: (() => Promise.resolve(new Response('not json', { status: 200 }))) as typeof fetch,
    });
    await expect(feed.getForecast(1, 2, 'UTC')).rejects.toBeInstanceOf(ProviderUnavailableError);
  });

  it('wraps location search network failure as ProviderUnavailableError', async () => {
    const feed = new OpenMeteoLocationFeed({
      geocodingUrl: 'https://example.com',
      timeoutMs: 1000,
      fetchImpl: (() => Promise.reject(new Error('down'))) as typeof fetch,
    });
    await expect(feed.search('lisbon')).rejects.toBeInstanceOf(ProviderUnavailableError);
  });
});
