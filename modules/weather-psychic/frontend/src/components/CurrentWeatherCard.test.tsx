import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Forecast, Location } from '../api/types';
import { CurrentWeatherCard, type FetchForecast } from './CurrentWeatherCard';

vi.mock('../api/client', () => ({
  getForecast: vi.fn(),
}));

import { getForecast } from '../api/client';

const LOCATION: Location = {
  id: 2267057,
  name: 'Lisbon',
  latitude: 38.7167,
  longitude: -9.1333,
  timezone: 'Europe/Lisbon',
  country: 'Portugal',
};

function makeForecast(overrides: Partial<Forecast> = {}): Forecast {
  return {
    location: LOCATION,
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
    ],
    daily: [],
    generatedAt: '2026-10-04T12:05:00Z',
    ...overrides,
  };
}

const fetchForecast = vi.fn<FetchForecast>();

beforeEach(() => {
  vi.mocked(getForecast).mockReset();
});

afterEach(() => {
  vi.clearAllMocks();
});

function renderCard(props: { fetch?: FetchForecast } = {}) {
  return render(
    <CurrentWeatherCard
      location={LOCATION}
      fetchForecast={props.fetch ?? fetchForecast}
      baseUrl="http://localhost:3104"
    />,
  );
}

describe('CurrentWeatherCard', () => {
  it('renders the detailed current weather for the location', async () => {
    fetchForecast.mockResolvedValue(makeForecast());
    renderCard();

    expect(await screen.findByText('21°')).toBeInTheDocument();
    expect(screen.getByText('Partly cloudy')).toBeInTheDocument();
    expect(screen.getByText(/Feels like 21°/)).toBeInTheDocument();
    expect(screen.getByText(/62%/)).toBeInTheDocument();
    expect(screen.getByText(/14 km\/h/)).toBeInTheDocument();
    expect(screen.getByText('Lisbon')).toBeInTheDocument();
  });

  it('renders the WidgetStatusBar on top with "Last updated"', async () => {
    fetchForecast.mockResolvedValue(makeForecast());
    renderCard();

    await screen.findByText('21°');
    expect(screen.getByText(/Last updated/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Refresh' })).toBeInTheDocument();
  });

  it('uses the default client with the baseUrl when no fetcher is injected', async () => {
    vi.mocked(getForecast).mockResolvedValue(makeForecast());
    render(<CurrentWeatherCard location={LOCATION} baseUrl="http://localhost:3104" />);

    await waitFor(() => expect(screen.getByText('21°')).toBeInTheDocument());
    expect(getForecast).toHaveBeenCalledWith(
      { lat: LOCATION.latitude, lng: LOCATION.longitude },
      'http://localhost:3104',
    );
  });

  it('keeps last-known data when a refresh fails', async () => {
    fetchForecast
      .mockResolvedValueOnce(makeForecast())
      .mockRejectedValueOnce(new Error('network down'));
    renderCard();

    await screen.findByText('21°');
    await userEvent.click(screen.getByRole('button', { name: 'Refresh' }));

    expect(await screen.findByText('21°')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent(/network down/);
    expect(screen.getByText(/Last updated/)).toBeInTheDocument();
  });
});
