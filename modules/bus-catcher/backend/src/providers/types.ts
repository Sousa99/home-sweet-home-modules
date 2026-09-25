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
