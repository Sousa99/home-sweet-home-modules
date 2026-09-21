import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ViewModeToggle } from '../ViewModeToggle';

describe('ViewModeToggle', () => {
  it('renders both options with the active one marked pressed', () => {
    render(<ViewModeToggle mode="list" onChange={() => {}} />);
    expect(screen.getByRole('button', { name: 'List' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Map' })).toHaveAttribute('aria-pressed', 'false');
  });

  it('calls onChange with the new mode when selecting the other option', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<ViewModeToggle mode="list" onChange={onChange} />);
    await user.click(screen.getByRole('button', { name: 'Map' }));
    expect(onChange).toHaveBeenCalledWith('map');
  });

  it('does not call onChange when re-selecting the active mode', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<ViewModeToggle mode="map" onChange={onChange} />);
    await user.click(screen.getByRole('button', { name: 'Map' }));
    expect(onChange).not.toHaveBeenCalled();
  });
});
