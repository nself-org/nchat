"use client";

/**
 * useRealtimeIntegration Hook
 *
 * React hook for accessing the integrated realtime services.
 * Provides convenient access to:
 * - Connection status
 * - Presence tracking
 * - Typing indicators
 * - Delivery receipts
 * - Offline queue
 *
 * @module hooks/use-realtime-integration
 * @version 1.0.0
 */

import { useState, useEffect, useCallback } from "react";
import {
  getRealtimeIntegration,
  type IntegrationStatus,
} from "@/services/realtime/realtime-integration.service";
import type {
  PresenceStatus,
  CustomStatus,
  UserPresence,
} from "@/services/realtime/presence.service";
import type { TypingUser } from "@/services/realtime/typing.service";
import { logger } from "@/lib/logger";

// ============================================================================
// Types
// ============================================================================

export interface UseRealtimeIntegrationReturn {
  // Connection
  isConnected: boolean;
  isAuthenticated: boolean;
  isOnline: boolean;
  status: IntegrationStatus;
  reconnect: () => Promise<void>;
  disconnect: () => void;

  // Presence
  presence: {
    setStatus: (status: PresenceStatus) => void;
    setCustomStatus: (status: CustomStatus | null) => void;
    getStatus: () => PresenceStatus;
    getCustomStatus: () => CustomStatus | null;
    subscribeToUsers: (userIds: string[]) => void;
    unsubscribeFromUsers: (userIds: string[]) => void;
    getPresence: (userId: string) => UserPresence | undefined;
  } | null;

  // Typing
  typing: {
    startTyping: (channelId: string, threadId?: string) => void;
    stopTyping: (channelId?: string, threadId?: string) => void;
    handleInputChange: (
      channelId: string,
      value: string,
      threadId?: string,
    ) => void;
    getTypingUsers: (channelId: string, threadId?: string) => TypingUser[];
    getTypingText: (channelId: string, threadId?: string) => string | null;
  } | null;

  // Delivery
  delivery: {
    trackOutgoing: (
      clientMessageId: string,
      channelId: string,
      totalRecipients?: number,
    ) => void;
    acknowledgeRead: (messageId: string, channelId: string) => void;
    syncStatus: (messageIds: string[]) => Promise<void>;
  } | null;

  // Offline Queue
  queue: {
    queueMessage: (message: {
      channelId: string;
      content: string;
      type?: string;
      threadId?: string;
      mentions?: string[];
    }) => void;
    getQueuedMessages: () => unknown[];
    getQueueLength: () => number;
    clearQueue: () => void;
  } | null;
}

// ============================================================================
// Hook
// ============================================================================

/**
 * useRealtimeIntegration Hook
 *
 * Access integrated realtime services in React components
 *
 * @example
 * ```tsx
 * function ChatComponent() {
 *   const { isConnected, presence, typing, delivery } = useRealtimeIntegration()
 *
 *   useEffect(() => {
 *     if (presence) {
 *       presence.setStatus('online')
 *     }
 *   }, [presence])
 *
 *   const handleTyping = (value: string) => {
 *     if (typing) {
 *       typing.handleInputChange(channelId, value)
 *     }
 *   }
 *
 *   // ...
 * }
 * ```
 */
export function useRealtimeIntegration(): UseRealtimeIntegrationReturn {
  const [status, setStatus] = useState<IntegrationStatus>({
    connected: false,
    authenticated: false,
    presenceEnabled: false,
    typingEnabled: false,
    deliveryReceiptsEnabled: false,
    offlineQueueEnabled: false,
    queuedMessageCount: 0,
    connectionQuality: "unknown",
    reconnectAttempts: 0,
  });

  // Subscribe to status changes
  useEffect(() => {
    try {
      const integration = getRealtimeIntegration();

      if (!integration.initialized) {
        return;
      }

      const unsubscribe = integration.onStatusChange(setStatus);

      return () => {
        unsubscribe();
      };
    } catch (error) {
      logger.debug("[useRealtimeIntegration] Integration not initialized yet");
      return;
    }
  }, []);

  // Connection methods
  const reconnect = useCallback(async () => {
    try {
      const integration = getRealtimeIntegration();
      await integration.reconnect();
    } catch (error) {
      logger.error("[useRealtimeIntegration] Reconnect failed:", error);
      throw error;
    }
  }, []);

  const disconnect = useCallback(() => {
    try {
      const integration = getRealtimeIntegration();
      integration.disconnect();
    } catch (error) {
      logger.error("[useRealtimeIntegration] Disconnect failed:", error);
    }
  }, []);

  // Presence methods
  const presence = status.presenceEnabled
    ? {
        setStatus: (presenceStatus: PresenceStatus) => {
          try {
            const integration = getRealtimeIntegration();
            integration.getPresence().setStatus(presenceStatus);
          } catch (error) {
            logger.error("[useRealtimeIntegration] setStatus failed:", error);
          }
        },
        setCustomStatus: (customStatus: CustomStatus | null) => {
          try {
            const integration = getRealtimeIntegration();
            integration.getPresence().setCustomStatus(customStatus);
          } catch (error) {
            logger.error(
              "[useRealtimeIntegration] setCustomStatus failed:",
              error,
            );
          }
        },
        getStatus: () => {
          try {
            const integration = getRealtimeIntegration();
            return integration.getPresence().getStatus();
          } catch (error) {
            logger.error("[useRealtimeIntegration] getStatus failed:", error);
            return "offline" as PresenceStatus;
          }
        },
        getCustomStatus: () => {
          try {
            const integration = getRealtimeIntegration();
            return integration.getPresence().getCustomStatus();
          } catch (error) {
            logger.error(
              "[useRealtimeIntegration] getCustomStatus failed:",
              error,
            );
            return null;
          }
        },
        subscribeToUsers: (userIds: string[]) => {
          try {
            const integration = getRealtimeIntegration();
            integration.getPresence().subscribeToUsers(userIds);
          } catch (error) {
            logger.error(
              "[useRealtimeIntegration] subscribeToUsers failed:",
              error,
            );
          }
        },
        unsubscribeFromUsers: (userIds: string[]) => {
          try {
            const integration = getRealtimeIntegration();
            integration.getPresence().unsubscribeFromUsers(userIds);
          } catch (error) {
            logger.error(
              "[useRealtimeIntegration] unsubscribeFromUsers failed:",
              error,
            );
          }
        },
        getPresence: (userId: string) => {
          try {
            const integration = getRealtimeIntegration();
            return integration.getPresence().getPresence(userId);
          } catch (error) {
            logger.error("[useRealtimeIntegration] getPresence failed:", error);
            return undefined;
          }
        },
      }
    : null;

  // Typing methods
  const typing = status.typingEnabled
    ? {
        startTyping: (channelId: string, threadId?: string) => {
          try {
            const integration = getRealtimeIntegration();
            integration.getTyping().startTyping(channelId, threadId);
          } catch (error) {
            logger.error("[useRealtimeIntegration] startTyping failed:", error);
          }
        },
        stopTyping: (channelId?: string, threadId?: string) => {
          try {
            const integration = getRealtimeIntegration();
            integration.getTyping().stopTyping(channelId, threadId);
          } catch (error) {
            logger.error("[useRealtimeIntegration] stopTyping failed:", error);
          }
        },
        handleInputChange: (
          channelId: string,
          value: string,
          threadId?: string,
        ) => {
          try {
            const integration = getRealtimeIntegration();
            integration
              .getTyping()
              .handleInputChange(channelId, value, threadId);
          } catch (error) {
            logger.error(
              "[useRealtimeIntegration] handleInputChange failed:",
              error,
            );
          }
        },
        getTypingUsers: (channelId: string, threadId?: string) => {
          try {
            const integration = getRealtimeIntegration();
            return integration.getTyping().getTypingUsers(channelId, threadId);
          } catch (error) {
            logger.error(
              "[useRealtimeIntegration] getTypingUsers failed:",
              error,
            );
            return [];
          }
        },
        getTypingText: (channelId: string, threadId?: string) => {
          try {
            const integration = getRealtimeIntegration();
            return integration.getTyping().getTypingText(channelId, threadId);
          } catch (error) {
            logger.error(
              "[useRealtimeIntegration] getTypingText failed:",
              error,
            );
            return null;
          }
        },
      }
    : null;

  // Delivery methods
  const delivery = status.deliveryReceiptsEnabled
    ? {
        trackOutgoing: (
          clientMessageId: string,
          channelId: string,
          totalRecipients = 1,
        ) => {
          try {
            const integration = getRealtimeIntegration();
            integration
              .getDelivery()
              .trackOutgoingMessage(
                clientMessageId,
                channelId,
                totalRecipients,
              );
          } catch (error) {
            logger.error(
              "[useRealtimeIntegration] trackOutgoing failed:",
              error,
            );
          }
        },
        acknowledgeRead: (messageId: string, channelId: string) => {
          try {
            const integration = getRealtimeIntegration();
            integration.getDelivery().acknowledgeRead(messageId, channelId);
          } catch (error) {
            logger.error(
              "[useRealtimeIntegration] acknowledgeRead failed:",
              error,
            );
          }
        },
        syncStatus: async (messageIds: string[]) => {
          try {
            const integration = getRealtimeIntegration();
            await integration.getDelivery().syncDeliveryStatus(messageIds);
          } catch (error) {
            logger.error("[useRealtimeIntegration] syncStatus failed:", error);
          }
        },
      }
    : null;

  // Queue methods
  const queue = status.offlineQueueEnabled
    ? {
        queueMessage: (message: {
          channelId: string;
          content: string;
          type?: string;
          threadId?: string;
          mentions?: string[];
        }) => {
          try {
            const integration = getRealtimeIntegration();
            integration.getOfflineQueue().queueMessage({
              ...message,
              type: (message.type || "text") as
                | "text"
                | "file"
                | "image"
                | "voice"
                | "system",
            });
          } catch (error) {
            logger.error(
              "[useRealtimeIntegration] queueMessage failed:",
              error,
            );
          }
        },
        getQueuedMessages: () => {
          try {
            const integration = getRealtimeIntegration();
            return integration.getOfflineQueue().getQueuedMessages();
          } catch (error) {
            logger.error(
              "[useRealtimeIntegration] getQueuedMessages failed:",
              error,
            );
            return [];
          }
        },
        getQueueLength: () => {
          try {
            const integration = getRealtimeIntegration();
            return integration.getOfflineQueue().getQueueLength();
          } catch (error) {
            logger.error(
              "[useRealtimeIntegration] getQueueLength failed:",
              error,
            );
            return 0;
          }
        },
        clearQueue: () => {
          try {
            const integration = getRealtimeIntegration();
            integration.getOfflineQueue().clearQueue();
          } catch (error) {
            logger.error("[useRealtimeIntegration] clearQueue failed:", error);
          }
        },
      }
    : null;

  return {
    isConnected: status.connected,
    isAuthenticated: status.authenticated,
    isOnline: typeof navigator !== "undefined" ? navigator.onLine : true,
    status,
    reconnect,
    disconnect,
    presence,
    typing,
    delivery,
    queue,
  };
}

export default useRealtimeIntegration;
