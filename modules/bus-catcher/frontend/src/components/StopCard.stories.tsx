import type { Meta, StoryObj } from '@storybook/react-vite';
import type { StopTimesResponse } from '../api/types';
import { StopCard, type FetchStopTimes } from './StopCard';

const mixedResponse: StopTimesResponse = {
  stopId: 'S1',
  times: [
    {
      tripId: 'T2',
      lineId: 'L1',
      lineShortName: '736',
      headsign: 'Cais',
      scheduledAt: '2026-06-15T08:00:00.000Z',
      minutesUntil: 10,
      source: 'live',
      predictedAt: '2026-06-15T08:04:00.000Z',
      delayMinutes: 4,
    },
    {
      lineId: 'L2',
      lineShortName: '3705',
      headsign: 'Almada',
      scheduledAt: '2026-06-15T08:15:00.000Z',
      minutesUntil: 25,
    },
  ],
  realtime: {
    available: true,
    lastUpdate: '2026-06-15T08:03:00.000Z',
    liveCount: 1,
    totalCount: 2,
  },
};

const scheduleOnlyResponse: StopTimesResponse = {
  stopId: 'S1',
  times: [
    {
      lineId: 'L1',
      lineShortName: '736',
      headsign: 'Cais',
      scheduledAt: '2026-06-15T08:00:00.000Z',
      minutesUntil: 10,
    },
    {
      lineId: 'L2',
      lineShortName: '3705',
      headsign: 'Almada',
      scheduledAt: '2026-06-15T08:15:00.000Z',
      minutesUntil: 25,
    },
  ],
  realtime: { available: false, lastUpdate: null, liveCount: 0, totalCount: 2 },
};

const emptyResponse: StopTimesResponse = {
  stopId: 'S1',
  times: [],
  realtime: { available: false, lastUpdate: null, liveCount: 0, totalCount: 0 },
};

const fetchMixed: FetchStopTimes = ({ stopId }) => Promise.resolve({ ...mixedResponse, stopId });
const fetchScheduleOnly: FetchStopTimes = ({ stopId }) =>
  Promise.resolve({ ...scheduleOnlyResponse, stopId });
const fetchEmpty: FetchStopTimes = ({ stopId }) => Promise.resolve({ ...emptyResponse, stopId });
const fetchPending: FetchStopTimes = () => new Promise<StopTimesResponse>(() => {});
const fetchError: FetchStopTimes = async () => {
  throw new globalThis.Error('stop not found');
};

const meta = {
  component: StopCard,
  tags: ['autodocs'],
  args: {
    stopId: 'S1',
    stopName: 'Sete Rios',
    lines: [],
    limit: 5,
    refetchIntervalMs: 0,
    missing: false,
  },
} satisfies Meta<typeof StopCard>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    lines: ['736'],
    fetchTimes: fetchMixed,
  },
};

export const ScheduleOnly: Story = {
  args: {
    fetchTimes: fetchScheduleOnly,
  },
};

export const Empty: Story = {
  args: {
    fetchTimes: fetchEmpty,
  },
};

export const Loading: Story = {
  args: {
    fetchTimes: fetchPending,
  },
};

export const Error: Story = {
  args: {
    fetchTimes: fetchError,
  },
};

export const Missing: Story = {
  args: {
    missing: true,
  },
};
