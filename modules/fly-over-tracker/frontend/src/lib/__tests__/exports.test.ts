import { describe, expect, it } from 'vitest';
import {
  AircraftCard,
  AircraftMapCard,
  ApiError,
  Badge,
  Button,
  Card,
  FlyOverForm,
  FlyOverList,
  FlyOverMap,
  Input,
  Label,
  MAX_RADIUS_KM,
  PlaneGlyph,
  RefreshRateSelect,
  ViewModeToggle,
  getFlyOvers,
} from '../../index';

describe('library entry', () => {
  it('exports the fly-over components', () => {
    expect(FlyOverForm).toBeTypeOf('function');
    expect(FlyOverList).toBeTypeOf('function');
    expect(FlyOverMap).toBeTypeOf('function');
    expect(AircraftCard).toBeTypeOf('function');
    expect(AircraftMapCard).toBeTypeOf('function');
    expect(PlaneGlyph).toBeTypeOf('function');
  });

  it('exports the display-mode components', () => {
    expect(ViewModeToggle).toBeTypeOf('function');
    expect(RefreshRateSelect).toBeTypeOf('function');
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
    expect(MAX_RADIUS_KM).toBe(463);
  });
});
