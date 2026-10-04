import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { WidgetStatusBar } from '../WidgetStatusBar';

const fixedTime = new Date(2026, 9, 4, 14, 32, 5).getTime();

describe('WidgetStatusBar', () => {
  it('renders "Last updated HH:MM:SS" when lastUpdatedAt is set', () => {
    render(<WidgetStatusBar lastUpdatedAt={fixedTime} />);
    expect(screen.getByText('Last updated 14:32:05')).toBeInTheDocument();
  });

  it('renders "Not updated yet" when lastUpdatedAt is null', () => {
    render(<WidgetStatusBar lastUpdatedAt={null} />);
    expect(screen.getByText('Not updated yet')).toBeInTheDocument();
  });

  it('shows the updating indicator only while updating', () => {
    const { rerender } = render(<WidgetStatusBar lastUpdatedAt={fixedTime} updating />);
    expect(screen.getByText('Updating…')).toBeInTheDocument();

    rerender(<WidgetStatusBar lastUpdatedAt={fixedTime} updating={false} />);
    expect(screen.queryByText('Updating…')).not.toBeInTheDocument();
  });

  it('keeps the last-updated time visible while updating', () => {
    render(<WidgetStatusBar lastUpdatedAt={fixedTime} updating />);
    expect(screen.getByText('Last updated 14:32:05')).toBeInTheDocument();
    expect(screen.getByText('Updating…')).toBeInTheDocument();
  });

  it('renders a Refresh button that calls onRefresh on press', async () => {
    const user = userEvent.setup();
    const onRefresh = vi.fn();
    render(<WidgetStatusBar lastUpdatedAt={fixedTime} onRefresh={onRefresh} />);

    const button = screen.getByRole('button', { name: 'Refresh' });
    expect(button).toBeInTheDocument();
    await user.click(button);
    expect(onRefresh).toHaveBeenCalledTimes(1);
  });

  it('disables the Refresh button while updating', () => {
    render(<WidgetStatusBar lastUpdatedAt={fixedTime} updating onRefresh={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Refresh' })).toBeDisabled();
  });

  it('surfaces an error while keeping the last-updated time', () => {
    render(<WidgetStatusBar lastUpdatedAt={fixedTime} error="Feed is down" />);
    expect(screen.getByRole('alert')).toHaveTextContent('Feed is down');
    expect(screen.getByText('Last updated 14:32:05')).toBeInTheDocument();
  });

  it('still renders Refresh alongside an error so the user can retry', () => {
    const onRefresh = vi.fn();
    render(
      <WidgetStatusBar lastUpdatedAt={fixedTime} error="Feed is down" onRefresh={onRefresh} />,
    );
    expect(screen.getByRole('button', { name: 'Refresh' })).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent('Feed is down');
  });

  it('omits the error alert when error is null or undefined', () => {
    const { rerender } = render(<WidgetStatusBar lastUpdatedAt={fixedTime} />);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();

    rerender(<WidgetStatusBar lastUpdatedAt={fixedTime} error={null} />);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('uses a polite live region (role="status", aria-live="polite") for the status area', () => {
    render(<WidgetStatusBar lastUpdatedAt={fixedTime} />);
    const status = screen.getByRole('status');
    expect(status).toHaveAttribute('aria-live', 'polite');
    expect(status).toHaveTextContent('Last updated 14:32:05');
  });

  it('announces the updating indicator inside the polite live region', () => {
    render(<WidgetStatusBar lastUpdatedAt={fixedTime} updating />);
    expect(screen.getByRole('status')).toHaveTextContent('Updating…');
  });

  it('applies the className prop to the root', () => {
    const { container } = render(
      <WidgetStatusBar lastUpdatedAt={fixedTime} className="my-extra-class" />,
    );
    expect(container.firstChild).toHaveClass('my-extra-class');
  });

  it('renders no Refresh button when onRefresh is omitted', () => {
    render(<WidgetStatusBar lastUpdatedAt={fixedTime} />);
    expect(screen.queryByRole('button', { name: 'Refresh' })).not.toBeInTheDocument();
  });
});
