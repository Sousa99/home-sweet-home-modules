import '@testing-library/jest-dom/vitest';
import { beforeEach, vi } from 'vitest';
import { resetMarkerStore } from './react-leaflet-mock';

vi.mock('react-leaflet', () => import('./react-leaflet-mock'));

beforeEach(() => {
  resetMarkerStore();
});
