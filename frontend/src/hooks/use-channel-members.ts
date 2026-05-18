"use client";

/**
 * Channel Members Hook
 *
 * React hook for managing channel membership including join, leave, invite,
 * and member management operations with real-time updates.
 */

import { useQuery, useSubscription, useMutation } from "@apollo/client";
import { useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import { logger } from "@/lib/logger";
import { useToast } from "@/hooks/use-toast";

import {
  GET_CHANNEL_MEMBERS,
  GET_CHANNEL_ADMINS,
  GET_USER_CHANNELS,
  GET_USER_DM_CHANNELS,
  GET_USER_UNREAD_CHANNELS,
  CHECK_CHANNEL_MEMBERSHIP,
  GET_DISCOVERABLE_CHANNELS,
} from "@/graphql/channels/queries";

import {
  JOIN_CHANNEL,
  LEAVE_CHANNEL,
  ADD_CHANNEL_MEMBER,
  REMOVE_CHANNEL_MEMBER,
  ADD_CHANNEL_MEMBERS_BULK,
  UPDATE_MEMBER_ROLE,
  UPDATE_MEMBER_PERMISSIONS,
  UPDATE_MEMBER_NICKNAME,
  TRANSFER_CHANNEL_OWNERSHIP,
  MUTE_CHANNEL,
  UNMUTE_CHANNEL,
  PIN_CHANNEL,
  UNPIN_CHANNEL,
  UPDATE_CHANNEL_NOTIFICATIONS,
  MARK_CHANNEL_READ,
  GET_OR_CREATE_DM,
  CREATE_GROUP_DM,
} from "@/graphql/channels/mutations";

import {
  CHANNEL_MEMBERS_SUBSCRIPTION,
  USER_CHANNELS_SUBSCRIPTION,
  USER_UNREAD_COUNTS_SUBSCRIPTION,
} from "@/graphql/channels/subscriptions";

import type { UserRole } from "@/types/user";

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface ChannelMember {
  id: string;
  channelId: string;
  userId: string;
  role: UserRole;
  nickname?: string | null;
  isMuted: boolean;
  mutedUntil?: string | null;
  isPinned: boolean;
  notificationLevel: "all" | "mentions" | "none";
  lastReadAt?: string | null;
  unreadCount: number;
  mentionCount: number;
  joinedAt: string;
  user?: {
    id: string;
    username: string;
    displayName: string;
    email?: string;
    avatarUrl?: string;
    status?: string;
  };
}

export interface UserChannelMembership {
  channelId: string;
  channelName: string;
  channelSlug: string;
  channelType: string;
  role: UserRole;
  isMuted: boolean;
  isPinned: boolean;
  notificationLevel: string;
  unreadCount: number;
  mentionCount: number;
  lastReadAt?: string;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function transformMember(raw: Record<string, unknown>): ChannelMember {
  return {
    id: raw.id as string,
    channelId: raw.channel_id as string,
    userId: raw.user_id as string,
    role: raw.role as UserRole,
    nickname: raw.nickname as string | null,
    isMuted: (raw.is_muted as boolean) || false,
    mutedUntil: raw.muted_until as string | null,
    isPinned: (raw.is_pinned as boolean) || false,
    notificationLevel:
      (raw.notification_level as "all" | "mentions" | "none") || "all",
    lastReadAt: raw.last_read_at as string | null,
    unreadCount: (raw.unread_count as number) || 0,
    mentionCount: (raw.mention_count as number) || 0,
    joinedAt: raw.joined_at as string,
    user: raw.user
      ? {
          id: (raw.user as Record<string, unknown>).id as string,
          username: (raw.user as Record<string, unknown>).username as string,
          displayName: (raw.user as Record<string, unknown>)
            .display_name as string,
          email: (raw.user as Record<string, unknown>).email as
            | string
            | undefined,
          avatarUrl: (raw.user as Record<string, unknown>).avatar_url as
            | string
            | undefined,
          status: (raw.user as Record<string, unknown>).status as
            | string
            | undefined,
        }
      : undefined,
  };
}

// ============================================================================
// QUERY HOOKS
// ============================================================================

/**
 * Hook to fetch channel members
 */
export function useChannelMembers(
  channelId: string | null,
  limit = 50,
  offset = 0,
) {
  const { data, loading, error, refetch } = useQuery(GET_CHANNEL_MEMBERS, {
    variables: { channelId, limit, offset },
    skip: !channelId,
    fetchPolicy: "cache-and-network",
  });

  const members = useMemo(() => {
    return (data?.nchat_channel_members || []).map(transformMember);
  }, [data]);

  const total =
    data?.nchat_channel_members_aggregate?.aggregate?.count || members.length;

  return {
    members,
    total,
    hasMore: offset + limit < total,
    loading,
    error,
    refetch,
  };
}

/**
 * Hook to fetch channel admins
 */
export function useChannelAdmins(channelId: string | null) {
  const { data, loading, error } = useQuery(GET_CHANNEL_ADMINS, {
    variables: { channelId },
    skip: !channelId,
    fetchPolicy: "cache-and-network",
  });

  const admins = useMemo(() => {
    return (data?.nchat_channel_members || []).map(transformMember);
  }, [data]);

  return { admins, loading, error };
}

/**
 * Hook to check membership status
 */
export function useChannelMembership(channelId: string | null) {
  const { user } = useAuth();

  const { data, loading, error, refetch } = useQuery(CHECK_CHANNEL_MEMBERSHIP, {
    variables: { channelId, userId: user?.id },
    skip: !channelId || !user?.id,
    fetchPolicy: "cache-and-network",
  });

  const membership = useMemo(() => {
    const members = data?.nchat_channel_members || [];
    if (members.length === 0) return null;
    return {
      isMember: true,
      role: members[0].role as UserRole,
      joinedAt: members[0].joined_at as string,
      canRead: members[0].can_read as boolean | undefined,
      canWrite: members[0].can_write as boolean | undefined,
      canManage: members[0].can_manage as boolean | undefined,
      canInvite: members[0].can_invite as boolean | undefined,
      isMuted: members[0].is_muted as boolean,
      notificationLevel: members[0].notification_level as string,
    };
  }, [data]);

  return {
    membership,
    isMember: !!membership,
    loading,
    error,
    refetch,
  };
}

/**
 * Hook to get user's channels
 */
export function useUserChannels(includeArchived = false) {
  const { user } = useAuth();

  const { data, loading, error, refetch } = useQuery(GET_USER_CHANNELS, {
    variables: { userId: user?.id, includeArchived },
    skip: !user?.id,
    fetchPolicy: "cache-and-network",
  });

  const channels = useMemo(() => {
    return (data?.nchat_channel_members || []).map(
      (m: Record<string, unknown>) => {
        const channel = m.channel as Record<string, unknown>;
        return {
          channelId: channel.id as string,
          channelName: channel.name as string,
          channelSlug: channel.slug as string,
          channelType: channel.type as string,
          role: m.role as UserRole,
          isMuted: (m.is_muted as boolean) || false,
          isPinned: (m.is_pinned as boolean) || false,
          notificationLevel: (m.notification_level as string) || "all",
          unreadCount: (m.unread_count as number) || 0,
          mentionCount: (m.mention_count as number) || 0,
          lastReadAt: m.last_read_at as string | undefined,
        };
      },
    );
  }, [data]);

  return { channels, loading, error, refetch };
}

/**
 * Hook to get user's DM channels
 */
export function useUserDMChannels() {
  const { user } = useAuth();

  const { data, loading, error, refetch } = useQuery(GET_USER_DM_CHANNELS, {
    variables: { userId: user?.id },
    skip: !user?.id,
    fetchPolicy: "cache-and-network",
  });

  return {
    dmChannels: data?.nchat_channel_members || [],
    loading,
    error,
    refetch,
  };
}

/**
 * Hook to get user's unread channels
 */
export function useUnreadChannels() {
  const { user } = useAuth();

  const { data, loading, error, refetch } = useQuery(GET_USER_UNREAD_CHANNELS, {
    variables: { userId: user?.id },
    skip: !user?.id,
    fetchPolicy: "cache-and-network",
  });

  const unreadChannels = useMemo(() => {
    return (data?.nchat_channel_members || []).map(
      (m: Record<string, unknown>) => ({
        channelId: (m.channel as Record<string, unknown>).id as string,
        channelName: (m.channel as Record<string, unknown>).name as string,
        unreadCount: m.unread_count as number,
        mentionCount: m.mention_count as number,
      }),
    );
  }, [data]);

  return { unreadChannels, loading, error, refetch };
}

/**
 * Hook to get discoverable channels
 */
export function useDiscoverableChannels(limit = 20, offset = 0) {
  const { user } = useAuth();

  const { data, loading, error, refetch } = useQuery(
    GET_DISCOVERABLE_CHANNELS,
    {
      variables: { userId: user?.id, limit, offset },
      skip: !user?.id,
      fetchPolicy: "cache-and-network",
    },
  );

  return { channels: data?.nchat_channels || [], loading, error, refetch };
}

// ============================================================================
// SUBSCRIPTION HOOKS
// ============================================================================

/**
 * Hook to subscribe to channel member changes
 */
export function useChannelMembersSubscription(channelId: string | null) {
  const { data, loading, error } = useSubscription(
    CHANNEL_MEMBERS_SUBSCRIPTION,
    {
      variables: { channelId },
      skip: !channelId,
    },
  );

  const members = useMemo(() => {
    return (data?.nchat_channel_members || []).map(transformMember);
  }, [data]);

  return { members, loading, error };
}

/**
 * Hook to subscribe to user's channel updates
 */
export function useUserChannelsSubscription() {
  const { user } = useAuth();

  const { data, loading, error } = useSubscription(USER_CHANNELS_SUBSCRIPTION, {
    variables: { userId: user?.id },
    skip: !user?.id,
  });

  return {
    channelMemberships: data?.nchat_channel_members || [],
    loading,
    error,
  };
}

/**
 * Hook to subscribe to unread counts
 */
export function useUnreadCountsSubscription() {
  const { user } = useAuth();

  const { data, loading, error } = useSubscription(
    USER_UNREAD_COUNTS_SUBSCRIPTION,
    {
      variables: { userId: user?.id },
      skip: !user?.id,
    },
  );

  const totalUnread = useMemo(() => {
    return (data?.nchat_channel_members || []).reduce(
      (sum: number, m: Record<string, unknown>) => {
        if (!(m.is_muted as boolean)) {
          return sum + ((m.unread_count as number) || 0);
        }
        return sum;
      },
      0,
    );
  }, [data]);

  const totalMentions = useMemo(() => {
    return (data?.nchat_channel_members || []).reduce(
      (sum: number, m: Record<string, unknown>) => {
        return sum + ((m.mention_count as number) || 0);
      },
      0,
    );
  }, [data]);

  return {
    unreadCounts: data?.nchat_channel_members || [],
    totalUnread,
    totalMentions,
    loading,
    error,
  };
}

// ============================================================================
// MUTATION HOOKS
// ============================================================================

/**
 * Hook for channel membership mutations
 */
export function useChannelMemberMutations() {
  const { user } = useAuth();
  const { toast } = useToast();
  const router = useRouter();

  // Mutations
  const [joinMutation, { loading: joiningChannel }] = useMutation(JOIN_CHANNEL);
  const [leaveMutation, { loading: leavingChannel }] =
    useMutation(LEAVE_CHANNEL);
  const [addMemberMutation, { loading: addingMember }] =
    useMutation(ADD_CHANNEL_MEMBER);
  const [removeMemberMutation, { loading: removingMember }] = useMutation(
    REMOVE_CHANNEL_MEMBER,
  );
  const [addMembersBulkMutation, { loading: addingMembers }] = useMutation(
    ADD_CHANNEL_MEMBERS_BULK,
  );
  const [updateRoleMutation, { loading: updatingRole }] =
    useMutation(UPDATE_MEMBER_ROLE);
  const [updatePermissionsMutation] = useMutation(UPDATE_MEMBER_PERMISSIONS);
  const [updateNicknameMutation] = useMutation(UPDATE_MEMBER_NICKNAME);
  const [transferOwnershipMutation, { loading: transferringOwnership }] =
    useMutation(TRANSFER_CHANNEL_OWNERSHIP);
  const [muteMutation, { loading: mutingChannel }] = useMutation(MUTE_CHANNEL);
  const [unmuteMutation, { loading: unmutingChannel }] =
    useMutation(UNMUTE_CHANNEL);
  const [pinMutation, { loading: pinningChannel }] = useMutation(PIN_CHANNEL);
  const [unpinMutation, { loading: unpinningChannel }] =
    useMutation(UNPIN_CHANNEL);
  const [updateNotificationsMutation] = useMutation(
    UPDATE_CHANNEL_NOTIFICATIONS,
  );
  const [markReadMutation] = useMutation(MARK_CHANNEL_READ);
  const [getOrCreateDMMutation] = useMutation(GET_OR_CREATE_DM);
  const [createGroupDMMutation] = useMutation(CREATE_GROUP_DM);

  // Join channel
  const joinChannel = useCallback(
    async (channelId: string) => {
      if (!user?.id) throw new Error("User not authenticated");

      try {
        logger.info("Joining channel", { userId: user.id, channelId });

        const { data } = await joinMutation({
          variables: { channelId, userId: user.id },
        });

        logger.info("Joined channel", { userId: user.id, channelId });
        toast({
          title: "Joined channel",
          description: "You have joined this channel.",
        });

        return data.insert_nchat_channel_members_one;
      } catch (error) {
        logger.error("Failed to join channel", error as Error, {
          userId: user.id,
          channelId,
        });
        toast({
          title: "Join failed",
          description: "Could not join the channel. Please try again.",
          variant: "destructive",
        });
        throw error;
      }
    },
    [user?.id, joinMutation, toast],
  );

  // Leave channel
  const leaveChannel = useCallback(
    async (channelId: string) => {
      if (!user?.id) throw new Error("User not authenticated");

      try {
        logger.info("Leaving channel", { userId: user.id, channelId });

        await leaveMutation({
          variables: { channelId, userId: user.id },
        });

        logger.info("Left channel", { userId: user.id, channelId });
        toast({
          title: "Left channel",
          description: "You have left this channel.",
        });

        router.push("/chat");
      } catch (error) {
        logger.error("Failed to leave channel", error as Error, {
          userId: user.id,
          channelId,
        });
        toast({
          title: "Leave failed",
          description: "Could not leave the channel. Please try again.",
          variant: "destructive",
        });
        throw error;
      }
    },
    [user?.id, leaveMutation, router, toast],
  );

  // Add member
  const addMember = useCallback(
    async (channelId: string, userId: string, role: UserRole = "member") => {
      if (!user?.id) throw new Error("User not authenticated");

      try {
        logger.info("Adding channel member", {
          adminId: user.id,
          channelId,
          targetUserId: userId,
        });

        const { data } = await addMemberMutation({
          variables: { channelId, userId, role, invitedBy: user.id },
        });

        logger.info("Channel member added", {
          adminId: user.id,
          channelId,
          targetUserId: userId,
        });
        toast({
          title: "Member added",
          description: "User has been added to the channel.",
        });

        return data.insert_nchat_channel_members_one;
      } catch (error) {
        logger.error("Failed to add channel member", error as Error, {
          userId: user.id,
        });
        toast({
          title: "Add member failed",
          description: "Could not add the member. Please try again.",
          variant: "destructive",
        });
        throw error;
      }
    },
    [user?.id, addMemberMutation, toast],
  );

  // Remove member
  const removeMember = useCallback(
    async (channelId: string, targetUserId: string) => {
      if (!user?.id) throw new Error("User not authenticated");

      try {
        logger.info("Removing channel member", {
          userId: user.id,
          channelId,
          targetUserId,
        });

        await removeMemberMutation({
          variables: { channelId, userId: targetUserId },
        });

        logger.info("Channel member removed", {
          userId: user.id,
          channelId,
          targetUserId,
        });
        toast({
          title: "Member removed",
          description: "User has been removed from the channel.",
        });
      } catch (error) {
        logger.error("Failed to remove channel member", error as Error, {
          userId: user.id,
          channelId,
          targetUserId,
        });
        toast({
          title: "Remove member failed",
          description: "Could not remove the member. Please try again.",
          variant: "destructive",
        });
        throw error;
      }
    },
    [user?.id, removeMemberMutation, toast],
  );

  // Add multiple members
  const addMembersBulk = useCallback(
    async (channelId: string, userIds: string[], role: UserRole = "member") => {
      if (!user?.id) throw new Error("User not authenticated");

      try {
        logger.info("Adding multiple channel members", {
          userId: user.id,
          channelId,
          count: userIds.length,
        });

        const members = userIds.map((uid) => ({
          channel_id: channelId,
          user_id: uid,
          role,
          invited_by: user.id,
        }));

        const { data } = await addMembersBulkMutation({
          variables: { members, channelId, memberCount: userIds.length },
        });

        const addedCount =
          data.insert_nchat_channel_members?.affected_rows || 0;

        logger.info("Multiple channel members added", {
          userId: user.id,
          count: addedCount,
        });
        toast({
          title: "Members added",
          description: `${addedCount} members have been added.`,
        });

        return addedCount;
      } catch (error) {
        logger.error("Failed to add multiple members", error as Error, {
          userId: user.id,
        });
        toast({
          title: "Bulk add failed",
          description: "Could not add all members. Please try again.",
          variant: "destructive",
        });
        throw error;
      }
    },
    [user?.id, addMembersBulkMutation, toast],
  );

  // Update member role
  const updateMemberRole = useCallback(
    async (channelId: string, targetUserId: string, role: UserRole) => {
      if (!user?.id) throw new Error("User not authenticated");

      try {
        logger.info("Updating member role", {
          userId: user.id,
          channelId,
          targetUserId,
          role,
        });

        const { data } = await updateRoleMutation({
          variables: { channelId, userId: targetUserId, role },
        });

        logger.info("Member role updated", {
          userId: user.id,
          channelId,
          targetUserId,
          role,
        });
        toast({
          title: "Role updated",
          description: `Member role has been changed to ${role}.`,
        });

        return data.update_nchat_channel_members;
      } catch (error) {
        logger.error("Failed to update member role", error as Error, {
          userId: user.id,
          channelId,
          targetUserId,
        });
        toast({
          title: "Update role failed",
          description: "Could not update the member role. Please try again.",
          variant: "destructive",
        });
        throw error;
      }
    },
    [user?.id, updateRoleMutation, toast],
  );

  // Transfer ownership
  const transferOwnership = useCallback(
    async (channelId: string, newOwnerId: string) => {
      if (!user?.id) throw new Error("User not authenticated");

      try {
        logger.warn("Transferring channel ownership", {
          userId: user.id,
          channelId,
          newOwnerId,
        });

        await transferOwnershipMutation({
          variables: { channelId, currentOwnerId: user.id, newOwnerId },
        });

        logger.warn("Channel ownership transferred", {
          userId: user.id,
          channelId,
          newOwnerId,
        });
        toast({
          title: "Ownership transferred",
          description: "Channel ownership has been transferred successfully.",
        });
      } catch (error) {
        logger.error("Failed to transfer ownership", error as Error, {
          userId: user.id,
          channelId,
        });
        toast({
          title: "Transfer failed",
          description: "Could not transfer ownership. Please try again.",
          variant: "destructive",
        });
        throw error;
      }
    },
    [user?.id, transferOwnershipMutation, toast],
  );

  // Mute channel
  const muteChannel = useCallback(
    async (channelId: string, mutedUntil?: string) => {
      if (!user?.id) throw new Error("User not authenticated");

      try {
        await muteMutation({
          variables: { channelId, userId: user.id, mutedUntil },
        });
        toast({
          title: "Channel muted",
          description:
            "You will no longer receive notifications from this channel.",
        });
      } catch (error) {
        logger.error("Failed to mute channel", error as Error, {
          userId: user.id,
          channelId,
        });
        toast({
          title: "Mute failed",
          description: "Could not mute the channel. Please try again.",
          variant: "destructive",
        });
        throw error;
      }
    },
    [user?.id, muteMutation, toast],
  );

  // Unmute channel
  const unmuteChannel = useCallback(
    async (channelId: string) => {
      if (!user?.id) throw new Error("User not authenticated");

      try {
        await unmuteMutation({
          variables: { channelId, userId: user.id },
        });
        toast({
          title: "Channel unmuted",
          description: "You will now receive notifications from this channel.",
        });
      } catch (error) {
        logger.error("Failed to unmute channel", error as Error, {
          userId: user.id,
          channelId,
        });
        toast({
          title: "Unmute failed",
          description: "Could not unmute the channel. Please try again.",
          variant: "destructive",
        });
        throw error;
      }
    },
    [user?.id, unmuteMutation, toast],
  );

  // Pin channel
  const pinChannel = useCallback(
    async (channelId: string) => {
      if (!user?.id) throw new Error("User not authenticated");

      try {
        await pinMutation({
          variables: { channelId, userId: user.id },
        });
      } catch (error) {
        logger.error("Failed to pin channel", error as Error, {
          userId: user.id,
          channelId,
        });
        throw error;
      }
    },
    [user?.id, pinMutation],
  );

  // Unpin channel
  const unpinChannel = useCallback(
    async (channelId: string) => {
      if (!user?.id) throw new Error("User not authenticated");

      try {
        await unpinMutation({
          variables: { channelId, userId: user.id },
        });
      } catch (error) {
        logger.error("Failed to unpin channel", error as Error, {
          userId: user.id,
          channelId,
        });
        throw error;
      }
    },
    [user?.id, unpinMutation],
  );

  // Update notifications
  const updateNotifications = useCallback(
    async (
      channelId: string,
      notificationLevel: "all" | "mentions" | "none",
    ) => {
      if (!user?.id) throw new Error("User not authenticated");

      try {
        await updateNotificationsMutation({
          variables: { channelId, userId: user.id, notificationLevel },
        });
        toast({
          title: "Notifications updated",
          description: `Notification level set to ${notificationLevel}.`,
        });
      } catch (error) {
        logger.error("Failed to update notifications", error as Error, {
          userId: user.id,
          channelId,
        });
        toast({
          title: "Update failed",
          description:
            "Could not update notification settings. Please try again.",
          variant: "destructive",
        });
        throw error;
      }
    },
    [user?.id, updateNotificationsMutation, toast],
  );

  // Mark channel as read
  const markChannelRead = useCallback(
    async (channelId: string, messageId?: string) => {
      if (!user?.id) throw new Error("User not authenticated");

      try {
        await markReadMutation({
          variables: { channelId, userId: user.id, messageId },
        });
      } catch (error) {
        logger.error("Failed to mark channel read", error as Error, {
          userId: user.id,
          channelId,
        });
      }
    },
    [user?.id, markReadMutation],
  );

  // Get or create DM
  const getOrCreateDM = useCallback(
    async (otherUserId: string) => {
      if (!user?.id) throw new Error("User not authenticated");

      try {
        const { data } = await getOrCreateDMMutation({
          variables: { userId1: user.id, userId2: otherUserId },
        });

        const channel = data.insert_nchat_channels_one;
        router.push(`/chat/c/${channel.id}`);

        return channel;
      } catch (error) {
        logger.error("Failed to get/create DM", error as Error, {
          userId: user.id,
          otherUserId,
        });
        toast({
          title: "Error",
          description: "Could not open direct message. Please try again.",
          variant: "destructive",
        });
        throw error;
      }
    },
    [user?.id, getOrCreateDMMutation, router, toast],
  );

  // Create group DM
  const createGroupDM = useCallback(
    async (name: string | null, memberIds: string[]) => {
      if (!user?.id) throw new Error("User not authenticated");

      try {
        const allMemberIds = [
          user.id,
          ...memberIds.filter((id) => id !== user.id),
        ];
        const members = allMemberIds.map((uid, index) => ({
          user_id: uid,
          role: index === 0 ? "owner" : "member",
        }));

        const { data } = await createGroupDMMutation({
          variables: {
            name,
            createdBy: user.id,
            members,
            memberCount: allMemberIds.length,
          },
        });

        const channel = data.insert_nchat_channels_one;
        router.push(`/chat/c/${channel.id}`);

        toast({
          title: "Group created",
          description: "Group chat has been created.",
        });

        return channel;
      } catch (error) {
        logger.error("Failed to create group DM", error as Error, {
          userId: user.id,
        });
        toast({
          title: "Error",
          description: "Could not create group chat. Please try again.",
          variant: "destructive",
        });
        throw error;
      }
    },
    [user?.id, createGroupDMMutation, router, toast],
  );

  return {
    // Membership
    joinChannel,
    leaveChannel,
    addMember,
    removeMember,
    addMembersBulk,
    updateMemberRole,
    transferOwnership,

    // Settings
    muteChannel,
    unmuteChannel,
    pinChannel,
    unpinChannel,
    updateNotifications,
    markChannelRead,

    // DMs
    getOrCreateDM,
    createGroupDM,

    // Loading states
    joiningChannel,
    leavingChannel,
    addingMember,
    removingMember,
    addingMembers,
    updatingRole,
    transferringOwnership,
    mutingChannel,
    unmutingChannel,
    pinningChannel,
    unpinningChannel,
  };
}
