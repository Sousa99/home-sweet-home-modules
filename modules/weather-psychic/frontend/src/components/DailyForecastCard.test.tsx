import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { DailyEntry, Forecast, Location } from '../api/types';
import { DailyForecastCard, type FetchForecast } from './DailyForecastCard';

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

function makeDaily(): DailyEntry[] {
  return [
    {
      date: '2026-10-04',
      weatherCode: 2,
      condition: 'Partly cloudy',
      temperatureMin: 14,
      temperatureMax: 22,
      precipitationProbability: 40,
    },
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
      temperatureMin: 15,
      temperatureMax: 21,
      precipitationProbability: 10,
    },
    {
      date: '2026-10-07',
      weatherCode: 0,
      condition: 'Clear sky',
      temperatureMin: 16,
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
  ];
}

function makeForecast(daily: DailyEntry[]): Forecast {
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
    hourly: [],
    daily,
    generatedAt: '2026-10-04T12:05:00Z',
  };
}

const fetchForecast = vi.fn<FetchForecast>();

beforeEach(() => {
  vi.mocked(getForecast).mockReset();
});

afterEach(() => {
  vi.clearAllMocks();
});

function renderCard(props: { fetch?: FetchForecast; daily?: DailyEntry[] } = {}) {
  return render(
    <DailyForecastCard
      location={LOCATION}
      fetchForecast={props.fetch ?? fetchForecast}
      baseUrl="http://localhost:3104"
      now="2026-10-04T12:00:00Z"
    />,
  );
}

describe('DailyForecastCard', () => {
  it('lists the upcoming days starting tomorrow, excluding today', async () => {
    fetchForecast.mockResolvedValue(makeForecast(makeDaily()));
    renderCard();

    // Today (2026-10-04) must not be listed; the first entry is tomorrow.
    await screen.findByText('Light rain');
    expect(screen.queryByText(/4 Oct/)).not.toBeInTheDocument();
    expect(screen.getByText(/5 Oct/)).toBeInTheDocument();
    expect(screen.getByText('Light rain')).toBeInTheDocument();
  });

  it('shows a succinct per-day summary with low/high temperatures', async () => {
    fetchForecast.mockResolvedValue(makeForecast(makeDaily()));
    renderCard();

    await screen.findByText('Light rain');
    expect(screen.getByText('13° / 20°')).toBeInTheDocument();
    expect(screen.getByText('60%')).toBeInTheDocument();
  });

  it('caps the list at 5 entries', async () => {
    fetchForecast.mockResolvedValue(makeForecast(makeDaily()));
    renderCard();

    await screen.findByText('Light rain');
    const rows = screen.getAllByRole('listitem');
    expect(rows.length).toBe(5);
  });

  it('renders the WidgetStatusBar on top with Refresh', async () => {
    fetchForecast.mockResolvedValue(makeForecast(makeDaily()));
    renderCard();

    await screen.findByText('Light rain');
    expect(screen.getByText(/Last updated/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Refresh' })).toBeInTheDocument();
  });

  it('uses the default client with the baseUrl when no fetcher is injected', async () => {
    vi.mocked(getForecast).mockResolvedValue(makeForecast(makeDaily()));
    render(
      <DailyForecastCard
        location={LOCATION}
        baseUrl="http://localhost:3104"
        now="2026-10-04T12:00:00Z"
      />,
    );

    await waitFor(() => expect(screen.getByText('Light rain')).toBeInTheDocument());
    expect(getForecast).toHaveBeenCalledWith(
      { lat: LOCATION.latitude, lng: LOCATION.longitude },
      'http://localhost:3104',
    );
  });

  it('keeps last-known data when a refresh fails', async () => {
    fetchForecast
      .mockResolvedValueOnce(makeForecast(makeDaily()))
      .mockRejectedValueOnce(new Error('network down'));
    renderCard();

    await screen.findByText('Light rain');
    await userEvent.click(screen.getByRole('button', { name: 'Refresh' }));

    expect(await screen.findByText('Light rain')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent(/network down/);
  });
});
