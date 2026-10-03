import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AircraftMapView } from '../AircraftMapView';
import {
  mapStore,
  markerStore,
  resizeObserverStore,
  tileLayerUrls,
} from '../../test/react-leaflet-mock';
import { circleBounds } from '../../lib/location';
import type { Aircraft } from '../../api/types';

const CENTER = { lat: 48.8566, lng: 2.3522 };

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

function findMarker(lat: number, lng: number) {
  return markerStore.find(
    (marker) =>
      Math.abs(marker.position.lat - lat) < 1e-6 && Math.abs(marker.position.lng - lng) < 1e-6,
  );
}

describe('AircraftMapView', () => {
  it('renders the map container centered on the configured location', () => {
    render(<AircraftMapView center={CENTER} radiusKm={50} />);

    const container = screen.getByTestId('map-container');
    expect(container).toBeInTheDocument();
    expect(container).toHaveAttribute('data-center-lat', '48.8566');
    expect(container).toHaveAttribute('data-center-lng', '2.3522');
  });

  it('renders the radius circle with the radius in meters', () => {
    render(<AircraftMapView center={CENTER} radiusKm={50} />);

    expect(screen.getByTestId('leaflet-circle')).toHaveAttribute('data-radius-meters', '50000');
  });

  it('renders one read-only marker per aircraft with no drag handlers', () => {
    render(<AircraftMapView center={CENTER} radiusKm={50} aircraft={[aircraft]} />);

    const aircraftMarker = findMarker(aircraft.latitude, aircraft.longitude);
    expect(aircraftMarker).toBeDefined();
    expect(aircraftMarker?.draggable).toBe(false);
    expect(Object.keys(aircraftMarker?.eventHandlers ?? {})).toHaveLength(0);
  });

  it('has no draggable selection markers (read-only view)', () => {
    render(<AircraftMapView center={CENTER} radiusKm={50} aircraft={[aircraft]} />);

    expect(markerStore.filter((marker) => marker.draggable)).toHaveLength(0);
  });

  it('shows a callsign tooltip per aircraft', () => {
    render(<AircraftMapView center={CENTER} radiusKm={50} aircraft={[aircraft]} />);

    expect(screen.getByTestId('leaflet-tooltip')).toHaveTextContent('DLH400');
  });

  it('uses the rotated plane icon for aircraft markers', () => {
    render(<AircraftMapView center={CENTER} radiusKm={50} aircraft={[aircraft]} />);

    const aircraftMarker = findMarker(aircraft.latitude, aircraft.longitude);
    expect(aircraftMarker?.icon).toBeDefined();
  });

  it('fits the circle bounds on mount', () => {
    render(<AircraftMapView center={CENTER} radiusKm={50} />);

    expect(mapStore.flyToBoundsCalls).toHaveLength(1);
    const box = circleBounds(CENTER, 50);
    const [sw, ne] = mapStore.flyToBoundsCalls[0]!.bounds as [[number, number], [number, number]];
    expect(sw[0]).toBeLessThanOrEqual(box.southwest.lat);
    expect(ne[0]).toBeGreaterThanOrEqual(box.northeast.lat);
    expect(mapStore.flyToBoundsCalls[0]!.options?.maxZoom).toBe(19);
  });

  it('refits when the location changes and not on unrelated re-renders', () => {
    const { rerender } = render(<AircraftMapView center={CENTER} radiusKm={50} />);
    expect(mapStore.flyToBoundsCalls).toHaveLength(1);

    rerender(<AircraftMapView center={CENTER} radiusKm={50} aircraft={[aircraft]} />);
    expect(mapStore.flyToBoundsCalls).toHaveLength(1);

    rerender(<AircraftMapView center={{ lat: 49, lng: 3 }} radiusKm={50} />);
    expect(mapStore.flyToBoundsCalls).toHaveLength(2);

    rerender(<AircraftMapView center={{ lat: 49, lng: 3 }} radiusKm={80} />);
    expect(mapStore.flyToBoundsCalls).toHaveLength(3);
  });

  it('defers the fit until the container reports a real size', () => {
    vi.useFakeTimers();
    try {
      mapStore.size = { x: 0, y: 0 };
      render(<AircraftMapView center={CENTER} radiusKm={50} />);
      expect(mapStore.flyToBoundsCalls).toHaveLength(0);

      mapStore.size = { x: 800, y: 420 };
      vi.advanceTimersByTime(40);
      expect(mapStore.flyToBoundsCalls).toHaveLength(1);
    } finally {
      vi.useRealTimers();
    }
  });

  it('defers a resize re-fit while the fit animation is in flight', () => {
    vi.useFakeTimers();
    try {
      render(<AircraftMapView center={CENTER} radiusKm={50} />);
      expect(mapStore.flyToBoundsCalls).toHaveLength(1);

      // A resize lands while the fit is still animating → it must be ignored
      // (invalidateSize would otherwise cancel the flyToBounds animation).
      mapStore.size = { x: 900, y: 500 };
      resizeObserverStore.instances[0]?.trigger();
      vi.advanceTimersByTime(60);
      expect(mapStore.flyToBoundsCalls).toHaveLength(1);
    } finally {
      vi.useRealTimers();
    }
  });

  it('re-fits when the container size changes after the fit settles', () => {
    vi.useFakeTimers();
    try {
      render(<AircraftMapView center={CENTER} radiusKm={50} />);
      mapStore.fire('zoomend');
      mapStore.fire('moveend');

      mapStore.size = { x: 900, y: 500 };
      resizeObserverStore.instances[0]?.trigger();
      vi.advanceTimersByTime(60);
      expect(mapStore.flyToBoundsCalls).toHaveLength(2);
    } finally {
      vi.useRealTimers();
    }
  });

  it('uses the default OpenStreetMap tiles', () => {
    render(<AircraftMapView center={CENTER} radiusKm={50} />);
    expect(tileLayerUrls[0]).toBe('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png');
  });

  it('logs layout diagnostics to the console when debug is enabled', () => {
    const spy = vi.spyOn(console, 'info').mockImplementation(() => undefined);
    try {
      render(<AircraftMapView center={CENTER} radiusKm={50} debug />);
      expect(spy).toHaveBeenCalledWith('[fly-over-map]', 'mount', expect.anything());
      expect(spy).toHaveBeenCalledWith('[fly-over-map]', 'fit', expect.anything());
    } finally {
      spy.mockRestore();
    }
  });
});
