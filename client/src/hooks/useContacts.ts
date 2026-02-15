import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { Contact } from '@/types';

export function useContacts(params?: Record<string, string>) {
  return useQuery({
    queryKey: ['contacts', params],
    queryFn: () => api.get<{ records: Contact[] }>('/contacts', params),
    select: (data) => data.records,
  });
}

export function useContact(id: string | undefined) {
  return useQuery({
    queryKey: ['contacts', id],
    queryFn: () => api.get<Contact>(`/contacts/${id}`),
    enabled: !!id,
  });
}

export function useCreateContact() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Contact>) => api.post<Contact>('/contacts', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      queryClient.invalidateQueries({ queryKey: ['activities'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useUpdateContact() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: Partial<Contact> & { id: string }) =>
      api.patch<Contact>(`/contacts/${id}`, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      queryClient.invalidateQueries({ queryKey: ['contacts', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['activities'] });
    },
  });
}

export function useDeleteContact() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/contacts/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useBulkImportContacts() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (contacts: any[]) =>
      api.post<{ created: number }>('/contacts/bulk-import', { contacts }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useEnrichContact() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.post(`/contacts/${id}/enrich`),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['contacts', id] });
    },
  });
}
