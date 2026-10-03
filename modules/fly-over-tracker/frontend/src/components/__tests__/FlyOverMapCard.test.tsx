import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { configureApiBaseUrl } from '../../api/baseUrl';
import type { Aircraft, FlyOverResult, LocationQuery } from '../../api/types';
import type { UseFlyOversQueryResult } from '../../hooks/useFlyOversQuery';
import { FlyOverMapCard } from '../FlyOverMapCard';

vi.mock('../../hooks/useFlyOversQuery', () => ({
  useFlyOversQuery: vi.fn(),
}));

import { useFlyOversQuery } from '../../hooks/useFlyOversQuery';

const mockedUseFlyOversQuery = vi.mocked(useFlyOversQuery);

const location: LocationQuery = { lat: 48.8566, lng: 2.3522, radiusKm: 50 };

function aircraft(overrides: Partial<Aircraft> & Pick<Aircraft, 'icao24' | 'callsign'>): Aircraft {
  return {
    originAirport: null,
    originCity: null,
    originAirportName: null,
    originCountry: null,
    destinationAirport: null,
    destinationCity: null,
    destinationAirportName: null,
    destinationCountry: null,
    latitude: 48.9211,
    longitude: 2.4288,
    altitude: 9144,
    onGround: false,
    velocity: 251.2,
    trueTrack: 87.5,
    verticalRate: 0,
    distanceKm: 8.2,
    ...overrides,
  };
}

const dlh = aircraft({ icao24: '3c6444', callsign: 'DLH400', distanceKm: 8.2 });

function result(aircraftList: Aircraft[]): FlyOverResult {
  return {
    center: { lat: 48.8566, lng: 2.3522 },
    radiusKm: 50,
    asOf: 1_726_900_000,
    count: aircraftList.length,
    destinationEnrichment: 'complete',
    aircraft: aircraftList,
  };
}

function makeState(overrides: Partial<UseFlyOversQueryResult>): UseFlyOversQueryResult {
  return {
    data: result([dlh]),
    isLoading: false,
    isFetching: false,
    isError: false,
    error: null,
    refetch: vi.fn(),
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  configureApiBaseUrl(undefined);
});

describe('FlyOverMapCard', () => {
  it('renders the map with the configured center and no aircraft list', () => {
    mockedUseFlyOversQuery.mockReturnValue(makeState({}));
    render(<FlyOverMapCard location={location} />);

    const map = screen.getByTestId('map-container');
    expect(map).toBeInTheDocument();
    expect(map).toHaveAttribute('data-center-lat', '48.8566');
    expect(map).toHaveAttribute('data-center-lng', '2.3522');
    // The map card does not render the compact aircraft list cards.
    expect(screen.queryByText('8.2 km')).not.toBeInTheDocument();
  });

  it('shows an error banner when the fetch fails', () => {
    mockedUseFlyOversQuery.mockReturnValue(
      makeState({
        data: null,
        isError: true,
        error: new Error('Aircraft feed is temporarily unavailable'),
      }),
    );
    render(<FlyOverMapCard location={location} />);

    expect(screen.getByRole('alert')).toHaveTextContent('temporarily unavailable');
  });

  it('shows the updating indicator only while a refresh is in flight', () => {
    const { rerender } = render(<FlyOverMapCard location={location} />);
    mockedUseFlyOversQuery.mockReturnValue(makeState({ isFetching: true }));
    rerender(<FlyOverMapCard location={location} />);
    expect(screen.getByRole('status')).toHaveTextContent('Updating…');

    mockedUseFlyOversQuery.mockReturnValue(makeState({ isFetching: false }));
    rerender(<FlyOverMapCard location={location} />);
    expect(screen.queryByText('Updating…')).not.toBeInTheDocument();
  });

  it('triggers a refetch from the manual refresh button', async () => {
    const user = userEvent.setup();
    const refetch = vi.fn();
    mockedUseFlyOversQuery.mockReturnValue(makeState({ refetch }));
    render(<FlyOverMapCard location={location} />);

    await user.click(screen.getByRole('button', { name: 'Refresh' }));
    expect(refetch).toHaveBeenCalledTimes(1);
  });

  it('passes the configured location, autoRefresh, and baseUrl to the hook', () => {
    mockedUseFlyOversQuery.mockReturnValue(makeState({}));
    render(
      <FlyOverMapCard location={location} autoRefresh={10} baseUrl="https://api.example.com" />,
    );

    expect(mockedUseFlyOversQuery).toHaveBeenCalledWith({
      location,
      autoRefresh: 10,
      baseUrl: 'https://api.example.com',
    });
  });

  it('defaults the hook baseUrl to the runtime-configured value', () => {
    mockedUseFlyOversQuery.mockReturnValue(makeState({}));
    configureApiBaseUrl('https://configured.example.com');
    render(<FlyOverMapCard location={location} />);

    expect(mockedUseFlyOversQuery).toHaveBeenCalledWith({
      location,
      autoRefresh: 'off',
      baseUrl: 'https://configured.example.com',
    });
  });
});
