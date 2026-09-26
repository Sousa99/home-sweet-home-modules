import '@testing-library/jest-dom/vitest';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactElement } from 'react';
import { api } from '../api/client';
import type { Stop } from '../api/types';
import { StopSearch } from './StopSearch';

vi.mock('../api/client', () => ({
  api: {
    searchStops: vi.fn(),
    getStop: vi.fn(),
    listLines: vi.fn(),
    getConfig: vi.fn(),
    addConfigStop: vi.fn(),
  },
}));

const mockedSearch = vi.mocked(api.searchStops);

function renderWithQuery(ui: ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

beforeEach(() => {
  mockedSearch.mockReset();
});

describe('StopSearch', () => {
  it('searches stops and invokes onSelect on pick', async () => {
    const stop: Stop = { id: '1801', name: 'Saldanha', lat: 0, lon: 0 };
    mockedSearch.mockResolvedValue({ stops: [stop] });
    const onSelect = vi.fn();

    renderWithQuery(<StopSearch onSelect={onSelect} />);

    await userEvent.type(screen.getByLabelText('Search stops'), 'sald');

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Saldanha' })).toBeInTheDocument();
    });

    await userEvent.click(screen.getByRole('button', { name: 'Saldanha' }));
    expect(onSelect).toHaveBeenCalledWith(stop);
  });
});
