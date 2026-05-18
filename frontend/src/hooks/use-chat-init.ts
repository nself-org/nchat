"use client";

/**
 * Chat Initialization Hook
 *
 * Handles initialization of the chat system including:
 * - Loading channels
 * - Loading direct messages
 * - Subscribing to real-time events
 * - Setting up notifications
 */

import { useEffect, useRef, useCallback, useState } from "react";
import { useQuery, useSubscription } from "@apollo/client";
import { useAuth } from "@/contexts/auth-context";
import { useChat } from "@/contexts/chat-context";
import { useChannelStore, type Channel } from "@/stores/channel-store";
import { useNotificationStore } from "@/stores/notification-store";
import { useUserStore } from "@/stores/user-store";
import { useAppStore } from "@/stores/app-store";
import { GET_CHANNELS, GET_USER_CHANNELS } from "@/graphql/queries/channels";

import { logger } from "@/lib/logger";

// =============================================================================
// Types
// =============================================================================

export interface UseChatInitOptions {
  /**
   * Skip initialization
   */
  skip?: boolean;

  /**
   * Callback when channels are loaded
   */
  onChannelsLoaded?: (channels: Channel[]) => void;

  /**
   * Callback when initialization fails
   */
  onError?: (error: Error) => void;

  /**
   * Auto-select first channel if none selected
   * @default true
   */
  autoSelectChannel?: boolean;
}

export interface UseChatInitReturn {
  /**
   * Whether chat is initializing
   */
  isInitializing: boolean;

  /**
   * Whether chat is ready
   */
  isReady: boolean;

  /**
   * Whether there was an error
   */
  hasError: boolean;

  /**
   * Error if initialization failed
   */
  error: Error | null;

  /**
   * Loaded channels
   */
  channels: Channel[];

  /**
   * Loaded direct messages
   */
  directMessages: Channel[];

  /**
   * Retry initialization
   */
  retry: () => void;

  /**
   * Refresh channels
   */
  refreshChannels: () => Promise<void>;
}

// =============================================================================
// GraphQL Subscription for new channels
// =============================================================================

const CHANNEL_SUBSCRIPTION = `
  subscription OnChannelUpdate {
    nchat_channels(
      where: { is_archived: { _eq: false } }
      order_by: { updated_at: desc }
      limit: 1
    ) {
      id
      name
      slug
      description
      type
      topic
      is_default
      created_at
      updated_at
    }
  }
`;

// =============================================================================
// Hook
// =============================================================================

export function useChatInit(
  options: UseChatInitOptions = {},
): UseChatInitReturn {
  const {
    skip = false,
    onChannelsLoaded,
    onError,
    autoSelectChannel = true,
  } = options;

  // Auth and chat contexts
  const { user } = useAuth();
  const { setActiveChannel, activeChannelId } = useChat();

  // Stores
  const channelStore = useChannelStore();
  const notificationStore = useNotificationStore();
  const userStore = useUserStore();
  const appStore = useAppStore();

  // Local state
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const initRef = useRef(false);

  // =============================================================================
  // Queries
  // =============================================================================

  // Fetch all channels
  const {
    data: channelsData,
    loading: channelsLoading,
    error: channelsError,
    refetch: refetchChannels,
  } = useQuery(GET_CHANNELS, {
    skip: skip || !user,
    fetchPolicy: "cache-and-network",
    notifyOnNetworkStatusChange: true,
    onCompleted: (data) => {
      if (data?.nchat_channels) {
        processChannels(data.nchat_channels);
      }
    },
    onError: (err) => {
      logger.error("[ChatInit] Failed to load channels:", err);
      setError(err);
      onError?.(err);
    },
  });

  // Fetch user's channel memberships
  const { data: userChannelsData, loading: userChannelsLoading } = useQuery(
    GET_USER_CHANNELS,
    {
      skip: skip || !user,
      variables: { userId: user?.id },
      fetchPolicy: "cache-and-network",
      onCompleted: (data) => {
        if (data?.nchat_channel_members) {
          processUserChannels(data.nchat_channel_members);
        }
      },
    },
  );

  // =============================================================================
  // Channel Processing
  // =============================================================================

  const processChannels = useCallback(
    (rawChannels: unknown[]) => {
      if (!rawChannels) return;

      const channels: Channel[] = (
        rawChannels as Record<string, unknown>[]
      ).map((ch) => ({
        id: ch.id as string,
        name: ch.name as string,
        slug: ch.slug as string,
        description: (ch.description as string) || null,
        type:
          (ch.type as "public" | "private" | "direct" | "group") || "public",
        categoryId: null,
        createdBy:
          ((ch.creator as Record<string, unknown>)?.id as string) || "",
        createdAt: ch.created_at as string,
        updatedAt: (ch.updated_at as string) || (ch.created_at as string),
        topic: (ch.topic as string) || null,
        icon: null,
        color: null,
        isArchived: false,
        isDefault: (ch.is_default as boolean) || false,
        memberCount:
          (ch.members_aggregate as { aggregate?: { count?: number } })
            ?.aggregate?.count || 0,
        lastMessageAt: null,
        lastMessagePreview: null,
      }));

      // Update channel store
      channelStore.setChannels(channels);

      // Notify callback
      onChannelsLoaded?.(channels);

      // Auto-select first channel if needed
      if (autoSelectChannel && !activeChannelId) {
        const defaultChannel = channels.find((c) => c.isDefault);
        const firstChannel = defaultChannel || channels[0];
        if (firstChannel) {
          // Check for last visited channel
          const lastVisited = appStore.lastVisitedChannel;
          const lastChannel = lastVisited
            ? channels.find((c) => c.id === lastVisited)
            : null;

          setActiveChannel(lastChannel?.id || firstChannel.id);
        }
      }
    },
    [
      channelStore,
      onChannelsLoaded,
      autoSelectChannel,
      activeChannelId,
      appStore.lastVisitedChannel,
      setActiveChannel,
    ],
  );

  const processUserChannels = useCallback(
    (memberships: unknown[]) => {
      if (!memberships) return; // Process read states and notification settings
      (memberships as Record<string, unknown>[]).forEach((membership) => {
        const channelId = (membership.channel as Record<string, unknown>)
          ?.id as string;
        if (!channelId) return;

        // Update notification settings
        if (membership.notifications_enabled !== undefined) {
          const isMuted = !(membership.notifications_enabled as boolean);
          if (isMuted) {
            notificationStore.muteChannel(channelId);
          } else {
            notificationStore.unmuteChannel(channelId);
          }
        }

        // Update last read time
        if (membership.last_read_at) {
          // This would update the read state in notification store
        }
      });
    },
    [notificationStore],
  );

  // =============================================================================
  // Subscriptions
  // =============================================================================

  // Subscribe to channel updates
  useEffect(() => {
    if (skip || !user) return;

    const handleChannelCreated = (event: CustomEvent<{ channel: Channel }>) => {
      channelStore.addChannel(event.detail.channel);
    };

    const handleChannelUpdated = (
      event: CustomEvent<{ channelId: string; updates: Partial<Channel> }>,
    ) => {
      channelStore.updateChannel(event.detail.channelId, event.detail.updates);
    };

    const handleChannelDeleted = (
      event: CustomEvent<{ channelId: string }>,
    ) => {
      channelStore.removeChannel(event.detail.channelId);
    };

    window.addEventListener(
      "nchat:channel-created" as keyof WindowEventMap,
      handleChannelCreated as EventListener,
    );
    window.addEventListener(
      "nchat:channel-updated" as keyof WindowEventMap,
      handleChannelUpdated as EventListener,
    );
    window.addEventListener(
      "nchat:channel-deleted" as keyof WindowEventMap,
      handleChannelDeleted as EventListener,
    );

    return () => {
      window.removeEventListener(
        "nchat:channel-created" as keyof WindowEventMap,
        handleChannelCreated as EventListener,
      );
      window.removeEventListener(
        "nchat:channel-updated" as keyof WindowEventMap,
        handleChannelUpdated as EventListener,
      );
      window.removeEventListener(
        "nchat:channel-deleted" as keyof WindowEventMap,
        handleChannelDeleted as EventListener,
      );
    };
  }, [skip, user, channelStore]);

  // Subscribe to presence updates
  useEffect(() => {
    if (skip || !user) return;

    const handlePresenceUpdate = (
      event: CustomEvent<{ userId: string; status: string }>,
    ) => {
      const { userId, status } = event.detail;
      userStore.setPresence(
        userId,
        status as "online" | "away" | "dnd" | "offline",
      );
    };

    window.addEventListener(
      "nchat:presence-update" as keyof WindowEventMap,
      handlePresenceUpdate as EventListener,
    );

    return () => {
      window.removeEventListener(
        "nchat:presence-update" as keyof WindowEventMap,
        handlePresenceUpdate as EventListener,
      );
    };
  }, [skip, user, userStore]);

  // =============================================================================
  // Notification Setup
  // =============================================================================

  useEffect(() => {
    if (skip || !user) return;

    // Request notification permission
    if (
      typeof window !== "undefined" &&
      "Notification" in window &&
      Notification.permission === "default"
    ) {
      Notification.requestPermission().then((permission) => {});
    }

    // Set up notification sound
    const handleNewMessage = (
      event: CustomEvent<{ channelId: string; message: unknown }>,
    ) => {
      const { channelId, message } = event.detail;
      const settings = appStore.settings;

      // Don't notify for own messages
      if ((message as Record<string, unknown>).userId === user.id) return;

      // Check if channel is muted (via channel settings)
      const channelSettings =
        notificationStore.preferences?.channelSettings?.[channelId];
      if (
        channelSettings?.muteUntil &&
        new Date(channelSettings.muteUntil) > new Date()
      ) {
        return;
      }

      // Increment unread count
      notificationStore.incrementUnreadCount(channelId);

      // Play sound if enabled
      if (settings.soundEnabled && activeChannelId !== channelId) {
        playNotificationSound();
      }

      // Show desktop notification if enabled
      if (settings.desktopNotifications && document.hidden) {
        showDesktopNotification(message as Record<string, unknown>);
      }
    };

    window.addEventListener(
      "nchat:new-message" as keyof WindowEventMap,
      handleNewMessage as EventListener,
    );

    return () => {
      window.removeEventListener(
        "nchat:new-message" as keyof WindowEventMap,
        handleNewMessage as EventListener,
      );
    };
  }, [skip, user, activeChannelId, appStore.settings, notificationStore]);

  // =============================================================================
  // Helpers
  // =============================================================================

  const playNotificationSound = useCallback(() => {
    try {
      const audio = new Audio("/sounds/notification.mp3");
      audio.volume = 0.5;
      audio.play().catch(() => {
        // Ignore autoplay errors
      });
    } catch {
      // Ignore errors
    }
  }, []);

  const showDesktopNotification = useCallback(
    (message: Record<string, unknown>) => {
      if (
        typeof window === "undefined" ||
        !("Notification" in window) ||
        Notification.permission !== "granted"
      ) {
        return;
      }

      const user = message.user as Record<string, unknown> | undefined;
      const notification = new Notification(
        (user?.displayName as string) || "New Message",
        {
          body: (message.content as string) || "",
          icon: "/icon-192.png",
          badge: "/icon-192.png",
          tag: `nchat-${message.id}`,
        },
      );

      notification.onclick = () => {
        window.focus();
        setActiveChannel(message.channelId as string);
        notification.close();
      };

      // Auto-close after 5 seconds
      setTimeout(() => notification.close(), 5000);
    },
    [setActiveChannel],
  );

  // =============================================================================
  // Initialization Complete
  // =============================================================================

  useEffect(() => {
    if (
      !channelsLoading &&
      !userChannelsLoading &&
      !error &&
      !initRef.current
    ) {
      initRef.current = true;
      setIsReady(true);
    }
  }, [channelsLoading, userChannelsLoading, error]);

  // =============================================================================
  // Retry
  // =============================================================================

  const retry = useCallback(() => {
    initRef.current = false;
    setError(null);
    setIsReady(false);
    refetchChannels();
  }, [refetchChannels]);

  // =============================================================================
  // Refresh
  // =============================================================================

  const refreshChannels = useCallback(async () => {
    try {
      await refetchChannels();
    } catch (err) {
      logger.error("[ChatInit] Failed to refresh channels:", err);
      throw err;
    }
  }, [refetchChannels]);

  // =============================================================================
  // Derived State
  // =============================================================================

  const channels = Array.from(channelStore.channels.values()).filter(
    (c) => c.type === "public" || c.type === "private",
  );

  const directMessages = Array.from(channelStore.channels.values()).filter(
    (c) => c.type === "direct" || c.type === "group",
  );

  // =============================================================================
  // Return
  // =============================================================================

  return {
    isInitializing: channelsLoading || userChannelsLoading,
    isReady,
    hasError: !!error || !!channelsError,
    error: error || channelsError || null,
    channels,
    directMessages,
    retry,
    refreshChannels,
  };
}

export default useChatInit;
