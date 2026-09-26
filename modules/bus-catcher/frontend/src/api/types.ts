export interface Line {
  id: string;
  shortName: string;
  longName: string;
}

/** A line option at a stop, resolved per direction (e.g. "736 → Cais"). */
export interface LineOption {
  id: string;
  shortName: string;
  longName: string;
  directionId: number | null;
  headsign: string;
}

export interface Stop {
  id: string;
  name: string;
  lat: number;
  lon: number;
}

export interface StopWithLines extends Stop {
  lines: LineOption[];
}

export interface Passing {
  tripId?: string;
  lineId: string;
  lineShortName: string;
  headsign: string;
  directionId?: number | null;
  scheduledAt: string;
  minutesUntil: number;
  source?: 'live' | 'scheduled';
  predictedAt?: string;
  delayMinutes?: number | null;
}

export interface RealtimeInfo {
  available: boolean;
  lastUpdate: string | null;
  liveCount: number;
  totalCount: number;
}

export interface StopTimesResponse {
  stopId: string;
  times: Passing[];
  realtime: RealtimeInfo;
}

/**
 * Per-stop departure thresholds, in minutes before the bus arrives. Resolved
 * by the backend to the documented defaults (10 / 5 / 1) when a stop has no
 * explicit values.
 */
export interface DepartureThresholds {
  headsUpMinutes: number;
  leaveNowMinutes: number;
  missedMinutes: number;
}

export interface ConfigStop {
  id: number;
  stop: Stop;
  lineFilter: string[];
  displayOrder: number;
  enabled: boolean;
  thresholds: DepartureThresholds;
  missing?: boolean;
}

export interface Status {
  lastRefresh: string | null;
  feedVersion: string | null;
  stale: boolean;
  refreshing: boolean;
  realtimeLastUpdate?: string | null;
  realtimeAvailable?: boolean;
  realtimeStale?: boolean;
}
