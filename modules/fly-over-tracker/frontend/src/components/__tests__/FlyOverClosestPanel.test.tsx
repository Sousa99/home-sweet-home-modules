import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { configureApiBaseUrl } from '../../api/baseUrl';
import type { Aircraft, FlyOverResult, LocationQuery } from '../../api/types';
import type { UseFlyOversQueryResult } from '../../hooks/useFlyOversQuery';
import { FlyOverClosestPanel } from '../FlyOverClosestPanel';

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
const ryr = aircraft({ icao24: '4ca866', callsign: 'RYR45A', distanceKm: 26.1 });
const tap = aircraft({ icao24: '4951a1', callsign: 'TAP123', distanceKm: 40.5 });

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
    data: result([dlh, ryr, tap]),
    dataUpdatedAt: 1_726_900_000,
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

describe('FlyOverClosestPanel', () => {
  it('renders the closest aircraft as a tile and the rest as list cards, without repeating it', () => {
    mockedUseFlyOversQuery.mockReturnValue(makeState({}));
    render(<FlyOverClosestPanel location={location} />);

    // Closest appears exactly once (the tile), never repeated in the list.
    expect(screen.getAllByText('DLH400')).toHaveLength(1);
    expect(screen.getByText('RYR45A')).toBeInTheDocument();
    expect(screen.getByText('TAP123')).toBeInTheDocument();
    expect(screen.queryByText(/aircraft over/i)).not.toBeInTheDocument();
    expect(
      screen.getByText(/Last updated \d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/),
    ).toBeInTheDocument();
  });

  it('caps the list to maxResults after the closest tile', () => {
    mockedUseFlyOversQuery.mockReturnValue(makeState({}));
    render(<FlyOverClosestPanel location={location} maxResults={1} />);

    expect(screen.getAllByText('DLH400')).toHaveLength(1);
    expect(screen.getByText('RYR45A')).toBeInTheDocument();
    expect(screen.queryByText('TAP123')).not.toBeInTheDocument();
  });

  it('picks the closest deterministically on a distance tie (by icao24)', () => {
    const tied = [
      aircraft({ icao24: '4ca866', callsign: 'RYR45A', distanceKm: 10 }),
      aircraft({ icao24: '3c6444', callsign: 'DLH400', distanceKm: 10 }),
    ];
    mockedUseFlyOversQuery.mockReturnValue(makeState({ data: result(tied) }));
    render(<FlyOverClosestPanel location={location} />);

    expect(screen.getAllByText('DLH400')).toHaveLength(1);
    expect(screen.getByText('RYR45A')).toBeInTheDocument();
  });

  it('shows a loading hint while the first fetch is pending', () => {
    mockedUseFlyOversQuery.mockReturnValue(
      makeState({ data: null, dataUpdatedAt: null, isLoading: true }),
    );
    render(<FlyOverClosestPanel location={location} />);

    expect(screen.getByText('Loading aircraft…')).toBeInTheDocument();
    expect(screen.getByText('Not updated yet')).toBeInTheDocument();
  });

  it('shows an empty state when no aircraft are in range', () => {
    mockedUseFlyOversQuery.mockReturnValue(makeState({ data: result([]) }));
    render(<FlyOverClosestPanel location={location} />);

    expect(screen.getByText(/No aircraft within 50 km/)).toBeInTheDocument();
  });

  it('shows an error state when the fetch fails', () => {
    mockedUseFlyOversQuery.mockReturnValue(
      makeState({
        data: null,
        dataUpdatedAt: null,
        isError: true,
        error: new Error('Aircraft feed is temporarily unavailable'),
      }),
    );
    render(<FlyOverClosestPanel location={location} />);

    expect(screen.getByRole('alert')).toHaveTextContent('temporarily unavailable');
    expect(screen.getByText('Not updated yet')).toBeInTheDocument();
  });

  it('shows the updating indicator only while a refresh is in flight', () => {
    const { rerender } = render(<FlyOverClosestPanel location={location} />);
    mockedUseFlyOversQuery.mockReturnValue(makeState({ isFetching: true }));
    rerender(<FlyOverClosestPanel location={location} />);
    expect(
      screen.getAllByRole('status').some((region) => region.textContent?.includes('Updating…')),
    ).toBe(true);

    mockedUseFlyOversQuery.mockReturnValue(makeState({ isFetching: false }));
    rerender(<FlyOverClosestPanel location={location} />);
    expect(screen.queryByText('Updating…')).not.toBeInTheDocument();
  });

  it('triggers a refetch from the manual refresh button', async () => {
    const user = userEvent.setup();
    const refetch = vi.fn();
    mockedUseFlyOversQuery.mockReturnValue(makeState({ refetch }));
    render(<FlyOverClosestPanel location={location} />);

    await user.click(screen.getByRole('button', { name: 'Refresh' }));
    expect(refetch).toHaveBeenCalledTimes(1);
  });

  it('renders the standardized status bar with the last update time', () => {
    mockedUseFlyOversQuery.mockReturnValue(makeState({}));
    render(<FlyOverClosestPanel location={location} />);

    expect(
      screen.getByText(/Last updated \d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Refresh' })).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveAttribute('aria-live', 'polite');
  });

  it('keeps the last update time, surfaces the error, and still offers Refresh on a failed refresh', async () => {
    const user = userEvent.setup();
    const refetch = vi.fn();
    mockedUseFlyOversQuery.mockReturnValue(
      makeState({
        isError: true,
        error: new Error('Aircraft feed is temporarily unavailable'),
        refetch,
      }),
    );
    render(<FlyOverClosestPanel location={location} />);

    expect(screen.getByRole('alert')).toHaveTextContent('temporarily unavailable');
    expect(
      screen.getByText(/Last updated \d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/),
    ).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Refresh' }));
    expect(refetch).toHaveBeenCalledTimes(1);
  });

  it('passes the configured location, autoRefresh, and baseUrl to the hook', () => {
    mockedUseFlyOversQuery.mockReturnValue(makeState({}));
    render(
      <FlyOverClosestPanel
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
    render(<FlyOverClosestPanel location={location} />);

    expect(mockedUseFlyOversQuery).toHaveBeenCalledWith({
      location,
      autoRefresh: 'off',
      baseUrl: 'https://configured.example.com',
    });
  });
});
