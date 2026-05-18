/**
 * useEditHistory Hook
 *
 * Hook for managing message edit history viewing and interactions.
 */

"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import { useAuth } from "@/contexts/auth-context";
import {
  useEditHistoryStore,
  type MessageEditHistory,
  type MessageVersion,
  type EditHistorySettings,
  type HistoryPermissions,
  getHistoryPermissions,
  getCachedHistory,
  cacheHistory,
  loadHistorySettings,
} from "@/lib/message-history";
import type { MessageUser } from "@/types/message";
import type { UserRole } from "@/lib/auth/roles";

export interface UseEditHistoryOptions {
  /** Message ID to load history for */
  messageId?: string;
  /** Whether to auto-load history on mount */
  autoLoad?: boolean;
}

export interface UseEditHistoryReturn {
  /** The loaded edit history */
  history: MessageEditHistory | null;
  /** Whether currently loading */
  isLoading: boolean;
  /** Error message if any */
  error: string | null;
  /** Whether the history modal is open */
  isModalOpen: boolean;
  /** Current settings */
  settings: EditHistorySettings;

  // Actions
  /** Load history for a message */
  loadHistory: (messageId: string) => Promise<MessageEditHistory | null>;
  /** Record a new edit */
  recordEdit: (
    messageId: string,
    channelId: string,
    oldContent: string,
    newContent: string,
    author: MessageUser,
  ) => MessageEditHistory | null;
  /** Open the history modal */
  openModal: (messageId: string) => void;
  /** Close the history modal */
  closeModal: () => void;
  /** Refresh the current history */
  refresh: () => Promise<void>;

  // Permissions
  /** User's permissions for the current history */
  permissions: HistoryPermissions | null;
  /** Check if user can view history for a message */
  canViewHistory: (messageAuthorId: string) => boolean;
}

/**
 * Hook for managing message edit history.
 */
export function useEditHistory(
  options: UseEditHistoryOptions = {},
): UseEditHistoryReturn {
  const { messageId, autoLoad = false } = options;
  const { user } = useAuth();

  const [history, setHistory] = useState<MessageEditHistory | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentMessageId, setCurrentMessageId] = useState<string | null>(
    messageId ?? null,
  );

  // Get settings from store or load them
  const settings = useMemo(() => loadHistorySettings(), []);

  // Calculate permissions
  const permissions = useMemo(() => {
    if (!user || !history) return null;

    const userRole = (user.role as UserRole) ?? "member";
    return getHistoryPermissions(
      settings,
      userRole,
      user.id,
      history.author.id,
    );
  }, [user, history, settings]);

  // Load history for a message
  const loadHistory = useCallback(
    async (msgId: string): Promise<MessageEditHistory | null> => {
      setIsLoading(true);
      setError(null);
      setCurrentMessageId(msgId);

      try {
        // Try cache first
        const cached = getCachedHistory(msgId);
        if (cached) {
          setHistory(cached);
          setIsLoading(false);
          return cached;
        }

        // For now, return null (no history)
        setHistory(null);
        setIsLoading(false);
        return null;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to load history";
        setError(errorMessage);
        setIsLoading(false);
        return null;
      }
    },
    [],
  );

  // Record a new edit
  const recordEdit = useCallback(
    (
      msgId: string,
      channelId: string,
      oldContent: string,
      newContent: string,
      author: MessageUser,
    ): MessageEditHistory | null => {
      if (!user) return null;

      const editor: MessageUser = {
        id: user.id,
        username: user.username ?? user.email ?? "unknown",
        displayName: user.displayName ?? user.username ?? "Unknown",
        avatarUrl: user.avatarUrl,
        role: user.role as MessageUser["role"],
      };

      // Get existing history or create new
      let existingHistory = getCachedHistory(msgId);

      if (!existingHistory) {
        // Create initial history
        existingHistory = {
          messageId: msgId,
          channelId,
          currentContent: oldContent,
          originalContent: oldContent,
          versions: [
            {
              id: `${msgId}-v1`,
              messageId: msgId,
              versionNumber: 1,
              content: oldContent,
              createdAt: new Date(),
              editedBy: author,
              isOriginal: true,
              isCurrent: false,
            },
          ],
          editCount: 0,
          author,
          createdAt: new Date(),
          lastEditedAt: null,
          lastEditedBy: null,
        };
      }

      // Add new version
      const newVersion: MessageVersion = {
        id: `${msgId}-v${existingHistory.versions.length + 1}`,
        messageId: msgId,
        versionNumber: existingHistory.versions.length + 1,
        content: newContent,
        createdAt: new Date(),
        editedBy: editor,
        isOriginal: false,
        isCurrent: true,
      };

      // Update existing versions to not be current
      const updatedVersions = existingHistory.versions.map((v) => ({
        ...v,
        isCurrent: false,
      }));

      const updatedHistory: MessageEditHistory = {
        ...existingHistory,
        currentContent: newContent,
        versions: [...updatedVersions, newVersion],
        editCount: existingHistory.editCount + 1,
        lastEditedAt: new Date(),
        lastEditedBy: editor,
      };

      // Cache the updated history
      cacheHistory(updatedHistory);

      // Update local state if viewing this message
      if (currentMessageId === msgId) {
        setHistory(updatedHistory);
      }

      return updatedHistory;
    },
    [user, currentMessageId],
  );

  // Open modal
  const openModal = useCallback(
    (msgId: string) => {
      setIsModalOpen(true);
      loadHistory(msgId);
    },
    [loadHistory],
  );

  // Close modal
  const closeModal = useCallback(() => {
    setIsModalOpen(false);
  }, []);

  // Refresh current history
  const refresh = useCallback(async () => {
    if (currentMessageId) {
      await loadHistory(currentMessageId);
    }
  }, [currentMessageId, loadHistory]);

  // Check if user can view history
  const canViewHistory = useCallback(
    (messageAuthorId: string): boolean => {
      if (!user) return false;
      const userRole = (user.role as UserRole) ?? "member";
      const perms = getHistoryPermissions(
        settings,
        userRole,
        user.id,
        messageAuthorId,
      );
      return perms.canView;
    },
    [user, settings],
  );

  // Auto-load on mount if messageId provided
  useEffect(() => {
    if (autoLoad && messageId) {
      loadHistory(messageId);
    }
  }, [autoLoad, messageId, loadHistory]);

  return {
    history,
    isLoading,
    error,
    isModalOpen,
    settings,
    loadHistory,
    recordEdit,
    openModal,
    closeModal,
    refresh,
    permissions,
    canViewHistory,
  };
}

/**
 * Simplified hook for checking if a message has been edited.
 */
export function useIsEdited(messageId: string): {
  isEdited: boolean;
  editCount: number;
  lastEditedAt: Date | null;
} {
  const cached = useMemo(() => getCachedHistory(messageId), [messageId]);

  return {
    isEdited: (cached?.editCount ?? 0) > 0,
    editCount: cached?.editCount ?? 0,
    lastEditedAt: cached?.lastEditedAt ?? null,
  };
}

/**
 * Hook for edit history permissions only.
 */
export function useHistoryPermissions(
  messageAuthorId: string,
): HistoryPermissions | null {
  const { user } = useAuth();
  const settings = useMemo(() => loadHistorySettings(), []);

  return useMemo(() => {
    if (!user) return null;

    const userRole = (user.role as UserRole) ?? "member";
    return getHistoryPermissions(settings, userRole, user.id, messageAuthorId);
  }, [user, settings, messageAuthorId]);
}

export default useEditHistory;
