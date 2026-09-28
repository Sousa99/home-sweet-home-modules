import { render, screen } from '@testing-library/react';
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

describe('TaskDeckWrapper', () => {
  beforeEach(() => {
    vi.mocked(api.listTasks).mockReset();
  });

  afterEach(() => {
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
});
