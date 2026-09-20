import type { Meta, StoryObj } from '@storybook/react';
import { FlyOverForm } from './FlyOverForm';

const meta: Meta<typeof FlyOverForm> = {
  title: 'FlyOver/FlyOverForm',
  component: FlyOverForm,
  parameters: { layout: 'centered' },
  args: {
    onSubmit: (query) => {
      console.log('FlyOverForm submitted', query);
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Loading: Story = {
  args: { loading: true },
};
