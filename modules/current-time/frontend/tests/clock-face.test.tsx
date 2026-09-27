import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ClockFace } from '../src/components/clock/ClockFace';
import type { TimeParts } from '../src/lib/timeFormat';

describe('ClockFace', () => {
  const time: TimeParts = { hours: '10', minutes: '15', seconds: '30', ampm: null };

  it('renders hours, minutes and seconds', () => {
    render(<ClockFace time={time} />);
    expect(screen.getByText('10')).toBeInTheDocument();
    expect(screen.getByText('15')).toBeInTheDocument();
    expect(screen.getByText('30')).toBeInTheDocument();
  });

  it('renders the AM/PM indicator in 12-hour mode', () => {
    render(<ClockFace time={{ ...time, hours: '05', ampm: 'PM' }} />);
    expect(screen.getByText('PM')).toBeInTheDocument();
  });

  it('does not render an AM/PM indicator in 24-hour mode', () => {
    render(<ClockFace time={time} />);
    expect(screen.queryByText(/AM|PM/)).not.toBeInTheDocument();
  });
});
