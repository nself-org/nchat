/**
 * Channel Permissions Service
 *
 * Service for checking and managing channel permissions.
 * Handles role-based access control for channel operations.
 */

import { ApolloClient, NormalizedCacheObject } from "@apollo/client";
import {
  CHECK_CHANNEL_MEMBERSHIP,
  GET_USER_CHANNEL_MEMBERSHIP,
  GET_CHANNEL_BY_ID,
} from "@/graphql/channels/queries";
import type { UserRole } from "@/types/user";
import { UserRoleLevel } from "@/types/user";

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface ChannelPermission {
  canView: boolean;
  canRead: boolean;
  canWrite: boolean;
  canManage: boolean;
  canInvite: boolean;
  canKick: boolean;
  canBan: boolean;
  canPin: boolean;
  canDeleteMessages: boolean;
  canDeleteOwnMessages: boolean;
  canMentionEveryone: boolean;
  canArchive: boolean;
  canDelete: boolean;
  canUpdateSettings: boolean;
  canTransferOwnership: boolean;
  canManageRoles: boolean;
}

export interface ChannelPermissionContext {
  channelId: string;
  userId: string;
  userRole: UserRole;
  channelType: string;
  isPublic: boolean;
  isArchived: boolean;
  isReadonly: boolean;
  memberRole?: UserRole;
  memberPermissions?: {
    canRead?: boolean | null;
    canWrite?: boolean | null;
    canManage?: boolean | null;
    canInvite?: boolean | null;
    canPin?: boolean | null;
    canDeleteMessages?: boolean | null;
    canMentionEveryone?: boolean | null;
  };
}

// Default permissions by role
const DEFAULT_PERMISSIONS: Record<UserRole, Partial<ChannelPermission>> = {
  owner: {
    canView: true,
    canRead: true,
    canWrite: true,
    canManage: true,
    canInvite: true,
    canKick: true,
    canBan: true,
    canPin: true,
    canDeleteMessages: true,
    canDeleteOwnMessages: true,
    canMentionEveryone: true,
    canArchive: true,
    canDelete: true,
    canUpdateSettings: true,
    canTransferOwnership: true,
    canManageRoles: true,
  },
  admin: {
    canView: true,
    canRead: true,
    canWrite: true,
    canManage: true,
    canInvite: true,
    canKick: true,
    canBan: true,
    canPin: true,
    canDeleteMessages: true,
    canDeleteOwnMessages: true,
    canMentionEveryone: true,
    canArchive: true,
    canDelete: false,
    canUpdateSettings: true,
    canTransferOwnership: false,
    canManageRoles: true,
  },
  moderator: {
    canView: true,
    canRead: true,
    canWrite: true,
    canManage: false,
    canInvite: true,
    canKick: true,
    canBan: false,
    canPin: true,
    canDeleteMessages: true,
    canDeleteOwnMessages: true,
    canMentionEveryone: true,
    canArchive: false,
    canDelete: false,
    canUpdateSettings: false,
    canTransferOwnership: false,
    canManageRoles: false,
  },
  member: {
    canView: true,
    canRead: true,
    canWrite: true,
    canManage: false,
    canInvite: false,
    canKick: false,
    canBan: false,
    canPin: false,
    canDeleteMessages: false,
    canDeleteOwnMessages: true,
    canMentionEveryone: false,
    canArchive: false,
    canDelete: false,
    canUpdateSettings: false,
    canTransferOwnership: false,
    canManageRoles: false,
  },
  guest: {
    canView: true,
    canRead: true,
    canWrite: false,
    canManage: false,
    canInvite: false,
    canKick: false,
    canBan: false,
    canPin: false,
    canDeleteMessages: false,
    canDeleteOwnMessages: false,
    canMentionEveryone: false,
    canArchive: false,
    canDelete: false,
    canUpdateSettings: false,
    canTransferOwnership: false,
    canManageRoles: false,
  },
};

// ============================================================================
// PERMISSIONS SERVICE CLASS
// ============================================================================

export class PermissionsService {
  private client: ApolloClient<NormalizedCacheObject>;

  constructor(client: ApolloClient<NormalizedCacheObject>) {
    this.client = client;
  }

  // ==========================================================================
  // PERMISSION CHECKS
  // ==========================================================================

  /**
   * Get all permissions for a user in a channel
   */
  async getChannelPermissions(
    channelId: string,
    userId: string,
    userGlobalRole: UserRole,
  ): Promise<ChannelPermission> {
    // Get channel info
    const { data: channelData } = await this.client.query({
      query: GET_CHANNEL_BY_ID,
      variables: { id: channelId },
      fetchPolicy: "network-only",
    });

    const channel = channelData.nchat_channels_by_pk;
    if (!channel) {
      // Channel not found - no permissions
      return this.getNoPermissions();
    }

    // Get user's membership
    const { data: memberData } = await this.client.query({
      query: GET_USER_CHANNEL_MEMBERSHIP,
      variables: { channelId, userId },
      fetchPolicy: "network-only",
    });

    const membership = memberData.nchat_channel_members_by_pk;

    // Build context
    const context: ChannelPermissionContext = {
      channelId,
      userId,
      userRole: userGlobalRole,
      channelType: channel.type,
      isPublic: channel.type === "public",
      isArchived: channel.is_archived || false,
      isReadonly: channel.is_readonly || false,
      memberRole: membership?.role,
      memberPermissions: membership
        ? {
            canRead: membership.can_read,
            canWrite: membership.can_write,
            canManage: membership.can_manage,
            canInvite: membership.can_invite,
            canPin: membership.can_pin,
            canDeleteMessages: membership.can_delete_messages,
            canMentionEveryone: membership.can_mention_everyone,
          }
        : undefined,
    };

    return this.calculatePermissions(context);
  }

  /**
   * Check if user can perform a specific action
   */
  async canPerformAction(
    channelId: string,
    userId: string,
    userGlobalRole: UserRole,
    action: keyof ChannelPermission,
  ): Promise<boolean> {
    const permissions = await this.getChannelPermissions(
      channelId,
      userId,
      userGlobalRole,
    );
    return permissions[action];
  }

  /**
   * Check if user can view a channel
   */
  async canViewChannel(
    channelId: string,
    userId: string,
    userGlobalRole: UserRole,
  ): Promise<boolean> {
    // Global admins and owners can view all channels
    if (UserRoleLevel[userGlobalRole] >= UserRoleLevel.admin) {
      return true;
    }

    // Get channel info
    const { data: channelData } = await this.client.query({
      query: GET_CHANNEL_BY_ID,
      variables: { id: channelId },
      fetchPolicy: "network-only",
    });

    const channel = channelData.nchat_channels_by_pk;
    if (!channel) {
      return false;
    }

    // Public channels can be viewed by anyone
    if (channel.type === "public") {
      return true;
    }

    // For private channels, user must be a member
    const { data: memberData } = await this.client.query({
      query: CHECK_CHANNEL_MEMBERSHIP,
      variables: { channelId, userId },
      fetchPolicy: "network-only",
    });

    return (memberData.nchat_channel_members?.length || 0) > 0;
  }

  /**
   * Check if user can join a channel
   */
  async canJoinChannel(
    channelId: string,
    userId: string,
    userGlobalRole: UserRole,
  ): Promise<{ canJoin: boolean; reason?: string }> {
    // Check if already a member
    const { data: memberData } = await this.client.query({
      query: CHECK_CHANNEL_MEMBERSHIP,
      variables: { channelId, userId },
      fetchPolicy: "network-only",
    });

    if ((memberData.nchat_channel_members?.length || 0) > 0) {
      return { canJoin: false, reason: "Already a member of this channel" };
    }

    // Get channel info
    const { data: channelData } = await this.client.query({
      query: GET_CHANNEL_BY_ID,
      variables: { id: channelId },
      fetchPolicy: "network-only",
    });

    const channel = channelData.nchat_channels_by_pk;
    if (!channel) {
      return { canJoin: false, reason: "Channel not found" };
    }

    if (channel.is_archived) {
      return { canJoin: false, reason: "Channel is archived" };
    }

    // Check channel type
    if (channel.type === "public") {
      // Check max members
      if (channel.max_members && channel.member_count >= channel.max_members) {
        return { canJoin: false, reason: "Channel is full" };
      }
      return { canJoin: true };
    }

    if (channel.type === "private") {
      // Global admins can join private channels
      if (UserRoleLevel[userGlobalRole] >= UserRoleLevel.admin) {
        return { canJoin: true };
      }
      return {
        canJoin: false,
        reason: "Private channel requires an invitation",
      };
    }

    if (channel.type === "direct" || channel.type === "group") {
      return { canJoin: false, reason: "Cannot join direct message channels" };
    }

    return { canJoin: false, reason: "Unknown channel type" };
  }

  /**
   * Check if user can leave a channel
   */
  async canLeaveChannel(
    channelId: string,
    userId: string,
  ): Promise<{ canLeave: boolean; reason?: string }> {
    const { data: memberData } = await this.client.query({
      query: GET_USER_CHANNEL_MEMBERSHIP,
      variables: { channelId, userId },
      fetchPolicy: "network-only",
    });

    const membership = memberData.nchat_channel_members_by_pk;
    if (!membership) {
      return { canLeave: false, reason: "Not a member of this channel" };
    }

    // Owner cannot leave without transferring ownership
    if (membership.role === "owner") {
      return {
        canLeave: false,
        reason: "Channel owner must transfer ownership before leaving",
      };
    }

    // Get channel info
    const { data: channelData } = await this.client.query({
      query: GET_CHANNEL_BY_ID,
      variables: { id: channelId },
      fetchPolicy: "network-only",
    });

    const channel = channelData.nchat_channels_by_pk;
    if (!channel) {
      return { canLeave: false, reason: "Channel not found" };
    }

    // Cannot leave default channel
    if (channel.is_default) {
      return { canLeave: false, reason: "Cannot leave default channel" };
    }

    return { canLeave: true };
  }

  /**
   * Check if user can invite others to a channel
   */
  async canInviteToChannel(
    channelId: string,
    userId: string,
    userGlobalRole: UserRole,
  ): Promise<boolean> {
    return this.canPerformAction(
      channelId,
      userId,
      userGlobalRole,
      "canInvite",
    );
  }

  /**
   * Check if user can remove a member from a channel
   */
  async canRemoveMember(
    channelId: string,
    actorUserId: string,
    actorGlobalRole: UserRole,
    targetUserId: string,
  ): Promise<{ canRemove: boolean; reason?: string }> {
    // Cannot remove yourself
    if (actorUserId === targetUserId) {
      return { canRemove: false, reason: "Use leave channel instead" };
    }

    // Get actor's membership
    const { data: actorData } = await this.client.query({
      query: GET_USER_CHANNEL_MEMBERSHIP,
      variables: { channelId, userId: actorUserId },
      fetchPolicy: "network-only",
    });

    const actorMembership = actorData.nchat_channel_members_by_pk;
    if (!actorMembership) {
      return { canRemove: false, reason: "Not a member of this channel" };
    }

    // Get target's membership
    const { data: targetData } = await this.client.query({
      query: GET_USER_CHANNEL_MEMBERSHIP,
      variables: { channelId, userId: targetUserId },
      fetchPolicy: "network-only",
    });

    const targetMembership = targetData.nchat_channel_members_by_pk;
    if (!targetMembership) {
      return { canRemove: false, reason: "Target user is not a member" };
    }

    const actorRole = actorMembership.role as UserRole;
    const targetRole = targetMembership.role as UserRole;

    // Check role hierarchy
    if (UserRoleLevel[actorRole] <= UserRoleLevel[targetRole]) {
      return {
        canRemove: false,
        reason: "Cannot remove member with equal or higher role",
      };
    }

    // Check if actor has kick permission
    const permissions = await this.getChannelPermissions(
      channelId,
      actorUserId,
      actorGlobalRole,
    );
    if (!permissions.canKick) {
      return {
        canRemove: false,
        reason: "Insufficient permissions to remove members",
      };
    }

    return { canRemove: true };
  }

  /**
   * Check if user can update a member's role
   */
  async canUpdateMemberRole(
    channelId: string,
    actorUserId: string,
    actorGlobalRole: UserRole,
    targetUserId: string,
    newRole: UserRole,
  ): Promise<{ canUpdate: boolean; reason?: string }> {
    // Cannot update own role
    if (actorUserId === targetUserId) {
      return { canUpdate: false, reason: "Cannot update your own role" };
    }

    const permissions = await this.getChannelPermissions(
      channelId,
      actorUserId,
      actorGlobalRole,
    );
    if (!permissions.canManageRoles) {
      return {
        canUpdate: false,
        reason: "Insufficient permissions to manage roles",
      };
    }

    // Get target's current membership
    const { data: targetData } = await this.client.query({
      query: GET_USER_CHANNEL_MEMBERSHIP,
      variables: { channelId, userId: targetUserId },
      fetchPolicy: "network-only",
    });

    const targetMembership = targetData.nchat_channel_members_by_pk;
    if (!targetMembership) {
      return { canUpdate: false, reason: "Target user is not a member" };
    }

    // Get actor's membership
    const { data: actorData } = await this.client.query({
      query: GET_USER_CHANNEL_MEMBERSHIP,
      variables: { channelId, userId: actorUserId },
      fetchPolicy: "network-only",
    });

    const actorRole = actorData.nchat_channel_members_by_pk?.role as UserRole;
    const currentTargetRole = targetMembership.role as UserRole;

    // Cannot modify owner role
    if (currentTargetRole === "owner") {
      return { canUpdate: false, reason: "Cannot modify owner role" };
    }

    // Cannot assign role higher than own
    if (UserRoleLevel[newRole] >= UserRoleLevel[actorRole]) {
      return {
        canUpdate: false,
        reason: "Cannot assign role equal to or higher than your own",
      };
    }

    // Cannot modify role of someone with higher role
    if (UserRoleLevel[currentTargetRole] >= UserRoleLevel[actorRole]) {
      return {
        canUpdate: false,
        reason: "Cannot modify role of member with equal or higher role",
      };
    }

    return { canUpdate: true };
  }

  // ==========================================================================
  // HELPER METHODS
  // ==========================================================================

  /**
   * Calculate permissions based on context
   */
  private calculatePermissions(
    context: ChannelPermissionContext,
  ): ChannelPermission {
    const { memberRole, memberPermissions, isArchived, isReadonly, isPublic } =
      context;

    // Start with no permissions
    let permissions = this.getNoPermissions();

    // If not a member of private channel, very limited permissions
    if (!memberRole && !isPublic) {
      return permissions;
    }

    // Get base permissions from role (member role or default to 'guest' for public channels)
    const role = memberRole || "guest";
    const rolePermissions = DEFAULT_PERMISSIONS[role];

    // Apply role-based permissions
    permissions = {
      ...permissions,
      ...rolePermissions,
    } as ChannelPermission;

    // Apply permission overrides from membership
    if (memberPermissions) {
      if (
        memberPermissions.canRead !== null &&
        memberPermissions.canRead !== undefined
      ) {
        permissions.canRead = memberPermissions.canRead;
      }
      if (
        memberPermissions.canWrite !== null &&
        memberPermissions.canWrite !== undefined
      ) {
        permissions.canWrite = memberPermissions.canWrite;
      }
      if (
        memberPermissions.canManage !== null &&
        memberPermissions.canManage !== undefined
      ) {
        permissions.canManage = memberPermissions.canManage;
      }
      if (
        memberPermissions.canInvite !== null &&
        memberPermissions.canInvite !== undefined
      ) {
        permissions.canInvite = memberPermissions.canInvite;
      }
      if (
        memberPermissions.canPin !== null &&
        memberPermissions.canPin !== undefined
      ) {
        permissions.canPin = memberPermissions.canPin;
      }
      if (
        memberPermissions.canDeleteMessages !== null &&
        memberPermissions.canDeleteMessages !== undefined
      ) {
        permissions.canDeleteMessages = memberPermissions.canDeleteMessages;
      }
      if (
        memberPermissions.canMentionEveryone !== null &&
        memberPermissions.canMentionEveryone !== undefined
      ) {
        permissions.canMentionEveryone = memberPermissions.canMentionEveryone;
      }
    }

    // Apply channel-level restrictions
    if (isArchived) {
      permissions.canWrite = false;
      permissions.canInvite = false;
      permissions.canKick = false;
      permissions.canPin = false;
      permissions.canDeleteMessages = false;
      permissions.canManage = false;
    }

    if (isReadonly) {
      // Only allow writing for owner, admin, moderator
      if (role !== "owner" && role !== "admin" && role !== "moderator") {
        permissions.canWrite = false;
      }
    }

    return permissions;
  }

  /**
   * Get a permissions object with all permissions set to false
   */
  private getNoPermissions(): ChannelPermission {
    return {
      canView: false,
      canRead: false,
      canWrite: false,
      canManage: false,
      canInvite: false,
      canKick: false,
      canBan: false,
      canPin: false,
      canDeleteMessages: false,
      canDeleteOwnMessages: false,
      canMentionEveryone: false,
      canArchive: false,
      canDelete: false,
      canUpdateSettings: false,
      canTransferOwnership: false,
      canManageRoles: false,
    };
  }

  /**
   * Compare two roles and return the higher one
   */
  compareRoles(role1: UserRole, role2: UserRole): "higher" | "lower" | "equal" {
    const level1 = UserRoleLevel[role1];
    const level2 = UserRoleLevel[role2];

    if (level1 > level2) return "higher";
    if (level1 < level2) return "lower";
    return "equal";
  }

  /**
   * Check if a role has at least the specified privilege level
   */
  hasMinimumRole(userRole: UserRole, minimumRole: UserRole): boolean {
    return UserRoleLevel[userRole] >= UserRoleLevel[minimumRole];
  }
}

// ============================================================================
// SINGLETON FACTORY
// ============================================================================

let permissionsServiceInstance: PermissionsService | null = null;

export function getPermissionsService(
  client: ApolloClient<NormalizedCacheObject>,
): PermissionsService {
  if (!permissionsServiceInstance) {
    permissionsServiceInstance = new PermissionsService(client);
  }
  return permissionsServiceInstance;
}

export function createPermissionsService(
  client: ApolloClient<NormalizedCacheObject>,
): PermissionsService {
  return new PermissionsService(client);
}
