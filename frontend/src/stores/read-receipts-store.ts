/**
 * Read Receipts Store - Centralized state management for read receipts
 *
 * Handles message read tracking, read receipt display, and group receipt aggregation.
 * Integrates with both GraphQL subscriptions and WebSocket events.
 */

import { create } from "zustand";
import { devtools } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";
import type { MessageUser } from "@/types/message";

// ============================================================================
// Types
// ============================================================================

/**
 * Individual read receipt for a message
 */
export interface ReadReceipt {
  /** User who read the message */
  userId: string;
  /** Message that was read */
  messageId: string;
  /** When the message was read */
  readAt: string;
  /** User details (if available) */
  user?: {
    id: string;
    displayName: string;
    avatarUrl?: string;
    username?: string;
  };
}

/**
 * Channel read status for a user
 */
export interface ChannelReadStatus {
  /** User ID */
  userId: string;
  /** Channel ID */
  channelId: string;
  /** Last read message ID */
  lastReadMessageId?: string;
  /** When the user last read the channel */
  lastReadAt: string;
  /** User details */
  user?: {
    id: string;
    displayName: string;
    avatarUrl?: string;
  };
}

/**
 * Message delivery status
 */
export type DeliveryStatus =
  | "sending"
  | "sent"
  | "delivered"
  | "read"
  | "failed";

/**
 * Message status info combining delivery and read state
 */
export interface MessageStatus {
  /** Current delivery status */
  deliveryStatus: DeliveryStatus;
  /** Users who have read this message */
  readBy: ReadReceipt[];
  /** Total number of recipients (for group chats) */
  totalRecipients?: number;
  /** Whether all recipients have read */
  allRead: boolean;
}

/**
 * Read receipts store state
 */
export interface ReadReceiptsState {
  // Read receipts by message ID
  receiptsByMessage: Record<string, ReadReceipt[]>;

  // Channel read status by channel ID, then by user ID
  channelReadStatus: Record<string, Record<string, ChannelReadStatus>>;

  // Current user's last read message per channel
  myLastReadByChannel: Record<string, string | null>;

  // Delivery status for outgoing messages
  deliveryStatusByMessage: Record<string, DeliveryStatus>;

  // Pending reads to batch
  pendingReads: Set<string>;

  // Loading states
  loadingChannels: Set<string>;
  loadingMessages: Set<string>;

  // Settings
  showReadReceipts: boolean;
  shareReadReceipts: boolean;
}

/**
 * Read receipts store actions
 */
export interface ReadReceiptsActions {
  // Read receipt management
  setReadReceipts: (messageId: string, receipts: ReadReceipt[]) => void;
  addReadReceipt: (receipt: ReadReceipt) => void;
  removeReadReceipts: (messageId: string) => void;
  clearChannelReceipts: (channelId: string) => void;

  // Channel read status
  setChannelReadStatus: (
    channelId: string,
    statuses: ChannelReadStatus[],
  ) => void;
  updateUserReadStatus: (status: ChannelReadStatus) => void;
  setMyLastRead: (channelId: string, messageId: string | null) => void;

  // Delivery status
  setDeliveryStatus: (messageId: string, status: DeliveryStatus) => void;
  bulkSetDeliveryStatus: (updates: Record<string, DeliveryStatus>) => void;

  // Pending reads batching
  addPendingRead: (messageId: string) => void;
  flushPendingReads: () => string[];
  clearPendingReads: () => void;

  // Loading states
  setLoadingChannel: (channelId: string, loading: boolean) => void;
  setLoadingMessage: (messageId: string, loading: boolean) => void;

  // Settings
  setShowReadReceipts: (show: boolean) => void;
  setShareReadReceipts: (share: boolean) => void;

  // Queries
  getReadBy: (messageId: string) => ReadReceipt[];
  getReadCount: (messageId: string) => number;
  hasUserRead: (messageId: string, userId: string) => boolean;
  getMessageStatus: (
    messageId: string,
    totalRecipients?: number,
  ) => MessageStatus;
  getChannelReaders: (channelId: string) => ChannelReadStatus[];
  getWhoReadUpTo: (channelId: string, messageId: string) => ChannelReadStatus[];

  // Utility
  reset: () => void;
}

export type ReadReceiptsStore = ReadReceiptsState & ReadReceiptsActions;

// ============================================================================
// Initial State
// ============================================================================

const initialState: ReadReceiptsState = {
  receiptsByMessage: {},
  channelReadStatus: {},
  myLastReadByChannel: {},
  deliveryStatusByMessage: {},
  pendingReads: new Set(),
  loadingChannels: new Set(),
  loadingMessages: new Set(),
  showReadReceipts: true,
  shareReadReceipts: true,
};

// ============================================================================
// Store
// ============================================================================

export const useReadReceiptsStore = create<ReadReceiptsStore>()(
  devtools(
    immer((set, get) => ({
      ...initialState,

      // ========================================================================
      // Read Receipt Management
      // ========================================================================

      setReadReceipts: (messageId, receipts) =>
        set(
          (state) => {
            state.receiptsByMessage[messageId] = receipts;
          },
          false,
          "readReceipts/setReadReceipts",
        ),

      addReadReceipt: (receipt) =>
        set(
          (state) => {
            if (!state.receiptsByMessage[receipt.messageId]) {
              state.receiptsByMessage[receipt.messageId] = [];
            }

            // Check if user already has a receipt for this message
            const existing = state.receiptsByMessage[receipt.messageId].find(
              (r) => r.userId === receipt.userId,
            );

            if (!existing) {
              state.receiptsByMessage[receipt.messageId].push(receipt);
            }
          },
          false,
          "readReceipts/addReadReceipt",
        ),

      removeReadReceipts: (messageId) =>
        set(
          (state) => {
            delete state.receiptsByMessage[messageId];
          },
          false,
          "readReceipts/removeReadReceipts",
        ),

      clearChannelReceipts: (channelId) =>
        set(
          (state) => {
            // Clear read status for the channel
            delete state.channelReadStatus[channelId];
            // Note: We don't clear message receipts here as they're keyed by message
          },
          false,
          "readReceipts/clearChannelReceipts",
        ),

      // ========================================================================
      // Channel Read Status
      // ========================================================================

      setChannelReadStatus: (channelId, statuses) =>
        set(
          (state) => {
            state.channelReadStatus[channelId] = {};
            statuses.forEach((status) => {
              state.channelReadStatus[channelId][status.userId] = status;
            });
          },
          false,
          "readReceipts/setChannelReadStatus",
        ),

      updateUserReadStatus: (status) =>
        set(
          (state) => {
            if (!state.channelReadStatus[status.channelId]) {
              state.channelReadStatus[status.channelId] = {};
            }
            state.channelReadStatus[status.channelId][status.userId] = status;
          },
          false,
          "readReceipts/updateUserReadStatus",
        ),

      setMyLastRead: (channelId, messageId) =>
        set(
          (state) => {
            state.myLastReadByChannel[channelId] = messageId;
          },
          false,
          "readReceipts/setMyLastRead",
        ),

      // ========================================================================
      // Delivery Status
      // ========================================================================

      setDeliveryStatus: (messageId, status) =>
        set(
          (state) => {
            state.deliveryStatusByMessage[messageId] = status;
          },
          false,
          "readReceipts/setDeliveryStatus",
        ),

      bulkSetDeliveryStatus: (updates) =>
        set(
          (state) => {
            Object.entries(updates).forEach(([messageId, status]) => {
              state.deliveryStatusByMessage[messageId] = status;
            });
          },
          false,
          "readReceipts/bulkSetDeliveryStatus",
        ),

      // ========================================================================
      // Pending Reads Batching
      // ========================================================================

      addPendingRead: (messageId) =>
        set(
          (state) => {
            state.pendingReads.add(messageId);
          },
          false,
          "readReceipts/addPendingRead",
        ),

      flushPendingReads: () => {
        const state = get();
        const reads = Array.from(state.pendingReads);
        set(
          (state) => {
            state.pendingReads.clear();
          },
          false,
          "readReceipts/flushPendingReads",
        );
        return reads;
      },

      clearPendingReads: () =>
        set(
          (state) => {
            state.pendingReads.clear();
          },
          false,
          "readReceipts/clearPendingReads",
        ),

      // ========================================================================
      // Loading States
      // ========================================================================

      setLoadingChannel: (channelId, loading) =>
        set(
          (state) => {
            if (loading) {
              state.loadingChannels.add(channelId);
            } else {
              state.loadingChannels.delete(channelId);
            }
          },
          false,
          "readReceipts/setLoadingChannel",
        ),

      setLoadingMessage: (messageId, loading) =>
        set(
          (state) => {
            if (loading) {
              state.loadingMessages.add(messageId);
            } else {
              state.loadingMessages.delete(messageId);
            }
          },
          false,
          "readReceipts/setLoadingMessage",
        ),

      // ========================================================================
      // Settings
      // ========================================================================

      setShowReadReceipts: (show) =>
        set(
          (state) => {
            state.showReadReceipts = show;
          },
          false,
          "readReceipts/setShowReadReceipts",
        ),

      setShareReadReceipts: (share) =>
        set(
          (state) => {
            state.shareReadReceipts = share;
          },
          false,
          "readReceipts/setShareReadReceipts",
        ),

      // ========================================================================
      // Queries
      // ========================================================================

      getReadBy: (messageId) => {
        return get().receiptsByMessage[messageId] ?? [];
      },

      getReadCount: (messageId) => {
        return get().receiptsByMessage[messageId]?.length ?? 0;
      },

      hasUserRead: (messageId, userId) => {
        const receipts = get().receiptsByMessage[messageId];
        return receipts?.some((r) => r.userId === userId) ?? false;
      },

      getMessageStatus: (messageId, totalRecipients) => {
        const state = get();
        const readBy = state.receiptsByMessage[messageId] ?? [];
        const deliveryStatus =
          state.deliveryStatusByMessage[messageId] ?? "sent";

        // Determine if message is read based on receipts
        const effectiveStatus = readBy.length > 0 ? "read" : deliveryStatus;

        return {
          deliveryStatus: effectiveStatus,
          readBy,
          totalRecipients,
          allRead:
            totalRecipients !== undefined
              ? readBy.length >= totalRecipients
              : readBy.length > 0,
        };
      },

      getChannelReaders: (channelId) => {
        const channelStatus = get().channelReadStatus[channelId];
        if (!channelStatus) return [];
        return Object.values(channelStatus);
      },

      getWhoReadUpTo: (channelId, messageId) => {
        const channelStatus = get().channelReadStatus[channelId];
        if (!channelStatus) return [];

        // Return users whose lastReadMessageId is >= messageId
        // Note: This assumes message IDs are comparable (e.g., UUIDs with timestamps or sequential)
        return Object.values(channelStatus).filter(
          (status) => status.lastReadMessageId === messageId,
        );
      },

      // ========================================================================
      // Utility
      // ========================================================================

      reset: () => set(() => initialState, false, "readReceipts/reset"),
    })),
    { name: "read-receipts-store" },
  ),
);

// ============================================================================
// Selectors
// ============================================================================

/**
 * Select read receipts for a specific message
 */
export const selectReadReceipts =
  (messageId: string) => (state: ReadReceiptsStore) =>
    state.receiptsByMessage[messageId] ?? [];

/**
 * Select read count for a message
 */
export const selectReadCount =
  (messageId: string) => (state: ReadReceiptsStore) =>
    state.receiptsByMessage[messageId]?.length ?? 0;

/**
 * Select delivery status for a message
 */
export const selectDeliveryStatus =
  (messageId: string) => (state: ReadReceiptsStore) =>
    state.deliveryStatusByMessage[messageId] ?? "sent";

/**
 * Select whether read receipts should be shown
 */
export const selectShowReadReceipts = (state: ReadReceiptsStore) =>
  state.showReadReceipts;

/**
 * Select whether to share read receipts
 */
export const selectShareReadReceipts = (state: ReadReceiptsStore) =>
  state.shareReadReceipts;

/**
 * Select channel read status
 */
export const selectChannelReadStatus =
  (channelId: string) => (state: ReadReceiptsStore) =>
    state.channelReadStatus[channelId] ?? {};

/**
 * Select my last read message for a channel
 */
export const selectMyLastRead =
  (channelId: string) => (state: ReadReceiptsStore) =>
    state.myLastReadByChannel[channelId] ?? null;

/**
 * Select if a specific user has read a message
 */
export const selectHasUserRead =
  (messageId: string, userId: string) => (state: ReadReceiptsStore) =>
    state.receiptsByMessage[messageId]?.some((r) => r.userId === userId) ??
    false;

/**
 * Select pending reads count
 */
export const selectPendingReadsCount = (state: ReadReceiptsStore) =>
  state.pendingReads.size;

/**
 * Select loading state for a channel
 */
export const selectIsLoadingChannel =
  (channelId: string) => (state: ReadReceiptsStore) =>
    state.loadingChannels.has(channelId);

export default useReadReceiptsStore;
