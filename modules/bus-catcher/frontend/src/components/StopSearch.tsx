import { useState } from 'react';
import { useSearchStops } from '../api/queries';
import type { Stop } from '../api/types';
import { useDebouncedValue } from '../lib/useDebounce';
import { Button } from './ui/button';
import { Input } from './ui/input';

export function StopSearch({ onSelect }: { onSelect: (stop: Stop) => void }) {
  const [query, setQuery] = useState('');
  const debounced = useDebouncedValue(query.trim());
  const { data, isFetching } = useSearchStops(debounced);
  const results = data?.stops ?? [];

  return (
    <div>
      <Input
        placeholder="Search stops (e.g. saldanha)"
        aria-label="Search stops"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
      />
      {isFetching && <p className="mt-1 text-xs text-slate-400">Searching…</p>}
      {!isFetching && debounced.length >= 2 && results.length === 0 && (
        <p className="mt-1 text-xs text-slate-500">No stops found.</p>
      )}
      {results.length > 0 && (
        <ul className="mt-2 divide-y divide-slate-100">
          {results.map((stop) => (
            <li key={stop.id} className="py-1">
              <Button
                variant="ghost"
                className="w-full justify-start text-left"
                onClick={() => onSelect(stop)}
              >
                {stop.name}
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
