import '@testing-library/jest-dom/vitest';
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { RealtimeInfo } from '../api/types';
import { StopCoverage } from './StopCoverage';

describe('StopCoverage', () => {
  it('renders the schedule-only notice when live times are unavailable', () => {
    const realtime: RealtimeInfo = {
      available: false,
      lastUpdate: null,
      liveCount: 0,
      totalCount: 3,
    };
    render(<StopCoverage realtime={realtime} />);
    expect(screen.getByText('Live times unavailable — showing schedule.')).toBeInTheDocument();
  });

  it('renders nothing when there is no realtime block', () => {
    const { container } = render(<StopCoverage realtime={undefined} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders nothing when live data is available but no bus is live', () => {
    const realtime: RealtimeInfo = {
      available: true,
      lastUpdate: new Date().toISOString(),
      liveCount: 0,
      totalCount: 3,
    };
    const { container } = render(<StopCoverage realtime={realtime} />);
    expect(container.firstChild).toBeNull();
  });

  it('shows live coverage and freshness when some buses are live', () => {
    const realtime: RealtimeInfo = {
      available: true,
      lastUpdate: new Date().toISOString(),
      liveCount: 2,
      totalCount: 5,
    };
    render(<StopCoverage realtime={realtime} />);
    expect(screen.getByText(/Live times for 2 of 5 buses · updated/)).toBeInTheDocument();
  });
});
