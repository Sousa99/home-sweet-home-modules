import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { Aircraft, FlyOverResult, LocationQuery } from '../../api/types';
import { FlyOverWidget } from '../FlyOverWidget';
import { ClosestAircraftCard } from '../ClosestAircraftCard';

vi.mock('../../api/client', () => ({
  getFlyOvers: vi.fn(),
  MAX_RADIUS_KM: 463,
}));

import { getFlyOvers } from '../../api/client';

const mockedGetFlyOvers = vi.mocked(getFlyOvers);

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

async function flush(): Promise<void> {
  await act(async () => {});
}

async function advance(ms: number): Promise<void> {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });
}

beforeEach(() => {
  vi.resetAllMocks();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('live updates across dashboard widgets', () => {
  describe('auto-refresh cadence', () => {
    it('refetches FlyOverWidget on the auto-refresh interval', async () => {
      vi.useFakeTimers();
      mockedGetFlyOvers.mockResolvedValue(result([dlh, ryr]));
      render(<FlyOverWidget location={location} autoRefresh={5} />);
      await advance(0);
      expect(mockedGetFlyOvers).toHaveBeenCalledTimes(1);

      await advance(5_000);
      expect(mockedGetFlyOvers).toHaveBeenCalledTimes(2);

      await advance(5_000);
      expect(mockedGetFlyOvers).toHaveBeenCalledTimes(3);
    });

    it('refetches ClosestAircraftCard on the auto-refresh interval', async () => {
      vi.useFakeTimers();
      mockedGetFlyOvers.mockResolvedValue(result([dlh, ryr]));
      render(<ClosestAircraftCard location={location} autoRefresh={5} />);
      await advance(0);
      expect(mockedGetFlyOvers).toHaveBeenCalledTimes(1);

      await advance(5_000);
      expect(mockedGetFlyOvers).toHaveBeenCalledTimes(2);
    });

    it('does not auto-refresh either widget when the rate is off', async () => {
      vi.useFakeTimers();
      mockedGetFlyOvers.mockResolvedValue(result([dlh]));
      render(<FlyOverWidget location={location} />);
      render(<ClosestAircraftCard location={location} />);
      await advance(0);
      mockedGetFlyOvers.mockClear();

      await advance(30_000);
      expect(mockedGetFlyOvers).not.toHaveBeenCalled();
    });

    it('does not poll while a fetch is still in flight', async () => {
      vi.useFakeTimers();
      let resolveFirst!: (value: FlyOverResult) => void;
      mockedGetFlyOvers.mockImplementation(
        () =>
          new Promise<FlyOverResult>((resolve) => {
            resolveFirst = resolve;
          }),
      );
      render(<FlyOverWidget location={location} autoRefresh={5} />);
      await advance(0);

      await advance(15_000);
      expect(mockedGetFlyOvers).toHaveBeenCalledTimes(1);

      await act(async () => {
        resolveFirst(result([dlh]));
      });
      await advance(0);
      await advance(5_000);
      expect(mockedGetFlyOvers).toHaveBeenCalledTimes(2);
    });
  });

  describe('update feedback', () => {
    it('shows the updating indicator during a manual refresh and clears it after', async () => {
      let resolveRefetch!: (value: FlyOverResult) => void;
      mockedGetFlyOvers.mockResolvedValueOnce(result([dlh])).mockImplementationOnce(
        () =>
          new Promise<FlyOverResult>((resolve) => {
            resolveRefetch = resolve;
          }),
      );
      render(<FlyOverWidget location={location} />);
      await screen.findAllByText('DLH400');

      fireEvent.click(screen.getByRole('button', { name: 'Refresh' }));
      await flush();
      expect(mockedGetFlyOvers).toHaveBeenCalledTimes(2);
      await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Updating…'));

      await act(async () => {
        resolveRefetch(result([ryr]));
      });
      await waitFor(() => expect(screen.queryByText('Updating…')).not.toBeInTheDocument());
      expect(screen.getAllByText('RYR45A').length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('closest-change transition', () => {
    it('presents each closest-aircraft change as a single keyed transition with no stale content', async () => {
      const sequence = [
        result([dlh, ryr]),
        result([
          { ...ryr, distanceKm: 3 },
          { ...dlh, distanceKm: 20 },
        ]),
        result([dlh, ryr]),
      ];
      let call = 0;
      mockedGetFlyOvers.mockImplementation(() =>
        Promise.resolve(sequence[Math.min(call++, sequence.length - 1)]!),
      );
      render(<ClosestAircraftCard location={location} />);
      await screen.findByText('DLH400');

      const animated = () => document.querySelector('.animate-closest-card-in');
      expect(animated()?.textContent).toContain('DLH400');

      fireEvent.click(screen.getByRole('button', { name: 'Refresh' }));
      await waitFor(() => expect(animated()?.textContent).toContain('RYR45A'));
      expect(animated()?.textContent).not.toContain('DLH400');

      fireEvent.click(screen.getByRole('button', { name: 'Refresh' }));
      await waitFor(() => expect(animated()?.textContent).toContain('DLH400'));
      expect(animated()?.textContent).not.toContain('RYR45A');
    });
  });
});
