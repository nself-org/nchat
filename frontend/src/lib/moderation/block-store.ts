/**
 * Block Store - Manages user blocking state for the nself-chat application
 *
 * Handles blocked users list, blocking/unblocking users, and checking block status
 */

import { create } from "zustand";
import { devtools, persist } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";

// ============================================================================
// Types
// ============================================================================

export interface BlockedUser {
  id: string;
  userId: string;
  blockedUserId: string;
  blockedUser: {
    id: string;
    username: string;
    displayName: string;
    avatarUrl?: string;
  };
  createdAt: string;
}

export interface BlockSettings {
  hideBlockedMessages: boolean;
  preventDMs: boolean;
  hideFromMemberList: boolean;
}

// ============================================================================
// State Interface
// ============================================================================

export interface BlockState {
  // Blocked users list
  blockedUsers: BlockedUser[];
  blockedUserIds: Set<string>;
  isLoading: boolean;
  error: string | null;

  // Settings
  settings: BlockSettings;

  // Modal state
  blockModalOpen: boolean;
  blockModalTarget: {
    userId: string;
    username: string;
    displayName: string;
    avatarUrl?: string;
  } | null;

  // Confirmation state
  isBlocking: boolean;
  isUnblocking: boolean;
}

// ============================================================================
// Actions Interface
// ============================================================================

export interface BlockActions {
  // Block list actions
  setBlockedUsers: (users: BlockedUser[]) => void;
  addBlockedUser: (user: BlockedUser) => void;
  removeBlockedUser: (blockedUserId: string) => void;
  clearBlockedUsers: () => void;

  // Loading and error
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;

  // Block status checks
  isUserBlocked: (userId: string) => boolean;
  getBlockedUser: (userId: string) => BlockedUser | undefined;

  // Settings
  updateSettings: (settings: Partial<BlockSettings>) => void;

  // Modal actions
  openBlockModal: (user: {
    userId: string;
    username: string;
    displayName: string;
    avatarUrl?: string;
  }) => void;
  closeBlockModal: () => void;

  // Action state
  setBlocking: (blocking: boolean) => void;
  setUnblocking: (unblocking: boolean) => void;

  // Utility
  reset: () => void;
}

export type BlockStore = BlockState & BlockActions;

// ============================================================================
// Initial State
// ============================================================================

const defaultSettings: BlockSettings = {
  hideBlockedMessages: true,
  preventDMs: true,
  hideFromMemberList: false,
};

const initialState: BlockState = {
  blockedUsers: [],
  blockedUserIds: new Set(),
  isLoading: false,
  error: null,
  settings: defaultSettings,
  blockModalOpen: false,
  blockModalTarget: null,
  isBlocking: false,
  isUnblocking: false,
};

// ============================================================================
// Store
// ============================================================================

export const useBlockStore = create<BlockStore>()(
  devtools(
    persist(
      immer((set, get) => ({
        ...initialState,

        // Block list actions
        setBlockedUsers: (users) =>
          set(
            (state) => {
              state.blockedUsers = users;
              state.blockedUserIds = new Set(users.map((u) => u.blockedUserId));
            },
            false,
            "block/setBlockedUsers",
          ),

        addBlockedUser: (user) =>
          set(
            (state) => {
              // Check if already blocked
              if (!state.blockedUserIds.has(user.blockedUserId)) {
                state.blockedUsers.unshift(user);
                state.blockedUserIds.add(user.blockedUserId);
              }
            },
            false,
            "block/addBlockedUser",
          ),

        removeBlockedUser: (blockedUserId) =>
          set(
            (state) => {
              state.blockedUsers = state.blockedUsers.filter(
                (u) => u.blockedUserId !== blockedUserId,
              );
              state.blockedUserIds.delete(blockedUserId);
            },
            false,
            "block/removeBlockedUser",
          ),

        clearBlockedUsers: () =>
          set(
            (state) => {
              state.blockedUsers = [];
              state.blockedUserIds = new Set();
            },
            false,
            "block/clearBlockedUsers",
          ),

        // Loading and error
        setLoading: (loading) =>
          set(
            (state) => {
              state.isLoading = loading;
            },
            false,
            "block/setLoading",
          ),

        setError: (error) =>
          set(
            (state) => {
              state.error = error;
            },
            false,
            "block/setError",
          ),

        // Block status checks
        isUserBlocked: (userId) => {
          return get().blockedUserIds.has(userId);
        },

        getBlockedUser: (userId) => {
          return get().blockedUsers.find((u) => u.blockedUserId === userId);
        },

        // Settings
        updateSettings: (settings) =>
          set(
            (state) => {
              state.settings = { ...state.settings, ...settings };
            },
            false,
            "block/updateSettings",
          ),

        // Modal actions
        openBlockModal: (user) =>
          set(
            (state) => {
              state.blockModalOpen = true;
              state.blockModalTarget = user;
            },
            false,
            "block/openBlockModal",
          ),

        closeBlockModal: () =>
          set(
            (state) => {
              state.blockModalOpen = false;
              state.blockModalTarget = null;
            },
            false,
            "block/closeBlockModal",
          ),

        // Action state
        setBlocking: (blocking) =>
          set(
            (state) => {
              state.isBlocking = blocking;
            },
            false,
            "block/setBlocking",
          ),

        setUnblocking: (unblocking) =>
          set(
            (state) => {
              state.isUnblocking = unblocking;
            },
            false,
            "block/setUnblocking",
          ),

        // Utility
        reset: () =>
          set(
            () => ({
              ...initialState,
              blockedUserIds: new Set(),
            }),
            false,
            "block/reset",
          ),
      })),
      {
        name: "nchat-block-store",
        partialize: (state) => ({
          settings: state.settings,
        }),
      },
    ),
    { name: "block-store" },
  ),
);

// ============================================================================
// Selectors
// ============================================================================

export const selectBlockedUsers = (state: BlockStore) => state.blockedUsers;

export const selectBlockedUserIds = (state: BlockStore) => state.blockedUserIds;

export const selectBlockSettings = (state: BlockStore) => state.settings;

export const selectIsLoading = (state: BlockStore) => state.isLoading;

export const selectError = (state: BlockStore) => state.error;

export const selectBlockModal = (state: BlockStore) => ({
  isOpen: state.blockModalOpen,
  target: state.blockModalTarget,
});

export const selectBlockedCount = (state: BlockStore) =>
  state.blockedUsers.length;

export const selectIsBlocking = (state: BlockStore) => state.isBlocking;

export const selectIsUnblocking = (state: BlockStore) => state.isUnblocking;

// Helper to check if should hide content from a user
export const selectShouldHideContent =
  (state: BlockStore) => (userId: string) =>
    state.settings.hideBlockedMessages && state.blockedUserIds.has(userId);

// Helper to check if should prevent DM
export const selectShouldPreventDM = (state: BlockStore) => (userId: string) =>
  state.settings.preventDMs && state.blockedUserIds.has(userId);

// Helper to check if should hide from member list
export const selectShouldHideFromList =
  (state: BlockStore) => (userId: string) =>
    state.settings.hideFromMemberList && state.blockedUserIds.has(userId);
