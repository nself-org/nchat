"use client";

/**
 * React Hook for Reminders
 *
 * Provides a convenient interface for working with reminders,
 * including fetching, creating, updating, completing, snoozing, and deleting reminders.
 *
 * @example
 * ```tsx
 * import { useReminders } from '@/lib/reminders/use-reminders'
 *
 * function MessageActions({ messageId }) {
 *   const { setReminderForMessage, isCreating } = useReminders()
 *
 *   const handleRemind = async () => {
 *     await setReminderForMessage({
 *       messageId,
 *       remindAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
 *       timezone: 'America/New_York'
 *     })
 *   }
 * }
 * ```
 */

import { useCallback, useEffect, useMemo, useRef } from "react";
import { useMutation, useQuery, useSubscription } from "@apollo/client";
import {
  useReminderStore,
  type ReminderDraft,
  getUserTimezone,
} from "./reminder-store";
import {
  GET_REMINDERS,
  GET_UPCOMING_REMINDERS,
  GET_PAST_REMINDERS,
  GET_DUE_REMINDERS,
  GET_REMINDERS_COUNT,
  GET_MESSAGE_REMINDER,
  CREATE_REMINDER,
  UPDATE_REMINDER,
  DELETE_REMINDER,
  COMPLETE_REMINDER,
  DISMISS_REMINDER,
  SNOOZE_REMINDER,
  BULK_DELETE_REMINDERS,
  BULK_COMPLETE_REMINDERS,
  REMINDER_DUE_SUBSCRIPTION,
  type Reminder,
} from "@/graphql/reminders";
import { useFeatureEnabled } from "@/lib/features/hooks/use-feature";
import { FEATURES } from "@/lib/features/feature-flags";

// ============================================================================
// Types
// ============================================================================

export interface UseRemindersOptions {
  userId: string;
  channelId?: string;
  autoFetch?: boolean;
  pollInterval?: number;
}

export interface UseRemindersReturn {
  // Data
  reminders: Reminder[];
  upcomingReminders: Reminder[];
  completedReminders: Reminder[];
  dueReminders: Reminder[];
  pendingCount: number;
  nextReminder: Reminder | undefined;
  isFeatureEnabled: boolean;

  // Loading States
  isLoading: boolean;
  isCreating: boolean;
  isUpdating: boolean;
  isDeleting: boolean;
  isCompleting: boolean;
  isSnoozing: boolean;

  // Error State
  error: string | null;

  // Actions
  fetchReminders: () => Promise<void>;
  createReminder: (draft: ReminderDraft) => Promise<Reminder | null>;
  updateReminder: (
    id: string,
    updates: Partial<ReminderDraft>,
  ) => Promise<Reminder | null>;
  deleteReminder: (id: string) => Promise<boolean>;
  completeReminder: (id: string) => Promise<Reminder | null>;
  dismissReminder: (id: string) => Promise<boolean>;
  snoozeReminder: (id: string, duration: number) => Promise<Reminder | null>;
  bulkDelete: (ids: string[]) => Promise<number>;
  bulkComplete: (ids: string[]) => Promise<number>;

  // Message-specific Actions
  setReminderForMessage: (options: {
    messageId: string;
    channelId?: string;
    content?: string;
    remindAt: Date;
    timezone?: string;
    note?: string;
  }) => Promise<Reminder | null>;
  hasReminderForMessage: (messageId: string) => boolean;
  getReminderForMessage: (messageId: string) => Reminder | undefined;

  // UI Helpers
  openReminderModal: (options?: {
    messageId?: string;
    channelId?: string;
    content?: string;
  }) => void;
  closeReminderModal: () => void;
  editReminder: (reminder: Reminder) => void;
  getReminderById: (id: string) => Reminder | undefined;

  // Notification Helpers
  checkDueReminders: () => void;
  getActiveNotification: () => Reminder | undefined;
}

// ============================================================================
// Constants
// ============================================================================

const DEFAULT_POLL_INTERVAL = 60000; // 1 minute
const DUE_CHECK_INTERVAL = 30000; // 30 seconds

// ============================================================================
// Hook Implementation
// ============================================================================

export function useReminders({
  userId,
  channelId,
  autoFetch = true,
  pollInterval = DEFAULT_POLL_INTERVAL,
}: UseRemindersOptions): UseRemindersReturn {
  // Feature flag check
  const isFeatureEnabled = useFeatureEnabled(FEATURES.REMINDERS);

  // Track due check interval
  const dueCheckIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Store state
  const {
    reminders,
    dueReminders,
    completedReminders,
    isLoading,
    error,
    activeNotificationId,
    setReminders,
    addReminder,
    updateReminder: updateReminderInStore,
    removeReminder,
    setDueReminders,
    setCompletedReminders,
    setLoading,
    setError,
    openModal,
    closeModal,
    setEditingReminder,
    getReminderById,
    getRemindersForMessage,
    getPendingCount,
    getNextReminder,
    showNotification,
  } = useReminderStore();

  // GraphQL queries
  const {
    data: remindersData,
    loading: queryLoading,
    refetch,
  } = useQuery(GET_REMINDERS, {
    variables: { userId, status: "pending", channelId },
    skip: !isFeatureEnabled || !autoFetch,
    fetchPolicy: "cache-and-network",
    pollInterval,
  });

  const { data: pastData, refetch: refetchPast } = useQuery(
    GET_PAST_REMINDERS,
    {
      variables: { userId },
      skip: !isFeatureEnabled || !autoFetch,
      fetchPolicy: "cache-and-network",
    },
  );

  const { data: dueData, refetch: refetchDue } = useQuery(GET_DUE_REMINDERS, {
    variables: { userId, now: new Date().toISOString() },
    skip: !isFeatureEnabled,
    fetchPolicy: "network-only",
  });

  // GraphQL mutations
  const [createMutation, { loading: createLoading }] =
    useMutation(CREATE_REMINDER);
  const [updateMutation, { loading: updateLoading }] =
    useMutation(UPDATE_REMINDER);
  const [deleteMutation, { loading: deleteLoading }] =
    useMutation(DELETE_REMINDER);
  const [completeMutation, { loading: completeLoading }] =
    useMutation(COMPLETE_REMINDER);
  const [dismissMutation] = useMutation(DISMISS_REMINDER);
  const [snoozeMutation, { loading: snoozeLoading }] =
    useMutation(SNOOZE_REMINDER);
  const [bulkDeleteMutation] = useMutation(BULK_DELETE_REMINDERS);
  const [bulkCompleteMutation] = useMutation(BULK_COMPLETE_REMINDERS);

  // Subscription for due reminders
  useSubscription(REMINDER_DUE_SUBSCRIPTION, {
    variables: { userId, now: new Date().toISOString() },
    skip: !isFeatureEnabled,
    onData: ({ data }) => {
      if (data?.data?.nchat_reminders) {
        setDueReminders(data.data.nchat_reminders);
        // Show notification for the first due reminder
        if (data.data.nchat_reminders.length > 0) {
          showNotification(data.data.nchat_reminders[0].id);
        }
      }
    },
  });

  // Sync query data to store
  useEffect(() => {
    if (remindersData?.nchat_reminders) {
      setReminders(remindersData.nchat_reminders);
    }
  }, [remindersData, setReminders]);

  useEffect(() => {
    if (pastData?.nchat_reminders) {
      setCompletedReminders(pastData.nchat_reminders);
    }
  }, [pastData, setCompletedReminders]);

  useEffect(() => {
    if (dueData?.nchat_reminders) {
      setDueReminders(dueData.nchat_reminders);
    }
  }, [dueData, setDueReminders]);

  // Sync loading state
  useEffect(() => {
    setLoading(queryLoading);
  }, [queryLoading, setLoading]);

  // Set up periodic due reminder checks
  useEffect(() => {
    if (!isFeatureEnabled) return;

    const checkDue = () => {
      refetchDue({
        now: new Date().toISOString(),
      });
    };

    dueCheckIntervalRef.current = setInterval(checkDue, DUE_CHECK_INTERVAL);

    return () => {
      if (dueCheckIntervalRef.current) {
        clearInterval(dueCheckIntervalRef.current);
      }
    };
  }, [isFeatureEnabled, refetchDue]);

  // Memoized values
  const upcomingReminders = useMemo(
    () => reminders.filter((r) => r.status === "pending"),
    [reminders],
  );

  const pendingCount = useMemo(
    () => getPendingCount(),
    [reminders, getPendingCount],
  );

  const nextReminder = useMemo(
    () => getNextReminder(),
    [reminders, getNextReminder],
  );

  // Actions
  const fetchReminders = useCallback(async () => {
    if (!isFeatureEnabled) return;
    setLoading(true);
    setError(null);
    try {
      await Promise.all([refetch(), refetchPast(), refetchDue()]);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to fetch reminders",
      );
    } finally {
      setLoading(false);
    }
  }, [
    isFeatureEnabled,
    refetch,
    refetchPast,
    refetchDue,
    setLoading,
    setError,
  ]);

  const createReminder = useCallback(
    async (draft: ReminderDraft): Promise<Reminder | null> => {
      if (!isFeatureEnabled) {
        setError("Reminders feature is not enabled");
        return null;
      }

      setError(null);
      try {
        const { data } = await createMutation({
          variables: {
            userId,
            messageId: draft.messageId,
            channelId: draft.channelId,
            content: draft.content,
            note: draft.note,
            remindAt: draft.remindAt.toISOString(),
            timezone: draft.timezone,
            type: draft.type,
            isRecurring: draft.isRecurring,
            recurrenceRule: draft.recurrenceRule,
          },
        });

        if (data?.insert_nchat_reminders_one) {
          const newReminder = data.insert_nchat_reminders_one;
          addReminder(newReminder);
          return newReminder;
        }
        return null;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to create reminder";
        setError(errorMessage);
        throw err;
      }
    },
    [isFeatureEnabled, userId, createMutation, addReminder, setError],
  );

  const updateReminderAction = useCallback(
    async (
      id: string,
      updates: Partial<ReminderDraft>,
    ): Promise<Reminder | null> => {
      if (!isFeatureEnabled) {
        setError("Reminders feature is not enabled");
        return null;
      }

      setError(null);
      try {
        const { data } = await updateMutation({
          variables: {
            id,
            content: updates.content,
            note: updates.note,
            remindAt: updates.remindAt?.toISOString(),
            timezone: updates.timezone,
            isRecurring: updates.isRecurring,
            recurrenceRule: updates.recurrenceRule,
          },
        });

        if (data?.update_nchat_reminders_by_pk) {
          const updatedReminder = data.update_nchat_reminders_by_pk;
          updateReminderInStore(id, updatedReminder);
          return updatedReminder;
        }
        return null;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to update reminder";
        setError(errorMessage);
        throw err;
      }
    },
    [isFeatureEnabled, updateMutation, updateReminderInStore, setError],
  );

  const deleteReminder = useCallback(
    async (id: string): Promise<boolean> => {
      if (!isFeatureEnabled) {
        setError("Reminders feature is not enabled");
        return false;
      }

      setError(null);
      try {
        const { data } = await deleteMutation({
          variables: { id },
        });

        if (data?.delete_nchat_reminders_by_pk) {
          removeReminder(id);
          return true;
        }
        return false;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to delete reminder";
        setError(errorMessage);
        throw err;
      }
    },
    [isFeatureEnabled, deleteMutation, removeReminder, setError],
  );

  const completeReminder = useCallback(
    async (id: string): Promise<Reminder | null> => {
      if (!isFeatureEnabled) {
        setError("Reminders feature is not enabled");
        return null;
      }

      setError(null);
      try {
        const { data } = await completeMutation({
          variables: { id },
        });

        if (data?.update_nchat_reminders_by_pk) {
          const completedReminder = data.update_nchat_reminders_by_pk;
          updateReminderInStore(id, completedReminder);
          return completedReminder;
        }
        return null;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to complete reminder";
        setError(errorMessage);
        throw err;
      }
    },
    [isFeatureEnabled, completeMutation, updateReminderInStore, setError],
  );

  const dismissReminderAction = useCallback(
    async (id: string): Promise<boolean> => {
      if (!isFeatureEnabled) {
        setError("Reminders feature is not enabled");
        return false;
      }

      setError(null);
      try {
        const { data } = await dismissMutation({
          variables: { id },
        });

        if (data?.update_nchat_reminders_by_pk) {
          updateReminderInStore(id, { status: "dismissed" });
          return true;
        }
        return false;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to dismiss reminder";
        setError(errorMessage);
        throw err;
      }
    },
    [isFeatureEnabled, dismissMutation, updateReminderInStore, setError],
  );

  const snoozeReminderAction = useCallback(
    async (id: string, duration: number): Promise<Reminder | null> => {
      if (!isFeatureEnabled) {
        setError("Reminders feature is not enabled");
        return null;
      }

      setError(null);
      try {
        const snoozedUntil = new Date(Date.now() + duration);
        const { data } = await snoozeMutation({
          variables: {
            id,
            snoozedUntil: snoozedUntil.toISOString(),
          },
        });

        if (data?.update_nchat_reminders_by_pk) {
          const snoozedReminder = data.update_nchat_reminders_by_pk;
          updateReminderInStore(id, snoozedReminder);
          return snoozedReminder;
        }
        return null;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to snooze reminder";
        setError(errorMessage);
        throw err;
      }
    },
    [isFeatureEnabled, snoozeMutation, updateReminderInStore, setError],
  );

  const bulkDelete = useCallback(
    async (ids: string[]): Promise<number> => {
      if (!isFeatureEnabled) {
        setError("Reminders feature is not enabled");
        return 0;
      }

      if (ids.length === 0) return 0;

      setError(null);
      try {
        const { data } = await bulkDeleteMutation({
          variables: { ids },
        });

        if (data?.delete_nchat_reminders?.affected_rows) {
          for (const id of ids) {
            removeReminder(id);
          }
          return data.delete_nchat_reminders.affected_rows;
        }
        return 0;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to delete reminders";
        setError(errorMessage);
        throw err;
      }
    },
    [isFeatureEnabled, bulkDeleteMutation, removeReminder, setError],
  );

  const bulkComplete = useCallback(
    async (ids: string[]): Promise<number> => {
      if (!isFeatureEnabled) {
        setError("Reminders feature is not enabled");
        return 0;
      }

      if (ids.length === 0) return 0;

      setError(null);
      try {
        const { data } = await bulkCompleteMutation({
          variables: { ids },
        });

        if (data?.update_nchat_reminders?.affected_rows) {
          for (const id of ids) {
            updateReminderInStore(id, {
              status: "completed",
              completed_at: new Date().toISOString(),
            });
          }
          return data.update_nchat_reminders.affected_rows;
        }
        return 0;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to complete reminders";
        setError(errorMessage);
        throw err;
      }
    },
    [isFeatureEnabled, bulkCompleteMutation, updateReminderInStore, setError],
  );

  // Message-specific actions
  const setReminderForMessage = useCallback(
    async (options: {
      messageId: string;
      channelId?: string;
      content?: string;
      remindAt: Date;
      timezone?: string;
      note?: string;
    }): Promise<Reminder | null> => {
      return createReminder({
        messageId: options.messageId,
        channelId: options.channelId,
        content: options.content || "Reminder for message",
        note: options.note,
        remindAt: options.remindAt,
        timezone: options.timezone || getUserTimezone(),
        type: "message",
        isRecurring: false,
      });
    },
    [createReminder],
  );

  const hasReminderForMessage = useCallback(
    (messageId: string): boolean => {
      const messageReminders = getRemindersForMessage(messageId);
      return messageReminders.some((r) => r.status === "pending");
    },
    [getRemindersForMessage],
  );

  const getReminderForMessage = useCallback(
    (messageId: string): Reminder | undefined => {
      const messageReminders = getRemindersForMessage(messageId);
      return messageReminders.find((r) => r.status === "pending");
    },
    [getRemindersForMessage],
  );

  // UI Helpers
  const openReminderModal = useCallback(
    (options?: {
      messageId?: string;
      channelId?: string;
      content?: string;
    }) => {
      openModal(options);
    },
    [openModal],
  );

  const editReminder = useCallback(
    (reminder: Reminder) => {
      setEditingReminder(reminder);
    },
    [setEditingReminder],
  );

  // Notification helpers
  const checkDueReminders = useCallback(() => {
    refetchDue({
      now: new Date().toISOString(),
    });
  }, [refetchDue]);

  const getActiveNotification = useCallback((): Reminder | undefined => {
    if (!activeNotificationId) return undefined;
    return getReminderById(activeNotificationId);
  }, [activeNotificationId, getReminderById]);

  return {
    // Data
    reminders,
    upcomingReminders,
    completedReminders,
    dueReminders,
    pendingCount,
    nextReminder,
    isFeatureEnabled,

    // Loading States
    isLoading: isLoading || queryLoading,
    isCreating: createLoading,
    isUpdating: updateLoading,
    isDeleting: deleteLoading,
    isCompleting: completeLoading,
    isSnoozing: snoozeLoading,

    // Error State
    error,

    // Actions
    fetchReminders,
    createReminder,
    updateReminder: updateReminderAction,
    deleteReminder,
    completeReminder,
    dismissReminder: dismissReminderAction,
    snoozeReminder: snoozeReminderAction,
    bulkDelete,
    bulkComplete,

    // Message-specific Actions
    setReminderForMessage,
    hasReminderForMessage,
    getReminderForMessage,

    // UI Helpers
    openReminderModal,
    closeReminderModal: closeModal,
    editReminder,
    getReminderById,

    // Notification Helpers
    checkDueReminders,
    getActiveNotification,
  };
}

// ============================================================================
// Channel-specific Hook
// ============================================================================

/**
 * Hook to get reminders for a specific channel
 */
export function useChannelReminders(userId: string, channelId: string) {
  const isFeatureEnabled = useFeatureEnabled(FEATURES.REMINDERS);
  const { getRemindersForChannel } = useReminderStore();

  const { data, loading, error, refetch } = useQuery(GET_REMINDERS, {
    variables: { userId, channelId, status: "pending" },
    skip: !isFeatureEnabled || !channelId,
    fetchPolicy: "cache-and-network",
  });

  const reminders = useMemo(
    () => data?.nchat_reminders || getRemindersForChannel(channelId),
    [data, channelId, getRemindersForChannel],
  );

  return {
    reminders,
    loading,
    error: error?.message || null,
    refetch,
    isFeatureEnabled,
  };
}

// ============================================================================
// Count Hook
// ============================================================================

/**
 * Hook to get the count of pending reminders
 */
export function useRemindersCount(userId: string) {
  const isFeatureEnabled = useFeatureEnabled(FEATURES.REMINDERS);
  const { getPendingCount } = useReminderStore();

  const { data, loading } = useQuery(GET_REMINDERS_COUNT, {
    variables: { userId },
    skip: !isFeatureEnabled,
    pollInterval: 60000, // Poll every minute
  });

  const count = useMemo(
    () =>
      data?.nchat_reminders_aggregate?.aggregate?.count ?? getPendingCount(),
    [data, getPendingCount],
  );

  return {
    count,
    loading,
    isFeatureEnabled,
  };
}

// ============================================================================
// Message Reminder Hook
// ============================================================================

/**
 * Hook to check if a message has a pending reminder
 */
export function useMessageReminder(userId: string, messageId: string) {
  const isFeatureEnabled = useFeatureEnabled(FEATURES.REMINDERS);

  const { data, loading, refetch } = useQuery(GET_MESSAGE_REMINDER, {
    variables: { userId, messageId },
    skip: !isFeatureEnabled || !messageId,
    fetchPolicy: "cache-and-network",
  });

  const reminder = useMemo(() => data?.nchat_reminders?.[0] || null, [data]);

  return {
    reminder,
    hasReminder: !!reminder,
    loading,
    refetch,
    isFeatureEnabled,
  };
}
