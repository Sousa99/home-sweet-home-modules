import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RefreshRateSelect } from '../RefreshRateSelect';

describe('RefreshRateSelect', () => {
  it('renders a select with all five rates and defaults to off', () => {
    render(<RefreshRateSelect value="off" onChange={() => {}} />);

    const select = screen.getByLabelText('Auto-refresh');
    expect(select).toHaveValue('off');

    const options = screen.getAllByRole('option');
    expect(options.map((option) => option.textContent)).toEqual([
      'Off',
      '5 seconds',
      '10 seconds',
      '30 seconds',
      '60 seconds',
    ]);
  });

  it('calls onChange with the selected rate', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<RefreshRateSelect value="off" onChange={onChange} />);

    await user.selectOptions(screen.getByLabelText('Auto-refresh'), '10');

    expect(onChange).toHaveBeenCalledWith(10);
  });

  it('does not call onChange when re-selecting the active rate', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<RefreshRateSelect value="off" onChange={onChange} />);

    await user.selectOptions(screen.getByLabelText('Auto-refresh'), 'off');

    expect(onChange).not.toHaveBeenCalled();
  });
});
