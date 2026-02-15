import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { PipelineStage } from '@/types';

interface StagesResponse {
  stages: PipelineStage[];
  source: 'airtable' | 'defaults';
}

export function useStages() {
  return useQuery({
    queryKey: ['pipeline-stages'],
    queryFn: () => api.get<StagesResponse>('/settings/stages'),
    staleTime: 5 * 60 * 1000, // cache for 5 min since stages change rarely
    select: (data) => data.stages,
  });
}

export function useSeedStages() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => api.post<{ message: string; stages: PipelineStage[] }>('/settings/stages/seed'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pipeline-stages'] });
    },
  });
}
