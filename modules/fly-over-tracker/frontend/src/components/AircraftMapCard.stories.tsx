import type { Meta, StoryObj } from '@storybook/react';
import { AircraftMapCard } from './AircraftMapCard';
import type { Aircraft } from '../api/types';

const sampleAircraft: Aircraft = {
  icao24: '3c6444',
  callsign: 'DLH400',
  originCountry: 'Germany',
  destinationAirport: 'LPPT',
  destinationCountry: 'Portugal',
  latitude: 48.9211,
  longitude: 2.4288,
  altitude: 9144,
  onGround: false,
  velocity: 251.2,
  trueTrack: 87.5,
  verticalRate: 0,
  distanceKm: 8.2,
};

const meta: Meta<typeof AircraftMapCard> = {
  title: 'FlyOver/AircraftMapCard',
  component: AircraftMapCard,
  parameters: { layout: 'padded' },
  args: { aircraft: sampleAircraft },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithoutDestination: Story = {
  args: { aircraft: { ...sampleAircraft, destinationAirport: null, destinationCountry: null } },
};

export const OnGround: Story = {
  args: { aircraft: { ...sampleAircraft, onGround: true } },
};
