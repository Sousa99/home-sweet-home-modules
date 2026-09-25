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

describe('StopTimesList', () => {
  it('renders line, headsign, scheduled time and countdown', () => {
    render(<StopTimesList times={times} />);
    expect(screen.getByText('736')).toBeInTheDocument();
    expect(screen.getByText('Cais')).toBeInTheDocument();
    expect(screen.getByText('09:00')).toBeInTheDocument();
    expect(screen.getByText('now')).toBeInTheDocument();
  });

  it('shows an empty state when there are no buses', () => {
    render(<StopTimesList times={[]} />);
    expect(screen.getByText('No more buses scheduled today.')).toBeInTheDocument();
  });
});
