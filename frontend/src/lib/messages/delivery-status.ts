/**
 * Message Delivery Status Tracking
 *
 * Manages message delivery status state and updates.
 * Tracks sending, sent, delivered, and read states.
 */

import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";

// ============================================================================
// Types
// ============================================================================

/**
 * Message delivery status states
 */
export type DeliveryStatus =
  | "sending" // Message is being sent to server
  | "sent" // Server received the message
  | "delivered" // Recipient's device received (for DMs)
  | "read" // Recipient opened the chat
  | "failed"; // Message failed to send

/**
 * Individual message status entry
 */
export interface MessageStatusEntry {
  /** Message ID */
  messageId: string;
  /** Current delivery status */
  status: DeliveryStatus;
  /** Timestamp of last status update */
  updatedAt: Date;
  /** Error message if failed */
  error?: string;
  /** Number of retry attempts */
  retryCount?: number;
  /** For group chats: number of recipients who received */
  deliveredCount?: number;
  /** For group chats: number of recipients who read */
  readCount?: number;
  /** Total number of recipients */
  totalRecipients?: number;
}

/**
 * Read receipt entry
 */
export interface ReadReceipt {
  /** User ID who read */
  userId: string;
  /** When they read */
  readAt: Date;
}

/**
 * Delivery status store state
 */
export interface DeliveryStatusState {
  /** Map of message ID to status entry */
  statuses: Record<string, MessageStatusEntry>;

  /** Map of message ID to read receipts */
  readReceipts: Record<string, ReadReceipt[]>;

  /** Get status for a message */
  getStatus: (messageId: string) => DeliveryStatus | null;

  /** Get full status entry for a message */
  getStatusEntry: (messageId: string) => MessageStatusEntry | null;

  /** Get read receipts for a message */
  getReadReceipts: (messageId: string) => ReadReceipt[];

  /** Set status for a message */
  setStatus: (
    messageId: string,
    status: DeliveryStatus,
    extra?: Partial<
      Omit<MessageStatusEntry, "messageId" | "status" | "updatedAt">
    >,
  ) => void;

  /** Add a read receipt */
  addReadReceipt: (messageId: string, receipt: ReadReceipt) => void;

  /** Set multiple read receipts at once */
  setReadReceipts: (messageId: string, receipts: ReadReceipt[]) => void;

  /** Mark message as sending */
  markSending: (messageId: string) => void;

  /** Mark message as sent */
  markSent: (messageId: string) => void;

  /** Mark message as delivered */
  markDelivered: (
    messageId: string,
    deliveredCount?: number,
    totalRecipients?: number,
  ) => void;

  /** Mark message as read */
  markRead: (
    messageId: string,
    readCount?: number,
    totalRecipients?: number,
  ) => void;

  /** Mark message as failed */
  markFailed: (messageId: string, error: string, retryCount?: number) => void;

  /** Clear status for a message */
  clearStatus: (messageId: string) => void;

  /** Clear all statuses */
  clearAllStatuses: () => void;

  /** Get failed messages */
  getFailedMessages: () => MessageStatusEntry[];

  /** Increment retry count */
  incrementRetryCount: (messageId: string) => void;
}

// ============================================================================
// Store
// ============================================================================

export const useDeliveryStatusStore = create<DeliveryStatusState>()(
  subscribeWithSelector((set, get) => ({
    statuses: {},
    readReceipts: {},

    getStatus: (messageId: string) => {
      return get().statuses[messageId]?.status ?? null;
    },

    getStatusEntry: (messageId: string) => {
      return get().statuses[messageId] ?? null;
    },

    getReadReceipts: (messageId: string) => {
      return get().readReceipts[messageId] ?? [];
    },

    setStatus: (messageId, status, extra) => {
      set((state) => ({
        statuses: {
          ...state.statuses,
          [messageId]: {
            messageId,
            status,
            updatedAt: new Date(),
            ...extra,
          },
        },
      }));
    },

    addReadReceipt: (messageId, receipt) => {
      set((state) => {
        const existing = state.readReceipts[messageId] ?? [];
        // Avoid duplicates
        if (existing.some((r) => r.userId === receipt.userId)) {
          return state;
        }
        return {
          readReceipts: {
            ...state.readReceipts,
            [messageId]: [...existing, receipt],
          },
        };
      });
    },

    setReadReceipts: (messageId, receipts) => {
      set((state) => ({
        readReceipts: {
          ...state.readReceipts,
          [messageId]: receipts,
        },
      }));
    },

    markSending: (messageId) => {
      get().setStatus(messageId, "sending");
    },

    markSent: (messageId) => {
      get().setStatus(messageId, "sent");
    },

    markDelivered: (messageId, deliveredCount, totalRecipients) => {
      get().setStatus(messageId, "delivered", {
        deliveredCount,
        totalRecipients,
      });
    },

    markRead: (messageId, readCount, totalRecipients) => {
      get().setStatus(messageId, "read", {
        readCount,
        totalRecipients,
      });
    },

    markFailed: (messageId, error, retryCount = 0) => {
      get().setStatus(messageId, "failed", {
        error,
        retryCount,
      });
    },

    clearStatus: (messageId) => {
      set((state) => {
        const { [messageId]: _, ...rest } = state.statuses;
        const { [messageId]: __, ...restReceipts } = state.readReceipts;
        return {
          statuses: rest,
          readReceipts: restReceipts,
        };
      });
    },

    clearAllStatuses: () => {
      set({ statuses: {}, readReceipts: {} });
    },

    getFailedMessages: () => {
      const { statuses } = get();
      return Object.values(statuses).filter(
        (entry) => entry.status === "failed",
      );
    },

    incrementRetryCount: (messageId) => {
      set((state) => {
        const existing = state.statuses[messageId];
        if (!existing) return state;

        return {
          statuses: {
            ...state.statuses,
            [messageId]: {
              ...existing,
              retryCount: (existing.retryCount ?? 0) + 1,
              updatedAt: new Date(),
            },
          },
        };
      });
    },
  })),
);

// ============================================================================
// Event Handlers
// ============================================================================

/**
 * Handle message sent event from server
 */
export function handleMessageSent(messageId: string): void {
  const store = useDeliveryStatusStore.getState();
  store.markSent(messageId);
}

/**
 * Handle message delivered event from server
 */
export function handleMessageDelivered(
  messageId: string,
  deliveredCount?: number,
  totalRecipients?: number,
): void {
  const store = useDeliveryStatusStore.getState();
  store.markDelivered(messageId, deliveredCount, totalRecipients);
}

/**
 * Handle message read event from server
 */
export function handleMessageRead(
  messageId: string,
  userId: string,
  readAt: Date,
  readCount?: number,
  totalRecipients?: number,
): void {
  const store = useDeliveryStatusStore.getState();

  // Add the read receipt
  store.addReadReceipt(messageId, { userId, readAt });

  // Update the status
  store.markRead(messageId, readCount, totalRecipients);
}

/**
 * Handle message failed event
 */
export function handleMessageFailed(messageId: string, error: string): void {
  const store = useDeliveryStatusStore.getState();
  const existing = store.getStatusEntry(messageId);
  store.markFailed(messageId, error, existing?.retryCount ?? 0);
}

/**
 * Handle retry attempt
 */
export function handleRetryAttempt(messageId: string): void {
  const store = useDeliveryStatusStore.getState();
  const existing = store.getStatusEntry(messageId);
  const newRetryCount = (existing?.retryCount ?? 0) + 1;

  // Update status while preserving the incremented retry count
  store.setStatus(messageId, "sending", {
    retryCount: newRetryCount,
  });
}

// ============================================================================
// Selectors
// ============================================================================

/**
 * Select status for a specific message
 */
export const selectMessageStatus =
  (messageId: string) => (state: DeliveryStatusState) =>
    state.statuses[messageId];

/**
 * Select all failed messages
 */
export const selectFailedMessages = (state: DeliveryStatusState) =>
  Object.values(state.statuses).filter((entry) => entry.status === "failed");

/**
 * Select messages by status
 */
export const selectMessagesByStatus =
  (status: DeliveryStatus) => (state: DeliveryStatusState) =>
    Object.values(state.statuses).filter((entry) => entry.status === status);

/**
 * Select read receipts for a message
 */
export const selectReadReceipts =
  (messageId: string) => (state: DeliveryStatusState) =>
    state.readReceipts[messageId] ?? [];

/**
 * Select read count for a message
 */
export const selectReadCount =
  (messageId: string) => (state: DeliveryStatusState) =>
    state.readReceipts[messageId]?.length ?? 0;

// ============================================================================
// Utilities
// ============================================================================

/**
 * Determine if a message should show delivery status UI
 * (Only show for own messages, and skip for older messages)
 */
export function shouldShowDeliveryStatus(
  messageUserId: string,
  currentUserId: string,
  messageCreatedAt: Date,
  maxAgeMs: number = 24 * 60 * 60 * 1000, // 24 hours
): boolean {
  // Only show for own messages
  if (messageUserId !== currentUserId) return false;

  // Don't show for old messages
  const age = Date.now() - new Date(messageCreatedAt).getTime();
  return age < maxAgeMs;
}

/**
 * Get a human-readable description of the delivery status
 */
export function getStatusDescription(status: DeliveryStatus): string {
  switch (status) {
    case "sending":
      return "Sending...";
    case "sent":
      return "Sent";
    case "delivered":
      return "Delivered";
    case "read":
      return "Read";
    case "failed":
      return "Failed to send";
    default:
      return "Unknown";
  }
}

/**
 * Calculate read percentage for group chats
 */
export function calculateReadPercentage(
  readCount: number,
  totalRecipients: number,
): number {
  if (totalRecipients === 0) return 0;
  return Math.round((readCount / totalRecipients) * 100);
}

export default useDeliveryStatusStore;
