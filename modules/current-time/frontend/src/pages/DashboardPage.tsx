import { Clock } from 'lucide-react';
import { ClockCard } from '../components/clock/ClockCard';

export function DashboardPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-10 bg-amber-50/60 px-4 py-10 text-slate-800">
      <header className="flex items-center gap-2 text-slate-500">
        <Clock className="size-5 text-amber-600" />
        <h1 className="text-sm font-medium uppercase tracking-[0.3em]">Current time</h1>
      </header>
      <div className="h-40 w-full max-w-3xl">
        <ClockCard align="center" switchable />
      </div>
    </main>
  );
}
