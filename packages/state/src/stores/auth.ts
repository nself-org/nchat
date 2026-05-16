import { create } from 'zustand';

/** Auth state shape for the @nself-chat/state auth store. */
export interface AuthState {
  /** Currently authenticated user, or null when signed out. */
  user: { id: string; email: string; displayName: string } | null;
  /** Whether a valid session is active. */
  isAuthenticated: boolean;
}

/**
 * Zustand v5 auth store.
 * Holds session user + authentication flag.
 * TODO: wire selectors and actions in S05.
 */
export const useAuthStore = create<AuthState>(() => ({
  user: null,
  isAuthenticated: false,
}));
