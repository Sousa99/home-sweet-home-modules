import type { BoundingBox } from '../geometry';
import { loadConfig } from '../lib/config';
import { FeedUnavailableError } from '../lib/errors';
import type { AircraftFeed, FeedSnapshot, FeedState } from './types';

/** Index positions of the fields we consume in an OpenSky state vector. */
const STATE_INDEX = {
  icao24: 0,
  callsign: 1,
  originCountry: 2,
  longitude: 5,
  latitude: 6,
  baroAltitude: 7,
  onGround: 8,
  velocity: 9,
  trueTrack: 10,
  verticalRate: 11,
} as const;

interface OpenSkyResponse {
  time: number;
  states: unknown[][];
}

function isOpenSkyResponse(value: unknown): value is OpenSkyResponse {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate['time'] === 'number' &&
    Array.isArray(candidate['states']) &&
    candidate['states'].every((row) => Array.isArray(row))
  );
}

function nullableString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() !== '' ? value.trim() : null;
}

function nullableNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

/**
 * Map a raw OpenSky `/states/all` payload into a {@link FeedSnapshot}.
 * Exported for unit testing.
 *
 * @param data - the parsed JSON response body
 * @returns a normalized snapshot
 * @throws {FeedUnavailableError} when the payload is malformed
 */
export function mapOpenSkyResponse(data: unknown): FeedSnapshot {
  if (!isOpenSkyResponse(data)) {
    throw new FeedUnavailableError('Aircraft feed returned a malformed payload');
  }
  const states = data.states.map((row): FeedState => ({
    icao24: String(row[STATE_INDEX.icao24] ?? ''),
    callsign: nullableString(row[STATE_INDEX.callsign]),
    originCountry: nullableString(row[STATE_INDEX.originCountry]),
    latitude: nullableNumber(row[STATE_INDEX.latitude]),
    longitude: nullableNumber(row[STATE_INDEX.longitude]),
    baroAltitude: nullableNumber(row[STATE_INDEX.baroAltitude]),
    onGround: Boolean(row[STATE_INDEX.onGround]),
    velocity: nullableNumber(row[STATE_INDEX.velocity]),
    trueTrack: nullableNumber(row[STATE_INDEX.trueTrack]),
    verticalRate: nullableNumber(row[STATE_INDEX.verticalRate]),
  }));
  return { time: data.time, states };
}

export interface OpenSkyFeedOptions {
  /** Base URL of the OpenSky REST API. */
  baseUrl?: string;
  /** Timeout in milliseconds for a single feed request. */
  timeoutMs?: number;
  /** fetch implementation override (for tests). */
  fetchImpl?: typeof fetch;
}

/**
 * Live aircraft feed backed by the OpenSky Network REST API
 * (`GET /api/states/all`, anonymous tier, no caching).
 */
export class OpenSkyFeed implements AircraftFeed {
  private readonly baseUrl: string;
  private readonly timeoutMs: number;
  private readonly fetchImpl: typeof fetch;

  constructor(options: OpenSkyFeedOptions = {}) {
    const cfg = loadConfig();
    this.baseUrl = options.baseUrl ?? cfg.feedBaseUrl;
    this.timeoutMs = options.timeoutMs ?? cfg.feedTimeoutMs;
    this.fetchImpl = options.fetchImpl ?? fetch;
  }

  /**
   * Query OpenSky for the states inside a bounding box.
   *
   * @param bbox - the bounding box to query
   * @returns the normalized snapshot
   * @throws {FeedUnavailableError} on network failure, timeout, rate limit
   *   (503) or an upstream error / malformed payload (502)
   */
  async getSnapshot(bbox: BoundingBox): Promise<FeedSnapshot> {
    const url = new URL('/api/states/all', this.baseUrl);
    url.searchParams.set('lamin', String(bbox.latMin));
    url.searchParams.set('lomin', String(bbox.lngMin));
    url.searchParams.set('lamax', String(bbox.latMax));
    url.searchParams.set('lomax', String(bbox.lngMax));
    url.searchParams.set('extended', '1');

    let response: Response;
    try {
      response = await this.fetchImpl(url, {
        signal: AbortSignal.timeout(this.timeoutMs),
      });
    } catch (err) {
      throw new FeedUnavailableError('Aircraft feed request failed', {
        retryable: true,
        cause: err,
      });
    }

    if (!response.ok) {
      throw new FeedUnavailableError(`Aircraft feed returned HTTP ${response.status}`, {
        retryable: response.status === 429,
      });
    }

    let data: unknown;
    try {
      data = await response.json();
    } catch (err) {
      throw new FeedUnavailableError('Aircraft feed returned an unreadable payload', {
        cause: err,
      });
    }

    return mapOpenSkyResponse(data);
  }
}
