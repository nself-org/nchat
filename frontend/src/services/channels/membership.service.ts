/**
 * Channel Membership Service
 *
 * Service for managing channel memberships including join, leave, invite, and member management.
 * Provides a clean API for membership operations with proper error handling.
 */

import { ApolloClient, NormalizedCacheObject } from "@apollo/client";
import {
  GET_CHANNEL_MEMBERS,
  GET_CHANNEL_MEMBERS_BY_ROLE,
  GET_CHANNEL_ADMINS,
  GET_USER_CHANNELS,
  GET_USER_DM_CHANNELS,
  GET_USER_UNREAD_CHANNELS,
  CHECK_CHANNEL_MEMBERSHIP,
  GET_USER_CHANNEL_MEMBERSHIP,
  GET_DISCOVERABLE_CHANNELS,
} from "@/graphql/channels/queries";
import {
  JOIN_CHANNEL,
  LEAVE_CHANNEL,
  ADD_CHANNEL_MEMBER,
  REMOVE_CHANNEL_MEMBER,
  ADD_CHANNEL_MEMBERS_BULK,
  REMOVE_CHANNEL_MEMBERS_BULK,
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
  canRead?: boolean | null;
  canWrite?: boolean | null;
  canManage?: boolean | null;
  canInvite?: boolean | null;
  canPin?: boolean | null;
  canDeleteMessages?: boolean | null;
  canMentionEveryone?: boolean | null;
  isMuted: boolean;
  mutedUntil?: string | null;
  isPinned: boolean;
  notificationLevel: "all" | "mentions" | "none";
  lastReadMessageId?: string | null;
  lastReadAt?: string | null;
  unreadCount: number;
  mentionCount: number;
  joinedAt: string;
  invitedBy?: string | null;
  createdAt: string;
  updatedAt: string;
  user?: {
    id: string;
    username: string;
    displayName: string;
    email: string;
    avatarUrl?: string;
  };
}

export interface MembershipDetails {
  isMember: boolean;
  role?: UserRole;
  joinedAt?: string;
  canRead?: boolean;
  canWrite?: boolean;
  canManage?: boolean;
  canInvite?: boolean;
  notificationLevel?: "all" | "mentions" | "none";
  isMuted?: boolean;
}

export interface UserChannelInfo {
  channel: {
    id: string;
    name: string;
    slug: string;
    description?: string;
    type: string;
    isPrivate: boolean;
    isArchived: boolean;
  };
  role: UserRole;
  isMuted: boolean;
  isPinned: boolean;
  notificationLevel: string;
  lastReadAt?: string;
  unreadCount: number;
  mentionCount: number;
}

export interface MemberListResult {
  members: ChannelMember[];
  total: number;
  hasMore: boolean;
}

// ============================================================================
// MEMBERSHIP SERVICE CLASS
// ============================================================================

export class MembershipService {
  private client: ApolloClient<NormalizedCacheObject>;

  constructor(client: ApolloClient<NormalizedCacheObject>) {
    this.client = client;
  }

  // ==========================================================================
  // MEMBER QUERIES
  // ==========================================================================

  /**
   * Get channel members with pagination
   */
  async getChannelMembers(
    channelId: string,
    limit = 50,
    offset = 0,
  ): Promise<MemberListResult> {
    const { data } = await this.client.query({
      query: GET_CHANNEL_MEMBERS,
      variables: { channelId, limit, offset },
      fetchPolicy: "network-only",
    });

    const members = this.transformMembers(data.nchat_channel_members || []);
    const total =
      data.nchat_channel_members_aggregate?.aggregate?.count || members.length;

    return {
      members,
      total,
      hasMore: offset + limit < total,
    };
  }

  /**
   * Get channel members by role
   */
  async getChannelMembersByRole(
    channelId: string,
    role: UserRole,
  ): Promise<ChannelMember[]> {
    const { data } = await this.client.query({
      query: GET_CHANNEL_MEMBERS_BY_ROLE,
      variables: { channelId, role },
      fetchPolicy: "network-only",
    });

    return this.transformMembers(data.nchat_channel_members || []);
  }

  /**
   * Get channel admins (owners, admins, moderators)
   */
  async getChannelAdmins(channelId: string): Promise<ChannelMember[]> {
    const { data } = await this.client.query({
      query: GET_CHANNEL_ADMINS,
      variables: { channelId },
      fetchPolicy: "network-only",
    });

    return this.transformMembers(data.nchat_channel_members || []);
  }

  /**
   * Check if a user is a member of a channel
   */
  async checkMembership(
    channelId: string,
    userId: string,
  ): Promise<MembershipDetails> {
    const { data } = await this.client.query({
      query: CHECK_CHANNEL_MEMBERSHIP,
      variables: { channelId, userId },
      fetchPolicy: "network-only",
    });

    if (
      !data.nchat_channel_members ||
      data.nchat_channel_members.length === 0
    ) {
      return { isMember: false };
    }

    const member = data.nchat_channel_members[0];
    return {
      isMember: true,
      role: member.role as UserRole,
      joinedAt: member.joined_at,
      canRead: member.can_read,
      canWrite: member.can_write,
      canManage: member.can_manage,
      canInvite: member.can_invite,
      notificationLevel: member.notification_level,
      isMuted: member.is_muted,
    };
  }

  /**
   * Get user's membership details for a specific channel
   */
  async getUserMembership(
    channelId: string,
    userId: string,
  ): Promise<ChannelMember | null> {
    const { data } = await this.client.query({
      query: GET_USER_CHANNEL_MEMBERSHIP,
      variables: { channelId, userId },
      fetchPolicy: "network-only",
    });

    if (!data.nchat_channel_members_by_pk) {
      return null;
    }

    return this.transformMember(data.nchat_channel_members_by_pk);
  }

  // ==========================================================================
  // USER CHANNEL QUERIES
  // ==========================================================================

  /**
   * Get all channels a user is a member of
   */
  async getUserChannels(
    userId: string,
    includeArchived = false,
  ): Promise<UserChannelInfo[]> {
    const { data } = await this.client.query({
      query: GET_USER_CHANNELS,
      variables: { userId, includeArchived },
      fetchPolicy: "network-only",
    });

    return (data.nchat_channel_members || []).map(
      (m: Record<string, unknown>) => this.transformUserChannelInfo(m),
    );
  }

  /**
   * Get user's DM channels
   */
  async getUserDMChannels(userId: string): Promise<UserChannelInfo[]> {
    const { data } = await this.client.query({
      query: GET_USER_DM_CHANNELS,
      variables: { userId },
      fetchPolicy: "network-only",
    });

    return (data.nchat_channel_members || []).map(
      (m: Record<string, unknown>) => this.transformUserChannelInfo(m),
    );
  }

  /**
   * Get channels with unread messages for a user
   */
  async getUserUnreadChannels(userId: string): Promise<
    Array<{
      channelId: string;
      channelName: string;
      unreadCount: number;
      mentionCount: number;
    }>
  > {
    const { data } = await this.client.query({
      query: GET_USER_UNREAD_CHANNELS,
      variables: { userId },
      fetchPolicy: "network-only",
    });

    return (data.nchat_channel_members || []).map(
      (m: Record<string, unknown>) => ({
        channelId: (m.channel as Record<string, unknown>).id as string,
        channelName: (m.channel as Record<string, unknown>).name as string,
        unreadCount: m.unread_count as number,
        mentionCount: m.mention_count as number,
      }),
    );
  }

  /**
   * Get discoverable channels (public channels user isn't a member of)
   */
  async getDiscoverableChannels(
    userId: string,
    limit = 20,
    offset = 0,
  ): Promise<
    {
      id: string;
      name: string;
      slug: string;
      description?: string;
      memberCount: number;
    }[]
  > {
    const { data } = await this.client.query({
      query: GET_DISCOVERABLE_CHANNELS,
      variables: { userId, limit, offset },
      fetchPolicy: "network-only",
    });

    return (data.nchat_channels || []).map((c: Record<string, unknown>) => ({
      id: c.id as string,
      name: c.name as string,
      slug: c.slug as string,
      description: c.description as string | undefined,
      memberCount: c.member_count as number,
    }));
  }

  // ==========================================================================
  // MEMBERSHIP MUTATIONS
  // ==========================================================================

  /**
   * Join a public channel
   */
  async joinChannel(channelId: string, userId: string): Promise<ChannelMember> {
    const { data } = await this.client.mutate({
      mutation: JOIN_CHANNEL,
      variables: { channelId, userId },
    });

    return this.transformMember(data.insert_nchat_channel_members_one);
  }

  /**
   * Leave a channel
   */
  async leaveChannel(channelId: string, userId: string): Promise<boolean> {
    const { data } = await this.client.mutate({
      mutation: LEAVE_CHANNEL,
      variables: { channelId, userId },
    });

    return (data.delete_nchat_channel_members?.affected_rows || 0) > 0;
  }

  /**
   * Add a member to a channel (invite)
   */
  async addMember(
    channelId: string,
    userId: string,
    role: UserRole = "member",
    invitedBy?: string,
  ): Promise<ChannelMember> {
    const { data } = await this.client.mutate({
      mutation: ADD_CHANNEL_MEMBER,
      variables: { channelId, userId, role, invitedBy },
    });

    return this.transformMember(data.insert_nchat_channel_members_one);
  }

  /**
   * Remove a member from a channel
   */
  async removeMember(channelId: string, userId: string): Promise<boolean> {
    const { data } = await this.client.mutate({
      mutation: REMOVE_CHANNEL_MEMBER,
      variables: { channelId, userId },
    });

    return (data.delete_nchat_channel_members?.affected_rows || 0) > 0;
  }

  /**
   * Add multiple members to a channel (bulk invite)
   */
  async addMembersBulk(
    channelId: string,
    userIds: string[],
    role: UserRole = "member",
    invitedBy?: string,
  ): Promise<number> {
    const members = userIds.map((userId) => ({
      channel_id: channelId,
      user_id: userId,
      role,
      invited_by: invitedBy,
    }));

    const { data } = await this.client.mutate({
      mutation: ADD_CHANNEL_MEMBERS_BULK,
      variables: { members, channelId, memberCount: userIds.length },
    });

    return data.insert_nchat_channel_members?.affected_rows || 0;
  }

  /**
   * Remove multiple members from a channel
   */
  async removeMembersBulk(
    channelId: string,
    userIds: string[],
  ): Promise<number> {
    const { data } = await this.client.mutate({
      mutation: REMOVE_CHANNEL_MEMBERS_BULK,
      variables: { channelId, userIds, memberCount: -userIds.length },
    });

    return data.delete_nchat_channel_members?.affected_rows || 0;
  }

  /**
   * Update a member's role
   */
  async updateMemberRole(
    channelId: string,
    userId: string,
    role: UserRole,
  ): Promise<ChannelMember | null> {
    const { data } = await this.client.mutate({
      mutation: UPDATE_MEMBER_ROLE,
      variables: { channelId, userId, role },
    });

    const returning = data.update_nchat_channel_members?.returning;
    if (!returning || returning.length === 0) {
      return null;
    }

    return this.transformMember(returning[0]);
  }

  /**
   * Update a member's permissions
   */
  async updateMemberPermissions(
    channelId: string,
    userId: string,
    permissions: {
      canRead?: boolean | null;
      canWrite?: boolean | null;
      canManage?: boolean | null;
      canInvite?: boolean | null;
      canPin?: boolean | null;
      canDeleteMessages?: boolean | null;
      canMentionEveryone?: boolean | null;
    },
  ): Promise<boolean> {
    const { data } = await this.client.mutate({
      mutation: UPDATE_MEMBER_PERMISSIONS,
      variables: {
        channelId,
        userId,
        canRead: permissions.canRead,
        canWrite: permissions.canWrite,
        canManage: permissions.canManage,
        canInvite: permissions.canInvite,
        canPin: permissions.canPin,
        canDeleteMessages: permissions.canDeleteMessages,
        canMentionEveryone: permissions.canMentionEveryone,
      },
    });

    return (data.update_nchat_channel_members?.affected_rows || 0) > 0;
  }

  /**
   * Update a member's nickname
   */
  async updateMemberNickname(
    channelId: string,
    userId: string,
    nickname: string | null,
  ): Promise<boolean> {
    const { data } = await this.client.mutate({
      mutation: UPDATE_MEMBER_NICKNAME,
      variables: { channelId, userId, nickname },
    });

    return (data.update_nchat_channel_members?.affected_rows || 0) > 0;
  }

  /**
   * Transfer channel ownership to another member
   */
  async transferOwnership(
    channelId: string,
    currentOwnerId: string,
    newOwnerId: string,
  ): Promise<boolean> {
    const { data } = await this.client.mutate({
      mutation: TRANSFER_CHANNEL_OWNERSHIP,
      variables: { channelId, currentOwnerId, newOwnerId },
    });

    return (
      (data.update_current_owner?.affected_rows || 0) > 0 &&
      (data.update_new_owner?.affected_rows || 0) > 0
    );
  }

  // ==========================================================================
  // MEMBER SETTINGS
  // ==========================================================================

  /**
   * Mute a channel for a user
   */
  async muteChannel(
    channelId: string,
    userId: string,
    mutedUntil?: string,
  ): Promise<boolean> {
    const { data } = await this.client.mutate({
      mutation: MUTE_CHANNEL,
      variables: { channelId, userId, mutedUntil },
    });

    return (data.update_nchat_channel_members?.affected_rows || 0) > 0;
  }

  /**
   * Unmute a channel for a user
   */
  async unmuteChannel(channelId: string, userId: string): Promise<boolean> {
    const { data } = await this.client.mutate({
      mutation: UNMUTE_CHANNEL,
      variables: { channelId, userId },
    });

    return (data.update_nchat_channel_members?.affected_rows || 0) > 0;
  }

  /**
   * Pin a channel for a user
   */
  async pinChannel(channelId: string, userId: string): Promise<boolean> {
    const { data } = await this.client.mutate({
      mutation: PIN_CHANNEL,
      variables: { channelId, userId },
    });

    return (data.update_nchat_channel_members?.affected_rows || 0) > 0;
  }

  /**
   * Unpin a channel for a user
   */
  async unpinChannel(channelId: string, userId: string): Promise<boolean> {
    const { data } = await this.client.mutate({
      mutation: UNPIN_CHANNEL,
      variables: { channelId, userId },
    });

    return (data.update_nchat_channel_members?.affected_rows || 0) > 0;
  }

  /**
   * Update notification settings for a channel
   */
  async updateNotifications(
    channelId: string,
    userId: string,
    notificationLevel: "all" | "mentions" | "none",
  ): Promise<boolean> {
    const { data } = await this.client.mutate({
      mutation: UPDATE_CHANNEL_NOTIFICATIONS,
      variables: { channelId, userId, notificationLevel },
    });

    return (data.update_nchat_channel_members?.affected_rows || 0) > 0;
  }

  /**
   * Mark a channel as read
   */
  async markChannelRead(
    channelId: string,
    userId: string,
    messageId?: string,
  ): Promise<boolean> {
    const { data } = await this.client.mutate({
      mutation: MARK_CHANNEL_READ,
      variables: { channelId, userId, messageId },
    });

    return (data.update_nchat_channel_members?.affected_rows || 0) > 0;
  }

  // ==========================================================================
  // DIRECT MESSAGES
  // ==========================================================================

  /**
   * Get or create a direct message channel between two users
   */
  async getOrCreateDM(
    userId1: string,
    userId2: string,
  ): Promise<{ id: string; name: string; type: string }> {
    const { data } = await this.client.mutate({
      mutation: GET_OR_CREATE_DM,
      variables: { userId1, userId2 },
    });

    const channel = data.insert_nchat_channels_one;
    return {
      id: channel.id,
      name: channel.name,
      type: channel.type,
    };
  }

  /**
   * Create a group DM
   */
  async createGroupDM(
    name: string | null,
    createdBy: string,
    memberIds: string[],
  ): Promise<{ id: string; name: string; type: string }> {
    const members = memberIds.map((userId, index) => ({
      user_id: userId,
      role: index === 0 ? "owner" : "member",
    }));

    const { data } = await this.client.mutate({
      mutation: CREATE_GROUP_DM,
      variables: {
        name,
        createdBy,
        members,
        memberCount: memberIds.length,
      },
    });

    const channel = data.insert_nchat_channels_one;
    return {
      id: channel.id,
      name: channel.name || "Group Chat",
      type: channel.type,
    };
  }

  // ==========================================================================
  // HELPER METHODS
  // ==========================================================================

  /**
   * Transform raw member data to ChannelMember interface
   */
  private transformMember(raw: Record<string, unknown>): ChannelMember {
    return {
      id: raw.id as string,
      channelId: raw.channel_id as string,
      userId: raw.user_id as string,
      role: raw.role as UserRole,
      nickname: raw.nickname as string | null,
      canRead: raw.can_read as boolean | null,
      canWrite: raw.can_write as boolean | null,
      canManage: raw.can_manage as boolean | null,
      canInvite: raw.can_invite as boolean | null,
      canPin: raw.can_pin as boolean | null,
      canDeleteMessages: raw.can_delete_messages as boolean | null,
      canMentionEveryone: raw.can_mention_everyone as boolean | null,
      isMuted: (raw.is_muted as boolean) || false,
      mutedUntil: raw.muted_until as string | null,
      isPinned: (raw.is_pinned as boolean) || false,
      notificationLevel:
        (raw.notification_level as "all" | "mentions" | "none") || "all",
      lastReadMessageId: raw.last_read_message_id as string | null,
      lastReadAt: raw.last_read_at as string | null,
      unreadCount: (raw.unread_count as number) || 0,
      mentionCount: (raw.mention_count as number) || 0,
      joinedAt: raw.joined_at as string,
      invitedBy: raw.invited_by as string | null,
      createdAt: raw.created_at as string,
      updatedAt: raw.updated_at as string,
      user: raw.user
        ? {
            id: (raw.user as Record<string, unknown>).id as string,
            username: (raw.user as Record<string, unknown>).username as string,
            displayName: (raw.user as Record<string, unknown>)
              .display_name as string,
            email: (raw.user as Record<string, unknown>).email as string,
            avatarUrl: (raw.user as Record<string, unknown>).avatar_url as
              | string
              | undefined,
          }
        : undefined,
    };
  }

  /**
   * Transform an array of raw members
   */
  private transformMembers(
    rawMembers: Record<string, unknown>[],
  ): ChannelMember[] {
    return rawMembers.map((raw) => this.transformMember(raw));
  }

  /**
   * Transform user channel membership info
   */
  private transformUserChannelInfo(
    raw: Record<string, unknown>,
  ): UserChannelInfo {
    const channel = raw.channel as Record<string, unknown>;
    return {
      channel: {
        id: channel.id as string,
        name: channel.name as string,
        slug: channel.slug as string,
        description: channel.description as string | undefined,
        type: channel.type as string,
        isPrivate: (channel.is_private as boolean) || false,
        isArchived: (channel.is_archived as boolean) || false,
      },
      role: raw.role as UserRole,
      isMuted: (raw.is_muted as boolean) || false,
      isPinned: (raw.is_pinned as boolean) || false,
      notificationLevel: (raw.notification_level as string) || "all",
      lastReadAt: raw.last_read_at as string | undefined,
      unreadCount: (raw.unread_count as number) || 0,
      mentionCount: (raw.mention_count as number) || 0,
    };
  }
}

// ============================================================================
// SINGLETON FACTORY
// ============================================================================

let membershipServiceInstance: MembershipService | null = null;

export function getMembershipService(
  client: ApolloClient<NormalizedCacheObject>,
): MembershipService {
  if (!membershipServiceInstance) {
    membershipServiceInstance = new MembershipService(client);
  }
  return membershipServiceInstance;
}

export function createMembershipService(
  client: ApolloClient<NormalizedCacheObject>,
): MembershipService {
  return new MembershipService(client);
}
