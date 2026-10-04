import { describe, expect, it } from 'vitest';
import { resolveExitTravel } from '../src/lib/taskTransition';

describe('resolveExitTravel', () => {
  it('maps the default slide variant to the wide 500px travel', () => {
    expect(resolveExitTravel('slide')).toBe(500);
  });

  it('maps the gentle variant to the reduced 80px travel', () => {
    expect(resolveExitTravel('gentle')).toBe(80);
  });

  it('falls back to the slide travel for undefined input', () => {
    expect(resolveExitTravel(undefined)).toBe(500);
  });
});
