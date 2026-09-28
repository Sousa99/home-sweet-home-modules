import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { api } from '../src/api/client';
import { configureApiBaseUrl } from '../src/api/baseUrl';

function okJson(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('api client base URL', () => {
  beforeEach(() => {
    configureApiBaseUrl(undefined);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('targets the same-origin /api path when no base URL is given', async () => {
    const fetchMock = vi.fn(async () => okJson([]));
    vi.stubGlobal('fetch', fetchMock);

    await api.listTasks();

    expect(fetchMock).toHaveBeenCalledWith('/api/tasks', expect.anything());
  });

  it('prepends a passed base URL to the request path', async () => {
    const fetchMock = vi.fn(async () => okJson([]));
    vi.stubGlobal('fetch', fetchMock);

    await api.listTasks({}, 'https://api.example.com');

    expect(fetchMock).toHaveBeenCalledWith('https://api.example.com/api/tasks', expect.anything());
  });

  it('keeps query strings when a base URL is passed', async () => {
    const fetchMock = vi.fn(async () => okJson([]));
    vi.stubGlobal('fetch', fetchMock);

    await api.listTasks({ status: 'in-progress' }, 'https://api.example.com');

    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.example.com/api/tasks?status=in-progress',
      expect.anything(),
    );
  });

  it('uses the module-configured base URL when no per-call base URL is given', async () => {
    configureApiBaseUrl('https://env.example.com');
    const fetchMock = vi.fn(async () => okJson([]));
    vi.stubGlobal('fetch', fetchMock);

    await api.listTasks();

    expect(fetchMock).toHaveBeenCalledWith('https://env.example.com/api/tasks', expect.anything());
  });

  it('prepends the base URL for mutating requests with a JSON body', async () => {
    const fetchMock = vi.fn(async () => okJson({ id: 1 }));
    vi.stubGlobal('fetch', fetchMock);

    await api.createTask({ title: 'Water the plants' }, 'https://api.example.com');

    expect(fetchMock).toHaveBeenCalledWith('https://api.example.com/api/tasks', {
      headers: { 'Content-Type': 'application/json' },
      method: 'POST',
      body: JSON.stringify({ title: 'Water the plants' }),
    });
  });

  it('prepends the base URL for nested paths', async () => {
    const fetchMock = vi.fn(async () => okJson({ id: 1 }));
    vi.stubGlobal('fetch', fetchMock);

    await api.setStatus(1, 'started', 'https://api.example.com');

    expect(fetchMock).toHaveBeenCalledWith('https://api.example.com/api/tasks/1/status', {
      headers: { 'Content-Type': 'application/json' },
      method: 'POST',
      body: JSON.stringify({ status: 'started' }),
    });
  });
});
