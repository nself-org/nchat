/**
 * Message Delivery State Management
 *
 * Enhanced delivery state management for real-time message tracking.
 * Provides comprehensive state machine for message delivery lifecycle.
 *
 * @module lib/messaging/delivery-state
 * @version 1.0.0
 */

import { create } from "zustand";
import { subscribeWithSelector, persist } from "zustand/middleware";

import { logger } from "@/lib/logger";

// ============================================================================
// Types
// ============================================================================

/**
 * Extended message delivery states
 */
export type MessageDeliveryState =
  | "pending" // Message created locally, not yet sent
  | "sending" // Message is being transmitted to server
  | "sent" // Server acknowledged receipt
  | "delivered" // At least one recipient received (pushed to device)
  | "read" // At least one recipient read the message
  | "failed" // Message failed to send
  | "expired"; // Message expired before delivery

/**
 * Delivery state transition definition
 */
export interface DeliveryStateTransition {
  from: MessageDeliveryState;
  to: MessageDeliveryState;
  timestamp: Date;
  reason?: string;
}

/**
 * Per-recipient delivery info (for group chats)
 */
export interface RecipientDeliveryInfo {
  userId: string;
  state: Exclude<
    MessageDeliveryState,
    "pending" | "sending" | "failed" | "expired"
  >;
  deliveredAt?: Date;
  readAt?: Date;
}

/**
 * Complete message delivery record
 */
export interface MessageDeliveryRecord {
  /** Message ID */
  messageId: string;
  /** Client-side message ID (for optimistic updates) */
  clientMessageId?: string;
  /** Channel ID */
  channelId: string;
  /** Current delivery state */
  state: MessageDeliveryState;
  /** State transition history */
  transitions: DeliveryStateTransition[];
  /** Per-recipient delivery info (for group chats) */
  recipients: RecipientDeliveryInfo[];
  /** Total recipient count */
  totalRecipients: number;
  /** Delivered count */
  deliveredCount: number;
  /** Read count */
  readCount: number;
  /** Retry count for failed messages */
  retryCount: number;
  /** Maximum retry attempts */
  maxRetries: number;
  /** Error message if failed */
  error?: string;
  /** Timestamp when created */
  createdAt: Date;
  /** Last update timestamp */
  updatedAt: Date;
  /** Expiry timestamp */
  expiresAt?: Date;
}

/**
 * Delivery state store interface
 */
export interface DeliveryStateStore {
  /** Map of message ID to delivery record */
  records: Record<string, MessageDeliveryRecord>;
  /** Map of client message ID to server message ID */
  clientToServerMap: Record<string, string>;

  // Getters
  getRecord: (messageId: string) => MessageDeliveryRecord | null;
  getRecordByClientId: (
    clientMessageId: string,
  ) => MessageDeliveryRecord | null;
  getState: (messageId: string) => MessageDeliveryState | null;
  getRecipients: (messageId: string) => RecipientDeliveryInfo[];
  getDeliveredCount: (messageId: string) => number;
  getReadCount: (messageId: string) => number;
  getReadPercentage: (messageId: string) => number;
  getFailedMessages: () => MessageDeliveryRecord[];
  getPendingMessages: () => MessageDeliveryRecord[];

  // State mutations
  initializeRecord: (
    messageId: string,
    channelId: string,
    clientMessageId?: string,
    totalRecipients?: number,
  ) => void;
  transitionState: (
    messageId: string,
    newState: MessageDeliveryState,
    reason?: string,
  ) => boolean;
  updateRecipientState: (
    messageId: string,
    userId: string,
    state: RecipientDeliveryInfo["state"],
    timestamp?: Date,
  ) => void;
  mapClientToServer: (clientMessageId: string, serverMessageId: string) => void;
  setError: (messageId: string, error: string) => void;
  incrementRetry: (messageId: string) => boolean;
  clearRecord: (messageId: string) => void;
  clearExpired: () => void;
  clearAll: () => void;
}

// ============================================================================
// State Machine Configuration
// ============================================================================

/**
 * Valid state transitions
 */
const VALID_TRANSITIONS: Record<MessageDeliveryState, MessageDeliveryState[]> =
  {
    pending: ["sending", "failed"],
    sending: ["sent", "failed", "pending"], // pending for retry
    sent: ["delivered", "read", "expired"],
    delivered: ["read"],
    read: [], // Terminal state
    failed: ["pending", "sending"], // For retry
    expired: [], // Terminal state
  };

/**
 * Check if a state transition is valid
 */
export function isValidTransition(
  from: MessageDeliveryState,
  to: MessageDeliveryState,
): boolean {
  return VALID_TRANSITIONS[from]?.includes(to) ?? false;
}

/**
 * Get allowed next states
 */
export function getAllowedTransitions(
  currentState: MessageDeliveryState,
): MessageDeliveryState[] {
  return VALID_TRANSITIONS[currentState] ?? [];
}

// ============================================================================
// Store Implementation
// ============================================================================

const DEFAULT_MAX_RETRIES = 3;
const DEFAULT_RECORD_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export const useDeliveryStateStore = create<DeliveryStateStore>()(
  subscribeWithSelector(
    persist(
      (set, get) => ({
        records: {},
        clientToServerMap: {},

        getRecord: (messageId: string) => {
          const state = get();
          return state.records[messageId] ?? null;
        },

        getRecordByClientId: (clientMessageId: string) => {
          const state = get();
          const serverMessageId = state.clientToServerMap[clientMessageId];
          if (serverMessageId) {
            return state.records[serverMessageId] ?? null;
          }
          // Check if it's still using client ID
          return state.records[clientMessageId] ?? null;
        },

        getState: (messageId: string) => {
          const record = get().getRecord(messageId);
          return record?.state ?? null;
        },

        getRecipients: (messageId: string) => {
          const record = get().getRecord(messageId);
          return record?.recipients ?? [];
        },

        getDeliveredCount: (messageId: string) => {
          const record = get().getRecord(messageId);
          return record?.deliveredCount ?? 0;
        },

        getReadCount: (messageId: string) => {
          const record = get().getRecord(messageId);
          return record?.readCount ?? 0;
        },

        getReadPercentage: (messageId: string) => {
          const record = get().getRecord(messageId);
          if (!record || record.totalRecipients === 0) return 0;
          return Math.round((record.readCount / record.totalRecipients) * 100);
        },

        getFailedMessages: () => {
          return Object.values(get().records).filter(
            (record) => record.state === "failed",
          );
        },

        getPendingMessages: () => {
          return Object.values(get().records).filter(
            (record) =>
              record.state === "pending" || record.state === "sending",
          );
        },

        initializeRecord: (
          messageId: string,
          channelId: string,
          clientMessageId?: string,
          totalRecipients: number = 1,
        ) => {
          const now = new Date();
          const record: MessageDeliveryRecord = {
            messageId,
            clientMessageId,
            channelId,
            state: "pending",
            transitions: [
              {
                from: "pending" as MessageDeliveryState,
                to: "pending",
                timestamp: now,
                reason: "Initialized",
              },
            ],
            recipients: [],
            totalRecipients,
            deliveredCount: 0,
            readCount: 0,
            retryCount: 0,
            maxRetries: DEFAULT_MAX_RETRIES,
            createdAt: now,
            updatedAt: now,
            expiresAt: new Date(now.getTime() + DEFAULT_RECORD_EXPIRY_MS),
          };

          set((state) => ({
            records: {
              ...state.records,
              [messageId]: record,
            },
            clientToServerMap: clientMessageId
              ? { ...state.clientToServerMap, [clientMessageId]: messageId }
              : state.clientToServerMap,
          }));
        },

        transitionState: (
          messageId: string,
          newState: MessageDeliveryState,
          reason?: string,
        ): boolean => {
          const record = get().getRecord(messageId);
          if (!record) return false;

          if (!isValidTransition(record.state, newState)) {
            console.warn(
              `[DeliveryState] Invalid transition: ${record.state} -> ${newState} for message ${messageId}`,
            );
            return false;
          }

          const now = new Date();
          const transition: DeliveryStateTransition = {
            from: record.state,
            to: newState,
            timestamp: now,
            reason,
          };

          set((state) => ({
            records: {
              ...state.records,
              [messageId]: {
                ...record,
                state: newState,
                transitions: [...record.transitions, transition],
                updatedAt: now,
              },
            },
          }));

          return true;
        },

        updateRecipientState: (
          messageId: string,
          userId: string,
          newState: RecipientDeliveryInfo["state"],
          timestamp: Date = new Date(),
        ) => {
          const record = get().getRecord(messageId);
          if (!record) return;

          const existingIndex = record.recipients.findIndex(
            (r) => r.userId === userId,
          );
          let updatedRecipients: RecipientDeliveryInfo[];
          let deliveredDelta = 0;
          let readDelta = 0;

          if (existingIndex >= 0) {
            const existing = record.recipients[existingIndex];

            // Don't go backwards in state
            const stateOrder = ["sent", "delivered", "read"];
            if (
              stateOrder.indexOf(newState) < stateOrder.indexOf(existing.state)
            ) {
              return;
            }

            // Calculate deltas
            if (newState === "delivered" && existing.state === "sent") {
              deliveredDelta = 1;
            }
            if (newState === "read") {
              if (existing.state === "sent") {
                deliveredDelta = 1;
                readDelta = 1;
              } else if (existing.state === "delivered") {
                readDelta = 1;
              }
            }

            const updated: RecipientDeliveryInfo = {
              ...existing,
              state: newState,
              deliveredAt:
                newState === "delivered" || newState === "read"
                  ? (existing.deliveredAt ?? timestamp)
                  : existing.deliveredAt,
              readAt: newState === "read" ? timestamp : existing.readAt,
            };

            updatedRecipients = [
              ...record.recipients.slice(0, existingIndex),
              updated,
              ...record.recipients.slice(existingIndex + 1),
            ];
          } else {
            // New recipient
            const newRecipient: RecipientDeliveryInfo = {
              userId,
              state: newState,
              deliveredAt:
                newState === "delivered" || newState === "read"
                  ? timestamp
                  : undefined,
              readAt: newState === "read" ? timestamp : undefined,
            };
            updatedRecipients = [...record.recipients, newRecipient];

            if (newState === "delivered" || newState === "read") {
              deliveredDelta = 1;
            }
            if (newState === "read") {
              readDelta = 1;
            }
          }

          // Determine overall message state
          let overallState = record.state;
          const newDeliveredCount = record.deliveredCount + deliveredDelta;
          const newReadCount = record.readCount + readDelta;

          if (newReadCount > 0 && overallState !== "read") {
            overallState = "read";
          } else if (
            newDeliveredCount > 0 &&
            overallState !== "read" &&
            overallState !== "delivered"
          ) {
            overallState = "delivered";
          }

          set((state) => ({
            records: {
              ...state.records,
              [messageId]: {
                ...record,
                state: overallState,
                recipients: updatedRecipients,
                deliveredCount: newDeliveredCount,
                readCount: newReadCount,
                updatedAt: new Date(),
              },
            },
          }));
        },

        mapClientToServer: (
          clientMessageId: string,
          serverMessageId: string,
        ) => {
          const state = get();
          const existingRecord = state.records[clientMessageId];

          if (existingRecord) {
            // Move record from client ID to server ID
            const { [clientMessageId]: _, ...restRecords } = state.records;

            set({
              records: {
                ...restRecords,
                [serverMessageId]: {
                  ...existingRecord,
                  messageId: serverMessageId,
                },
              },
              clientToServerMap: {
                ...state.clientToServerMap,
                [clientMessageId]: serverMessageId,
              },
            });
          } else {
            set((state) => ({
              clientToServerMap: {
                ...state.clientToServerMap,
                [clientMessageId]: serverMessageId,
              },
            }));
          }
        },

        setError: (messageId: string, error: string) => {
          const record = get().getRecord(messageId);
          if (!record) return;

          set((state) => ({
            records: {
              ...state.records,
              [messageId]: {
                ...record,
                state: "failed",
                error,
                updatedAt: new Date(),
              },
            },
          }));
        },

        incrementRetry: (messageId: string): boolean => {
          const record = get().getRecord(messageId);
          if (!record) return false;

          const newRetryCount = record.retryCount + 1;
          if (newRetryCount > record.maxRetries) {
            return false;
          }

          set((state) => ({
            records: {
              ...state.records,
              [messageId]: {
                ...record,
                retryCount: newRetryCount,
                state: "pending",
                error: undefined,
                updatedAt: new Date(),
              },
            },
          }));

          return true;
        },

        clearRecord: (messageId: string) => {
          set((state) => {
            const { [messageId]: _, ...restRecords } = state.records;
            // Also clean up client map if needed
            const clientToServerMap = { ...state.clientToServerMap };
            for (const [clientId, serverId] of Object.entries(
              clientToServerMap,
            )) {
              if (serverId === messageId) {
                delete clientToServerMap[clientId];
              }
            }
            return { records: restRecords, clientToServerMap };
          });
        },

        clearExpired: () => {
          const now = new Date();
          set((state) => {
            const records: Record<string, MessageDeliveryRecord> = {};
            const clientToServerMap: Record<string, string> = {};

            for (const [id, record] of Object.entries(state.records)) {
              if (!record.expiresAt || record.expiresAt > now) {
                records[id] = record;
              }
            }

            for (const [clientId, serverId] of Object.entries(
              state.clientToServerMap,
            )) {
              if (records[serverId]) {
                clientToServerMap[clientId] = serverId;
              }
            }

            return { records, clientToServerMap };
          });
        },

        clearAll: () => {
          set({ records: {}, clientToServerMap: {} });
        },
      }),
      {
        name: "delivery-state-storage",
        partialize: (state) => ({
          records: state.records,
          clientToServerMap: state.clientToServerMap,
        }),
      },
    ),
  ),
);

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Create a new delivery record for an outgoing message
 */
export function createDeliveryRecord(
  messageId: string,
  channelId: string,
  clientMessageId?: string,
  totalRecipients?: number,
): void {
  useDeliveryStateStore
    .getState()
    .initializeRecord(messageId, channelId, clientMessageId, totalRecipients);
}

/**
 * Mark message as sending
 */
export function markSending(messageId: string): boolean {
  return useDeliveryStateStore.getState().transitionState(messageId, "sending");
}

/**
 * Mark message as sent (server acknowledged)
 */
export function markSent(messageId: string): boolean {
  return useDeliveryStateStore.getState().transitionState(messageId, "sent");
}

/**
 * Mark message as delivered
 */
export function markDelivered(
  messageId: string,
  userId?: string,
  timestamp?: Date,
): void {
  const store = useDeliveryStateStore.getState();
  if (userId) {
    store.updateRecipientState(messageId, userId, "delivered", timestamp);
  } else {
    store.transitionState(messageId, "delivered");
  }
}

/**
 * Mark message as read
 */
export function markRead(
  messageId: string,
  userId?: string,
  timestamp?: Date,
): void {
  const store = useDeliveryStateStore.getState();
  if (userId) {
    store.updateRecipientState(messageId, userId, "read", timestamp);
  } else {
    store.transitionState(messageId, "read");
  }
}

/**
 * Mark message as failed
 */
export function markFailed(messageId: string, error: string): void {
  const store = useDeliveryStateStore.getState();
  store.transitionState(messageId, "failed", error);
  store.setError(messageId, error);
}

/**
 * Retry a failed message
 */
export function retryMessage(messageId: string): boolean {
  const store = useDeliveryStateStore.getState();
  return store.incrementRetry(messageId);
}

/**
 * Get human-readable state description
 */
export function getStateDescription(state: MessageDeliveryState): string {
  const descriptions: Record<MessageDeliveryState, string> = {
    pending: "Pending",
    sending: "Sending...",
    sent: "Sent",
    delivered: "Delivered",
    read: "Read",
    failed: "Failed to send",
    expired: "Expired",
  };
  return descriptions[state];
}

/**
 * Check if state indicates message was successfully sent
 */
export function isSuccessfulState(state: MessageDeliveryState): boolean {
  return ["sent", "delivered", "read"].includes(state);
}

/**
 * Check if state indicates a terminal (final) state
 */
export function isTerminalState(state: MessageDeliveryState): boolean {
  return ["read", "expired"].includes(state);
}

/**
 * Check if message can be retried
 */
export function canRetry(messageId: string): boolean {
  const record = useDeliveryStateStore.getState().getRecord(messageId);
  if (!record) return false;
  return record.state === "failed" && record.retryCount < record.maxRetries;
}

// ============================================================================
// Selectors
// ============================================================================

/**
 * Select delivery record for a message
 */
export const selectDeliveryRecord =
  (messageId: string) => (state: DeliveryStateStore) =>
    state.records[messageId];

/**
 * Select delivery state for a message
 */
export const selectDeliveryState =
  (messageId: string) => (state: DeliveryStateStore) =>
    state.records[messageId]?.state;

/**
 * Select all failed messages
 */
export const selectFailedMessages = (state: DeliveryStateStore) =>
  Object.values(state.records).filter((r) => r.state === "failed");

/**
 * Select all pending messages
 */
export const selectPendingMessages = (state: DeliveryStateStore) =>
  Object.values(state.records).filter(
    (r) => r.state === "pending" || r.state === "sending",
  );

/**
 * Select messages by channel
 */
export const selectMessagesByChannel =
  (channelId: string) => (state: DeliveryStateStore) =>
    Object.values(state.records).filter((r) => r.channelId === channelId);

export default useDeliveryStateStore;
