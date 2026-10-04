import type { Meta, StoryObj } from '@storybook/react-vite';
import { DailyForecastCard, type FetchForecast } from './DailyForecastCard';
import { fixtureForecast, LISBON, MADRID } from './fixtures';

const meta: Meta<typeof DailyForecastCard> = {
  title: 'Weather/DailyForecastCard',
  component: DailyForecastCard,
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
    maxDays: { control: 'number' },
  },
};

export default meta;

type Story = StoryObj<typeof meta>;

const ready: FetchForecast = async () => fixtureForecast();

export const Loading: Story = {
  args: { location: LISBON, fetchForecast: () => new Promise(() => undefined) },
};

export const Ready: Story = {
  args: { location: LISBON, fetchForecast: ready, now: '2026-10-04T12:00:00Z' },
};

export const Madrid: Story = {
  args: {
    location: MADRID,
    fetchForecast: async () => fixtureForecast(MADRID),
    now: '2026-10-04T12:00:00Z',
  },
};

export const LoadError: Story = {
  args: {
    location: LISBON,
    fetchForecast: async () => {
      throw new Error('Weather provider unavailable');
    },
    now: '2026-10-04T12:00:00Z',
  },
};

export const MaxDaysThree: Story = {
  args: { location: LISBON, fetchForecast: ready, maxDays: 3, now: '2026-10-04T12:00:00Z' },
};
