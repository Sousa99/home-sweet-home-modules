import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { Forecast, Location } from '../api/types';
import { DashboardPage } from './DashboardPage';

vi.mock('../api/client', () => ({
  getForecast: vi.fn(),
  searchLocations: vi.fn(),
}));

import { getForecast, searchLocations } from '../api/client';

const LISBON: Location = {
  id: 2267057,
  name: 'Lisbon',
  latitude: 38.7167,
  longitude: -9.1333,
  timezone: 'Europe/Lisbon',
  country: 'Portugal',
};

function makeForecast(location: Location): Forecast {
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
    hourly: [],
    daily: [
      {
        date: '2026-10-05',
        weatherCode: 61,
        condition: 'Light rain',
        temperatureMin: 13,
        temperatureMax: 20,
        precipitationProbability: 60,
      },
    ],
    generatedAt: '2026-10-04T12:05:00Z',
  };
}

describe('DashboardPage', () => {
  it('renders the location selector and both widgets', async () => {
    localStorage.setItem('weather-psychic:location', JSON.stringify(LISBON));
    vi.mocked(getForecast).mockResolvedValue(makeForecast(LISBON));
    render(<DashboardPage baseUrl="http://localhost:3104" />);

    expect(screen.getByPlaceholderText('Search for a city…')).toBeInTheDocument();
    expect(await screen.findByText('Partly cloudy')).toBeInTheDocument();
    expect(await screen.findByText('Daily forecast')).toBeInTheDocument();
  });

  it('choosing a location updates the widgets', async () => {
    vi.mocked(searchLocations).mockResolvedValue([LISBON]);
    vi.mocked(getForecast).mockResolvedValue(makeForecast(LISBON));
    const user = userEvent.setup();
    render(<DashboardPage baseUrl="http://localhost:3104" />);

    await user.type(screen.getByPlaceholderText('Search for a city…'), 'lis');
    await user.click(await screen.findByText('Lisbon'));

    expect(await screen.findByText('Lisbon')).toBeInTheDocument();
    expect(getForecast).toHaveBeenCalledWith(
      { lat: LISBON.latitude, lng: LISBON.longitude },
      'http://localhost:3104',
    );
  });
});
