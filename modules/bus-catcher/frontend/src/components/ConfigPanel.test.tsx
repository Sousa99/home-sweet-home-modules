import '@testing-library/jest-dom/vitest';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactElement } from 'react';
import { api } from '../api/client';
import type { ConfigStop, Stop } from '../api/types';
import { ConfigPanel } from './ConfigPanel';

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
  },
}));

const mockedSearch = vi.mocked(api.searchStops);
const mockedGetStop = vi.mocked(api.getStop);
const mockedGetConfig = vi.mocked(api.getConfig);
const mockedAdd = vi.mocked(api.addConfigStop);
const mockedUpdate = vi.mocked(api.updateConfigStop);
const mockedRemove = vi.mocked(api.removeConfigStop);
const mockedListLines = vi.mocked(api.listLines);

function renderWithQuery(ui: ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

beforeEach(() => {
  mockedSearch.mockReset();
  mockedGetStop.mockReset();
  mockedGetConfig.mockReset();
  mockedAdd.mockReset();
  mockedUpdate.mockReset();
  mockedRemove.mockReset();
  mockedListLines.mockReset();
  mockedListLines.mockResolvedValue({
    lines: [{ id: 'L1', shortName: '736', longName: 'Cais do Sodré' }],
  });
});

describe('ConfigPanel', () => {
  it('shows an empty state when nothing is configured', async () => {
    mockedGetConfig.mockResolvedValue({ stops: [] });
    renderWithQuery(<ConfigPanel />);
    expect(
      await screen.findByText('No stops configured yet. Search above to add one.'),
    ).toBeInTheDocument();
  });

  it('adds a stop with a line filter', async () => {
    const stop: Stop = { id: 'S1', name: 'Av. Teste', lat: 0, lon: 0 };
    mockedSearch.mockResolvedValue({ stops: [stop] });
    mockedGetStop.mockResolvedValue({
      stop: {
        ...stop,
        lines: [
          {
            id: 'L1',
            shortName: '736',
            longName: 'Cais do Sodré',
            directionId: 0,
            headsign: 'Cais',
          },
        ],
      },
    });
    mockedGetConfig.mockResolvedValue({ stops: [] });
    const created: ConfigStop = {
      id: 1,
      stop,
      lineFilter: ['736:0'],
      displayOrder: 0,
      enabled: true,
    };
    mockedAdd.mockResolvedValue({ stop: created });

    renderWithQuery(<ConfigPanel />);

    await userEvent.type(screen.getByLabelText('Search stops'), 'teste');
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Av. Teste' })).toBeInTheDocument();
    });
    await userEvent.click(screen.getByRole('button', { name: 'Av. Teste' }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: '736 → Cais' })).toBeInTheDocument();
    });
    await userEvent.click(screen.getByRole('button', { name: '736 → Cais' }));

    await userEvent.click(screen.getByRole('button', { name: 'Save stop' }));

    await waitFor(() => {
      expect(mockedAdd.mock.calls[0]?.[0]).toEqual({
        stopId: 'S1',
        lineFilter: ['736:0'],
      });
    });
  });

  it('offers one selectable option per direction (bidirectional stops)', async () => {
    const stop: Stop = { id: 'S1', name: 'Av. Teste', lat: 0, lon: 0 };
    mockedSearch.mockResolvedValue({ stops: [stop] });
    mockedGetStop.mockResolvedValue({
      stop: {
        ...stop,
        lines: [
          { id: 'L1A', shortName: '736', longName: 'Cais', directionId: 0, headsign: 'Cais' },
          { id: 'L1B', shortName: '736', longName: 'Cais', directionId: 1, headsign: 'Outurela' },
          {
            id: 'L2',
            shortName: '706',
            longName: 'Campo de Ourique',
            directionId: 0,
            headsign: 'Campo de Ourique',
          },
        ],
      },
    });
    mockedGetConfig.mockResolvedValue({ stops: [] });
    mockedAdd.mockResolvedValue({
      stop: { id: 1, stop, lineFilter: ['736:0', '736:1'], displayOrder: 0, enabled: true },
    });

    renderWithQuery(<ConfigPanel />);

    await userEvent.type(screen.getByLabelText('Search stops'), 'teste');
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Av. Teste' })).toBeInTheDocument();
    });
    await userEvent.click(screen.getByRole('button', { name: 'Av. Teste' }));

    await waitFor(() => {
      expect(screen.getAllByRole('button', { name: /^736 →/ })).toHaveLength(2);
    });
    await userEvent.click(screen.getByRole('button', { name: '736 → Cais' }));
    await userEvent.click(screen.getByRole('button', { name: '736 → Outurela' }));

    await userEvent.click(screen.getByRole('button', { name: 'Save stop' }));
    await waitFor(() => {
      expect(mockedAdd.mock.calls[0]?.[0]).toEqual({
        stopId: 'S1',
        lineFilter: ['736:0', '736:1'],
      });
    });
  });

  it('shows an inline error when saving a duplicate stop fails', async () => {
    const stop: Stop = { id: 'S1', name: 'Av. Teste', lat: 0, lon: 0 };
    mockedSearch.mockResolvedValue({ stops: [stop] });
    mockedGetStop.mockResolvedValue({ stop: { ...stop, lines: [] } });
    mockedGetConfig.mockResolvedValue({ stops: [] });
    mockedAdd.mockRejectedValue({ code: 'duplicate_stop' });

    renderWithQuery(<ConfigPanel />);

    await userEvent.type(screen.getByLabelText('Search stops'), 'teste');
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Av. Teste' })).toBeInTheDocument();
    });
    await userEvent.click(screen.getByRole('button', { name: 'Av. Teste' }));
    await userEvent.click(screen.getByRole('button', { name: 'Save stop' }));

    expect(await screen.findByText('This stop is already configured.')).toBeInTheDocument();
  });

  it('removes a configured stop', async () => {
    mockedGetConfig.mockResolvedValue({
      stops: [
        {
          id: 1,
          stop: { id: 'S1', name: 'Av. Teste', lat: 0, lon: 0 },
          lineFilter: [],
          displayOrder: 0,
          enabled: true,
        },
      ],
    });
    mockedRemove.mockResolvedValue(undefined);

    renderWithQuery(<ConfigPanel />);

    await userEvent.click(await screen.findByRole('button', { name: 'Remove Av. Teste' }));
    await waitFor(() => {
      expect(mockedRemove.mock.calls[0]?.[0]).toBe(1);
    });
  });

  it('toggles the enabled state', async () => {
    mockedGetConfig.mockResolvedValue({
      stops: [
        {
          id: 1,
          stop: { id: 'S1', name: 'Av. Teste', lat: 0, lon: 0 },
          lineFilter: [],
          displayOrder: 0,
          enabled: true,
        },
      ],
    });
    mockedUpdate.mockResolvedValue({
      stop: {
        id: 1,
        stop: { id: 'S1', name: 'Av. Teste', lat: 0, lon: 0 },
        lineFilter: [],
        displayOrder: 0,
        enabled: false,
      },
    });

    renderWithQuery(<ConfigPanel />);

    await userEvent.click(await screen.findByRole('button', { name: 'Disable' }));
    await waitFor(() => {
      expect(mockedUpdate.mock.calls[0]).toEqual([1, { enabled: false }]);
    });
  });

  it('edits the line filter of a configured stop', async () => {
    const stop: ConfigStop = {
      id: 1,
      stop: { id: 'S1', name: 'Av. Teste', lat: 0, lon: 0 },
      lineFilter: [],
      displayOrder: 0,
      enabled: true,
    };
    mockedGetConfig.mockResolvedValue({ stops: [stop] });
    mockedGetStop.mockResolvedValue({
      stop: {
        ...stop.stop,
        lines: [{ id: 'L1', shortName: '736', longName: 'Cais', directionId: 0, headsign: 'Cais' }],
      },
    });
    mockedUpdate.mockResolvedValue({
      stop: { ...stop, lineFilter: ['736:0'] },
    });

    renderWithQuery(<ConfigPanel />);

    await userEvent.click(await screen.findByRole('button', { name: 'Edit' }));
    await userEvent.click(await screen.findByRole('button', { name: '736 → Cais' }));
    await userEvent.click(await screen.findByRole('button', { name: 'Save' }));

    await waitFor(() => {
      expect(mockedUpdate.mock.calls[0]).toEqual([1, { lineFilter: ['736:0'] }]);
    });
  });

  it('reorders stops by swapping display order', async () => {
    const first: ConfigStop = {
      id: 1,
      stop: { id: 'S1', name: 'Av. Teste', lat: 0, lon: 0 },
      lineFilter: [],
      displayOrder: 0,
      enabled: true,
    };
    const second: ConfigStop = {
      id: 2,
      stop: { id: 'S2', name: 'Rua Teste', lat: 0, lon: 0 },
      lineFilter: [],
      displayOrder: 1,
      enabled: true,
    };
    mockedGetConfig.mockResolvedValue({ stops: [first, second] });
    mockedUpdate.mockResolvedValue({ stop: first });

    renderWithQuery(<ConfigPanel />);

    await userEvent.click(await screen.findByRole('button', { name: 'Move Av. Teste down' }));
    await waitFor(() => {
      expect(mockedUpdate.mock.calls).toEqual([
        [1, { displayOrder: 1 }],
        [2, { displayOrder: 0 }],
      ]);
    });
  });

  it('flags a configured stop that no longer exists', async () => {
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

    renderWithQuery(<ConfigPanel />);

    expect(await screen.findByText('no longer found')).toBeInTheDocument();
  });

  it('flags a line filter that no longer exists', async () => {
    mockedGetConfig.mockResolvedValue({
      stops: [
        {
          id: 1,
          stop: { id: 'S1', name: 'Av. Teste', lat: 0, lon: 0 },
          lineFilter: ['999'],
          displayOrder: 0,
          enabled: true,
        },
      ],
    });

    renderWithQuery(<ConfigPanel />);

    expect(await screen.findByText('lines 999 no longer exist')).toBeInTheDocument();
  });
});
