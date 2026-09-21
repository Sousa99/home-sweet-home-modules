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

  it('reflects an external value in the inputs', () => {
    const { rerender } = render(
      <FlyOverForm
        value={{ lat: 48.8566, lng: 2.3522, radiusKm: 50 }}
        onChange={() => {}}
        onSubmit={() => {}}
      />,
    );
    expect(screen.getByLabelText('Latitude')).toHaveValue('48.8566');
    expect(screen.getByLabelText('Longitude')).toHaveValue('2.3522');
    expect(screen.getByLabelText('Radius (km)')).toHaveValue('50');

    rerender(
      <FlyOverForm
        value={{ lat: 40, lng: 3, radiusKm: 100 }}
        onChange={() => {}}
        onSubmit={() => {}}
      />,
    );
    expect(screen.getByLabelText('Latitude')).toHaveValue('40');
    expect(screen.getByLabelText('Longitude')).toHaveValue('3');
    expect(screen.getByLabelText('Radius (km)')).toHaveValue('100');
  });

  it('calls onChange with a valid query when a field is edited', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <FlyOverForm
        value={{ lat: 48.8566, lng: 2.3522, radiusKm: 50 }}
        onChange={onChange}
        onSubmit={() => {}}
      />,
    );

    await user.clear(screen.getByLabelText('Latitude'));
    await user.type(screen.getByLabelText('Latitude'), '40');

    expect(onChange).toHaveBeenLastCalledWith({ lat: 40, lng: 2.3522, radiusKm: 50 });
  });

  it('does not call onChange while a field is empty', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <FlyOverForm
        value={{ lat: 48.8566, lng: 2.3522, radiusKm: 50 }}
        onChange={onChange}
        onSubmit={() => {}}
      />,
    );

    await user.clear(screen.getByLabelText('Latitude'));

    expect(onChange).not.toHaveBeenCalled();
  });
});
