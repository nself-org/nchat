import { create } from 'zustand';
/**
 * Zustand v5 auth store.
 * Holds session user + authentication flag.
 * TODO: wire selectors and actions in S05.
 */
export const useAuthStore = create(() => ({
    user: null,
    isAuthenticated: false,
}));
