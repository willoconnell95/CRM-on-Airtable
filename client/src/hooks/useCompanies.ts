import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { Company } from '@/types';

export function useCompanies(params?: Record<string, string>) {
  return useQuery({
    queryKey: ['companies', params],
    queryFn: () => api.get<{ records: Company[] }>('/companies', params),
    select: (data) => data.records,
  });
}

export function useCompany(id: string | undefined) {
  return useQuery({
    queryKey: ['companies', id],
    queryFn: () => api.get<Company>(`/companies/${id}`),
    enabled: !!id,
  });
}

export function useCreateCompany() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Company>) => api.post<Company>('/companies', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['companies'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useUpdateCompany() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: Partial<Company> & { id: string }) =>
      api.patch<Company>(`/companies/${id}`, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['companies'] });
      queryClient.invalidateQueries({ queryKey: ['companies', variables.id] });
    },
  });
}

export function useDeleteCompany() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/companies/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['companies'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}
