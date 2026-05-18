/**
 * Scheduled Messages Module
 *
 * Provides functionality for scheduling messages to be sent at a future time.
 * Includes message creation, editing, cancellation, and listing.
 */

import { create } from "zustand";
import { devtools, persist, subscribeWithSelector } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";

// ============================================================================
// Types
// ============================================================================

/**
 * Status of a scheduled message
 */
export type ScheduledMessageStatus =
  | "pending" // Waiting to be sent
  | "sending" // Currently being sent
  | "sent" // Successfully sent
  | "failed" // Failed to send
  | "cancelled"; // Cancelled by user

/**
 * Scheduled message data
 */
export interface ScheduledMessage {
  /** Unique identifier */
  id: string;
  /** Channel or DM to send to */
  channelId: string;
  /** Message content */
  content: string;
  /** When to send the message */
  scheduledAt: number;
  /** When the message was created */
  createdAt: number;
  /** When the message was last updated */
  updatedAt: number;
  /** User who scheduled the message */
  userId: string;
  /** Current status */
  status: ScheduledMessageStatus;
  /** Attachments to include */
  attachments?: ScheduledAttachment[];
  /** Message to reply to */
  replyToId?: string;
  /** Thread parent message */
  threadId?: string;
  /** Error message if failed */
  error?: string;
  /** Number of retry attempts */
  retryCount?: number;
  /** Timezone used when scheduling */
  timezone?: string;
  /** Recurrence pattern (for recurring messages) */
  recurrence?: RecurrencePattern;
}

/**
 * Scheduled message attachment
 */
export interface ScheduledAttachment {
  /** Attachment ID */
  id: string;
  /** File name */
  name: string;
  /** File type */
  type: string;
  /** File size in bytes */
  size: number;
  /** File URL or blob URL */
  url: string;
  /** Preview URL for images */
  previewUrl?: string;
}

/**
 * Recurrence pattern for recurring messages
 */
export interface RecurrencePattern {
  /** Frequency type */
  frequency: "daily" | "weekly" | "monthly" | "yearly";
  /** Interval between occurrences */
  interval: number;
  /** Days of week (0-6, Sunday=0) for weekly recurrence */
  daysOfWeek?: number[];
  /** Day of month for monthly recurrence */
  dayOfMonth?: number;
  /** End date for recurrence (optional) */
  endDate?: number;
  /** Maximum occurrences (optional) */
  maxOccurrences?: number;
  /** Count of sent occurrences */
  sentCount?: number;
}

/**
 * Options for creating a scheduled message
 */
export interface CreateScheduledMessageOptions {
  channelId: string;
  content: string;
  scheduledAt: Date | number;
  userId: string;
  attachments?: ScheduledAttachment[];
  replyToId?: string;
  threadId?: string;
  timezone?: string;
  recurrence?: RecurrencePattern;
}

/**
 * Options for updating a scheduled message
 */
export interface UpdateScheduledMessageOptions {
  content?: string;
  scheduledAt?: Date | number;
  attachments?: ScheduledAttachment[];
  replyToId?: string;
  threadId?: string;
  timezone?: string;
  recurrence?: RecurrencePattern;
}

/**
 * Filter options for listing scheduled messages
 */
export interface ScheduledMessageFilter {
  channelId?: string;
  userId?: string;
  status?: ScheduledMessageStatus | ScheduledMessageStatus[];
  fromDate?: Date | number;
  toDate?: Date | number;
}

// ============================================================================
// Store Types
// ============================================================================

export interface ScheduledMessagesState {
  /** All scheduled messages by ID */
  messages: Map<string, ScheduledMessage>;
  /** Messages grouped by channel */
  messagesByChannel: Map<string, Set<string>>;
  /** Messages grouped by user */
  messagesByUser: Map<string, Set<string>>;
  /** Loading state */
  isLoading: boolean;
  /** Error state */
  error: string | null;
}

export interface ScheduledMessagesActions {
  // CRUD operations
  addMessage: (options: CreateScheduledMessageOptions) => ScheduledMessage;
  updateMessage: (
    id: string,
    options: UpdateScheduledMessageOptions,
  ) => ScheduledMessage | null;
  cancelMessage: (id: string) => boolean;
  deleteMessage: (id: string) => boolean;

  // Status updates
  markSending: (id: string) => void;
  markSent: (id: string) => void;
  markFailed: (id: string, error: string) => void;
  retry: (id: string) => void;

  // Queries
  getMessage: (id: string) => ScheduledMessage | undefined;
  getMessages: (filter?: ScheduledMessageFilter) => ScheduledMessage[];
  getMessagesByChannel: (channelId: string) => ScheduledMessage[];
  getMessagesByUser: (userId: string) => ScheduledMessage[];
  getPendingMessages: () => ScheduledMessage[];
  getUpcomingMessages: (minutes?: number) => ScheduledMessage[];
  getOverdueMessages: () => ScheduledMessage[];

  // Bulk operations
  cancelAllForChannel: (channelId: string) => number;
  cancelAllForUser: (userId: string) => number;

  // State management
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  reset: () => void;
}

export type ScheduledMessagesStore = ScheduledMessagesState &
  ScheduledMessagesActions;

// ============================================================================
// Constants
// ============================================================================

/** Minimum time in the future for scheduling (5 minutes) */
export const MIN_SCHEDULE_DELAY_MS = 5 * 60 * 1000;

/** Maximum time in the future for scheduling (1 year) */
export const MAX_SCHEDULE_DELAY_MS = 365 * 24 * 60 * 60 * 1000;

/** Maximum number of scheduled messages per user */
export const MAX_SCHEDULED_MESSAGES_PER_USER = 100;

/** Maximum retry attempts */
export const MAX_RETRY_ATTEMPTS = 3;

/** Default polling interval for checking due messages (1 minute) */
export const DEFAULT_POLL_INTERVAL_MS = 60 * 1000;

// ============================================================================
// Utilities
// ============================================================================

/**
 * Generate a unique ID for a scheduled message
 */
export function generateMessageId(): string {
  return `sched_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Validate scheduled time
 */
export function validateScheduledTime(
  scheduledAt: Date | number,
  options?: { minDelay?: number; maxDelay?: number },
): { valid: boolean; error?: string } {
  const { minDelay = MIN_SCHEDULE_DELAY_MS, maxDelay = MAX_SCHEDULE_DELAY_MS } =
    options || {};

  const scheduledTime =
    typeof scheduledAt === "number" ? scheduledAt : scheduledAt.getTime();
  const now = Date.now();
  const delay = scheduledTime - now;

  if (delay < minDelay) {
    const minMinutes = Math.ceil(minDelay / 60000);
    return {
      valid: false,
      error: `Message must be scheduled at least ${minMinutes} minutes in the future`,
    };
  }

  if (delay > maxDelay) {
    const maxDays = Math.floor(maxDelay / (24 * 60 * 60 * 1000));
    return {
      valid: false,
      error: `Message cannot be scheduled more than ${maxDays} days in the future`,
    };
  }

  return { valid: true };
}

/**
 * Validate message content
 */
export function validateMessageContent(content: string): {
  valid: boolean;
  error?: string;
} {
  if (!content || content.trim().length === 0) {
    return { valid: false, error: "Message content cannot be empty" };
  }

  if (content.length > 4000) {
    return {
      valid: false,
      error: "Message content exceeds maximum length of 4000 characters",
    };
  }

  return { valid: true };
}

/**
 * Format scheduled time for display
 */
export function formatScheduledTime(
  scheduledAt: number,
  timezone?: string,
): string {
  const date = new Date(scheduledAt);
  const options: Intl.DateTimeFormatOptions = {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  };

  if (timezone) {
    options.timeZone = timezone;
  }

  // Add year if not current year
  const now = new Date();
  if (date.getFullYear() !== now.getFullYear()) {
    options.year = "numeric";
  }

  return date.toLocaleString("en-US", options);
}

/**
 * Get relative time string
 */
export function getRelativeTime(scheduledAt: number): string {
  const now = Date.now();
  const diff = scheduledAt - now;

  if (diff < 0) return "overdue";

  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return "less than a minute";
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? "" : "s"}`;
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"}`;
  return `${days} day${days === 1 ? "" : "s"}`;
}

/**
 * Check if a message is due for sending
 */
export function isMessageDue(message: ScheduledMessage): boolean {
  return message.status === "pending" && message.scheduledAt <= Date.now();
}

/**
 * Check if a message can be edited
 */
export function canEditMessage(message: ScheduledMessage): boolean {
  return message.status === "pending" || message.status === "failed";
}

/**
 * Check if a message can be cancelled
 */
export function canCancelMessage(message: ScheduledMessage): boolean {
  return message.status === "pending" || message.status === "failed";
}

/**
 * Check if a message can be retried
 */
export function canRetryMessage(message: ScheduledMessage): boolean {
  return (
    message.status === "failed" &&
    (message.retryCount || 0) < MAX_RETRY_ATTEMPTS
  );
}

/**
 * Calculate next occurrence for recurring message
 */
export function calculateNextOccurrence(
  message: ScheduledMessage,
  fromDate?: number,
): number | null {
  if (!message.recurrence) return null;

  const {
    frequency,
    interval,
    daysOfWeek,
    dayOfMonth,
    endDate,
    maxOccurrences,
    sentCount = 0,
  } = message.recurrence;

  // Check if max occurrences reached
  if (maxOccurrences && sentCount >= maxOccurrences) return null;

  const from = fromDate || message.scheduledAt;
  const date = new Date(from);

  switch (frequency) {
    case "daily":
      date.setDate(date.getDate() + interval);
      break;

    case "weekly":
      if (daysOfWeek && daysOfWeek.length > 0) {
        // Find next matching day of week
        let found = false;
        for (let i = 1; i <= 7 * interval && !found; i++) {
          const testDate = new Date(from);
          testDate.setDate(testDate.getDate() + i);
          if (daysOfWeek.includes(testDate.getDay())) {
            date.setTime(testDate.getTime());
            found = true;
          }
        }
        if (!found) return null;
      } else {
        date.setDate(date.getDate() + 7 * interval);
      }
      break;

    case "monthly":
      date.setMonth(date.getMonth() + interval);
      if (dayOfMonth) {
        const lastDay = new Date(
          date.getFullYear(),
          date.getMonth() + 1,
          0,
        ).getDate();
        date.setDate(Math.min(dayOfMonth, lastDay));
      }
      break;

    case "yearly":
      date.setFullYear(date.getFullYear() + interval);
      break;
  }

  const nextTime = date.getTime();

  // Check if past end date
  if (endDate && nextTime > endDate) return null;

  return nextTime;
}

/**
 * Sort scheduled messages by scheduled time
 */
export function sortByScheduledTime(
  messages: ScheduledMessage[],
  ascending = true,
): ScheduledMessage[] {
  return [...messages].sort((a, b) => {
    const diff = a.scheduledAt - b.scheduledAt;
    return ascending ? diff : -diff;
  });
}

/**
 * Group scheduled messages by date
 */
export function groupByDate(
  messages: ScheduledMessage[],
): Map<string, ScheduledMessage[]> {
  const groups = new Map<string, ScheduledMessage[]>();

  for (const message of messages) {
    const date = new Date(message.scheduledAt);
    const key = date.toISOString().split("T")[0]; // YYYY-MM-DD

    const existing = groups.get(key) || [];
    existing.push(message);
    groups.set(key, existing);
  }

  return groups;
}

// ============================================================================
// Initial State
// ============================================================================

const initialState: ScheduledMessagesState = {
  messages: new Map(),
  messagesByChannel: new Map(),
  messagesByUser: new Map(),
  isLoading: false,
  error: null,
};

// ============================================================================
// Store
// ============================================================================

export const useScheduledMessagesStore = create<ScheduledMessagesStore>()(
  devtools(
    persist(
      subscribeWithSelector(
        immer((set, get) => ({
          ...initialState,

          // ================================================================
          // CRUD Operations
          // ================================================================

          addMessage: (options) => {
            const now = Date.now();
            const scheduledAt =
              typeof options.scheduledAt === "number"
                ? options.scheduledAt
                : options.scheduledAt.getTime();

            const message: ScheduledMessage = {
              id: generateMessageId(),
              channelId: options.channelId,
              content: options.content,
              scheduledAt,
              createdAt: now,
              updatedAt: now,
              userId: options.userId,
              status: "pending",
              attachments: options.attachments,
              replyToId: options.replyToId,
              threadId: options.threadId,
              timezone: options.timezone,
              recurrence: options.recurrence,
            };

            set(
              (state) => {
                state.messages.set(message.id, message);

                // Add to channel index
                const channelMessages =
                  state.messagesByChannel.get(message.channelId) || new Set();
                channelMessages.add(message.id);
                state.messagesByChannel.set(message.channelId, channelMessages);

                // Add to user index
                const userMessages =
                  state.messagesByUser.get(message.userId) || new Set();
                userMessages.add(message.id);
                state.messagesByUser.set(message.userId, userMessages);
              },
              false,
              "scheduled/addMessage",
            );

            return message;
          },

          updateMessage: (id, options) => {
            const state = get();
            const message = state.messages.get(id);

            if (!message || !canEditMessage(message)) {
              return null;
            }

            const updated: ScheduledMessage = {
              ...message,
              content: options.content ?? message.content,
              scheduledAt: options.scheduledAt
                ? typeof options.scheduledAt === "number"
                  ? options.scheduledAt
                  : options.scheduledAt.getTime()
                : message.scheduledAt,
              attachments: options.attachments ?? message.attachments,
              replyToId: options.replyToId ?? message.replyToId,
              threadId: options.threadId ?? message.threadId,
              timezone: options.timezone ?? message.timezone,
              recurrence: options.recurrence ?? message.recurrence,
              updatedAt: Date.now(),
              // Reset status to pending if was failed
              status: message.status === "failed" ? "pending" : message.status,
              error: undefined,
            };

            set(
              (state) => {
                state.messages.set(id, updated);
              },
              false,
              "scheduled/updateMessage",
            );

            return updated;
          },

          cancelMessage: (id) => {
            const state = get();
            const message = state.messages.get(id);

            if (!message || !canCancelMessage(message)) {
              return false;
            }

            set(
              (state) => {
                const msg = state.messages.get(id);
                if (msg) {
                  msg.status = "cancelled";
                  msg.updatedAt = Date.now();
                }
              },
              false,
              "scheduled/cancelMessage",
            );

            return true;
          },

          deleteMessage: (id) => {
            const state = get();
            const message = state.messages.get(id);

            if (!message) {
              return false;
            }

            set(
              (state) => {
                state.messages.delete(id);

                // Remove from channel index
                const channelMessages = state.messagesByChannel.get(
                  message.channelId,
                );
                if (channelMessages) {
                  channelMessages.delete(id);
                }

                // Remove from user index
                const userMessages = state.messagesByUser.get(message.userId);
                if (userMessages) {
                  userMessages.delete(id);
                }
              },
              false,
              "scheduled/deleteMessage",
            );

            return true;
          },

          // ================================================================
          // Status Updates
          // ================================================================

          markSending: (id) =>
            set(
              (state) => {
                const message = state.messages.get(id);
                if (message && message.status === "pending") {
                  message.status = "sending";
                  message.updatedAt = Date.now();
                }
              },
              false,
              "scheduled/markSending",
            ),

          markSent: (id) =>
            set(
              (state) => {
                const message = state.messages.get(id);
                if (message) {
                  message.status = "sent";
                  message.updatedAt = Date.now();

                  // Handle recurring messages
                  if (message.recurrence) {
                    message.recurrence.sentCount =
                      (message.recurrence.sentCount || 0) + 1;
                    const nextOccurrence = calculateNextOccurrence(message);
                    if (nextOccurrence) {
                      // Create next occurrence
                      get().addMessage({
                        channelId: message.channelId,
                        content: message.content,
                        scheduledAt: nextOccurrence,
                        userId: message.userId,
                        attachments: message.attachments,
                        replyToId: message.replyToId,
                        threadId: message.threadId,
                        timezone: message.timezone,
                        recurrence: {
                          ...message.recurrence,
                          sentCount: message.recurrence.sentCount,
                        },
                      });
                    }
                  }
                }
              },
              false,
              "scheduled/markSent",
            ),

          markFailed: (id, error) =>
            set(
              (state) => {
                const message = state.messages.get(id);
                if (message) {
                  message.status = "failed";
                  message.error = error;
                  message.retryCount = (message.retryCount || 0) + 1;
                  message.updatedAt = Date.now();
                }
              },
              false,
              "scheduled/markFailed",
            ),

          retry: (id) =>
            set(
              (state) => {
                const message = state.messages.get(id);
                if (message && canRetryMessage(message)) {
                  message.status = "pending";
                  message.error = undefined;
                  message.scheduledAt = Date.now() + MIN_SCHEDULE_DELAY_MS;
                  message.updatedAt = Date.now();
                }
              },
              false,
              "scheduled/retry",
            ),

          // ================================================================
          // Queries
          // ================================================================

          getMessage: (id) => {
            return get().messages.get(id);
          },

          getMessages: (filter) => {
            const state = get();
            let messages = Array.from(state.messages.values());

            if (filter) {
              if (filter.channelId) {
                messages = messages.filter(
                  (m) => m.channelId === filter.channelId,
                );
              }
              if (filter.userId) {
                messages = messages.filter((m) => m.userId === filter.userId);
              }
              if (filter.status) {
                const statuses = Array.isArray(filter.status)
                  ? filter.status
                  : [filter.status];
                messages = messages.filter((m) => statuses.includes(m.status));
              }
              if (filter.fromDate) {
                const fromTime =
                  typeof filter.fromDate === "number"
                    ? filter.fromDate
                    : filter.fromDate.getTime();
                messages = messages.filter((m) => m.scheduledAt >= fromTime);
              }
              if (filter.toDate) {
                const toTime =
                  typeof filter.toDate === "number"
                    ? filter.toDate
                    : filter.toDate.getTime();
                messages = messages.filter((m) => m.scheduledAt <= toTime);
              }
            }

            return sortByScheduledTime(messages);
          },

          getMessagesByChannel: (channelId) => {
            return get().getMessages({ channelId });
          },

          getMessagesByUser: (userId) => {
            return get().getMessages({ userId });
          },

          getPendingMessages: () => {
            return get().getMessages({ status: "pending" });
          },

          getUpcomingMessages: (minutes = 60) => {
            const now = Date.now();
            return get().getMessages({
              status: "pending",
              fromDate: now,
              toDate: now + minutes * 60 * 1000,
            });
          },

          getOverdueMessages: () => {
            const state = get();
            return Array.from(state.messages.values()).filter(
              (m) => m.status === "pending" && m.scheduledAt < Date.now(),
            );
          },

          // ================================================================
          // Bulk Operations
          // ================================================================

          cancelAllForChannel: (channelId) => {
            const messages = get()
              .getMessagesByChannel(channelId)
              .filter(canCancelMessage);
            let count = 0;

            set(
              (state) => {
                for (const msg of messages) {
                  const message = state.messages.get(msg.id);
                  if (message && canCancelMessage(message)) {
                    message.status = "cancelled";
                    message.updatedAt = Date.now();
                    count++;
                  }
                }
              },
              false,
              "scheduled/cancelAllForChannel",
            );

            return count;
          },

          cancelAllForUser: (userId) => {
            const messages = get()
              .getMessagesByUser(userId)
              .filter(canCancelMessage);
            let count = 0;

            set(
              (state) => {
                for (const msg of messages) {
                  const message = state.messages.get(msg.id);
                  if (message && canCancelMessage(message)) {
                    message.status = "cancelled";
                    message.updatedAt = Date.now();
                    count++;
                  }
                }
              },
              false,
              "scheduled/cancelAllForUser",
            );

            return count;
          },

          // ================================================================
          // State Management
          // ================================================================

          setLoading: (loading) =>
            set(
              (state) => {
                state.isLoading = loading;
              },
              false,
              "scheduled/setLoading",
            ),

          setError: (error) =>
            set(
              (state) => {
                state.error = error;
              },
              false,
              "scheduled/setError",
            ),

          reset: () =>
            set(
              () => ({
                ...initialState,
                messages: new Map(),
                messagesByChannel: new Map(),
                messagesByUser: new Map(),
              }),
              false,
              "scheduled/reset",
            ),
        })),
      ),
      {
        name: "nchat-scheduled-messages",
        storage: {
          getItem: (name) => {
            const str = localStorage.getItem(name);
            if (!str) return null;
            try {
              const data = JSON.parse(str);
              return {
                ...data,
                state: {
                  ...data.state,
                  messages: new Map(data.state.messages || []),
                  messagesByChannel: new Map(
                    (data.state.messagesByChannel || []).map(
                      ([k, v]: [string, string[]]) => [k, new Set(v)],
                    ),
                  ),
                  messagesByUser: new Map(
                    (data.state.messagesByUser || []).map(
                      ([k, v]: [string, string[]]) => [k, new Set(v)],
                    ),
                  ),
                },
              };
            } catch {
              return null;
            }
          },
          setItem: (name, value) => {
            const state = value.state as ScheduledMessagesState;
            const data = {
              ...value,
              state: {
                ...state,
                messages: Array.from(state.messages.entries()),
                messagesByChannel: Array.from(
                  state.messagesByChannel.entries(),
                ).map(([k, v]) => [k, Array.from(v)]),
                messagesByUser: Array.from(state.messagesByUser.entries()).map(
                  ([k, v]) => [k, Array.from(v)],
                ),
              },
            };
            localStorage.setItem(name, JSON.stringify(data));
          },
          removeItem: (name) => localStorage.removeItem(name),
        },
        partialize: (state) => state as ScheduledMessagesStore,
      },
    ),
    { name: "scheduled-messages-store" },
  ),
);

// ============================================================================
// Selectors
// ============================================================================

export const selectScheduledMessage =
  (id: string) => (state: ScheduledMessagesStore) =>
    state.messages.get(id);

export const selectAllScheduledMessages = (state: ScheduledMessagesStore) =>
  Array.from(state.messages.values());

export const selectPendingMessages = (state: ScheduledMessagesStore) =>
  Array.from(state.messages.values()).filter((m) => m.status === "pending");

export const selectScheduledMessagesForChannel =
  (channelId: string) => (state: ScheduledMessagesStore) =>
    state.getMessagesByChannel(channelId);

export const selectScheduledMessagesForUser =
  (userId: string) => (state: ScheduledMessagesStore) =>
    state.getMessagesByUser(userId);

export const selectScheduledMessagesCount = (state: ScheduledMessagesStore) =>
  state.messages.size;

export const selectPendingMessagesCount = (state: ScheduledMessagesStore) =>
  Array.from(state.messages.values()).filter((m) => m.status === "pending")
    .length;

export const selectIsLoading = (state: ScheduledMessagesStore) =>
  state.isLoading;

export const selectError = (state: ScheduledMessagesStore) => state.error;
