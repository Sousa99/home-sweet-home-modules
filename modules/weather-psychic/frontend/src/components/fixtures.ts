import type { Forecast, Location } from '../api/types';

/** A resolved location used across the workbench fixtures. */
export const LISBON: Location = {
  id: 2267057,
  name: 'Lisbon',
  latitude: 38.7167,
  longitude: -9.1333,
  timezone: 'Europe/Lisbon',
  country: 'Portugal',
};

export const MADRID: Location = {
  id: 3128760,
  name: 'Madrid',
  latitude: 40.4165,
  longitude: -3.7026,
  timezone: 'Europe/Madrid',
  country: 'Spain',
};

/** A deterministic fixture forecast for the workbench previews. */
export function fixtureForecast(location: Location = LISBON): Forecast {
  return {
    location,
    current: {
      time: '2026-10-04T12:00:00Z',
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
    },
    hourly: [
      {
        time: '2026-10-04T13:00:00Z',
        temperature: 22,
        weatherCode: 2,
        condition: 'Partly cloudy',
        precipitationProbability: 0,
        isDay: true,
      },
      {
        time: '2026-10-04T14:00:00Z',
        temperature: 23,
        weatherCode: 3,
        condition: 'Overcast',
        precipitationProbability: 10,
        isDay: true,
      },
      {
        time: '2026-10-04T15:00:00Z',
        temperature: 24,
        weatherCode: 3,
        condition: 'Overcast',
        precipitationProbability: 20,
        isDay: true,
      },
      {
        time: '2026-10-04T16:00:00Z',
        temperature: 23,
        weatherCode: 61,
        condition: 'Light rain',
        precipitationProbability: 60,
        isDay: true,
      },
      {
        time: '2026-10-04T17:00:00Z',
        temperature: 21,
        weatherCode: 80,
        condition: 'Light rain showers',
        precipitationProbability: 70,
        isDay: true,
      },
      {
        time: '2026-10-04T18:00:00Z',
        temperature: 20,
        weatherCode: 95,
        condition: 'Thunderstorm',
        precipitationProbability: 80,
        isDay: false,
      },
      {
        time: '2026-10-04T19:00:00Z',
        temperature: 19,
        weatherCode: 61,
        condition: 'Light rain',
        precipitationProbability: 65,
        isDay: false,
      },
      {
        time: '2026-10-04T20:00:00Z',
        temperature: 18,
        weatherCode: 2,
        condition: 'Partly cloudy',
        precipitationProbability: 20,
        isDay: false,
      },
    ],
    daily: [
      {
        date: '2026-10-05',
        weatherCode: 61,
        condition: 'Light rain',
        temperatureMin: 13,
        temperatureMax: 20,
        precipitationProbability: 60,
      },
      {
        date: '2026-10-06',
        weatherCode: 3,
        condition: 'Overcast',
        temperatureMin: 14,
        temperatureMax: 21,
        precipitationProbability: 30,
      },
      {
        date: '2026-10-07',
        weatherCode: 0,
        condition: 'Clear sky',
        temperatureMin: 15,
        temperatureMax: 24,
        precipitationProbability: 0,
      },
      {
        date: '2026-10-08',
        weatherCode: 95,
        condition: 'Thunderstorm',
        temperatureMin: 12,
        temperatureMax: 19,
        precipitationProbability: 80,
      },
      {
        date: '2026-10-09',
        weatherCode: 45,
        condition: 'Fog',
        temperatureMin: 11,
        temperatureMax: 18,
        precipitationProbability: 20,
      },
    ],
    generatedAt: '2026-10-04T12:05:00Z',
  };
}
