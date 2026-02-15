import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { Interaction } from '@/types';

export function useInteractions(params?: Record<string, string>) {
  return useQuery({
    queryKey: ['interactions', params],
    queryFn: () => api.get<{ records: Interaction[] }>('/interactions', params),
    select: (data) => data.records,
  });
}

export function useCreateInteraction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Interaction>) =>
      api.post<Interaction>('/interactions', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['interactions'] });
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      queryClient.invalidateQueries({ queryKey: ['activities'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useUpdateInteraction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: Partial<Interaction> & { id: string }) =>
      api.patch<Interaction>(`/interactions/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['interactions'] });
    },
  });
}

export function useDeleteInteraction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/interactions/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['interactions'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}
