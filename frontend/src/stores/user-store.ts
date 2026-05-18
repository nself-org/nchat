/**
 * User Store - Manages user-related state for the nself-chat application
 *
 * Handles user profiles, presence, status, and user-related operations
 */

import { create } from "zustand";
import { devtools } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";

// ============================================================================
// Types
// ============================================================================

export type UserRole = "owner" | "admin" | "moderator" | "member" | "guest";

export type PresenceStatus =
  | "online"
  | "away"
  | "dnd"
  | "invisible"
  | "offline";

export interface CustomStatus {
  emoji?: string;
  text?: string;
  expiresAt?: Date | null;
}

export interface UserProfile {
  id: string;
  email: string;
  username: string;
  displayName: string;
  avatarUrl?: string;
  coverUrl?: string;
  bio?: string;
  location?: string;
  website?: string;
  pronouns?: string;
  role: UserRole;
  presence: PresenceStatus;
  customStatus?: CustomStatus;
  createdAt: Date;
  lastSeenAt?: Date;
}

export interface UserState {
  // Current user
  currentUser: UserProfile | null;

  // All cached users (for quick lookups)
  users: Record<string, UserProfile>;

  // Presence map (userId -> presence)
  presenceMap: Record<string, PresenceStatus>;

  // Status map (userId -> customStatus)
  statusMap: Record<string, CustomStatus>;

  // Currently viewing profile
  viewingUserId: string | null;

  // Search/filter state
  searchQuery: string;
  roleFilter: UserRole | "all";
  presenceFilter: PresenceStatus | "all";

  // Loading states
  isLoadingProfile: boolean;
  isUpdatingProfile: boolean;
  isUpdatingStatus: boolean;
  isUpdatingPresence: boolean;
}

export interface UserActions {
  // Profile actions
  setCurrentUser: (user: UserProfile | null) => void;
  updateCurrentUser: (updates: Partial<UserProfile>) => void;

  // User cache actions
  setUser: (user: UserProfile) => void;
  setUsers: (users: UserProfile[]) => void;
  removeUser: (userId: string) => void;
  getUser: (userId: string) => UserProfile | undefined;

  // Presence actions
  setPresence: (userId: string, presence: PresenceStatus) => void;
  setMyPresence: (presence: PresenceStatus) => void;

  // Status actions
  setCustomStatus: (userId: string, status: CustomStatus) => void;
  setMyCustomStatus: (status: CustomStatus) => void;
  clearMyCustomStatus: () => void;

  // View actions
  setViewingUser: (userId: string | null) => void;

  // Search/filter actions
  setSearchQuery: (query: string) => void;
  setRoleFilter: (role: UserRole | "all") => void;
  setPresenceFilter: (presence: PresenceStatus | "all") => void;
  clearFilters: () => void;

  // Loading actions
  setLoadingProfile: (loading: boolean) => void;
  setUpdatingProfile: (updating: boolean) => void;
  setUpdatingStatus: (updating: boolean) => void;
  setUpdatingPresence: (updating: boolean) => void;

  // Utility actions
  reset: () => void;
}

export type UserStore = UserState & UserActions;

// ============================================================================
// Initial State
// ============================================================================

const initialState: UserState = {
  currentUser: null,
  users: {},
  presenceMap: {},
  statusMap: {},
  viewingUserId: null,
  searchQuery: "",
  roleFilter: "all",
  presenceFilter: "all",
  isLoadingProfile: false,
  isUpdatingProfile: false,
  isUpdatingStatus: false,
  isUpdatingPresence: false,
};

// ============================================================================
// Store
// ============================================================================

export const useUserStore = create<UserStore>()(
  devtools(
    immer((set, get) => ({
      ...initialState,

      // Profile actions
      setCurrentUser: (user) =>
        set(
          (state) => {
            state.currentUser = user;
            if (user) {
              state.users[user.id] = user;
              state.presenceMap[user.id] = user.presence;
              if (user.customStatus) {
                state.statusMap[user.id] = user.customStatus;
              }
            }
          },
          false,
          "user/setCurrentUser",
        ),

      updateCurrentUser: (updates) =>
        set(
          (state) => {
            if (state.currentUser) {
              state.currentUser = { ...state.currentUser, ...updates };
              state.users[state.currentUser.id] = state.currentUser;
            }
          },
          false,
          "user/updateCurrentUser",
        ),

      // User cache actions
      setUser: (user) =>
        set(
          (state) => {
            state.users[user.id] = user;
            state.presenceMap[user.id] = user.presence;
            if (user.customStatus) {
              state.statusMap[user.id] = user.customStatus;
            }
          },
          false,
          "user/setUser",
        ),

      setUsers: (users) =>
        set(
          (state) => {
            users.forEach((user) => {
              state.users[user.id] = user;
              state.presenceMap[user.id] = user.presence;
              if (user.customStatus) {
                state.statusMap[user.id] = user.customStatus;
              }
            });
          },
          false,
          "user/setUsers",
        ),

      removeUser: (userId) =>
        set(
          (state) => {
            delete state.users[userId];
            delete state.presenceMap[userId];
            delete state.statusMap[userId];
          },
          false,
          "user/removeUser",
        ),

      getUser: (userId) => get().users[userId],

      // Presence actions
      setPresence: (userId, presence) =>
        set(
          (state) => {
            state.presenceMap[userId] = presence;
            if (state.users[userId]) {
              state.users[userId].presence = presence;
            }
          },
          false,
          "user/setPresence",
        ),

      setMyPresence: (presence) =>
        set(
          (state) => {
            if (state.currentUser) {
              state.currentUser.presence = presence;
              state.presenceMap[state.currentUser.id] = presence;
              state.users[state.currentUser.id] = state.currentUser;
            }
          },
          false,
          "user/setMyPresence",
        ),

      // Status actions
      setCustomStatus: (userId, status) =>
        set(
          (state) => {
            state.statusMap[userId] = status;
            if (state.users[userId]) {
              state.users[userId].customStatus = status;
            }
          },
          false,
          "user/setCustomStatus",
        ),

      setMyCustomStatus: (status) =>
        set(
          (state) => {
            if (state.currentUser) {
              state.currentUser.customStatus = status;
              state.statusMap[state.currentUser.id] = status;
              state.users[state.currentUser.id] = state.currentUser;
            }
          },
          false,
          "user/setMyCustomStatus",
        ),

      clearMyCustomStatus: () =>
        set(
          (state) => {
            if (state.currentUser) {
              state.currentUser.customStatus = undefined;
              delete state.statusMap[state.currentUser.id];
              state.users[state.currentUser.id] = state.currentUser;
            }
          },
          false,
          "user/clearMyCustomStatus",
        ),

      // View actions
      setViewingUser: (userId) =>
        set(
          (state) => {
            state.viewingUserId = userId;
          },
          false,
          "user/setViewingUser",
        ),

      // Search/filter actions
      setSearchQuery: (query) =>
        set(
          (state) => {
            state.searchQuery = query;
          },
          false,
          "user/setSearchQuery",
        ),

      setRoleFilter: (role) =>
        set(
          (state) => {
            state.roleFilter = role;
          },
          false,
          "user/setRoleFilter",
        ),

      setPresenceFilter: (presence) =>
        set(
          (state) => {
            state.presenceFilter = presence;
          },
          false,
          "user/setPresenceFilter",
        ),

      clearFilters: () =>
        set(
          (state) => {
            state.searchQuery = "";
            state.roleFilter = "all";
            state.presenceFilter = "all";
          },
          false,
          "user/clearFilters",
        ),

      // Loading actions
      setLoadingProfile: (loading) =>
        set(
          (state) => {
            state.isLoadingProfile = loading;
          },
          false,
          "user/setLoadingProfile",
        ),

      setUpdatingProfile: (updating) =>
        set(
          (state) => {
            state.isUpdatingProfile = updating;
          },
          false,
          "user/setUpdatingProfile",
        ),

      setUpdatingStatus: (updating) =>
        set(
          (state) => {
            state.isUpdatingStatus = updating;
          },
          false,
          "user/setUpdatingStatus",
        ),

      setUpdatingPresence: (updating) =>
        set(
          (state) => {
            state.isUpdatingPresence = updating;
          },
          false,
          "user/setUpdatingPresence",
        ),

      // Utility actions
      reset: () => set(() => initialState, false, "user/reset"),
    })),
    { name: "user-store" },
  ),
);

// ============================================================================
// Selectors
// ============================================================================

export const selectCurrentUser = (state: UserStore) => state.currentUser;

export const selectUserById = (userId: string) => (state: UserStore) =>
  state.users[userId];

export const selectPresence = (userId: string) => (state: UserStore) =>
  state.presenceMap[userId] ?? "offline";

export const selectCustomStatus = (userId: string) => (state: UserStore) =>
  state.statusMap[userId];

export const selectAllUsers = (state: UserStore) => Object.values(state.users);

export const selectFilteredUsers = (state: UserStore) => {
  let users = Object.values(state.users);

  // Apply search filter
  if (state.searchQuery) {
    const query = state.searchQuery.toLowerCase();
    users = users.filter(
      (user) =>
        user.displayName.toLowerCase().includes(query) ||
        user.username.toLowerCase().includes(query) ||
        user.email.toLowerCase().includes(query),
    );
  }

  // Apply role filter
  if (state.roleFilter !== "all") {
    users = users.filter((user) => user.role === state.roleFilter);
  }

  // Apply presence filter
  if (state.presenceFilter !== "all") {
    users = users.filter((user) => user.presence === state.presenceFilter);
  }

  return users;
};

export const selectOnlineUsers = (state: UserStore) =>
  Object.values(state.users).filter((user) => user.presence === "online");

export const selectOfflineUsers = (state: UserStore) =>
  Object.values(state.users).filter((user) => user.presence === "offline");

export const selectUsersByRole = (role: UserRole) => (state: UserStore) =>
  Object.values(state.users).filter((user) => user.role === role);

// ============================================================================
// Helper functions
// ============================================================================

export const getInitials = (displayName: string): string => {
  if (!displayName) return "?";

  const names = displayName.trim().split(/\s+/);
  if (names.length === 1) {
    return names[0].charAt(0).toUpperCase();
  }

  return (names[0].charAt(0) + names[names.length - 1].charAt(0)).toUpperCase();
};

export const getRoleColor = (role: UserRole): string => {
  switch (role) {
    case "owner":
      return "#F59E0B"; // amber
    case "admin":
      return "#EF4444"; // red
    case "moderator":
      return "#8B5CF6"; // purple
    case "member":
      return "#3B82F6"; // blue
    case "guest":
      return "#6B7280"; // gray
    default:
      return "#6B7280";
  }
};

export const getRoleLabel = (role: UserRole): string => {
  switch (role) {
    case "owner":
      return "Owner";
    case "admin":
      return "Admin";
    case "moderator":
      return "Moderator";
    case "member":
      return "Member";
    case "guest":
      return "Guest";
    default:
      return "Unknown";
  }
};

export const getPresenceColor = (presence: PresenceStatus): string => {
  switch (presence) {
    case "online":
      return "#22C55E"; // green
    case "away":
      return "#F59E0B"; // amber/yellow
    case "dnd":
      return "#EF4444"; // red
    case "offline":
      return "#6B7280"; // gray
    default:
      return "#6B7280";
  }
};

export const getPresenceLabel = (presence: PresenceStatus): string => {
  switch (presence) {
    case "online":
      return "Online";
    case "away":
      return "Away";
    case "dnd":
      return "Do Not Disturb";
    case "offline":
      return "Offline";
    default:
      return "Unknown";
  }
};
