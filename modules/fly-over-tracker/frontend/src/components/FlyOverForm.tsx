import { useState } from 'react';
import type { FormEvent } from 'react';
import { MAX_RADIUS_KM } from '../api/client';
import type { LocationQuery } from '../api/types';
import { Button } from './ui/button';
import { Input, Label } from './ui/input';

export interface FlyOverFormProps {
  /** Called with a validated query when the form is submitted. */
  onSubmit: (query: LocationQuery) => void;
  /** Disables the inputs and submit button while a query is in flight. */
  loading?: boolean;
}

type Field = 'lat' | 'lng' | 'radiusKm';
type FieldErrors = Partial<Record<Field, string>>;

function parseNumber(value: string): number | null {
  const trimmed = value.trim();
  if (trimmed === '') return null;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
}

/**
 * Validate the raw form fields against the same bounds the backend enforces.
 *
 * @param raw - the raw string field values
 * @returns a parsed query (when valid) and any per-field errors
 */
function validate(raw: Record<Field, string>): { query?: LocationQuery; errors: FieldErrors } {
  const errors: FieldErrors = {};

  const lat = parseNumber(raw.lat);
  if (lat === null || lat < -90 || lat > 90) {
    errors.lat = 'Latitude must be a number between -90 and 90.';
  }

  const lng = parseNumber(raw.lng);
  if (lng === null || lng < -180 || lng > 180) {
    errors.lng = 'Longitude must be a number between -180 and 180.';
  }

  const radiusKm = parseNumber(raw.radiusKm);
  if (radiusKm === null || radiusKm <= 0 || radiusKm > MAX_RADIUS_KM) {
    errors.radiusKm = `Radius must be a number between 0 and ${MAX_RADIUS_KM} km.`;
  }

  if (lat === null || lng === null || radiusKm === null) {
    return { errors };
  }
  if (Object.keys(errors).length > 0) {
    return { errors };
  }
  return { query: { lat, lng, radiusKm }, errors };
}

/**
 * The fly-over query form: latitude, longitude, and radius inputs with inline
 * validation and a submit button.
 */
export function FlyOverForm({ onSubmit, loading = false }: FlyOverFormProps) {
  const [lat, setLat] = useState('');
  const [lng, setLng] = useState('');
  const [radiusKm, setRadiusKm] = useState('');
  const [errors, setErrors] = useState<FieldErrors>({});

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const { query, errors: nextErrors } = validate({ lat, lng, radiusKm });
    setErrors(nextErrors);
    if (query) {
      onSubmit(query);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className="space-y-4 rounded-xl border border-primary/20 bg-white p-4 shadow-sm"
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div>
          <Label htmlFor="lat">Latitude</Label>
          <Input
            id="lat"
            value={lat}
            onChange={(event) => setLat(event.target.value)}
            placeholder="e.g. 48.8566"
            aria-invalid={errors.lat ? true : undefined}
          />
          {errors.lat && (
            <p className="mt-1 text-xs text-red-600" role="alert">
              {errors.lat}
            </p>
          )}
        </div>
        <div>
          <Label htmlFor="lng">Longitude</Label>
          <Input
            id="lng"
            value={lng}
            onChange={(event) => setLng(event.target.value)}
            placeholder="e.g. 2.3522"
            aria-invalid={errors.lng ? true : undefined}
          />
          {errors.lng && (
            <p className="mt-1 text-xs text-red-600" role="alert">
              {errors.lng}
            </p>
          )}
        </div>
        <div>
          <Label htmlFor="radiusKm">Radius (km)</Label>
          <Input
            id="radiusKm"
            value={radiusKm}
            onChange={(event) => setRadiusKm(event.target.value)}
            placeholder={`max ${MAX_RADIUS_KM}`}
            aria-invalid={errors.radiusKm ? true : undefined}
          />
          {errors.radiusKm && (
            <p className="mt-1 text-xs text-red-600" role="alert">
              {errors.radiusKm}
            </p>
          )}
        </div>
      </div>
      <Button type="submit" disabled={loading}>
        {loading ? 'Loading…' : 'Find aircraft'}
      </Button>
    </form>
  );
}
