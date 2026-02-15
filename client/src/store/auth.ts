import { create } from 'zustand';
import { api } from '@/lib/api';
import type { User } from '@/types';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  checkAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: !!localStorage.getItem('crm_token'),
  isLoading: true,

  login: async (email: string, password: string) => {
    const res = await api.post<{ token: string; user: User }>('/auth/login', {
      email,
      password,
    });
    api.setToken(res.token);
    set({ user: res.user, isAuthenticated: true });
  },

  register: async (name: string, email: string, password: string) => {
    const res = await api.post<{ token: string; user: User }>('/auth/register', {
      name,
      email,
      password,
    });
    api.setToken(res.token);
    set({ user: res.user, isAuthenticated: true });
  },

  logout: () => {
    api.setToken(null);
    set({ user: null, isAuthenticated: false });
  },

  checkAuth: async () => {
    try {
      if (!api.getToken()) {
        set({ isLoading: false, isAuthenticated: false });
        return;
      }
      const user = await api.get<User>('/auth/me');
      set({ user, isAuthenticated: true, isLoading: false });
    } catch {
      set({ user: null, isAuthenticated: false, isLoading: false });
    }
  },
}));
