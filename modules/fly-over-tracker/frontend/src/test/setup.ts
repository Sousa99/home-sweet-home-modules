import '@testing-library/jest-dom/vitest';
import { beforeEach, vi } from 'vitest';
import { resetMapStore, resetMarkerStore } from './react-leaflet-mock';

vi.mock('react-leaflet', () => import('./react-leaflet-mock'));

beforeEach(() => {
  resetMarkerStore();
  resetMapStore();
});
