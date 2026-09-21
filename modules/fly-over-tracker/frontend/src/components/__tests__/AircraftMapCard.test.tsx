import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { Aircraft } from '../../api/types';
import { AircraftMapCard } from '../AircraftMapCard';

const aircraft: Aircraft = {
  icao24: '3c6444',
  callsign: 'DLH400',
  originCountry: 'Germany',
  destinationAirport: null,
  destinationCountry: null,
  latitude: 48.9211,
  longitude: 2.4288,
  altitude: 9144,
  onGround: false,
  velocity: 251.2,
  trueTrack: 87.5,
  verticalRate: 0,
  distanceKm: 8.2,
};

describe('AircraftMapCard', () => {
  it('renders the callsign and all flight fields in a horizontal row', () => {
    render(<AircraftMapCard aircraft={aircraft} />);
    expect(screen.getByText('DLH400')).toBeInTheDocument();
    expect(screen.getByText('Germany')).toBeInTheDocument();
    expect(screen.getByText('904 km/h')).toBeInTheDocument();
    expect(screen.getByText('9144 m')).toBeInTheDocument();
    expect(screen.getByText('88°')).toBeInTheDocument();
    expect(screen.getByText('8.2 km')).toBeInTheDocument();
  });

  it('shows a destination placeholder until a lookup source provides it', () => {
    render(<AircraftMapCard aircraft={aircraft} />);
    expect(screen.getByText('—')).toBeInTheDocument();
  });

  it('shows the destination country when available', () => {
    render(
      <AircraftMapCard
        aircraft={{ ...aircraft, destinationAirport: 'LPPT', destinationCountry: 'Portugal' }}
      />,
    );
    expect(screen.getByText('Portugal')).toBeInTheDocument();
  });

  it('falls back to the airport code when the country is unknown', () => {
    render(<AircraftMapCard aircraft={{ ...aircraft, destinationAirport: 'LPPT' }} />);
    expect(screen.getByText('LPPT')).toBeInTheDocument();
  });

  it('shows an on-ground indicator when applicable', () => {
    render(<AircraftMapCard aircraft={{ ...aircraft, onGround: true }} />);
    expect(screen.getByText('on ground')).toBeInTheDocument();
  });
});
