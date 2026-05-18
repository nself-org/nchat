/**
 * Message Status Hook
 *
 * React hook for accessing and subscribing to message delivery status updates.
 * Provides real-time status tracking for individual messages.
 */

import { useCallback, useEffect, useMemo } from "react";
import { useShallow } from "zustand/react/shallow";
import {
  useDeliveryStatusStore,
  type DeliveryStatus,
  type MessageStatusEntry,
  type ReadReceipt,
  handleRetryAttempt,
  shouldShowDeliveryStatus,
} from "./delivery-status";
import {
  useMessageHistoryStore,
  loadMessageHistory,
} from "./message-history-store";
import type { MessageEditRecord } from "@/types/message";

import { logger } from "@/lib/logger";

// ============================================================================
// Types
// ============================================================================

export interface UseMessageStatusOptions {
  /** Message ID */
  messageId: string;
  /** Whether to subscribe to real-time updates */
  subscribe?: boolean;
}

export interface UseMessageStatusResult {
  /** Current delivery status */
  status: DeliveryStatus | null;
  /** Full status entry with metadata */
  statusEntry: MessageStatusEntry | null;
  /** Whether the message is currently being sent */
  isSending: boolean;
  /** Whether the message was sent successfully */
  isSent: boolean;
  /** Whether the message was delivered */
  isDelivered: boolean;
  /** Whether the message was read */
  isRead: boolean;
  /** Whether the message failed to send */
  isFailed: boolean;
  /** Error message if failed */
  error: string | null;
  /** Number of retry attempts */
  retryCount: number;
  /** Read receipts for the message */
  readReceipts: ReadReceipt[];
  /** Read count (for group chats) */
  readCount: number;
  /** Total recipients (for group chats) */
  totalRecipients: number | null;
  /** Retry sending the message */
  retry: () => void;
  /** Clear the status */
  clear: () => void;
}

export interface UseEditHistoryOptions {
  /** Message ID */
  messageId: string;
  /** Function to fetch history from GraphQL */
  fetchFn?: () => Promise<MessageEditRecord[]>;
  /** Whether to auto-load on mount */
  autoLoad?: boolean;
}

export interface UseEditHistoryResult {
  /** Edit history records */
  history: MessageEditRecord[] | null;
  /** Whether history is loading */
  isLoading: boolean;
  /** Error message if loading failed */
  error: string | null;
  /** Reload the history */
  reload: () => Promise<void>;
  /** Clear cached history */
  clear: () => void;
}

export interface UseMessageDeliveryOptions {
  /** User ID of the message author */
  messageUserId: string;
  /** Current user ID */
  currentUserId: string;
  /** Message created at timestamp */
  messageCreatedAt: Date;
  /** Max age to show delivery status (default: 24 hours) */
  maxAgeMs?: number;
}

// ============================================================================
// Hooks
// ============================================================================

/**
 * Hook to get and subscribe to message delivery status
 */
export function useMessageStatus({
  messageId,
  subscribe = true,
}: UseMessageStatusOptions): UseMessageStatusResult {
  const statusEntry = useDeliveryStatusStore(
    useShallow((state) => state.statuses[messageId] ?? null),
  );

  const readReceipts = useDeliveryStatusStore(
    useShallow((state) => state.readReceipts[messageId] ?? []),
  );

  const { markSending, clearStatus, incrementRetryCount } =
    useDeliveryStatusStore(
      useShallow((state) => ({
        markSending: state.markSending,
        clearStatus: state.clearStatus,
        incrementRetryCount: state.incrementRetryCount,
      })),
    );

  const status = statusEntry?.status ?? null;

  const retry = useCallback(() => {
    handleRetryAttempt(messageId);
  }, [messageId]);

  const clear = useCallback(() => {
    clearStatus(messageId);
  }, [messageId, clearStatus]);

  return {
    status,
    statusEntry,
    isSending: status === "sending",
    isSent: status === "sent",
    isDelivered: status === "delivered",
    isRead: status === "read",
    isFailed: status === "failed",
    error: statusEntry?.error ?? null,
    retryCount: statusEntry?.retryCount ?? 0,
    readReceipts,
    readCount: statusEntry?.readCount ?? readReceipts.length,
    totalRecipients: statusEntry?.totalRecipients ?? null,
    retry,
    clear,
  };
}

/**
 * Hook to get and load message edit history
 */
export function useEditHistory({
  messageId,
  fetchFn,
  autoLoad = false,
}: UseEditHistoryOptions): UseEditHistoryResult {
  const { history, isLoading, error } = useMessageHistoryStore(
    useShallow((state) => ({
      history: state.histories[messageId]?.history ?? null,
      isLoading: state.histories[messageId]?.isLoading ?? false,
      error: state.histories[messageId]?.error ?? null,
    })),
  );

  const { clearHistory, isStale } = useMessageHistoryStore(
    useShallow((state) => ({
      clearHistory: state.clearHistory,
      isStale: state.isStale,
    })),
  );

  const reload = useCallback(async () => {
    if (!fetchFn) {
      logger.warn("useEditHistory: fetchFn is required to reload history");
      return;
    }

    await loadMessageHistory(messageId, fetchFn);
  }, [messageId, fetchFn]);

  const clear = useCallback(() => {
    clearHistory(messageId);
  }, [messageId, clearHistory]);

  // Auto-load on mount if enabled and history is stale
  useEffect(() => {
    if (autoLoad && fetchFn && isStale(messageId)) {
      loadMessageHistory(messageId, fetchFn).catch(console.error);
    }
  }, [autoLoad, fetchFn, messageId, isStale]);

  return {
    history,
    isLoading,
    error,
    reload,
    clear,
  };
}

/**
 * Hook to determine if delivery status should be shown for a message
 */
export function useShowDeliveryStatus({
  messageUserId,
  currentUserId,
  messageCreatedAt,
  maxAgeMs,
}: UseMessageDeliveryOptions): boolean {
  return useMemo(
    () =>
      shouldShowDeliveryStatus(
        messageUserId,
        currentUserId,
        messageCreatedAt,
        maxAgeMs,
      ),
    [messageUserId, currentUserId, messageCreatedAt, maxAgeMs],
  );
}

/**
 * Hook to get all failed messages
 */
export function useFailedMessages(): MessageStatusEntry[] {
  return useDeliveryStatusStore(
    useShallow((state) =>
      Object.values(state.statuses).filter(
        (entry) => entry.status === "failed",
      ),
    ),
  );
}

/**
 * Hook to manage bulk retry operations
 */
export function useBulkMessageRetry() {
  const failedMessages = useFailedMessages();

  const retryAll = useCallback(() => {
    failedMessages.forEach((msg) => {
      handleRetryAttempt(msg.messageId);
    });
  }, [failedMessages]);

  const clearAll = useCallback(() => {
    const store = useDeliveryStatusStore.getState();
    failedMessages.forEach((msg) => {
      store.clearStatus(msg.messageId);
    });
  }, [failedMessages]);

  return {
    failedMessages,
    failedCount: failedMessages.length,
    retryAll,
    clearAll,
  };
}

/**
 * Hook to track sending state for optimistic updates
 */
export function useSendingState(messageId: string) {
  const { markSending, markSent, markFailed, markDelivered, markRead } =
    useDeliveryStatusStore(
      useShallow((state) => ({
        markSending: state.markSending,
        markSent: state.markSent,
        markFailed: state.markFailed,
        markDelivered: state.markDelivered,
        markRead: state.markRead,
      })),
    );

  const startSending = useCallback(() => {
    markSending(messageId);
  }, [messageId, markSending]);

  const completeSend = useCallback(() => {
    markSent(messageId);
  }, [messageId, markSent]);

  const failSend = useCallback(
    (error: string) => {
      markFailed(messageId, error);
    },
    [messageId, markFailed],
  );

  const confirmDelivery = useCallback(
    (deliveredCount?: number, totalRecipients?: number) => {
      markDelivered(messageId, deliveredCount, totalRecipients);
    },
    [messageId, markDelivered],
  );

  const confirmRead = useCallback(
    (readCount?: number, totalRecipients?: number) => {
      markRead(messageId, readCount, totalRecipients);
    },
    [messageId, markRead],
  );

  return {
    startSending,
    completeSend,
    failSend,
    confirmDelivery,
    confirmRead,
  };
}

// ============================================================================
// Combined Hook
// ============================================================================

/**
 * Combined hook for full message status (delivery + edit history)
 */
export function useFullMessageStatus(
  messageId: string,
  options?: {
    fetchHistoryFn?: () => Promise<MessageEditRecord[]>;
    autoLoadHistory?: boolean;
  },
) {
  const deliveryStatus = useMessageStatus({ messageId });
  const editHistory = useEditHistory({
    messageId,
    fetchFn: options?.fetchHistoryFn,
    autoLoad: options?.autoLoadHistory,
  });

  return {
    // Delivery status
    ...deliveryStatus,

    // Edit history
    editHistory: editHistory.history,
    isLoadingHistory: editHistory.isLoading,
    historyError: editHistory.error,
    reloadHistory: editHistory.reload,
    clearHistory: editHistory.clear,
  };
}

export default useMessageStatus;
