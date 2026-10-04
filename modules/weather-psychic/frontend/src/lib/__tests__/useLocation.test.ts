import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { Location } from '../../api/types';
import { useLocation } from '../useLocation';

const STORAGE_KEY = 'weather-psychic:location';

const LISBON: Location = {
  id: 2267057,
  name: 'Lisbon',
  latitude: 38.7167,
  longitude: -9.1333,
  timezone: 'Europe/Lisbon',
  country: 'Portugal',
};

const MADRID: Location = {
  id: 3128760,
  name: 'Madrid',
  latitude: 40.4165,
  longitude: -3.7026,
  timezone: 'Europe/Madrid',
  country: 'Spain',
};

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  localStorage.clear();
});

describe('useLocation', () => {
  it('returns null when no location is stored', () => {
    const { result } = renderHook(() => useLocation());
    expect(result.current[0]).toBeNull();
  });

  it('seeds from a stored location', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(LISBON));
    const { result } = renderHook(() => useLocation());
    expect(result.current[0]).toEqual(LISBON);
  });

  it('persists a selected location to local storage', () => {
    const { result } = renderHook(() => useLocation());

    act(() => {
      result.current[1](MADRID);
    });

    expect(result.current[0]).toEqual(MADRID);
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null')).toEqual(MADRID);
  });

  it('falls back to null when the stored value is invalid', () => {
    localStorage.setItem(STORAGE_KEY, '{"not":"a location"}');
    const { result } = renderHook(() => useLocation());
    expect(result.current[0]).toBeNull();
  });

  it('falls back to null when the stored value is not JSON', () => {
    localStorage.setItem(STORAGE_KEY, 'garbage');
    const { result } = renderHook(() => useLocation());
    expect(result.current[0]).toBeNull();
  });
});
