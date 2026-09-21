import type { Meta, StoryObj } from '@storybook/react';
import { FlyOverMap } from './FlyOverMap';
import type { Aircraft } from '../api/types';

const sampleAircraft: Aircraft[] = [
  {
    icao24: '3c6444',
    callsign: 'DLH400',
    originAirport: null,
    originCity: null,
    originAirportName: null,
    originCountry: 'Germany',
    destinationAirport: null,
    destinationCity: null,
    destinationAirportName: null,
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
    icao24: '4ca866',
    callsign: 'RYR45A',
    originAirport: null,
    originCity: null,
    originAirportName: null,
    originCountry: 'Ireland',
    destinationAirport: null,
    destinationCity: null,
    destinationAirportName: null,
    destinationCountry: null,
    latitude: 48.7301,
    longitude: 2.0102,
    altitude: 11058,
    onGround: false,
    velocity: 240.8,
    trueTrack: 210,
    verticalRate: -3.4,
    distanceKm: 26.1,
  },
];

const meta: Meta<typeof FlyOverMap> = {
  title: 'FlyOver/FlyOverMap',
  component: FlyOverMap,
  parameters: { layout: 'fullscreen' },
  args: {
    center: { lat: 48.8566, lng: 2.3522 },
    radiusKm: 50,
    aircraft: sampleAircraft,
    onCenterChange: (center) => {
      console.log('center changed', center);
    },
    onRadiusChange: (radiusKm) => {
      console.log('radius changed', radiusKm);
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const WithAircraft: Story = {};

export const EmptySelection: Story = {
  args: { aircraft: [] },
};
