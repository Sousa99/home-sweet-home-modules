import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { TaskDeck } from '../src/components/task/TaskDeck';
import { sampleTasks } from '../src/components/task/TaskDeck.fixtures';

const { deckCardsPropsSpy } = vi.hoisted(() => ({ deckCardsPropsSpy: vi.fn() }));

vi.mock('../src/components/ui/deck/deck', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../src/components/ui/deck/deck')>();
  const React = await import('react');
  return {
    ...actual,
    DeckCards: (props: React.ComponentProps<typeof actual.DeckCards>) => {
      deckCardsPropsSpy(props);
      return React.createElement(actual.DeckCards, props);
    },
  };
});

describe('TaskDeck transition wiring', () => {
  it('passes the slide exit preset to DeckCards by default', () => {
    render(<TaskDeck tasks={sampleTasks} autoRotateMs={0} />);
    expect(deckCardsPropsSpy).toHaveBeenCalledWith(
      expect.objectContaining({ exitPreset: { x: 500, y: 0 } }),
    );
  });

  it('passes the slide-up exit preset when transitionVariant is slide-up', () => {
    render(<TaskDeck tasks={sampleTasks} autoRotateMs={0} transitionVariant="slide-up" />);
    expect(deckCardsPropsSpy).toHaveBeenCalledWith(
      expect.objectContaining({ exitPreset: { x: 0, y: -48 } }),
    );
  });
});
