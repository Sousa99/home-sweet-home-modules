import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { Location } from '../api/types';
import { LocationSelector, type SearchLocations } from './LocationSelector';

const LISBON: Location = {
  id: 2267057,
  name: 'Lisbon',
  latitude: 38.7167,
  longitude: -9.1333,
  timezone: 'Europe/Lisbon',
  country: 'Portugal',
};

const MADRID: Location = {
  id: 3128760,
  name: 'Madrid',
  latitude: 40.4165,
  longitude: -3.7026,
  timezone: 'Europe/Madrid',
  country: 'Spain',
};

const searchLocations = vi.fn<SearchLocations>();

describe('LocationSelector', () => {
  it('searches as the user types and shows results', async () => {
    searchLocations.mockResolvedValue([LISBON, MADRID]);
    const user = userEvent.setup();
    render(
      <LocationSelector
        value={null}
        onChange={() => undefined}
        searchLocations={searchLocations}
      />,
    );

    await user.type(screen.getByRole('textbox'), 'lis');

    expect(await screen.findByText('Lisbon')).toBeInTheDocument();
    expect(screen.getByText('Madrid')).toBeInTheDocument();
    expect(searchLocations).toHaveBeenCalledWith('lis');
  });

  it('calls onChange when a result is selected', async () => {
    searchLocations.mockResolvedValue([LISBON]);
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<LocationSelector value={null} onChange={onChange} searchLocations={searchLocations} />);

    await user.type(screen.getByRole('textbox'), 'lis');
    await user.click(await screen.findByText('Lisbon'));

    expect(onChange).toHaveBeenCalledWith(LISBON);
  });

  it('shows the current selection when one is set', () => {
    render(
      <LocationSelector
        value={LISBON}
        onChange={() => undefined}
        searchLocations={searchLocations}
      />,
    );
    expect(screen.getByDisplayValue('Lisbon')).toBeInTheDocument();
  });

  it('clears results when no matches are found', async () => {
    searchLocations.mockResolvedValue([]);
    const user = userEvent.setup();
    render(
      <LocationSelector
        value={null}
        onChange={() => undefined}
        searchLocations={searchLocations}
      />,
    );

    await user.type(screen.getByRole('textbox'), 'zzzz');

    await waitFor(() => expect(searchLocations).toHaveBeenCalled());
    expect(screen.queryByText(/Lisbon/)).not.toBeInTheDocument();
  });
});
