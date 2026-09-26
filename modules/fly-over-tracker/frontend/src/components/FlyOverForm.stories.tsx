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

export const CurrentLocation: Story = {
  args: {
    value: { lat: 38.7223, lng: -9.1393, radiusKm: 10 },
    onChange: (query) => {
      console.log('FlyOverForm changed', query);
    },
  },
  decorators: [
    (Story) => {
      Object.defineProperty(navigator, 'geolocation', {
        configurable: true,
        value: {
          getCurrentPosition: (success: PositionCallback) => {
            success({
              coords: {
                latitude: 48.8566,
                longitude: 2.3522,
                accuracy: 5,
                altitude: null,
                altitudeAccuracy: null,
                heading: null,
                speed: null,
                toJSON: () => ({}),
              },
              timestamp: Date.now(),
              toJSON: () => ({}),
            } as GeolocationPosition);
          },
        },
      });
      return <Story />;
    },
  ],
};
