import '@testing-library/jest-dom/vitest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import type { StopTimesResponse } from '../api/types';
import { api } from '../api/client';
import { StopCard, type FetchStopTimes } from './StopCard';

vi.mock('../api/client', () => ({
  api: {
    getStopTimes: vi.fn(),
  },
}));

const mockedGetStopTimes = vi.mocked(api.getStopTimes);

const response: StopTimesResponse = {
  stopId: 'S1',
  times: [
    {
      lineId: 'L1',
      lineShortName: '736',
      headsign: 'Cais',
      scheduledAt: '2026-06-15T08:00:00.000Z',
      minutesUntil: 10,
    },
  ],
  realtime: { available: false, lastUpdate: null, liveCount: 0, totalCount: 1 },
};

beforeEach(() => {
  vi.useRealTimers();
  mockedGetStopTimes.mockReset();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('StopCard widget', () => {
  it('renders the stop name and line badge', () => {
    mockedGetStopTimes.mockResolvedValue(response);
    render(<StopCard stopId="S1" stopName="Sete Rios" lines={['736']} refetchIntervalMs={0} />);
    expect(screen.getByText('Sete Rios')).toBeInTheDocument();
    expect(screen.getByText('736')).toBeInTheDocument();
  });

  it('fetches waiting times with the default client and renders them', async () => {
    mockedGetStopTimes.mockResolvedValue(response);
    render(<StopCard stopId="S1" stopName="Sete Rios" refetchIntervalMs={0} />);
    await waitFor(() => expect(mockedGetStopTimes).toHaveBeenCalledWith('S1', 5, []));
    expect(await screen.findByText('Cais')).toBeInTheDocument();
    expect(screen.getByText('Schedule')).toBeInTheDocument();
  });

  it('passes the line filter and limit to the fetcher', async () => {
    mockedGetStopTimes.mockResolvedValue(response);
    render(
      <StopCard
        stopId="S1"
        stopName="Sete Rios"
        lines={['736', '3705']}
        limit={3}
        refetchIntervalMs={0}
      />,
    );
    await waitFor(() => expect(mockedGetStopTimes).toHaveBeenCalledWith('S1', 3, ['736', '3705']));
  });

  it('shows the coverage notice from realtime data', async () => {
    mockedGetStopTimes.mockResolvedValue({
      ...response,
      realtime: {
        available: true,
        lastUpdate: '2026-06-15T08:03:00.000Z',
        liveCount: 1,
        totalCount: 1,
      },
    });
    render(<StopCard stopId="S1" stopName="Sete Rios" refetchIntervalMs={0} />);
    expect(await screen.findByText(/Live times for 1 of 1 buses/)).toBeInTheDocument();
  });

  it('shows an error message when the fetch fails', async () => {
    mockedGetStopTimes.mockRejectedValue(new Error('not found'));
    render(<StopCard stopId="S1" stopName="Sete Rios" refetchIntervalMs={0} />);
    expect(await screen.findByText('Stop not found in the current schedule.')).toBeInTheDocument();
  });

  it('shows the missing notice and does not fetch', () => {
    render(<StopCard stopId="S1" stopName="Sete Rios" missing refetchIntervalMs={0} />);
    expect(
      screen.getByText('This stop no longer exists in the schedule — remove it in Config.'),
    ).toBeInTheDocument();
    expect(mockedGetStopTimes).not.toHaveBeenCalled();
  });

  it('uses a custom fetchTimes when provided', async () => {
    const custom: FetchStopTimes = vi.fn().mockResolvedValue(response);
    render(<StopCard stopId="S1" stopName="Sete Rios" fetchTimes={custom} refetchIntervalMs={0} />);
    await waitFor(() => expect(custom).toHaveBeenCalledWith({ stopId: 'S1', limit: 5, lines: [] }));
    expect(await screen.findByText('Cais')).toBeInTheDocument();
  });

  it('refetches on the configured interval', async () => {
    vi.useFakeTimers();
    mockedGetStopTimes.mockResolvedValue(response);
    render(<StopCard stopId="S1" stopName="Sete Rios" refetchIntervalMs={1000} />);
    await vi.advanceTimersByTimeAsync(1000);
    expect(mockedGetStopTimes).toHaveBeenCalledTimes(2);
    await vi.advanceTimersByTimeAsync(1000);
    expect(mockedGetStopTimes).toHaveBeenCalledTimes(3);
  });

  it('uses default thresholds when none are provided', async () => {
    mockedGetStopTimes.mockResolvedValue(response); // minutesUntil: 10
    const { container } = render(
      <StopCard stopId="S1" stopName="Sete Rios" refetchIntervalMs={0} />,
    );
    await waitFor(() => expect(mockedGetStopTimes).toHaveBeenCalled());
    const dot = container.querySelector('[data-testid="urgency-dot"]');
    expect(dot?.className).toContain('bg-amber-500');
  });

  it('applies custom thresholds from the prop', async () => {
    mockedGetStopTimes.mockResolvedValue(response); // minutesUntil: 10
    const { container } = render(
      <StopCard
        stopId="S1"
        stopName="Sete Rios"
        refetchIntervalMs={0}
        thresholds={{ headsUpMinutes: 20, leaveNowMinutes: 10, missedMinutes: 5 }}
      />,
    );
    await waitFor(() => expect(mockedGetStopTimes).toHaveBeenCalled());
    const dot = container.querySelector('[data-testid="urgency-dot"]');
    expect(dot?.className).toContain('bg-orange-500');
  });
});
