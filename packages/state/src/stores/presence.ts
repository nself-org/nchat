import { create } from 'zustand';

/** Presence status for a user. */
export type PresenceStatus = 'online' | 'away' | 'dnd' | 'offline';

/** Presence entry for a single user. */
export interface PresenceEntry {
  userId: string;
  status: PresenceStatus;
  lastSeen: string | null;
}

/** Presence state shape for the @nself-chat/state presence store. */
export interface PresenceState {
  /** Map of userId → PresenceEntry for all tracked users. */
  presenceMap: Record<string, PresenceEntry>;
}

/**
 * Zustand v5 presence store.
 * Holds user presence information.
 * TODO: wire selectors and actions in S05.
 */
export const usePresenceStore = create<PresenceState>(() => ({
  presenceMap: {},
}));
