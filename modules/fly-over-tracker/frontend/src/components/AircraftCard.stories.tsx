import type { Meta, StoryObj } from '@storybook/react';
import type { Aircraft } from '../api/types';
import { AircraftCard } from './AircraftCard';

const aircraft: Aircraft = {
  icao24: '3c6444',
  callsign: 'DLH400',
  originCountry: 'Germany',
  destinationAirport: null,
  destinationCountry: null,
  latitude: 48.9211,
  longitude: 2.4288,
  altitude: 9144,
  onGround: false,
  velocity: 251.2,
  trueTrack: 87.5,
  verticalRate: 0,
  distanceKm: 8.2,
};

const meta: Meta<typeof AircraftCard> = {
  title: 'FlyOver/AircraftCard',
  component: AircraftCard,
  parameters: { layout: 'centered' },
  args: { aircraft },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const OnGround: Story = {
  args: { aircraft: { ...aircraft, onGround: true } },
};

export const MissingFields: Story = {
  args: {
    aircraft: {
      ...aircraft,
      callsign: null,
      altitude: null,
      velocity: null,
      trueTrack: null,
    },
  },
};
