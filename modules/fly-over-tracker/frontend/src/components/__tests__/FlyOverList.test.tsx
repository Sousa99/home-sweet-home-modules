import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { FlyOverResult } from '../../api/types';
import { FlyOverList } from '../FlyOverList';

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

describe('FlyOverList', () => {
  it('shows a hint in the idle state', () => {
    render(<FlyOverList status="idle" result={null} onRefresh={() => {}} />);
    expect(screen.getByText(/enter a location/i)).toHaveClass('text-center');
  });

  it('shows a loading message while querying', () => {
    render(<FlyOverList status="loading" result={null} onRefresh={() => {}} />);
    expect(screen.getByText('Loading aircraft…')).toHaveClass('text-center');
  });

  it('shows the error message on failure', () => {
    render(
      <FlyOverList
        status="error"
        result={null}
        error="Aircraft feed is temporarily unavailable"
        onRefresh={() => {}}
      />,
    );
    expect(screen.getByRole('alert')).toHaveTextContent('temporarily unavailable');
  });

  it('renders aircraft with an as-of timestamp and a working refresh button', async () => {
    const user = userEvent.setup();
    const onRefresh = vi.fn();
    render(<FlyOverList status="success" result={result} onRefresh={onRefresh} />);

    expect(screen.getByText('DLH400')).toBeInTheDocument();
    expect(screen.getByText('Germany')).toBeInTheDocument();
    expect(screen.getByText('8.2 km')).toBeInTheDocument();
    expect(screen.getByText(/as of/i)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Refresh' }));
    expect(onRefresh).toHaveBeenCalledTimes(1);
  });

  it('shows an empty state with a refresh button when no aircraft are in range', () => {
    const empty: FlyOverResult = {
      ...result,
      count: 0,
      aircraft: [],
    };
    render(<FlyOverList status="success" result={empty} onRefresh={() => {}} />);
    expect(screen.getByText(/no aircraft/i)).toHaveClass('text-center');
    expect(screen.getByRole('button', { name: 'Refresh' })).toBeInTheDocument();
  });
});
