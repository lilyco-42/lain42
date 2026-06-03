import { create } from "zustand";
import { api } from "@/lib/api";
import type { User } from "@/types";

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  oauthLogin: (provider: string, code: string) => Promise<void>;
  passwordLogin: (email: string, password: string) => Promise<void>;
  register: (username: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  fetchMe: () => Promise<void>;
}

function saveAndFetch(set: any, data: { access_token: string; refresh_token: string }) {
  localStorage.setItem("access_token", data.access_token);
  localStorage.setItem("refresh_token", data.refresh_token);
  useAuthStore.getState().fetchMe();
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,

  oauthLogin: async (provider: string, code: string) => {
    const data = await api.post<{ access_token: string; refresh_token: string }>(
      "/auth/login",
      { provider, code }
    );
    saveAndFetch(set, data);
  },

  passwordLogin: async (email: string, password: string) => {
    const data = await api.post<{ access_token: string; refresh_token: string }>(
      "/auth/password-login",
      { email, password }
    );
    saveAndFetch(set, data);
  },

  register: async (username: string, email: string, password: string) => {
    const data = await api.post<{ access_token: string; refresh_token: string }>(
      "/auth/register",
      { username, email, password }
    );
    saveAndFetch(set, data);
  },

  logout: () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    set({ user: null, isAuthenticated: false });
  },

  fetchMe: async () => {
    try {
      const user = await api.get<User>("/auth/me");
      set({ user, isAuthenticated: true, isLoading: false });
    } catch {
      set({ user: null, isAuthenticated: false, isLoading: false });
    }
  },
}));
