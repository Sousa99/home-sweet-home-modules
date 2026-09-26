import type { DB } from '../../db/client';
import type { NextTimesOptions, ScheduleProvider } from '../types';
import { getMetadata, getStop, listLines, nextTimes, searchStops } from './queries';

const STALE_AFTER_MS = 24 * 60 * 60 * 1000;

export function createCarrisMetropolitanaProvider(db: DB): ScheduleProvider {
  return {
    async searchStops(query, limit = 20) {
      return searchStops(db, query, limit);
    },
    async getStop(stopId) {
      return getStop(db, stopId);
    },
    async listLines() {
      return listLines(db);
    },
    async getNextTimes(stopId, options: NextTimesOptions = {}) {
      return nextTimes(db, stopId, {
        now: options.now ?? new Date(),
        limit: options.limit,
        lines: options.lines,
      });
    },
    async getStatus() {
      const lastRefresh = getMetadata(db, 'last_refresh');
      const feedVersion = getMetadata(db, 'feed_version');
      const stale = lastRefresh === null || Date.now() - Date.parse(lastRefresh) > STALE_AFTER_MS;
      return { lastRefresh, feedVersion, stale };
    },
  };
}
