"use client";

/**
 * useMessageSemantics Hook
 *
 * Provides edit/delete/undo semantics with platform-specific windows,
 * toast notifications with undo actions, and permission checking.
 */

import { useCallback, useState, useRef, useEffect } from "react";
import { useAuth } from "@/contexts/auth-context";
import { useToast } from "@/hooks/use-toast";
import { logger } from "@/lib/logger";
import type { Message, MessageUser } from "@/types/message";
import type {
  MessageSemanticsConfig,
  MessagePlatformStyle,
  DeleteScope,
  PermissionCheckResult,
  PendingUndoAction,
} from "@/types/message-semantics";
import {
  getRemainingEditTime,
  getRemainingDeleteTime,
} from "@/types/message-semantics";
import {
  MessageSemanticsService,
  getMessageSemanticsService,
  type EditMessageResult,
  type DeleteMessageResult,
} from "@/services/messages/semantics.service";

// ============================================================================
// TYPES
// ============================================================================

export interface UseMessageSemanticsOptions {
  /** Channel ID for context */
  channelId: string;
  /** Custom semantics configuration */
  config?: Partial<MessageSemanticsConfig>;
  /** Callback after successful edit */
  onEditSuccess?: (message: Message) => void;
  /** Callback after successful delete */
  onDeleteSuccess?: (messageId: string) => void;
  /** Callback after undo */
  onUndoSuccess?: (messageId: string, type: "edit" | "delete" | "send") => void;
}

export interface UseMessageSemanticsReturn {
  /** Current configuration */
  config: MessageSemanticsConfig;
  /** Update configuration */
  updateConfig: (updates: Partial<MessageSemanticsConfig>) => void;
  /** Set platform style */
  setPlatformStyle: (style: MessagePlatformStyle) => void;

  // Permission checks
  /** Check if user can edit a message */
  canEdit: (message: Message) => PermissionCheckResult;
  /** Check if user can delete a message */
  canDelete: (message: Message, scope?: DeleteScope) => PermissionCheckResult;
  /** Get remaining edit time */
  getRemainingEditTime: (message: Message) => number;
  /** Get remaining delete time */
  getRemainingDeleteTime: (message: Message) => number;

  // Actions
  /** Edit a message */
  editMessage: (
    message: Message,
    newContent: string,
  ) => Promise<EditMessageResult>;
  /** Delete a message */
  deleteMessage: (
    message: Message,
    scope?: DeleteScope,
    reason?: string,
  ) => Promise<DeleteMessageResult>;
  /** Delete for me only */
  deleteForMe: (message: Message) => Promise<DeleteMessageResult>;
  /** Delete for everyone */
  deleteForEveryone: (
    message: Message,
    reason?: string,
  ) => Promise<DeleteMessageResult>;
  /** Restore a deleted message */
  restoreMessage: (messageId: string) => Promise<boolean>;
  /** Restore to a previous version */
  restoreVersion: (
    message: Message,
    versionNumber: number,
  ) => Promise<EditMessageResult>;

  // Undo
  /** Execute pending undo action */
  executeUndo: (undoId: string) => Promise<boolean>;
  /** Get pending undo action for message */
  getPendingUndo: (messageId: string) => PendingUndoAction | undefined;
  /** Check if there's a pending undo */
  hasPendingUndo: (messageId: string) => boolean;

  // State
  /** Loading state */
  isLoading: boolean;
  /** Last error */
  error: string | null;
}

// ============================================================================
// HOOK
// ============================================================================

/**
 * Hook for managing message edit/delete semantics with undo support.
 */
export function useMessageSemantics(
  options: UseMessageSemanticsOptions,
): UseMessageSemanticsReturn {
  const {
    channelId,
    config: customConfig,
    onEditSuccess,
    onDeleteSuccess,
    onUndoSuccess,
  } = options;

  const { user } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Service instance
  const serviceRef = useRef<MessageSemanticsService | null>(null);
  if (!serviceRef.current) {
    serviceRef.current = getMessageSemanticsService(customConfig);
  }

  const service = serviceRef.current;

  // Track active undo toasts
  const undoToastsRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(
    new Map(),
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      undoToastsRef.current.forEach((timer) => clearTimeout(timer));
      undoToastsRef.current.clear();
    };
  }, []);

  // ==========================================================================
  // CONFIGURATION
  // ==========================================================================

  const updateConfig = useCallback(
    (updates: Partial<MessageSemanticsConfig>) => {
      service.updateConfig(updates);
    },
    [service],
  );

  const setPlatformStyle = useCallback(
    (style: MessagePlatformStyle) => {
      service.setPlatformStyle(style);
    },
    [service],
  );

  // ==========================================================================
  // PERMISSION CHECKS
  // ==========================================================================

  const canEdit = useCallback(
    (message: Message): PermissionCheckResult => {
      if (!user) {
        return { allowed: false, reason: "You must be logged in" };
      }
      return service.canEdit(message, user.id, user.role || "member");
    },
    [service, user],
  );

  const canDelete = useCallback(
    (
      message: Message,
      scope: DeleteScope = "for_everyone",
    ): PermissionCheckResult => {
      if (!user) {
        return { allowed: false, reason: "You must be logged in" };
      }
      return service.canDelete(message, user.id, user.role || "member", scope);
    },
    [service, user],
  );

  const getRemainingEditTimeForMessage = useCallback(
    (message: Message): number => {
      const config = service.getConfig();
      return getRemainingEditTime(message.createdAt, config);
    },
    [service],
  );

  const getRemainingDeleteTimeForMessage = useCallback(
    (message: Message): number => {
      const config = service.getConfig();
      return getRemainingDeleteTime(message.createdAt, config);
    },
    [service],
  );

  // ==========================================================================
  // EDIT ACTIONS
  // ==========================================================================

  const editMessage = useCallback(
    async (
      message: Message,
      newContent: string,
    ): Promise<EditMessageResult> => {
      if (!user) {
        return { success: false, error: "You must be logged in" };
      }

      setIsLoading(true);
      setError(null);

      try {
        const editor: MessageUser = {
          id: user.id,
          username: user.username || user.email || "unknown",
          displayName: user.displayName || user.username || "Unknown",
          avatarUrl: user.avatarUrl,
          role: user.role as MessageUser["role"],
        };

        const result = await service.editMessage(
          {
            messageId: message.id,
            channelId,
            newContent,
            editorId: user.id,
            editor,
          },
          message,
          user.role || "member",
        );

        if (result.success) {
          // Show toast with undo option
          if (result.undoAction) {
            showUndoToast("edit", result.undoAction, message);
          } else {
            toast({
              title: "Message edited",
              description: "Your message has been updated",
            });
          }

          if (onEditSuccess && result.message) {
            onEditSuccess(result.message);
          }
        } else {
          setError(result.error || "Failed to edit message");
          toast({
            title: "Failed to edit message",
            description: result.error,
            variant: "destructive",
          });
        }

        return result;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to edit message";
        setError(errorMessage);
        logger.error("Edit message failed", err as Error, {
          messageId: message.id,
        });
        return { success: false, error: errorMessage };
      } finally {
        setIsLoading(false);
      }
    },
    [service, user, channelId, toast, onEditSuccess],
  );

  const restoreVersion = useCallback(
    async (
      message: Message,
      versionNumber: number,
    ): Promise<EditMessageResult> => {
      if (!user) {
        return { success: false, error: "You must be logged in" };
      }

      setIsLoading(true);
      setError(null);

      try {
        const restorer: MessageUser = {
          id: user.id,
          username: user.username || user.email || "unknown",
          displayName: user.displayName || user.username || "Unknown",
          avatarUrl: user.avatarUrl,
          role: user.role as MessageUser["role"],
        };

        const result = await service.restoreVersion(
          message.id,
          channelId,
          versionNumber,
          user.id,
          restorer,
          message,
        );

        if (result.success) {
          toast({
            title: "Version restored",
            description: `Message restored to version ${versionNumber}`,
          });

          if (onEditSuccess && result.message) {
            onEditSuccess(result.message);
          }
        } else {
          setError(result.error || "Failed to restore version");
          toast({
            title: "Failed to restore version",
            description: result.error,
            variant: "destructive",
          });
        }

        return result;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to restore version";
        setError(errorMessage);
        logger.error("Restore version failed", err as Error, {
          messageId: message.id,
        });
        return { success: false, error: errorMessage };
      } finally {
        setIsLoading(false);
      }
    },
    [service, user, channelId, toast, onEditSuccess],
  );

  // ==========================================================================
  // DELETE ACTIONS
  // ==========================================================================

  const deleteMessage = useCallback(
    async (
      message: Message,
      scope: DeleteScope = "for_everyone",
      reason?: string,
    ): Promise<DeleteMessageResult> => {
      if (!user) {
        return { success: false, error: "You must be logged in" };
      }

      setIsLoading(true);
      setError(null);

      try {
        const deleter: MessageUser = {
          id: user.id,
          username: user.username || user.email || "unknown",
          displayName: user.displayName || user.username || "Unknown",
          avatarUrl: user.avatarUrl,
          role: user.role as MessageUser["role"],
        };

        const result = await service.deleteMessage(
          {
            messageId: message.id,
            channelId,
            scope,
            deleterId: user.id,
            deleter,
            reason,
          },
          message,
          user.role || "member",
        );

        if (result.success) {
          // Show toast with undo option
          if (result.undoAction) {
            showUndoToast("delete", result.undoAction, message);
          } else {
            toast({
              title: scope === "for_me" ? "Message hidden" : "Message deleted",
              description:
                scope === "for_me"
                  ? "This message is now hidden from your view"
                  : "This message was deleted for everyone",
            });
          }

          if (onDeleteSuccess) {
            onDeleteSuccess(message.id);
          }
        } else {
          setError(result.error || "Failed to delete message");
          toast({
            title: "Failed to delete message",
            description: result.error,
            variant: "destructive",
          });
        }

        return result;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to delete message";
        setError(errorMessage);
        logger.error("Delete message failed", err as Error, {
          messageId: message.id,
        });
        return { success: false, error: errorMessage };
      } finally {
        setIsLoading(false);
      }
    },
    [service, user, channelId, toast, onDeleteSuccess],
  );

  const deleteForMe = useCallback(
    async (message: Message): Promise<DeleteMessageResult> => {
      return deleteMessage(message, "for_me");
    },
    [deleteMessage],
  );

  const deleteForEveryone = useCallback(
    async (message: Message, reason?: string): Promise<DeleteMessageResult> => {
      return deleteMessage(message, "for_everyone", reason);
    },
    [deleteMessage],
  );

  const restoreMessage = useCallback(
    async (messageId: string): Promise<boolean> => {
      if (!user) {
        toast({
          title: "Authentication required",
          description: "You must be logged in to restore messages",
          variant: "destructive",
        });
        return false;
      }

      setIsLoading(true);
      setError(null);

      try {
        const restorer: MessageUser = {
          id: user.id,
          username: user.username || user.email || "unknown",
          displayName: user.displayName || user.username || "Unknown",
          avatarUrl: user.avatarUrl,
          role: user.role as MessageUser["role"],
        };

        const result = await service.restoreDeletedMessage(
          messageId,
          user.id,
          restorer,
          user.role || "member",
        );

        if (result.success) {
          toast({
            title: "Message restored",
            description: "The message has been restored",
          });
          return true;
        } else {
          setError(result.error || "Failed to restore message");
          toast({
            title: "Failed to restore message",
            description: result.error,
            variant: "destructive",
          });
          return false;
        }
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to restore message";
        setError(errorMessage);
        logger.error("Restore message failed", err as Error, { messageId });
        return false;
      } finally {
        setIsLoading(false);
      }
    },
    [service, user, toast],
  );

  // ==========================================================================
  // UNDO ACTIONS
  // ==========================================================================

  const showUndoToast = useCallback(
    (
      type: "edit" | "delete" | "send",
      undoAction: PendingUndoAction,
      _message: Message,
    ) => {
      const config = service.getConfig();
      const undoWindowMs = config.undoWindowSeconds * 1000;

      const title =
        type === "edit"
          ? "Message edited"
          : type === "delete"
            ? "Message deleted"
            : "Message sent";
      const description =
        type === "edit"
          ? "Your message has been updated"
          : type === "delete"
            ? "Message was deleted"
            : "Message was sent";

      // Store undo action ID for keyboard shortcut
      if (typeof window !== "undefined") {
        (
          window as unknown as { __lastUndoActionId?: string }
        ).__lastUndoActionId = undoAction.id;
        (window as unknown as { __lastUndoType?: string }).__lastUndoType =
          type;
      }

      toast({
        title,
        description: `${description}. Undo available for ${config.undoWindowSeconds}s`,
        duration: undoWindowMs,
      });

      // Track the toast for cleanup
      const timer = setTimeout(() => {
        undoToastsRef.current.delete(undoAction.id);
        // Clear the global undo reference
        if (typeof window !== "undefined") {
          const win = window as unknown as { __lastUndoActionId?: string };
          if (win.__lastUndoActionId === undoAction.id) {
            win.__lastUndoActionId = undefined;
          }
        }
      }, undoWindowMs);

      undoToastsRef.current.set(undoAction.id, timer);
    },
    [service, toast],
  );

  const executeUndoInternal = useCallback(
    async (
      undoId: string,
      type: "edit" | "delete" | "send",
    ): Promise<boolean> => {
      if (!user) return false;

      try {
        const result = await service.executeUndo(undoId, user.id);

        if (result.success) {
          toast({
            title: "Action undone",
            description:
              type === "edit"
                ? "Edit reverted"
                : type === "delete"
                  ? "Message restored"
                  : "Message unsent",
          });

          const action = service.getUndoAction(undoId);
          if (action && onUndoSuccess) {
            onUndoSuccess(action.messageId, type);
          }

          return true;
        } else {
          toast({
            title: "Failed to undo",
            description: result.error,
            variant: "destructive",
          });
          return false;
        }
      } catch (err) {
        logger.error("Undo failed", err as Error, { undoId });
        return false;
      }
    },
    [service, user, toast, onUndoSuccess],
  );

  const executeUndo = useCallback(
    async (undoId: string): Promise<boolean> => {
      const action = service.getUndoAction(undoId);
      if (!action) return false;

      return executeUndoInternal(
        undoId,
        action.type as "edit" | "delete" | "send",
      );
    },
    [service, executeUndoInternal],
  );

  const getPendingUndo = useCallback(
    (messageId: string): PendingUndoAction | undefined => {
      return service.getUndoActionForMessage(messageId);
    },
    [service],
  );

  const hasPendingUndo = useCallback(
    (messageId: string): boolean => {
      return !!service.getUndoActionForMessage(messageId);
    },
    [service],
  );

  // ==========================================================================
  // RETURN
  // ==========================================================================

  return {
    config: service.getConfig(),
    updateConfig,
    setPlatformStyle,
    canEdit,
    canDelete,
    getRemainingEditTime: getRemainingEditTimeForMessage,
    getRemainingDeleteTime: getRemainingDeleteTimeForMessage,
    editMessage,
    deleteMessage,
    deleteForMe,
    deleteForEveryone,
    restoreMessage,
    restoreVersion,
    executeUndo,
    getPendingUndo,
    hasPendingUndo,
    isLoading,
    error,
  };
}

export default useMessageSemantics;
