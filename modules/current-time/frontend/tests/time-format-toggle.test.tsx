import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TimeFormatToggle } from '../src/components/clock/TimeFormatToggle';
import { DashboardPage } from '../src/pages/DashboardPage';

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

describe('DashboardPage format persistence', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('persists the 12-hour choice when toggled and shows AM/PM', async () => {
    const user = userEvent.setup();
    render(<DashboardPage />);
    await user.click(screen.getByRole('button', { name: '12h' }));
    expect(localStorage.getItem('current-time:time-format')).toBe('12h');
    expect(screen.getAllByText(/^(AM|PM)$/).length).toBeGreaterThan(0);
  });

  it('persists the 24-hour choice when toggled and hides AM/PM', async () => {
    localStorage.setItem('current-time:time-format', '12h');
    const user = userEvent.setup();
    render(<DashboardPage />);
    await user.click(screen.getByRole('button', { name: '24h' }));
    expect(localStorage.getItem('current-time:time-format')).toBe('24h');
    expect(screen.queryByText(/^(AM|PM)$/)).not.toBeInTheDocument();
  });

  it('remembers a previously chosen 12-hour format on a fresh visit', () => {
    localStorage.setItem('current-time:time-format', '12h');
    render(<DashboardPage />);
    expect(screen.getAllByText(/^(AM|PM)$/).length).toBeGreaterThan(0);
  });

  it('treats an invalid stored value as 24-hour on a fresh visit', () => {
    localStorage.setItem('current-time:time-format', '15h');
    render(<DashboardPage />);
    expect(screen.queryByText(/^(AM|PM)$/)).not.toBeInTheDocument();
  });
});
