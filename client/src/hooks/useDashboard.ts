import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { DashboardData, Activity, SearchResult, NetworkData } from '@/types';

export function useDashboard() {
  return useQuery({
    queryKey: ['dashboard'],
    queryFn: () => api.get<DashboardData>('/dashboard'),
  });
}

export function useActivities(params?: Record<string, string>) {
  return useQuery({
    queryKey: ['activities', params],
    queryFn: () => api.get<{ records: Activity[] }>('/activities', params),
    select: (data) => data.records,
  });
}

export function useSearch(query: string) {
  return useQuery({
    queryKey: ['search', query],
    queryFn: () => api.get<{ results: SearchResult[] }>('/search', { q: query }),
    select: (data) => data.results,
    enabled: query.length > 0,
  });
}

export function useNetwork(params?: Record<string, string>) {
  return useQuery({
    queryKey: ['network', params],
    queryFn: () => api.get<NetworkData>('/relationships/network', params),
  });
}
