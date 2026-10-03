import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { configureApiBaseUrl } from '../../api/baseUrl';
import type { FlyOverResult, LocationQuery } from '../../api/types';
import type { UseFlyOversQueryResult } from '../../hooks/useFlyOversQuery';
import { FlyOverWidget } from '../FlyOverWidget';

vi.mock('../../hooks/useFlyOversQuery', () => ({
  useFlyOversQuery: vi.fn(),
}));

import { useFlyOversQuery } from '../../hooks/useFlyOversQuery';

const mockedUseFlyOversQuery = vi.mocked(useFlyOversQuery);

const location: LocationQuery = { lat: 48.8566, lng: 2.3522, radiusKm: 50 };
const nextLocation: LocationQuery = { lat: 40.0, lng: -3.7, radiusKm: 20 };

const result: FlyOverResult = {
  center: { lat: 48.8566, lng: 2.3522 },
  radiusKm: 50,
  asOf: 1_726_900_000,
  count: 2,
  destinationEnrichment: 'complete',
  aircraft: [
    {
      icao24: '3c6444',
      callsign: 'DLH400',
      originAirport: null,
      originCity: null,
      originAirportName: null,
      originCountry: 'Germany',
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
    },
    {
      icao24: '4ca866',
      callsign: 'RYR45A',
      originAirport: null,
      originCity: null,
      originAirportName: null,
      originCountry: 'Ireland',
      destinationAirport: null,
      destinationCity: null,
      destinationAirportName: null,
      destinationCountry: null,
      latitude: 48.7301,
      longitude: 2.0102,
      altitude: 11058,
      onGround: false,
      velocity: 240.8,
      trueTrack: 210,
      verticalRate: -3.4,
      distanceKm: 26.1,
    },
  ],
};

function makeState(overrides: Partial<UseFlyOversQueryResult>): UseFlyOversQueryResult {
  return {
    data: result,
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

describe('FlyOverWidget', () => {
  it('renders the map and a compact card per aircraft', () => {
    mockedUseFlyOversQuery.mockReturnValue(makeState({}));
    render(<FlyOverWidget location={location} />);

    expect(screen.getByTestId('map-container')).toBeInTheDocument();
    // Each callsign appears in the map tooltip and the compact card.
    expect(screen.getAllByText('DLH400').length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByText('RYR45A').length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText('8.2 km')).toBeInTheDocument();
    expect(screen.getByText('26.1 km')).toBeInTheDocument();
  });

  it('caps the list to maxResults while the map still shows every aircraft', () => {
    mockedUseFlyOversQuery.mockReturnValue(makeState({}));
    render(<FlyOverWidget location={location} maxResults={1} />);

    // The closest aircraft appears in both the map tooltip and its list card.
    expect(screen.getAllByText('DLH400').length).toBeGreaterThanOrEqual(2);
    // The second aircraft remains on the map (tooltip) but is dropped from the list.
    expect(screen.getAllByText('RYR45A')).toHaveLength(1);
  });

  it('shows a loading hint while the first fetch is pending', () => {
    mockedUseFlyOversQuery.mockReturnValue(makeState({ data: null, isLoading: true }));
    render(<FlyOverWidget location={location} />);

    expect(screen.getByText('Loading aircraft…')).toBeInTheDocument();
  });

  it('shows an empty state when no aircraft are in range', () => {
    mockedUseFlyOversQuery.mockReturnValue(
      makeState({ data: { ...result, count: 0, aircraft: [] } }),
    );
    render(<FlyOverWidget location={location} />);

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
    render(<FlyOverWidget location={location} />);

    expect(screen.getByRole('alert')).toHaveTextContent('temporarily unavailable');
  });

  it('shows the updating indicator only while a refresh is in flight', () => {
    const { rerender } = render(<FlyOverWidget location={location} />);
    mockedUseFlyOversQuery.mockReturnValue(makeState({ isFetching: true }));
    rerender(<FlyOverWidget location={location} />);
    expect(screen.getByRole('status')).toHaveTextContent('Updating…');

    mockedUseFlyOversQuery.mockReturnValue(makeState({ isFetching: false }));
    rerender(<FlyOverWidget location={location} />);
    expect(screen.queryByText('Updating…')).not.toBeInTheDocument();
  });

  it('triggers a refetch from the manual refresh button', async () => {
    const user = userEvent.setup();
    const refetch = vi.fn();
    mockedUseFlyOversQuery.mockReturnValue(makeState({ refetch }));
    render(<FlyOverWidget location={location} />);

    await user.click(screen.getByRole('button', { name: 'Refresh' }));
    expect(refetch).toHaveBeenCalledTimes(1);
  });

  it('passes the configured location, autoRefresh, and baseUrl to the hook', () => {
    mockedUseFlyOversQuery.mockReturnValue(makeState({}));
    const { rerender } = render(
      <FlyOverWidget location={location} autoRefresh={10} baseUrl="https://api.example.com" />,
    );

    expect(mockedUseFlyOversQuery).toHaveBeenCalledWith({
      location,
      autoRefresh: 10,
      baseUrl: 'https://api.example.com',
    });

    rerender(
      <FlyOverWidget location={nextLocation} autoRefresh={10} baseUrl="https://api.example.com" />,
    );
    expect(mockedUseFlyOversQuery).toHaveBeenLastCalledWith({
      location: nextLocation,
      autoRefresh: 10,
      baseUrl: 'https://api.example.com',
    });
  });

  it('defaults the hook baseUrl to the runtime-configured value', () => {
    mockedUseFlyOversQuery.mockReturnValue(makeState({}));
    configureApiBaseUrl('https://configured.example.com');
    render(<FlyOverWidget location={location} />);

    expect(mockedUseFlyOversQuery).toHaveBeenCalledWith({
      location,
      autoRefresh: 'off',
      baseUrl: 'https://configured.example.com',
    });
  });
});
