import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { TimeFormatToggle } from '../src/components/clock/TimeFormatToggle';

describe('TimeFormatToggle', () => {
  it('reflects the active format via aria-pressed', () => {
    render(<TimeFormatToggle format="24h" onChange={() => {}} />);
    expect(screen.getByRole('button', { name: '24h' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: '12h' })).toHaveAttribute('aria-pressed', 'false');
  });

  it('reports the selected format on click', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<TimeFormatToggle format="24h" onChange={onChange} />);
    await user.click(screen.getByRole('button', { name: '12h' }));
    expect(onChange).toHaveBeenCalledWith('12h');
  });
});
