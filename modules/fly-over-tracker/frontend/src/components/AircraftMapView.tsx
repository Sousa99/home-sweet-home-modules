import 'leaflet/dist/leaflet.css';
import { useEffect, useRef } from 'react';
import type { JSX } from 'react';
import { Circle, MapContainer, Marker, TileLayer, Tooltip, useMap } from 'react-leaflet';
import type { Aircraft, Center } from '../api/types';
import { createAircraftIcon } from '../lib/aircraftIcon';
import { configureDefaultMarkerIcons } from '../lib/leaflet';
import { circleBounds, clampLat } from '../lib/location';
import { cn } from '../lib/utils';

/** Fraction of the circle bounding box added as margin on each side of the fit. */
const FIT_PADDING_RATIO = 0.01;
/** Maximum zoom the fit will request; matches the OSM tile layer ceiling (z19). */
const FIT_MAX_ZOOM = 19;
/** Maximum reload attempts for a single failed tile. */
const TILE_MAX_RETRIES = 3;
/** Base delay before retrying a failed tile; grows linearly per attempt. */
const TILE_RETRY_BASE_MS = 300;

/**
 * Keeps Leaflet's viewport in sync with its container. The dashboard hosts the
 * map inside a flex/grid cell whose size is only known after layout; if Leaflet
 * initializes at that moment it can compute a wrong (often 0) size and render
 * blank regions with only some tiles loaded. `invalidateSize()` on mount and on
 * every container resize fixes both the initial fit and later reflows.
 */
function MapSizeSync() {
  const map = useMap();
  useEffect(() => {
    const container = map.getContainer();
    const sync = () => map.invalidateSize();
    sync();
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(sync);
    observer.observe(container);
    return () => observer.disconnect();
  }, [map]);
  return null;
}

const tileRetries = new WeakMap<HTMLElement, number>();

/**
 * Retry a failed tile a bounded number of times with a growing delay, so
 * transient errors and rate-limited (429) tiles get a chance to recover without
 * hammering the tile server. Permanently failing tiles give up after
 * `TILE_MAX_RETRIES`.
 */
function retryFailedTile(tile: HTMLElement | undefined): void {
  if (!tile) return;
  const attempt = (tileRetries.get(tile) ?? 0) + 1;
  if (attempt > TILE_MAX_RETRIES) return;
  tileRetries.set(tile, attempt);
  const src = tile.getAttribute('src');
  tile.removeAttribute('src');
  window.setTimeout(() => {
    if (src) tile.setAttribute('src', src);
  }, TILE_RETRY_BASE_MS * attempt);
}

/**
 * Moves the map view to the configured selection so the radius circle fills
 * most of the frame. Fits once per distinct center/radius (and on mount);
 * unrelated re-renders (e.g. aircraft updates) never refit the view.
 */
function MapFitController({ center, radiusKm }: { center: Center; radiusKm: number }) {
  const map = useMap();
  const fitted = useRef<string | null>(null);

  useEffect(() => {
    const key = `${center.lat},${center.lng},${radiusKm}`;
    if (fitted.current === key) return;
    fitted.current = key;

    const box = circleBounds(center, radiusKm);
    const dLat = (box.northeast.lat - box.southwest.lat) * FIT_PADDING_RATIO;
    const dLng = (box.northeast.lng - box.southwest.lng) * FIT_PADDING_RATIO;
    const corners: [[number, number], [number, number]] = [
      [clampLat(box.southwest.lat - dLat), box.southwest.lng - dLng],
      [clampLat(box.northeast.lat + dLat), box.northeast.lng + dLng],
    ];
    map.flyToBounds(corners, { maxZoom: FIT_MAX_ZOOM });
  }, [center.lat, center.lng, radiusKm, map]);

  return null;
}

export interface AircraftMapViewProps {
  /** The configured center point, rendered as a read-only center marker. */
  center: Center;
  /** The configured radius in kilometers; renders the circle. */
  radiusKm: number;
  /** Aircraft to mark at their reported positions. */
  aircraft?: Aircraft[];
  /** Extra classes applied to the map container. */
  className?: string;
}

/**
 * Read-only map for the embeddable widget: the configured location and radius
 * (circle + center marker) with the aircraft marked at their reported
 * positions, each with a rotated plane icon and callsign label. Unlike the
 * interactive SPA map there are no draggable selection handles — the location
 * is fixed by the widget's configuration. Fills its container.
 */
export const AircraftMapView = ({
  center,
  radiusKm,
  aircraft = [],
  className,
}: AircraftMapViewProps): JSX.Element => {
  useEffect(() => {
    configureDefaultMarkerIcons();
  }, []);

  return (
    <MapContainer
      center={[center.lat, center.lng]}
      zoom={10}
      maxZoom={19}
      scrollWheelZoom
      className={cn(
        'h-full w-full overflow-hidden rounded-xl border border-primary/20 shadow-sm',
        className,
      )}
    >
      <MapSizeSync />
      <MapFitController center={center} radiusKm={radiusKm} />
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
        url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png"
        maxZoom={19}
        eventHandlers={{
          tileerror: (event) => {
            const tile = (event as { tile?: HTMLElement }).tile;
            if (tile) retryFailedTile(tile);
          },
        }}
      />
      <Circle
        center={[center.lat, center.lng]}
        radius={radiusKm * 1000}
        pathOptions={{ color: '#d97706', weight: 2 }}
      />
      <Marker position={[center.lat, center.lng]} />
      {aircraft.map((aircraftItem) => (
        <Marker
          key={aircraftItem.icao24}
          position={[aircraftItem.latitude, aircraftItem.longitude]}
          icon={createAircraftIcon(aircraftItem.trueTrack)}
        >
          <Tooltip permanent direction="top" offset={[0, -12]}>
            {aircraftItem.callsign ?? aircraftItem.icao24}
          </Tooltip>
        </Marker>
      ))}
    </MapContainer>
  );
};
