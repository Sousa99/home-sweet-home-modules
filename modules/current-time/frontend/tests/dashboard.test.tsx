import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { DashboardPage } from '../src/pages/DashboardPage';

describe('DashboardPage', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('renders the clock readout and the format control', () => {
    render(<DashboardPage />);
    expect(screen.getByTestId('clock')).toBeInTheDocument();
    expect(screen.getByRole('group', { name: /time format/i })).toBeInTheDocument();
  });

  it('starts in 24-hour mode by default (no AM/PM indicator)', () => {
    render(<DashboardPage />);
    expect(screen.queryByText(/^(AM|PM)$/)).not.toBeInTheDocument();
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
