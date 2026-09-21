import { createElement, type ReactNode } from 'react';

/**
 * Minimal jsdom-safe stand-in for `react-leaflet`.
 *
 * Real Leaflet needs a browser DOM (tile loading, CSS, getBoundingClientRect,
 * etc.) that jsdom does not provide. This mock renders light divs carrying the
 * values components care about (marker positions, circle radius, container
 * center) and records each rendered marker — including its event handlers — in
 * `markerStore` so tests can drive drag events deterministically.
 *
 * The mock is wired globally via `vi.mock('react-leaflet', ...)` in
 * `src/test/setup.ts`.
 */

export interface MockedMarker {
  position: { lat: number; lng: number };
  draggable: boolean;
  eventHandlers: Record<string, (event: unknown) => void>;
  icon?: unknown;
}

/** Markers rendered by the current test render, in render order. */
export const markerStore: MockedMarker[] = [];

/** Clears `markerStore`; call between renders in a test. */
export function resetMarkerStore(): void {
  markerStore.length = 0;
}

interface MockProps {
  children?: ReactNode;
  className?: string;
  center?: unknown;
  position?: unknown;
  radius?: unknown;
  draggable?: boolean;
  eventHandlers?: Record<string, (event: unknown) => void>;
  icon?: unknown;
}

function toPoint(position: unknown): { lat: number; lng: number } {
  if (position == null) return { lat: 0, lng: 0 };
  if (Array.isArray(position)) {
    return { lat: Number(position[0]), lng: Number(position[1]) };
  }
  const point = position as { lat: number; lng: number };
  return { lat: Number(point.lat), lng: Number(point.lng) };
}

export function MapContainer({ children, center, className }: MockProps) {
  const point = toPoint(center);
  return createElement(
    'div',
    {
      'data-testid': 'map-container',
      className,
      'data-center-lat': point.lat,
      'data-center-lng': point.lng,
      style: { height: '100%' },
    },
    children,
  );
}

export function TileLayer(): null {
  return null;
}

export function Circle({ center, radius }: MockProps) {
  const point = toPoint(center);
  return createElement('div', {
    'data-testid': 'leaflet-circle',
    'data-center-lat': point.lat,
    'data-center-lng': point.lng,
    'data-radius-meters': String(radius),
  });
}

export function Marker({
  position,
  draggable = false,
  eventHandlers = {},
  icon,
  children,
}: MockProps) {
  const point = toPoint(position);
  markerStore.push({
    position: point,
    draggable: Boolean(draggable),
    eventHandlers: eventHandlers as MockedMarker['eventHandlers'],
    icon,
  });
  return createElement(
    'div',
    {
      'data-testid': 'leaflet-marker',
      'data-lat': point.lat,
      'data-lng': point.lng,
      'data-draggable': String(Boolean(draggable)),
    },
    children,
  );
}

export function Tooltip({ children }: MockProps) {
  return createElement('div', { 'data-testid': 'leaflet-tooltip' }, children);
}
