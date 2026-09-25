import type { ConfigStop, Line, Passing, Status, Stop, StopWithLines } from './types';

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    public readonly detail?: unknown,
  ) {
    super(code);
    this.name = 'ApiError';
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`/api${path}`, {
    headers: { 'content-type': 'application/json' },
    ...init,
  });
  if (!response.ok) {
    let error: { error?: string; detail?: unknown } | undefined;
    try {
      error = (await response.json()) as { error?: string; detail?: unknown };
    } catch {
      // non-JSON error body — ignore
    }
    throw new ApiError(response.status, error?.error ?? 'request_failed', error?.detail);
  }
  if (response.status === 204) {
    return undefined as T;
  }
  return (await response.json()) as T;
}

export interface AddConfigStopBody {
  stopId: string;
  lineFilter?: string[];
  displayOrder?: number;
  enabled?: boolean;
}

export interface UpdateConfigStopBody {
  lineFilter?: string[];
  displayOrder?: number;
  enabled?: boolean;
}

export const api = {
  searchStops: (q: string, limit = 20) =>
    request<{ stops: Stop[] }>(`/stops?q=${encodeURIComponent(q)}&limit=${limit}`),
  getStop: (id: string) => request<{ stop: StopWithLines }>(`/stops/${encodeURIComponent(id)}`),
  listLines: () => request<{ lines: Line[] }>('/lines'),
  getConfig: () => request<{ stops: ConfigStop[] }>('/config'),
  addConfigStop: (body: AddConfigStopBody) =>
    request<{ stop: ConfigStop }>('/config/stops', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  getStopTimes: (stopId: string, limit = 5, lines?: string[]) => {
    const params = new URLSearchParams({ limit: String(limit) });
    for (const line of lines ?? []) params.append('line', line);
    return request<{ stopId: string; times: Passing[] }>(
      `/stops/${encodeURIComponent(stopId)}/times?${params.toString()}`,
    );
  },
  getStatus: () => request<Status>('/status'),
  refreshSchedule: () =>
    request<{ status: 'started' | 'in_progress' }>('/refresh', {
      method: 'POST',
    }),
  updateConfigStop: (id: number, body: UpdateConfigStopBody) =>
    request<{ stop: ConfigStop }>(`/config/stops/${id}`, {
      method: 'PUT',
      body: JSON.stringify(body),
    }),
  removeConfigStop: (id: number) => request<void>(`/config/stops/${id}`, { method: 'DELETE' }),
};
