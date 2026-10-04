import { render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { HourlyEntry } from '../api/types';
import { HourlyStrip } from './HourlyStrip';

const NOW = '2026-10-04T12:00:00Z';

function makeHourly(): HourlyEntry[] {
  const entries: HourlyEntry[] = [];
  for (let i = 0; i < 8; i += 1) {
    const time = new Date(`2026-10-04T${String(i).padStart(2, '0')}:00:00Z`);
    entries.push({
      time: time.toISOString(),
      temperature: 18 + i,
      weatherCode: i % 3,
      condition: ['Clear sky', 'Partly cloudy', 'Overcast'][i % 3] as string,
      precipitationProbability: i % 4 === 0 ? 30 : 0,
      isDay: true,
    });
  }
  return entries;
}

function matchMediaStub(reduce: boolean) {
  vi.stubGlobal(
    'matchMedia',
    vi.fn().mockImplementation((query: string) => ({
      matches: reduce,
      media: query,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      addListener: () => undefined,
      removeListener: () => undefined,
      onchange: null,
      dispatchEvent: () => true,
    })),
  );
}

beforeEach(() => {
  vi.useFakeTimers();
  matchMediaStub(false);
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('HourlyStrip', () => {
  it('renders an hourly entry for each hour', () => {
    render(<HourlyStrip hourly={makeHourly()} now={NOW} />);
    // 8 hours × hour label
    const labels = screen.getAllByText(/^\d{2}:\d{2}$/);
    expect(labels.length).toBe(8);
  });

  it('excludes the current hour from the strip', () => {
    render(<HourlyStrip hourly={makeHourly()} now="2026-10-04T03:00:00Z" />);
    // With now=03:00, the 03:00 entry must not appear.
    expect(screen.queryByText('03:00')).not.toBeInTheDocument();
    expect(screen.getByText('04:00')).toBeInTheDocument();
  });

  it('excludes the current hour using offset-less local timestamps (provider wall-clock)', () => {
    // Open-Meteo returns offset-less local times, e.g. "2026-10-04T14:00".
    const localHourly: HourlyEntry[] = [
      {
        time: '2026-10-04T14:00',
        temperature: 21,
        weatherCode: 2,
        condition: 'Partly cloudy',
        precipitationProbability: 0,
        isDay: true,
      },
      {
        time: '2026-10-04T15:00',
        temperature: 22,
        weatherCode: 2,
        condition: 'Partly cloudy',
        precipitationProbability: 0,
        isDay: true,
      },
      {
        time: '2026-10-04T16:00',
        temperature: 23,
        weatherCode: 3,
        condition: 'Overcast',
        precipitationProbability: 10,
        isDay: true,
      },
    ];
    render(<HourlyStrip hourly={localHourly} now="2026-10-04T15:00" />);
    expect(screen.queryByText('15:00')).not.toBeInTheDocument();
    expect(screen.getByText('14:00')).toBeInTheDocument();
    expect(screen.getByText('16:00')).toBeInTheDocument();
  });

  it('renders the auto-scrolling container', () => {
    render(<HourlyStrip hourly={makeHourly()} now={NOW} />);
    const container = screen.getByTestId('hourly-strip');
    expect(container.className).toMatch(/overflow-x-auto/);
  });

  it('renders empty state when there is no upcoming hourly data', () => {
    render(<HourlyStrip hourly={[]} now={NOW} />);
    expect(screen.getByText(/No hourly forecast/)).toBeInTheDocument();
  });
});
