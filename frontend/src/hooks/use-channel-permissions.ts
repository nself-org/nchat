"use client";

/**
 * Channel Permissions Hook
 *
 * React hook for checking channel permissions and authorization.
 * Provides an easy way to check what actions a user can perform on a channel.
 */

import { useState, useEffect, useCallback, useMemo } from "react";
import { useAuth } from "@/contexts/auth-context";
import { useChannelMembership } from "./use-channel-members";
import { useChannel } from "./use-channels";
import type { UserRole } from "@/types/user";
import { UserRoleLevel } from "@/types/user";

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface ChannelPermissions {
  // View/Read
  canView: boolean;
  canRead: boolean;

  // Write
  canWrite: boolean;
  canSendMessages: boolean;

  // Management
  canManage: boolean;
  canInvite: boolean;
  canKick: boolean;
  canBan: boolean;
  canPin: boolean;
  canDeleteMessages: boolean;
  canDeleteOwnMessages: boolean;
  canMentionEveryone: boolean;

  // Settings
  canUpdateSettings: boolean;
  canArchive: boolean;
  canDelete: boolean;
  canTransferOwnership: boolean;
  canManageRoles: boolean;

  // Computed
  isOwner: boolean;
  isAdmin: boolean;
  isModerator: boolean;
  isMember: boolean;
  role: UserRole | null;
}

const DEFAULT_PERMISSIONS: ChannelPermissions = {
  canView: false,
  canRead: false,
  canWrite: false,
  canSendMessages: false,
  canManage: false,
  canInvite: false,
  canKick: false,
  canBan: false,
  canPin: false,
  canDeleteMessages: false,
  canDeleteOwnMessages: false,
  canMentionEveryone: false,
  canUpdateSettings: false,
  canArchive: false,
  canDelete: false,
  canTransferOwnership: false,
  canManageRoles: false,
  isOwner: false,
  isAdmin: false,
  isModerator: false,
  isMember: false,
  role: null,
};

// Role-based permission defaults
const ROLE_PERMISSIONS: Record<UserRole, Partial<ChannelPermissions>> = {
  owner: {
    canView: true,
    canRead: true,
    canWrite: true,
    canSendMessages: true,
    canManage: true,
    canInvite: true,
    canKick: true,
    canBan: true,
    canPin: true,
    canDeleteMessages: true,
    canDeleteOwnMessages: true,
    canMentionEveryone: true,
    canUpdateSettings: true,
    canArchive: true,
    canDelete: true,
    canTransferOwnership: true,
    canManageRoles: true,
    isOwner: true,
    isAdmin: true,
    isModerator: true,
    isMember: true,
  },
  admin: {
    canView: true,
    canRead: true,
    canWrite: true,
    canSendMessages: true,
    canManage: true,
    canInvite: true,
    canKick: true,
    canBan: true,
    canPin: true,
    canDeleteMessages: true,
    canDeleteOwnMessages: true,
    canMentionEveryone: true,
    canUpdateSettings: true,
    canArchive: true,
    canDelete: false,
    canTransferOwnership: false,
    canManageRoles: true,
    isOwner: false,
    isAdmin: true,
    isModerator: true,
    isMember: true,
  },
  moderator: {
    canView: true,
    canRead: true,
    canWrite: true,
    canSendMessages: true,
    canManage: false,
    canInvite: true,
    canKick: true,
    canBan: false,
    canPin: true,
    canDeleteMessages: true,
    canDeleteOwnMessages: true,
    canMentionEveryone: true,
    canUpdateSettings: false,
    canArchive: false,
    canDelete: false,
    canTransferOwnership: false,
    canManageRoles: false,
    isOwner: false,
    isAdmin: false,
    isModerator: true,
    isMember: true,
  },
  member: {
    canView: true,
    canRead: true,
    canWrite: true,
    canSendMessages: true,
    canManage: false,
    canInvite: false,
    canKick: false,
    canBan: false,
    canPin: false,
    canDeleteMessages: false,
    canDeleteOwnMessages: true,
    canMentionEveryone: false,
    canUpdateSettings: false,
    canArchive: false,
    canDelete: false,
    canTransferOwnership: false,
    canManageRoles: false,
    isOwner: false,
    isAdmin: false,
    isModerator: false,
    isMember: true,
  },
  guest: {
    canView: true,
    canRead: true,
    canWrite: false,
    canSendMessages: false,
    canManage: false,
    canInvite: false,
    canKick: false,
    canBan: false,
    canPin: false,
    canDeleteMessages: false,
    canDeleteOwnMessages: false,
    canMentionEveryone: false,
    canUpdateSettings: false,
    canArchive: false,
    canDelete: false,
    canTransferOwnership: false,
    canManageRoles: false,
    isOwner: false,
    isAdmin: false,
    isModerator: false,
    isMember: true,
  },
};

// ============================================================================
// HOOK
// ============================================================================

/**
 * Hook to get permissions for a channel
 */
export function useChannelPermissions(channelId: string | null): {
  permissions: ChannelPermissions;
  loading: boolean;
  error: Error | null;
  can: (permission: keyof ChannelPermissions) => boolean;
  hasMinimumRole: (minimumRole: UserRole) => boolean;
  refetch: () => void;
} {
  const { user } = useAuth();
  const {
    channel,
    loading: channelLoading,
    error: channelError,
  } = useChannel(channelId);
  const {
    membership,
    isMember,
    loading: membershipLoading,
    error: membershipError,
    refetch: refetchMembership,
  } = useChannelMembership(channelId);

  const [permissions, setPermissions] =
    useState<ChannelPermissions>(DEFAULT_PERMISSIONS);

  // Calculate permissions when data changes
  useEffect(() => {
    if (!channelId || !channel) {
      setPermissions(DEFAULT_PERMISSIONS);
      return;
    }

    // Start with default no permissions
    let perms = { ...DEFAULT_PERMISSIONS };

    // Get user's global role from auth context
    const userGlobalRole = (user?.role as UserRole) || "guest";

    // Get channel-specific role
    const channelRole = membership?.role as UserRole | undefined;

    // Determine effective role (use channel role if member, otherwise use global role for admins)
    let effectiveRole: UserRole | null = null;

    if (isMember && channelRole) {
      effectiveRole = channelRole;
    } else if (UserRoleLevel[userGlobalRole] >= UserRoleLevel.admin) {
      // Global admins can view/manage channels they're not members of
      effectiveRole = userGlobalRole;
    } else if (channel.type === "public") {
      // Non-members can view public channels
      perms.canView = true;
      perms.canRead = true;
    }

    // Apply role-based permissions
    if (effectiveRole) {
      const rolePerms = ROLE_PERMISSIONS[effectiveRole];
      perms = { ...perms, ...rolePerms, role: effectiveRole };
    }

    // Apply membership-specific permission overrides
    if (membership) {
      if (membership.canRead !== undefined) perms.canRead = membership.canRead;
      if (membership.canWrite !== undefined) {
        perms.canWrite = membership.canWrite;
        perms.canSendMessages = membership.canWrite;
      }
      if (membership.canManage !== undefined)
        perms.canManage = membership.canManage;
      if (membership.canInvite !== undefined)
        perms.canInvite = membership.canInvite;
    }

    // Apply channel-specific restrictions
    if (channel.isArchived) {
      perms.canWrite = false;
      perms.canSendMessages = false;
      perms.canInvite = false;
      perms.canKick = false;
      perms.canPin = false;
      perms.canDeleteMessages = false;
    }

    if (channel.isReadonly) {
      // Only admins and above can write in readonly channels
      if (!perms.isAdmin && !perms.isOwner && !perms.isModerator) {
        perms.canWrite = false;
        perms.canSendMessages = false;
      }
    }

    setPermissions(perms);
  }, [channelId, channel, membership, isMember, user?.role]);

  // Helper to check a specific permission
  const can = useCallback(
    (permission: keyof ChannelPermissions): boolean => {
      return !!permissions[permission];
    },
    [permissions],
  );

  // Helper to check minimum role
  const hasMinimumRole = useCallback(
    (minimumRole: UserRole): boolean => {
      if (!permissions.role) return false;
      return UserRoleLevel[permissions.role] >= UserRoleLevel[minimumRole];
    },
    [permissions.role],
  );

  return {
    permissions,
    loading: channelLoading || membershipLoading,
    error: channelError || membershipError || null,
    can,
    hasMinimumRole,
    refetch: refetchMembership,
  };
}

/**
 * Hook to check if user can perform a specific action
 */
export function useCanPerformAction(
  channelId: string | null,
  action: keyof ChannelPermissions,
): boolean {
  const { permissions, loading } = useChannelPermissions(channelId);

  if (loading) return false;

  return !!permissions[action];
}

/**
 * Hook to check multiple permissions at once
 */
export function useCanPerformActions(
  channelId: string | null,
  actions: (keyof ChannelPermissions)[],
): Record<string, boolean> {
  const { permissions, loading } = useChannelPermissions(channelId);

  return useMemo(() => {
    if (loading) {
      return actions.reduce(
        (acc, action) => {
          acc[action] = false;
          return acc;
        },
        {} as Record<string, boolean>,
      );
    }

    return actions.reduce(
      (acc, action) => {
        acc[action] = !!permissions[action];
        return acc;
      },
      {} as Record<string, boolean>,
    );
  }, [permissions, loading, actions]);
}

/**
 * Hook to get whether user can join a channel
 */
export function useCanJoinChannel(channelId: string | null): {
  canJoin: boolean;
  reason?: string;
  loading: boolean;
} {
  const { user } = useAuth();
  const { channel, loading: channelLoading } = useChannel(channelId);
  const { isMember, loading: membershipLoading } =
    useChannelMembership(channelId);

  const result = useMemo(() => {
    if (!user) {
      return { canJoin: false, reason: "Authentication required" };
    }

    if (!channel) {
      return { canJoin: false, reason: "Channel not found" };
    }

    if (isMember) {
      return { canJoin: false, reason: "Already a member" };
    }

    if (channel.isArchived) {
      return { canJoin: false, reason: "Channel is archived" };
    }

    if (channel.type === "public") {
      return { canJoin: true };
    }

    if (channel.type === "private") {
      return { canJoin: false, reason: "Private channel requires invitation" };
    }

    if (
      channel.type === "direct" ||
      channel.type === "group_dm" ||
      channel.type === "announcement"
    ) {
      return { canJoin: false, reason: "Cannot join DM channels" };
    }

    return { canJoin: false, reason: "Unknown channel type" };
  }, [user, channel, isMember]);

  return {
    ...result,
    loading: channelLoading || membershipLoading,
  };
}

/**
 * Hook to get whether user can leave a channel
 */
export function useCanLeaveChannel(channelId: string | null): {
  canLeave: boolean;
  reason?: string;
  loading: boolean;
} {
  const { channel, loading: channelLoading } = useChannel(channelId);
  const {
    membership,
    isMember,
    loading: membershipLoading,
  } = useChannelMembership(channelId);

  const result = useMemo(() => {
    if (!isMember) {
      return { canLeave: false, reason: "Not a member" };
    }

    if (!channel) {
      return { canLeave: false, reason: "Channel not found" };
    }

    if (membership?.role === "owner") {
      return { canLeave: false, reason: "Owner must transfer ownership first" };
    }

    if (channel.isDefault) {
      return { canLeave: false, reason: "Cannot leave default channel" };
    }

    return { canLeave: true };
  }, [channel, membership, isMember]);

  return {
    ...result,
    loading: channelLoading || membershipLoading,
  };
}

// Export types
export type { UserRole };
