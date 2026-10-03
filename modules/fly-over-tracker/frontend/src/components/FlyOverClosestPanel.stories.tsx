import type { Decorator, Meta, StoryObj } from '@storybook/react';
import { FlyOverClosestPanel } from './FlyOverClosestPanel';
import type { Aircraft, FlyOverResult } from '../api/types';

function aircraft(overrides: Partial<Aircraft> & Pick<Aircraft, 'icao24' | 'callsign'>): Aircraft {
  return {
    originAirport: null,
    originCity: null,
    originAirportName: null,
    originCountry: null,
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
    ...overrides,
  };
}

const dlh = aircraft({ icao24: '3c6444', callsign: 'DLH400', distanceKm: 8.2 });
const ryr = aircraft({ icao24: '4ca866', callsign: 'RYR45A', distanceKm: 26.1 });
const tap = aircraft({ icao24: '4951a1', callsign: 'TAP123', distanceKm: 40.5 });

function result(aircraftList: Aircraft[]): FlyOverResult {
  return {
    center: { lat: 48.8566, lng: 2.3522 },
    radiusKm: 50,
    asOf: 1_726_900_000,
    count: aircraftList.length,
    destinationEnrichment: 'complete',
    aircraft: aircraftList,
  };
}

/** Point the panel's fetch at a fixture so stories render offline deterministically. */
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
      <div className="h-[560px] w-full max-w-2xl">
        <Story />
      </div>
    );
  };
}

const meta: Meta<typeof FlyOverClosestPanel> = {
  title: 'DashboardWidgets/FlyOverClosestPanel',
  component: FlyOverClosestPanel,
  args: {
    location: { lat: 48.8566, lng: 2.3522, radiusKm: 50 },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const WithAircraft: Story = {
  decorators: [withFetchStub(result([dlh, ryr, tap]))],
};

export const CappedList: Story = {
  args: { maxResults: 1 },
  decorators: [withFetchStub(result([dlh, ryr, tap]))],
};

export const Empty: Story = {
  decorators: [withFetchStub(result([]))],
};

export const Error: Story = {
  decorators: [
    withFetchStub({ success: false, message: 'Aircraft feed is temporarily unavailable' }, 503),
  ],
};

export const AutoRefresh: Story = {
  args: { autoRefresh: 10 },
  decorators: [withFetchStub(result([dlh, ryr, tap]))],
};
