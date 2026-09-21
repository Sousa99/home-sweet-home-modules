import { describe, expect, it, vi } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import { FlyOverMap } from '../FlyOverMap';
import { markerStore } from '../../test/react-leaflet-mock';
import { destPoint } from '../../lib/location';
import type { Aircraft } from '../../api/types';

const CENTER = { lat: 48.8566, lng: 2.3522 };

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

function findMarker(lat: number, lng: number) {
  return markerStore.find(
    (marker) =>
      Math.abs(marker.position.lat - lat) < 1e-6 && Math.abs(marker.position.lng - lng) < 1e-6,
  );
}

describe('FlyOverMap', () => {
  it('renders the map container, radius circle, and markers', () => {
    render(
      <FlyOverMap
        center={CENTER}
        radiusKm={50}
        aircraft={[aircraft]}
        onCenterChange={vi.fn()}
        onRadiusChange={vi.fn()}
      />,
    );

    expect(screen.getByTestId('map-container')).toBeInTheDocument();
    expect(screen.getByTestId('leaflet-circle')).toHaveAttribute('data-radius-meters', '50000');
    // center + edge + 1 aircraft
    expect(screen.getAllByTestId('leaflet-marker')).toHaveLength(3);
  });

  it('reports the new center when the center marker is dragged', async () => {
    const onCenterChange = vi.fn();
    render(
      <FlyOverMap
        center={CENTER}
        radiusKm={50}
        onCenterChange={onCenterChange}
        onRadiusChange={vi.fn()}
      />,
    );

    const centerMarker = findMarker(CENTER.lat, CENTER.lng);
    expect(centerMarker?.draggable).toBe(true);
    await act(async () => {
      centerMarker?.eventHandlers.dragend?.({
        target: { getLatLng: () => ({ lat: 48.9, lng: 2.4 }) },
      });
    });

    expect(onCenterChange).toHaveBeenCalledWith({ lat: 48.9, lng: 2.4 });
    expect(onCenterChange).toHaveBeenCalledTimes(1);
  });

  it('reports the recomputed radius when the edge marker is dragged', async () => {
    const onRadiusChange = vi.fn();
    render(
      <FlyOverMap
        center={CENTER}
        radiusKm={50}
        onCenterChange={vi.fn()}
        onRadiusChange={onRadiusChange}
      />,
    );

    const edge = destPoint(CENTER, 50, 0);
    const edgeMarker = findMarker(edge.lat, edge.lng);
    expect(edgeMarker?.draggable).toBe(true);

    const newEdge = destPoint(CENTER, 80, 0);
    await act(async () => {
      edgeMarker?.eventHandlers.dragend?.({ target: { getLatLng: () => newEdge } });
    });

    expect(onRadiusChange).toHaveBeenCalledTimes(1);
    const [reported] = onRadiusChange.mock.calls[0] as [number];
    expect(reported).toBeGreaterThan(79);
    expect(reported).toBeLessThan(81);
  });

  it('renders aircraft markers as read-only', () => {
    render(
      <FlyOverMap
        center={CENTER}
        radiusKm={50}
        aircraft={[aircraft]}
        onCenterChange={vi.fn()}
        onRadiusChange={vi.fn()}
      />,
    );

    const aircraftMarker = findMarker(aircraft.latitude, aircraft.longitude);
    expect(aircraftMarker).toBeDefined();
    expect(aircraftMarker?.draggable).toBe(false);
    expect(Object.keys(aircraftMarker?.eventHandlers ?? {})).toHaveLength(0);
  });

  it('shows a callsign label and a docked horizontal card per aircraft', () => {
    render(
      <FlyOverMap
        center={CENTER}
        radiusKm={50}
        aircraft={[aircraft]}
        onCenterChange={vi.fn()}
        onRadiusChange={vi.fn()}
      />,
    );

    const tooltip = screen.getByTestId('leaflet-tooltip');
    expect(tooltip).toHaveTextContent('DLH400');

    // Callsign appears in the marker tooltip and the docked card.
    expect(screen.getAllByText('DLH400').length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText('Germany')).toBeInTheDocument();
    expect(screen.getByText('904 km/h')).toBeInTheDocument();
    expect(screen.getByText('9144 m')).toBeInTheDocument();
    expect(screen.getByText('88°')).toBeInTheDocument();
    expect(screen.getByText('8.2 km')).toBeInTheDocument();
  });

  it('uses a custom plane icon for aircraft and the default for selection markers', () => {
    render(
      <FlyOverMap
        center={CENTER}
        radiusKm={50}
        aircraft={[aircraft]}
        onCenterChange={vi.fn()}
        onRadiusChange={vi.fn()}
      />,
    );

    const aircraftMarker = findMarker(aircraft.latitude, aircraft.longitude);
    expect(aircraftMarker?.icon).toBeDefined();

    const selectionMarkers = markerStore.filter((marker) => marker.draggable);
    expect(selectionMarkers).toHaveLength(2);
    for (const marker of selectionMarkers) {
      expect(marker.icon).toBeUndefined();
    }
  });

  it('only wires drag handlers on the two selection markers (pan/zoom cannot change selection)', () => {
    render(
      <FlyOverMap
        center={CENTER}
        radiusKm={50}
        aircraft={[aircraft]}
        onCenterChange={vi.fn()}
        onRadiusChange={vi.fn()}
      />,
    );

    expect(markerStore.filter((marker) => marker.draggable)).toHaveLength(2);
    const withHandlers = markerStore.filter(
      (marker) => Object.keys(marker.eventHandlers).length > 0,
    );
    expect(withHandlers).toHaveLength(2);
    for (const marker of withHandlers) {
      expect(Object.keys(marker.eventHandlers)).toEqual(['dragend']);
    }
  });

  it('does not fire callbacks when props change (no self-triggering)', () => {
    const onCenterChange = vi.fn();
    const onRadiusChange = vi.fn();
    const { rerender } = render(
      <FlyOverMap
        center={CENTER}
        radiusKm={50}
        onCenterChange={onCenterChange}
        onRadiusChange={onRadiusChange}
      />,
    );

    rerender(
      <FlyOverMap
        center={{ lat: 49, lng: 3 }}
        radiusKm={80}
        onCenterChange={onCenterChange}
        onRadiusChange={onRadiusChange}
      />,
    );

    expect(onCenterChange).not.toHaveBeenCalled();
    expect(onRadiusChange).not.toHaveBeenCalled();
  });
});
