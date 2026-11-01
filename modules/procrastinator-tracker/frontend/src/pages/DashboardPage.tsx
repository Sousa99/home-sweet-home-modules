import { useState } from 'react';
import { Sparkles } from 'lucide-react';
import { useTasks } from '../api/tasks';
import type { TaskFilters } from '../api/client';
import { TaskCreateForm } from '../components/task/TaskCreateForm';
import { TaskFilters as FilterBar } from '../components/task/TaskFilters';
import { TaskCard } from '../components/task/TaskCard';
import { TaskDeckWrapper } from '../components/task/TaskDeckWrapper';
import { cn } from '../lib/utils';

type ViewMode = 'deck' | 'list';

export default function DashboardPage() {
  const [filters, setFilters] = useState<TaskFilters>({});
  const [view, setView] = useState<ViewMode>('deck');
  const tasks = useTasks(filters);
  const [showForm, setShowForm] = useState(false);

  const active = tasks.data?.filter((t) => t.status !== 'finished') ?? [];
  const finished = tasks.data?.filter((t) => t.status === 'finished') ?? [];

  return (
    <div className="space-y-6">
      <section className="rounded-brutal bg-surface-alt   p-6 text-center">
        <h1 className="text-2xl font-semibold text-ink">What are we tackling today?</h1>
        <p className="mt-1 text-sm text-ink-muted">
          {active.length > 0
            ? `${active.length} ${active.length === 1 ? 'task' : 'tasks'} on the go. Small steps.`
            : 'Nothing pending — time to add your next win.'}
        </p>
        {active.length === 0 && <Sparkles className="mx-auto mt-3 size-6 text-accent" />}
      </section>

      <button
        type="button"
        onClick={() => setShowForm((v) => !v)}
        className="w-full rounded-brutal border-brutal py-2 text-sm font-medium text-accent hover:bg-surface-alt"
      >
        {showForm ? 'Hide form' : '+ Add a task'}
      </button>
      {showForm && <TaskCreateForm onCreated={() => setShowForm(false)} />}

      <FilterBar filters={filters} onChange={setFilters} />

      <div className="flex justify-center">
        <div className="inline-flex rounded-brutal border-brutal bg-surface p-1 shadow-brutal">
          {(['deck', 'list'] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => setView(mode)}
              className={cn(
                'rounded-brutal px-4 py-1.5 text-sm font-medium capitalize transition',
                view === mode
                  ? 'bg-accent text-accent-ink shadow-brutal'
                  : 'text-ink-muted hover:bg-surface-alt',
              )}
            >
              {mode}
            </button>
          ))}
        </div>
      </div>

      {view === 'deck' && <TaskDeckWrapper filters={{ ...filters, finished: false }} />}

      {view === 'list' && (
        <>
          {tasks.isLoading && <p className="text-sm text-ink-muted">Loading tasks…</p>}
          {tasks.isError && (
            <p className="text-sm text-error">
              Could not load tasks: {tasks.error?.message ?? 'unknown error'}
            </p>
          )}

          {!tasks.isLoading && !tasks.isError && active.length === 0 && (
            <p className="rounded-brutal bg-surface py-8 text-center text-sm text-ink-muted">
              {filters.status || filters.tag
                ? 'No tasks match these filters.'
                : 'No active tasks. Add one above to get rolling.'}
            </p>
          )}

          <div className="space-y-3">
            {active.map((task) => (
              <TaskCard key={task.id} task={task} />
            ))}
          </div>

          {finished.length > 0 && (
            <section>
              <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-muted">
                Done ({finished.length})
              </h2>
              <div className="space-y-3 opacity-70">
                {finished.map((task) => (
                  <TaskCard key={task.id} task={task} />
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
