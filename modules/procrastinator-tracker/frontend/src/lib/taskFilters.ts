import type { TaskFilters } from '../api/client';

export function hasActiveFilters(filters: TaskFilters): boolean {
  return Object.values(filters).some((value) => value !== undefined);
}
