import '@testing-library/jest-dom/vitest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { StopTimesResponse } from '../api/types';
import { api } from '../api/client';
import { StopCard, type FetchStopTimes } from './StopCard';

vi.mock('../api/client', () => ({
  api: {
    getStopTimes: vi.fn(),
  },
}));

const mockedGetStopTimes = vi.mocked(api.getStopTimes);

let nowSpy: ReturnType<typeof vi.spyOn> | undefined;

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
  nowSpy?.mockRestore();
  nowSpy = undefined;
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
    await waitFor(() => expect(mockedGetStopTimes).toHaveBeenCalledWith('S1', 5, [], undefined));
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
    await waitFor(() =>
      expect(mockedGetStopTimes).toHaveBeenCalledWith('S1', 3, ['736', '3705'], undefined),
    );
  });

  it('forwards the baseUrl prop to the default client fetcher', async () => {
    mockedGetStopTimes.mockResolvedValue(response);
    render(
      <StopCard
        stopId="S1"
        stopName="Sete Rios"
        lines={['736']}
        limit={2}
        refetchIntervalMs={0}
        baseUrl="http://localhost:3100"
      />,
    );
    await waitFor(() =>
      expect(mockedGetStopTimes).toHaveBeenCalledWith('S1', 2, ['736'], 'http://localhost:3100'),
    );
    expect(await screen.findByText('Cais')).toBeInTheDocument();
  });

  it('keeps the same-origin default when no baseUrl is provided', async () => {
    mockedGetStopTimes.mockResolvedValue(response);
    render(<StopCard stopId="S1" stopName="Sete Rios" refetchIntervalMs={0} />);
    await waitFor(() => expect(mockedGetStopTimes).toHaveBeenCalled());
    expect(mockedGetStopTimes).toHaveBeenCalledWith('S1', 5, [], undefined);
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
    await waitFor(() => {
      expect(container.querySelector('[data-testid="urgency-dot"]')?.className).toContain(
        'bg-amber-500',
      );
    });
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
    await waitFor(() => {
      expect(container.querySelector('[data-testid="urgency-dot"]')?.className).toContain(
        'bg-orange-500',
      );
    });
  });

  it('shows the standardized status bar with the last update time after a successful load', async () => {
    mockedGetStopTimes.mockResolvedValue(response);
    render(<StopCard stopId="S1" stopName="Sete Rios" refetchIntervalMs={0} />);
    await screen.findByText('Cais');

    expect(screen.getByText(/Last updated \d{2}:\d{2}:\d{2}/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Refresh' })).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveAttribute('aria-live', 'polite');
  });

  it('shows "Not updated yet" before the first load completes', async () => {
    mockedGetStopTimes.mockImplementation(() => new Promise<StopTimesResponse>(() => {}));
    render(<StopCard stopId="S1" stopName="Sete Rios" refetchIntervalMs={0} />);

    expect(screen.getByText('Not updated yet')).toBeInTheDocument();
    expect(screen.queryByText(/Last updated \d{2}:\d{2}:\d{2}/)).not.toBeInTheDocument();
  });

  it('pressing Refresh re-runs the fetch and advances the last-updated time', async () => {
    const t0 = new Date(2026, 9, 4, 14, 0, 0).getTime();
    const t1 = new Date(2026, 9, 4, 14, 0, 5).getTime();
    const nowSpyLocal = vi.spyOn(Date, 'now').mockReturnValue(t0);
    nowSpy = nowSpyLocal;
    mockedGetStopTimes.mockResolvedValue(response);
    render(<StopCard stopId="S1" stopName="Sete Rios" refetchIntervalMs={0} />);
    await screen.findByText('Cais');
    expect(mockedGetStopTimes).toHaveBeenCalledTimes(1);
    expect(screen.getByText('Last updated 14:00:00')).toBeInTheDocument();

    nowSpyLocal.mockReturnValue(t1);
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: 'Refresh' }));
    await waitFor(() => expect(mockedGetStopTimes).toHaveBeenCalledTimes(2));
    expect(screen.queryByText('Last updated 14:00:00')).not.toBeInTheDocument();
    expect(screen.getByText('Last updated 14:00:05')).toBeInTheDocument();
  });

  it('shows the updating indicator while a refresh is in flight and clears it after', async () => {
    const user = userEvent.setup();
    let resolveRefresh!: (value: StopTimesResponse) => void;
    mockedGetStopTimes.mockResolvedValueOnce(response).mockImplementationOnce(
      () =>
        new Promise<StopTimesResponse>((resolve) => {
          resolveRefresh = resolve;
        }),
    );
    render(<StopCard stopId="S1" stopName="Sete Rios" refetchIntervalMs={0} />);
    await screen.findByText('Cais');

    await user.click(screen.getByRole('button', { name: 'Refresh' }));
    expect(await screen.findByText('Updating…')).toBeInTheDocument();

    await act(async () => {
      resolveRefresh(response);
    });
    await waitFor(() => expect(screen.queryByText('Updating…')).not.toBeInTheDocument());
  });

  it('keeps the previous last-updated time and surfaces an error when a refresh fails', async () => {
    const user = userEvent.setup();
    mockedGetStopTimes
      .mockResolvedValueOnce(response)
      .mockRejectedValueOnce(new Error('not found'));
    render(<StopCard stopId="S1" stopName="Sete Rios" refetchIntervalMs={0} />);
    await screen.findByText('Cais');
    const time = screen.getByText(/Last updated \d{2}:\d{2}:\d{2}/).textContent as string;

    await user.click(screen.getByRole('button', { name: 'Refresh' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Stop not found in the current schedule.',
    );
    expect(screen.getByText(time)).toBeInTheDocument();
    expect(screen.getByText('Cais')).toBeInTheDocument();
  });

  it('recovers via Refresh after a failure', async () => {
    const user = userEvent.setup();
    mockedGetStopTimes
      .mockRejectedValueOnce(new Error('not found'))
      .mockResolvedValueOnce(response);
    render(<StopCard stopId="S1" stopName="Sete Rios" refetchIntervalMs={0} />);
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Stop not found in the current schedule.',
    );
    expect(screen.getByText('Not updated yet')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Refresh' }));
    expect(await screen.findByText('Cais')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.getByText(/Last updated \d{2}:\d{2}:\d{2}/)).toBeInTheDocument();
  });
});
