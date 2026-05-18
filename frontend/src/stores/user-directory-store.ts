/**
 * User Directory Store
 *
 * Zustand store for managing user directory state including filtering,
 * searching, and viewing user profiles.
 */

import { create } from "zustand";
import { devtools } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";
import { type UserRole, type PresenceStatus } from "./user-store";
import { type ExtendedUserProfile } from "@/components/users/UserCard";
import { type Contact, type BlockedUser } from "@/lib/users/user-privacy";

// ============================================================================
// Types
// ============================================================================

export type ViewMode = "grid" | "list" | "org-chart";
export type SortField =
  | "displayName"
  | "username"
  | "role"
  | "presence"
  | "lastSeen";
export type SortDirection = "asc" | "desc";

export interface UserDirectoryState {
  // View settings
  viewMode: ViewMode;
  sortField: SortField;
  sortDirection: SortDirection;

  // Search
  searchQuery: string;
  isSearching: boolean;
  searchHistory: string[];

  // Filters
  roleFilter: UserRole | "all";
  presenceFilter: PresenceStatus | "all";
  departmentFilter: string;
  teamFilter: string;
  locationFilter: string;

  // Selected user
  selectedUserId: string | null;
  viewingProfileId: string | null;

  // Contacts and blocked users
  contacts: Contact[];
  blockedUsers: BlockedUser[];

  // Loading states
  isLoadingDirectory: boolean;
  isLoadingProfile: boolean;
  isUpdatingContact: boolean;
  isUpdatingBlock: boolean;

  // Error states
  directoryError: string | null;
  profileError: string | null;
}

export interface UserDirectoryActions {
  // View settings
  setViewMode: (mode: ViewMode) => void;
  setSortField: (field: SortField) => void;
  setSortDirection: (direction: SortDirection) => void;
  toggleSortDirection: () => void;

  // Search
  setSearchQuery: (query: string) => void;
  setIsSearching: (searching: boolean) => void;
  addToSearchHistory: (query: string) => void;
  clearSearchHistory: () => void;

  // Filters
  setRoleFilter: (role: UserRole | "all") => void;
  setPresenceFilter: (presence: PresenceStatus | "all") => void;
  setDepartmentFilter: (department: string) => void;
  setTeamFilter: (team: string) => void;
  setLocationFilter: (location: string) => void;
  clearFilters: () => void;
  hasActiveFilters: () => boolean;

  // Selection
  selectUser: (userId: string | null) => void;
  viewProfile: (userId: string | null) => void;

  // Contacts
  setContacts: (contacts: Contact[]) => void;
  addContact: (contact: Contact) => void;
  removeContact: (userId: string) => void;
  isUserContact: (userId: string) => boolean;

  // Blocked users
  setBlockedUsers: (users: BlockedUser[]) => void;
  addBlockedUser: (user: BlockedUser) => void;
  removeBlockedUser: (userId: string) => void;
  isUserBlocked: (userId: string) => boolean;

  // Loading states
  setLoadingDirectory: (loading: boolean) => void;
  setLoadingProfile: (loading: boolean) => void;
  setUpdatingContact: (updating: boolean) => void;
  setUpdatingBlock: (updating: boolean) => void;

  // Errors
  setDirectoryError: (error: string | null) => void;
  setProfileError: (error: string | null) => void;

  // Reset
  reset: () => void;
}

export type UserDirectoryStore = UserDirectoryState & UserDirectoryActions;

// ============================================================================
// Initial State
// ============================================================================

const initialState: UserDirectoryState = {
  viewMode: "grid",
  sortField: "displayName",
  sortDirection: "asc",

  searchQuery: "",
  isSearching: false,
  searchHistory: [],

  roleFilter: "all",
  presenceFilter: "all",
  departmentFilter: "all",
  teamFilter: "all",
  locationFilter: "all",

  selectedUserId: null,
  viewingProfileId: null,

  contacts: [],
  blockedUsers: [],

  isLoadingDirectory: false,
  isLoadingProfile: false,
  isUpdatingContact: false,
  isUpdatingBlock: false,

  directoryError: null,
  profileError: null,
};

// ============================================================================
// Store
// ============================================================================

export const useUserDirectoryStore = create<UserDirectoryStore>()(
  devtools(
    immer((set, get) => ({
      ...initialState,

      // View settings
      setViewMode: (mode) =>
        set(
          (state) => {
            state.viewMode = mode;
          },
          false,
          "directory/setViewMode",
        ),

      setSortField: (field) =>
        set(
          (state) => {
            state.sortField = field;
          },
          false,
          "directory/setSortField",
        ),

      setSortDirection: (direction) =>
        set(
          (state) => {
            state.sortDirection = direction;
          },
          false,
          "directory/setSortDirection",
        ),

      toggleSortDirection: () =>
        set(
          (state) => {
            state.sortDirection =
              state.sortDirection === "asc" ? "desc" : "asc";
          },
          false,
          "directory/toggleSortDirection",
        ),

      // Search
      setSearchQuery: (query) =>
        set(
          (state) => {
            state.searchQuery = query;
          },
          false,
          "directory/setSearchQuery",
        ),

      setIsSearching: (searching) =>
        set(
          (state) => {
            state.isSearching = searching;
          },
          false,
          "directory/setIsSearching",
        ),

      addToSearchHistory: (query) =>
        set(
          (state) => {
            if (query.trim() && !state.searchHistory.includes(query)) {
              state.searchHistory = [query, ...state.searchHistory].slice(
                0,
                10,
              );
            }
          },
          false,
          "directory/addToSearchHistory",
        ),

      clearSearchHistory: () =>
        set(
          (state) => {
            state.searchHistory = [];
          },
          false,
          "directory/clearSearchHistory",
        ),

      // Filters
      setRoleFilter: (role) =>
        set(
          (state) => {
            state.roleFilter = role;
          },
          false,
          "directory/setRoleFilter",
        ),

      setPresenceFilter: (presence) =>
        set(
          (state) => {
            state.presenceFilter = presence;
          },
          false,
          "directory/setPresenceFilter",
        ),

      setDepartmentFilter: (department) =>
        set(
          (state) => {
            state.departmentFilter = department;
          },
          false,
          "directory/setDepartmentFilter",
        ),

      setTeamFilter: (team) =>
        set(
          (state) => {
            state.teamFilter = team;
          },
          false,
          "directory/setTeamFilter",
        ),

      setLocationFilter: (location) =>
        set(
          (state) => {
            state.locationFilter = location;
          },
          false,
          "directory/setLocationFilter",
        ),

      clearFilters: () =>
        set(
          (state) => {
            state.searchQuery = "";
            state.roleFilter = "all";
            state.presenceFilter = "all";
            state.departmentFilter = "all";
            state.teamFilter = "all";
            state.locationFilter = "all";
          },
          false,
          "directory/clearFilters",
        ),

      hasActiveFilters: () => {
        const state = get();
        return (
          state.searchQuery !== "" ||
          state.roleFilter !== "all" ||
          state.presenceFilter !== "all" ||
          state.departmentFilter !== "all" ||
          state.teamFilter !== "all" ||
          state.locationFilter !== "all"
        );
      },

      // Selection
      selectUser: (userId) =>
        set(
          (state) => {
            state.selectedUserId = userId;
          },
          false,
          "directory/selectUser",
        ),

      viewProfile: (userId) =>
        set(
          (state) => {
            state.viewingProfileId = userId;
          },
          false,
          "directory/viewProfile",
        ),

      // Contacts
      setContacts: (contacts) =>
        set(
          (state) => {
            state.contacts = contacts;
          },
          false,
          "directory/setContacts",
        ),

      addContact: (contact) =>
        set(
          (state) => {
            if (!state.contacts.some((c) => c.userId === contact.userId)) {
              state.contacts.push(contact);
            }
          },
          false,
          "directory/addContact",
        ),

      removeContact: (userId) =>
        set(
          (state) => {
            state.contacts = state.contacts.filter((c) => c.userId !== userId);
          },
          false,
          "directory/removeContact",
        ),

      isUserContact: (userId) => {
        return get().contacts.some((c) => c.userId === userId);
      },

      // Blocked users
      setBlockedUsers: (users) =>
        set(
          (state) => {
            state.blockedUsers = users;
          },
          false,
          "directory/setBlockedUsers",
        ),

      addBlockedUser: (user) =>
        set(
          (state) => {
            if (!state.blockedUsers.some((b) => b.userId === user.userId)) {
              state.blockedUsers.push(user);
            }
          },
          false,
          "directory/addBlockedUser",
        ),

      removeBlockedUser: (userId) =>
        set(
          (state) => {
            state.blockedUsers = state.blockedUsers.filter(
              (b) => b.userId !== userId,
            );
          },
          false,
          "directory/removeBlockedUser",
        ),

      isUserBlocked: (userId) => {
        return get().blockedUsers.some((b) => b.userId === userId);
      },

      // Loading states
      setLoadingDirectory: (loading) =>
        set(
          (state) => {
            state.isLoadingDirectory = loading;
          },
          false,
          "directory/setLoadingDirectory",
        ),

      setLoadingProfile: (loading) =>
        set(
          (state) => {
            state.isLoadingProfile = loading;
          },
          false,
          "directory/setLoadingProfile",
        ),

      setUpdatingContact: (updating) =>
        set(
          (state) => {
            state.isUpdatingContact = updating;
          },
          false,
          "directory/setUpdatingContact",
        ),

      setUpdatingBlock: (updating) =>
        set(
          (state) => {
            state.isUpdatingBlock = updating;
          },
          false,
          "directory/setUpdatingBlock",
        ),

      // Errors
      setDirectoryError: (error) =>
        set(
          (state) => {
            state.directoryError = error;
          },
          false,
          "directory/setDirectoryError",
        ),

      setProfileError: (error) =>
        set(
          (state) => {
            state.profileError = error;
          },
          false,
          "directory/setProfileError",
        ),

      // Reset
      reset: () => set(() => initialState, false, "directory/reset"),
    })),
    { name: "user-directory-store" },
  ),
);

// ============================================================================
// Selectors
// ============================================================================

export const selectViewMode = (state: UserDirectoryStore) => state.viewMode;
export const selectSearchQuery = (state: UserDirectoryStore) =>
  state.searchQuery;
export const selectIsSearching = (state: UserDirectoryStore) =>
  state.isSearching;
export const selectRoleFilter = (state: UserDirectoryStore) => state.roleFilter;
export const selectPresenceFilter = (state: UserDirectoryStore) =>
  state.presenceFilter;
export const selectSelectedUserId = (state: UserDirectoryStore) =>
  state.selectedUserId;
export const selectViewingProfileId = (state: UserDirectoryStore) =>
  state.viewingProfileId;
export const selectContacts = (state: UserDirectoryStore) => state.contacts;
export const selectBlockedUsers = (state: UserDirectoryStore) =>
  state.blockedUsers;
export const selectIsLoadingDirectory = (state: UserDirectoryStore) =>
  state.isLoadingDirectory;
export const selectIsLoadingProfile = (state: UserDirectoryStore) =>
  state.isLoadingProfile;
export const selectDirectoryError = (state: UserDirectoryStore) =>
  state.directoryError;

// Computed selectors
export const selectActiveFilterCount = (state: UserDirectoryStore) => {
  let count = 0;
  if (state.searchQuery) count++;
  if (state.roleFilter !== "all") count++;
  if (state.presenceFilter !== "all") count++;
  if (state.departmentFilter !== "all") count++;
  if (state.teamFilter !== "all") count++;
  if (state.locationFilter !== "all") count++;
  return count;
};

export const selectSortConfig = (state: UserDirectoryStore) => ({
  field: state.sortField,
  direction: state.sortDirection,
});
