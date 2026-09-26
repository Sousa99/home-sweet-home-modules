import { describe, expect, it } from 'vitest';
import { directionFromPattern, parseArrivals } from './realtime';

const FIXTURE = [
  {
    trip_id: '[PCN1R][BNA17]1604_0_3_0600_0629_0_9_21NBI',
    line_id: '1604',
    headsign: 'Carcavelos (Estação)',
    pattern_id: '[BNA17]1604_0_3',
    estimated_arrival_unix: 1751778650,
    scheduled_arrival_unix: 1751778660,
    observed_arrival_unix: 1751778655,
    stop_sequence: 14,
  },
  {
    trip_id: '[PCN1R][BNA17]1700_0_2_0600_0629_0_9_21NBI',
    line_id: '1700',
    headsign: 'Lisboa',
    pattern_id: '[BNA17]1700_0_1',
    estimated_arrival_unix: null,
    scheduled_arrival_unix: 1751779000,
  },
];

const FETCHED_AT = 1751778600000;

describe('directionFromPattern', () => {
  it('extracts the direction from a CM pattern id', () => {
    expect(directionFromPattern('[BNA17]2805_0_1')).toBe(0);
    expect(directionFromPattern('[BNA17]2805_1_2')).toBe(1);
  });

  it('returns null when no direction can be parsed', () => {
    expect(directionFromPattern(undefined)).toBeNull();
    expect(directionFromPattern('nope')).toBeNull();
  });
});

describe('parseArrivals', () => {
  it('parses arrivals and converts Unix seconds to epoch ms', () => {
    const { arrivals } = parseArrivals(FIXTURE, '050418', FETCHED_AT);
    expect(arrivals).toHaveLength(2);
    expect(arrivals[0]).toEqual({
      tripId: '[PCN1R][BNA17]1604_0_3_0600_0629_0_9_21NBI',
      stopId: '050418',
      lineId: '1604',
      headsign: 'Carcavelos (Estação)',
      directionId: 0,
      estimatedAt: 1751778650000,
      scheduledAt: 1751778660000,
      fetchedAt: FETCHED_AT,
    });
  });

  it('keeps estimatedAt null when the feed has no live prediction', () => {
    const { arrivals } = parseArrivals(FIXTURE, '050418', FETCHED_AT);
    expect(arrivals[1]?.estimatedAt).toBeNull();
    expect(arrivals[1]?.scheduledAt).toBe(1751779000000);
  });

  it('skips malformed rows with a warning, never crashes', () => {
    const payload = [{ trip_id: 123, line_id: 'x' }, FIXTURE[0]];
    const { arrivals, warnings } = parseArrivals(payload, '050418', FETCHED_AT);
    expect(arrivals).toHaveLength(1);
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toContain('skipped');
  });

  it('returns empty when the payload is not an array', () => {
    const { arrivals, warnings } = parseArrivals({ data: [] }, '050418', FETCHED_AT);
    expect(arrivals).toEqual([]);
    expect(warnings).toHaveLength(1);
  });
});
