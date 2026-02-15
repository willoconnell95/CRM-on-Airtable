import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { SyncedEmail, EmailStatus } from '@/types';

export function useEmailStatus() {
  return useQuery({
    queryKey: ['email-status'],
    queryFn: () => api.get<EmailStatus>('/email/status'),
  });
}

export function useConnectEmail() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { provider: string; email: string; password: string; host?: string; port?: number }) =>
      api.post<{ success: boolean; message: string; email: string }>('/email/connect', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email-status'] });
    },
  });
}

export function useDisconnectEmail() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => api.post<{ success: boolean }>('/email/disconnect'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email-status'] });
      queryClient.invalidateQueries({ queryKey: ['synced-emails'] });
    },
  });
}

export function useSyncEmails() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data?: { limit?: number; sinceDays?: number }) =>
      api.post<{ emails: SyncedEmail[]; count: number }>('/email/sync', data || {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['synced-emails'] });
    },
  });
}

export function useImportContact() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; email: string; source?: string }) =>
      api.post<{ contact: any; alreadyExisted: boolean }>('/email/import-contact', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
    },
  });
}

export function useLogEmailInteraction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { subject: string; date: string; from: string; to: string[]; snippet: string; sentiment: string; contactIds?: string[] }) =>
      api.post('/email/log-interaction', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['interactions'] });
      queryClient.invalidateQueries({ queryKey: ['activities'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useBulkImportEmails() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { emails: SyncedEmail[] }) =>
      api.post<{ success: boolean; contactsCreated: number; contactsExisted: number; interactionsLogged: number }>('/email/bulk-import', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      queryClient.invalidateQueries({ queryKey: ['interactions'] });
      queryClient.invalidateQueries({ queryKey: ['activities'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useCreateDealFromInteraction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { interactionId?: string; Name: string; Stage?: string; Value?: number; Probability?: number; 'Close Date'?: string; Description?: string; Contacts?: string[]; Company?: string[] }) =>
      api.post('/deals/from-interaction', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deals'] });
      queryClient.invalidateQueries({ queryKey: ['pipeline'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}
