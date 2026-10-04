import { useCallback, useState } from 'react';
import type { Location } from '../api/types';

const STORAGE_KEY = 'weather-psychic:location';

/**
 * The SPA's chosen location, persisted in browser local storage.
 *
 * Seeds from the stored value on first render (invalid or malformed values
 * fall back to `null`), and persists on every change. Written only here — the
 * published widgets never read or write this key.
 *
 * @returns `[location, setLocation]` — the current selection (or `null`) and a
 * setter that persists the new selection.
 */
export function useLocation(): [Location | null, (location: Location) => void] {
  const [location, setLocationState] = useState<Location | null>(() => readStored());

  const setLocation = useCallback((next: Location) => {
    setLocationState(next);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // Storage may be unavailable (private mode / quota); the in-memory
      // selection still works for the session.
    }
  }, []);

  return [location, setLocation];
}

function readStored(): Location | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === null) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!isLocation(parsed)) return null;
    return parsed;
  } catch {
    return null;
  }
}

function isLocation(value: unknown): value is Location {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.id === 'number' &&
    typeof candidate.name === 'string' &&
    typeof candidate.latitude === 'number' &&
    typeof candidate.longitude === 'number' &&
    typeof candidate.timezone === 'string'
  );
}
