import { AppError } from '../lib/errors';
import { logger } from '../lib/logger';
import type {
  LiveEtaProvider,
  LivePrediction,
  NextTimesOptions,
  RealtimeSnapshot,
  ScheduleProvider,
} from '../providers/types';
import type { Passing, RealtimeInfo, Status } from '../lib/schemas';
import type { RefreshService } from './refresh';

/** Tolerance for matching a live prediction's scheduled time to a passing. */
const MATCH_TOLERANCE_MS = 3 * 60_000;

export interface StopTimesResult {
  times: Passing[];
  realtime: RealtimeInfo;
}

export interface ScheduleService {
  getStopTimes(stopId: string, options?: NextTimesOptions): Promise<StopTimesResult>;
  getStatus(): Promise<Status>;
}

export function createScheduleService(
  provider: ScheduleProvider,
  refresh?: RefreshService,
  realtime?: LiveEtaProvider,
): ScheduleService {
  return {
    async getStopTimes(stopId, options: NextTimesOptions = {}) {
      const stop = await provider.getStop(stopId);
      if (!stop) {
        throw new AppError(404, 'not_found', stopId);
      }
      const times = await provider.getNextTimes(stopId, {
        now: options.now ?? new Date(),
        limit: options.limit,
        lines: options.lines,
      });
      if (!realtime) {
        return {
          times,
          realtime: { available: false, lastUpdate: null, liveCount: 0, totalCount: times.length },
        };
      }
      const snapshot = await fetchRealtimeSnapshot(realtime, stop, stopId);
      const merged = mergeLivePredictions(times, snapshot, options.now ?? new Date());
      logUnmatchedPredictions(stopId, snapshot, merged.times);
      return {
        times: merged.times,
        realtime: {
          available: snapshot.available,
          lastUpdate: snapshot.available ? new Date(snapshot.fetchedAt).toISOString() : null,
          liveCount: merged.liveCount,
          totalCount: merged.times.length,
        },
      };
    },
    async getStatus() {
      const status = await provider.getStatus();
      const base = { ...status, refreshing: refresh?.isRefreshing() ?? false };
      if (!realtime) return base;
      const rt = await realtime.getStatus();
      return {
        ...base,
        realtimeLastUpdate: rt.lastUpdate,
        realtimeAvailable: rt.available,
        realtimeStale: rt.stale,
      };
    },
  };
}

/**
 * Candidate realtime ids for a stop. Fresh DBs store the authoritative
 * `realtimeId` (from GTFS `legacy_ids`). Legacy DBs predate that column: the
 * CM static feed renumbered most stops from `0xxxxx` to `3xxxxx` while the
 * realtime feed still keys the legacy id, so for `3`-prefixed ids we also try
 * the `0`-prefixed variant. The retry only happens when the primary id yields
 * no arrivals, so stops that were never renumbered are unaffected.
 */
function realtimeCandidateIds(stop: { realtimeId?: string | null }, stopId: string): string[] {
  if (stop.realtimeId) return [stop.realtimeId];
  const ids = [stopId];
  if (/^3\d{5}$/.test(stopId)) ids.push(`0${stopId.slice(1)}`);
  return ids;
}

async function fetchRealtimeSnapshot(
  realtime: LiveEtaProvider,
  stop: { realtimeId?: string | null },
  stopId: string,
): Promise<RealtimeSnapshot> {
  let snapshot: RealtimeSnapshot = { arrivals: [], fetchedAt: Date.now(), available: false };
  for (const id of realtimeCandidateIds(stop, stopId)) {
    snapshot = await realtime.getStopArrivals(id);
    if (snapshot.arrivals.length > 0) break; // found data
    if (!snapshot.available && !snapshot.unknownStop) break; // feed is down
    // Otherwise the id is unknown to the realtime feed (404) or has no data —
    // try the next candidate.
  }
  return snapshot;
}

/**
 * Merge fresh live predictions onto scheduled passings (constitution II:
 * stale data is never shown as live). The realtime feed's trip ids do not
 * match our static GTFS trip ids, so predictions are matched by line +
 * direction + scheduled-time proximity (the feed exposes its own scheduled
 * time). Rows sort by the time actually shown.
 */
function mergeLivePredictions(
  times: Passing[],
  snapshot: RealtimeSnapshot,
  now: Date,
): { times: Passing[]; liveCount: number } {
  if (!snapshot.available) {
    return { times, liveCount: 0 };
  }
  const byLine = new Map<string, LivePrediction[]>();
  for (const prediction of snapshot.arrivals) {
    if (prediction.estimatedAt === null || prediction.lineId === '') continue;
    const bucket = byLine.get(prediction.lineId) ?? [];
    bucket.push(prediction);
    byLine.set(prediction.lineId, bucket);
  }

  let liveCount = 0;
  const merged = times.map((passing) => {
    const prediction = pickPrediction(passing, byLine.get(passing.lineShortName) ?? []);
    if (!prediction || prediction.estimatedAt === null) return passing;

    const predictedAt = new Date(prediction.estimatedAt).toISOString();
    const delayMinutes =
      prediction.scheduledAt !== null
        ? Math.round((prediction.estimatedAt - prediction.scheduledAt) / 60_000)
        : null;
    liveCount += 1;
    return {
      ...passing,
      source: 'live' as const,
      predictedAt,
      delayMinutes,
      minutesUntil: Math.ceil((prediction.estimatedAt - now.getTime()) / 60_000),
    };
  });

  merged.sort((a, b) => shownTimeMs(a) - shownTimeMs(b));
  return { times: merged, liveCount };
}

/**
 * Pick the prediction for a passing: same line, same scheduled time within
 * tolerance, preferring the same direction when the feed exposes one.
 */
function pickPrediction(
  passing: Passing,
  candidates: LivePrediction[],
): LivePrediction | undefined {
  const scheduledMs = Date.parse(passing.scheduledAt);
  const sameTime = candidates.filter(
    (p) => p.scheduledAt !== null && Math.abs(p.scheduledAt - scheduledMs) <= MATCH_TOLERANCE_MS,
  );
  if (sameTime.length === 0) return undefined;
  if (passing.directionId !== null && passing.directionId !== undefined) {
    const sameDirection = sameTime.find((p) => p.directionId === passing.directionId);
    if (sameDirection) return sameDirection;
  }
  return sameTime[0];
}

function shownTimeMs(passing: Passing): number {
  return passing.source === 'live' && passing.predictedAt
    ? Date.parse(passing.predictedAt)
    : Date.parse(passing.scheduledAt);
}

/**
 * Predictions that could not be matched to a schedule row are skipped (never
 * a phantom bus); surface them once per query as a warning (spec edge case,
 * constitution V).
 */
function logUnmatchedPredictions(
  stopId: string,
  snapshot: RealtimeSnapshot,
  times: Passing[],
): void {
  if (!snapshot.available || snapshot.arrivals.length === 0) return;
  let matched = 0;
  for (const passing of times) {
    const candidates = snapshot.arrivals.filter(
      (p) => p.lineId === passing.lineShortName && p.estimatedAt !== null,
    );
    if (pickPrediction(passing, candidates)) matched += 1;
  }
  const liveWithEstimate = snapshot.arrivals.filter((p) => p.estimatedAt !== null).length;
  const unmatched = liveWithEstimate - matched;
  if (unmatched > 0) {
    logger.warn('realtime predictions without a matching schedule row', {
      stopId,
      unmatched,
    });
  }
}
