/**
 * Pinned Messages Store
 *
 * Zustand store for managing pinned messages state.
 */

import { create } from "zustand";
import { devtools, subscribeWithSelector } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";
import type {
  PinnedMessage,
  PinConfig,
  PinFilters,
  PinSortBy,
  PinSortOrder,
  ChannelPinStats,
} from "@/lib/pinned";
import {
  DEFAULT_PIN_CONFIG,
  filterPinnedMessages,
  sortPinnedMessages,
  calculatePinStats,
} from "@/lib/pinned";

// ============================================================================
// Types
// ============================================================================

export interface PinnedState {
  // Pinned messages by channel
  pinnedByChannel: Map<string, PinnedMessage[]>;

  // Channel configurations
  channelConfigs: Map<string, PinConfig>;

  // Current channel (for panel)
  activeChannelId: string | null;

  // Panel state
  isPanelOpen: boolean;
  isConfirmUnpinOpen: boolean;
  pinToUnpin: PinnedMessage | null;

  // Filters & sorting
  filters: PinFilters;
  sortBy: PinSortBy;
  sortOrder: PinSortOrder;

  // Loading states
  isLoading: boolean;
  isLoadingChannel: string | null;
  isPinning: boolean;
  isUnpinning: boolean;
  error: string | null;

  // Pagination
  hasMore: boolean;
  cursor: number;
}

export interface PinnedActions {
  // Pinned message operations
  setPinnedMessages: (channelId: string, messages: PinnedMessage[]) => void;
  addPinnedMessage: (channelId: string, message: PinnedMessage) => void;
  removePinnedMessage: (channelId: string, messageId: string) => void;
  updatePinnedMessage: (
    channelId: string,
    pinId: string,
    updates: Partial<PinnedMessage>,
  ) => void;
  reorderPinnedMessages: (channelId: string, pinIds: string[]) => void;
  clearChannelPins: (channelId: string) => void;

  // Get operations
  getPinnedMessages: (channelId: string) => PinnedMessage[];
  getPinnedMessage: (
    channelId: string,
    messageId: string,
  ) => PinnedMessage | undefined;
  isMessagePinned: (channelId: string, messageId: string) => boolean;
  getChannelPinStats: (channelId: string) => ChannelPinStats;
  getFilteredPinnedMessages: (channelId: string) => PinnedMessage[];

  // Configuration
  setChannelConfig: (channelId: string, config: Partial<PinConfig>) => void;
  getChannelConfig: (channelId: string) => PinConfig;

  // Panel state
  setActiveChannel: (channelId: string | null) => void;
  openPanel: (channelId?: string) => void;
  closePanel: () => void;
  togglePanel: () => void;

  // Unpin confirmation
  openUnpinConfirm: (pin: PinnedMessage) => void;
  closeUnpinConfirm: () => void;

  // Filters & sorting
  setFilters: (filters: Partial<PinFilters>) => void;
  clearFilters: () => void;
  setSortBy: (sortBy: PinSortBy) => void;
  setSortOrder: (sortOrder: PinSortOrder) => void;

  // Loading/error
  setLoading: (loading: boolean) => void;
  setLoadingChannel: (channelId: string | null) => void;
  setPinning: (pinning: boolean) => void;
  setUnpinning: (unpinning: boolean) => void;
  setError: (error: string | null) => void;

  // Pagination
  setHasMore: (hasMore: boolean) => void;
  setCursor: (cursor: number) => void;

  // Utility
  resetStore: () => void;
}

export type PinnedStore = PinnedState & PinnedActions;

// ============================================================================
// Initial State
// ============================================================================

const initialState: PinnedState = {
  pinnedByChannel: new Map(),
  channelConfigs: new Map(),
  activeChannelId: null,
  isPanelOpen: false,
  isConfirmUnpinOpen: false,
  pinToUnpin: null,
  filters: {},
  sortBy: "position",
  sortOrder: "asc",
  isLoading: false,
  isLoadingChannel: null,
  isPinning: false,
  isUnpinning: false,
  error: null,
  hasMore: false,
  cursor: 0,
};

// ============================================================================
// Store
// ============================================================================

export const usePinnedStore = create<PinnedStore>()(
  devtools(
    subscribeWithSelector(
      immer((set, get) => ({
        ...initialState,

        // Pinned message operations
        setPinnedMessages: (channelId, messages) =>
          set(
            (state) => {
              state.pinnedByChannel.set(channelId, messages);
            },
            false,
            "pinned/setPinnedMessages",
          ),

        addPinnedMessage: (channelId, message) =>
          set(
            (state) => {
              const existing = state.pinnedByChannel.get(channelId) ?? [];
              state.pinnedByChannel.set(channelId, [...existing, message]);
            },
            false,
            "pinned/addPinnedMessage",
          ),

        removePinnedMessage: (channelId, messageId) =>
          set(
            (state) => {
              const existing = state.pinnedByChannel.get(channelId) ?? [];
              state.pinnedByChannel.set(
                channelId,
                existing.filter((p) => p.messageId !== messageId),
              );
            },
            false,
            "pinned/removePinnedMessage",
          ),

        updatePinnedMessage: (channelId, pinId, updates) =>
          set(
            (state) => {
              const existing = state.pinnedByChannel.get(channelId) ?? [];
              const index = existing.findIndex((p) => p.id === pinId);
              if (index !== -1) {
                existing[index] = { ...existing[index], ...updates };
                state.pinnedByChannel.set(channelId, existing);
              }
            },
            false,
            "pinned/updatePinnedMessage",
          ),

        reorderPinnedMessages: (channelId, pinIds) =>
          set(
            (state) => {
              const existing = state.pinnedByChannel.get(channelId) ?? [];
              const pinMap = new Map(existing.map((p) => [p.id, p]));

              const reordered = pinIds
                .map((id, index) => {
                  const pin = pinMap.get(id);
                  if (pin) {
                    return { ...pin, position: index };
                  }
                  return null;
                })
                .filter((p): p is PinnedMessage => p !== null);

              state.pinnedByChannel.set(channelId, reordered);
            },
            false,
            "pinned/reorderPinnedMessages",
          ),

        clearChannelPins: (channelId) =>
          set(
            (state) => {
              state.pinnedByChannel.delete(channelId);
            },
            false,
            "pinned/clearChannelPins",
          ),

        // Get operations
        getPinnedMessages: (channelId) => {
          return get().pinnedByChannel.get(channelId) ?? [];
        },

        getPinnedMessage: (channelId, messageId) => {
          const pins = get().pinnedByChannel.get(channelId) ?? [];
          return pins.find((p) => p.messageId === messageId);
        },

        isMessagePinned: (channelId, messageId) => {
          const pins = get().pinnedByChannel.get(channelId) ?? [];
          return pins.some((p) => p.messageId === messageId);
        },

        getChannelPinStats: (channelId) => {
          const pins = get().pinnedByChannel.get(channelId) ?? [];
          const config = get().getChannelConfig(channelId);
          return calculatePinStats(pins, channelId, config.maxPins);
        },

        getFilteredPinnedMessages: (channelId) => {
          const state = get();
          let pins = state.pinnedByChannel.get(channelId) ?? [];

          // Apply filters
          if (Object.keys(state.filters).length > 0) {
            pins = filterPinnedMessages(pins, state.filters);
          }

          // Apply sorting
          pins = sortPinnedMessages(pins, state.sortBy, state.sortOrder);

          return pins;
        },

        // Configuration
        setChannelConfig: (channelId, config) =>
          set(
            (state) => {
              const existing = state.channelConfigs.get(channelId) ?? {
                ...DEFAULT_PIN_CONFIG,
              };
              state.channelConfigs.set(channelId, { ...existing, ...config });
            },
            false,
            "pinned/setChannelConfig",
          ),

        getChannelConfig: (channelId) => {
          return (
            get().channelConfigs.get(channelId) ?? { ...DEFAULT_PIN_CONFIG }
          );
        },

        // Panel state
        setActiveChannel: (channelId) =>
          set(
            (state) => {
              state.activeChannelId = channelId;
            },
            false,
            "pinned/setActiveChannel",
          ),

        openPanel: (channelId) =>
          set(
            (state) => {
              state.isPanelOpen = true;
              if (channelId) {
                state.activeChannelId = channelId;
              }
            },
            false,
            "pinned/openPanel",
          ),

        closePanel: () =>
          set(
            (state) => {
              state.isPanelOpen = false;
            },
            false,
            "pinned/closePanel",
          ),

        togglePanel: () =>
          set(
            (state) => {
              state.isPanelOpen = !state.isPanelOpen;
            },
            false,
            "pinned/togglePanel",
          ),

        // Unpin confirmation
        openUnpinConfirm: (pin) =>
          set(
            (state) => {
              state.isConfirmUnpinOpen = true;
              state.pinToUnpin = pin;
            },
            false,
            "pinned/openUnpinConfirm",
          ),

        closeUnpinConfirm: () =>
          set(
            (state) => {
              state.isConfirmUnpinOpen = false;
              state.pinToUnpin = null;
            },
            false,
            "pinned/closeUnpinConfirm",
          ),

        // Filters & sorting
        setFilters: (filters) =>
          set(
            (state) => {
              state.filters = { ...state.filters, ...filters };
            },
            false,
            "pinned/setFilters",
          ),

        clearFilters: () =>
          set(
            (state) => {
              state.filters = {};
            },
            false,
            "pinned/clearFilters",
          ),

        setSortBy: (sortBy) =>
          set(
            (state) => {
              state.sortBy = sortBy;
            },
            false,
            "pinned/setSortBy",
          ),

        setSortOrder: (sortOrder) =>
          set(
            (state) => {
              state.sortOrder = sortOrder;
            },
            false,
            "pinned/setSortOrder",
          ),

        // Loading/error
        setLoading: (loading) =>
          set(
            (state) => {
              state.isLoading = loading;
            },
            false,
            "pinned/setLoading",
          ),

        setLoadingChannel: (channelId) =>
          set(
            (state) => {
              state.isLoadingChannel = channelId;
            },
            false,
            "pinned/setLoadingChannel",
          ),

        setPinning: (pinning) =>
          set(
            (state) => {
              state.isPinning = pinning;
            },
            false,
            "pinned/setPinning",
          ),

        setUnpinning: (unpinning) =>
          set(
            (state) => {
              state.isUnpinning = unpinning;
            },
            false,
            "pinned/setUnpinning",
          ),

        setError: (error) =>
          set(
            (state) => {
              state.error = error;
            },
            false,
            "pinned/setError",
          ),

        // Pagination
        setHasMore: (hasMore) =>
          set(
            (state) => {
              state.hasMore = hasMore;
            },
            false,
            "pinned/setHasMore",
          ),

        setCursor: (cursor) =>
          set(
            (state) => {
              state.cursor = cursor;
            },
            false,
            "pinned/setCursor",
          ),

        // Utility
        resetStore: () =>
          set(
            () => ({
              ...initialState,
              pinnedByChannel: new Map(),
              channelConfigs: new Map(),
            }),
            false,
            "pinned/resetStore",
          ),
      })),
    ),
    { name: "pinned-store" },
  ),
);

// ============================================================================
// Selectors
// ============================================================================

export const selectPinnedCount = (channelId: string) => (state: PinnedStore) =>
  (state.pinnedByChannel.get(channelId) ?? []).length;

export const selectHasPinnedMessages =
  (channelId: string) => (state: PinnedStore) =>
    (state.pinnedByChannel.get(channelId) ?? []).length > 0;

export const selectIsPanelOpen = (state: PinnedStore) => state.isPanelOpen;

export const selectIsLoading = (state: PinnedStore) => state.isLoading;

export const selectError = (state: PinnedStore) => state.error;
