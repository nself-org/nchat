"use client";

/**
 * Channel Management Hooks
 *
 * React hooks for channel lifecycle, membership, and settings with proper
 * error handling, logging, and user feedback.
 *
 * Uses real Hasura GraphQL backend for all operations.
 */

import {
  useQuery,
  useSubscription,
  useMutation,
  useLazyQuery,
} from "@apollo/client";
import { useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import { logger } from "@/lib/logger";
import { useToast } from "@/hooks/use-toast";

// GraphQL Operations from organized channels directory
import {
  GET_CHANNELS,
  GET_CHANNEL_BY_ID,
  GET_CHANNEL_BY_SLUG,
  GET_PUBLIC_CHANNELS,
  SEARCH_CHANNELS,
  GET_CHANNELS_BY_CATEGORY,
  GET_CHANNEL_STATS,
} from "@/graphql/channels/queries";

import {
  CREATE_CHANNEL,
  UPDATE_CHANNEL,
  DELETE_CHANNEL,
  ARCHIVE_CHANNEL,
  UNARCHIVE_CHANNEL,
  UPDATE_CHANNEL_POSITION,
  UPDATE_CHANNEL_TYPE,
  JOIN_CHANNEL,
  LEAVE_CHANNEL,
} from "@/graphql/channels/mutations";

import {
  CHANNEL_SUBSCRIPTION,
  CHANNELS_LIST_SUBSCRIPTION,
  USER_CHANNELS_SUBSCRIPTION,
} from "@/graphql/channels/subscriptions";

import type { ChannelType } from "@/types/channel";

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface Channel {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  topic?: string | null;
  type: ChannelType | "announcement";
  categoryId?: string | null;
  icon?: string | null;
  color?: string | null;
  position: number;
  isDefault: boolean;
  isArchived: boolean;
  isReadonly: boolean;
  memberCount: number;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  lastMessageAt?: string | null;
  creator?: {
    id: string;
    username: string;
    displayName: string;
    avatarUrl?: string;
  };
}

export interface ChannelWithMembership extends Channel {
  userRole?: string;
  isMuted?: boolean;
  isPinned?: boolean;
  lastReadAt?: string;
  unreadCount?: number;
  mentionCount?: number;
}

export interface CreateChannelInput {
  name: string;
  slug?: string;
  description?: string;
  topic?: string;
  type: "public" | "private" | "direct" | "group" | "announcement";
  categoryId?: string;
  icon?: string;
  color?: string;
  isDefault?: boolean;
  isReadonly?: boolean;
  memberIds?: string[];
}

export interface UpdateChannelInput {
  name?: string;
  description?: string;
  topic?: string;
  icon?: string;
  color?: string;
  categoryId?: string;
  position?: number;
  isDefault?: boolean;
  isReadonly?: boolean;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function transformChannel(raw: Record<string, unknown>): Channel {
  return {
    id: raw.id as string,
    name: raw.name as string,
    slug: raw.slug as string,
    description: raw.description as string | null,
    topic: raw.topic as string | null,
    type: raw.type as ChannelType | "announcement",
    categoryId: raw.category_id as string | null,
    icon: raw.icon as string | null,
    color: raw.color as string | null,
    position: (raw.position as number) || 0,
    isDefault: (raw.is_default as boolean) || false,
    isArchived: (raw.is_archived as boolean) || false,
    isReadonly: (raw.is_readonly as boolean) || false,
    memberCount:
      (raw.member_count as number) ||
      (raw.members_aggregate as { aggregate?: { count?: number } })?.aggregate
        ?.count ||
      0,
    createdBy: raw.created_by as string,
    createdAt: raw.created_at as string,
    updatedAt: raw.updated_at as string,
    lastMessageAt: raw.last_message_at as string | null,
    creator: raw.creator
      ? {
          id: (raw.creator as Record<string, unknown>).id as string,
          username: (raw.creator as Record<string, unknown>).username as string,
          displayName: (raw.creator as Record<string, unknown>)
            .display_name as string,
          avatarUrl: (raw.creator as Record<string, unknown>).avatar_url as
            | string
            | undefined,
        }
      : undefined,
  };
}

function transformChannelWithMembership(
  membershipData: Record<string, unknown>,
): ChannelWithMembership {
  const channelData = membershipData.channel as Record<string, unknown>;
  return {
    ...transformChannel(channelData),
    userRole: membershipData.role as string,
    isMuted: (membershipData.is_muted as boolean) || false,
    isPinned: (membershipData.is_pinned as boolean) || false,
    lastReadAt: membershipData.last_read_at as string | undefined,
    unreadCount: (membershipData.unread_count as number) || 0,
    mentionCount: (membershipData.mention_count as number) || 0,
  };
}

// ============================================================================
// QUERY HOOKS
// ============================================================================

/**
 * Hook to fetch all channels
 */
export function useChannels(options?: {
  type?: string;
  includeArchived?: boolean;
  limit?: number;
  offset?: number;
}) {
  const {
    type,
    includeArchived = false,
    limit = 50,
    offset = 0,
  } = options || {};

  const { data, loading, error, refetch } = useQuery(GET_CHANNELS, {
    variables: { type, includeArchived, limit, offset },
    fetchPolicy: "cache-and-network",
  });

  const channels = useMemo(() => {
    return (data?.nchat_channels || []).map(transformChannel);
  }, [data]);

  const total =
    data?.nchat_channels_aggregate?.aggregate?.count || channels.length;

  return {
    channels,
    total,
    hasMore: offset + limit < total,
    loading,
    error,
    refetch,
  };
}

/**
 * Hook to fetch public channels
 */
export function usePublicChannels(limit = 50, offset = 0) {
  const { data, loading, error, refetch } = useQuery(GET_PUBLIC_CHANNELS, {
    variables: { limit, offset },
    fetchPolicy: "cache-and-network",
  });

  const channels = useMemo(() => {
    return (data?.nchat_channels || []).map(transformChannel);
  }, [data]);

  return { channels, loading, error, refetch };
}

/**
 * Hook to fetch a single channel by ID
 */
export function useChannel(channelId: string | null) {
  const { data, loading, error, refetch } = useQuery(GET_CHANNEL_BY_ID, {
    variables: { id: channelId },
    skip: !channelId,
    fetchPolicy: "cache-and-network",
  });

  const channel = useMemo(() => {
    if (!data?.nchat_channels_by_pk) return null;
    return transformChannel(data.nchat_channels_by_pk);
  }, [data]);

  return { channel, loading, error, refetch };
}

/**
 * Hook to fetch a channel by slug
 */
export function useChannelBySlug(slug: string | null) {
  const { data, loading, error, refetch } = useQuery(GET_CHANNEL_BY_SLUG, {
    variables: { slug },
    skip: !slug,
    fetchPolicy: "cache-and-network",
  });

  const channel = useMemo(() => {
    if (!data?.nchat_channels || data.nchat_channels.length === 0) return null;
    return transformChannel(data.nchat_channels[0]);
  }, [data]);

  return { channel, loading, error, refetch };
}

/**
 * Hook to search channels
 */
export function useChannelSearch() {
  const [executeSearch, { data, loading, error }] =
    useLazyQuery(SEARCH_CHANNELS);

  const search = useCallback(
    (query: string, type?: string, limit = 20, offset = 0) => {
      return executeSearch({
        variables: {
          searchQuery: `%${query}%`,
          type,
          limit,
          offset,
        },
      });
    },
    [executeSearch],
  );

  const results = useMemo(() => {
    return (data?.nchat_channels || []).map(transformChannel);
  }, [data]);

  return { search, results, loading, error };
}

/**
 * Hook to get channels by category
 */
export function useChannelsByCategory(includeArchived = false) {
  const { data, loading, error, refetch } = useQuery(GET_CHANNELS_BY_CATEGORY, {
    variables: { includeArchived },
    fetchPolicy: "cache-and-network",
  });

  const result = useMemo(() => {
    if (!data) return { categories: [], uncategorized: [] };

    const categories = (data.nchat_categories || []).map(
      (cat: Record<string, unknown>) => ({
        id: cat.id,
        name: cat.name,
        description: cat.description,
        position: cat.position,
        isCollapsed: cat.is_collapsed,
        channels: ((cat.channels as Record<string, unknown>[]) || []).map(
          transformChannel,
        ),
      }),
    );

    const uncategorized = (data.uncategorized || []).map(transformChannel);

    return { categories, uncategorized };
  }, [data]);

  return { ...result, loading, error, refetch };
}

/**
 * Hook to get channel stats
 */
export function useChannelStats(channelId: string | null) {
  const { data, loading, error } = useQuery(GET_CHANNEL_STATS, {
    variables: { channelId },
    skip: !channelId,
    fetchPolicy: "cache-and-network",
  });

  const stats = useMemo(() => {
    if (!data?.nchat_channels_by_pk) return null;
    const channel = data.nchat_channels_by_pk;
    return {
      memberCount:
        channel.member_count ||
        channel.members_aggregate?.aggregate?.count ||
        0,
      messageCount:
        channel.message_count ||
        channel.messages_aggregate?.aggregate?.count ||
        0,
      pinnedCount: channel.pinned_count?.aggregate?.count || 0,
      createdAt: channel.created_at,
      lastMessageAt: channel.last_message_at,
    };
  }, [data]);

  return { stats, loading, error };
}

// ============================================================================
// SUBSCRIPTION HOOKS
// ============================================================================

/**
 * Hook to subscribe to a single channel's updates
 */
export function useChannelSubscription(channelId: string | null) {
  const { data, loading, error } = useSubscription(CHANNEL_SUBSCRIPTION, {
    variables: { channelId },
    skip: !channelId,
  });

  const channel = useMemo(() => {
    if (!data?.nchat_channels_by_pk) return null;
    return transformChannel(data.nchat_channels_by_pk);
  }, [data]);

  return { channel, loading, error };
}

/**
 * Hook to subscribe to channel list updates
 */
export function useChannelsListSubscription(includeArchived = false) {
  const { data, loading, error } = useSubscription(CHANNELS_LIST_SUBSCRIPTION, {
    variables: { includeArchived },
  });

  const channels = useMemo(() => {
    return (data?.nchat_channels || []).map(transformChannel);
  }, [data]);

  return { channels, loading, error };
}

/**
 * Hook to subscribe to user's channels
 */
export function useUserChannelsSubscription() {
  const { user } = useAuth();

  const { data, loading, error } = useSubscription(USER_CHANNELS_SUBSCRIPTION, {
    variables: { userId: user?.id },
    skip: !user?.id,
  });

  const channels = useMemo(() => {
    return (data?.nchat_channel_members || []).map(
      transformChannelWithMembership,
    );
  }, [data]);

  return { channels, loading, error };
}

// ============================================================================
// MUTATION HOOKS
// ============================================================================

/**
 * Hook for channel mutations (create, update, delete, archive)
 */
export function useChannelMutations() {
  const { user } = useAuth();
  const { toast } = useToast();
  const router = useRouter();

  // Mutations
  const [createChannelMutation, { loading: creatingChannel }] =
    useMutation(CREATE_CHANNEL);
  const [updateChannelMutation, { loading: updatingChannel }] =
    useMutation(UPDATE_CHANNEL);
  const [deleteChannelMutation, { loading: deletingChannel }] =
    useMutation(DELETE_CHANNEL);
  const [archiveChannelMutation, { loading: archivingChannel }] =
    useMutation(ARCHIVE_CHANNEL);
  const [unarchiveChannelMutation, { loading: unarchivingChannel }] =
    useMutation(UNARCHIVE_CHANNEL);
  const [updatePositionMutation] = useMutation(UPDATE_CHANNEL_POSITION);
  const [updateTypeMutation] = useMutation(UPDATE_CHANNEL_TYPE);
  const [joinChannelMutation, { loading: joiningChannel }] =
    useMutation(JOIN_CHANNEL);
  const [leaveChannelMutation, { loading: leavingChannel }] =
    useMutation(LEAVE_CHANNEL);

  // Create channel
  const createChannel = useCallback(
    async (input: CreateChannelInput) => {
      if (!user?.id) {
        throw new Error("User not authenticated");
      }

      try {
        logger.info("Creating channel", {
          userId: user.id,
          channelName: input.name,
        });

        const slug =
          input.slug ||
          input.name
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-|-$/g, "");

        const { data } = await createChannelMutation({
          variables: {
            name: input.name,
            slug,
            description: input.description,
            topic: input.topic,
            type: input.type,
            categoryId: input.categoryId,
            icon: input.icon,
            color: input.color,
            isDefault: input.isDefault || false,
            isReadonly: input.isReadonly || false,
            createdBy: user.id,
          },
        });

        const channel = transformChannel(data.insert_nchat_channels_one);

        logger.info("Channel created", {
          userId: user.id,
          channelId: channel.id,
        });
        toast({
          title: "Channel created",
          description: `#${channel.name} has been created successfully.`,
        });

        // Navigate to new channel
        router.push(`/chat/c/${channel.slug}`);

        return channel;
      } catch (error) {
        logger.error("Failed to create channel", error as Error, {
          userId: user.id,
        });
        toast({
          title: "Failed to create channel",
          description: "Could not create the channel. Please try again.",
          variant: "destructive",
        });
        throw error;
      }
    },
    [user?.id, createChannelMutation, router, toast],
  );

  // Update channel
  const updateChannel = useCallback(
    async (channelId: string, updates: UpdateChannelInput) => {
      if (!user?.id) {
        throw new Error("User not authenticated");
      }

      try {
        logger.info("Updating channel", {
          userId: user.id,
          channelId,
          updates,
        });

        const { data } = await updateChannelMutation({
          variables: {
            channelId,
            name: updates.name,
            description: updates.description,
            topic: updates.topic,
            icon: updates.icon,
            color: updates.color,
            categoryId: updates.categoryId,
            position: updates.position,
            isDefault: updates.isDefault,
            isReadonly: updates.isReadonly,
          },
        });

        const channel = transformChannel(data.update_nchat_channels_by_pk);

        logger.info("Channel updated", { userId: user.id, channelId });
        toast({
          title: "Channel updated",
          description: "Channel settings have been saved.",
        });

        return channel;
      } catch (error) {
        logger.error("Failed to update channel", error as Error, {
          userId: user.id,
          channelId,
        });
        toast({
          title: "Update failed",
          description: "Could not update the channel. Please try again.",
          variant: "destructive",
        });
        throw error;
      }
    },
    [user?.id, updateChannelMutation, toast],
  );

  // Delete channel
  const deleteChannel = useCallback(
    async (channelId: string) => {
      if (!user?.id) {
        throw new Error("User not authenticated");
      }

      try {
        logger.warn("Deleting channel", { userId: user.id, channelId });

        const { data } = await deleteChannelMutation({
          variables: { channelId },
        });

        const deletedChannel = data.delete_nchat_channels_by_pk;

        logger.warn("Channel deleted", { userId: user.id, channelId });
        toast({
          title: "Channel deleted",
          description: `#${deletedChannel.name} has been deleted.`,
        });

        // Navigate away from deleted channel
        router.push("/chat");

        return deletedChannel;
      } catch (error) {
        logger.error("Failed to delete channel", error as Error, {
          userId: user.id,
          channelId,
        });
        toast({
          title: "Delete failed",
          description: "Could not delete the channel. Please try again.",
          variant: "destructive",
        });
        throw error;
      }
    },
    [user?.id, deleteChannelMutation, router, toast],
  );

  // Archive channel
  const archiveChannel = useCallback(
    async (channelId: string) => {
      if (!user?.id) {
        throw new Error("User not authenticated");
      }

      try {
        logger.info("Archiving channel", { userId: user.id, channelId });

        const { data } = await archiveChannelMutation({
          variables: { channelId },
        });

        logger.info("Channel archived", { userId: user.id, channelId });
        toast({
          title: "Channel archived",
          description:
            "This channel has been archived and hidden from the sidebar.",
        });

        return data.update_nchat_channels_by_pk;
      } catch (error) {
        logger.error("Failed to archive channel", error as Error, {
          userId: user.id,
          channelId,
        });
        toast({
          title: "Archive failed",
          description: "Could not archive the channel. Please try again.",
          variant: "destructive",
        });
        throw error;
      }
    },
    [user?.id, archiveChannelMutation, toast],
  );

  // Unarchive channel
  const unarchiveChannel = useCallback(
    async (channelId: string) => {
      if (!user?.id) {
        throw new Error("User not authenticated");
      }

      try {
        logger.info("Unarchiving channel", { userId: user.id, channelId });

        const { data } = await unarchiveChannelMutation({
          variables: { channelId },
        });

        logger.info("Channel unarchived", { userId: user.id, channelId });
        toast({
          title: "Channel restored",
          description: "This channel has been unarchived.",
        });

        return data.update_nchat_channels_by_pk;
      } catch (error) {
        logger.error("Failed to unarchive channel", error as Error, {
          userId: user.id,
          channelId,
        });
        toast({
          title: "Unarchive failed",
          description: "Could not unarchive the channel. Please try again.",
          variant: "destructive",
        });
        throw error;
      }
    },
    [user?.id, unarchiveChannelMutation, toast],
  );

  // Update channel position
  const updateChannelPosition = useCallback(
    async (channelId: string, position: number, categoryId?: string | null) => {
      try {
        await updatePositionMutation({
          variables: { channelId, position, categoryId },
        });
      } catch (error) {
        logger.error("Failed to update channel position", error as Error);
        throw error;
      }
    },
    [updatePositionMutation],
  );

  // Update channel type
  const updateChannelType = useCallback(
    async (channelId: string, type: "public" | "private" | "announcement") => {
      if (!user?.id) {
        throw new Error("User not authenticated");
      }

      try {
        logger.info("Updating channel type", {
          userId: user.id,
          channelId,
          type,
        });

        await updateTypeMutation({
          variables: { channelId, type },
        });

        logger.info("Channel type updated", {
          userId: user.id,
          channelId,
          type,
        });
        toast({
          title: "Channel type updated",
          description: `Channel is now ${type}.`,
        });
      } catch (error) {
        logger.error("Failed to update channel type", error as Error, {
          userId: user.id,
          channelId,
        });
        toast({
          title: "Update failed",
          description: "Could not update channel type. Please try again.",
          variant: "destructive",
        });
        throw error;
      }
    },
    [user?.id, updateTypeMutation, toast],
  );

  // Join channel
  const joinChannel = useCallback(
    async (channelId: string) => {
      if (!user?.id) {
        throw new Error("User not authenticated");
      }

      try {
        logger.info("Joining channel", { userId: user.id, channelId });

        await joinChannelMutation({
          variables: { channelId, userId: user.id },
        });

        logger.info("Channel joined", { userId: user.id, channelId });
        toast({
          title: "Channel joined",
          description: "You have joined the channel.",
        });
      } catch (error) {
        logger.error("Failed to join channel", error as Error, {
          userId: user.id,
          channelId,
        });
        toast({
          title: "Join failed",
          description: "Could not join channel. Please try again.",
          variant: "destructive",
        });
        throw error;
      }
    },
    [user?.id, joinChannelMutation, toast],
  );

  // Leave channel
  const leaveChannel = useCallback(
    async (channelId: string) => {
      if (!user?.id) {
        throw new Error("User not authenticated");
      }

      try {
        logger.info("Leaving channel", { userId: user.id, channelId });

        await leaveChannelMutation({
          variables: { channelId, userId: user.id },
        });

        logger.info("Channel left", { userId: user.id, channelId });
        toast({
          title: "Channel left",
          description: "You have left the channel.",
        });
      } catch (error) {
        logger.error("Failed to leave channel", error as Error, {
          userId: user.id,
          channelId,
        });
        toast({
          title: "Leave failed",
          description: "Could not leave channel. Please try again.",
          variant: "destructive",
        });
        throw error;
      }
    },
    [user?.id, leaveChannelMutation, toast],
  );

  return {
    // CRUD operations
    createChannel,
    updateChannel,
    deleteChannel,
    archiveChannel,
    unarchiveChannel,
    updateChannelPosition,
    updateChannelType,
    joinChannel,
    leaveChannel,

    // Loading states
    creatingChannel,
    updatingChannel,
    deletingChannel,
    archivingChannel,
    unarchivingChannel,
    joiningChannel,
    leavingChannel,
  };
}

// ============================================================================
// COMBINED HOOK
// ============================================================================

/**
 * Combined hook for common channel operations
 */
export function useChannelDetails(
  channelIdOrSlug: string | null,
  isSlug = false,
) {
  // Query based on ID or slug
  const channelByIdResult = useChannel(isSlug ? null : channelIdOrSlug);
  const channelBySlugResult = useChannelBySlug(isSlug ? channelIdOrSlug : null);

  const result = isSlug ? channelBySlugResult : channelByIdResult;
  const channelId = result.channel?.id || null;

  // Get stats
  const { stats } = useChannelStats(channelId);

  // Subscribe to updates
  const { channel: liveChannel } = useChannelSubscription(channelId);

  // Use live data if available, otherwise query data
  const channel = liveChannel || result.channel;

  return {
    channel,
    stats,
    loading: result.loading,
    error: result.error,
    refetch: result.refetch,
  };
}

// Export types
export type { ChannelType };
