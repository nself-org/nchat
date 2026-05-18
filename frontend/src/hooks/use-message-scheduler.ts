/**
 * Message Scheduler Hook
 *
 * React hook for managing message scheduler with automatic processing
 * and integration with message sending.
 */

import { useEffect, useCallback, useRef } from "react";
import { useAuth } from "@/contexts/auth-context";
import { useMessageMutations } from "@/hooks/use-messages";
import { useToast } from "@/hooks/use-toast";
import {
  getScheduler,
  destroyScheduler,
  type ScheduledMessage,
  type SendMessageFunction,
} from "@/lib/messaging/scheduler";
import { useScheduledMessagesStore } from "@/lib/messages/scheduled-messages";
import { logger } from "@/lib/logger";

export interface UseMessageSchedulerOptions {
  autoStart?: boolean;
  pollInterval?: number;
}

export interface UseMessageSchedulerReturn {
  isRunning: boolean;
  start: () => void;
  stop: () => void;
  sendNow: (messageId: string) => Promise<void>;
}

/**
 * Hook for managing the message scheduler
 */
export function useMessageScheduler(
  options: UseMessageSchedulerOptions = {},
): UseMessageSchedulerReturn {
  const { autoStart = true, pollInterval = 30000 } = options;
  const { user } = useAuth();
  const { sendMessage } = useMessageMutations();
  const { toast } = useToast();
  const schedulerRef = useRef<ReturnType<typeof getScheduler> | null>(null);
  const isRunningRef = useRef(false);

  // Zustand store actions
  const markSending = useScheduledMessagesStore((state) => state.markSending);
  const markSent = useScheduledMessagesStore((state) => state.markSent);
  const markFailed = useScheduledMessagesStore((state) => state.markFailed);

  /**
   * Send message function for scheduler
   */
  const schedulerSendMessage: SendMessageFunction = useCallback(
    async (message) => {
      try {
        // Mark as sending in store
        const storeMessage = useScheduledMessagesStore
          .getState()
          .getMessage(message.metadata?.scheduledMessageId as string);
        if (storeMessage) {
          markSending(storeMessage.id);
        }

        // Send the message
        const result = await sendMessage({
          channelId: message.channelId,
          content: message.content,
          replyToId: message.replyToId,
          threadId: message.threadId,
          attachments: message.attachments as Array<{
            url: string;
            type: string;
            name: string;
            size: number;
          }>,
          mentions: message.mentions as Array<{
            userId: string;
            displayName: string;
          }>,
          metadata: {
            ...message.metadata,
            wasScheduled: true,
            originalScheduledAt: message.scheduledAt,
          },
        });

        // Mark as sent in store
        if (storeMessage) {
          markSent(storeMessage.id);
        }

        logger.info("Scheduled message sent successfully", {
          messageId: result.id,
          scheduledMessageId: storeMessage?.id,
        });

        return { id: result.id };
      } catch (error) {
        logger.error("Failed to send scheduled message", error as Error);
        throw error;
      }
    },
    [sendMessage, markSending, markSent],
  );

  /**
   * Initialize scheduler
   */
  useEffect(() => {
    if (!user?.id) return;

    // Create scheduler instance
    schedulerRef.current = getScheduler(
      schedulerSendMessage,
      {
        pollInterval,
        maxRetries: 3,
        retryDelay: 60000, // 1 minute
        batchSize: 10,
        gracePeriod: 5000, // 5 seconds
      },
      {
        onMessageSent: (message) => {
          logger.info("Scheduler: Message sent", { id: message.id });
          toast({
            title: "Scheduled message sent",
            description: "Your scheduled message has been delivered.",
          });
        },
        onMessageFailed: (message, error) => {
          logger.error("Scheduler: Message failed", error, { id: message.id });

          // Mark as failed in store
          const storeMessage = useScheduledMessagesStore
            .getState()
            .getMessage(message.id);
          if (storeMessage) {
            markFailed(storeMessage.id, error.message);
          }

          toast({
            title: "Scheduled message failed",
            description: `Failed to send scheduled message: ${error.message}`,
            variant: "destructive",
          });
        },
        onMessageCancelled: (message) => {
          logger.info("Scheduler: Message cancelled", { id: message.id });
        },
      },
    );

    // Auto-start if enabled
    if (autoStart) {
      schedulerRef.current.start();
      isRunningRef.current = true;
    }

    // Sync scheduled messages from store to scheduler
    const storeMessages = useScheduledMessagesStore
      .getState()
      .getPendingMessages();
    for (const storeMessage of storeMessages) {
      schedulerRef.current
        .scheduleMessage({
          channelId: storeMessage.channelId,
          userId: storeMessage.userId,
          content: storeMessage.content,
          scheduledAt: storeMessage.scheduledAt,
          replyToId: storeMessage.replyToId,
          threadId: storeMessage.threadId,
          attachments: storeMessage.attachments,
          maxRetries: 3,
          metadata: {
            scheduledMessageId: storeMessage.id,
          },
        })
        .catch((error) => {
          logger.error("Failed to sync scheduled message to scheduler", error);
        });
    }

    // Cleanup on unmount
    return () => {
      if (schedulerRef.current) {
        schedulerRef.current.stop();
        isRunningRef.current = false;
      }
    };
  }, [
    user?.id,
    autoStart,
    pollInterval,
    schedulerSendMessage,
    toast,
    markFailed,
  ]);

  /**
   * Start scheduler
   */
  const start = useCallback(() => {
    if (schedulerRef.current && !isRunningRef.current) {
      schedulerRef.current.start();
      isRunningRef.current = true;
      logger.info("Message scheduler started manually");
    }
  }, []);

  /**
   * Stop scheduler
   */
  const stop = useCallback(() => {
    if (schedulerRef.current && isRunningRef.current) {
      schedulerRef.current.stop();
      isRunningRef.current = false;
      logger.info("Message scheduler stopped manually");
    }
  }, []);

  /**
   * Send a scheduled message immediately
   */
  const sendNow = useCallback(
    async (messageId: string) => {
      if (!schedulerRef.current) {
        throw new Error("Scheduler not initialized");
      }

      try {
        await schedulerRef.current.sendNow(messageId);
        logger.info("Scheduled message sent immediately", { messageId });

        toast({
          title: "Message sent",
          description: "Your scheduled message has been sent immediately.",
        });
      } catch (error) {
        logger.error(
          "Failed to send scheduled message immediately",
          error as Error,
          {
            messageId,
          },
        );

        toast({
          title: "Send failed",
          description: "Could not send the scheduled message.",
          variant: "destructive",
        });

        throw error;
      }
    },
    [toast],
  );

  return {
    isRunning: isRunningRef.current,
    start,
    stop,
    sendNow,
  };
}

/**
 * Hook for managing scheduled messages list
 */
export function useScheduledMessagesList(channelId?: string, userId?: string) {
  const { user } = useAuth();

  // Get messages from store
  const allMessages = useScheduledMessagesStore((state) =>
    state.getMessages({
      channelId,
      userId: userId || user?.id,
      status: ["pending", "sending", "failed"],
    }),
  );

  const pendingCount = useScheduledMessagesStore(
    (state) =>
      state.getMessages({
        channelId,
        userId: userId || user?.id,
        status: "pending",
      }).length,
  );

  const failedCount = useScheduledMessagesStore(
    (state) =>
      state.getMessages({
        channelId,
        userId: userId || user?.id,
        status: "failed",
      }).length,
  );

  const upcomingMessages = useScheduledMessagesStore((state) =>
    state.getUpcomingMessages(60),
  );

  const overdueMessages = useScheduledMessagesStore((state) =>
    state.getOverdueMessages(),
  );

  return {
    messages: allMessages,
    pendingCount,
    failedCount,
    upcomingMessages,
    overdueMessages,
  };
}

/**
 * Hook for managing a single scheduled message
 */
export function useScheduledMessage(messageId: string) {
  const { toast } = useToast();

  const message = useScheduledMessagesStore((state) =>
    state.getMessage(messageId),
  );
  const updateMessage = useScheduledMessagesStore(
    (state) => state.updateMessage,
  );
  const cancelMessage = useScheduledMessagesStore(
    (state) => state.cancelMessage,
  );
  const deleteMessage = useScheduledMessagesStore(
    (state) => state.deleteMessage,
  );
  const retry = useScheduledMessagesStore((state) => state.retry);

  const handleUpdate = useCallback(
    (updates: { content?: string; scheduledAt?: Date | number }) => {
      try {
        const updated = updateMessage(messageId, updates);
        if (updated) {
          toast({
            title: "Schedule updated",
            description: "Your scheduled message has been updated.",
          });
          return updated;
        } else {
          throw new Error("Could not update scheduled message");
        }
      } catch (error) {
        logger.error("Failed to update scheduled message", error as Error, {
          messageId,
        });
        toast({
          title: "Update failed",
          description: "Could not update the scheduled message.",
          variant: "destructive",
        });
        throw error;
      }
    },
    [messageId, updateMessage, toast],
  );

  const handleCancel = useCallback(() => {
    try {
      const cancelled = cancelMessage(messageId);
      if (cancelled) {
        toast({
          title: "Schedule cancelled",
          description: "Your scheduled message has been cancelled.",
        });
        return true;
      } else {
        throw new Error("Could not cancel scheduled message");
      }
    } catch (error) {
      logger.error("Failed to cancel scheduled message", error as Error, {
        messageId,
      });
      toast({
        title: "Cancel failed",
        description: "Could not cancel the scheduled message.",
        variant: "destructive",
      });
      throw error;
    }
  }, [messageId, cancelMessage, toast]);

  const handleDelete = useCallback(() => {
    try {
      const deleted = deleteMessage(messageId);
      if (deleted) {
        toast({
          title: "Message deleted",
          description: "The scheduled message has been removed.",
        });
        return true;
      } else {
        throw new Error("Could not delete scheduled message");
      }
    } catch (error) {
      logger.error("Failed to delete scheduled message", error as Error, {
        messageId,
      });
      toast({
        title: "Delete failed",
        description: "Could not delete the scheduled message.",
        variant: "destructive",
      });
      throw error;
    }
  }, [messageId, deleteMessage, toast]);

  const handleRetry = useCallback(() => {
    try {
      retry(messageId);
      toast({
        title: "Retry scheduled",
        description: "The message will be retried shortly.",
      });
    } catch (error) {
      logger.error("Failed to retry scheduled message", error as Error, {
        messageId,
      });
      toast({
        title: "Retry failed",
        description: "Could not retry the scheduled message.",
        variant: "destructive",
      });
      throw error;
    }
  }, [messageId, retry, toast]);

  return {
    message,
    updateMessage: handleUpdate,
    cancelMessage: handleCancel,
    deleteMessage: handleDelete,
    retryMessage: handleRetry,
  };
}
