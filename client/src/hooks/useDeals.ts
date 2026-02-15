import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { Deal, PipelineData } from '@/types';

export function useDeals(params?: Record<string, string>) {
  return useQuery({
    queryKey: ['deals', params],
    queryFn: () => api.get<{ records: Deal[] }>('/deals', params),
    select: (data) => data.records,
  });
}

export function useDeal(id: string | undefined) {
  return useQuery({
    queryKey: ['deals', id],
    queryFn: () => api.get<Deal>(`/deals/${id}`),
    enabled: !!id,
  });
}

export function usePipeline(params?: Record<string, string>) {
  return useQuery({
    queryKey: ['pipeline', params],
    queryFn: () => api.get<PipelineData>('/deals/pipeline', params),
  });
}

export function useCreateDeal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Deal>) => api.post<Deal>('/deals', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deals'] });
      queryClient.invalidateQueries({ queryKey: ['pipeline'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useUpdateDeal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: Partial<Deal> & { id: string }) =>
      api.patch<Deal>(`/deals/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deals'] });
      queryClient.invalidateQueries({ queryKey: ['pipeline'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useDeleteDeal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/deals/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deals'] });
      queryClient.invalidateQueries({ queryKey: ['pipeline'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}
