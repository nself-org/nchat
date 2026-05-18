"use client";

/**
 * Workspace Management Hooks
 *
 * Comprehensive React hooks for workspace lifecycle, membership, settings,
 * and multi-workspace management with proper error handling and user feedback.
 *
 * Features:
 * - Workspace CRUD operations
 * - Member lifecycle (invite, join, leave, deactivate)
 * - Ownership transfer
 * - Multi-workspace support with workspace switcher
 * - Notification preferences per workspace
 * - Unified inbox option
 * - Analytics and usage tracking
 */

import {
  useQuery,
  useMutation,
  useSubscription,
  useLazyQuery,
} from "@apollo/client";
import { useCallback, useMemo, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import { logger } from "@/lib/logger";
import { useToast } from "@/hooks/use-toast";
import { useLocalStorage } from "@/hooks/use-local-storage";
import { apolloClient } from "@/lib/apollo-client";
import {
  createWorkspaceService,
  createExtendedWorkspaceService,
  type Workspace,
  type WorkspaceMember,
  type WorkspaceInvite,
  type WorkspaceStats,
  type CreateWorkspaceInput,
  type UpdateWorkspaceInput,
  type WorkspaceAnalytics,
  type WorkspaceNotificationPrefs,
  type StorageQuota,
  type MessageRetentionPolicy,
} from "@/services/workspaces";
import {
  GET_WORKSPACES,
  GET_WORKSPACE,
  GET_WORKSPACE_MEMBERS,
  GET_WORKSPACE_INVITES,
  GET_WORKSPACE_STATS,
} from "@/graphql/workspaces/queries";
import { WORKSPACE_SUBSCRIPTION } from "@/graphql/workspaces/subscriptions";

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface WorkspaceWithMembership {
  workspace: Workspace;
  role: string;
  joinedAt: string;
  nickname?: string | null;
}

export interface CurrentWorkspace {
  id: string;
  name: string;
  slug: string;
  iconUrl?: string | null;
  role: string;
}

export interface WorkspaceSwitcherState {
  currentWorkspaceId: string | null;
  recentWorkspaceIds: string[];
  lastSwitchedAt: string | null;
}

export interface InviteMemberInput {
  maxUses?: number | null;
  expiresIn?: "30m" | "1h" | "6h" | "12h" | "1d" | "7d" | "never";
}

// ============================================================================
// WORKSPACE QUERIES HOOK
// ============================================================================

/**
 * Hook to fetch all workspaces the user is a member of
 */
export function useWorkspaces(options?: { limit?: number; offset?: number }) {
  const { user } = useAuth();
  const { limit = 50, offset = 0 } = options || {};

  const { data, loading, error, refetch } = useQuery(GET_WORKSPACES, {
    variables: { userId: user?.id, limit, offset },
    skip: !user?.id,
    fetchPolicy: "cache-and-network",
  });

  const workspaces = useMemo<WorkspaceWithMembership[]>(() => {
    if (!data?.nchat_workspace_members) return [];
    return data.nchat_workspace_members.map(
      (member: Record<string, unknown>) => ({
        workspace: transformWorkspace(
          member.workspace as Record<string, unknown>,
        ),
        role: member.role as string,
        joinedAt: member.joined_at as string,
        nickname: member.nickname as string | null,
      }),
    );
  }, [data]);

  const total =
    data?.nchat_workspace_members_aggregate?.aggregate?.count ||
    workspaces.length;

  return {
    workspaces,
    total,
    hasMore: offset + limit < total,
    loading,
    error,
    refetch,
  };
}

/**
 * Hook to fetch a single workspace by ID
 */
export function useWorkspace(workspaceId: string | null) {
  const { data, loading, error, refetch } = useQuery(GET_WORKSPACE, {
    variables: { id: workspaceId },
    skip: !workspaceId,
    fetchPolicy: "cache-and-network",
  });

  const workspace = useMemo<Workspace | null>(() => {
    if (!data?.nchat_workspaces_by_pk) return null;
    return transformWorkspace(data.nchat_workspaces_by_pk);
  }, [data]);

  return { workspace, loading, error, refetch };
}

/**
 * Hook to subscribe to workspace updates
 */
export function useWorkspaceSubscription(workspaceId: string | null) {
  const { data, loading, error } = useSubscription(WORKSPACE_SUBSCRIPTION, {
    variables: { workspaceId },
    skip: !workspaceId,
  });

  const workspace = useMemo<Workspace | null>(() => {
    if (!data?.nchat_workspaces_by_pk) return null;
    return transformWorkspace(data.nchat_workspaces_by_pk);
  }, [data]);

  return { workspace, loading, error };
}

/**
 * Hook to fetch workspace members
 */
export function useWorkspaceMembers(
  workspaceId: string | null,
  options?: { role?: string; limit?: number; offset?: number },
) {
  const { role, limit = 50, offset = 0 } = options || {};

  const { data, loading, error, refetch } = useQuery(GET_WORKSPACE_MEMBERS, {
    variables: { workspaceId, role, limit, offset },
    skip: !workspaceId,
    fetchPolicy: "cache-and-network",
  });

  const members = useMemo<WorkspaceMember[]>(() => {
    if (!data?.nchat_workspace_members) return [];
    return data.nchat_workspace_members.map(transformMember);
  }, [data]);

  const total =
    data?.nchat_workspace_members_aggregate?.aggregate?.count || members.length;

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
 * Hook to fetch workspace invites
 */
export function useWorkspaceInvites(
  workspaceId: string | null,
  options?: { limit?: number; offset?: number },
) {
  const { limit = 50, offset = 0 } = options || {};

  const { data, loading, error, refetch } = useQuery(GET_WORKSPACE_INVITES, {
    variables: { workspaceId, limit, offset },
    skip: !workspaceId,
    fetchPolicy: "cache-and-network",
  });

  const invites = useMemo<WorkspaceInvite[]>(() => {
    if (!data?.nchat_workspace_invites) return [];
    return data.nchat_workspace_invites.map(transformInvite);
  }, [data]);

  const total =
    data?.nchat_workspace_invites_aggregate?.aggregate?.count || invites.length;

  return {
    invites,
    total,
    hasMore: offset + limit < total,
    loading,
    error,
    refetch,
  };
}

/**
 * Hook to fetch workspace statistics
 */
export function useWorkspaceStats(workspaceId: string | null) {
  const { data, loading, error, refetch } = useQuery(GET_WORKSPACE_STATS, {
    variables: { workspaceId },
    skip: !workspaceId,
    fetchPolicy: "cache-and-network",
  });

  const stats = useMemo<WorkspaceStats | null>(() => {
    if (!data?.nchat_workspaces_by_pk) return null;
    const ws = data.nchat_workspaces_by_pk;
    return {
      memberCount:
        ws.member_count || ws.members_aggregate?.aggregate?.count || 0,
      channelCount: ws.channels_aggregate?.aggregate?.count || 0,
      onlineMembers: ws.online_members?.aggregate?.count || 0,
      createdAt: ws.created_at,
    };
  }, [data]);

  return { stats, loading, error, refetch };
}

// ============================================================================
// WORKSPACE MUTATIONS HOOK
// ============================================================================

/**
 * Hook for workspace CRUD mutations
 */
export function useWorkspaceMutations() {
  const { user } = useAuth();
  const { toast } = useToast();
  const router = useRouter();

  const [isCreating, setIsCreating] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Create workspace
  const createWorkspace = useCallback(
    async (input: CreateWorkspaceInput): Promise<Workspace | null> => {
      if (!user?.id) {
        toast({
          title: "Authentication required",
          description: "Please sign in to create a workspace.",
          variant: "destructive",
        });
        return null;
      }

      setIsCreating(true);
      try {
        logger.info("Creating workspace", {
          userId: user.id,
          name: input.name,
        });

        const response = await fetch("/api/workspaces", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(input),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(
            errorData.error?.message || "Failed to create workspace",
          );
        }

        const { workspace } = await response.json();

        logger.info("Workspace created", { workspaceId: workspace.id });
        toast({
          title: "Workspace created",
          description: `${workspace.name} has been created successfully.`,
        });

        router.push(`/workspace/${workspace.slug}`);
        return workspace;
      } catch (error) {
        logger.error("Failed to create workspace", error as Error);
        toast({
          title: "Failed to create workspace",
          description: (error as Error).message || "Please try again.",
          variant: "destructive",
        });
        return null;
      } finally {
        setIsCreating(false);
      }
    },
    [user?.id, router, toast],
  );

  // Update workspace
  const updateWorkspace = useCallback(
    async (
      workspaceId: string,
      updates: UpdateWorkspaceInput,
    ): Promise<Workspace | null> => {
      if (!user?.id) {
        toast({
          title: "Authentication required",
          variant: "destructive",
        });
        return null;
      }

      setIsUpdating(true);
      try {
        logger.info("Updating workspace", { workspaceId, userId: user.id });

        const response = await fetch(`/api/workspaces/${workspaceId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updates),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(
            errorData.error?.message || "Failed to update workspace",
          );
        }

        const { workspace } = await response.json();

        logger.info("Workspace updated", { workspaceId });
        toast({
          title: "Workspace updated",
          description: "Settings have been saved.",
        });

        return workspace;
      } catch (error) {
        logger.error("Failed to update workspace", error as Error);
        toast({
          title: "Update failed",
          description: (error as Error).message || "Please try again.",
          variant: "destructive",
        });
        return null;
      } finally {
        setIsUpdating(false);
      }
    },
    [user?.id, toast],
  );

  // Delete workspace
  const deleteWorkspace = useCallback(
    async (workspaceId: string): Promise<boolean> => {
      if (!user?.id) {
        toast({
          title: "Authentication required",
          variant: "destructive",
        });
        return false;
      }

      setIsDeleting(true);
      try {
        logger.warn("Deleting workspace", { workspaceId, userId: user.id });

        const response = await fetch(`/api/workspaces/${workspaceId}`, {
          method: "DELETE",
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(
            errorData.error?.message || "Failed to delete workspace",
          );
        }

        logger.warn("Workspace deleted", { workspaceId });
        toast({
          title: "Workspace deleted",
          description: "The workspace has been permanently deleted.",
        });

        router.push("/workspaces");
        return true;
      } catch (error) {
        logger.error("Failed to delete workspace", error as Error);
        toast({
          title: "Delete failed",
          description: (error as Error).message || "Please try again.",
          variant: "destructive",
        });
        return false;
      } finally {
        setIsDeleting(false);
      }
    },
    [user?.id, router, toast],
  );

  return {
    createWorkspace,
    updateWorkspace,
    deleteWorkspace,
    isCreating,
    isUpdating,
    isDeleting,
  };
}

// ============================================================================
// MEMBER MANAGEMENT HOOK
// ============================================================================

/**
 * Hook for member lifecycle operations
 */
export function useMemberManagement(workspaceId: string | null) {
  const { user } = useAuth();
  const { toast } = useToast();

  const [isProcessing, setIsProcessing] = useState(false);

  // Add member
  const addMember = useCallback(
    async (
      userId: string,
      role: "admin" | "moderator" | "member" | "guest" = "member",
      nickname?: string,
    ): Promise<WorkspaceMember | null> => {
      if (!workspaceId || !user?.id) return null;

      setIsProcessing(true);
      try {
        const response = await fetch(`/api/workspaces/${workspaceId}/members`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId, role, nickname }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error?.message || "Failed to add member");
        }

        const { member } = await response.json();

        toast({
          title: "Member added",
          description: "The user has been added to the workspace.",
        });

        return member;
      } catch (error) {
        toast({
          title: "Failed to add member",
          description: (error as Error).message,
          variant: "destructive",
        });
        return null;
      } finally {
        setIsProcessing(false);
      }
    },
    [workspaceId, user?.id, toast],
  );

  // Remove member
  const removeMember = useCallback(
    async (userId: string): Promise<boolean> => {
      if (!workspaceId || !user?.id) return false;

      setIsProcessing(true);
      try {
        const response = await fetch(`/api/workspaces/${workspaceId}/members`, {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(
            errorData.error?.message || "Failed to remove member",
          );
        }

        toast({
          title: "Member removed",
          description: "The user has been removed from the workspace.",
        });

        return true;
      } catch (error) {
        toast({
          title: "Failed to remove member",
          description: (error as Error).message,
          variant: "destructive",
        });
        return false;
      } finally {
        setIsProcessing(false);
      }
    },
    [workspaceId, user?.id, toast],
  );

  // Update member role
  const updateMemberRole = useCallback(
    async (
      userId: string,
      role: "admin" | "moderator" | "member" | "guest",
    ): Promise<WorkspaceMember | null> => {
      if (!workspaceId || !user?.id) return null;

      setIsProcessing(true);
      try {
        const response = await fetch(`/api/workspaces/${workspaceId}/members`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId, role }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error?.message || "Failed to update role");
        }

        const { member } = await response.json();

        toast({
          title: "Role updated",
          description: `Member role changed to ${role}.`,
        });

        return member;
      } catch (error) {
        toast({
          title: "Failed to update role",
          description: (error as Error).message,
          variant: "destructive",
        });
        return null;
      } finally {
        setIsProcessing(false);
      }
    },
    [workspaceId, user?.id, toast],
  );

  // Deactivate member
  const deactivateMember = useCallback(
    async (
      userId: string,
      reason?: string,
      canRejoin = true,
    ): Promise<boolean> => {
      if (!workspaceId || !user?.id) return false;

      setIsProcessing(true);
      try {
        const service = createExtendedWorkspaceService(apolloClient);
        await service.deactivateMember(
          workspaceId,
          userId,
          user.id,
          reason,
          canRejoin,
        );

        toast({
          title: "Member deactivated",
          description: "The user has been deactivated from the workspace.",
        });

        return true;
      } catch (error) {
        toast({
          title: "Failed to deactivate member",
          description: (error as Error).message,
          variant: "destructive",
        });
        return false;
      } finally {
        setIsProcessing(false);
      }
    },
    [workspaceId, user?.id, toast],
  );

  // Create invite link
  const createInvite = useCallback(
    async (
      options?: InviteMemberInput,
    ): Promise<{ code: string; url: string } | null> => {
      if (!workspaceId || !user?.id) return null;

      setIsProcessing(true);
      try {
        const response = await fetch(`/api/workspaces/${workspaceId}/invites`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(options || {}),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(
            errorData.error?.message || "Failed to create invite",
          );
        }

        const { invite, inviteUrl } = await response.json();

        toast({
          title: "Invite created",
          description: "Share the link to invite others to join.",
        });

        return { code: invite.code, url: inviteUrl };
      } catch (error) {
        toast({
          title: "Failed to create invite",
          description: (error as Error).message,
          variant: "destructive",
        });
        return null;
      } finally {
        setIsProcessing(false);
      }
    },
    [workspaceId, user?.id, toast],
  );

  // Join workspace via invite code
  const joinWorkspace = useCallback(
    async (inviteCode: string): Promise<WorkspaceMember | null> => {
      if (!user?.id) return null;

      setIsProcessing(true);
      try {
        const response = await fetch("/api/workspaces/join", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code: inviteCode }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(
            errorData.error?.message || "Failed to join workspace",
          );
        }

        const { member, workspace } = await response.json();

        toast({
          title: "Joined workspace",
          description: `You are now a member of ${workspace.name}.`,
        });

        return member;
      } catch (error) {
        toast({
          title: "Failed to join workspace",
          description: (error as Error).message,
          variant: "destructive",
        });
        return null;
      } finally {
        setIsProcessing(false);
      }
    },
    [user?.id, toast],
  );

  // Leave workspace
  const leaveWorkspace = useCallback(async (): Promise<boolean> => {
    if (!workspaceId || !user?.id) return false;

    setIsProcessing(true);
    try {
      const service = createWorkspaceService(apolloClient);
      await service.leaveWorkspace(workspaceId, user.id);

      toast({
        title: "Left workspace",
        description: "You have left the workspace.",
      });

      return true;
    } catch (error) {
      toast({
        title: "Failed to leave workspace",
        description: (error as Error).message,
        variant: "destructive",
      });
      return false;
    } finally {
      setIsProcessing(false);
    }
  }, [workspaceId, user?.id, toast]);

  return {
    addMember,
    removeMember,
    updateMemberRole,
    deactivateMember,
    createInvite,
    joinWorkspace,
    leaveWorkspace,
    isProcessing,
  };
}

// ============================================================================
// OWNERSHIP TRANSFER HOOK
// ============================================================================

/**
 * Hook for ownership transfer operations
 */
export function useOwnershipTransfer(workspaceId: string | null) {
  const { user } = useAuth();
  const { toast } = useToast();

  const [isTransferring, setIsTransferring] = useState(false);

  // Initiate transfer
  const initiateTransfer = useCallback(
    async (
      newOwnerId: string,
      reason?: string,
      requireConfirmation = true,
    ): Promise<{
      success: boolean;
      transferId?: string;
      pendingConfirmation?: boolean;
    }> => {
      if (!workspaceId || !user?.id) {
        return { success: false };
      }

      setIsTransferring(true);
      try {
        const service = createExtendedWorkspaceService(apolloClient);
        const result = await service.initiateOwnershipTransfer({
          workspaceId,
          currentOwnerId: user.id,
          newOwnerId,
          reason,
          requireConfirmation,
        });

        if (result.pendingConfirmation) {
          toast({
            title: "Transfer initiated",
            description: "Waiting for the new owner to accept.",
          });
        } else if (result.success) {
          toast({
            title: "Ownership transferred",
            description: "You are no longer the workspace owner.",
          });
        }

        return result;
      } catch (error) {
        toast({
          title: "Transfer failed",
          description: (error as Error).message,
          variant: "destructive",
        });
        return { success: false };
      } finally {
        setIsTransferring(false);
      }
    },
    [workspaceId, user?.id, toast],
  );

  // Grant emergency access
  const grantEmergencyAccess = useCallback(
    async (backupOwnerId: string, expiresAt?: string): Promise<boolean> => {
      if (!workspaceId || !user?.id) return false;

      try {
        const service = createExtendedWorkspaceService(apolloClient);
        await service.grantEmergencyAccess(
          workspaceId,
          backupOwnerId,
          user.id,
          expiresAt,
        );

        toast({
          title: "Emergency access granted",
          description: "Backup owner can now manage the workspace if needed.",
        });

        return true;
      } catch (error) {
        toast({
          title: "Failed to grant emergency access",
          description: (error as Error).message,
          variant: "destructive",
        });
        return false;
      }
    },
    [workspaceId, user?.id, toast],
  );

  // Revoke emergency access
  const revokeEmergencyAccess = useCallback(
    async (accessId: string): Promise<boolean> => {
      if (!user?.id) return false;

      try {
        const service = createExtendedWorkspaceService(apolloClient);
        await service.revokeEmergencyAccess(accessId);

        toast({
          title: "Emergency access revoked",
          description: "The backup owner no longer has emergency access.",
        });

        return true;
      } catch (error) {
        toast({
          title: "Failed to revoke access",
          description: (error as Error).message,
          variant: "destructive",
        });
        return false;
      }
    },
    [user?.id, toast],
  );

  return {
    initiateTransfer,
    grantEmergencyAccess,
    revokeEmergencyAccess,
    isTransferring,
  };
}

// ============================================================================
// WORKSPACE SWITCHER HOOK
// ============================================================================

/**
 * Hook for multi-workspace switching and management
 */
export function useWorkspaceSwitcher() {
  const { workspaces, loading } = useWorkspaces();
  const router = useRouter();
  const { toast } = useToast();

  const [switcherState, setSwitcherState] =
    useLocalStorage<WorkspaceSwitcherState>("workspace-switcher", {
      currentWorkspaceId: null,
      recentWorkspaceIds: [],
      lastSwitchedAt: null,
    });

  // Current workspace
  const currentWorkspace = useMemo<CurrentWorkspace | null>(() => {
    if (!switcherState.currentWorkspaceId) return null;
    const found = workspaces.find(
      (w) => w.workspace.id === switcherState.currentWorkspaceId,
    );
    if (!found) return null;
    return {
      id: found.workspace.id,
      name: found.workspace.name,
      slug: found.workspace.slug,
      iconUrl: found.workspace.iconUrl,
      role: found.role,
    };
  }, [workspaces, switcherState.currentWorkspaceId]);

  // Recent workspaces
  const recentWorkspaces = useMemo<WorkspaceWithMembership[]>(() => {
    return switcherState.recentWorkspaceIds
      .map((id) => workspaces.find((w) => w.workspace.id === id))
      .filter(Boolean) as WorkspaceWithMembership[];
  }, [workspaces, switcherState.recentWorkspaceIds]);

  // Switch to workspace
  const switchWorkspace = useCallback(
    (workspaceId: string) => {
      const workspace = workspaces.find((w) => w.workspace.id === workspaceId);
      if (!workspace) {
        toast({
          title: "Workspace not found",
          variant: "destructive",
        });
        return;
      }

      // Update recent list (max 5, no duplicates)
      const newRecent = [
        workspaceId,
        ...switcherState.recentWorkspaceIds.filter((id) => id !== workspaceId),
      ].slice(0, 5);

      setSwitcherState({
        currentWorkspaceId: workspaceId,
        recentWorkspaceIds: newRecent,
        lastSwitchedAt: new Date().toISOString(),
      });

      logger.info("Switched workspace", { workspaceId });
      router.push(`/workspace/${workspace.workspace.slug}`);
    },
    [
      workspaces,
      switcherState.recentWorkspaceIds,
      setSwitcherState,
      router,
      toast,
    ],
  );

  // Set initial workspace
  useEffect(() => {
    if (
      !loading &&
      workspaces.length > 0 &&
      !switcherState.currentWorkspaceId
    ) {
      // Auto-select first workspace
      switchWorkspace(workspaces[0].workspace.id);
    }
  }, [loading, workspaces, switcherState.currentWorkspaceId, switchWorkspace]);

  return {
    currentWorkspace,
    workspaces,
    recentWorkspaces,
    switchWorkspace,
    loading,
  };
}

// ============================================================================
// WORKSPACE SETTINGS HOOK
// ============================================================================

/**
 * Hook for workspace settings management
 */
export function useWorkspaceSettings(workspaceId: string | null) {
  const { user } = useAuth();
  const { toast } = useToast();

  const [isLoading, setIsLoading] = useState(false);

  // Get notification preferences
  const getNotificationPrefs =
    useCallback(async (): Promise<WorkspaceNotificationPrefs | null> => {
      if (!workspaceId || !user?.id) return null;

      try {
        const service = createExtendedWorkspaceService(apolloClient);
        return await service.getNotificationPrefs(workspaceId, user.id);
      } catch (error) {
        logger.error("Failed to get notification prefs", error as Error);
        return null;
      }
    }, [workspaceId, user?.id]);

  // Update notification preferences
  const updateNotificationPrefs = useCallback(
    async (prefs: Partial<WorkspaceNotificationPrefs>): Promise<boolean> => {
      if (!workspaceId || !user?.id) return false;

      setIsLoading(true);
      try {
        const service = createExtendedWorkspaceService(apolloClient);
        await service.updateNotificationPrefs(workspaceId, user.id, prefs);

        toast({
          title: "Preferences saved",
          description: "Your notification preferences have been updated.",
        });

        return true;
      } catch (error) {
        toast({
          title: "Failed to save preferences",
          description: (error as Error).message,
          variant: "destructive",
        });
        return false;
      } finally {
        setIsLoading(false);
      }
    },
    [workspaceId, user?.id, toast],
  );

  // Get storage quota
  const getStorageQuota =
    useCallback(async (): Promise<StorageQuota | null> => {
      if (!workspaceId) return null;

      try {
        const service = createExtendedWorkspaceService(apolloClient);
        return await service.getStorageQuota(workspaceId);
      } catch (error) {
        logger.error("Failed to get storage quota", error as Error);
        return null;
      }
    }, [workspaceId]);

  // Update storage quota
  const updateStorageQuota = useCallback(
    async (settings: Partial<StorageQuota>): Promise<boolean> => {
      if (!workspaceId) return false;

      setIsLoading(true);
      try {
        const service = createExtendedWorkspaceService(apolloClient);
        await service.updateStorageQuota(workspaceId, settings);

        toast({
          title: "Storage settings saved",
        });

        return true;
      } catch (error) {
        toast({
          title: "Failed to save storage settings",
          description: (error as Error).message,
          variant: "destructive",
        });
        return false;
      } finally {
        setIsLoading(false);
      }
    },
    [workspaceId, toast],
  );

  // Get message retention policy
  const getMessageRetention =
    useCallback(async (): Promise<MessageRetentionPolicy | null> => {
      if (!workspaceId) return null;

      try {
        const service = createExtendedWorkspaceService(apolloClient);
        return await service.getMessageRetention(workspaceId);
      } catch (error) {
        logger.error("Failed to get retention policy", error as Error);
        return null;
      }
    }, [workspaceId]);

  // Update message retention policy
  const updateMessageRetention = useCallback(
    async (policy: Partial<MessageRetentionPolicy>): Promise<boolean> => {
      if (!workspaceId) return false;

      setIsLoading(true);
      try {
        const service = createExtendedWorkspaceService(apolloClient);
        await service.updateMessageRetention(workspaceId, policy);

        toast({
          title: "Retention policy saved",
        });

        return true;
      } catch (error) {
        toast({
          title: "Failed to save retention policy",
          description: (error as Error).message,
          variant: "destructive",
        });
        return false;
      } finally {
        setIsLoading(false);
      }
    },
    [workspaceId, toast],
  );

  return {
    getNotificationPrefs,
    updateNotificationPrefs,
    getStorageQuota,
    updateStorageQuota,
    getMessageRetention,
    updateMessageRetention,
    isLoading,
  };
}

// ============================================================================
// WORKSPACE ANALYTICS HOOK
// ============================================================================

/**
 * Hook for workspace analytics and usage tracking
 */
export function useWorkspaceAnalytics(
  workspaceId: string | null,
  period: "day" | "week" | "month" | "year" = "month",
) {
  const [analytics, setAnalytics] = useState<WorkspaceAnalytics | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchAnalytics = useCallback(async () => {
    if (!workspaceId) return;

    setIsLoading(true);
    setError(null);
    try {
      const service = createExtendedWorkspaceService(apolloClient);
      const data = await service.getAnalytics(workspaceId, period);
      setAnalytics(data);
    } catch (err) {
      setError(err as Error);
      logger.error("Failed to fetch workspace analytics", err as Error);
    } finally {
      setIsLoading(false);
    }
  }, [workspaceId, period]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  return {
    analytics,
    isLoading,
    error,
    refetch: fetchAnalytics,
  };
}

// ============================================================================
// COMBINED WORKSPACE HOOK
// ============================================================================

/**
 * Combined hook for common workspace operations
 */
export function useWorkspaceDetails(workspaceId: string | null) {
  const workspaceQuery = useWorkspace(workspaceId);
  const { stats } = useWorkspaceStats(workspaceId);
  const { workspace: liveWorkspace } = useWorkspaceSubscription(workspaceId);
  const mutations = useWorkspaceMutations();
  const memberOps = useMemberManagement(workspaceId);

  // Use live data if available
  const workspace = liveWorkspace || workspaceQuery.workspace;

  return {
    workspace,
    stats,
    loading: workspaceQuery.loading,
    error: workspaceQuery.error,
    refetch: workspaceQuery.refetch,
    ...mutations,
    ...memberOps,
  };
}

// ============================================================================
// TRANSFORM HELPERS
// ============================================================================

function transformWorkspace(raw: Record<string, unknown>): Workspace {
  return {
    id: raw.id as string,
    name: raw.name as string,
    slug: raw.slug as string,
    description: raw.description as string | null,
    iconUrl: raw.icon_url as string | null,
    bannerUrl: raw.banner_url as string | null,
    ownerId: raw.owner_id as string,
    defaultChannelId: raw.default_channel_id as string | null,
    memberCount: (raw.member_count as number) || 0,
    settings: raw.settings as Workspace["settings"],
    createdAt: raw.created_at as string,
    updatedAt: raw.updated_at as string | null,
    owner: raw.owner
      ? {
          id: (raw.owner as Record<string, unknown>).id as string,
          username: (raw.owner as Record<string, unknown>).username as string,
          displayName: (raw.owner as Record<string, unknown>)
            .display_name as string,
          avatarUrl: (raw.owner as Record<string, unknown>).avatar_url as
            | string
            | undefined,
        }
      : undefined,
    defaultChannel: raw.default_channel
      ? {
          id: (raw.default_channel as Record<string, unknown>).id as string,
          name: (raw.default_channel as Record<string, unknown>).name as string,
          slug: (raw.default_channel as Record<string, unknown>).slug as string,
        }
      : null,
  };
}

function transformMember(raw: Record<string, unknown>): WorkspaceMember {
  return {
    id: raw.id as string,
    workspaceId: raw.workspace_id as string,
    userId: raw.user_id as string,
    role: raw.role as "owner" | "admin" | "moderator" | "member" | "guest",
    joinedAt: raw.joined_at as string,
    nickname: raw.nickname as string | null,
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
          bio: (raw.user as Record<string, unknown>).bio as string | undefined,
          status: (raw.user as Record<string, unknown>).status as
            | string
            | undefined,
          createdAt: (raw.user as Record<string, unknown>).created_at as
            | string
            | undefined,
        }
      : undefined,
  };
}

function transformInvite(raw: Record<string, unknown>): WorkspaceInvite {
  return {
    id: raw.id as string,
    workspaceId: raw.workspace_id as string,
    code: raw.code as string,
    uses: (raw.uses as number) || 0,
    maxUses: raw.max_uses as number | null,
    expiresAt: raw.expires_at as string | null,
    createdBy: raw.created_by as string,
    createdAt: raw.created_at as string,
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

// Export types
export type {
  Workspace,
  WorkspaceMember,
  WorkspaceInvite,
  WorkspaceStats,
  WorkspaceAnalytics,
  WorkspaceNotificationPrefs,
  StorageQuota,
  MessageRetentionPolicy,
};
