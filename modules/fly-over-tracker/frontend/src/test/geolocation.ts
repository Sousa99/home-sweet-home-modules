import { afterEach, vi } from 'vitest';
import type { Mock } from 'vitest';

/**
 * Controllable jsdom-safe double for `navigator.geolocation`.
 *
 * jsdom does not implement geolocation, so the FlyOverForm's availability
 * check (`navigator.geolocation != null`) sees `undefined` by default. This
 * helper installs a stub whose `getCurrentPosition` behaves per the scenario
 * the test chooses: it can report a position (success), fail with one of the
 * three `GeolocationPositionError` codes, or call neither callback (pending).
 * The stub is removed automatically after each test so scenarios never leak.
 */

export interface FakeGeolocationCoords {
  latitude: number;
  longitude: number;
  /** Position accuracy in meters; defaults to 0. */
  accuracy?: number;
}

/** Error codes matching `GeolocationPositionError`. */
export const GEOLOCATION_ERROR = {
  PERMISSION_DENIED: 1,
  POSITION_UNAVAILABLE: 2,
  TIMEOUT: 3,
} as const;

/** The behavior a mocked `getCurrentPosition` call should exhibit. */
export type GeolocationScenario =
  | { type: 'success'; coords: FakeGeolocationCoords }
  | {
      type: 'error';
      code: (typeof GEOLOCATION_ERROR)[keyof typeof GEOLOCATION_ERROR];
      message?: string;
    }
  | { type: 'pending' };

function fakePosition(coords: FakeGeolocationCoords): GeolocationPosition {
  return {
    coords: {
      latitude: coords.latitude,
      longitude: coords.longitude,
      accuracy: coords.accuracy ?? 0,
      altitude: null,
      altitudeAccuracy: null,
      heading: null,
      speed: null,
      toJSON: () => ({}),
    },
    timestamp: Date.now(),
    toJSON: () => ({}),
  };
}

function fakeError(code: number, message?: string): GeolocationPositionError {
  return {
    code,
    message: message ?? 'Geolocation error',
    PERMISSION_DENIED: GEOLOCATION_ERROR.PERMISSION_DENIED,
    POSITION_UNAVAILABLE: GEOLOCATION_ERROR.POSITION_UNAVAILABLE,
    TIMEOUT: GEOLOCATION_ERROR.TIMEOUT,
  };
}

let originalGeolocation: Geolocation | undefined;

/**
 * Install a `navigator.geolocation` stub that resolves the given scenario on
 * the next `getCurrentPosition` call.
 *
 * @param scenario - the behavior to simulate
 * @returns the underlying `getCurrentPosition` mock for call assertions
 */
export function mockGeolocation(
  scenario: GeolocationScenario,
): Mock<Geolocation['getCurrentPosition']> {
  const getCurrentPosition = vi.fn<Geolocation['getCurrentPosition']>((success, error) => {
    if (scenario.type === 'success') {
      success?.(fakePosition(scenario.coords));
    } else if (scenario.type === 'error') {
      error?.(fakeError(scenario.code, scenario.message));
    }
  });

  originalGeolocation = navigator.geolocation;
  Object.defineProperty(navigator, 'geolocation', {
    configurable: true,
    value: { getCurrentPosition },
  });

  return getCurrentPosition;
}

/**
 * Remove the stub installed by {@link mockGeolocation}, restoring the default
 * (undefined) geolocation. Registered as an automatic teardown.
 */
export function restoreGeolocation(): void {
  if (originalGeolocation === undefined) {
    delete (navigator as unknown as { geolocation?: Geolocation }).geolocation;
  } else {
    Object.defineProperty(navigator, 'geolocation', {
      configurable: true,
      value: originalGeolocation,
    });
  }
  originalGeolocation = undefined;
}

afterEach(() => {
  restoreGeolocation();
});
