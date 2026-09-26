import type { DestinationInfo } from '../feeds/types';

export interface DestinationCacheOptions {
  /** TTL in milliseconds for positive (found) entries. */
  ttlMs: number;
  /** TTL in milliseconds for negative (not-found) entries. */
  negativeTtlMs: number;
  /** Clock for expiry checks (for tests; default `Date.now`). */
  now?: () => number;
}

interface CacheEntry {
  value: DestinationInfo | null;
  expiresAtMs: number;
}

/**
 * A short-lived, process-scoped cache of destination lookups keyed by
 * aircraft identity. Negative (not-found) results are cached with a shorter
 * TTL to avoid re-hammering unknown aircraft. No persistence.
 */
export interface DestinationCache {
  /**
   * Look up a cached destination.
   *
   * @param icao24 - the aircraft identity
   * @returns the cached value, `null` for a cached "not found", or
   *   `undefined` when nothing is cached (or the entry has expired)
   */
  get(icao24: string): DestinationInfo | null | undefined;
  /** Store a lookup result (positive or negative). */
  set(icao24: string, value: DestinationInfo | null): void;
  /** Drop all entries. */
  clear(): void;
}

/**
 * Create an in-memory TTL destination cache.
 *
 * @param options - TTLs and optional clock
 * @returns a {@link DestinationCache}
 */
export function createDestinationCache(options: DestinationCacheOptions): DestinationCache {
  const ttlMs = options.ttlMs;
  const negativeTtlMs = options.negativeTtlMs;
  const now = options.now ?? Date.now;
  const entries = new Map<string, CacheEntry>();

  return {
    get(icao24) {
      const entry = entries.get(icao24);
      if (entry === undefined) return undefined;
      if (entry.expiresAtMs <= now()) {
        entries.delete(icao24);
        return undefined;
      }
      return entry.value;
    },
    set(icao24, value) {
      const ttl = value === null ? negativeTtlMs : ttlMs;
      entries.set(icao24, { value, expiresAtMs: now() + ttl });
    },
    clear() {
      entries.clear();
    },
  };
}
