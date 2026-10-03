import type { FeedSnapshot } from '../feeds/types';

export interface SnapshotCacheOptions {
  /** TTL in milliseconds before a cached snapshot is considered stale. */
  ttlMs: number;
  /** Clock for expiry checks (for tests; default `Date.now`). */
  now?: () => number;
}

interface CacheEntry {
  value: FeedSnapshot;
  expiresAtMs: number;
}

/**
 * A short-lived, process-scoped cache of feed snapshots keyed by location
 * (`lat|lng|radiusKm`). Multiple widgets (closest card, list, map) and the MCP
 * tool query the same location on overlapping cadences; coalescing them onto
 * one feed call within the TTL avoids hammering the upstream adsb.lol feed.
 * No persistence, matching the module's stateless model.
 */
export interface SnapshotCache {
  /**
   * Look up a cached snapshot.
   *
   * @param key - the location cache key
   * @returns the cached snapshot, or `undefined` when nothing is cached (or
   *   the entry has expired)
   */
  get(key: string): FeedSnapshot | undefined;
  /** Store a snapshot under a location key. */
  set(key: string, value: FeedSnapshot): void;
  /** Drop all entries. */
  clear(): void;
}

/**
 * Create an in-memory TTL snapshot cache.
 *
 * @param options - TTL and optional clock
 * @returns a {@link SnapshotCache}
 */
export function createSnapshotCache(options: SnapshotCacheOptions): SnapshotCache {
  const ttlMs = options.ttlMs;
  const now = options.now ?? Date.now;
  const entries = new Map<string, CacheEntry>();

  return {
    get(key) {
      const entry = entries.get(key);
      if (entry === undefined) return undefined;
      if (entry.expiresAtMs <= now()) {
        entries.delete(key);
        return undefined;
      }
      return entry.value;
    },
    set(key, value) {
      entries.set(key, { value, expiresAtMs: now() + ttlMs });
    },
    clear() {
      entries.clear();
    },
  };
}
