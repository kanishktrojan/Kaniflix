import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { authService } from '@/services';
import type { User, LoginCredentials } from '@/types';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean; // For initial auth check only
  isLoginPending: boolean; // For login/signup operations
  error: string | null;
}

interface AuthActions {
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
  updateUser: (user: Partial<User>) => void;
  setUser: (user: User) => void;
  clearError: () => void;
  setLoading: (loading: boolean) => void;
}

type AuthStore = AuthState & AuthActions;

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      // Initial state
      user: null,
      isAuthenticated: false,
      isLoading: true, // Only for initial auth check
      isLoginPending: false, // For login/signup operations
      error: null,

      // Actions
      login: async (credentials) => {
        set({ isLoginPending: true, error: null });
        try {
          const { user } = await authService.login(credentials);
          set({ user, isAuthenticated: true, isLoginPending: false });
        } catch (error: unknown) {
          const message = error instanceof Error ? error.message : 'Login failed';
          set({ error: message, isLoginPending: false });
          throw error;
        }
      },

      logout: async () => {
        try {
          await authService.logout();
        } finally {
          set({ user: null, isAuthenticated: false, error: null });
        }
      },

      checkAuth: async () => {
        if (!authService.hasToken()) {
          set({ isLoading: false, isAuthenticated: false });
          return;
        }

        set({ isLoading: true });
        try {
          const { user } = await authService.checkAuth();
          set({ user, isAuthenticated: true, isLoading: false });
        } catch {
          set({ user: null, isAuthenticated: false, isLoading: false });
        }
      },

      updateUser: (updates) => {
        const { user } = get();
        if (user) {
          set({ user: { ...user, ...updates } });
        }
      },

      setUser: (user) => {
        set({ user, isAuthenticated: true, isLoading: false, error: null });
      },

      clearError: () => set({ error: null }),

      setLoading: (loading) => set({ isLoading: loading }),
    }),
    {
      name: 'kaniflix-auth',
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
