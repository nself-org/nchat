/**
 * Messages Library
 *
 * Exports for message edit history and delivery status management.
 */

// Message History Store
export {
  useMessageHistoryStore,
  loadMessageHistory,
  preloadMessageHistories,
  handleEditEvent,
  selectMessageHistory,
  selectHistoryLoading,
  selectHistoryError,
  selectCachedMessageIds,
  type MessageHistoryEntry,
  type MessageHistoryState,
} from "./message-history-store";

// Delivery Status Store
export {
  useDeliveryStatusStore,
  handleMessageSent,
  handleMessageDelivered,
  handleMessageRead,
  handleMessageFailed,
  handleRetryAttempt,
  selectMessageStatus,
  selectFailedMessages,
  selectMessagesByStatus,
  selectReadReceipts,
  selectReadCount,
  shouldShowDeliveryStatus,
  getStatusDescription,
  calculateReadPercentage,
  type DeliveryStatus,
  type MessageStatusEntry,
  type ReadReceipt,
  type DeliveryStatusState,
} from "./delivery-status";

// Hooks
export {
  useMessageStatus,
  useEditHistory,
  useShowDeliveryStatus,
  useFailedMessages,
  useBulkMessageRetry,
  useSendingState,
  useFullMessageStatus,
  type UseMessageStatusOptions,
  type UseMessageStatusResult,
  type UseEditHistoryOptions,
  type UseEditHistoryResult,
  type UseMessageDeliveryOptions,
} from "./use-message-status";
