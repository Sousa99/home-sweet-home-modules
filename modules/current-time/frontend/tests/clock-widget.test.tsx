import { render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ClockCard } from '../src/components/clock/ClockCard';
import { ClockPlain } from '../src/components/clock/ClockPlain';

function stubResizeObserver(width: number, height: number) {
  const entry = { contentRect: { width, height } } as unknown as ResizeObserverEntry;
  class MockResizeObserver implements ResizeObserver {
    callback: ResizeObserverCallback;

    constructor(callback: ResizeObserverCallback) {
      this.callback = callback;
    }

    observe(): void {
      this.callback([entry], this);
    }

    unobserve(): void {}

    disconnect(): void {}

    takeRecords(): ResizeObserverEntry[] {
      return [entry];
    }
  }
  vi.stubGlobal('ResizeObserver', MockResizeObserver);
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('ClockCard', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('renders a live readout inside card chrome', () => {
    render(<ClockCard />);
    expect(screen.getByTestId('clock-card')).toBeInTheDocument();
    expect(screen.getByTestId('clock')).toBeInTheDocument();
  });

  it('shows the format toggle when switchable (default)', () => {
    render(<ClockCard />);
    expect(screen.getByRole('group', { name: /time format/i })).toBeInTheDocument();
  });

  it('hides the format toggle when not switchable', () => {
    render(<ClockCard switchable={false} />);
    expect(screen.queryByRole('group', { name: /time format/i })).not.toBeInTheDocument();
  });

  it('renders AM/PM when defaultFormat is 12h', () => {
    render(<ClockCard defaultFormat="12h" switchable={false} />);
    expect(screen.getAllByText(/^(AM|PM)$/).length).toBeGreaterThan(0);
  });

  it('does not render AM/PM in 24-hour mode', () => {
    render(<ClockCard defaultFormat="24h" switchable={false} />);
    expect(screen.queryByText(/^(AM|PM)$/)).not.toBeInTheDocument();
  });

  it('fills its container and honors the aspect ratio', () => {
    render(<ClockCard aspectRatio="16/9" />);
    const card = screen.getByTestId('clock-card');
    expect(card).toHaveClass('h-full');
    expect(card).toHaveClass('w-full');
    expect(card.style.aspectRatio).toBe('16/9');
  });
});

describe('ClockPlain', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('renders a live readout with no card chrome', () => {
    render(<ClockPlain />);
    expect(screen.getByTestId('clock-plain')).toBeInTheDocument();
    expect(screen.getByTestId('clock')).toBeInTheDocument();
  });

  it('honors alignment via items-* classes', () => {
    const { rerender } = render(<ClockPlain align="left" />);
    expect(screen.getByTestId('clock-widget')).toHaveClass('items-start');
    rerender(<ClockPlain align="center" />);
    expect(screen.getByTestId('clock-widget')).toHaveClass('items-center');
    rerender(<ClockPlain align="right" />);
    expect(screen.getByTestId('clock-widget')).toHaveClass('items-end');
  });

  it('scales the readout to the measured container', () => {
    stubResizeObserver(640, 160);
    render(<ClockPlain />);
    expect(screen.getByTestId('clock-scale').style.fontSize).toBe('64px');
  });
});

describe('Card vs plain parity', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('renders identical readouts, differing only in chrome', () => {
    render(
      <>
        <ClockCard defaultFormat="24h" switchable={false} />
        <ClockPlain defaultFormat="24h" switchable={false} />
      </>,
    );
    const clocks = screen.getAllByTestId('clock');
    expect(clocks).toHaveLength(2);
    const parts = (el: HTMLElement) =>
      Array.from(el.querySelectorAll('span')).map((span) => span.textContent);
    expect(parts(clocks[0]!)).toEqual(parts(clocks[1]!));
  });
});
