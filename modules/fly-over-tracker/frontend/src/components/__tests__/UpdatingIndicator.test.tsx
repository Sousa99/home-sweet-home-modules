import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { UpdatingIndicator } from '../UpdatingIndicator';

describe('UpdatingIndicator', () => {
  it('renders nothing when hidden', () => {
    const { container } = render(<UpdatingIndicator visible={false} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders the label with a status role when visible', () => {
    render(<UpdatingIndicator visible />);

    const status = screen.getByRole('status');
    expect(status).toHaveTextContent('Updating…');
    expect(status).toHaveAttribute('aria-live', 'polite');
    expect(status.querySelector('[class*="animate-spin"]')).not.toBeNull();
  });

  it('supports a custom label', () => {
    render(<UpdatingIndicator visible label="Refreshing…" />);
    expect(screen.getByRole('status')).toHaveTextContent('Refreshing…');
  });
});
