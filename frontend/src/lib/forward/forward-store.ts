/**
 * Forward Store - Manages message forwarding state for nself-chat
 *
 * Handles forward destinations, recent forwards, and forwarding operations
 */

import { create } from "zustand";
import { devtools, persist } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";

// ============================================================================
// Types
// ============================================================================

export type DestinationType = "channel" | "direct" | "group";

export interface ForwardDestination {
  id: string;
  name: string;
  type: DestinationType;
  icon?: string;
  avatarUrl?: string;
  slug?: string;
  isPrivate?: boolean;
  /** For DMs: the other user(s) in the conversation */
  members?: Array<{
    id: string;
    displayName: string;
    avatarUrl?: string;
  }>;
  /** Last activity timestamp */
  lastActivityAt?: string;
}

export interface ForwardMessage {
  id: string;
  content: string;
  type: string;
  createdAt: string;
  channelId: string;
  channelName?: string;
  user: {
    id: string;
    displayName: string;
    username: string;
    avatarUrl?: string;
  };
  attachments?: Array<{
    id: string;
    fileName: string;
    fileType: string;
    fileUrl: string;
    thumbnailUrl?: string;
  }>;
}

export interface ForwardRequest {
  message: ForwardMessage;
  destinations: ForwardDestination[];
  comment?: string;
}

export interface ForwardResult {
  destinationId: string;
  destinationName: string;
  success: boolean;
  messageId?: string;
  error?: string;
}

export interface ForwardState {
  // Modal state
  isOpen: boolean;
  messageToForward: ForwardMessage | null;

  // Selection state
  selectedDestinations: ForwardDestination[];
  comment: string;

  // Recent destinations (persisted)
  recentDestinations: ForwardDestination[];

  // Forward in progress
  isForwarding: boolean;
  forwardResults: ForwardResult[];

  // Search
  searchQuery: string;
}

export interface ForwardActions {
  // Modal actions
  openForwardModal: (message: ForwardMessage) => void;
  closeForwardModal: () => void;

  // Selection actions
  toggleDestination: (destination: ForwardDestination) => void;
  selectDestination: (destination: ForwardDestination) => void;
  deselectDestination: (destinationId: string) => void;
  clearSelectedDestinations: () => void;
  setComment: (comment: string) => void;

  // Recent destinations
  addRecentDestination: (destination: ForwardDestination) => void;
  removeRecentDestination: (destinationId: string) => void;
  clearRecentDestinations: () => void;

  // Forward execution
  setIsForwarding: (isForwarding: boolean) => void;
  setForwardResults: (results: ForwardResult[]) => void;
  addForwardResult: (result: ForwardResult) => void;
  clearForwardResults: () => void;

  // Search
  setSearchQuery: (query: string) => void;

  // Utility
  reset: () => void;
}

export type ForwardStore = ForwardState & ForwardActions;

// ============================================================================
// Constants
// ============================================================================

const MAX_RECENT_DESTINATIONS = 10;
const MAX_SELECTED_DESTINATIONS = 10;

// ============================================================================
// Initial State
// ============================================================================

const initialState: ForwardState = {
  isOpen: false,
  messageToForward: null,
  selectedDestinations: [],
  comment: "",
  recentDestinations: [],
  isForwarding: false,
  forwardResults: [],
  searchQuery: "",
};

// ============================================================================
// Store
// ============================================================================

export const useForwardStore = create<ForwardStore>()(
  devtools(
    persist(
      immer((set, get) => ({
        ...initialState,

        // Modal actions
        openForwardModal: (message) =>
          set(
            (state) => {
              state.isOpen = true;
              state.messageToForward = message;
              state.selectedDestinations = [];
              state.comment = "";
              state.forwardResults = [];
              state.searchQuery = "";
            },
            false,
            "forward/openModal",
          ),

        closeForwardModal: () =>
          set(
            (state) => {
              state.isOpen = false;
              state.messageToForward = null;
              state.selectedDestinations = [];
              state.comment = "";
              state.forwardResults = [];
              state.searchQuery = "";
            },
            false,
            "forward/closeModal",
          ),

        // Selection actions
        toggleDestination: (destination) =>
          set(
            (state) => {
              const index = state.selectedDestinations.findIndex(
                (d) => d.id === destination.id,
              );
              if (index >= 0) {
                state.selectedDestinations.splice(index, 1);
              } else if (
                state.selectedDestinations.length < MAX_SELECTED_DESTINATIONS
              ) {
                state.selectedDestinations.push(destination);
              }
            },
            false,
            "forward/toggleDestination",
          ),

        selectDestination: (destination) =>
          set(
            (state) => {
              const exists = state.selectedDestinations.some(
                (d) => d.id === destination.id,
              );
              if (
                !exists &&
                state.selectedDestinations.length < MAX_SELECTED_DESTINATIONS
              ) {
                state.selectedDestinations.push(destination);
              }
            },
            false,
            "forward/selectDestination",
          ),

        deselectDestination: (destinationId) =>
          set(
            (state) => {
              const index = state.selectedDestinations.findIndex(
                (d) => d.id === destinationId,
              );
              if (index >= 0) {
                state.selectedDestinations.splice(index, 1);
              }
            },
            false,
            "forward/deselectDestination",
          ),

        clearSelectedDestinations: () =>
          set(
            (state) => {
              state.selectedDestinations = [];
            },
            false,
            "forward/clearSelectedDestinations",
          ),

        setComment: (comment) =>
          set(
            (state) => {
              state.comment = comment;
            },
            false,
            "forward/setComment",
          ),

        // Recent destinations
        addRecentDestination: (destination) =>
          set(
            (state) => {
              // Remove if already exists
              const index = state.recentDestinations.findIndex(
                (d) => d.id === destination.id,
              );
              if (index >= 0) {
                state.recentDestinations.splice(index, 1);
              }
              // Add to front
              state.recentDestinations.unshift(destination);
              // Trim to max
              if (state.recentDestinations.length > MAX_RECENT_DESTINATIONS) {
                state.recentDestinations = state.recentDestinations.slice(
                  0,
                  MAX_RECENT_DESTINATIONS,
                );
              }
            },
            false,
            "forward/addRecentDestination",
          ),

        removeRecentDestination: (destinationId) =>
          set(
            (state) => {
              const index = state.recentDestinations.findIndex(
                (d) => d.id === destinationId,
              );
              if (index >= 0) {
                state.recentDestinations.splice(index, 1);
              }
            },
            false,
            "forward/removeRecentDestination",
          ),

        clearRecentDestinations: () =>
          set(
            (state) => {
              state.recentDestinations = [];
            },
            false,
            "forward/clearRecentDestinations",
          ),

        // Forward execution
        setIsForwarding: (isForwarding) =>
          set(
            (state) => {
              state.isForwarding = isForwarding;
            },
            false,
            "forward/setIsForwarding",
          ),

        setForwardResults: (results) =>
          set(
            (state) => {
              state.forwardResults = results;
            },
            false,
            "forward/setForwardResults",
          ),

        addForwardResult: (result) =>
          set(
            (state) => {
              state.forwardResults.push(result);
            },
            false,
            "forward/addForwardResult",
          ),

        clearForwardResults: () =>
          set(
            (state) => {
              state.forwardResults = [];
            },
            false,
            "forward/clearForwardResults",
          ),

        // Search
        setSearchQuery: (query) =>
          set(
            (state) => {
              state.searchQuery = query;
            },
            false,
            "forward/setSearchQuery",
          ),

        // Utility
        reset: () =>
          set(
            (state) => {
              // Reset everything except recentDestinations (persisted)
              state.isOpen = false;
              state.messageToForward = null;
              state.selectedDestinations = [];
              state.comment = "";
              state.isForwarding = false;
              state.forwardResults = [];
              state.searchQuery = "";
            },
            false,
            "forward/reset",
          ),
      })),
      {
        name: "nchat-forward-store",
        // Only persist recentDestinations
        partialize: (state) => ({
          recentDestinations: state.recentDestinations,
        }),
      },
    ),
    { name: "forward-store" },
  ),
);

// ============================================================================
// Selectors
// ============================================================================

export const selectIsOpen = (state: ForwardStore) => state.isOpen;

export const selectMessageToForward = (state: ForwardStore) =>
  state.messageToForward;

export const selectSelectedDestinations = (state: ForwardStore) =>
  state.selectedDestinations;

export const selectSelectedCount = (state: ForwardStore) =>
  state.selectedDestinations.length;

export const selectIsDestinationSelected =
  (destinationId: string) => (state: ForwardStore) =>
    state.selectedDestinations.some((d) => d.id === destinationId);

export const selectComment = (state: ForwardStore) => state.comment;

export const selectRecentDestinations = (state: ForwardStore) =>
  state.recentDestinations;

export const selectIsForwarding = (state: ForwardStore) => state.isForwarding;

export const selectForwardResults = (state: ForwardStore) =>
  state.forwardResults;

export const selectHasSuccessfulForwards = (state: ForwardStore) =>
  state.forwardResults.some((r) => r.success);

export const selectHasFailedForwards = (state: ForwardStore) =>
  state.forwardResults.some((r) => !r.success);

export const selectSearchQuery = (state: ForwardStore) => state.searchQuery;

export const selectCanForward = (state: ForwardStore) =>
  state.selectedDestinations.length > 0 &&
  state.messageToForward !== null &&
  !state.isForwarding;
