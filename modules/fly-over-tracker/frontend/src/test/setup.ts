import '@testing-library/jest-dom/vitest';
import { beforeEach, vi } from 'vitest';
import {
  resetMapStore,
  resetMarkerStore,
  resetResizeObserverStore,
  resetTileLayerUrls,
  resizeObserverStore,
} from './react-leaflet-mock';

vi.mock('react-leaflet', () => import('./react-leaflet-mock'));

/**
 * jsdom has no `ResizeObserver`; provide a fake so components that observe
 * their container can be driven deterministically in tests (`trigger()` runs
 * the observer callback, simulating a resize).
 */
class MockResizeObserver {
  constructor(private readonly callback: (entries: unknown[]) => void) {
    resizeObserverStore.instances.push(this);
  }
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
  trigger(): void {
    this.callback([]);
  }
}

vi.stubGlobal('ResizeObserver', MockResizeObserver);

beforeEach(() => {
  resetMarkerStore();
  resetMapStore();
  resetTileLayerUrls();
  resetResizeObserverStore();
});
