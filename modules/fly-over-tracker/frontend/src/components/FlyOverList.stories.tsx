import type { Meta, StoryObj } from '@storybook/react';
import type { FlyOverResult } from '../api/types';
import { FlyOverList } from './FlyOverList';

const result: FlyOverResult = {
  center: { lat: 48.8566, lng: 2.3522 },
  radiusKm: 50,
  asOf: 1_726_900_000,
  count: 3,
  destinationEnrichment: 'complete',
  aircraft: [
    {
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
    },
    {
      icao24: '3946b0',
      callsign: 'AFR123',
      originCountry: 'France',
      destinationAirport: null,
      destinationCountry: null,
      latitude: 48.7,
      longitude: 2.1,
      altitude: 10300,
      onGround: false,
      velocity: 210,
      trueTrack: 200,
      verticalRate: -2.5,
      distanceKm: 25.4,
    },
    {
      icao24: '4caa01',
      callsign: 'BAW456',
      originCountry: 'United Kingdom',
      destinationAirport: null,
      destinationCountry: null,
      latitude: 49.02,
      longitude: 2.1,
      altitude: 11000,
      onGround: false,
      velocity: 235,
      trueTrack: 340,
      verticalRate: 1.2,
      distanceKm: 27.9,
    },
  ],
};

const meta: Meta<typeof FlyOverList> = {
  title: 'FlyOver/FlyOverList',
  component: FlyOverList,
  parameters: { layout: 'centered' },
  args: { onRefresh: () => {} },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Idle: Story = {
  args: { status: 'idle', result: null },
};

export const Loading: Story = {
  args: { status: 'loading', result: null },
};

export const Success: Story = {
  args: { status: 'success', result },
};

export const Empty: Story = {
  args: { status: 'success', result: { ...result, count: 0, aircraft: [] } },
};

export const Error: Story = {
  args: {
    status: 'error',
    result: null,
    error: 'Aircraft feed is temporarily unavailable',
  },
};
