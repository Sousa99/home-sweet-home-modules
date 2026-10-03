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

export interface MockedFlyToBoundsCall {
  bounds: unknown;
  options?: Record<string, unknown>;
}

export interface MockedMap {
  flyToBounds: (bounds: unknown, options?: Record<string, unknown>) => void;
  getSize: () => { x: number; y: number };
  getZoom: () => number;
  getCenter: () => { lat: number; lng: number };
  /** The container element Leaflet tracks (used by `invalidateSize`). */
  getContainer: () => HTMLElement;
  /** Recomputes the viewport size (see `AircraftMapView`'s layout controller). */
  invalidateSize: (options?: unknown) => void;
  /** Runs `fn` once the map is ready (the mock is immediately ready). */
  whenReady: (fn: () => void) => void;
  /** Subscribe to a Leaflet event (e.g. `tileload`). */
  on: (type: string, fn: (event?: unknown) => void) => void;
  /** Unsubscribe from a Leaflet event. */
  off: (type: string, fn: (event?: unknown) => void) => void;
}

export interface MapStore {
  /** The shared fake map instance returned by `useMap()`. */
  map: MockedMap;
  /** Each `flyToBounds` invocation on the fake map, in call order. */
  flyToBoundsCalls: MockedFlyToBoundsCall[];
  /** The container size reported by `getSize()` (configurable per test). */
  size: { x: number; y: number };
  /** The zoom reported by `getZoom()`. */
  zoom: number;
  /** Dispatch a Leaflet event to registered listeners. */
  fire: (type: string) => void;
}

const listeners = new Map<string, Set<(event?: unknown) => void>>();

function createMockedMap(): MockedMap {
  return {
    flyToBounds: (bounds, options) => {
      mapStore.flyToBoundsCalls.push({ bounds, options });
    },
    getSize: () => ({ ...mapStore.size }),
    getZoom: () => mapStore.zoom,
    getCenter: () => ({ lat: 0, lng: 0 }),
    getContainer: () => document.createElement('div'),
    invalidateSize: () => undefined,
    whenReady: (fn) => fn(),
    on: (type, fn) => {
      const set = listeners.get(type) ?? new Set();
      set.add(fn);
      listeners.set(type, set);
    },
    off: (type, fn) => {
      listeners.get(type)?.delete(fn);
    },
  };
}

/** Map instance, fit calls, size/zoom, and event dispatch for tests. */
export const mapStore: MapStore = {
  map: createMockedMap(),
  flyToBoundsCalls: [],
  size: { x: 800, y: 420 },
  zoom: 10,
  fire: (type) => {
    for (const fn of listeners.get(type) ?? []) fn({ type });
  },
};

export interface ResizeObserverMockInstance {
  trigger: () => void;
}

/** Instances of the fake `ResizeObserver` (see `src/test/setup.ts`). */
export const resizeObserverStore: { instances: ResizeObserverMockInstance[] } = {
  instances: [],
};

/** Clears `resizeObserverStore`; call between renders in a test. */
export function resetResizeObserverStore(): void {
  resizeObserverStore.instances = [];
}

/** Clears `mapStore` and rebuilds a fresh fake map; call between renders. */
export function resetMapStore(): void {
  listeners.clear();
  mapStore.flyToBoundsCalls = [];
  mapStore.size = { x: 800, y: 420 };
  mapStore.zoom = 10;
  mapStore.map = createMockedMap();
}

/** Returns the shared fake map instance (mirrors `react-leaflet`'s `useMap`). */
export function useMap(): MockedMap {
  return mapStore.map;
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
  url?: unknown;
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

/** Tile layer URLs rendered by the current test render, in render order. */
export const tileLayerUrls: string[] = [];

/** Clears `tileLayerUrls`; call between renders in a test. */
export function resetTileLayerUrls(): void {
  tileLayerUrls.length = 0;
}

export function TileLayer({ url }: MockProps) {
  if (typeof url === 'string') tileLayerUrls.push(url);
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
