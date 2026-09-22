import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FlyOverForm } from '../FlyOverForm';
import { mockGeolocation } from '../../test/geolocation';

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

  it('centers the action buttons', () => {
    render(<FlyOverForm onSubmit={() => {}} />);

    const locate = screen.getByRole('button', { name: 'Use my current location' });
    const submit = screen.getByRole('button', { name: 'Find aircraft' });

    expect(locate.parentElement).toHaveClass('flex', 'justify-center');
    expect(submit.parentElement).toHaveClass('flex', 'justify-center');
  });

  describe('current location', () => {
    const LISBON = { latitude: 38.7223, longitude: -9.1393 };

    it('fills lat/lng from a granted position and preserves the draft radius', async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      const onSubmit = vi.fn();
      const getCurrentPosition = mockGeolocation({ type: 'success', coords: LISBON });
      render(
        <FlyOverForm
          value={{ lat: 10, lng: 20, radiusKm: 30 }}
          onChange={onChange}
          onSubmit={onSubmit}
        />,
      );

      await user.click(screen.getByRole('button', { name: 'Use my current location' }));

      expect(getCurrentPosition).toHaveBeenCalledTimes(1);
      expect(screen.getByLabelText('Latitude')).toHaveValue('38.7223');
      expect(screen.getByLabelText('Longitude')).toHaveValue('-9.1393');
      expect(screen.getByLabelText('Radius (km)')).toHaveValue('30');
      expect(onChange).toHaveBeenCalledWith({ lat: 38.7223, lng: -9.1393, radiusKm: 30 });
      expect(onSubmit).not.toHaveBeenCalled();
    });

    it('preserves a freshly typed radius when filling from current location', async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      mockGeolocation({ type: 'success', coords: LISBON });
      render(
        <FlyOverForm
          value={{ lat: 10, lng: 20, radiusKm: 30 }}
          onChange={onChange}
          onSubmit={() => {}}
        />,
      );

      await user.clear(screen.getByLabelText('Radius (km)'));
      await user.type(screen.getByLabelText('Radius (km)'), '50');
      onChange.mockClear();
      await user.click(screen.getByRole('button', { name: 'Use my current location' }));

      expect(onChange).toHaveBeenCalledWith({ lat: 38.7223, lng: -9.1393, radiusKm: 50 });
    });

    it('falls back to the default radius when none is set', async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      mockGeolocation({ type: 'success', coords: LISBON });
      render(<FlyOverForm onChange={onChange} onSubmit={() => {}} />);

      await user.click(screen.getByRole('button', { name: 'Use my current location' }));

      expect(onChange).toHaveBeenCalledWith({ lat: 38.7223, lng: -9.1393, radiusKm: 10 });
    });

    const errorCases: Array<[1 | 2 | 3, string]> = [
      [1, 'permission was denied'],
      [2, 'Unable to determine your location'],
      [3, 'timed out'],
    ];

    it.each(errorCases)(
      'shows an alert and leaves inputs unchanged on error code %i',
      async (code, message) => {
        const user = userEvent.setup();
        const onChange = vi.fn();
        mockGeolocation({ type: 'error', code });
        render(
          <FlyOverForm
            value={{ lat: 10, lng: 20, radiusKm: 30 }}
            onChange={onChange}
            onSubmit={() => {}}
          />,
        );

        await user.click(screen.getByRole('button', { name: 'Use my current location' }));

        expect(screen.getByRole('alert')).toHaveTextContent(message);
        expect(screen.getByLabelText('Latitude')).toHaveValue('10');
        expect(screen.getByLabelText('Longitude')).toHaveValue('20');
        expect(screen.getByLabelText('Radius (km)')).toHaveValue('30');
        expect(onChange).not.toHaveBeenCalled();
      },
    );

    it('disables the control while a lookup is pending', async () => {
      const user = userEvent.setup();
      mockGeolocation({ type: 'pending' });
      render(<FlyOverForm onSubmit={() => {}} />);

      await user.click(screen.getByRole('button', { name: 'Use my current location' }));

      expect(screen.getByRole('button', { name: 'Locating…' })).toBeDisabled();
    });

    it('shows an availability message when geolocation is not supported', async () => {
      const user = userEvent.setup();
      render(
        <FlyOverForm
          value={{ lat: 10, lng: 20, radiusKm: 30 }}
          onChange={() => {}}
          onSubmit={() => {}}
        />,
      );

      await user.click(screen.getByRole('button', { name: 'Use my current location' }));

      expect(screen.getByRole('alert')).toHaveTextContent(
        'Location is unavailable in this browser.',
      );
      expect(screen.getByLabelText('Latitude')).toHaveValue('10');
    });

    it('disables the current-location control while a query is loading', () => {
      render(<FlyOverForm onSubmit={() => {}} loading />);
      expect(screen.getByRole('button', { name: 'Use my current location' })).toBeDisabled();
    });
  });
});
