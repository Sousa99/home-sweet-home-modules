import { describe, expect, it } from 'vitest';
import { createDestinationCache } from '../../lib/destinationCache';

const FOUND = {
  icao24: '3c6444',
  estDepartureAirport: 'LFPG',
  estArrivalAirport: 'EDDF',
};

describe('createDestinationCache', () => {
  it('stores and returns positive entries within the TTL', () => {
    let t = 0;
    const cache = createDestinationCache({ ttlMs: 1000, negativeTtlMs: 100, now: () => t });
    cache.set('3c6444', FOUND);
    t = 999;
    expect(cache.get('3c6444')).toEqual(FOUND);
  });

  it('expires positive entries after the TTL', () => {
    let t = 0;
    const cache = createDestinationCache({ ttlMs: 1000, negativeTtlMs: 100, now: () => t });
    cache.set('3c6444', FOUND);
    t = 1000;
    expect(cache.get('3c6444')).toBeUndefined();
  });

  it('distinguishes a cached null (not found) from a cache miss', () => {
    const cache = createDestinationCache({ ttlMs: 1000, negativeTtlMs: 1000 });
    expect(cache.get('nope')).toBeUndefined();
    cache.set('nope', null);
    expect(cache.get('nope')).toBeNull();
  });

  it('expires negative entries after the negative TTL', () => {
    let t = 0;
    const cache = createDestinationCache({ ttlMs: 1000, negativeTtlMs: 100, now: () => t });
    cache.set('nope', null);
    t = 100;
    expect(cache.get('nope')).toBeUndefined();
  });

  it('clear() drops all entries', () => {
    const cache = createDestinationCache({ ttlMs: 1000, negativeTtlMs: 100 });
    cache.set('3c6444', FOUND);
    cache.clear();
    expect(cache.get('3c6444')).toBeUndefined();
  });
});
