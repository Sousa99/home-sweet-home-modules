import type { Meta, StoryObj } from '@storybook/react-vite';
import { ClockCard } from './ClockCard';

const meta = {
  title: 'Clock/ClockCard',
  component: ClockCard,
  decorators: [
    (Story) => (
      <div className="h-44 w-96">
        <Story />
      </div>
    ),
  ],
  argTypes: {
    align: {
      control: 'inline-radio',
      options: ['left', 'center', 'right'],
    },
    defaultFormat: {
      control: 'inline-radio',
      options: ['12h', '24h'],
    },
    switchable: {
      control: 'boolean',
    },
    aspectRatio: {
      control: 'text',
    },
  },
} satisfies Meta<typeof ClockCard>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {},
};

export const TwelveHour: Story = {
  args: { defaultFormat: '12h' },
};

export const NotSwitchable: Story = {
  args: { switchable: false },
};

export const LeftAligned: Story = {
  args: { align: 'left' },
};

export const RightAligned: Story = {
  args: { align: 'right' },
};

export const WideAspectRatio: Story = {
  args: { aspectRatio: '16/9' },
};
