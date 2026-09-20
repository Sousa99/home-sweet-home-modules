import { describe, expect, it } from 'vitest';
import {
  AircraftCard,
  ApiError,
  Badge,
  Button,
  Card,
  FlyOverForm,
  FlyOverList,
  Input,
  Label,
  MAX_RADIUS_KM,
  getFlyOvers,
} from '../../index';

describe('library entry', () => {
  it('exports the fly-over components', () => {
    expect(FlyOverForm).toBeTypeOf('function');
    expect(FlyOverList).toBeTypeOf('function');
    expect(AircraftCard).toBeTypeOf('function');
  });

  it('exports the ui primitives', () => {
    expect(Button).toBeTypeOf('function');
    expect(Badge).toBeTypeOf('function');
    expect(Card).toBeTypeOf('function');
    expect(Input).toBeTypeOf('function');
    expect(Label).toBeTypeOf('function');
  });

  it('exports the api client and shared constants', () => {
    expect(getFlyOvers).toBeTypeOf('function');
    expect(ApiError).toBeTypeOf('function');
    expect(MAX_RADIUS_KM).toBe(500);
  });
});
