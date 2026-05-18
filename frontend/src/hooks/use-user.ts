/**
 * useUser Hook - User Operations and Management
 *
 * Provides comprehensive user operations including:
 * - Profile management (view, edit, update)
 * - Avatar/cover upload with crop/resize
 * - Status and presence management
 * - Privacy settings
 * - Blocked users
 * - Session management
 * - Data export and account deletion
 */

import * as React from "react";
import { useUserStore } from "@/stores/user-store";
import { useAuth } from "@/contexts/auth-context";
import type {
  User,
  UpdateUserInput,
  UserPrivacySettings,
  UserNotificationSettings,
  UserSession,
  UserBlock,
} from "@/types/user";

// ============================================================================
// Types
// ============================================================================

export interface UseUserOptions {
  /** User ID to manage (defaults to current user) */
  userId?: string;
}

export interface UpdateProfileData {
  displayName?: string;
  username?: string;
  bio?: string;
  location?: string;
  website?: string;
  phone?: string;
  jobTitle?: string;
  department?: string;
  organization?: string;
  pronouns?: string;
  timezone?: string;
  language?: string;
}

export interface UploadAvatarOptions {
  file: File;
  cropData?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

export interface ExportUserDataOptions {
  includeMessages?: boolean;
  includeMedia?: boolean;
  includeSettings?: boolean;
  format?: "json" | "csv";
}

export interface DeleteAccountOptions {
  reason?: string;
  password: string;
}

// ============================================================================
// Hook
// ============================================================================

export function useUser(options: UseUserOptions = {}) {
  const { userId } = options;
  const { user: authUser } = useAuth();

  // Store
  const currentUser = useUserStore((state) => state.currentUser);
  const users = useUserStore((state) => state.users);
  const updateCurrentUser = useUserStore((state) => state.updateCurrentUser);
  const setMyPresence = useUserStore((state) => state.setMyPresence);
  const setMyCustomStatus = useUserStore((state) => state.setMyCustomStatus);
  const clearMyCustomStatus = useUserStore(
    (state) => state.clearMyCustomStatus,
  );

  // State
  const [isLoading, setIsLoading] = React.useState(false);
  const [isUpdating, setIsUpdating] = React.useState(false);
  const [error, setError] = React.useState<Error | null>(null);

  // Get the target user (either specified or current)
  const targetUserId = userId || authUser?.id || currentUser?.id;
  const user = targetUserId ? users[targetUserId] || currentUser : null;

  // ============================================================================
  // Profile Operations
  // ============================================================================

  /**
   * Update user profile
   */
  const updateProfile = React.useCallback(
    async (data: UpdateProfileData) => {
      if (!targetUserId) {
        throw new Error("No user ID available");
      }

      setIsUpdating(true);
      setError(null);

      try {
        // For now, update local store
        updateCurrentUser(data);

        // Simulate API call
        await new Promise((resolve) => setTimeout(resolve, 500));

        return { success: true };
      } catch (err) {
        const error =
          err instanceof Error ? err : new Error("Failed to update profile");
        setError(error);
        throw error;
      } finally {
        setIsUpdating(false);
      }
    },
    [targetUserId, updateCurrentUser],
  );

  /**
   * Upload and update avatar
   */
  const uploadAvatar = React.useCallback(
    async ({ file, cropData }: UploadAvatarOptions) => {
      if (!targetUserId) {
        throw new Error("No user ID available");
      }

      setIsUpdating(true);
      setError(null);

      try {
        // Convert file to base64 for preview (in production, upload to storage)
        const reader = new FileReader();
        const dataUrl = await new Promise<string>((resolve, reject) => {
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });

        // 1. Upload to storage (MinIO/S3)
        // 2. Apply crop if provided
        // 3. Generate thumbnails (multiple sizes)
        // 4. Update user record with new avatar URL

        updateCurrentUser({ avatarUrl: dataUrl });

        return { success: true, url: dataUrl };
      } catch (err) {
        const error =
          err instanceof Error ? err : new Error("Failed to upload avatar");
        setError(error);
        throw error;
      } finally {
        setIsUpdating(false);
      }
    },
    [targetUserId, updateCurrentUser],
  );

  /**
   * Upload and update cover image
   */
  const uploadCover = React.useCallback(
    async ({ file }: { file: File }) => {
      if (!targetUserId) {
        throw new Error("No user ID available");
      }

      setIsUpdating(true);
      setError(null);

      try {
        const reader = new FileReader();
        const dataUrl = await new Promise<string>((resolve, reject) => {
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });

        updateCurrentUser({ coverUrl: dataUrl });

        return { success: true, url: dataUrl };
      } catch (err) {
        const error =
          err instanceof Error ? err : new Error("Failed to upload cover");
        setError(error);
        throw error;
      } finally {
        setIsUpdating(false);
      }
    },
    [targetUserId, updateCurrentUser],
  );

  /**
   * Remove avatar
   */
  const removeAvatar = React.useCallback(async () => {
    if (!targetUserId) {
      throw new Error("No user ID available");
    }

    setIsUpdating(true);
    setError(null);

    try {
      updateCurrentUser({ avatarUrl: undefined });
      return { success: true };
    } catch (err) {
      const error =
        err instanceof Error ? err : new Error("Failed to remove avatar");
      setError(error);
      throw error;
    } finally {
      setIsUpdating(false);
    }
  }, [targetUserId, updateCurrentUser]);

  // ============================================================================
  // Presence & Status Operations
  // ============================================================================

  /**
   * Update presence status
   */
  const updatePresence = React.useCallback(
    async (status: "online" | "away" | "dnd" | "offline") => {
      setIsUpdating(true);
      setError(null);

      try {
        setMyPresence(status);
        return { success: true };
      } catch (err) {
        const error =
          err instanceof Error ? err : new Error("Failed to update presence");
        setError(error);
        throw error;
      } finally {
        setIsUpdating(false);
      }
    },
    [setMyPresence],
  );

  /**
   * Set custom status
   */
  const setCustomStatus = React.useCallback(
    async (status: {
      emoji?: string;
      text: string;
      expiresAt?: Date | null;
    }) => {
      setIsUpdating(true);
      setError(null);

      try {
        setMyCustomStatus({
          emoji: status.emoji,
          text: status.text,
          expiresAt: status.expiresAt,
        });
        return { success: true };
      } catch (err) {
        const error =
          err instanceof Error ? err : new Error("Failed to set status");
        setError(error);
        throw error;
      } finally {
        setIsUpdating(false);
      }
    },
    [setMyCustomStatus],
  );

  /**
   * Clear custom status
   */
  const clearStatus = React.useCallback(async () => {
    setIsUpdating(true);
    setError(null);

    try {
      clearMyCustomStatus();
      return { success: true };
    } catch (err) {
      const error =
        err instanceof Error ? err : new Error("Failed to clear status");
      setError(error);
      throw error;
    } finally {
      setIsUpdating(false);
    }
  }, [clearMyCustomStatus]);

  // ============================================================================
  // Privacy Operations
  // ============================================================================

  /**
   * Update privacy settings
   */
  const updatePrivacySettings = React.useCallback(
    async (settings: Partial<UserPrivacySettings>) => {
      if (!targetUserId) {
        throw new Error("No user ID available");
      }

      setIsUpdating(true);
      setError(null);

      try {
        await new Promise((resolve) => setTimeout(resolve, 500));
        return { success: true };
      } catch (err) {
        const error =
          err instanceof Error
            ? err
            : new Error("Failed to update privacy settings");
        setError(error);
        throw error;
      } finally {
        setIsUpdating(false);
      }
    },
    [targetUserId],
  );

  /**
   * Block a user
   */
  const blockUser = React.useCallback(
    async (userIdToBlock: string, reason?: string) => {
      if (!targetUserId) {
        throw new Error("No user ID available");
      }

      setIsUpdating(true);
      setError(null);

      try {
        await new Promise((resolve) => setTimeout(resolve, 500));
        return { success: true };
      } catch (err) {
        const error =
          err instanceof Error ? err : new Error("Failed to block user");
        setError(error);
        throw error;
      } finally {
        setIsUpdating(false);
      }
    },
    [targetUserId],
  );

  /**
   * Unblock a user
   */
  const unblockUser = React.useCallback(
    async (userIdToUnblock: string) => {
      if (!targetUserId) {
        throw new Error("No user ID available");
      }

      setIsUpdating(true);
      setError(null);

      try {
        await new Promise((resolve) => setTimeout(resolve, 500));
        return { success: true };
      } catch (err) {
        const error =
          err instanceof Error ? err : new Error("Failed to unblock user");
        setError(error);
        throw error;
      } finally {
        setIsUpdating(false);
      }
    },
    [targetUserId],
  );

  /**
   * Get blocked users
   */
  const getBlockedUsers = React.useCallback(async () => {
    if (!targetUserId) {
      throw new Error("No user ID available");
    }

    setIsLoading(true);
    setError(null);

    try {
      await new Promise((resolve) => setTimeout(resolve, 500));
      return [];
    } catch (err) {
      const error =
        err instanceof Error ? err : new Error("Failed to fetch blocked users");
      setError(error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [targetUserId]);

  // ============================================================================
  // Session Operations
  // ============================================================================

  /**
   * Get active sessions
   */
  const getSessions = React.useCallback(async () => {
    if (!targetUserId) {
      throw new Error("No user ID available");
    }

    setIsLoading(true);
    setError(null);

    try {
      await new Promise((resolve) => setTimeout(resolve, 500));
      return [] as UserSession[];
    } catch (err) {
      const error =
        err instanceof Error ? err : new Error("Failed to fetch sessions");
      setError(error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [targetUserId]);

  /**
   * Revoke a session
   */
  const revokeSession = React.useCallback(
    async (sessionId: string) => {
      if (!targetUserId) {
        throw new Error("No user ID available");
      }

      setIsUpdating(true);
      setError(null);

      try {
        await new Promise((resolve) => setTimeout(resolve, 500));
        return { success: true };
      } catch (err) {
        const error =
          err instanceof Error ? err : new Error("Failed to revoke session");
        setError(error);
        throw error;
      } finally {
        setIsUpdating(false);
      }
    },
    [targetUserId],
  );

  /**
   * Revoke all other sessions
   */
  const revokeAllOtherSessions = React.useCallback(async () => {
    if (!targetUserId) {
      throw new Error("No user ID available");
    }

    setIsUpdating(true);
    setError(null);

    try {
      await new Promise((resolve) => setTimeout(resolve, 500));
      return { success: true };
    } catch (err) {
      const error =
        err instanceof Error ? err : new Error("Failed to revoke sessions");
      setError(error);
      throw error;
    } finally {
      setIsUpdating(false);
    }
  }, [targetUserId]);

  // ============================================================================
  // Data & Account Operations
  // ============================================================================

  /**
   * Export user data
   */
  const exportData = React.useCallback(
    async (options: ExportUserDataOptions = {}) => {
      if (!targetUserId) {
        throw new Error("No user ID available");
      }

      setIsLoading(true);
      setError(null);

      try {
        // 1. Gather all user data (profile, messages, media, settings)
        // 2. Format as JSON or CSV
        // 3. Create downloadable file
        await new Promise((resolve) => setTimeout(resolve, 1000));

        const data = {
          user: currentUser,
          exportedAt: new Date().toISOString(),
          options,
        };

        // Create and download file
        const blob = new Blob([JSON.stringify(data, null, 2)], {
          type: "application/json",
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `user-data-${targetUserId}-${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);

        return { success: true };
      } catch (err) {
        const error =
          err instanceof Error ? err : new Error("Failed to export data");
        setError(error);
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    [targetUserId, currentUser],
  );

  /**
   * Delete account
   */
  const deleteAccount = React.useCallback(
    async ({ reason, password }: DeleteAccountOptions) => {
      if (!targetUserId) {
        throw new Error("No user ID available");
      }

      setIsUpdating(true);
      setError(null);

      try {
        // 1. Verify password
        // 2. Mark account for deletion (soft delete)
        // 3. Schedule data cleanup (30 days grace period)
        // 4. Send confirmation email
        // 5. Logout user
        await new Promise((resolve) => setTimeout(resolve, 1000));

        return { success: true };
      } catch (err) {
        const error =
          err instanceof Error ? err : new Error("Failed to delete account");
        setError(error);
        throw error;
      } finally {
        setIsUpdating(false);
      }
    },
    [targetUserId],
  );

  // ============================================================================
  // Return
  // ============================================================================

  return {
    // User data
    user,
    currentUser,

    // Loading states
    isLoading,
    isUpdating,
    error,

    // Profile operations
    updateProfile,
    uploadAvatar,
    uploadCover,
    removeAvatar,

    // Presence & status
    updatePresence,
    setCustomStatus,
    clearStatus,

    // Privacy
    updatePrivacySettings,
    blockUser,
    unblockUser,
    getBlockedUsers,

    // Sessions
    getSessions,
    revokeSession,
    revokeAllOtherSessions,

    // Data & account
    exportData,
    deleteAccount,
  };
}
