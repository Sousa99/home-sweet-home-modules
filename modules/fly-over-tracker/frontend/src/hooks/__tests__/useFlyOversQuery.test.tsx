import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { configureApiBaseUrl } from '../../api/baseUrl';
import type { FlyOverResult, LocationQuery } from '../../api/types';
import type { RefreshRate } from '../../components/RefreshRateSelect';
import { useFlyOversQuery } from '../useFlyOversQuery';

vi.mock('../../api/client', () => ({
  getFlyOvers: vi.fn(),
  MAX_RADIUS_KM: 463,
}));

import { getFlyOvers } from '../../api/client';

const mockedGetFlyOvers = vi.mocked(getFlyOvers);

const result: FlyOverResult = {
  center: { lat: 48.8566, lng: 2.3522 },
  radiusKm: 50,
  asOf: 1_726_900_000,
  count: 1,
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
  ],
};

const locationA: LocationQuery = { lat: 48.8566, lng: 2.3522, radiusKm: 50 };
const locationB: LocationQuery = { lat: 40.0, lng: -3.7, radiusKm: 20 };

let testClient: QueryClient;

function createTestClient(): QueryClient {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } });
}

interface PanelProps {
  location: LocationQuery;
  autoRefresh?: RefreshRate;
  baseUrl?: string;
}

function Panel({ location, autoRefresh, baseUrl }: PanelProps): React.JSX.Element {
  const [current, setCurrent] = useState(location);
  const query = useFlyOversQuery({ location: current, autoRefresh, baseUrl });
  return (
    <div>
      <span data-testid="count">{query.data ? String(query.data.count) : 'none'}</span>
      <span data-testid="loading">{String(query.isLoading)}</span>
      <span data-testid="fetching">{String(query.isFetching)}</span>
      <span data-testid="error">{String(query.isError)}</span>
      <span data-testid="updatedAt">
        {query.dataUpdatedAt === null ? 'null' : String(query.dataUpdatedAt)}
      </span>
      <button onClick={() => query.refetch()}>refetch</button>
      <button onClick={() => setCurrent(locationB)}>change location</button>
    </div>
  );
}

function renderPanel(props: PanelProps): ReturnType<typeof render> {
  return render(
    <QueryClientProvider client={testClient}>
      <Panel {...props} />
    </QueryClientProvider>,
  );
}

async function flush(): Promise<void> {
  await act(async () => {});
}

beforeEach(() => {
  testClient = createTestClient();
  vi.clearAllMocks();
});

afterEach(() => {
  vi.useRealTimers();
  configureApiBaseUrl(undefined);
});

describe('useFlyOversQuery', () => {
  it('fetches for the given location and base URL', async () => {
    mockedGetFlyOvers.mockResolvedValue(result);
    renderPanel({ location: locationA, baseUrl: 'https://api.example.com' });

    await waitFor(() => expect(screen.getByTestId('count')).toHaveTextContent('1'));
    expect(mockedGetFlyOvers).toHaveBeenCalledWith(locationA, 'https://api.example.com');
    expect(screen.getByTestId('loading')).toHaveTextContent('false');
  });

  it('refetches when the location changes', async () => {
    mockedGetFlyOvers.mockResolvedValue(result);
    renderPanel({ location: locationA });

    await waitFor(() => expect(screen.getByTestId('count')).toHaveTextContent('1'));
    expect(mockedGetFlyOvers).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole('button', { name: 'change location' }));

    await waitFor(() => expect(mockedGetFlyOvers).toHaveBeenCalledTimes(2));
    expect(mockedGetFlyOvers).toHaveBeenLastCalledWith(locationB, '');
  });

  it('defaults to the configured API base URL', async () => {
    configureApiBaseUrl('https://configured.example.com');
    mockedGetFlyOvers.mockResolvedValue(result);
    renderPanel({ location: locationA });

    await waitFor(() => expect(screen.getByTestId('count')).toHaveTextContent('1'));
    expect(mockedGetFlyOvers).toHaveBeenCalledWith(locationA, 'https://configured.example.com');
  });

  it('re-fetches on the auto-refresh interval', async () => {
    vi.useFakeTimers();
    mockedGetFlyOvers.mockResolvedValue(result);
    renderPanel({ location: locationA, autoRefresh: 5 });
    await flush();
    expect(mockedGetFlyOvers).toHaveBeenCalledTimes(1);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(5_000);
    });
    expect(mockedGetFlyOvers).toHaveBeenCalledTimes(2);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(5_000);
    });
    expect(mockedGetFlyOvers).toHaveBeenCalledTimes(3);
  });

  it('does not auto-refresh when the rate is off', async () => {
    vi.useFakeTimers();
    mockedGetFlyOvers.mockResolvedValue(result);
    renderPanel({ location: locationA });
    await flush();
    mockedGetFlyOvers.mockClear();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(30_000);
    });
    expect(mockedGetFlyOvers).not.toHaveBeenCalled();
  });

  it('reports loading while the first fetch is pending', async () => {
    mockedGetFlyOvers.mockImplementation(() => new Promise<FlyOverResult>(() => {}));
    renderPanel({ location: locationA });

    await flush();
    expect(screen.getByTestId('loading')).toHaveTextContent('true');
    expect(screen.getByTestId('count')).toHaveTextContent('none');
  });

  it('reports an error when the fetch fails', async () => {
    mockedGetFlyOvers.mockRejectedValue(new Error('Aircraft feed is temporarily unavailable'));
    renderPanel({ location: locationA });

    await waitFor(() => expect(screen.getByTestId('error')).toHaveTextContent('true'));
    expect(screen.getByTestId('count')).toHaveTextContent('none');
  });

  it('exposes dataUpdatedAt as the epoch ms of the last successful fetch', async () => {
    mockedGetFlyOvers.mockResolvedValue(result);
    renderPanel({ location: locationA });

    await waitFor(() => expect(screen.getByTestId('count')).toHaveTextContent('1'));
    const updatedAt = Number(screen.getByTestId('updatedAt').textContent);
    expect(Number.isFinite(updatedAt)).toBe(true);
    expect(updatedAt).toBeGreaterThan(0);
    expect(updatedAt).toBeLessThanOrEqual(Date.now());
  });

  it('reports dataUpdatedAt null before the first successful load', async () => {
    mockedGetFlyOvers.mockImplementation(() => new Promise<FlyOverResult>(() => {}));
    renderPanel({ location: locationA });

    await flush();
    expect(screen.getByTestId('updatedAt')).toHaveTextContent('null');
    expect(screen.getByTestId('count')).toHaveTextContent('none');
  });

  it('advances dataUpdatedAt after a manual refetch succeeds', async () => {
    mockedGetFlyOvers.mockResolvedValue(result);
    renderPanel({ location: locationA });

    await waitFor(() => expect(screen.getByTestId('count')).toHaveTextContent('1'));
    const first = Number(screen.getByTestId('updatedAt').textContent);

    fireEvent.click(screen.getByRole('button', { name: 'refetch' }));
    await waitFor(() => expect(mockedGetFlyOvers).toHaveBeenCalledTimes(2));
    await flush();

    const second = Number(screen.getByTestId('updatedAt').textContent);
    expect(second).toBeGreaterThanOrEqual(first);
  });
});
