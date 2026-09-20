import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FlyOverForm } from '../FlyOverForm';

describe('FlyOverForm', () => {
  it('renders the three query inputs and a submit button', () => {
    render(<FlyOverForm onSubmit={() => {}} />);
    expect(screen.getByLabelText('Latitude')).toBeInTheDocument();
    expect(screen.getByLabelText('Longitude')).toBeInTheDocument();
    expect(screen.getByLabelText('Radius (km)')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Find aircraft' })).toBeInTheDocument();
  });

  it('submits a parsed query for valid input', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<FlyOverForm onSubmit={onSubmit} />);

    await user.type(screen.getByLabelText('Latitude'), '48.8566');
    await user.type(screen.getByLabelText('Longitude'), '2.3522');
    await user.type(screen.getByLabelText('Radius (km)'), '50');
    await user.click(screen.getByRole('button', { name: 'Find aircraft' }));

    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit).toHaveBeenCalledWith({ lat: 48.8566, lng: 2.3522, radiusKm: 50 });
  });

  it('does not submit and shows an error for out-of-range latitude', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<FlyOverForm onSubmit={onSubmit} />);

    await user.type(screen.getByLabelText('Latitude'), '999');
    await user.type(screen.getByLabelText('Longitude'), '2.3522');
    await user.type(screen.getByLabelText('Radius (km)'), '50');
    await user.click(screen.getByRole('button', { name: 'Find aircraft' }));

    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toHaveTextContent('Latitude');
  });

  it('does not submit for a missing radius', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<FlyOverForm onSubmit={onSubmit} />);

    await user.type(screen.getByLabelText('Latitude'), '48.8566');
    await user.type(screen.getByLabelText('Longitude'), '2.3522');
    await user.click(screen.getByRole('button', { name: 'Find aircraft' }));

    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toHaveTextContent('Radius');
  });

  it('disables the submit button while loading', () => {
    render(<FlyOverForm onSubmit={() => {}} loading />);
    expect(screen.getByRole('button', { name: 'Loading…' })).toBeDisabled();
  });
});
