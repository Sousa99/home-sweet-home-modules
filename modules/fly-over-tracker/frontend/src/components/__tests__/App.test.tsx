import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { FlyOverResult } from '../../api/types';
import App from '../../App';
import { mapStore, markerStore } from '../../test/react-leaflet-mock';

vi.mock('../../api/client', () => ({
  getFlyOvers: vi.fn(),
  MAX_RADIUS_KM: 463,
}));

import { getFlyOvers } from '../../api/client';

const mockedGetFlyOvers = vi.mocked(getFlyOvers);

function createTestQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
}

function renderApp(): ReturnType<typeof render> {
  return render(
    <QueryClientProvider client={createTestQueryClient()}>
      <App />
    </QueryClientProvider>,
  );
}

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

async function submitValidQuery(user: ReturnType<typeof userEvent.setup>) {
  await user.clear(screen.getByLabelText('Latitude'));
  await user.type(screen.getByLabelText('Latitude'), '48.8566');
  await user.clear(screen.getByLabelText('Longitude'));
  await user.type(screen.getByLabelText('Longitude'), '2.3522');
  await user.clear(screen.getByLabelText('Radius (km)'));
  await user.type(screen.getByLabelText('Radius (km)'), '50');
  await user.click(screen.getByRole('button', { name: 'Find aircraft' }));
}

beforeEach(() => {
  vi.resetAllMocks();
});

describe('App', () => {
  it('shows the query hint before the first search', () => {
    renderApp();
    expect(screen.getByText(/enter a location/i)).toBeInTheDocument();
  });

  it('submits a query and renders the resulting aircraft', async () => {
    const user = userEvent.setup();
    mockedGetFlyOvers.mockResolvedValue(result);
    renderApp();

    await submitValidQuery(user);

    expect(mockedGetFlyOvers).toHaveBeenCalledWith({
      lat: 48.8566,
      lng: 2.3522,
      radiusKm: 50,
    });
    expect(await screen.findByText('DLH400')).toBeInTheDocument();
  });

  it('re-queries the last location on Refresh', async () => {
    const user = userEvent.setup();
    mockedGetFlyOvers.mockResolvedValue(result);
    renderApp();

    await submitValidQuery(user);
    await screen.findByText('DLH400');

    await user.click(screen.getByRole('button', { name: 'Refresh' }));

    expect(mockedGetFlyOvers).toHaveBeenCalledTimes(2);
    expect(mockedGetFlyOvers).toHaveBeenLastCalledWith({
      lat: 48.8566,
      lng: 2.3522,
      radiusKm: 50,
    });
  });

  it('shows an error message when the query fails', async () => {
    const user = userEvent.setup();
    mockedGetFlyOvers.mockRejectedValue(new Error('Aircraft feed is temporarily unavailable'));
    renderApp();

    await submitValidQuery(user);

    expect(await screen.findByRole('alert')).toHaveTextContent('temporarily unavailable');
  });

  it('switches to map mode without re-querying and shows the same aircraft', async () => {
    const user = userEvent.setup();
    mockedGetFlyOvers.mockResolvedValue(result);
    renderApp();

    await submitValidQuery(user);
    await screen.findByText('DLH400');
    mockedGetFlyOvers.mockClear();

    await user.click(screen.getByRole('button', { name: 'Map' }));

    expect(screen.getByTestId('map-container')).toBeInTheDocument();
    // center + edge + the one result aircraft
    expect(screen.getAllByTestId('leaflet-marker')).toHaveLength(3);
    expect(mockedGetFlyOvers).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: 'List' }));
    expect(screen.getByText('DLH400')).toBeInTheDocument();
    expect(mockedGetFlyOvers).not.toHaveBeenCalled();
  });

  it('switches modes before any query without running one', async () => {
    const user = userEvent.setup();
    renderApp();

    await user.click(screen.getByRole('button', { name: 'Map' }));

    expect(screen.getByTestId('map-container')).toBeInTheDocument();
    expect(mockedGetFlyOvers).not.toHaveBeenCalled();
  });

  it('updates the inputs when a location is selected on the map', async () => {
    const user = userEvent.setup();
    renderApp();

    await user.click(screen.getByRole('button', { name: 'Map' }));
    const centerMarker = markerStore.find(
      (marker) =>
        marker.draggable && marker.position.lat === 38.7223 && marker.position.lng === -9.1393,
    );
    expect(centerMarker).toBeDefined();

    await act(async () => {
      centerMarker?.eventHandlers.dragend?.({
        target: { getLatLng: () => ({ lat: 38.7, lng: -9.2 }) },
      });
    });

    expect(screen.getByLabelText('Latitude')).toHaveValue('38.7');
    expect(screen.getByLabelText('Longitude')).toHaveValue('-9.2');
  });

  it('moves the map selection when the inputs change', async () => {
    const user = userEvent.setup();
    mockedGetFlyOvers.mockResolvedValue(result);
    renderApp();

    await submitValidQuery(user);
    await screen.findByText('DLH400');

    await user.click(screen.getByRole('button', { name: 'Map' }));
    await user.clear(screen.getByLabelText('Latitude'));
    await user.type(screen.getByLabelText('Latitude'), '30');

    const centerMarker = markerStore.find(
      (marker) => marker.draggable && marker.position.lat === 30 && marker.position.lng === 2.3522,
    );
    expect(centerMarker).toBeDefined();
  });

  it('submits the shared location selected on the map', async () => {
    const user = userEvent.setup();
    mockedGetFlyOvers.mockResolvedValue(result);
    renderApp();

    await user.click(screen.getByRole('button', { name: 'Map' }));
    const centerMarker = markerStore.find(
      (marker) =>
        marker.draggable && marker.position.lat === 38.7223 && marker.position.lng === -9.1393,
    );
    await act(async () => {
      centerMarker?.eventHandlers.dragend?.({
        target: { getLatLng: () => ({ lat: 48.8566, lng: 2.3522 }) },
      });
    });

    await user.click(screen.getByRole('button', { name: 'Find aircraft' }));

    expect(mockedGetFlyOvers).toHaveBeenCalledWith({ lat: 48.8566, lng: 2.3522, radiusKm: 10 });
  });

  it('centers the selection panel in list mode', () => {
    renderApp();

    const toggle = screen.getByRole('group', { name: 'View mode' });
    const form = screen.getByLabelText('Latitude').closest('form') as HTMLFormElement;

    expect(toggle.parentElement).toHaveClass('flex', 'flex-col', 'items-center', 'gap-4');
    expect(form.parentElement).toHaveClass('w-full', 'max-w-3xl');
  });

  describe('fit on submit', () => {
    it('fits the map once when submitting while in map mode', async () => {
      const user = userEvent.setup();
      mockedGetFlyOvers.mockResolvedValue(result);
      renderApp();

      await user.click(screen.getByRole('button', { name: 'Map' }));
      await submitValidQuery(user);

      expect(mapStore.flyToBoundsCalls).toHaveLength(1);
    });

    it('fits on first map mount when the submit happened in list mode', async () => {
      const user = userEvent.setup();
      mockedGetFlyOvers.mockResolvedValue(result);
      renderApp();

      await submitValidQuery(user);
      expect(mapStore.flyToBoundsCalls).toHaveLength(0);

      await user.click(screen.getByRole('button', { name: 'Map' }));

      expect(mapStore.flyToBoundsCalls).toHaveLength(1);
    });

    it('does not refit when switching modes without a new submit', async () => {
      const user = userEvent.setup();
      mockedGetFlyOvers.mockResolvedValue(result);
      renderApp();

      await user.click(screen.getByRole('button', { name: 'Map' }));
      await submitValidQuery(user);
      await user.click(screen.getByRole('button', { name: 'List' }));
      await user.click(screen.getByRole('button', { name: 'Map' }));

      expect(mapStore.flyToBoundsCalls).toHaveLength(1);
    });

    it('refits when the same selection is submitted again', async () => {
      const user = userEvent.setup();
      mockedGetFlyOvers.mockResolvedValue(result);
      renderApp();

      await user.click(screen.getByRole('button', { name: 'Map' }));
      await submitValidQuery(user);
      await user.click(screen.getByRole('button', { name: 'Find aircraft' }));

      expect(mapStore.flyToBoundsCalls).toHaveLength(2);
    });
  });

  it('centers the selection panel in map mode', async () => {
    const user = userEvent.setup();
    renderApp();

    await user.click(screen.getByRole('button', { name: 'Map' }));

    const toggle = screen.getByRole('group', { name: 'View mode' });
    const form = screen.getByLabelText('Latitude').closest('form') as HTMLFormElement;

    expect(toggle.parentElement).toHaveClass('flex', 'flex-col', 'items-center', 'gap-4');
    expect(form.parentElement).toHaveClass('w-full', 'max-w-3xl');
    expect(screen.getByTestId('map-container')).toBeInTheDocument();
  });

  it('prefills the inputs with the default location on first load', () => {
    renderApp();

    expect(screen.getByLabelText('Latitude')).toHaveValue('38.7223');
    expect(screen.getByLabelText('Longitude')).toHaveValue('-9.1393');
    expect(screen.getByLabelText('Radius (km)')).toHaveValue('10');
  });

  it('shows a waiting-for-search notice when the inputs diverge from the submitted query', async () => {
    const user = userEvent.setup();
    mockedGetFlyOvers.mockResolvedValue(result);
    renderApp();

    await submitValidQuery(user);
    await screen.findByText('DLH400');
    expect(screen.queryByText(/Waiting for search/)).not.toBeInTheDocument();

    await user.clear(screen.getByLabelText('Latitude'));
    await user.type(screen.getByLabelText('Latitude'), '40');
    expect(screen.getByText(/Waiting for search/)).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveClass('fixed');

    await user.click(screen.getByRole('button', { name: 'Find aircraft' }));
    await screen.findByText('DLH400');
    expect(screen.queryByText(/Waiting for search/)).not.toBeInTheDocument();
  });

  it('shows an updating indicator during a refresh and clears it after', async () => {
    const user = userEvent.setup();
    let resolveFlyOvers!: (value: FlyOverResult) => void;
    mockedGetFlyOvers.mockResolvedValueOnce(result).mockImplementationOnce(
      () =>
        new Promise<FlyOverResult>((resolve) => {
          resolveFlyOvers = resolve;
        }),
    );
    renderApp();

    await submitValidQuery(user);
    await screen.findByText('DLH400');

    await user.click(screen.getByRole('button', { name: 'Refresh' }));
    expect(screen.getByText('Updating…')).toBeInTheDocument();

    await act(async () => {
      resolveFlyOvers(result);
    });
    await waitFor(() => expect(screen.queryByText('Updating…')).not.toBeInTheDocument());
  });

  describe('auto-refresh', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    function submitValidQuerySync(): void {
      fireEvent.change(screen.getByLabelText('Latitude'), { target: { value: '48.8566' } });
      fireEvent.change(screen.getByLabelText('Longitude'), { target: { value: '2.3522' } });
      fireEvent.change(screen.getByLabelText('Radius (km)'), { target: { value: '50' } });
      fireEvent.click(screen.getByRole('button', { name: 'Find aircraft' }));
    }

    function setRefreshRate(rate: string): void {
      fireEvent.change(screen.getByLabelText('Auto-refresh'), { target: { value: rate } });
    }

    async function flush(): Promise<void> {
      await act(async () => {});
    }

    async function advance(ms: number): Promise<void> {
      await act(async () => {
        await vi.advanceTimersByTimeAsync(ms);
      });
    }

    it('re-queries the last submitted query at the selected cadence', async () => {
      mockedGetFlyOvers.mockResolvedValue(result);
      renderApp();

      submitValidQuerySync();
      await flush();
      setRefreshRate('10');
      await flush();
      expect(mockedGetFlyOvers).toHaveBeenCalledTimes(1);

      await advance(10_000);
      expect(mockedGetFlyOvers).toHaveBeenCalledTimes(2);

      await advance(10_000);
      expect(mockedGetFlyOvers).toHaveBeenCalledTimes(3);
    });

    it('does not auto-refresh when the rate is off', async () => {
      mockedGetFlyOvers.mockResolvedValue(result);
      renderApp();

      submitValidQuerySync();
      await flush();
      mockedGetFlyOvers.mockClear();

      await advance(30_000);
      expect(mockedGetFlyOvers).not.toHaveBeenCalled();
    });

    it('resets the interval when the rate changes', async () => {
      mockedGetFlyOvers.mockResolvedValue(result);
      renderApp();

      submitValidQuerySync();
      await flush();
      mockedGetFlyOvers.mockClear();

      setRefreshRate('5');
      await flush();
      await advance(5_000);
      expect(mockedGetFlyOvers).toHaveBeenCalledTimes(1);

      setRefreshRate('60');
      await flush();
      await advance(10_000);
      expect(mockedGetFlyOvers).toHaveBeenCalledTimes(1);
    });

    it('does not poll while a fetch is still in flight', async () => {
      let resolveFlyOvers!: (value: FlyOverResult) => void;
      mockedGetFlyOvers.mockImplementation(
        () =>
          new Promise<FlyOverResult>((resolve) => {
            resolveFlyOvers = resolve;
          }),
      );
      renderApp();

      submitValidQuerySync();
      setRefreshRate('10');
      await flush();

      await advance(10_000);
      expect(mockedGetFlyOvers).toHaveBeenCalledTimes(1);

      await act(async () => {
        resolveFlyOvers(result);
      });
      await flush();
      await advance(10_000);
      expect(mockedGetFlyOvers).toHaveBeenCalledTimes(2);
    });

    it('does not poll before a query has been submitted', async () => {
      mockedGetFlyOvers.mockResolvedValue(result);
      renderApp();

      setRefreshRate('10');
      await advance(30_000);
      expect(mockedGetFlyOvers).not.toHaveBeenCalled();
    });

    it('pauses auto-refresh while the draft is stale and resumes after submit', async () => {
      mockedGetFlyOvers.mockResolvedValue(result);
      renderApp();

      submitValidQuerySync();
      await flush();
      setRefreshRate('10');
      await flush();
      mockedGetFlyOvers.mockClear();

      fireEvent.change(screen.getByLabelText('Latitude'), { target: { value: '40' } });
      await flush();
      await advance(30_000);
      expect(mockedGetFlyOvers).not.toHaveBeenCalled();

      fireEvent.click(screen.getByRole('button', { name: 'Find aircraft' }));
      await flush();
      await advance(10_000);
      expect(mockedGetFlyOvers).toHaveBeenCalledTimes(2);
    });
  });
});
