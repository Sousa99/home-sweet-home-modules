import type { BoundingBox } from '../geometry';
import type { AircraftFeed, FeedSnapshot, FeedState } from './types';

export interface MockFeedOptions {
  /** Unix seconds reported as the snapshot time. */
  time?: number;
  /** Center of the fixture aircraft cluster. */
  center?: { lat: number; lng: number };
}

const DEFAULT_CENTER = { lat: 48.8566, lng: 2.3522 };
const DEFAULT_TIME = 1_726_900_000;

/** Approximate kilometers per degree of latitude (matches geometry). */
const KM_PER_DEG = 111.19;

interface Fixture {
  icao24: string;
  callsign: string;
  originCountry: string;
  /** Distance from the cluster center in kilometers. */
  distanceKm: number;
  /** Compass bearing from the center in degrees. */
  bearing: number;
  altitude: number;
  velocity: number;
  trueTrack: number;
  verticalRate: number;
}

/**
 * Deterministic fixture aircraft clustered around a center point. The first
 * three are inside a typical 50 km radius; the last two are far away and must
 * be excluded by the service's circular filter.
 */
const FIXTURES: Fixture[] = [
  {
    icao24: '3c6444',
    callsign: 'DLH400',
    originCountry: 'Germany',
    distanceKm: 8,
    bearing: 30,
    altitude: 9144,
    velocity: 251.2,
    trueTrack: 87.5,
    verticalRate: 0,
  },
  {
    icao24: '3946b0',
    callsign: 'AFR123',
    originCountry: 'France',
    distanceKm: 25,
    bearing: 135,
    altitude: 10300,
    velocity: 210,
    trueTrack: 200,
    verticalRate: -2.5,
  },
  {
    icao24: '4caa01',
    callsign: 'BAW456',
    originCountry: 'United Kingdom',
    distanceKm: 27,
    bearing: 315,
    altitude: 11000,
    velocity: 235,
    trueTrack: 340,
    verticalRate: 1.2,
  },
  {
    icao24: 'a0ae62',
    callsign: 'UAL789',
    originCountry: 'United States',
    distanceKm: 160,
    bearing: 250,
    altitude: 9500,
    velocity: 240,
    trueTrack: 70,
    verticalRate: 0,
  },
  {
    icao24: '4840d6',
    callsign: 'KLM999',
    originCountry: 'Netherlands',
    distanceKm: 340,
    bearing: 10,
    altitude: 8900,
    velocity: 225,
    trueTrack: 180,
    verticalRate: 0.8,
  },
];

/**
 * Place a fixture point at a bearing/distance from the center using a flat
 * approximation (adequate at the fixture scale).
 */
function pointFrom(
  center: { lat: number; lng: number },
  distanceKm: number,
  bearing: number,
): { lat: number; lng: number } {
  const angular = distanceKm / KM_PER_DEG;
  const radians = (bearing * Math.PI) / 180;
  const lat = center.lat + angular * Math.cos(radians);
  const lng =
    center.lng +
    (angular * Math.sin(radians)) / Math.max(Math.cos((center.lat * Math.PI) / 180), 1e-9);
  return { lat, lng };
}

function buildStates(center: { lat: number; lng: number }): FeedState[] {
  return FIXTURES.map((fixture) => {
    const point = pointFrom(center, fixture.distanceKm, fixture.bearing);
    return {
      icao24: fixture.icao24,
      callsign: fixture.callsign,
      originCountry: fixture.originCountry,
      latitude: point.lat,
      longitude: point.lng,
      baroAltitude: fixture.altitude,
      onGround: false,
      velocity: fixture.velocity,
      trueTrack: fixture.trueTrack,
      verticalRate: fixture.verticalRate,
    };
  });
}

/**
 * Deterministic aircraft feed for tests and offline development. Returns the
 * same snapshot on every call, filtered by the requested bounding box.
 */
export class MockFeed implements AircraftFeed {
  private readonly time: number;
  private readonly states: FeedState[];

  constructor(options: MockFeedOptions = {}) {
    this.time = options.time ?? DEFAULT_TIME;
    this.states = buildStates(options.center ?? DEFAULT_CENTER);
  }

  /**
   * Return the fixture states whose position falls inside the bounding box.
   *
   * @param bbox - the bounding box to filter by
   * @returns a deterministic snapshot
   */
  async getSnapshot(bbox: BoundingBox): Promise<FeedSnapshot> {
    const states = this.states.filter(
      (state) =>
        state.latitude !== null &&
        state.longitude !== null &&
        state.latitude >= bbox.latMin &&
        state.latitude <= bbox.latMax &&
        state.longitude >= bbox.lngMin &&
        state.longitude <= bbox.lngMax,
    );
    return { time: this.time, states };
  }
}
