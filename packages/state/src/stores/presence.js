import { create } from 'zustand';
/**
 * Zustand v5 presence store.
 * Holds user presence information.
 * TODO: wire selectors and actions in S05.
 */
export const usePresenceStore = create(() => ({
    presenceMap: {},
}));
