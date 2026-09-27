import { render, screen } from '@testing-library/react';
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
});
