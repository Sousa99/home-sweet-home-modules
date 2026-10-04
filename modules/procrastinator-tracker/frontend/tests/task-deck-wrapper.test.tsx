import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TaskDeckWrapper } from '../src/components/task/TaskDeckWrapper';
import { sampleTasks } from '../src/components/task/TaskDeck.fixtures';
import type { Task } from '../src/api/client';
import { api } from '../src/api/client';

vi.mock('../src/api/client', () => ({
  api: {
    listTasks: vi.fn(),
  },
}));

const { taskDeckPropsSpy } = vi.hoisted(() => ({ taskDeckPropsSpy: vi.fn() }));

vi.mock('../src/components/task/TaskDeck', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../src/components/task/TaskDeck')>();
  const React = await import('react');
  return {
    ...actual,
    TaskDeck: (props: React.ComponentProps<typeof actual.TaskDeck>) => {
      taskDeckPropsSpy(props);
      return React.createElement(actual.TaskDeck, props);
    },
  };
});

describe('TaskDeckWrapper', () => {
  let nowSpy: ReturnType<typeof vi.spyOn> | undefined;

  beforeEach(() => {
    vi.mocked(api.listTasks).mockReset();
    taskDeckPropsSpy.mockClear();
  });

  afterEach(() => {
    nowSpy?.mockRestore();
    nowSpy = undefined;
    vi.useRealTimers();
  });

  it('fetches tasks on mount and renders the deck', async () => {
    const dataSource = vi.fn().mockResolvedValue(sampleTasks);
    render(<TaskDeckWrapper dataSource={dataSource} refreshRateMs={0} autoRotateMs={0} />);
    expect(await screen.findByText('Implement MCP tools')).toBeInTheDocument();
    expect(dataSource).toHaveBeenCalledTimes(1);
  });

  it('passes filters to the data source', async () => {
    const dataSource = vi.fn().mockResolvedValue(sampleTasks);
    render(
      <TaskDeckWrapper
        filters={{ status: 'in-progress' }}
        dataSource={dataSource}
        refreshRateMs={0}
        autoRotateMs={0}
      />,
    );
    await screen.findByText('Implement MCP tools');
    expect(dataSource).toHaveBeenCalledWith({ status: 'in-progress' });
  });

  it('shows an empty state when no tasks match', async () => {
    const dataSource = vi.fn().mockResolvedValue([]);
    render(<TaskDeckWrapper dataSource={dataSource} refreshRateMs={0} autoRotateMs={0} />);
    expect(await screen.findByText(/No tasks yet/i)).toBeInTheDocument();
  });

  it('renders the shared TaskDeckEmpty card when the data source resolves empty', async () => {
    const dataSource = vi.fn().mockResolvedValue([]);
    render(<TaskDeckWrapper dataSource={dataSource} refreshRateMs={0} autoRotateMs={0} />);
    const empty = await screen.findByTestId('task-deck-empty');
    expect(empty).toBeInTheDocument();
    expect(empty).toHaveTextContent(/No tasks yet/i);
  });

  it('defaults the transitionVariant to slide when not provided', async () => {
    const dataSource = vi.fn().mockResolvedValue(sampleTasks);
    render(<TaskDeckWrapper dataSource={dataSource} refreshRateMs={0} autoRotateMs={0} />);
    await screen.findByText('Implement MCP tools');
    expect(taskDeckPropsSpy).toHaveBeenCalledWith(
      expect.objectContaining({ transitionVariant: 'slide' }),
    );
  });

  it('forwards the transitionVariant to the inner TaskDeck', async () => {
    const dataSource = vi.fn().mockResolvedValue(sampleTasks);
    render(
      <TaskDeckWrapper
        dataSource={dataSource}
        refreshRateMs={0}
        autoRotateMs={0}
        transitionVariant="slide-up"
      />,
    );
    await screen.findByText('Implement MCP tools');
    expect(taskDeckPropsSpy).toHaveBeenCalledWith(
      expect.objectContaining({ transitionVariant: 'slide-up' }),
    );
  });

  it('shows an error state when the data source rejects', async () => {
    const dataSource = vi.fn().mockRejectedValue(new Error('boom'));
    render(<TaskDeckWrapper dataSource={dataSource} refreshRateMs={0} autoRotateMs={0} />);
    expect(await screen.findByText(/boom/i)).toBeInTheDocument();
  });

  it('refetches on the refresh interval', async () => {
    vi.useFakeTimers();
    const dataSource = vi.fn().mockResolvedValue(sampleTasks);
    render(<TaskDeckWrapper dataSource={dataSource} refreshRateMs={1000} autoRotateMs={0} />);
    await vi.advanceTimersByTimeAsync(0);
    await Promise.resolve();
    expect(dataSource).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1000);
    expect(dataSource).toHaveBeenCalledTimes(2);
  });

  it('never overlaps an in-flight request', async () => {
    vi.useFakeTimers();
    let resolveFirst!: (tasks: Task[]) => void;
    const dataSource = vi
      .fn()
      .mockImplementation(() => new Promise<Task[]>((resolve) => (resolveFirst = resolve)));
    render(<TaskDeckWrapper dataSource={dataSource} refreshRateMs={1000} autoRotateMs={0} />);
    await vi.advanceTimersByTimeAsync(0);
    expect(dataSource).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(2000);
    expect(dataSource).toHaveBeenCalledTimes(1);
    resolveFirst(sampleTasks);
    await Promise.resolve();
    await vi.advanceTimersByTimeAsync(1000);
    expect(dataSource).toHaveBeenCalledTimes(2);
  });

  it('clears the interval on unmount', async () => {
    vi.useFakeTimers();
    const dataSource = vi.fn().mockResolvedValue(sampleTasks);
    const { unmount } = render(
      <TaskDeckWrapper dataSource={dataSource} refreshRateMs={1000} autoRotateMs={0} />,
    );
    await vi.advanceTimersByTimeAsync(0);
    expect(dataSource).toHaveBeenCalledTimes(1);
    unmount();
    await vi.advanceTimersByTimeAsync(3000);
    expect(dataSource).toHaveBeenCalledTimes(1);
  });

  it('fetches once when refreshRateMs is 0', async () => {
    vi.useFakeTimers();
    const dataSource = vi.fn().mockResolvedValue(sampleTasks);
    render(<TaskDeckWrapper dataSource={dataSource} refreshRateMs={0} autoRotateMs={0} />);
    await vi.advanceTimersByTimeAsync(5000);
    expect(dataSource).toHaveBeenCalledTimes(1);
  });

  it('passes the baseUrl prop through to the default data source', async () => {
    vi.mocked(api.listTasks).mockResolvedValue(sampleTasks);
    render(
      <TaskDeckWrapper baseUrl="https://api.example.com" refreshRateMs={0} autoRotateMs={0} />,
    );
    expect(await screen.findByText('Implement MCP tools')).toBeInTheDocument();
    expect(api.listTasks).toHaveBeenCalledWith({}, 'https://api.example.com');
  });

  it('defaults the data source to the same-origin API when baseUrl is omitted', async () => {
    vi.mocked(api.listTasks).mockResolvedValue(sampleTasks);
    render(<TaskDeckWrapper refreshRateMs={0} autoRotateMs={0} />);
    expect(await screen.findByText('Implement MCP tools')).toBeInTheDocument();
    expect(api.listTasks).toHaveBeenCalledWith({}, undefined);
  });

  it('keeps the dataSource override precedence over the baseUrl prop', async () => {
    const dataSource = vi.fn().mockResolvedValue(sampleTasks);
    render(
      <TaskDeckWrapper
        baseUrl="https://api.example.com"
        dataSource={dataSource}
        refreshRateMs={0}
        autoRotateMs={0}
      />,
    );
    expect(await screen.findByText('Implement MCP tools')).toBeInTheDocument();
    expect(dataSource).toHaveBeenCalledTimes(1);
    expect(api.listTasks).not.toHaveBeenCalled();
  });

  it('shows the standardized status bar with the last update time after a successful load', async () => {
    const dataSource = vi.fn().mockResolvedValue(sampleTasks);
    render(<TaskDeckWrapper dataSource={dataSource} refreshRateMs={0} autoRotateMs={0} />);
    await screen.findByText('Implement MCP tools');

    expect(
      screen.getByText(/Last updated \d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Refresh' })).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveAttribute('aria-live', 'polite');
  });

  it('shows "Not updated yet" before the first load completes', async () => {
    const dataSource = vi.fn().mockImplementation(() => new Promise<Task[]>(() => {}));
    render(<TaskDeckWrapper dataSource={dataSource} refreshRateMs={0} autoRotateMs={0} />);

    expect(screen.getByText('Not updated yet')).toBeInTheDocument();
    expect(
      screen.queryByText(/Last updated \d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/),
    ).not.toBeInTheDocument();
  });

  it('pressing Refresh reloads the deck and advances the last-updated time', async () => {
    const t0 = new Date(2026, 9, 4, 14, 0, 0).getTime();
    const t1 = new Date(2026, 9, 4, 14, 0, 5).getTime();
    nowSpy = vi.spyOn(Date, 'now').mockReturnValue(t0);
    const dataSource = vi.fn().mockResolvedValue(sampleTasks);
    render(<TaskDeckWrapper dataSource={dataSource} refreshRateMs={0} autoRotateMs={0} />);
    await screen.findByText('Implement MCP tools');
    expect(dataSource).toHaveBeenCalledTimes(1);
    expect(screen.getByText(/Last updated 2026-10-04 14:00:00 .+/)).toBeInTheDocument();

    nowSpy.mockReturnValue(t1);
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: 'Refresh' }));
    await waitFor(() => expect(dataSource).toHaveBeenCalledTimes(2));
    expect(screen.queryByText(/Last updated 2026-10-04 14:00:00 .+/)).not.toBeInTheDocument();
    expect(screen.getByText(/Last updated 2026-10-04 14:00:05 .+/)).toBeInTheDocument();
  });

  it('shows the updating indicator while a refresh is in flight and clears it after', async () => {
    const user = userEvent.setup();
    let resolveRefresh!: (tasks: Task[]) => void;
    const dataSource = vi
      .fn()
      .mockResolvedValueOnce(sampleTasks)
      .mockImplementationOnce(
        () =>
          new Promise<Task[]>((resolve) => {
            resolveRefresh = resolve;
          }),
      );
    render(<TaskDeckWrapper dataSource={dataSource} refreshRateMs={0} autoRotateMs={0} />);
    await screen.findByText('Implement MCP tools');

    await user.click(screen.getByRole('button', { name: 'Refresh' }));
    expect(await screen.findByText('Updating…')).toBeInTheDocument();

    await act(async () => {
      resolveRefresh(sampleTasks);
    });
    await waitFor(() => expect(screen.queryByText('Updating…')).not.toBeInTheDocument());
  });

  it('keeps the previous last-updated time and surfaces an error when a refresh fails', async () => {
    const user = userEvent.setup();
    const dataSource = vi
      .fn()
      .mockResolvedValueOnce(sampleTasks)
      .mockRejectedValueOnce(new Error('boom'));
    render(<TaskDeckWrapper dataSource={dataSource} refreshRateMs={0} autoRotateMs={0} />);
    await screen.findByText('Implement MCP tools');
    const time = screen.getByText(/Last updated \d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/)
      .textContent as string;

    await user.click(screen.getByRole('button', { name: 'Refresh' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('boom');
    expect(screen.getByText(time)).toBeInTheDocument();
    expect(screen.getByText('Implement MCP tools')).toBeInTheDocument();
  });

  it('recovers via Refresh after a failure', async () => {
    const user = userEvent.setup();
    const dataSource = vi
      .fn()
      .mockRejectedValueOnce(new Error('boom'))
      .mockResolvedValueOnce(sampleTasks);
    render(<TaskDeckWrapper dataSource={dataSource} refreshRateMs={0} autoRotateMs={0} />);
    expect(await screen.findByRole('alert')).toHaveTextContent('boom');
    expect(screen.getByText('Not updated yet')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Refresh' }));
    expect(await screen.findByText('Implement MCP tools')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(
      screen.getByText(/Last updated \d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/),
    ).toBeInTheDocument();
  });
});
