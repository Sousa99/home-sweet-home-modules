import { describe, expect, it } from 'vitest';
import { resolveExitPreset } from '../src/lib/taskTransition';

describe('resolveExitPreset', () => {
  it('maps the default slide variant to the wide 500px sideways travel', () => {
    expect(resolveExitPreset('slide')).toEqual({ x: 500, y: 0 });
  });

  it('maps the slide-up variant to a vertical exit with no sideways travel', () => {
    expect(resolveExitPreset('slide-up')).toEqual({ x: 0, y: -48 });
  });

  it('falls back to the slide preset for undefined input', () => {
    expect(resolveExitPreset(undefined)).toEqual({ x: 500, y: 0 });
  });
});
