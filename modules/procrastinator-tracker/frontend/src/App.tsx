import { Link, Route, Routes } from 'react-router';
import { ListTodo } from 'lucide-react';
import DashboardPage from './pages/DashboardPage';
import TaskDetailPage from './pages/TaskDetailPage';

export default function App() {
  return (
    <div className="min-h-screen bg-surface-alt text-ink">
      <header className="sticky top-0 z-10 border-b border-outline bg-surface-alt backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center gap-2 px-4 py-3">
          <Link to="/" className="flex items-center gap-2 font-semibold text-ink">
            <ListTodo className="size-5 text-accent" />
            Procrastinator Tracker
          </Link>
          <span className="ml-auto text-xs text-ink-muted">small steps, big progress</span>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-6">
        <Routes>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/tasks/:id" element={<TaskDetailPage />} />
        </Routes>
      </main>
    </div>
  );
}
