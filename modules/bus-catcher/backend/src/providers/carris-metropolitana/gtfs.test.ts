import { describe, expect, it } from 'vitest';
import { zipSync, strToU8, strFromU8 } from 'fflate';
import { parseGtfsFiles, unzipGtfs } from './gtfs';

const routes = [
  'route_id,agency_id,route_short_name,route_long_name,route_type',
  'R1,A1,736,Cais do Sodré — Outurela,3',
  'R2,A1,706,Cais do Sodré — Cemitério da Ajuda,3',
].join('\n');

const stops = [
  'stop_id,stop_name,stop_lat,stop_lon',
  'S1,Av. Teste,38.7,-9.1',
  'S2,Bad Row,abc,xyz',
].join('\n');

const trips = ['trip_id,route_id,service_id,trip_headsign,direction_id', 'T1,R1,WK,Cais,0'].join(
  '\n',
);

const stopTimes = [
  'trip_id,arrival_time,departure_time,stop_id,stop_sequence,pickup_type,drop_off_type',
  'T1,09:00:00,09:00:10,S1,1,0,0',
  'T1,25:30:00,25:30:10,S1,2,0,0',
  'T1,12:00:00,12:00:00,UNKNOWN_STOP,3,0,0',
  'T1,bad-time,bad-time,S1,4,0,0',
].join('\n');

const calendar = [
  'service_id,monday,tuesday,wednesday,thursday,friday,saturday,sunday,start_date,end_date',
  'WK,1,1,1,1,1,0,0,20260101,20261231',
].join('\n');

const calendarDates = ['service_id,date,exception_type', 'WK,20260601,2'].join('\n');

const files: Record<string, string> = {
  'routes.txt': routes,
  'stops.txt': stops,
  'trips.txt': trips,
  'stop_times.txt': stopTimes,
  'calendar.txt': calendar,
  'calendar_dates.txt': calendarDates,
};

describe('parseGtfsFiles', () => {
  const parsed = parseGtfsFiles(files);

  it('parses lines', () => {
    expect(parsed.lines).toHaveLength(2);
    expect(parsed.lines[0]!).toMatchObject({
      id: 'R1',
      shortName: '736',
      routeType: 3,
      agencyId: 'A1',
    });
  });

  it('parses stops and skips malformed rows with a warning', () => {
    expect(parsed.stops).toHaveLength(1);
    expect(parsed.stops[0]!).toMatchObject({ id: 'S1', name: 'Av. Teste', lat: 38.7, lon: -9.1 });
    expect(parsed.warnings.some((w) => w.includes('stops.txt'))).toBe(true);
  });

  it('parses stop_times converting clock times to minutes, including >24h', () => {
    expect(parsed.stopTimes).toHaveLength(3);
    expect(parsed.stopTimes[0]!).toMatchObject({
      tripId: 'T1',
      stopId: 'S1',
      stopSequence: 1,
      arrivalMin: 540,
      departureMin: 540,
    });
    expect(parsed.stopTimes[1]!.arrivalMin).toBe(1530);
    expect(parsed.stopTimes[2]!.stopId).toBe('UNKNOWN_STOP');
    expect(parsed.warnings.some((w) => w.includes('stop_times.txt'))).toBe(true);
  });

  it('parses calendar and calendar_dates', () => {
    expect(parsed.calendar[0]!).toMatchObject({ serviceId: 'WK', monday: 1, sunday: 0 });
    expect(parsed.calendarDates[0]!).toMatchObject({
      serviceId: 'WK',
      date: '20260601',
      exceptionType: 2,
    });
  });
});

describe('unzipGtfs', () => {
  it('round-trips a GTFS zip', () => {
    const zip = zipSync({
      'stops.txt': strToU8(stops),
      'routes.txt': strToU8(routes),
    });
    const extracted = unzipGtfs(zip);
    expect(strFromU8(new Uint8Array(extracted['stops.txt'] ?? new Uint8Array()))).toBe(stops);
    expect(extracted['routes.txt']).toBeTruthy();
  });
});
