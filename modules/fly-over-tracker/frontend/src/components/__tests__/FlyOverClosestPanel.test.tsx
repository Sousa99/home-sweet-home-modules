import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { configureApiBaseUrl } from '../../api/baseUrl';
import type { Aircraft, FlyOverResult, LocationQuery } from '../../api/types';
import type { UseFlyOversQueryResult } from '../../hooks/useFlyOversQuery';
import { FlyOverClosestPanel } from '../FlyOverClosestPanel';

vi.mock('../../hooks/useFlyOversQuery', () => ({
  useFlyOversQuery: vi.fn(),
}));

import { useFlyOversQuery } from '../../hooks/useFlyOversQuery';

const mockedUseFlyOversQuery = vi.mocked(useFlyOversQuery);

const location: LocationQuery = { lat: 48.8566, lng: 2.3522, radiusKm: 50 };

function aircraft(overrides: Partial<Aircraft> & Pick<Aircraft, 'icao24' | 'callsign'>): Aircraft {
  return {
    originAirport: null,
    originCity: null,
    originAirportName: null,
    originCountry: null,
    destinationAirport: null,
    destinationCity: null,
    destinationAirportName: null,
    destinationCountry: null,
    latitude: 48.9211,
    longitude: 2.4288,
    altitude: 9144,
    onGround: false,
    velocity: 251.2,
    trueTrack: 87.5,
    verticalRate: 0,
    distanceKm: 8.2,
    ...overrides,
  };
}

const dlh = aircraft({ icao24: '3c6444', callsign: 'DLH400', distanceKm: 8.2 });
const ryr = aircraft({ icao24: '4ca866', callsign: 'RYR45A', distanceKm: 26.1 });
const tap = aircraft({ icao24: '4951a1', callsign: 'TAP123', distanceKm: 40.5 });

function result(aircraftList: Aircraft[]): FlyOverResult {
  return {
    center: { lat: 48.8566, lng: 2.3522 },
    radiusKm: 50,
    asOf: 1_726_900_000,
    count: aircraftList.length,
    destinationEnrichment: 'complete',
    aircraft: aircraftList,
  };
}

function makeState(overrides: Partial<UseFlyOversQueryResult>): UseFlyOversQueryResult {
  return {
    data: result([dlh, ryr, tap]),
    dataUpdatedAt: 1_726_900_000,
    isLoading: false,
    isFetching: false,
    isError: false,
    error: null,
    refetch: vi.fn(),
    ...overrides,
  };
}

const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

type ChangeListener = (event: { matches: boolean; media: string }) => void;

function mockMatchMedia(reduce: boolean) {
  const listeners = new Set<ChangeListener>();
  const mql = {
    matches: reduce,
    media: REDUCED_MOTION_QUERY,
    addEventListener: (_type: string, cb: ChangeListener) => {
      listeners.add(cb);
    },
    removeEventListener: (_type: string, cb: ChangeListener) => {
      listeners.delete(cb);
    },
    addListener: () => undefined,
    removeListener: () => undefined,
    onchange: null,
    dispatchEvent: () => true,
  };
  vi.stubGlobal(
    'matchMedia',
    vi.fn().mockImplementation((query: string) => ({ ...mql, media: query })),
  );
  return {
    /** Flip the reduced-motion preference and notify the hook's listener. */
    toggleTo(value: boolean) {
      for (const listener of [...listeners]) {
        listener({ matches: value, media: REDUCED_MOTION_QUERY });
      }
    },
  };
}

/**
 * Deterministic requestAnimationFrame driver: frames advance by 16ms (like the
 * browser's typical cadence) and callbacks receive the cumulative clock, so the
 * smooth-scroll loop can be stepped through frame by frame.
 */
function createRafDriver() {
  let now = 0;
  let nextId = 1;
  const queue: Array<{ id: number; cb: FrameRequestCallback }> = [];

  vi.stubGlobal('requestAnimationFrame', ((cb: FrameRequestCallback) => {
    queue.push({ id: nextId, cb });
    return nextId++;
  }) as typeof requestAnimationFrame);
  vi.stubGlobal('cancelAnimationFrame', ((id: number) => {
    const idx = queue.findIndex((f) => f.id === id);
    if (idx >= 0) queue.splice(idx, 1);
  }) as typeof cancelAnimationFrame);

  return {
    /** Run a single 16ms frame. */
    frame() {
      now += 16;
      const batch = [...queue];
      queue.length = 0;
      for (const f of batch) f.cb(now);
    },
    /** Run `n` frames. */
    frames(n: number) {
      for (let i = 0; i < n; i += 1) this.frame();
    },
  };
}

/** Force the overflow metrics the auto-scroll hook reads (jsdom cannot lay out). */
function overflow(list: HTMLElement, scrollHeight: number, clientHeight: number): void {
  Object.defineProperty(list, 'scrollHeight', { configurable: true, value: scrollHeight });
  Object.defineProperty(list, 'clientHeight', { configurable: true, value: clientHeight });
}

let driver: ReturnType<typeof createRafDriver>;
let motion: ReturnType<typeof mockMatchMedia>;

beforeEach(() => {
  vi.clearAllMocks();
  motion = mockMatchMedia(false);
  driver = createRafDriver();
});

afterEach(() => {
  configureApiBaseUrl(undefined);
  vi.unstubAllGlobals();
});

describe('FlyOverClosestPanel', () => {
  it('renders the closest aircraft as a tile and the rest as list cards, without repeating it', () => {
    mockedUseFlyOversQuery.mockReturnValue(makeState({}));
    render(<FlyOverClosestPanel location={location} />);

    // Closest appears exactly once (the tile), never repeated in the list.
    expect(screen.getAllByText('DLH400')).toHaveLength(1);
    expect(screen.getByText('RYR45A')).toBeInTheDocument();
    expect(screen.getByText('TAP123')).toBeInTheDocument();
    expect(screen.queryByText(/aircraft over/i)).not.toBeInTheDocument();
    expect(
      screen.getByText(/Last updated \d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/),
    ).toBeInTheDocument();
  });

  it('caps the list to maxResults after the closest tile', () => {
    mockedUseFlyOversQuery.mockReturnValue(makeState({}));
    render(<FlyOverClosestPanel location={location} maxResults={1} />);

    expect(screen.getAllByText('DLH400')).toHaveLength(1);
    expect(screen.getByText('RYR45A')).toBeInTheDocument();
    expect(screen.queryByText('TAP123')).not.toBeInTheDocument();
  });

  it('picks the closest deterministically on a distance tie (by icao24)', () => {
    const tied = [
      aircraft({ icao24: '4ca866', callsign: 'RYR45A', distanceKm: 10 }),
      aircraft({ icao24: '3c6444', callsign: 'DLH400', distanceKm: 10 }),
    ];
    mockedUseFlyOversQuery.mockReturnValue(makeState({ data: result(tied) }));
    render(<FlyOverClosestPanel location={location} />);

    expect(screen.getAllByText('DLH400')).toHaveLength(1);
    expect(screen.getByText('RYR45A')).toBeInTheDocument();
  });

  it('shows a loading hint while the first fetch is pending', () => {
    mockedUseFlyOversQuery.mockReturnValue(
      makeState({ data: null, dataUpdatedAt: null, isLoading: true }),
    );
    render(<FlyOverClosestPanel location={location} />);

    expect(screen.getByText('Loading aircraft…')).toBeInTheDocument();
    expect(screen.getByText('Not updated yet')).toBeInTheDocument();
  });

  it('shows an empty state when no aircraft are in range', () => {
    mockedUseFlyOversQuery.mockReturnValue(makeState({ data: result([]) }));
    render(<FlyOverClosestPanel location={location} />);

    expect(screen.getByText(/No aircraft within 50 km/)).toBeInTheDocument();
  });

  it('shows an error state when the fetch fails', () => {
    mockedUseFlyOversQuery.mockReturnValue(
      makeState({
        data: null,
        dataUpdatedAt: null,
        isError: true,
        error: new Error('Aircraft feed is temporarily unavailable'),
      }),
    );
    render(<FlyOverClosestPanel location={location} />);

    expect(screen.getByRole('alert')).toHaveTextContent('temporarily unavailable');
    expect(screen.getByText('Not updated yet')).toBeInTheDocument();
  });

  it('shows the updating indicator only while a refresh is in flight', () => {
    const { rerender } = render(<FlyOverClosestPanel location={location} />);
    mockedUseFlyOversQuery.mockReturnValue(makeState({ isFetching: true }));
    rerender(<FlyOverClosestPanel location={location} />);
    expect(
      screen.getAllByRole('status').some((region) => region.textContent?.includes('Updating…')),
    ).toBe(true);

    mockedUseFlyOversQuery.mockReturnValue(makeState({ isFetching: false }));
    rerender(<FlyOverClosestPanel location={location} />);
    expect(screen.queryByText('Updating…')).not.toBeInTheDocument();
  });

  it('triggers a refetch from the manual refresh button', async () => {
    const user = userEvent.setup();
    const refetch = vi.fn();
    mockedUseFlyOversQuery.mockReturnValue(makeState({ refetch }));
    render(<FlyOverClosestPanel location={location} />);

    await user.click(screen.getByRole('button', { name: 'Refresh' }));
    expect(refetch).toHaveBeenCalledTimes(1);
  });

  it('renders the standardized status bar with the last update time', () => {
    mockedUseFlyOversQuery.mockReturnValue(makeState({}));
    render(<FlyOverClosestPanel location={location} />);

    expect(
      screen.getByText(/Last updated \d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Refresh' })).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveAttribute('aria-live', 'polite');
  });

  it('keeps the last update time, surfaces the error, and still offers Refresh on a failed refresh', async () => {
    const user = userEvent.setup();
    const refetch = vi.fn();
    mockedUseFlyOversQuery.mockReturnValue(
      makeState({
        isError: true,
        error: new Error('Aircraft feed is temporarily unavailable'),
        refetch,
      }),
    );
    render(<FlyOverClosestPanel location={location} />);

    expect(screen.getByRole('alert')).toHaveTextContent('temporarily unavailable');
    expect(
      screen.getByText(/Last updated \d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/),
    ).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Refresh' }));
    expect(refetch).toHaveBeenCalledTimes(1);
  });

  it('passes the configured location, autoRefresh, and baseUrl to the hook', () => {
    mockedUseFlyOversQuery.mockReturnValue(makeState({}));
    render(
      <FlyOverClosestPanel
        location={location}
        autoRefresh={10}
        baseUrl="https://api.example.com"
      />,
    );

    expect(mockedUseFlyOversQuery).toHaveBeenCalledWith({
      location,
      autoRefresh: 10,
      baseUrl: 'https://api.example.com',
    });
  });

  it('defaults the hook baseUrl to the runtime-configured value', () => {
    mockedUseFlyOversQuery.mockReturnValue(makeState({}));
    configureApiBaseUrl('https://configured.example.com');
    render(<FlyOverClosestPanel location={location} />);

    expect(mockedUseFlyOversQuery).toHaveBeenCalledWith({
      location,
      autoRefresh: 'off',
      baseUrl: 'https://configured.example.com',
    });
  });

  it('auto-scrolls the closest-flights list when it overflows', () => {
    const many = Array.from({ length: 20 }, (_, i) =>
      aircraft({
        icao24: `c${String(i).padStart(5, '0')}`,
        callsign: `FLY${i}`,
        distanceKm: 10 + i,
      }),
    );
    mockedUseFlyOversQuery.mockReturnValue(makeState({ data: result(many) }));
    render(<FlyOverClosestPanel location={location} />);

    const list = screen.getByTestId('closest-flights-list');
    overflow(list, 2000, 300); // max scrollTop = 1700 (never reached here)

    act(() => {
      driver.frames(10);
    });
    // ~0.4px/frame at the 25 px/s default: it has moved a little but far from
    // the 1700px max — a slow glide, not a single jump to the end.
    expect(list.scrollTop).toBeGreaterThan(0);
    expect(list.scrollTop).toBeLessThan(1700);

    act(() => {
      driver.frames(20);
    });
    const progressed = list.scrollTop;
    expect(progressed).toBeGreaterThan(8);

    act(() => {
      driver.frames(20);
    });
    expect(list.scrollTop).toBeGreaterThan(progressed);
  });

  it('starts auto-scrolling once loading gives way to an overflowing list', () => {
    const many = Array.from({ length: 20 }, (_, i) =>
      aircraft({
        icao24: `c${String(i).padStart(5, '0')}`,
        callsign: `FLY${i}`,
        distanceKm: 10 + i,
      }),
    );
    mockedUseFlyOversQuery.mockReturnValue(
      makeState({ data: null, dataUpdatedAt: null, isLoading: true }),
    );
    const { rerender } = render(<FlyOverClosestPanel location={location} />);
    expect(screen.queryByTestId('closest-flights-list')).not.toBeInTheDocument();

    // Frames with no list keep the loop alive without moving anything.
    act(() => {
      driver.frames(5);
    });

    // Loading resolves into an overflowing list.
    mockedUseFlyOversQuery.mockReturnValue(makeState({ data: result(many) }));
    rerender(<FlyOverClosestPanel location={location} />);

    const list = screen.getByTestId('closest-flights-list');
    overflow(list, 2000, 300);

    act(() => {
      driver.frames(10);
    });
    expect(list.scrollTop).toBeGreaterThan(0);
  });

  it('keeps a short non-overflowing list static', () => {
    mockedUseFlyOversQuery.mockReturnValue(makeState({}));
    render(<FlyOverClosestPanel location={location} />);

    const list = screen.getByTestId('closest-flights-list');
    overflow(list, 300, 300); // scrollHeight === clientHeight → nothing to scroll

    act(() => {
      driver.frames(20);
    });
    expect(list.scrollTop).toBe(0);
  });

  it('never auto-scrolls under prefers-reduced-motion', () => {
    motion = mockMatchMedia(true);
    const many = Array.from({ length: 20 }, (_, i) =>
      aircraft({
        icao24: `c${String(i).padStart(5, '0')}`,
        callsign: `FLY${i}`,
        distanceKm: 10 + i,
      }),
    );
    mockedUseFlyOversQuery.mockReturnValue(makeState({ data: result(many) }));
    render(<FlyOverClosestPanel location={location} />);

    const list = screen.getByTestId('closest-flights-list');
    overflow(list, 2000, 300);

    act(() => {
      driver.frames(100);
    });
    expect(list.scrollTop).toBe(0);
  });

  it('halts the auto-scroll when reduced motion is enabled mid-scroll', () => {
    const many = Array.from({ length: 20 }, (_, i) =>
      aircraft({
        icao24: `c${String(i).padStart(5, '0')}`,
        callsign: `FLY${i}`,
        distanceKm: 10 + i,
      }),
    );
    mockedUseFlyOversQuery.mockReturnValue(makeState({ data: result(many) }));
    render(<FlyOverClosestPanel location={location} />);

    const list = screen.getByTestId('closest-flights-list');
    overflow(list, 2000, 300);

    act(() => {
      driver.frames(10);
    });
    const stoppedAt = list.scrollTop;
    expect(stoppedAt).toBeGreaterThan(0);

    act(() => {
      motion.toggleTo(true);
      driver.frames(50);
    });
    expect(list.scrollTop).toBe(stoppedAt);
  });

  it('pauses the auto-scroll while the pointer is over the list and resumes on leave', () => {
    const many = Array.from({ length: 20 }, (_, i) =>
      aircraft({
        icao24: `c${String(i).padStart(5, '0')}`,
        callsign: `FLY${i}`,
        distanceKm: 10 + i,
      }),
    );
    mockedUseFlyOversQuery.mockReturnValue(makeState({ data: result(many) }));
    render(<FlyOverClosestPanel location={location} />);

    const list = screen.getByTestId('closest-flights-list');
    overflow(list, 2000, 300);

    act(() => {
      driver.frames(5);
    });
    const beforeHover = list.scrollTop;
    expect(beforeHover).toBeGreaterThan(0);

    // Hover holds the position exactly, no matter how many frames pass.
    act(() => {
      fireEvent.pointerEnter(list);
      driver.frames(10);
    });
    expect(list.scrollTop).toBe(beforeHover);

    // Leaving resumes the glide.
    act(() => {
      fireEvent.pointerLeave(list);
      driver.frames(1);
    });
    act(() => {
      driver.frames(5);
    });
    expect(list.scrollTop).toBeGreaterThan(beforeHover);
  });

  it('renders no scrolling list in the loading state', () => {
    mockedUseFlyOversQuery.mockReturnValue(
      makeState({ data: null, dataUpdatedAt: null, isLoading: true }),
    );
    render(<FlyOverClosestPanel location={location} />);

    expect(screen.queryByTestId('closest-flights-list')).not.toBeInTheDocument();
  });

  it('renders no scrolling list in the empty state', () => {
    mockedUseFlyOversQuery.mockReturnValue(makeState({ data: result([]) }));
    render(<FlyOverClosestPanel location={location} />);

    expect(screen.queryByTestId('closest-flights-list')).not.toBeInTheDocument();
  });

  it('renders no scrolling list in the error state', () => {
    mockedUseFlyOversQuery.mockReturnValue(
      makeState({
        data: null,
        dataUpdatedAt: null,
        isError: true,
        error: new Error('Aircraft feed is temporarily unavailable'),
      }),
    );
    render(<FlyOverClosestPanel location={location} />);

    expect(screen.queryByTestId('closest-flights-list')).not.toBeInTheDocument();
  });
});
