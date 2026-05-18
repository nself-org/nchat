"use client";

/**
 * useInvite Hook - Invite functionality for nself-chat
 *
 * Provides methods to create, validate, and accept invites with
 * Apollo Client integration and Zustand state management.
 *
 * @example
 * ```tsx
 * import { useInvite } from '@/lib/invite'
 *
 * function ChannelSettings({ channelId }) {
 *   const { createInvite, isCreating, createdInvite } = useInvite()
 *
 *   const handleCreateInvite = async () => {
 *     await createInvite({
 *       type: 'channel',
 *       channelId,
 *       expirationOption: '7d',
 *       maxUses: 10,
 *     })
 *   }
 *
 *   return (
 *     <button onClick={handleCreateInvite} disabled={isCreating}>
 *       Create Invite Link
 *     </button>
 *   )
 * }
 * ```
 */

import { useCallback, useEffect, useMemo } from "react";
import { useMutation, useQuery, useLazyQuery } from "@apollo/client";
import { useAuth } from "@/contexts/auth-context";
import {
  useInviteStore,
  type CreateInviteOptions,
  type CreatedInvite,
} from "./invite-store";
import {
  generateChannelInviteCode,
  generateWorkspaceInviteCode,
  buildInviteLink,
  calculateExpirationDate,
  transformInviteData,
  validateInvite,
  copyInviteLinkToClipboard,
  shareInviteLink,
  generateMailtoLink,
  isValidInviteCodeFormat,
  normalizeInviteCode,
  type InviteInfo,
  type InviteValidationError,
} from "./invite-service";
import { logger } from "@/lib/logger";
import {
  CREATE_INVITE,
  GET_INVITE,
  GET_CHANNEL_INVITES,
  GET_WORKSPACE_INVITES,
  ACCEPT_CHANNEL_INVITE,
  REVOKE_INVITE,
  DELETE_INVITE,
  type CreateInviteVariables,
} from "@/graphql/invites";

// ============================================================================
// Types
// ============================================================================

export interface UseInviteOptions {
  /** Called after successful invite creation */
  onCreateSuccess?: (invite: CreatedInvite) => void;
  /** Called after invite creation failure */
  onCreateError?: (error: Error) => void;
  /** Called after successful invite acceptance */
  onAcceptSuccess?: (channelId: string) => void;
  /** Called after invite acceptance failure */
  onAcceptError?: (error: Error) => void;
  /** Called after invite revocation */
  onRevokeSuccess?: (inviteId: string) => void;
}

export interface UseInviteReturn {
  // Modal state
  isCreateModalOpen: boolean;
  openCreateModal: (options?: CreateInviteOptions) => void;
  closeCreateModal: () => void;
  createModalOptions: CreateInviteOptions | null;
  setCreateModalOptions: (options: Partial<CreateInviteOptions>) => void;

  // Create invite
  createInvite: (options: CreateInviteOptions) => Promise<CreatedInvite | null>;
  isCreating: boolean;
  createdInvite: CreatedInvite | null;
  createError: string | null;
  clearCreatedInvite: () => void;

  // Fetch invite (for preview)
  fetchInvite: (code: string) => Promise<InviteInfo | null>;
  invitePreview: {
    code: string;
    invite: InviteInfo | null;
    isLoading: boolean;
    error: InviteValidationError | null;
  } | null;

  // Accept invite
  acceptInvite: (code: string) => Promise<boolean>;
  isAccepting: boolean;
  acceptError: string | null;
  acceptSuccess: boolean;

  // Revoke invite
  revokeInvite: (inviteId: string) => Promise<boolean>;
  deleteInvite: (inviteId: string) => Promise<boolean>;

  // List invites
  loadChannelInvites: (channelId: string) => void;
  loadWorkspaceInvites: () => void;
  activeInvites: InviteInfo[];
  isLoadingInvites: boolean;
  invitesError: string | null;

  // Recent invites
  recentInvites: CreatedInvite[];

  // Share utilities
  copyInviteLink: (code: string) => Promise<boolean>;
  shareInvite: (code: string, title?: string) => Promise<boolean>;
  getMailtoLink: (code: string) => string;

  // Utility
  buildLink: (code: string) => string;
  reset: () => void;
}

// ============================================================================
// Hook
// ============================================================================

export function useInvite(options: UseInviteOptions = {}): UseInviteReturn {
  const {
    onCreateSuccess,
    onCreateError,
    onAcceptSuccess,
    onAcceptError,
    onRevokeSuccess,
  } = options;

  // Auth context
  const { user } = useAuth();

  // Store state and actions
  const store = useInviteStore();

  // GraphQL mutations
  const [createInviteMutation] = useMutation(CREATE_INVITE);
  const [acceptInviteMutation] = useMutation(ACCEPT_CHANNEL_INVITE);
  const [revokeInviteMutation] = useMutation(REVOKE_INVITE);
  const [deleteInviteMutation] = useMutation(DELETE_INVITE);

  // GraphQL queries
  const [fetchInviteQuery] = useLazyQuery(GET_INVITE, {
    fetchPolicy: "network-only",
  });
  const [
    fetchChannelInvitesQuery,
    { data: channelInvitesData, loading: loadingChannelInvites },
  ] = useLazyQuery(GET_CHANNEL_INVITES, {
    fetchPolicy: "network-only",
  });
  const [
    fetchWorkspaceInvitesQuery,
    { data: workspaceInvitesData, loading: loadingWorkspaceInvites },
  ] = useLazyQuery(GET_WORKSPACE_INVITES, {
    fetchPolicy: "network-only",
  });

  // Update active invites when data changes
  useEffect(() => {
    if (channelInvitesData?.nchat_invites) {
      const invites = channelInvitesData.nchat_invites
        .map(transformInviteData)
        .filter(Boolean) as InviteInfo[];
      store.setActiveInvites(invites);
    }
  }, [channelInvitesData]);

  useEffect(() => {
    if (workspaceInvitesData?.nchat_invites) {
      const invites = workspaceInvitesData.nchat_invites
        .map(transformInviteData)
        .filter(Boolean) as InviteInfo[];
      store.setActiveInvites(invites);
    }
  }, [workspaceInvitesData]);

  // Create invite
  const createInvite = useCallback(
    async (
      createOptions: CreateInviteOptions,
    ): Promise<CreatedInvite | null> => {
      if (!user?.id) {
        store.setCreateError("You must be logged in to create invites");
        return null;
      }

      store.setIsCreating(true);
      store.setCreateError(null);

      try {
        // Generate code based on type
        const code =
          createOptions.type === "workspace"
            ? generateWorkspaceInviteCode()
            : generateChannelInviteCode();

        // Calculate expiration
        const expiresAt = createOptions.expiresAt
          ? createOptions.expiresAt
          : createOptions.expirationOption
            ? calculateExpirationDate(createOptions.expirationOption)
            : null;

        const variables: CreateInviteVariables = {
          code,
          type: createOptions.type,
          channelId: createOptions.channelId || null,
          creatorId: user.id,
          maxUses: createOptions.maxUses || null,
          expiresAt: expiresAt?.toISOString() || null,
        };

        const result = await createInviteMutation({ variables });

        if (result.data?.insert_nchat_invites_one) {
          const inviteData = result.data.insert_nchat_invites_one;
          const createdInvite: CreatedInvite = {
            id: inviteData.id,
            code: inviteData.code,
            type: inviteData.type,
            channelId: inviteData.channel_id,
            channelName:
              inviteData.channel?.name || createOptions.channelName || null,
            link: buildInviteLink(inviteData.code),
            maxUses: inviteData.max_uses,
            expiresAt: inviteData.expires_at
              ? new Date(inviteData.expires_at)
              : null,
            createdAt: new Date(inviteData.created_at),
          };

          store.setCreatedInvite(createdInvite);
          store.addRecentInvite(createdInvite);
          onCreateSuccess?.(createdInvite);

          return createdInvite;
        }

        throw new Error("Failed to create invite");
      } catch (error) {
        const err =
          error instanceof Error ? error : new Error("Failed to create invite");
        store.setCreateError(err.message);
        onCreateError?.(err);
        return null;
      } finally {
        store.setIsCreating(false);
      }
    },
    [user?.id, createInviteMutation, store, onCreateSuccess, onCreateError],
  );

  // Fetch invite for preview
  const fetchInvite = useCallback(
    async (code: string): Promise<InviteInfo | null> => {
      const normalizedCode = normalizeInviteCode(code);

      if (!isValidInviteCodeFormat(normalizedCode)) {
        store.setInvitePreview({
          code: normalizedCode,
          invite: null,
          isLoading: false,
          error: "invalid_code",
        });
        return null;
      }

      store.setInvitePreview({
        code: normalizedCode,
        invite: null,
        isLoading: true,
        error: null,
      });

      try {
        const result = await fetchInviteQuery({
          variables: { code: normalizedCode },
        });

        if (result.data?.nchat_invites?.[0]) {
          const inviteData = result.data.nchat_invites[0];
          const invite = transformInviteData(inviteData);

          if (!invite) {
            store.updateInvitePreview({
              isLoading: false,
              error: "not_found",
            });
            return null;
          }

          // Validate the invite
          const validation = validateInvite(invite);

          store.setInvitePreview({
            code: normalizedCode,
            invite,
            isLoading: false,
            error: validation.error || null,
          });

          return invite;
        }

        store.updateInvitePreview({
          isLoading: false,
          error: "not_found",
        });
        return null;
      } catch (error) {
        store.updateInvitePreview({
          isLoading: false,
          error: "not_found",
        });
        return null;
      }
    },
    [fetchInviteQuery, store],
  );

  // Accept invite
  const acceptInvite = useCallback(
    async (code: string): Promise<boolean> => {
      if (!user?.id) {
        store.setAcceptError("You must be logged in to accept invites");
        return false;
      }

      const normalizedCode = normalizeInviteCode(code);

      store.setIsAccepting(true);
      store.setAcceptError(null);

      try {
        // First fetch the invite to get its details
        const result = await fetchInviteQuery({
          variables: { code: normalizedCode },
        });

        if (!result.data?.nchat_invites?.[0]) {
          store.setAcceptError("Invite not found");
          return false;
        }

        const inviteData = result.data.nchat_invites[0];
        const invite = transformInviteData(inviteData);

        if (!invite) {
          store.setAcceptError("Invalid invite");
          return false;
        }

        // Validate
        const validation = validateInvite(invite);
        if (!validation.isValid) {
          const errorMessages: Record<InviteValidationError, string> = {
            invalid_code: "Invalid invite code",
            not_found: "Invite not found",
            expired: "This invite has expired",
            max_uses_reached: "This invite has reached its maximum uses",
            revoked: "This invite has been revoked",
            already_member: "You are already a member",
            channel_archived: "This channel has been archived",
            permission_denied: "You do not have permission to join",
          };
          store.setAcceptError(errorMessages[validation.error!]);
          return false;
        }

        // Accept the invite
        if (invite.type === "channel" && invite.channelId) {
          await acceptInviteMutation({
            variables: {
              inviteId: invite.id,
              userId: user.id,
              channelId: invite.channelId,
            },
          });

          store.setAcceptSuccess(true);
          onAcceptSuccess?.(invite.channelId);
          return true;
        }

        // For workspace invites, handle differently
        store.setAcceptError("Workspace invites are not yet supported");
        return false;
      } catch (error) {
        const err =
          error instanceof Error ? error : new Error("Failed to accept invite");
        store.setAcceptError(err.message);
        onAcceptError?.(err);
        return false;
      } finally {
        store.setIsAccepting(false);
      }
    },
    [
      user?.id,
      fetchInviteQuery,
      acceptInviteMutation,
      store,
      onAcceptSuccess,
      onAcceptError,
    ],
  );

  // Revoke invite
  const revokeInvite = useCallback(
    async (inviteId: string): Promise<boolean> => {
      try {
        await revokeInviteMutation({
          variables: { id: inviteId },
        });

        store.updateActiveInvite(inviteId, { isActive: false });
        onRevokeSuccess?.(inviteId);
        return true;
      } catch (error) {
        logger.error("Failed to revoke invite:", error);
        return false;
      }
    },
    [revokeInviteMutation, store, onRevokeSuccess],
  );

  // Delete invite
  const deleteInvite = useCallback(
    async (inviteId: string): Promise<boolean> => {
      try {
        await deleteInviteMutation({
          variables: { id: inviteId },
        });

        store.removeActiveInvite(inviteId);
        return true;
      } catch (error) {
        logger.error("Failed to delete invite:", error);
        return false;
      }
    },
    [deleteInviteMutation, store],
  );

  // Load channel invites
  const loadChannelInvites = useCallback(
    (channelId: string) => {
      store.setIsLoadingInvites(true);
      fetchChannelInvitesQuery({
        variables: { channelId },
      });
    },
    [fetchChannelInvitesQuery, store],
  );

  // Load workspace invites
  const loadWorkspaceInvites = useCallback(() => {
    store.setIsLoadingInvites(true);
    fetchWorkspaceInvitesQuery();
  }, [fetchWorkspaceInvitesQuery, store]);

  // Share utilities
  const copyInviteLink = useCallback(async (code: string): Promise<boolean> => {
    return copyInviteLinkToClipboard(code);
  }, []);

  const shareInvite = useCallback(
    async (code: string, title?: string): Promise<boolean> => {
      return shareInviteLink(code, title);
    },
    [],
  );

  const getMailtoLink = useCallback((code: string): string => {
    return generateMailtoLink(code);
  }, []);

  const buildLink = useCallback((code: string): string => {
    return buildInviteLink(code);
  }, []);

  return {
    // Modal state
    isCreateModalOpen: store.isCreateModalOpen,
    openCreateModal: store.openCreateModal,
    closeCreateModal: store.closeCreateModal,
    createModalOptions: store.createModalOptions,
    setCreateModalOptions: store.setCreateModalOptions,

    // Create invite
    createInvite,
    isCreating: store.isCreating,
    createdInvite: store.createdInvite,
    createError: store.createError,
    clearCreatedInvite: store.clearCreatedInvite,

    // Fetch invite
    fetchInvite,
    invitePreview: store.invitePreview,

    // Accept invite
    acceptInvite,
    isAccepting: store.isAccepting,
    acceptError: store.acceptError,
    acceptSuccess: store.acceptSuccess,

    // Revoke/delete
    revokeInvite,
    deleteInvite,

    // List invites
    loadChannelInvites,
    loadWorkspaceInvites,
    activeInvites: store.activeInvites,
    isLoadingInvites:
      loadingChannelInvites ||
      loadingWorkspaceInvites ||
      store.isLoadingInvites,
    invitesError: store.invitesError,

    // Recent invites
    recentInvites: store.recentInvites,

    // Share utilities
    copyInviteLink,
    shareInvite,
    getMailtoLink,

    // Utility
    buildLink,
    reset: store.reset,
  };
}

export default useInvite;
