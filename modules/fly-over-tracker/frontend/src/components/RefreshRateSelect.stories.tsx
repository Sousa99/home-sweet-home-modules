import type { Meta, StoryObj } from '@storybook/react';
import { RefreshRateSelect } from './RefreshRateSelect';

const meta: Meta<typeof RefreshRateSelect> = {
  title: 'FlyOver/RefreshRateSelect',
  component: RefreshRateSelect,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'Selects the automatic refresh cadence for the fly-over results: off, or every 5/10/30/60 seconds. The owner (e.g. the SPA) schedules refreshes from the chosen rate.',
      },
    },
  },
  args: {
    value: 'off',
    onChange: (value) => {
      console.log('RefreshRateSelect changed', value);
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
