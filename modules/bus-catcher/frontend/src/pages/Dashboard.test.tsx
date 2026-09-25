import '@testing-library/jest-dom/vitest';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactElement } from 'react';
import { api } from '../api/client';
import type { ConfigStop, Passing } from '../api/types';
import DashboardPage from '../pages/Dashboard';

vi.mock('../api/client', () => ({
  api: {
    searchStops: vi.fn(),
    getStop: vi.fn(),
    listLines: vi.fn(),
    getConfig: vi.fn(),
    addConfigStop: vi.fn(),
    getStopTimes: vi.fn(),
    getStatus: vi.fn(),
    updateConfigStop: vi.fn(),
    removeConfigStop: vi.fn(),
    refreshSchedule: vi.fn(),
  },
}));

const mockedGetConfig = vi.mocked(api.getConfig);
const mockedGetStopTimes = vi.mocked(api.getStopTimes);
const mockedGetStatus = vi.mocked(api.getStatus);
const mockedRefresh = vi.mocked(api.refreshSchedule);

function renderWithQuery(ui: ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

beforeEach(() => {
  mockedGetConfig.mockReset();
  mockedGetStopTimes.mockReset();
  mockedGetStatus.mockReset();
  mockedRefresh.mockReset();
});

describe('DashboardPage', () => {
  it('shows the empty state and a stale warning', async () => {
    mockedGetConfig.mockResolvedValue({ stops: [] });
    mockedGetStatus.mockResolvedValue({
      lastRefresh: null,
      feedVersion: null,
      stale: true,
      refreshing: false,
    });

    renderWithQuery(<DashboardPage />);

    expect(
      await screen.findByText('No stops configured yet. Go to the Config tab to add one.'),
    ).toBeInTheDocument();
    expect(await screen.findByText(/Schedule data may be out of date/)).toBeInTheDocument();
  });

  it('renders configured stops with their next buses', async () => {
    const stop: ConfigStop = {
      id: 1,
      stop: { id: 'S1', name: 'Av. Teste', lat: 0, lon: 0 },
      lineFilter: ['736'],
      displayOrder: 0,
      enabled: true,
    };
    const times: Passing[] = [
      {
        lineId: 'L1',
        lineShortName: '736',
        headsign: 'Cais',
        scheduledAt: '2026-06-15T08:00:00.000Z',
        minutesUntil: 10,
      },
    ];
    mockedGetConfig.mockResolvedValue({ stops: [stop] });
    mockedGetStopTimes.mockResolvedValue({
      stopId: 'S1',
      times,
      realtime: { available: false, lastUpdate: null, liveCount: 0, totalCount: times.length },
    });
    mockedGetStatus.mockResolvedValue({
      lastRefresh: '2026-09-25T08:00:00.000Z',
      feedVersion: 'abc',
      stale: false,
      refreshing: false,
    });

    renderWithQuery(<DashboardPage />);

    expect(await screen.findByText('Av. Teste')).toBeInTheDocument();
    // the card header filter badge and the row line badge both render "736"
    expect(screen.getAllByText('736').length).toBeGreaterThan(0);
    expect(await screen.findByText('Cais')).toBeInTheDocument();
    expect(screen.getByText(/Schedule updated/)).toBeInTheDocument();
    await waitFor(() => {
      expect(mockedGetStopTimes).toHaveBeenCalled();
    });
  });

  it('shows the per-stop schedule-only notice when live times are unavailable', async () => {
    const stop: ConfigStop = {
      id: 1,
      stop: { id: 'S1', name: 'Av. Teste', lat: 0, lon: 0 },
      lineFilter: [],
      displayOrder: 0,
      enabled: true,
    };
    mockedGetConfig.mockResolvedValue({ stops: [stop] });
    mockedGetStopTimes.mockResolvedValue({
      stopId: 'S1',
      times: [],
      realtime: { available: false, lastUpdate: null, liveCount: 0, totalCount: 0 },
    });
    mockedGetStatus.mockResolvedValue({
      lastRefresh: null,
      feedVersion: null,
      stale: false,
      refreshing: false,
    });

    renderWithQuery(<DashboardPage />);

    expect(
      await screen.findByText('Live times unavailable — showing schedule.'),
    ).toBeInTheDocument();
  });

  it('shows a global banner when the realtime feed went down', async () => {
    mockedGetConfig.mockResolvedValue({ stops: [] });
    mockedGetStatus.mockResolvedValue({
      lastRefresh: '2026-09-25T08:00:00.000Z',
      feedVersion: 'abc',
      stale: false,
      refreshing: false,
      realtimeLastUpdate: '2026-09-25T08:00:00.000Z',
      realtimeAvailable: false,
      realtimeStale: true,
    });

    renderWithQuery(<DashboardPage />);

    expect(
      await screen.findByText('Live ETA is unavailable right now — showing scheduled times.'),
    ).toBeInTheDocument();
  });

  it('triggers a refresh from the button', async () => {
    mockedGetConfig.mockResolvedValue({ stops: [] });
    mockedGetStatus.mockResolvedValue({
      lastRefresh: '2026-09-25T08:00:00.000Z',
      feedVersion: 'abc',
      stale: false,
      refreshing: false,
    });
    mockedRefresh.mockResolvedValue({ status: 'started' });

    renderWithQuery(<DashboardPage />);

    await userEvent.click(await screen.findByRole('button', { name: 'Refresh schedule' }));
    await waitFor(() => {
      expect(mockedRefresh).toHaveBeenCalled();
    });
  });

  it('shows the refreshing banner while a refresh is running', async () => {
    mockedGetConfig.mockResolvedValue({ stops: [] });
    mockedGetStatus.mockResolvedValue({
      lastRefresh: '2026-09-25T08:00:00.000Z',
      feedVersion: 'abc',
      stale: false,
      refreshing: true,
    });

    renderWithQuery(<DashboardPage />);

    expect(await screen.findByText(/Refreshing the schedule/)).toBeInTheDocument();
  });

  it('flags a configured stop that vanished from the schedule', async () => {
    mockedGetConfig.mockResolvedValue({
      stops: [
        {
          id: 1,
          stop: { id: 'S1', name: 'Av. Teste', lat: 0, lon: 0 },
          lineFilter: [],
          displayOrder: 0,
          enabled: true,
          missing: true,
        },
      ],
    });
    mockedGetStatus.mockResolvedValue({
      lastRefresh: '2026-09-25T08:00:00.000Z',
      feedVersion: 'abc',
      stale: false,
      refreshing: false,
    });

    renderWithQuery(<DashboardPage />);

    expect(
      await screen.findByText('This stop no longer exists in the schedule — remove it in Config.'),
    ).toBeInTheDocument();
    // the missing card must not fetch times
    expect(mockedGetStopTimes).not.toHaveBeenCalled();
  });
});
