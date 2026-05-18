"use client";

/**
 * React Hook for Scheduled Messages
 *
 * Provides a convenient interface for working with scheduled messages,
 * including fetching, creating, updating, and deleting scheduled messages.
 *
 * @example
 * ```tsx
 * import { useScheduled } from '@/lib/scheduled/use-scheduled'
 *
 * function ChatInput() {
 *   const { scheduleMessage, isScheduling } = useScheduled()
 *
 *   const handleSchedule = async () => {
 *     await scheduleMessage({
 *       channelId: 'channel-123',
 *       content: 'Hello!',
 *       scheduledAt: new Date('2024-01-15T09:00:00'),
 *       timezone: 'America/New_York'
 *     })
 *   }
 * }
 * ```
 */

import { useCallback, useEffect, useMemo } from "react";
import { useMutation, useQuery } from "@apollo/client";
import {
  useScheduledStore,
  type ScheduledMessageDraft,
} from "./scheduled-store";
import {
  GET_SCHEDULED_MESSAGES,
  GET_CHANNEL_SCHEDULED_MESSAGES,
  GET_SCHEDULED_MESSAGES_COUNT,
  CREATE_SCHEDULED_MESSAGE,
  UPDATE_SCHEDULED_MESSAGE,
  DELETE_SCHEDULED_MESSAGE,
  SEND_SCHEDULED_NOW,
  BULK_CANCEL_SCHEDULED_MESSAGES,
  type ScheduledMessage,
} from "@/graphql/scheduled";
import { useFeatureEnabled } from "@/lib/features/hooks/use-feature";
import { FEATURES } from "@/lib/features/feature-flags";

// ============================================================================
// Types
// ============================================================================

export interface UseScheduledOptions {
  userId: string;
  channelId?: string;
  autoFetch?: boolean;
}

export interface UseScheduledReturn {
  // Data
  messages: ScheduledMessage[];
  messagesForChannel: ScheduledMessage[];
  pendingCount: number;
  nextScheduled: ScheduledMessage | undefined;
  isFeatureEnabled: boolean;

  // Loading States
  isLoading: boolean;
  isScheduling: boolean;
  isUpdating: boolean;
  isCancelling: boolean;
  isSendingNow: boolean;

  // Error State
  error: string | null;

  // Actions
  fetchScheduledMessages: () => Promise<void>;
  scheduleMessage: (
    draft: ScheduledMessageDraft,
  ) => Promise<ScheduledMessage | null>;
  updateScheduledMessage: (
    id: string,
    updates: Partial<ScheduledMessageDraft>,
  ) => Promise<ScheduledMessage | null>;
  cancelScheduledMessage: (id: string) => Promise<boolean>;
  sendNow: (id: string) => Promise<ScheduledMessage | null>;
  bulkCancel: (ids: string[]) => Promise<number>;

  // UI Helpers
  openScheduleModal: (channelId?: string, content?: string) => void;
  closeScheduleModal: () => void;
  editMessage: (message: ScheduledMessage) => void;
  getMessageById: (id: string) => ScheduledMessage | undefined;
}

// ============================================================================
// Hook Implementation
// ============================================================================

export function useScheduled({
  userId,
  channelId,
  autoFetch = true,
}: UseScheduledOptions): UseScheduledReturn {
  // Feature flag check
  const isFeatureEnabled = useFeatureEnabled(FEATURES.MESSAGES_SCHEDULE);

  // Store state
  const {
    messages,
    isLoading,
    error,
    setMessages,
    addMessage,
    updateMessage,
    removeMessage,
    setLoading,
    setError,
    openModal,
    closeModal,
    setEditingMessage,
    getMessageById,
    getMessagesForChannel,
    getPendingCount,
    getNextScheduled,
  } = useScheduledStore();

  // GraphQL queries and mutations
  const {
    data: scheduledData,
    loading: queryLoading,
    refetch,
  } = useQuery(GET_SCHEDULED_MESSAGES, {
    variables: { userId, channelId, status: "pending" },
    skip: !isFeatureEnabled || !autoFetch,
    fetchPolicy: "cache-and-network",
  });

  const [createMutation, { loading: createLoading }] = useMutation(
    CREATE_SCHEDULED_MESSAGE,
  );
  const [updateMutation, { loading: updateLoading }] = useMutation(
    UPDATE_SCHEDULED_MESSAGE,
  );
  const [deleteMutation, { loading: deleteLoading }] = useMutation(
    DELETE_SCHEDULED_MESSAGE,
  );
  const [sendNowMutation, { loading: sendNowLoading }] =
    useMutation(SEND_SCHEDULED_NOW);
  const [bulkCancelMutation] = useMutation(BULK_CANCEL_SCHEDULED_MESSAGES);

  // Sync query data to store
  useEffect(() => {
    if (scheduledData?.nchat_scheduled_messages) {
      setMessages(scheduledData.nchat_scheduled_messages);
    }
  }, [scheduledData, setMessages]);

  // Sync loading state
  useEffect(() => {
    setLoading(queryLoading);
  }, [queryLoading, setLoading]);

  // Memoized values
  const messagesForChannel = useMemo(
    () => (channelId ? getMessagesForChannel(channelId) : []),
    [channelId, getMessagesForChannel, messages],
  );

  const pendingCount = useMemo(
    () => getPendingCount(),
    [messages, getPendingCount],
  );

  const nextScheduled = useMemo(
    () => getNextScheduled(),
    [messages, getNextScheduled],
  );

  // Actions
  const fetchScheduledMessages = useCallback(async () => {
    if (!isFeatureEnabled) return;
    setLoading(true);
    setError(null);
    try {
      await refetch();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to fetch scheduled messages",
      );
    } finally {
      setLoading(false);
    }
  }, [isFeatureEnabled, refetch, setLoading, setError]);

  const scheduleMessage = useCallback(
    async (draft: ScheduledMessageDraft): Promise<ScheduledMessage | null> => {
      if (!isFeatureEnabled) {
        setError("Scheduled messages feature is not enabled");
        return null;
      }

      setError(null);
      try {
        const { data } = await createMutation({
          variables: {
            userId,
            channelId: draft.channelId,
            content: draft.content,
            scheduledAt: draft.scheduledAt.toISOString(),
            timezone: draft.timezone,
            type: draft.type || "text",
            metadata: draft.metadata,
          },
        });

        if (data?.insert_nchat_scheduled_messages_one) {
          const newMessage = data.insert_nchat_scheduled_messages_one;
          addMessage(newMessage);
          return newMessage;
        }
        return null;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to schedule message";
        setError(errorMessage);
        throw err;
      }
    },
    [isFeatureEnabled, userId, createMutation, addMessage, setError],
  );

  const updateScheduledMessage = useCallback(
    async (
      id: string,
      updates: Partial<ScheduledMessageDraft>,
    ): Promise<ScheduledMessage | null> => {
      if (!isFeatureEnabled) {
        setError("Scheduled messages feature is not enabled");
        return null;
      }

      setError(null);
      try {
        const { data } = await updateMutation({
          variables: {
            id,
            content: updates.content,
            scheduledAt: updates.scheduledAt?.toISOString(),
            timezone: updates.timezone,
            metadata: updates.metadata,
          },
        });

        if (data?.update_nchat_scheduled_messages_by_pk) {
          const updatedMessage = data.update_nchat_scheduled_messages_by_pk;
          updateMessage(id, updatedMessage);
          return updatedMessage;
        }
        return null;
      } catch (err) {
        const errorMessage =
          err instanceof Error
            ? err.message
            : "Failed to update scheduled message";
        setError(errorMessage);
        throw err;
      }
    },
    [isFeatureEnabled, updateMutation, updateMessage, setError],
  );

  const cancelScheduledMessage = useCallback(
    async (id: string): Promise<boolean> => {
      if (!isFeatureEnabled) {
        setError("Scheduled messages feature is not enabled");
        return false;
      }

      setError(null);
      try {
        const { data } = await deleteMutation({
          variables: { id },
        });

        if (data?.update_nchat_scheduled_messages_by_pk) {
          removeMessage(id);
          return true;
        }
        return false;
      } catch (err) {
        const errorMessage =
          err instanceof Error
            ? err.message
            : "Failed to cancel scheduled message";
        setError(errorMessage);
        throw err;
      }
    },
    [isFeatureEnabled, deleteMutation, removeMessage, setError],
  );

  const sendNow = useCallback(
    async (id: string): Promise<ScheduledMessage | null> => {
      if (!isFeatureEnabled) {
        setError("Scheduled messages feature is not enabled");
        return null;
      }

      setError(null);
      try {
        const { data } = await sendNowMutation({
          variables: { id },
        });

        if (data?.update_nchat_scheduled_messages_by_pk) {
          const sentMessage = data.update_nchat_scheduled_messages_by_pk;
          // Remove from pending list since it's being sent immediately
          removeMessage(id);
          return sentMessage;
        }
        return null;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to send message";
        setError(errorMessage);
        throw err;
      }
    },
    [isFeatureEnabled, sendNowMutation, removeMessage, setError],
  );

  const bulkCancel = useCallback(
    async (ids: string[]): Promise<number> => {
      if (!isFeatureEnabled) {
        setError("Scheduled messages feature is not enabled");
        return 0;
      }

      if (ids.length === 0) return 0;

      setError(null);
      try {
        const { data } = await bulkCancelMutation({
          variables: { ids },
        });

        if (data?.update_nchat_scheduled_messages?.affected_rows) {
          for (const id of ids) {
            removeMessage(id);
          }
          return data.update_nchat_scheduled_messages.affected_rows;
        }
        return 0;
      } catch (err) {
        const errorMessage =
          err instanceof Error
            ? err.message
            : "Failed to cancel scheduled messages";
        setError(errorMessage);
        throw err;
      }
    },
    [isFeatureEnabled, bulkCancelMutation, removeMessage, setError],
  );

  // UI Helpers
  const openScheduleModal = useCallback(
    (modalChannelId?: string, content?: string) => {
      openModal(modalChannelId || channelId, content);
    },
    [openModal, channelId],
  );

  const editMessage = useCallback(
    (message: ScheduledMessage) => {
      setEditingMessage(message);
    },
    [setEditingMessage],
  );

  return {
    // Data
    messages,
    messagesForChannel,
    pendingCount,
    nextScheduled,
    isFeatureEnabled,

    // Loading States
    isLoading: isLoading || queryLoading,
    isScheduling: createLoading,
    isUpdating: updateLoading,
    isCancelling: deleteLoading,
    isSendingNow: sendNowLoading,

    // Error State
    error,

    // Actions
    fetchScheduledMessages,
    scheduleMessage,
    updateScheduledMessage,
    cancelScheduledMessage,
    sendNow,
    bulkCancel,

    // UI Helpers
    openScheduleModal,
    closeScheduleModal: closeModal,
    editMessage,
    getMessageById,
  };
}

// ============================================================================
// Channel-specific Hook
// ============================================================================

/**
 * Hook to get scheduled messages for a specific channel
 */
export function useChannelScheduledMessages(userId: string, channelId: string) {
  const isFeatureEnabled = useFeatureEnabled(FEATURES.MESSAGES_SCHEDULE);
  const { getMessagesForChannel } = useScheduledStore();

  const { data, loading, error, refetch } = useQuery(
    GET_CHANNEL_SCHEDULED_MESSAGES,
    {
      variables: { channelId, userId },
      skip: !isFeatureEnabled || !channelId,
      fetchPolicy: "cache-and-network",
    },
  );

  const messages = useMemo(
    () => data?.nchat_scheduled_messages || getMessagesForChannel(channelId),
    [data, channelId, getMessagesForChannel],
  );

  return {
    messages,
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
 * Hook to get the count of pending scheduled messages
 */
export function useScheduledMessagesCount(userId: string) {
  const isFeatureEnabled = useFeatureEnabled(FEATURES.MESSAGES_SCHEDULE);
  const { getPendingCount } = useScheduledStore();

  const { data, loading } = useQuery(GET_SCHEDULED_MESSAGES_COUNT, {
    variables: { userId },
    skip: !isFeatureEnabled,
    pollInterval: 60000, // Poll every minute
  });

  const count = useMemo(
    () =>
      data?.nchat_scheduled_messages_aggregate?.aggregate?.count ??
      getPendingCount(),
    [data, getPendingCount],
  );

  return {
    count,
    loading,
    isFeatureEnabled,
  };
}
