import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MapErrorBoundary } from '../MapErrorBoundary';

function Bomb(): never {
  throw new Error('map exploded');
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('MapErrorBoundary', () => {
  it('renders its children when no error occurs', () => {
    render(
      <MapErrorBoundary onError={() => {}}>
        <p>map content</p>
      </MapErrorBoundary>,
    );
    expect(screen.getByText('map content')).toBeInTheDocument();
  });

  it('calls onError and renders nothing when the map subtree throws', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    const onError = vi.fn();
    render(
      <MapErrorBoundary onError={onError}>
        <Bomb />
      </MapErrorBoundary>,
    );
    expect(onError).toHaveBeenCalled();
    expect(screen.queryByText('map content')).not.toBeInTheDocument();
    consoleError.mockRestore();
  });
});
