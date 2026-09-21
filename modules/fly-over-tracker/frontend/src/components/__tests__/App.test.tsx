import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { FlyOverResult } from '../../api/types';
import App from '../../App';
import { markerStore } from '../../test/react-leaflet-mock';

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

async function submitValidQuery(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText('Latitude'), '48.8566');
  await user.type(screen.getByLabelText('Longitude'), '2.3522');
  await user.type(screen.getByLabelText('Radius (km)'), '50');
  await user.click(screen.getByRole('button', { name: 'Find aircraft' }));
}

beforeEach(() => {
  vi.resetAllMocks();
});

describe('App', () => {
  it('shows the query hint before the first search', () => {
    render(<App />);
    expect(screen.getByText(/enter a location/i)).toBeInTheDocument();
  });

  it('submits a query and renders the resulting aircraft', async () => {
    const user = userEvent.setup();
    mockedGetFlyOvers.mockResolvedValue(result);
    render(<App />);

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
    render(<App />);

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
    render(<App />);

    await submitValidQuery(user);

    expect(await screen.findByRole('alert')).toHaveTextContent('temporarily unavailable');
  });

  it('switches to map mode without re-querying and shows the same aircraft', async () => {
    const user = userEvent.setup();
    mockedGetFlyOvers.mockResolvedValue(result);
    render(<App />);

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
    render(<App />);

    await user.click(screen.getByRole('button', { name: 'Map' }));

    expect(screen.getByTestId('map-container')).toBeInTheDocument();
    expect(mockedGetFlyOvers).not.toHaveBeenCalled();
  });

  it('updates the inputs when a location is selected on the map', async () => {
    const user = userEvent.setup();
    render(<App />);

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
    render(<App />);

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
    render(<App />);

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
});
