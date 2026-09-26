import { z } from 'zod';
import { logger } from '../../lib/logger';
import type { LiveEtaProvider, LivePrediction, RealtimeSnapshot, RealtimeStatus } from '../types';
import { createRealtimeCache, type RealtimeCache } from './cache';

const arrivalSchema = z.object({
  trip_id: z.string().min(1),
  line_id: z.string().optional(),
  headsign: z.string().optional(),
  pattern_id: z.string().optional(),
  estimated_arrival_unix: z.number().nullable().optional(),
  scheduled_arrival_unix: z.number().nullable().optional(),
});

/** CM pattern ids look like `[OP]2805_0_1` → route `2805_0` (direction 0), variant 1. */
export function directionFromPattern(patternId: string | undefined): number | null {
  if (!patternId) return null;
  const parts = patternId.split('_');
  const dir = Number(parts[1]);
  return Number.isInteger(dir) ? dir : null;
}

export interface ParsedArrivals {
  arrivals: LivePrediction[];
  warnings: string[];
}

/**
 * Parse the CM `GET /arrivals/by_stop/:id` JSON payload into predictions.
 * Malformed rows are skipped with a warning, never fatal. CM times are Unix
 * seconds; they are converted to epoch ms. A null `estimated_arrival_unix`
 * means the feed has no live ETA for that trip (kept as `estimatedAt: null`).
 */
export function parseArrivals(payload: unknown, stopId: string, fetchedAt: number): ParsedArrivals {
  if (!Array.isArray(payload)) {
    return { arrivals: [], warnings: ['arrivals payload is not an array'] };
  }
  const arrivals: LivePrediction[] = [];
  const warnings: string[] = [];
  for (const [index, row] of payload.entries()) {
    const parsed = arrivalSchema.safeParse(row);
    if (!parsed.success) {
      warnings.push(`arrivals row ${index} skipped (invalid record)`);
      continue;
    }
    const r = parsed.data;
    arrivals.push({
      tripId: r.trip_id,
      stopId,
      lineId: r.line_id ?? '',
      headsign: r.headsign ?? '',
      directionId: directionFromPattern(r.pattern_id),
      estimatedAt: r.estimated_arrival_unix != null ? r.estimated_arrival_unix * 1000 : null,
      scheduledAt: r.scheduled_arrival_unix != null ? r.scheduled_arrival_unix * 1000 : null,
      fetchedAt,
    });
  }
  return { arrivals, warnings };
}

export interface RealtimeClientOptions {
  baseUrl: string;
  ttlMs: number;
  staleAfterMs: number;
  fetchImpl?: typeof fetch;
  now?: () => Date;
}

/**
 * In-memory, single-polling realtime client for the Carris Metropolitana
 * realtime feed. Caches per-stop arrivals behind a TTL and dedupes concurrent
 * fetches per stop. Failures degrade to an unavailable snapshot — never throw.
 */
export function createRealtimeClient(options: RealtimeClientOptions): LiveEtaProvider {
  const cache: RealtimeCache = createRealtimeCache();
  const inFlight = new Map<string, Promise<RealtimeSnapshot>>();
  const fetchImpl = options.fetchImpl ?? fetch;
  const now = options.now ?? (() => new Date());
  let lastSuccessfulFetch: number | null = null;

  async function fetchArrivals(stopId: string): Promise<RealtimeSnapshot> {
    const url = `${options.baseUrl}/arrivals/by_stop/${encodeURIComponent(stopId)}`;
    const fetchedAt = now().getTime();
    try {
      const response = await fetchImpl(url);
      if (response.status === 404) {
        // The realtime feed does not know this stop id (e.g. a renumbered
        // GTFS id); the caller may retry with the legacy id.
        logger.warn('realtime fetch failed', { stopId, status: response.status, url });
        return { arrivals: [], fetchedAt, available: false, unknownStop: true };
      }
      if (!response.ok) {
        logger.warn('realtime fetch failed', { stopId, status: response.status, url });
        return { arrivals: [], fetchedAt, available: false };
      }
      const payload: unknown = await response.json();
      const parsed = parseArrivals(payload, stopId, fetchedAt);
      for (const warning of parsed.warnings) {
        logger.warn('realtime parse warning', { stopId, warning });
      }
      lastSuccessfulFetch = fetchedAt;
      cache.set(stopId, { arrivals: parsed.arrivals, fetchedAt });
      logger.info('realtime fetch ok', { stopId, arrivals: parsed.arrivals.length });
      return { arrivals: parsed.arrivals, fetchedAt, available: true };
    } catch (err) {
      logger.warn('realtime fetch error', {
        stopId,
        message: err instanceof Error ? err.message : String(err),
      });
      return { arrivals: [], fetchedAt, available: false };
    }
  }

  return {
    async getStopArrivals(stopId) {
      const entry = cache.get(stopId);
      const nowMs = now().getTime();
      if (entry && nowMs - entry.fetchedAt <= options.ttlMs) {
        return {
          arrivals: entry.arrivals,
          fetchedAt: entry.fetchedAt,
          available: nowMs - entry.fetchedAt <= options.staleAfterMs,
        };
      }
      const existing = inFlight.get(stopId);
      if (existing) return existing;
      const promise = fetchArrivals(stopId).finally(() => inFlight.delete(stopId));
      inFlight.set(stopId, promise);
      return promise;
    },
    async getStatus(): Promise<RealtimeStatus> {
      if (lastSuccessfulFetch === null) {
        return { lastUpdate: null, available: false, stale: false };
      }
      const age = now().getTime() - lastSuccessfulFetch;
      const stale = age > options.staleAfterMs;
      return { lastUpdate: new Date(lastSuccessfulFetch).toISOString(), available: !stale, stale };
    },
  };
}
