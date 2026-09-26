import { useState } from 'react';
import { Button } from './components/ui/button';
import ConfigPage from './pages/Config';
import DashboardPage from './pages/Dashboard';

type Tab = 'dashboard' | 'config';

export default function App() {
  const [tab, setTab] = useState<Tab>('dashboard');

  return (
    <div className="mx-auto max-w-3xl p-6">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold text-slate-800">bus-catcher</h1>
        <p className="text-sm text-slate-500">Next bus times for your stops</p>
      </header>
      <nav className="mb-6 flex gap-2">
        <Button
          variant={tab === 'dashboard' ? 'default' : 'secondary'}
          onClick={() => setTab('dashboard')}
        >
          Dashboard
        </Button>
        <Button
          variant={tab === 'config' ? 'default' : 'secondary'}
          onClick={() => setTab('config')}
        >
          Config
        </Button>
      </nav>
      <main>{tab === 'dashboard' ? <DashboardPage /> : <ConfigPage />}</main>
    </div>
  );
}
