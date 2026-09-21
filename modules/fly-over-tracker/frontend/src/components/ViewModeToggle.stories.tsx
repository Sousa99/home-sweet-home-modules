import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { ViewModeToggle } from './ViewModeToggle';
import type { ViewMode } from './ViewModeToggle';

const meta: Meta<typeof ViewModeToggle> = {
  title: 'FlyOver/ViewModeToggle',
  component: ViewModeToggle,
  parameters: { layout: 'centered' },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const ListMode: Story = {
  args: { mode: 'list', onChange: () => {} },
};

export const MapMode: Story = {
  args: { mode: 'map', onChange: () => {} },
};

export const Interactive: Story = {
  render: () => {
    const [mode, setMode] = useState<ViewMode>('list');
    return <ViewModeToggle mode={mode} onChange={setMode} />;
  },
};
