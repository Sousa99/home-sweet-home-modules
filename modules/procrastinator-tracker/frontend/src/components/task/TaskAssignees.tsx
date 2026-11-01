import { useUpdateTask } from '../../api/tasks';
import { useUsers } from '../../api/meta';
import type { Task } from '../../api/client';
import { cn } from '../../lib/utils';

interface TaskAssigneesProps {
  task: Task;
}

export function TaskAssignees({ task }: TaskAssigneesProps) {
  const users = useUsers();
  const updateTask = useUpdateTask();

  async function toggle(userId: number) {
    const current = task.assignees.map((a) => a.id);
    const next = current.includes(userId)
      ? current.filter((id) => id !== userId)
      : [...current, userId];
    await updateTask.mutateAsync({ id: task.id, input: { assigneeIds: next } });
  }

  if (!users.data) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {users.data.map((u) => {
        const active = task.assignees.some((a) => a.id === u.id);
        return (
          <button
            key={u.id}
            type="button"
            onClick={() => void toggle(u.id)}
            disabled={updateTask.isPending}
            className={cn(
              'rounded-brutal border px-3 py-1 text-xs transition-colors',
              active
                ? 'border-accent bg-surface-alt text-accent'
                : 'border-outline bg-surface text-ink-muted hover:bg-surface-alt',
            )}
          >
            {u.name}
          </button>
        );
      })}
      {users.data.length === 0 && (
        <span className="text-xs text-ink-muted">
          No users yet — create them via the API or MCP.
        </span>
      )}
    </div>
  );
}
