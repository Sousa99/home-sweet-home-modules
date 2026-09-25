import '@testing-library/jest-dom/vitest';
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { Passing } from '../api/types';
import { StopTimesList } from './StopTimesList';

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
});
