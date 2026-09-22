import { useEffect, useState } from 'react';
import type { FormEvent, JSX } from 'react';
import { MAX_RADIUS_KM } from '../api/client';
import type { LocationQuery } from '../api/types';
import { isValidLat, isValidLng, isValidRadiusKm } from '../lib/location';
import { Button } from './ui/button';
import { Input, Label } from './ui/input';

export interface FlyOverFormProps {
  /** The shared location draft rendered into the fields (map ↔ inputs sync). */
  value?: LocationQuery;
  /** Called with a validated query whenever a field becomes a valid value. */
  onChange?: (value: LocationQuery) => void;
  /** Called with a validated query when the form is submitted. */
  onSubmit: (query: LocationQuery) => void;
  /** Disables the inputs and submit button while a query is in flight. */
  loading?: boolean;
}

type Field = 'lat' | 'lng' | 'radiusKm';
type FieldErrors = Partial<Record<Field, string>>;
type Fields = Record<Field, string>;

/** Default radius used when the current-location fill has no other radius. */
const DEFAULT_RADIUS_KM = 10;

type GeolocationStatus = 'idle' | 'loading' | 'success' | 'error';

function parseNumber(value: string): number | null {
  const trimmed = value.trim();
  if (trimmed === '') return null;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
}

/**
 * Pick the radius the current-location fill should keep: the current field
 * value when valid, then the shared draft radius, then the default.
 */
function preserveRadius(rawRadius: string, draftRadius: number | undefined): number {
  const typed = parseNumber(rawRadius);
  if (typed !== null && isValidRadiusKm(typed)) return typed;
  if (draftRadius !== undefined && isValidRadiusKm(draftRadius)) return draftRadius;
  return DEFAULT_RADIUS_KM;
}

/**
 * Validate the raw form fields against the same bounds the backend enforces.
 *
 * @param raw - the raw string field values
 * @returns a parsed query (when valid) and any per-field errors
 */
function validate(raw: Fields): { query?: LocationQuery; errors: FieldErrors } {
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

function toFields(query: LocationQuery): Fields {
  return {
    lat: String(query.lat),
    lng: String(query.lng),
    radiusKm: String(query.radiusKm),
  };
}

/**
 * The fly-over query form: latitude, longitude, and radius inputs with inline
 * validation, a "Use my current location" control, and a submit button.
 * Controlled via `value`/`onChange` so the map selection and the inputs stay
 * consistent; backward-compatible when only `onSubmit` is provided.
 */
export const FlyOverForm = ({
  value,
  onChange,
  onSubmit,
  loading = false,
}: FlyOverFormProps): JSX.Element => {
  const [fields, setFields] = useState<Fields>(() =>
    value ? toFields(value) : { lat: '', lng: '', radiusKm: '' },
  );
  const [errors, setErrors] = useState<FieldErrors>({});
  const [geoStatus, setGeoStatus] = useState<GeolocationStatus>('idle');
  const [geoError, setGeoError] = useState<string>();

  useEffect(() => {
    if (value === undefined) return;
    setFields((prev) => {
      const current = {
        lat: parseNumber(prev.lat),
        lng: parseNumber(prev.lng),
        radiusKm: parseNumber(prev.radiusKm),
      };
      const matches =
        current.lat === value.lat &&
        current.lng === value.lng &&
        current.radiusKm === value.radiusKm;
      return matches ? prev : toFields(value);
    });
  }, [value]);

  const handleFieldChange = (field: Field) => (raw: string) => {
    const next = { ...fields, [field]: raw };
    setFields(next);
    setErrors((prev) => (prev[field] ? { ...prev, [field]: undefined } : prev));
    const { query } = validate(next);
    if (query && onChange) {
      onChange(query);
    }
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const { query, errors: nextErrors } = validate(fields);
    setErrors(nextErrors);
    if (query) {
      onSubmit(query);
    }
  };

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      setGeoStatus('error');
      setGeoError('Location is unavailable in this browser.');
      return;
    }
    setGeoStatus('loading');
    setGeoError(undefined);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        if (!isValidLat(lat) || !isValidLng(lng)) {
          setGeoStatus('error');
          setGeoError('Unable to determine your location.');
          return;
        }
        const radiusKm = preserveRadius(fields.radiusKm, value?.radiusKm);
        const next: LocationQuery = { lat, lng, radiusKm };
        setFields({ lat: String(lat), lng: String(lng), radiusKm: String(radiusKm) });
        setErrors({});
        setGeoStatus('success');
        onChange?.(next);
      },
      (error) => {
        setGeoError(
          error.code === 1
            ? 'Location permission was denied.'
            : error.code === 3
              ? 'The location lookup timed out.'
              : 'Unable to determine your location.',
        );
        setGeoStatus('error');
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 },
    );
  };

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className="space-y-4 rounded-xl border border-primary/20 bg-white p-4 shadow-sm"
    >
      <div className="flex justify-center">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleUseCurrentLocation}
          disabled={loading || geoStatus === 'loading'}
        >
          {geoStatus === 'loading' ? 'Locating…' : 'Use my current location'}
        </Button>
      </div>
      {geoError && (
        <p className="text-xs text-red-600" role="alert">
          {geoError}
        </p>
      )}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div>
          <Label htmlFor="lat">Latitude</Label>
          <Input
            id="lat"
            value={fields.lat}
            onChange={(event) => handleFieldChange('lat')(event.target.value)}
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
            value={fields.lng}
            onChange={(event) => handleFieldChange('lng')(event.target.value)}
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
            value={fields.radiusKm}
            onChange={(event) => handleFieldChange('radiusKm')(event.target.value)}
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
      <div className="flex justify-center">
        <Button type="submit" disabled={loading}>
          {loading ? 'Loading…' : 'Find aircraft'}
        </Button>
      </div>
    </form>
  );
};
