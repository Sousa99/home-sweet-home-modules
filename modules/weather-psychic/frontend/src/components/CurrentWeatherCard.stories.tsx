import type { Meta, StoryObj } from '@storybook/react-vite';
import { CurrentWeatherCard, type FetchForecast } from './CurrentWeatherCard';
import { fixtureForecast, LISBON, MADRID } from './fixtures';

const meta = {
  title: 'Weather/CurrentWeatherCard',
  component: CurrentWeatherCard,
  decorators: [
    (Story) => (
      <div className="w-full max-w-xl">
        <Story />
      </div>
    ),
  ],
  argTypes: {
    location: { control: 'object' },
    baseUrl: { control: 'text' },
    refetchIntervalMs: { control: 'number' },
  },
} satisfies Meta<typeof CurrentWeatherCard>;

export default meta;

type Story = StoryObj<typeof meta>;

const ready: FetchForecast = async () => fixtureForecast();

export const Loading: Story = {
  args: { location: LISBON, fetchForecast: () => new Promise(() => undefined) },
};

export const Ready: Story = {
  args: { location: LISBON, fetchForecast: ready },
};

export const Madrid: Story = {
  args: { location: MADRID, fetchForecast: async () => fixtureForecast(MADRID) },
};

export const LoadError: Story = {
  args: {
    location: LISBON,
    fetchForecast: async () => {
      throw new Error('Weather provider unavailable');
    },
  },
};

export const ReducedMotion: Story = {
  parameters: { a11y: { disabled: true } },
  args: { location: LISBON, fetchForecast: ready },
};
