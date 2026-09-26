import '@testing-library/jest-dom/vitest';
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { DepartureThresholds, Passing } from '../api/types';
import { StopTimesList } from './StopTimesList';

const thresholds: DepartureThresholds = {
  headsUpMinutes: 10,
  leaveNowMinutes: 5,
  missedMinutes: 1,
};

const times: Passing[] = [
  {
    lineId: 'L1',
    lineShortName: '736',
    headsign: 'Cais',
    scheduledAt: '2026-06-15T08:00:00.000Z', // 09:00 Lisbon (summer)
    minutesUntil: -999999,
  },
];

const liveTimes: Passing[] = [
  {
    tripId: 'T2',
    lineId: 'L1',
    lineShortName: '736',
    headsign: 'Cais',
    scheduledAt: '2026-06-15T08:00:00.000Z',
    minutesUntil: 10,
    source: 'live',
    predictedAt: '2026-06-15T08:04:00.000Z', // 09:04 Lisbon
    delayMinutes: 4,
  },
];

describe('StopTimesList', () => {
  it('renders line, headsign and scheduled time', () => {
    render(<StopTimesList times={times} />);
    expect(screen.getByText('736')).toBeInTheDocument();
    expect(screen.getByText('Cais')).toBeInTheDocument();
    expect(screen.getByText('09:00')).toBeInTheDocument();
  });

  it('shows an empty state when there are no buses', () => {
    render(<StopTimesList times={[]} />);
    expect(screen.getByText('No more buses scheduled today.')).toBeInTheDocument();
  });

  it('marks a scheduled row with the Schedule marker', () => {
    render(<StopTimesList times={times} />);
    expect(screen.getByText('Schedule')).toBeInTheDocument();
  });

  it('renders a live row with predicted time, Live badge and delay delta', () => {
    render(<StopTimesList times={liveTimes} />);
    expect(screen.getByText('Live')).toBeInTheDocument();
    expect(screen.getByText('09:04')).toBeInTheDocument();
    expect(screen.getByText('+4 min')).toBeInTheDocument();
  });

  it('renders an urgency dot per level without a text label', () => {
    const base = liveTimes[0]!;
    const rows: Passing[] = [
      { ...base, minutesUntil: 25, scheduledAt: '2026-06-15T08:00:00.000Z' },
      { ...base, minutesUntil: 10, scheduledAt: '2026-06-15T08:10:00.000Z' },
      { ...base, minutesUntil: 5, scheduledAt: '2026-06-15T08:20:00.000Z' },
      { ...base, minutesUntil: 1, scheduledAt: '2026-06-15T08:30:00.000Z' },
      { ...base, minutesUntil: 0, scheduledAt: '2026-06-15T08:40:00.000Z' },
    ];
    const { container } = render(<StopTimesList times={rows} thresholds={thresholds} />);

    expect(container.querySelectorAll('[data-testid="urgency-dot"]')).toHaveLength(5);
    expect(screen.queryByText('relaxed')).not.toBeInTheDocument();
    expect(screen.queryByText('heads-up')).not.toBeInTheDocument();
    expect(screen.queryByText('leave-now')).not.toBeInTheDocument();
    expect(screen.queryByText('missed')).not.toBeInTheDocument();
  });

  it('maps minutes to the expected dot hues', () => {
    const cases: Array<[number, string]> = [
      [25, 'bg-green-500'],
      [10, 'bg-amber-500'],
      [5, 'bg-orange-500'],
      [1, 'bg-slate-900'],
      [0, 'bg-slate-900'],
    ];
    for (const [minutesUntil, hue] of cases) {
      const { container, unmount } = render(
        <StopTimesList times={[{ ...liveTimes[0]!, minutesUntil }]} thresholds={thresholds} />,
      );
      const dot = container.querySelector('[data-testid="urgency-dot"]');
      expect(dot?.className).toContain(hue);
      unmount();
    }
  });

  it('keeps the Live/Schedule pills when dots are shown', () => {
    render(<StopTimesList times={liveTimes} thresholds={thresholds} />);
    expect(screen.getByText('Live')).toBeInTheDocument();
  });
});
