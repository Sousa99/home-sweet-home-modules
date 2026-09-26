import type { Line, Passing, Status, Stop, StopWithLines } from '../lib/schemas';

export interface NextTimesOptions {
  now?: Date;
  limit?: number;
  lines?: string[];
}

/**
 * Application-facing contract for transit information.
 *
 * v1 is the Carris scheduled provider; a future realtime provider (e.g.
 * GO/TML GTFS-RT) implements the same interface so the app contract stays
 * stable (constitution principle III, spec FR-010/SC-005).
 */
export interface ScheduleProvider {
  searchStops(query: string, limit?: number): Promise<Stop[]>;
  getStop(stopId: string): Promise<StopWithLines | null>;
  listLines(): Promise<Line[]>;
  getNextTimes(stopId: string, options?: NextTimesOptions): Promise<Passing[]>;
  getStatus(): Promise<Omit<Status, 'refreshing'>>;
}

/**
 * A raw live prediction for one line-direction at one stop, produced by a
 * realtime feed and merged onto scheduled passings by (line, direction,
 * scheduled-time proximity) — the realtime feed's trip_id does not match the
 * static GTFS trip ids, so exact trip matching is not possible.
 */
export interface LivePrediction {
  /** Realtime feed trip id (informational; not used for matching). */
  tripId: string;
  stopId: string;
  /** Line number, e.g. "2706" (matches `Passing.lineShortName`). */
  lineId: string;
  headsign: string;
  /** 0/1 when the feed exposes a direction; null otherwise. */
  directionId: number | null;
  /** Predicted arrival as epoch ms; null means the feed has no live ETA. */
  estimatedAt: number | null;
  /** Scheduled arrival as epoch ms from the feed (may be null). */
  scheduledAt: number | null;
  /** Epoch ms when this feed snapshot was fetched locally. */
  fetchedAt: number;
}

/** Result of a per-stop realtime query, including whether it is usable. */
export interface RealtimeSnapshot {
  arrivals: LivePrediction[];
  fetchedAt: number;
  /** false when the feed is down or the data is older than the staleness budget. */
  available: boolean;
  /** true when the realtime feed does not recognize this stop id (404). */
  unknownStop?: boolean;
}

/** Global realtime feed freshness (surfaces through /api/status). */
export interface RealtimeStatus {
  lastUpdate: string | null;
  available: boolean;
  stale: boolean;
}

/**
 * Realtime-ETA capability behind the same abstraction seam as
 * `ScheduleProvider` (constitution principle III, spec FR-008).
 */
export interface LiveEtaProvider {
  getStopArrivals(stopId: string): Promise<RealtimeSnapshot>;
  getStatus(): Promise<RealtimeStatus>;
}
