import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from './client';

export function useSearchStops(q: string) {
  return useQuery({
    queryKey: ['stops', q],
    queryFn: () => api.searchStops(q),
    enabled: q.length >= 2,
    staleTime: 60_000,
  });
}

export function useStop(id: string | null) {
  return useQuery({
    queryKey: ['stop', id],
    queryFn: () => api.getStop(id as string),
    enabled: id !== null,
  });
}

export function useLines() {
  return useQuery({
    queryKey: ['lines'],
    queryFn: api.listLines,
  });
}

export function useConfig() {
  return useQuery({
    queryKey: ['config'],
    queryFn: api.getConfig,
  });
}

export function useAddStop() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: api.addConfigStop,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['config'] });
    },
  });
}

export function useStopTimes(stopId: string, limit = 5, lines?: string[], enabled = true) {
  return useQuery({
    queryKey: ['stop-times', stopId, limit, lines?.join(',') ?? ''],
    queryFn: () => api.getStopTimes(stopId, limit, lines),
    enabled,
    refetchInterval: enabled ? 15_000 : false,
  });
}

export function useStatus() {
  return useQuery({
    queryKey: ['status'],
    queryFn: api.getStatus,
    refetchInterval: 15_000,
  });
}

export function useRefresh() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: api.refreshSchedule,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['status'] });
    },
  });
}

export function useUpdateStop() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: number; body: Parameters<typeof api.updateConfigStop>[1] }) =>
      api.updateConfigStop(id, body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['config'] });
    },
  });
}

export function useRemoveStop() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.removeConfigStop(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['config'] });
    },
  });
}
