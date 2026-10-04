import type { Meta, StoryObj } from '@storybook/react-vite';
import { LocationSelector, type SearchLocations } from './LocationSelector';
import { LISBON, MADRID } from './fixtures';

const meta: Meta<typeof LocationSelector> = {
  title: 'Weather/LocationSelector',
  component: LocationSelector,
  decorators: [
    (Story) => (
      <div className="w-full max-w-sm">
        <Story />
      </div>
    ),
  ],
  argTypes: {
    value: { control: 'object' },
    placeholder: { control: 'text' },
  },
};

export default meta;

type Story = StoryObj<typeof meta>;

const search: SearchLocations = async (query) => {
  const q = query.trim().toLowerCase();
  const all = [LISBON, MADRID];
  return all.filter((location) => location.name.toLowerCase().includes(q));
};

export const Empty: Story = {
  args: { value: null, onChange: () => undefined, searchLocations: search },
};

export const WithSelection: Story = {
  args: { value: LISBON, onChange: () => undefined, searchLocations: search },
};

export const NoResults: Story = {
  args: {
    value: null,
    onChange: () => undefined,
    searchLocations: async () => [],
  },
};
