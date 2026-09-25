import type { LivePrediction } from '../types';

export interface CacheEntry {
  arrivals: LivePrediction[];
  fetchedAt: number;
}

export interface RealtimeCache {
  get(key: string): CacheEntry | undefined;
  set(key: string, value: CacheEntry): void;
}

/**
 * A tiny in-memory cache for per-stop realtime snapshots. TTL expiry is
 * evaluated by the caller (`createRealtimeClient`); the cache is deliberately
 * dumb so staleness policy lives in one place.
 */
export function createRealtimeCache(): RealtimeCache {
  const store = new Map<string, CacheEntry>();
  return {
    get(key) {
      return store.get(key);
    },
    set(key, value) {
      store.set(key, value);
    },
  };
}
