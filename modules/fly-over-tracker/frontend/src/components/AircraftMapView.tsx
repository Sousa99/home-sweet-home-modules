import 'leaflet/dist/leaflet.css';
import { useCallback, useEffect, useRef } from 'react';
import type { JSX } from 'react';
import { Circle, MapContainer, Marker, TileLayer, Tooltip, useMap } from 'react-leaflet';
import type { Aircraft, Center } from '../api/types';
import { createAircraftIcon } from '../lib/aircraftIcon';
import { configureDefaultMarkerIcons } from '../lib/leaflet';
import { circleBounds, clampLat } from '../lib/location';
import { cn } from '../lib/utils';

/** Fraction of the circle bounding box added as margin on each side of the fit. */
const FIT_PADDING_RATIO = 0.01;
/** Maximum zoom the fit will request; matches the tile layer ceiling (z19). */
const FIT_MAX_ZOOM = 19;
/** Maximum reload attempts for a single failed tile. */
const TILE_MAX_RETRIES = 3;
/** Base delay before retrying a failed tile; grows linearly per attempt. */
const TILE_RETRY_BASE_MS = 300;

/** Default basemap: the public OpenStreetMap tiles (key-less). */
const DEFAULT_TILE_URL = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';

const TILE_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

/** Number of tiles retried (debug diagnostics). */
let tileRetriedCount = 0;

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
  tileRetriedCount++;
  const src = tile.getAttribute('src');
  tile.removeAttribute('src');
  window.setTimeout(() => {
    if (src) tile.setAttribute('src', src);
  }, TILE_RETRY_BASE_MS * attempt);
}

interface MapLayoutControllerProps {
  center: Center;
  radiusKm: number;
  debug?: boolean;
}

/**
 * Keeps Leaflet's viewport correct inside a CSS grid/flex host. Leaflet reads
 * its container size at init; in a dashboard the size can be wrong or zero at
 * that moment (grid/flex settle after mount), so the auto-fit would target the
 * wrong viewport and only some tiles would ever be requested.
 *
 * This controller defers the fit until the container reports a real size
 * (re-checking across animation frames after `invalidateSize`), and re-fits
 * whenever the container resizes (debounced `ResizeObserver`). When `debug` is
 * set it logs the measured size/zoom/fits and tile load/error totals to the
 * console.
 */
function MapLayoutController({ center, radiusKm, debug }: MapLayoutControllerProps) {
  const map = useMap();
  const fittedKey = useRef<string | null>(null);
  const lastSize = useRef<{ x: number; y: number } | null>(null);

  const log = useCallback(
    (message: string, ...rest: unknown[]) => {
      if (debug) console.info('[fly-over-map]', message, ...rest);
    },
    [debug],
  );

  const fit = useCallback(
    (size: { x: number; y: number }) => {
      if (size.x <= 0 || size.y <= 0) {
        log('fit skipped — container size not ready', size);
        return;
      }
      const key = `${center.lat}|${center.lng}|${radiusKm}`;
      const previous = lastSize.current;
      lastSize.current = size;
      if (fittedKey.current === key && previous && previous.x === size.x && previous.y === size.y) {
        return; // already fitted for this location at this size
      }
      fittedKey.current = key;
      log('fit', { size, zoom: map.getZoom(), center: map.getCenter() });

      const box = circleBounds(center, radiusKm);
      const dLat = (box.northeast.lat - box.southwest.lat) * FIT_PADDING_RATIO;
      const dLng = (box.northeast.lng - box.southwest.lng) * FIT_PADDING_RATIO;
      const corners: [[number, number], [number, number]] = [
        [clampLat(box.southwest.lat - dLat), box.southwest.lng - dLng],
        [clampLat(box.northeast.lat + dLat), box.northeast.lng + dLng],
      ];
      map.flyToBounds(corners, { maxZoom: FIT_MAX_ZOOM });
    },
    [center.lat, center.lng, radiusKm, map, log],
  );

  useEffect(() => {
    const container = map.getContainer();
    let tilesLoaded = 0;
    let tilesError = 0;

    const onTileLoad = () => {
      tilesLoaded++;
    };
    const onTileError = () => {
      tilesError++;
      log('tileerror', { loaded: tilesLoaded, error: tilesError, retried: tileRetriedCount });
    };

    const sync = () => {
      map.invalidateSize({ animate: false });
      fit(map.getSize());
    };

    log('mount', { size: map.getSize(), zoom: map.getZoom() });

    const onReady = () => {
      log('ready');
      sync();
    };
    map.whenReady(onReady);

    // Re-check across frames in case the size arrives late (flex/grid settling).
    let frame = 0;
    const MAX_FRAMES = 10;
    const poll = () => {
      frame++;
      const size = map.getSize();
      if (size.x > 0 && size.y > 0) {
        map.invalidateSize({ animate: false });
        fit(size);
        return;
      }
      if (frame < MAX_FRAMES) requestAnimationFrame(poll);
    };
    const rafId = requestAnimationFrame(poll);

    // Re-fit when the container resizes (debounced).
    let resizeTimer = 0;
    const onResize = () => {
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(() => {
        log('resize', map.getSize());
        sync();
      }, 50);
    };
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(onResize);
    observer?.observe(container);

    if (debug) {
      map.on('tileload', onTileLoad);
      map.on('tileerror', onTileError);
      const interval = window.setInterval(() => {
        log('tiles', { loaded: tilesLoaded, error: tilesError, retried: tileRetriedCount });
      }, 3000);
      return () => {
        map.off('tileload', onTileLoad);
        map.off('tileerror', onTileError);
        window.clearInterval(interval);
        cancelAnimationFrame(rafId);
        window.clearTimeout(resizeTimer);
        observer?.disconnect();
      };
    }

    return () => {
      cancelAnimationFrame(rafId);
      window.clearTimeout(resizeTimer);
      observer?.disconnect();
    };
  }, [map, fit, log]);

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
  /** Override the tile layer URL (Leaflet `{z}/{x}/{y}` placeholders). */
  tileUrl?: string;
  /** Log map layout/tile diagnostics to the console (`[fly-over-map]`). */
  debug?: boolean;
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
  tileUrl = DEFAULT_TILE_URL,
  debug = false,
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
      <MapLayoutController center={center} radiusKm={radiusKm} debug={debug} />
      <TileLayer
        attribution={TILE_ATTRIBUTION}
        url={tileUrl}
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
