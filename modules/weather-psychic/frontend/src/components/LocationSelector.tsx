import { useEffect, useRef, useState } from 'react';
import type { JSX } from 'react';
import { searchLocations as defaultSearch } from '../api/client';
import type { Location } from '../api/types';
import { cn } from '../lib/utils';

/** The location-search capability, injectable for tests and Storybook. */
export type SearchLocations = (query: string) => Promise<Location[]>;

export interface LocationSelectorProps {
  /** Currently selected location (controlled). */
  value: Location | null;
  /** Called when a search result is chosen. */
  onChange: (location: Location) => void;
  /** Injectable search fetcher (Storybook fixtures / tests). Defaults to the API client. */
  searchLocations?: SearchLocations;
  /** Base URL of the module backend (base-url contract); `''` = same-origin `/api`. */
  baseUrl?: string;
  /** Input placeholder. */
  placeholder?: string;
  /** Extra classes applied to the control root. */
  className?: string;
}

/**
 * Search-and-select control for choosing the location. Debounces the input as
 * the user types, lists matching places, and calls `onChange` when a result is
 * selected. The SPA binds this to `useLocation`; the control itself persists
 * nothing.
 */
export const LocationSelector = ({
  value,
  onChange,
  searchLocations,
  baseUrl = '',
  placeholder = 'Search for a city…',
  className,
}: LocationSelectorProps): JSX.Element => {
  const searchRef = useRef<SearchLocations | null>(null);
  if (searchRef.current === null) {
    searchRef.current = searchLocations ?? ((query) => defaultSearch(query, baseUrl));
  }

  const [query, setQuery] = useState(value?.name ?? '');
  const [results, setResults] = useState<Location[]>([]);
  const [open, setOpen] = useState(false);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    setQuery(value?.name ?? '');
  }, [value]);

  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([]);
      setOpen(false);
      return undefined;
    }

    const handle = setTimeout(async () => {
      setSearching(true);
      try {
        const matches = (await searchRef.current?.(query.trim())) ?? [];
        setResults(matches);
        setOpen(true);
      } catch {
        setResults([]);
        setOpen(false);
      } finally {
        setSearching(false);
      }
    }, 250);

    return () => clearTimeout(handle);
  }, [query]);

  return (
    <div className={cn('relative', className)}>
      <input
        type="text"
        role="textbox"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => {
          if (results.length > 0) setOpen(true);
        }}
        placeholder={placeholder}
        className="w-full rounded-lg border border-amber-200/70 bg-white px-3 py-2 text-sm text-slate-700 placeholder:text-slate-400 focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-200"
      />
      {searching && <span className="absolute right-3 top-2.5 text-xs text-slate-400">…</span>}

      {open && results.length > 0 && (
        <ul className="absolute z-10 mt-1 w-full overflow-hidden rounded-lg border border-slate-100 bg-white shadow-md">
          {results.map((result) => (
            <li key={result.id}>
              <button
                type="button"
                onClick={() => {
                  onChange(result);
                  setOpen(false);
                }}
                className="flex w-full items-baseline justify-between gap-2 px-3 py-2 text-left text-sm text-slate-700 hover:bg-amber-50"
              >
                <span>{result.name}</span>
                {result.country !== undefined && (
                  <span className="text-xs text-slate-400">{result.country}</span>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
