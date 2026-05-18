"use client";

/**
 * useScheduledMessages Hook
 *
 * Hook for scheduling, editing, and managing scheduled messages.
 */

import { useCallback } from "react";
import { useAuth } from "@/contexts/auth-context";
import { useToast } from "@/hooks/use-toast";
import { logger } from "@/lib/logger";
import {
  useScheduledMessagesStore,
  type CreateScheduledMessageOptions,
  type UpdateScheduledMessageOptions,
} from "@/lib/messages/scheduled-messages";

export function useScheduledMessages(channelId?: string) {
  const { user } = useAuth();
  const { toast } = useToast();

  const store = useScheduledMessagesStore();

  const scheduleMessage = useCallback(
    async (options: CreateScheduledMessageOptions) => {
      if (!user) {
        toast({
          title: "Error",
          description: "You must be logged in to schedule messages",
          variant: "destructive",
        });
        return;
      }

      try {
        logger.debug("Scheduling message", { options });

        const message = store.addMessage({
          ...options,
          userId: user.id,
        });

        toast({
          title: "Message scheduled",
          description: `Your message will be sent at ${new Date(message.scheduledAt).toLocaleString()}`,
        });

        logger.info("Message scheduled successfully", {
          messageId: message.id,
        });
        return message;
      } catch (error) {
        logger.error(
          "Failed to schedule message",
          error instanceof Error ? error : new Error(String(error)),
        );
        toast({
          title: "Error",
          description:
            error instanceof Error
              ? error.message
              : "Failed to schedule message",
          variant: "destructive",
        });
        throw error;
      }
    },
    [user, store, toast],
  );

  const updateMessage = useCallback(
    async (messageId: string, options: UpdateScheduledMessageOptions) => {
      try {
        logger.debug("Updating scheduled message", { messageId, options });

        const updated = store.updateMessage(messageId, options);

        if (!updated) {
          throw new Error("Message not found or cannot be edited");
        }

        toast({
          title: "Message updated",
          description: "Your scheduled message has been updated",
        });

        logger.info("Scheduled message updated successfully", { messageId });
        return updated;
      } catch (error) {
        logger.error(
          "Failed to update scheduled message",
          error instanceof Error ? error : new Error(String(error)),
        );
        toast({
          title: "Error",
          description:
            error instanceof Error ? error.message : "Failed to update message",
          variant: "destructive",
        });
        throw error;
      }
    },
    [store, toast],
  );

  const cancelMessage = useCallback(
    (messageId: string) => {
      try {
        logger.debug("Canceling scheduled message", { messageId });

        const success = store.cancelMessage(messageId);

        if (!success) {
          throw new Error("Message not found or cannot be cancelled");
        }

        toast({
          title: "Message cancelled",
          description: "Your scheduled message has been cancelled",
        });

        logger.info("Scheduled message cancelled successfully", { messageId });
      } catch (error) {
        logger.error(
          "Failed to cancel scheduled message",
          error instanceof Error ? error : new Error(String(error)),
        );
        toast({
          title: "Error",
          description:
            error instanceof Error ? error.message : "Failed to cancel message",
          variant: "destructive",
        });
        throw error;
      }
    },
    [store, toast],
  );

  const deleteMessage = useCallback(
    (messageId: string) => {
      try {
        logger.debug("Deleting scheduled message", { messageId });

        const success = store.deleteMessage(messageId);

        if (!success) {
          throw new Error("Message not found");
        }

        toast({
          title: "Message deleted",
          description: "Your scheduled message has been deleted",
        });

        logger.info("Scheduled message deleted successfully", { messageId });
      } catch (error) {
        logger.error(
          "Failed to delete scheduled message",
          error instanceof Error ? error : new Error(String(error)),
        );
        toast({
          title: "Error",
          description:
            error instanceof Error ? error.message : "Failed to delete message",
          variant: "destructive",
        });
        throw error;
      }
    },
    [store, toast],
  );

  return {
    // Data
    messages: channelId
      ? store.getMessagesByChannel(channelId)
      : store.getMessages(),
    pendingMessages: store.getPendingMessages(),
    upcomingMessages: store.getUpcomingMessages(),
    overdueMessages: store.getOverdueMessages(),

    // Loading
    isLoading: store.isLoading,
    error: store.error,

    // Actions
    scheduleMessage,
    updateMessage,
    cancelMessage,
    deleteMessage,
    retryMessage: store.retry,

    // Store actions
    getMessage: store.getMessage,
    cancelAllForChannel: store.cancelAllForChannel,
  };
}
