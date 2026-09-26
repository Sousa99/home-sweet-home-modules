import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { Aircraft } from '../../api/types';
import { AircraftCard } from '../AircraftCard';

const aircraft: Aircraft = {
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
};

describe('AircraftCard', () => {
  it('renders identification, distance, and converted flight-state fields', () => {
    render(<AircraftCard aircraft={aircraft} />);
    expect(screen.getByText('DLH400')).toBeInTheDocument();
    expect(screen.getByText('8.2 km')).toBeInTheDocument();
    expect(screen.getByText('Germany')).toBeInTheDocument();
    // 251.2 m/s ≈ 904 km/h
    expect(screen.getByText('904 km/h')).toBeInTheDocument();
    expect(screen.getByText('9144 m')).toBeInTheDocument();
    expect(screen.getByText('88°')).toBeInTheDocument();
  });

  it('falls back to the icao24 when the callsign is missing', () => {
    render(<AircraftCard aircraft={{ ...aircraft, callsign: null }} />);
    expect(screen.getByText('3c6444')).toBeInTheDocument();
  });

  it('shows placeholders for missing flight-state fields', () => {
    render(
      <AircraftCard
        aircraft={{
          ...aircraft,
          altitude: null,
          velocity: null,
          trueTrack: null,
        }}
      />,
    );
    expect(screen.getAllByText('—').length).toBeGreaterThanOrEqual(3);
  });

  it('shows a destination placeholder until a lookup source provides it', () => {
    render(<AircraftCard aircraft={aircraft} />);
    const destinationRow = screen.getByText('Destination');
    expect(destinationRow.nextElementSibling?.textContent).toBe('—');
  });

  it('shows the destination country when available', () => {
    render(
      <AircraftCard
        aircraft={{ ...aircraft, destinationAirport: 'LPPT', destinationCountry: 'Portugal' }}
      />,
    );
    expect(screen.getByText('Portugal')).toBeInTheDocument();
  });

  it('shows the origin country when available', () => {
    render(
      <AircraftCard aircraft={{ ...aircraft, originAirport: 'EDDF', originCountry: 'Germany' }} />,
    );
    expect(screen.getByText('Germany')).toBeInTheDocument();
  });

  it('falls back to the origin airport code when the country is unknown', () => {
    render(<AircraftCard aircraft={{ ...aircraft, originCountry: null, originAirport: 'EDDF' }} />);
    expect(screen.getByText('EDDF')).toBeInTheDocument();
  });

  it('shows a placeholder origin for grounded aircraft without a route', () => {
    render(<AircraftCard aircraft={{ ...aircraft, onGround: true, originCountry: null }} />);
    const originRow = screen.getByText('Origin');
    expect(originRow.nextElementSibling?.textContent).toBe('—');
  });

  it('renders origin and destination as "<city>, <country>"', () => {
    render(
      <AircraftCard
        aircraft={{
          ...aircraft,
          originAirport: 'LPPR',
          originCity: 'Porto',
          originCountry: 'Portugal',
          destinationAirport: 'EDDF',
          destinationCity: 'Frankfurt-am-Main',
          destinationCountry: 'Germany',
        }}
      />,
    );
    expect(screen.getByText('Porto, Portugal')).toBeInTheDocument();
    expect(screen.getByText('Frankfurt-am-Main, Germany')).toBeInTheDocument();
  });

  it('exposes the airport name as a title tooltip', () => {
    render(
      <AircraftCard
        aircraft={{
          ...aircraft,
          destinationAirport: 'LPPR',
          destinationCity: 'Porto',
          destinationCountry: 'Portugal',
          destinationAirportName: 'Francisco de Sá Carneiro Airport',
        }}
      />,
    );
    const destinationRow = screen.getByText('Destination');
    expect(destinationRow.nextElementSibling?.getAttribute('title')).toBe(
      'Francisco de Sá Carneiro Airport',
    );
  });

  it('shows an on-ground badge when applicable', () => {
    render(<AircraftCard aircraft={{ ...aircraft, onGround: true }} />);
    expect(screen.getByText('on ground')).toBeInTheDocument();
  });
});
