export interface Line {
  id: string;
  shortName: string;
  longName: string;
}

export interface Stop {
  id: string;
  name: string;
  lat: number;
  lon: number;
}

export interface StopWithLines extends Stop {
  lines: Line[];
}

export interface Passing {
  lineId: string;
  lineShortName: string;
  headsign: string;
  scheduledAt: string;
  minutesUntil: number;
}

export interface ConfigStop {
  id: number;
  stop: Stop;
  lineFilter: string[];
  displayOrder: number;
  enabled: boolean;
  missing?: boolean;
}

export interface Status {
  lastRefresh: string | null;
  feedVersion: string | null;
  stale: boolean;
  refreshing: boolean;
}
