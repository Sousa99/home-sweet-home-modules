import { describe, expect, it } from 'vitest';
import { strToU8, zipSync } from 'fflate';
import { createTestDb } from '../../test-utils/db';
import { createCarrisMetropolitanaProvider } from './index';
import { ingestGtfsArchive } from './ingest';
import { getMetadata } from './queries';

function fixtureZip(overrides: Record<string, Uint8Array> = {}): Uint8Array {
  return zipSync({
    'routes.txt': strToU8('route_id,route_short_name,route_long_name,route_type\nR1,100,One,3\n'),
    'stops.txt': strToU8(
      'stop_id,stop_name,stop_lat,stop_lon,legacy_ids\nZ1,Paragem Nova,38.7,-9.1,LA77N-060201\n',
    ),
    'trips.txt': strToU8(
      'trip_id,route_id,service_id,trip_headsign,direction_id\nT1,R1,SRV,Centro,0\n',
    ),
    'stop_times.txt': strToU8(
      'trip_id,arrival_time,departure_time,stop_id,stop_sequence\nT1,10:00:00,10:00:00,Z1,1\n',
    ),
    'calendar.txt': strToU8(
      'service_id,monday,tuesday,wednesday,thursday,friday,saturday,sunday,start_date,end_date\n' +
        'SRV,1,1,1,1,1,1,1,20260101,20261231\n',
    ),
    // Present in the real feed but not needed by the module: must be skipped.
    'shapes.txt': strToU8('shape_id,shape_pt_lat,shape_pt_lon,shape_pt_sequence\nS1,1,2,1\n'),
    ...overrides,
  });
}

describe('ingestGtfsArchive', () => {
  it('streams trips/stop_times and stores the metadata tables', async () => {
    const { sqlite, db } = createTestDb();

    await ingestGtfsArchive(sqlite, {
      archive: fixtureZip(),
      feedVersion: 'feed12345678',
      fetchedAt: '2026-06-01T10:00:00.000Z',
    });

    const provider = createCarrisMetropolitanaProvider(db);
    expect((await provider.getStop('Z1'))?.name).toBe('Paragem Nova');
    expect((await provider.getStop('Z1'))?.realtimeId).toBe('060201');
    expect(getMetadata(db, 'feed_version')).toBe('feed12345678');
    expect(getMetadata(db, 'last_refresh')).toBe('2026-06-01T10:00:00.000Z');

    const times = await provider.getNextTimes('Z1', {
      now: new Date('2026-06-15T08:00:00Z'), // Mon 09:00 Europe/Lisbon
    });
    expect(times).toHaveLength(1);
    expect(times[0]?.lineShortName).toBe('100');
  });

  it('atomically replaces the previous schedule', async () => {
    const { sqlite, db } = createTestDb();

    await ingestGtfsArchive(sqlite, {
      archive: fixtureZip(),
      feedVersion: 'feed00000001',
      fetchedAt: '2026-06-01T10:00:00.000Z',
    });

    await ingestGtfsArchive(sqlite, {
      archive: fixtureZip({
        'stops.txt': strToU8(
          'stop_id,stop_name,stop_lat,stop_lon,legacy_ids\nZ2,Paragem Substituida,38.7,-9.1,\n',
        ),
        'stop_times.txt': strToU8(
          'trip_id,arrival_time,departure_time,stop_id,stop_sequence\nT1,10:00:00,10:00:00,Z2,1\n',
        ),
      }),
      feedVersion: 'feed00000002',
      fetchedAt: '2026-06-02T10:00:00.000Z',
    });

    const provider = createCarrisMetropolitanaProvider(db);
    expect(await provider.getStop('Z1')).toBeNull();
    expect((await provider.getStop('Z2'))?.name).toBe('Paragem Substituida');
    expect(getMetadata(db, 'feed_version')).toBe('feed00000002');
  });
});
