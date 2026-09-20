import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { FlyOverResult } from '../../api/types';
import App from '../../App';

vi.mock('../../api/client', () => ({
  getFlyOvers: vi.fn(),
  MAX_RADIUS_KM: 500,
}));

import { getFlyOvers } from '../../api/client';

const mockedGetFlyOvers = vi.mocked(getFlyOvers);

const result: FlyOverResult = {
  center: { lat: 48.8566, lng: 2.3522 },
  radiusKm: 50,
  asOf: 1_726_900_000,
  count: 1,
  aircraft: [
    {
      icao24: '3c6444',
      callsign: 'DLH400',
      originCountry: 'Germany',
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
});
