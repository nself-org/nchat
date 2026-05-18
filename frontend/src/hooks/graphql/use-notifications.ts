"use client";

import { useCallback, useMemo, useEffect } from "react";
import {
  useQuery,
  useMutation,
  useSubscription,
  type ApolloError,
} from "@apollo/client";
import { useAuth } from "@/contexts/auth-context";
import {
  GET_NOTIFICATIONS,
  GET_UNREAD_COUNT,
  GET_UNREAD_BY_CHANNEL,
  GET_NOTIFICATION_PREFERENCES,
  GET_NOTIFICATIONS_GROUPED,
  MARK_AS_READ,
  MARK_MULTIPLE_AS_READ,
  MARK_ALL_AS_READ,
  UPDATE_NOTIFICATION_PREFERENCES,
  MUTE_CHANNEL_NOTIFICATIONS,
  UNMUTE_CHANNEL_NOTIFICATIONS,
  DELETE_NOTIFICATION,
  DELETE_ALL_NOTIFICATIONS,
  REGISTER_PUSH_TOKEN,
  UNREGISTER_PUSH_TOKEN,
  NOTIFICATION_SUBSCRIPTION,
  UNREAD_COUNT_SUBSCRIPTION,
  NOTIFICATION_STREAM_SUBSCRIPTION,
  CHANNEL_UNREAD_SUBSCRIPTION,
  type NotificationType,
} from "@/graphql/notifications";

// ============================================================================
// TYPES
// ============================================================================

export type { NotificationType };

export interface NotificationActor {
  id: string;
  username: string;
  display_name: string;
  avatar_url?: string;
}

export interface NotificationChannel {
  id: string;
  name: string;
  slug: string;
}

export interface NotificationMessage {
  id: string;
  content: string;
}

export interface Notification {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  is_read: boolean;
  read_at?: string;
  created_at: string;
  actor?: NotificationActor;
  channel?: NotificationChannel;
  message?: NotificationMessage;
}

export interface UnreadCounts {
  total: number;
  mentions: number;
  dms: number;
  threads: number;
}

export interface ChannelUnread {
  channel_id: string;
  channel: {
    id: string;
    name: string;
    slug: string;
  };
  unread_count: number;
  has_mention: boolean;
  last_read_at?: string;
}

export interface NotificationPreferences {
  email?: boolean;
  push?: boolean;
  desktop?: boolean;
  mentions?: boolean;
  directMessages?: boolean;
  threads?: boolean;
  channelUpdates?: boolean;
  quietHoursStart?: string;
  quietHoursEnd?: string;
  mutedChannels?: string[];
}

export interface MutedChannel {
  channel_id: string;
  channel: {
    id: string;
    name: string;
  };
  notifications_enabled: boolean;
  muted_until?: string;
}

// Hook return types
export interface UseNotificationsReturn {
  notifications: Notification[];
  totalCount: number;
  hasMore: boolean;
  loading: boolean;
  error: ApolloError | undefined;
  loadMore: () => Promise<void>;
  refetch: () => Promise<void>;
}

export interface UseUnreadCountReturn {
  counts: UnreadCounts;
  loading: boolean;
  error: ApolloError | undefined;
  refetch: () => Promise<void>;
}

export interface UseUnreadByChannelReturn {
  channelUnreads: ChannelUnread[];
  loading: boolean;
  error: ApolloError | undefined;
  refetch: () => Promise<void>;
}

export interface UseMarkAsReadReturn {
  markAsRead: (notificationId: string) => Promise<boolean>;
  markMultipleAsRead: (notificationIds: string[]) => Promise<number>;
  markAllAsRead: (channelId?: string) => Promise<number>;
  loading: boolean;
  error: ApolloError | undefined;
}

export interface UseNotificationPreferencesReturn {
  preferences: NotificationPreferences | null;
  mutedChannels: MutedChannel[];
  loading: boolean;
  error: ApolloError | undefined;
  updatePreferences: (preferences: NotificationPreferences) => Promise<boolean>;
  muteChannel: (channelId: string, until?: string) => Promise<boolean>;
  unmuteChannel: (channelId: string) => Promise<boolean>;
  refetch: () => Promise<void>;
}

export interface UseDeleteNotificationsReturn {
  deleteNotification: (notificationId: string) => Promise<boolean>;
  deleteAllNotifications: () => Promise<number>;
  loading: boolean;
  error: ApolloError | undefined;
}

export interface UsePushNotificationsReturn {
  registerToken: (
    token: string,
    platform: string,
    deviceId?: string,
  ) => Promise<boolean>;
  unregisterToken: (token: string) => Promise<boolean>;
  loading: boolean;
  error: ApolloError | undefined;
}

// ============================================================================
// HOOKS
// ============================================================================

/**
 * Fetch notifications with pagination and real-time updates
 */
export function useNotifications(options?: {
  limit?: number;
  unreadOnly?: boolean;
  type?: NotificationType;
  autoSubscribe?: boolean;
}): UseNotificationsReturn {
  const {
    limit = 50,
    unreadOnly = false,
    type,
    autoSubscribe = true,
  } = options ?? {};
  const { user } = useAuth();

  const { data, loading, error, fetchMore, refetch } = useQuery(
    GET_NOTIFICATIONS,
    {
      variables: {
        userId: user?.id,
        limit,
        offset: 0,
        unreadOnly,
        type,
      },
      skip: !user?.id,
      fetchPolicy: "cache-and-network",
    },
  );

  // Subscribe to new notifications
  useSubscription(NOTIFICATION_SUBSCRIPTION, {
    variables: { userId: user?.id },
    skip: !user?.id || !autoSubscribe,
    onData: ({ client, data: subData }) => {
      if (subData.data?.nchat_notifications?.[0]) {
        const newNotification = subData.data.nchat_notifications[0];

        client.cache.modify({
          fields: {
            nchat_notifications(
              existingNotifications = [],
              { readField, toReference },
            ) {
              const exists = existingNotifications.some(
                (notifRef: { __ref: string }) =>
                  readField("id", notifRef) === newNotification.id,
              );
              if (exists) return existingNotifications;

              const newRef = toReference(newNotification);
              return [newRef, ...existingNotifications];
            },
          },
        });
      }
    },
  });

  const notifications = useMemo(() => {
    return data?.nchat_notifications ?? [];
  }, [data]);

  const totalCount = data?.nchat_notifications_aggregate?.aggregate?.count ?? 0;
  const hasMore = notifications.length < totalCount;

  const loadMore = useCallback(async () => {
    if (!hasMore || loading) return;

    await fetchMore({
      variables: {
        userId: user?.id,
        limit,
        offset: notifications.length,
        unreadOnly,
        type,
      },
      updateQuery: (prev, { fetchMoreResult }) => {
        if (!fetchMoreResult) return prev;

        return {
          ...fetchMoreResult,
          nchat_notifications: [
            ...prev.nchat_notifications,
            ...fetchMoreResult.nchat_notifications,
          ],
        };
      },
    });
  }, [
    hasMore,
    loading,
    user?.id,
    limit,
    notifications.length,
    unreadOnly,
    type,
    fetchMore,
  ]);

  return {
    notifications,
    totalCount,
    hasMore,
    loading,
    error,
    loadMore,
    refetch: async () => {
      await refetch();
    },
  };
}

/**
 * Get unread notification counts
 */
export function useUnreadCount(autoSubscribe = true): UseUnreadCountReturn {
  const { user } = useAuth();

  const { data, loading, error, refetch } = useQuery(GET_UNREAD_COUNT, {
    variables: { userId: user?.id },
    skip: !user?.id,
    fetchPolicy: "cache-and-network",
  });

  // Subscribe to unread count changes
  useSubscription(UNREAD_COUNT_SUBSCRIPTION, {
    variables: { userId: user?.id },
    skip: !user?.id || !autoSubscribe,
  });

  const counts = useMemo(
    () => ({
      total: data?.total?.aggregate?.count ?? 0,
      mentions: data?.mentions?.aggregate?.count ?? 0,
      dms: data?.dms?.aggregate?.count ?? 0,
      threads: data?.threads?.aggregate?.count ?? 0,
    }),
    [data],
  );

  return {
    counts,
    loading,
    error,
    refetch: async () => {
      await refetch();
    },
  };
}

/**
 * Get unread counts by channel
 */
export function useUnreadByChannel(): UseUnreadByChannelReturn {
  const { user } = useAuth();

  const { data, loading, error, refetch } = useQuery(GET_UNREAD_BY_CHANNEL, {
    variables: { userId: user?.id },
    skip: !user?.id,
    fetchPolicy: "cache-and-network",
  });

  const channelUnreads = useMemo(() => {
    const memberships = data?.nchat_channel_members ?? [];

    return memberships.map(
      (m: {
        channel_id: string;
        last_read_at?: string;
        channel: {
          id: string;
          name: string;
          slug: string;
          unread?: { aggregate?: { count?: number } };
          has_mention?: Array<{ id: string }>;
        };
      }) => ({
        channel_id: m.channel_id,
        channel: {
          id: m.channel.id,
          name: m.channel.name,
          slug: m.channel.slug,
        },
        unread_count: m.channel.unread?.aggregate?.count ?? 0,
        has_mention: (m.channel.has_mention?.length ?? 0) > 0,
        last_read_at: m.last_read_at,
      }),
    );
  }, [data]);

  return {
    channelUnreads,
    loading,
    error,
    refetch: async () => {
      await refetch();
    },
  };
}

/**
 * Get notifications grouped by type
 */
export function useNotificationsGrouped(limit = 10) {
  const { user } = useAuth();

  const { data, loading, error, refetch } = useQuery(
    GET_NOTIFICATIONS_GROUPED,
    {
      variables: { userId: user?.id, limit },
      skip: !user?.id,
    },
  );

  return {
    mentions: data?.mentions ?? [],
    threads: data?.threads ?? [],
    dms: data?.dms ?? [],
    reactions: data?.reactions ?? [],
    loading,
    error,
    refetch: async () => {
      await refetch();
    },
  };
}

/**
 * Mark notifications as read
 */
export function useMarkAsRead(): UseMarkAsReadReturn {
  const { user } = useAuth();

  const [markAsReadMutation, { loading: singleLoading, error: singleError }] =
    useMutation(MARK_AS_READ);
  const [
    markMultipleMutation,
    { loading: multipleLoading, error: multipleError },
  ] = useMutation(MARK_MULTIPLE_AS_READ);
  const [markAllMutation, { loading: allLoading, error: allError }] =
    useMutation(MARK_ALL_AS_READ);

  const markAsRead = useCallback(
    async (notificationId: string): Promise<boolean> => {
      const result = await markAsReadMutation({
        variables: { notificationId },
        optimisticResponse: {
          update_nchat_notifications_by_pk: {
            __typename: "nchat_notifications",
            id: notificationId,
            is_read: true,
            read_at: new Date().toISOString(),
          },
        },
      });

      return result.data?.update_nchat_notifications_by_pk?.is_read ?? false;
    },
    [markAsReadMutation],
  );

  const markMultipleAsRead = useCallback(
    async (notificationIds: string[]): Promise<number> => {
      const result = await markMultipleMutation({
        variables: { notificationIds },
        update: (cache) => {
          notificationIds.forEach((id) => {
            cache.modify({
              id: cache.identify({ __typename: "nchat_notifications", id }),
              fields: {
                is_read: () => true,
                read_at: () => new Date().toISOString(),
              },
            });
          });
        },
      });

      return result.data?.update_nchat_notifications?.affected_rows ?? 0;
    },
    [markMultipleMutation],
  );

  const markAllAsRead = useCallback(
    async (channelId?: string): Promise<number> => {
      if (!user) {
        throw new Error("Must be logged in to mark notifications as read");
      }

      const result = await markAllMutation({
        variables: {
          userId: user.id,
          channelId,
        },
        refetchQueries: [
          { query: GET_UNREAD_COUNT, variables: { userId: user.id } },
        ],
      });

      return result.data?.update_nchat_notifications?.affected_rows ?? 0;
    },
    [user, markAllMutation],
  );

  return {
    markAsRead,
    markMultipleAsRead,
    markAllAsRead,
    loading: singleLoading || multipleLoading || allLoading,
    error: singleError ?? multipleError ?? allError,
  };
}

/**
 * Manage notification preferences
 */
export function useNotificationPreferences(): UseNotificationPreferencesReturn {
  const { user } = useAuth();

  const { data, loading, error, refetch } = useQuery(
    GET_NOTIFICATION_PREFERENCES,
    {
      variables: { userId: user?.id },
      skip: !user?.id,
    },
  );

  const [updatePrefsMutation, { loading: updateLoading, error: updateError }] =
    useMutation(UPDATE_NOTIFICATION_PREFERENCES);
  const [muteMutation, { loading: muteLoading, error: muteError }] =
    useMutation(MUTE_CHANNEL_NOTIFICATIONS);
  const [unmuteMutation, { loading: unmuteLoading, error: unmuteError }] =
    useMutation(UNMUTE_CHANNEL_NOTIFICATIONS);

  const preferences = useMemo(() => {
    return data?.nchat_users_by_pk?.notification_preferences ?? null;
  }, [data]);

  const mutedChannels = useMemo(() => {
    return data?.nchat_channel_members ?? [];
  }, [data]);

  const updatePreferences = useCallback(
    async (newPreferences: NotificationPreferences): Promise<boolean> => {
      if (!user) {
        throw new Error("Must be logged in to update notification preferences");
      }

      const result = await updatePrefsMutation({
        variables: {
          userId: user.id,
          preferences: newPreferences,
        },
        optimisticResponse: {
          update_nchat_users_by_pk: {
            __typename: "nchat_users",
            id: user.id,
            notification_preferences: newPreferences,
          },
        },
      });

      return !!result.data?.update_nchat_users_by_pk;
    },
    [user, updatePrefsMutation],
  );

  const muteChannel = useCallback(
    async (channelId: string, until?: string): Promise<boolean> => {
      if (!user) {
        throw new Error("Must be logged in to mute channel");
      }

      const result = await muteMutation({
        variables: {
          channelId,
          userId: user.id,
          mutedUntil: until,
        },
      });

      return (
        (result.data?.update_nchat_channel_members?.affected_rows ?? 0) > 0
      );
    },
    [user, muteMutation],
  );

  const unmuteChannel = useCallback(
    async (channelId: string): Promise<boolean> => {
      if (!user) {
        throw new Error("Must be logged in to unmute channel");
      }

      const result = await unmuteMutation({
        variables: {
          channelId,
          userId: user.id,
        },
      });

      return (
        (result.data?.update_nchat_channel_members?.affected_rows ?? 0) > 0
      );
    },
    [user, unmuteMutation],
  );

  return {
    preferences,
    mutedChannels,
    loading: loading || updateLoading || muteLoading || unmuteLoading,
    error: error ?? updateError ?? muteError ?? unmuteError,
    updatePreferences,
    muteChannel,
    unmuteChannel,
    refetch: async () => {
      await refetch();
    },
  };
}

/**
 * Delete notifications
 */
export function useDeleteNotifications(): UseDeleteNotificationsReturn {
  const { user } = useAuth();

  const [deleteMutation, { loading: deleteLoading, error: deleteError }] =
    useMutation(DELETE_NOTIFICATION);
  const [
    deleteAllMutation,
    { loading: deleteAllLoading, error: deleteAllError },
  ] = useMutation(DELETE_ALL_NOTIFICATIONS);

  const deleteNotification = useCallback(
    async (notificationId: string): Promise<boolean> => {
      const result = await deleteMutation({
        variables: { notificationId },
        update: (cache) => {
          cache.modify({
            fields: {
              nchat_notifications(existingNotifications = [], { readField }) {
                return existingNotifications.filter(
                  (notifRef: { __ref: string }) =>
                    readField("id", notifRef) !== notificationId,
                );
              },
            },
          });
        },
      });

      return !!result.data?.delete_nchat_notifications_by_pk;
    },
    [deleteMutation],
  );

  const deleteAllNotifications = useCallback(async (): Promise<number> => {
    if (!user) {
      throw new Error("Must be logged in to delete notifications");
    }

    const result = await deleteAllMutation({
      variables: { userId: user.id },
      update: (cache) => {
        cache.modify({
          fields: {
            nchat_notifications() {
              return [];
            },
          },
        });
      },
    });

    return result.data?.delete_nchat_notifications?.affected_rows ?? 0;
  }, [user, deleteAllMutation]);

  return {
    deleteNotification,
    deleteAllNotifications,
    loading: deleteLoading || deleteAllLoading,
    error: deleteError ?? deleteAllError,
  };
}

/**
 * Manage push notification tokens
 */
export function usePushNotifications(): UsePushNotificationsReturn {
  const { user } = useAuth();

  const [registerMutation, { loading: registerLoading, error: registerError }] =
    useMutation(REGISTER_PUSH_TOKEN);
  const [
    unregisterMutation,
    { loading: unregisterLoading, error: unregisterError },
  ] = useMutation(UNREGISTER_PUSH_TOKEN);

  const registerToken = useCallback(
    async (
      token: string,
      platform: string,
      deviceId?: string,
    ): Promise<boolean> => {
      if (!user) {
        throw new Error("Must be logged in to register push token");
      }

      const result = await registerMutation({
        variables: {
          userId: user.id,
          token,
          platform,
          deviceId,
        },
      });

      return !!result.data?.insert_nchat_push_tokens_one;
    },
    [user, registerMutation],
  );

  const unregisterToken = useCallback(
    async (token: string): Promise<boolean> => {
      const result = await unregisterMutation({
        variables: { token },
      });

      return (result.data?.delete_nchat_push_tokens?.affected_rows ?? 0) > 0;
    },
    [unregisterMutation],
  );

  return {
    registerToken,
    unregisterToken,
    loading: registerLoading || unregisterLoading,
    error: registerError ?? unregisterError,
  };
}

/**
 * Subscribe to notification stream
 */
export function useNotificationStream(options?: {
  onNotification?: (notification: Notification) => void;
}) {
  const { user } = useAuth();

  useSubscription(NOTIFICATION_STREAM_SUBSCRIPTION, {
    variables: { userId: user?.id },
    skip: !user?.id,
    onData: ({ data }) => {
      const notifications = data.data?.nchat_notifications_stream ?? [];
      notifications.forEach((notification: Notification) => {
        options?.onNotification?.(notification);
      });
    },
  });
}

/**
 * Subscribe to channel unread updates
 */
export function useChannelUnreadSubscription(
  channelId: string,
  options?: {
    onUnreadChange?: (count: number) => void;
  },
) {
  const { user } = useAuth();

  useSubscription(CHANNEL_UNREAD_SUBSCRIPTION, {
    variables: {
      userId: user?.id,
      channelId,
    },
    skip: !user?.id || !channelId,
    onData: ({ data }) => {
      const member = data.data?.nchat_channel_members?.[0];
      if (member && options?.onUnreadChange) {
        const count = member.channel?.messages_aggregate?.aggregate?.count ?? 0;
        options.onUnreadChange(count);
      }
    },
  });
}

/**
 * Combined notification subscription hook
 */
export function useNotificationSubscription(options?: {
  onNewNotification?: (notification: Notification) => void;
  onUnreadCountChange?: (counts: UnreadCounts) => void;
}) {
  const { user } = useAuth();

  // New notifications
  useSubscription(NOTIFICATION_SUBSCRIPTION, {
    variables: { userId: user?.id },
    skip: !user?.id,
    onData: ({ data }) => {
      if (data.data?.nchat_notifications?.[0] && options?.onNewNotification) {
        options.onNewNotification(data.data.nchat_notifications[0]);
      }
    },
  });

  // Unread count changes
  useSubscription(UNREAD_COUNT_SUBSCRIPTION, {
    variables: { userId: user?.id },
    skip: !user?.id,
    onData: ({ data }) => {
      if (options?.onUnreadCountChange) {
        const count =
          data.data?.nchat_notifications_aggregate?.aggregate?.count ?? 0;
        options.onUnreadCountChange({
          total: count,
          mentions: 0, // Would need separate subscription for detailed counts
          dms: 0,
          threads: 0,
        });
      }
    },
  });
}

export default useNotifications;
