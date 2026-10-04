import { describe, expect, it } from 'vitest';
import { MockLocationFeed, MockWeatherFeed } from '../../feeds/mock';
import { createWeatherService } from '../../services/weatherService';
import { ValidationError } from '../../lib/errors';

const FIXTURE_NOW = 1_791_115_200_000; // 2026-10-04T12:00:00Z
const LAT = 38.7167;
const LNG = -9.1333;

function makeService() {
  return createWeatherService({
    weatherFeed: new MockWeatherFeed({ now: FIXTURE_NOW }),
    locationFeed: new MockLocationFeed(),
  });
}

describe('weatherService.getForecast', () => {
  it('returns a forecast with current, hourly, daily and generatedAt', async () => {
    const service = makeService();
    const forecast = await service.getForecast({ lat: LAT, lng: LNG });

    expect(forecast.current).not.toBeNull();
    expect(forecast.current?.condition).toBe('Partly cloudy');
    expect(forecast.hourly.length).toBeGreaterThan(0);
    expect(forecast.daily.length).toBeGreaterThan(0);
    expect(forecast.generatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(forecast.location.latitude).toBe(LAT);
    expect(forecast.location.longitude).toBe(LNG);
  });

  it('excludes the current hour from the hourly list', async () => {
    const service = makeService();
    const forecast = await service.getForecast({ lat: LAT, lng: LNG });

    const currentHour = new Date(FIXTURE_NOW).toISOString().slice(0, 13);
    for (const entry of forecast.hourly) {
      expect(entry.time.slice(0, 13)).not.toBe(currentHour);
    }
    expect(forecast.hourly[0]?.time.slice(0, 13)).toBe('2026-10-04T13');
  });

  it('excludes the current day from the daily list', async () => {
    const service = makeService();
    const forecast = await service.getForecast({ lat: LAT, lng: LNG });

    const today = new Date(FIXTURE_NOW).toISOString().slice(0, 10);
    for (const entry of forecast.daily) {
      expect(entry.date).not.toBe(today);
    }
    expect(forecast.daily[0]?.date).toBe('2026-10-05');
  });

  it('orders hourly entries ascending by time', async () => {
    const service = makeService();
    const forecast = await service.getForecast({ lat: LAT, lng: LNG });

    const times = forecast.hourly.map((entry) => Date.parse(entry.time));
    for (let i = 1; i < times.length; i += 1) {
      expect(times[i] as number).toBeGreaterThan(times[i - 1] as number);
    }
  });

  it('orders daily entries ascending by date', async () => {
    const service = makeService();
    const forecast = await service.getForecast({ lat: LAT, lng: LNG });

    const dates = forecast.daily.map((entry) => entry.date);
    expect([...dates].sort()).toEqual(dates);
  });

  it('throws a ValidationError for out-of-range coordinates', async () => {
    const service = makeService();
    await expect(service.getForecast({ lat: 95, lng: 0 })).rejects.toBeInstanceOf(ValidationError);
  });
});

describe('weatherService.searchLocations', () => {
  it('returns matching locations for a query', async () => {
    const service = makeService();
    const results = await service.searchLocations('lisbon');
    expect(results.length).toBeGreaterThan(0);
    expect(results[0]?.name).toBe('Lisbon');
  });

  it('throws a ValidationError for a too-short query', async () => {
    const service = makeService();
    await expect(service.searchLocations('a')).rejects.toBeInstanceOf(ValidationError);
  });
});
