import type { Meta, StoryObj } from '@storybook/react-vite';
import type { CSSProperties } from 'react';
import { TaskDeck } from './TaskDeck';
import { sampleTasks } from './TaskDeck.fixtures';

const meta = {
  title: 'Task/TaskDeck',
  component: TaskDeck,
  args: {
    tasks: sampleTasks,
    autoRotateMs: 0,
    loop: true,
    stackSize: 3,
    slideDurationMs: 500,
  },
  argTypes: {
    tasks: {
      control: false,
      description: 'The tasks to render in the deck.',
    },
    filters: {
      control: 'object',
      description:
        'Applied client-side for ordering/emphasis; actual filtering happens at fetch time in the wrapper.',
    },
    autoRotateMs: {
      control: { type: 'number', min: 0, step: 1000 },
      description:
        'Interval (ms) for auto-advancing the deck; 0 disables. Pauses during a drag and resets after a manual skip.',
    },
    loop: {
      control: 'boolean',
      description: 'When true, wrap back to the first task instead of showing the empty state.',
    },
    stackSize: {
      control: { type: 'number', min: 1, max: 6 },
      description: 'Number of visible cards (the top card plus the cards fanned behind it).',
    },
    slideDurationMs: {
      control: { type: 'number', min: 100, max: 2000, step: 100 },
      description: 'Duration (ms) of the swipe/exit card animation.',
    },
    transitionVariant: {
      control: 'inline-radio',
      options: ['slide', 'slide-up'],
      description:
        'Exit animation: `slide` (default) pans the exiting card the full 500px sideways; `slide-up` exits it vertically (48px up) with no sideways travel, ideal for dense layouts.',
    },
    renderCard: {
      control: false,
      description: 'Optional per-card render override; defaults to a full TaskDeckCard.',
    },
    onCardChange: {
      control: false,
      description:
        'Called with the new index whenever the top card changes (auto-rotate or manual swipe).',
    },
    className: {
      control: 'text',
      description: 'Optional class names for the deck stage.',
    },
    style: {
      control: 'object',
      description:
        'Optional inline styles for the deck stage; use `--deck-height` to override the compact 16rem default (e.g. `{ "--deck-height": "24rem" }`).',
    },
  },
} satisfies Meta<typeof TaskDeck>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Filtered: Story = {
  args: {
    tasks: sampleTasks.filter((task) => task.status === 'in-progress'),
  },
};

export const AutoRotating: Story = {
  args: {
    autoRotateMs: 2000,
  },
};

export const NoLoop: Story = {
  args: {
    loop: false,
    stackSize: 3,
  },
};

export const Empty: Story = {
  args: {
    tasks: [],
  },
};

export const Slide: Story = {
  args: {
    transitionVariant: 'slide',
  },
};

export const SlideUp: Story = {
  args: {
    transitionVariant: 'slide-up',
  },
};

export const Compact: Story = {};

export const OverrideSize: Story = {
  args: {
    style: { '--deck-height': '24rem' } as CSSProperties,
  },
};
