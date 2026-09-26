import type { Decorator, Meta, StoryObj } from '@storybook/react';
import { FlyOverWidget } from './FlyOverWidget';
import type { Aircraft, FlyOverResult } from '../api/types';

const dlh: Aircraft = {
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
};

const ryr: Aircraft = {
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
};

const sampleResult: FlyOverResult = {
  center: { lat: 48.8566, lng: 2.3522 },
  radiusKm: 50,
  asOf: 1_726_900_000,
  count: 2,
  destinationEnrichment: 'complete',
  aircraft: [dlh, ryr],
};

/** Point the widget's fetch at a fixture so stories render offline deterministically. */
function installFetchStub(body: unknown, status = 200): void {
  window.fetch = (() =>
    Promise.resolve(
      new Response(JSON.stringify(body), {
        status,
        headers: { 'Content-Type': 'application/json' },
      }),
    )) as typeof fetch;
}

function withFetchStub(body: unknown, status = 200): Decorator {
  return (Story) => {
    installFetchStub(body, status);
    return (
      <div className="h-[480px] w-full">
        <Story />
      </div>
    );
  };
}

const meta: Meta<typeof FlyOverWidget> = {
  title: 'DashboardWidgets/FlyOverWidget',
  component: FlyOverWidget,
  args: {
    location: { lat: 48.8566, lng: 2.3522, radiusKm: 50 },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const WithAircraft: Story = {
  decorators: [withFetchStub(sampleResult)],
};

export const Empty: Story = {
  decorators: [withFetchStub({ ...sampleResult, count: 0, aircraft: [] })],
};

export const Error: Story = {
  decorators: [
    withFetchStub({ success: false, message: 'Aircraft feed is temporarily unavailable' }, 503),
  ],
};

export const AutoRefresh: Story = {
  args: { autoRefresh: 10 },
  decorators: [withFetchStub(sampleResult)],
};
