import { loadConfig } from '../lib/config';
import { FeedUnavailableError } from '../lib/errors';
import { fetchWithRetry } from '../lib/retry';
import type { AircraftFeed, FeedSnapshot, FeedState } from './types';

/** Knots to meters per second. */
const KT_TO_MS = 0.5144444444444445;
/** Feet to meters. */
const FT_TO_M = 0.3048;
/** Feet per minute to meters per second. */
const FPM_TO_MS = 0.00508;
/** Nautical miles per kilometer. */
const NM_PER_KM = 1.852;
/** Ground-speed threshold (knots) below which an aircraft is treated as on the ground. */
const GROUND_SPEED_KT = 5;

/**
 * A descriptive User-Agent is required by adsb.lol; a generic one (e.g.
 * undici's `node`) is rejected with HTTP 403 "User-Agent too generic".
 */
export const ADSBLOL_USER_AGENT =
  'fly-over-tracker/1.2 (https://github.com/sousa99/fly-over-tracker)';

function nullableString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() !== '' ? value.trim() : null;
}

function nullableNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

/**
 * Convert the adsb.lol `alt_baro` value (feet, or a readsb string such as
 * `"ground"` for surface aircraft) to meters, returning `null` when it is not
 * a numeric altitude.
 */
function altitudeMeters(altBaro: unknown): number | null {
  if (typeof altBaro === 'number' && Number.isFinite(altBaro)) return altBaro * FT_TO_M;
  return null;
}

/**
 * Map a raw adsb.lol `/v2/point` payload into a {@link FeedSnapshot}.
 * Exported for unit testing.
 *
 * @param data - the parsed JSON response body
 * @param fallbackTime - Unix seconds used when the payload carries no clock
 * @returns a normalized snapshot
 * @throws {FeedUnavailableError} when the payload is malformed
 */
export function mapAdsbLolResponse(data: unknown, fallbackTime: number): FeedSnapshot {
  if (typeof data !== 'object' || data === null) {
    throw new FeedUnavailableError('Aircraft feed returned a malformed payload');
  }
  const record = data as Record<string, unknown>;
  if (!Array.isArray(record['ac'])) {
    throw new FeedUnavailableError('Aircraft feed returned a malformed payload');
  }

  const msNow = typeof record['now'] === 'number' ? record['now'] : undefined;
  const time = msNow !== undefined ? Math.floor(msNow / 1000) : fallbackTime;

  const states: FeedState[] = [];
  for (const entry of record['ac']) {
    if (typeof entry !== 'object' || entry === null) continue;
    const ac = entry as Record<string, unknown>;
    const hex = typeof ac['hex'] === 'string' ? ac['hex'] : '';
    // `~`-prefixed addresses are non-ICAO targets (TIS-B track files, etc.).
    if (hex === '' || hex.startsWith('~')) continue;

    const altBaro = ac['alt_baro'];
    const gs = nullableNumber(ac['gs']);
    const baroRate = nullableNumber(ac['baro_rate']);
    const onGround = altBaro === 'ground' || (gs !== null && gs < GROUND_SPEED_KT);

    states.push({
      icao24: hex.toLowerCase(),
      callsign: nullableString(ac['flight']),
      originCountry: null,
      latitude: nullableNumber(ac['lat']),
      longitude: nullableNumber(ac['lon']),
      baroAltitude: altitudeMeters(altBaro),
      onGround,
      velocity: gs !== null ? gs * KT_TO_MS : null,
      trueTrack: nullableNumber(ac['track']),
      verticalRate: baroRate !== null ? baroRate * FPM_TO_MS : null,
    });
  }
  return { time, states };
}

export interface AdsbLolFeedOptions {
  /** Base URL of the adsb.lol API. */
  baseUrl?: string;
  /** Timeout in milliseconds for a single request. */
  timeoutMs?: number;
  /** Bounded retry attempts on upstream 429. */
  attempts?: number;
  /** Default backoff in ms when no retry-after header is present. */
  defaultWaitMs?: number;
  /** Upper bound in ms for a single retry wait. */
  capWaitMs?: number;
  /** fetch implementation override (for tests). */
  fetchImpl?: typeof fetch;
  /** Wait implementation override (for tests). */
  wait?: (ms: number) => Promise<void>;
}

/**
 * Live aircraft feed backed by the adsb.lol API
 * (`GET /v2/point/{lat}/{lon}/{radius}`, radius in nautical miles). Bounded
 * 429 retries via `lib/retry`. No authentication is required.
 */
export class AdsbLolFeed implements AircraftFeed {
  private readonly baseUrl: string;
  private readonly timeoutMs: number;
  private readonly attempts: number;
  private readonly defaultWaitMs: number;
  private readonly capWaitMs: number;
  private readonly fetchImpl: typeof fetch;
  private readonly wait?: (ms: number) => Promise<void>;

  constructor(options: AdsbLolFeedOptions = {}) {
    const cfg = loadConfig();
    this.baseUrl = options.baseUrl ?? cfg.feedBaseUrl;
    this.timeoutMs = options.timeoutMs ?? cfg.feedTimeoutMs;
    this.attempts = options.attempts ?? cfg.retryAttempts;
    this.defaultWaitMs = options.defaultWaitMs ?? cfg.retryDefaultMs;
    this.capWaitMs = options.capWaitMs ?? cfg.retryCapMs;
    this.fetchImpl = options.fetchImpl ?? fetch;
    this.wait = options.wait;
  }

  /**
   * Query adsb.lol for the aircraft inside a circle.
   *
   * @param lat - circle center latitude in decimal degrees
   * @param lng - circle center longitude in decimal degrees
   * @param radiusKm - circle radius in kilometers
   * @returns the normalized snapshot
   * @throws {FeedUnavailableError} on network failure, timeout, persistent
   *   rate limit, or an upstream error / malformed payload
   */
  async getSnapshot(lat: number, lng: number, radiusKm: number): Promise<FeedSnapshot> {
    const radiusNm = Math.max(1, Math.ceil(radiusKm / NM_PER_KM));
    const url = new URL(`/v2/point/${lat}/${lng}/${radiusNm}`, this.baseUrl);

    let response: Response;
    try {
      response = await fetchWithRetry(
        url,
        {
          signal: AbortSignal.timeout(this.timeoutMs),
          headers: { 'user-agent': ADSBLOL_USER_AGENT },
        },
        {
          attempts: this.attempts,
          defaultWaitMs: this.defaultWaitMs,
          capWaitMs: this.capWaitMs,
          fetchImpl: this.fetchImpl,
          wait: this.wait,
        },
      );
    } catch (err) {
      if (err instanceof FeedUnavailableError) throw err;
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

    return mapAdsbLolResponse(data, Math.floor(Date.now() / 1000));
  }
}
