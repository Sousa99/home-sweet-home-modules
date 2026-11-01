import { useParams, Link } from 'react-router';
import { ArrowLeft, MapPin, Flame, CalendarDays } from 'lucide-react';
import { useTask } from '../api/tasks';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { StatusBadge } from '../components/ui/badge';
import { StatusControls } from '../components/task/StatusControls';
import { TaskAssignees } from '../components/task/TaskAssignees';
import { TaskComments } from '../components/task/TaskComments';

export default function TaskDetailPage() {
  const { id } = useParams();
  const taskId = Number(id);
  const task = useTask(taskId);

  if (task.isLoading) {
    return <p className="text-sm text-ink-muted">Loading task…</p>;
  }
  if (task.isError || !task.data) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-error">
          Could not load task: {task.error?.message ?? 'not found'}
        </p>
        <Link to="/" className="text-sm text-accent hover:underline">
          ← Back to dashboard
        </Link>
      </div>
    );
  }

  const t = task.data;

  return (
    <div className="space-y-4">
      <Link to="/" className="inline-flex items-center gap-1 text-sm text-accent hover:underline">
        <ArrowLeft className="size-4" /> Dashboard
      </Link>

      <Card>
        <CardHeader className="flex-wrap">
          <CardTitle className="flex-1 text-lg">{t.title}</CardTitle>
          <StatusBadge status={t.status} />
        </CardHeader>
        <CardContent className="space-y-4">
          {t.description && <p className="whitespace-pre-wrap text-ink">{t.description}</p>}

          <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-ink-muted">
            {t.urgency !== null && (
              <span className="inline-flex items-center gap-1">
                <Flame className="size-4 text-accent" /> Urgency {t.urgency}/5
              </span>
            )}
            {t.location && (
              <span className="inline-flex items-center gap-1">
                <MapPin className="size-4" /> {t.location}
              </span>
            )}
            {t.dueDate && (
              <span className="inline-flex items-center gap-1">
                <CalendarDays className="size-4" /> {new Date(t.dueDate).toLocaleDateString()}
              </span>
            )}
            {t.recurrence && (
              <span>
                Every {t.recurrence.interval} {t.recurrence.frequency.replace('ly', '')}(
                {t.recurrence.frequency})
              </span>
            )}
          </div>

          {t.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {t.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-brutal bg-surface-alt px-2.5 py-0.5 text-xs text-ink-muted"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}

          <StatusControls task={t} />

          <div>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-muted">
              Assignees
            </h3>
            <TaskAssignees task={t} />
          </div>

          <div>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-muted">
              Comments ({t.comments.length})
            </h3>
            <TaskComments taskId={t.id} comments={t.comments} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
