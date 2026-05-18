/**
 * useBlock Hook - Block management functionality for nself-chat
 *
 * Provides methods to block/unblock users and check block status
 */

import { useCallback, useEffect } from "react";
import { useMutation, useQuery } from "@apollo/client";
import { useBlockStore, BlockedUser } from "./block-store";
import {
  BLOCK_USER,
  UNBLOCK_USER,
  GET_BLOCKED_USERS,
  CHECK_USER_BLOCKED,
} from "@/graphql/moderation";
import { useAuth } from "@/contexts/auth-context";

// ============================================================================
// Types
// ============================================================================

export interface UseBlockOptions {
  /** Auto-fetch blocked users on mount */
  autoFetch?: boolean;
}

export interface UseBlockReturn {
  // State
  blockedUsers: BlockedUser[];
  blockedUserIds: Set<string>;
  isLoading: boolean;
  error: string | null;
  isBlocking: boolean;
  isUnblocking: boolean;

  // Actions
  blockUser: (
    userId: string,
    username: string,
    displayName: string,
    avatarUrl?: string,
  ) => Promise<void>;
  unblockUser: (blockedUserId: string) => Promise<void>;
  isUserBlocked: (userId: string) => boolean;
  refreshBlockedUsers: () => Promise<void>;

  // Modal controls
  openBlockModal: (user: {
    userId: string;
    username: string;
    displayName: string;
    avatarUrl?: string;
  }) => void;
  closeBlockModal: () => void;
  blockModalState: {
    isOpen: boolean;
    target: {
      userId: string;
      username: string;
      displayName: string;
      avatarUrl?: string;
    } | null;
  };
}

// ============================================================================
// Hook
// ============================================================================

export function useBlock(options: UseBlockOptions = {}): UseBlockReturn {
  const { autoFetch = true } = options;
  const { user } = useAuth();
  const userId = user?.id;

  // Store state and actions
  const {
    blockedUsers,
    blockedUserIds,
    isLoading,
    error,
    isBlocking,
    isUnblocking,
    blockModalOpen,
    blockModalTarget,
    setBlockedUsers,
    addBlockedUser,
    removeBlockedUser,
    setLoading,
    setError,
    setBlocking,
    setUnblocking,
    openBlockModal,
    closeBlockModal,
    isUserBlocked: checkIsUserBlocked,
  } = useBlockStore();

  // GraphQL queries and mutations
  const { refetch: refetchBlockedUsers } = useQuery(GET_BLOCKED_USERS, {
    variables: { userId },
    skip: !userId || !autoFetch,
    onCompleted: (data) => {
      if (data?.nchat_blocked_users) {
        const users: BlockedUser[] = data.nchat_blocked_users.map(
          (bu: {
            id: string;
            user_id: string;
            blocked_user_id: string;
            created_at: string;
            blocked_user: {
              id: string;
              username: string;
              display_name: string;
              avatar_url?: string;
            };
          }) => ({
            id: bu.id,
            userId: bu.user_id,
            blockedUserId: bu.blocked_user_id,
            blockedUser: {
              id: bu.blocked_user.id,
              username: bu.blocked_user.username,
              displayName: bu.blocked_user.display_name,
              avatarUrl: bu.blocked_user.avatar_url,
            },
            createdAt: bu.created_at,
          }),
        );
        setBlockedUsers(users);
      }
      setLoading(false);
    },
    onError: (err) => {
      setError(err.message);
      setLoading(false);
    },
  });

  const [blockUserMutation] = useMutation(BLOCK_USER);
  const [unblockUserMutation] = useMutation(UNBLOCK_USER);

  // Load blocked users on mount
  useEffect(() => {
    if (userId && autoFetch) {
      setLoading(true);
    }
  }, [userId, autoFetch, setLoading]);

  // Block a user
  const blockUser = useCallback(
    async (
      blockedUserId: string,
      username: string,
      displayName: string,
      avatarUrl?: string,
    ) => {
      if (!userId) {
        setError("You must be logged in to block users");
        return;
      }

      if (blockedUserId === userId) {
        setError("You cannot block yourself");
        return;
      }

      setBlocking(true);
      setError(null);

      try {
        const { data } = await blockUserMutation({
          variables: {
            userId,
            blockedUserId,
          },
        });

        if (data?.insert_nchat_blocked_users_one) {
          const blockedUser: BlockedUser = {
            id: data.insert_nchat_blocked_users_one.id,
            userId,
            blockedUserId,
            blockedUser: {
              id: blockedUserId,
              username,
              displayName,
              avatarUrl,
            },
            createdAt: data.insert_nchat_blocked_users_one.created_at,
          };
          addBlockedUser(blockedUser);
        }

        closeBlockModal();
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to block user";
        setError(errorMessage);
        throw err;
      } finally {
        setBlocking(false);
      }
    },
    [
      userId,
      blockUserMutation,
      addBlockedUser,
      closeBlockModal,
      setBlocking,
      setError,
    ],
  );

  // Unblock a user
  const unblockUser = useCallback(
    async (blockedUserId: string) => {
      if (!userId) {
        setError("You must be logged in to unblock users");
        return;
      }

      setUnblocking(true);
      setError(null);

      try {
        const { data } = await unblockUserMutation({
          variables: {
            userId,
            blockedUserId,
          },
        });

        if (data?.delete_nchat_blocked_users?.affected_rows > 0) {
          removeBlockedUser(blockedUserId);
        }
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to unblock user";
        setError(errorMessage);
        throw err;
      } finally {
        setUnblocking(false);
      }
    },
    [userId, unblockUserMutation, removeBlockedUser, setUnblocking, setError],
  );

  // Refresh blocked users list
  const refreshBlockedUsers = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      await refetchBlockedUsers();
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to refresh blocked users";
      setError(errorMessage);
    }
  }, [userId, refetchBlockedUsers, setLoading, setError]);

  return {
    // State
    blockedUsers,
    blockedUserIds,
    isLoading,
    error,
    isBlocking,
    isUnblocking,

    // Actions
    blockUser,
    unblockUser,
    isUserBlocked: checkIsUserBlocked,
    refreshBlockedUsers,

    // Modal controls
    openBlockModal,
    closeBlockModal,
    blockModalState: {
      isOpen: blockModalOpen,
      target: blockModalTarget,
    },
  };
}

// ============================================================================
// Additional Hooks
// ============================================================================

/**
 * Hook to check if a specific user is blocked
 */
export function useIsUserBlocked(targetUserId: string): boolean {
  const { user } = useAuth();
  const userId = user?.id;

  const { data } = useQuery(CHECK_USER_BLOCKED, {
    variables: { userId, blockedUserId: targetUserId },
    skip: !userId || !targetUserId,
  });

  return Boolean(data?.nchat_blocked_users?.length);
}

/**
 * Hook to get block status from store (synchronous, for filtering)
 */
export function useBlockStatus(): {
  isBlocked: (userId: string) => boolean;
  shouldHideContent: (userId: string) => boolean;
  shouldPreventDM: (userId: string) => boolean;
} {
  const { isUserBlocked, settings, blockedUserIds } = useBlockStore();

  return {
    isBlocked: isUserBlocked,
    shouldHideContent: (userId: string) =>
      settings.hideBlockedMessages && blockedUserIds.has(userId),
    shouldPreventDM: (userId: string) =>
      settings.preventDMs && blockedUserIds.has(userId),
  };
}

export default useBlock;
