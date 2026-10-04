import { useCallback, useEffect, useRef, useState } from 'react';
import { WidgetStatusBar } from '@sousa99/homesweethome-components';
import type { Task, TaskFilters } from '../../api/client';
import { api } from '../../api/client';
import { cn } from '../../lib/utils';
import { hasActiveFilters } from '../../lib/taskFilters';
import { TaskDeck, type TaskDeckProps } from './TaskDeck';
import { TaskDeckEmpty } from './TaskDeckEmpty';

export interface TaskDeckWrapperProps extends Omit<TaskDeckProps, 'tasks'> {
  filters?: TaskFilters;
  refreshRateMs?: number;
  baseUrl?: string;
  dataSource?: (filters: TaskFilters) => Promise<Task[]>;
}

type LoadState =
  | { kind: 'loading' }
  | { kind: 'error'; message: string; tasks: Task[] | null; lastUpdatedAt: number | null }
  | { kind: 'success'; tasks: Task[]; lastUpdatedAt: number };

const EMPTY_FILTERS: TaskFilters = {};

export function TaskDeckWrapper({
  filters = EMPTY_FILTERS,
  refreshRateMs = 30000,
  baseUrl,
  dataSource = (filters) => api.listTasks(filters, baseUrl),
  autoRotateMs = 4000,
  loop = true,
  stackSize = 3,
  slideDurationMs = 500,
  transitionVariant = 'slide',
  renderCard,
  onCardChange,
  className,
  style,
}: TaskDeckWrapperProps) {
  const [state, setState] = useState<LoadState>({ kind: 'loading' });
  const [updating, setUpdating] = useState(false);
  const inFlight = useRef(false);
  const mounted = useRef(true);
  const filtersRef = useRef(filters);
  const dataSourceRef = useRef(dataSource);

  filtersRef.current = filters;
  dataSourceRef.current = dataSource;

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const load = useCallback(async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    setUpdating(true);
    setState((prev) => (prev.kind === 'success' ? prev : { kind: 'loading' }));
    try {
      const tasks = await dataSourceRef.current(filtersRef.current);
      if (mounted.current) setState({ kind: 'success', tasks, lastUpdatedAt: Date.now() });
    } catch (error) {
      if (mounted.current) {
        // A failed load keeps the last successful tasks and their timestamp
        // (FR-006); the failure is surfaced by the status bar and Refresh retries.
        setState((prev) => ({
          kind: 'error',
          message: error instanceof Error ? error.message : String(error),
          tasks: prev.kind === 'success' ? prev.tasks : null,
          lastUpdatedAt: prev.kind === 'success' ? prev.lastUpdatedAt : null,
        }));
      }
    } finally {
      inFlight.current = false;
      setUpdating(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const prevFilters = useRef(JSON.stringify(filters));
  useEffect(() => {
    const serialized = JSON.stringify(filters);
    if (prevFilters.current !== serialized) {
      prevFilters.current = serialized;
      void load();
    }
  }, [filters, load]);

  useEffect(() => {
    if (refreshRateMs <= 0) return;
    const id = setInterval(() => {
      void load();
    }, refreshRateMs);
    return () => clearInterval(id);
  }, [refreshRateMs, load]);

  const tasks = state.kind === 'success' || state.kind === 'error' ? state.tasks : null;

  return (
    <div className={cn('space-y-3', className)} style={style}>
      <WidgetStatusBar
        lastUpdatedAt={
          state.kind === 'success' || state.kind === 'error' ? state.lastUpdatedAt : null
        }
        updating={updating}
        error={state.kind === 'error' ? state.message : null}
        onRefresh={() => void load()}
      />
      {state.kind === 'loading' && <p className="text-sm text-slate-400">Loading tasks…</p>}
      {tasks !== null &&
        (tasks.length === 0 ? (
          <div className="h-[var(--deck-height,16rem)] w-full">
            <TaskDeckEmpty
              message={
                hasActiveFilters(filters) ? 'No tasks match these filters.' : 'No tasks yet.'
              }
            />
          </div>
        ) : (
          <TaskDeck
            tasks={tasks}
            filters={filters}
            autoRotateMs={autoRotateMs}
            loop={loop}
            stackSize={stackSize}
            slideDurationMs={slideDurationMs}
            transitionVariant={transitionVariant}
            renderCard={renderCard}
            onCardChange={onCardChange}
            style={style}
          />
        ))}
    </div>
  );
}
