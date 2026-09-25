import { AppError } from '../lib/errors';
import type { NextTimesOptions, ScheduleProvider } from '../providers/types';
import type { Passing, Status } from '../lib/schemas';
import type { RefreshService } from './refresh';

export interface ScheduleService {
  getStopTimes(stopId: string, options?: NextTimesOptions): Passing[] | Promise<Passing[]>;
  getStatus(): Promise<Status>;
}

export function createScheduleService(
  provider: ScheduleProvider,
  refresh?: RefreshService,
): ScheduleService {
  return {
    async getStopTimes(stopId, options: NextTimesOptions = {}) {
      const stop = await provider.getStop(stopId);
      if (!stop) {
        throw new AppError(404, 'not_found', stopId);
      }
      return provider.getNextTimes(stopId, {
        now: options.now ?? new Date(),
        limit: options.limit,
        lines: options.lines,
      });
    },
    async getStatus() {
      const status = await provider.getStatus();
      return { ...status, refreshing: refresh?.isRefreshing() ?? false };
    },
  };
}
