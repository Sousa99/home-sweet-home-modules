import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { configureApiBaseUrl } from '../../api/baseUrl';
import type { Aircraft, FlyOverResult, LocationQuery } from '../../api/types';
import type { UseFlyOversQueryResult } from '../../hooks/useFlyOversQuery';
import { ClosestAircraftCard } from '../ClosestAircraftCard';

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
const ryr = aircraft({
  icao24: '4ca866',
  callsign: 'RYR45A',
  distanceKm: 26.1,
  latitude: 48.7301,
  longitude: 2.0102,
});

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
    data: result([dlh, ryr]),
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

describe('ClosestAircraftCard', () => {
  it('renders the closest aircraft via the full aircraft card', () => {
    mockedUseFlyOversQuery.mockReturnValue(makeState({}));
    render(<ClosestAircraftCard location={location} />);

    expect(screen.getByText('DLH400')).toBeInTheDocument();
    expect(screen.getByText('8.2 km')).toBeInTheDocument();
    expect(screen.queryByText('RYR45A')).not.toBeInTheDocument();
  });

  it('picks the closest deterministically on a distance tie (by icao24)', () => {
    const tied = [
      aircraft({ icao24: '4ca866', callsign: 'RYR45A', distanceKm: 10 }),
      aircraft({ icao24: '3c6444', callsign: 'DLH400', distanceKm: 10 }),
    ];
    mockedUseFlyOversQuery.mockReturnValue(makeState({ data: result(tied) }));
    render(<ClosestAircraftCard location={location} />);

    expect(screen.getByText('DLH400')).toBeInTheDocument();
    expect(screen.queryByText('RYR45A')).not.toBeInTheDocument();
  });

  it('shows an empty state when no aircraft are in range', () => {
    mockedUseFlyOversQuery.mockReturnValue(makeState({ data: result([]) }));
    render(<ClosestAircraftCard location={location} />);

    expect(screen.getByText(/No aircraft within 50 km/)).toBeInTheDocument();
  });

  it('shows an error state when the fetch fails', () => {
    mockedUseFlyOversQuery.mockReturnValue(
      makeState({
        data: null,
        isError: true,
        error: new Error('Aircraft feed is temporarily unavailable'),
      }),
    );
    render(<ClosestAircraftCard location={location} />);

    expect(screen.getByRole('alert')).toHaveTextContent('temporarily unavailable');
  });

  it('keys the card content to the closest aircraft and keeps the transition class', () => {
    mockedUseFlyOversQuery.mockReturnValue(makeState({}));
    const { rerender } = render(<ClosestAircraftCard location={location} />);
    expect(screen.getByText('DLH400')).toBeInTheDocument();

    const swapped = [aircraft({ ...ryr, distanceKm: 3 }), aircraft({ ...dlh, distanceKm: 20 })];
    mockedUseFlyOversQuery.mockReturnValue(makeState({ data: result(swapped) }));
    rerender(<ClosestAircraftCard location={location} />);

    const animated = document.querySelector('.animate-closest-card-in');
    expect(animated).not.toBeNull();
    expect(animated).toHaveTextContent('RYR45A');
    expect(animated).not.toHaveTextContent('DLH400');
  });

  it('shows the updating indicator only while a refresh is in flight', () => {
    const { rerender } = render(<ClosestAircraftCard location={location} />);
    mockedUseFlyOversQuery.mockReturnValue(makeState({ isFetching: true }));
    rerender(<ClosestAircraftCard location={location} />);
    expect(screen.getByRole('status')).toHaveTextContent('Updating…');

    mockedUseFlyOversQuery.mockReturnValue(makeState({ isFetching: false }));
    rerender(<ClosestAircraftCard location={location} />);
    expect(screen.queryByText('Updating…')).not.toBeInTheDocument();
  });

  it('triggers a refetch from the manual refresh button', async () => {
    const user = userEvent.setup();
    const refetch = vi.fn();
    mockedUseFlyOversQuery.mockReturnValue(makeState({ refetch }));
    render(<ClosestAircraftCard location={location} />);

    await user.click(screen.getByRole('button', { name: 'Refresh' }));
    expect(refetch).toHaveBeenCalledTimes(1);
  });

  it('passes the configured location, autoRefresh, and baseUrl to the hook', () => {
    mockedUseFlyOversQuery.mockReturnValue(makeState({}));
    render(
      <ClosestAircraftCard
        location={location}
        autoRefresh={10}
        baseUrl="https://api.example.com"
      />,
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
    render(<ClosestAircraftCard location={location} />);

    expect(mockedUseFlyOversQuery).toHaveBeenCalledWith({
      location,
      autoRefresh: 'off',
      baseUrl: 'https://configured.example.com',
    });
  });
});
