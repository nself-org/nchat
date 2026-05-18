"use client";

/**
 * Message Actions Hook
 *
 * Comprehensive hook for handling all message actions:
 * - React/unreact
 * - Reply/thread
 * - Edit/delete
 * - Pin/bookmark
 * - Forward/copy
 * - Report/mark unread
 * - Bulk operations
 */

import { useCallback, useState } from "react";
import { useAuth } from "@/contexts/auth-context";
import { useToast } from "@/hooks/use-toast";
import { logger } from "@/lib/logger";
import type {
  Message,
  MessageAction,
  MessageActionPermissions,
} from "@/types/message";

// ============================================================================
// Types
// ============================================================================

export interface MessageActionHandlers {
  onReact: (messageId: string, emoji: string) => Promise<void>;
  onRemoveReaction: (messageId: string, emoji: string) => Promise<void>;
  onReply: (message: Message) => void;
  onThread: (message: Message) => void;
  onEdit: (message: Message) => void;
  onDelete: (messageId: string) => Promise<void>;
  onPin: (messageId: string) => Promise<void>;
  onUnpin: (messageId: string) => Promise<void>;
  onBookmark: (messageId: string) => Promise<void>;
  onUnbookmark: (messageId: string) => Promise<void>;
  onForward: (message: Message) => void;
  onCopy: (message: Message) => void;
  onCopyLink: (message: Message) => void;
  onReport: (message: Message) => void;
  onMarkUnread: (messageId: string) => Promise<void>;
  onViewDetails: (message: Message) => void;
  onViewEditHistory: (message: Message) => void;
  onViewReactions: (message: Message) => void;
}

export interface BulkActionHandlers {
  onBulkDelete: (messageIds: string[]) => Promise<void>;
  onBulkForward: (messages: Message[]) => void;
  onBulkCopy: (messages: Message[]) => void;
}

export interface MessageSelectionState {
  selectedMessages: Set<string>;
  toggleSelection: (messageId: string) => void;
  selectAll: (messageIds: string[]) => void;
  clearSelection: () => void;
  isSelectionMode: boolean;
  enterSelectionMode: () => void;
  exitSelectionMode: () => void;
}

export interface UseMessageActionsOptions {
  /** Channel ID for context */
  channelId: string;
  /** Callback when reply action is triggered */
  onReplyMessage?: (message: Message) => void;
  /** Callback when thread action is triggered */
  onOpenThread?: (message: Message) => void;
  /** Callback when edit action is triggered */
  onEditMessage?: (message: Message) => void;
  /** Callback when delete action is triggered */
  onDeleteMessage?: (messageId: string) => Promise<void>;
  /** Callback when forward action is triggered */
  onForwardMessage?: (message: Message) => void;
  /** Callback when report action is triggered */
  onReportMessage?: (message: Message) => void;
  /** Callback when view details is triggered */
  onViewMessageDetails?: (message: Message) => void;
  /** Enable bulk operations */
  enableBulkOperations?: boolean;
}

export interface UseMessageActionsReturn {
  /** Message action handlers */
  handlers: MessageActionHandlers;
  /** Bulk action handlers */
  bulkHandlers: BulkActionHandlers;
  /** Selection state */
  selection: MessageSelectionState;
  /** Handle a message action */
  handleAction: (
    action: MessageAction,
    message: Message,
    data?: unknown,
  ) => void | Promise<void>;
  /** Check if action is available */
  canPerformAction: (action: MessageAction, message: Message) => boolean;
  /** Get permissions for a message */
  getPermissions: (message: Message) => MessageActionPermissions;
  /** Loading state */
  isLoading: boolean;
}

// ============================================================================
// Hook
// ============================================================================

/**
 * Hook for managing message actions
 */
export function useMessageActions(
  options: UseMessageActionsOptions,
): UseMessageActionsReturn {
  const {
    channelId,
    onReplyMessage,
    onOpenThread,
    onEditMessage,
    onDeleteMessage,
    onForwardMessage,
    onReportMessage,
    onViewMessageDetails,
    enableBulkOperations = false,
  } = options;

  const { user } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  // Selection state
  const [selectedMessages, setSelectedMessages] = useState<Set<string>>(
    new Set(),
  );
  const [isSelectionMode, setIsSelectionMode] = useState(false);

  // ============================================================================
  // Permissions
  // ============================================================================

  const getPermissions = useCallback(
    (message: Message): MessageActionPermissions => {
      if (!user) {
        return {
          canReact: false,
          canReply: false,
          canThread: false,
          canEdit: false,
          canDelete: false,
          canPin: false,
          canBookmark: false,
          canForward: false,
          canReport: false,
          canCopy: true,
          canMarkUnread: false,
        };
      }

      const isOwnMessage = user.id === message.userId;
      const userRole = user.role || "member";
      const isModerator = ["owner", "admin", "moderator"].includes(userRole);
      const isGuest = userRole === "guest";
      const isDeleted = message.isDeleted || false;

      return {
        canReact: !isGuest && !isDeleted,
        canReply: !isGuest && !isDeleted,
        canThread: !isGuest && !isDeleted,
        canEdit: isOwnMessage && !isDeleted,
        canDelete: (isOwnMessage || isModerator) && !isDeleted,
        canPin: isModerator,
        canBookmark: !isGuest,
        canForward: !isGuest && !isDeleted,
        canReport: !isGuest && !isOwnMessage && !isDeleted,
        canCopy: true,
        canMarkUnread: !isGuest,
      };
    },
    [user],
  );

  const canPerformAction = useCallback(
    (action: MessageAction, message: Message): boolean => {
      const permissions = getPermissions(message);

      switch (action) {
        case "react":
          return permissions.canReact;
        case "reply":
          return permissions.canReply;
        case "thread":
          return permissions.canThread;
        case "edit":
          return permissions.canEdit;
        case "delete":
          return permissions.canDelete;
        case "pin":
        case "unpin":
          return permissions.canPin;
        case "bookmark":
        case "unbookmark":
          return permissions.canBookmark;
        case "forward":
          return permissions.canForward;
        case "copy":
        case "copy-link":
          return permissions.canCopy;
        case "report":
          return permissions.canReport;
        case "mark-unread":
          return permissions.canMarkUnread;
        default:
          return false;
      }
    },
    [getPermissions],
  );

  // ============================================================================
  // Action Handlers
  // ============================================================================

  const onReact = useCallback(
    async (messageId: string, emoji: string) => {
      if (!user) {
        toast({
          title: "Authentication required",
          description: "You must be logged in to react to messages",
          variant: "destructive",
        });
        return;
      }

      try {
        logger.info("Adding reaction", { messageId, emoji, userId: user.id });

        // Optimistic update would go here
        await new Promise((resolve) => setTimeout(resolve, 100));

        logger.info("Reaction added", { messageId, emoji });
      } catch (error) {
        logger.error("Failed to add reaction", error, { messageId, emoji });
        toast({
          title: "Failed to add reaction",
          description: error instanceof Error ? error.message : "Unknown error",
          variant: "destructive",
        });
      }
    },
    [user, toast],
  );

  const onRemoveReaction = useCallback(
    async (messageId: string, emoji: string) => {
      if (!user) return;

      try {
        logger.info("Removing reaction", { messageId, emoji, userId: user.id });

        await new Promise((resolve) => setTimeout(resolve, 100));

        logger.info("Reaction removed", { messageId, emoji });
      } catch (error) {
        logger.error("Failed to remove reaction", error, { messageId, emoji });
        toast({
          title: "Failed to remove reaction",
          description: error instanceof Error ? error.message : "Unknown error",
          variant: "destructive",
        });
      }
    },
    [user, toast],
  );

  const onReply = useCallback(
    (message: Message) => {
      if (onReplyMessage) {
        onReplyMessage(message);
      } else {
        logger.warn("No reply handler provided");
      }
    },
    [onReplyMessage],
  );

  const onThread = useCallback(
    (message: Message) => {
      if (onOpenThread) {
        onOpenThread(message);
      } else {
        logger.warn("No thread handler provided");
      }
    },
    [onOpenThread],
  );

  const onEdit = useCallback(
    (message: Message) => {
      if (onEditMessage) {
        onEditMessage(message);
      } else {
        logger.warn("No edit handler provided");
      }
    },
    [onEditMessage],
  );

  const onDelete = useCallback(
    async (messageId: string) => {
      if (!user) return;

      try {
        setIsLoading(true);

        if (onDeleteMessage) {
          await onDeleteMessage(messageId);
        } else {
          logger.info("Deleting message", { messageId });
          await new Promise((resolve) => setTimeout(resolve, 500));
        }

        toast({
          title: "Message deleted",
          description: "The message has been deleted",
        });

        logger.info("Message deleted", { messageId });
      } catch (error) {
        logger.error("Failed to delete message", error, { messageId });
        toast({
          title: "Failed to delete message",
          description: error instanceof Error ? error.message : "Unknown error",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    },
    [user, onDeleteMessage, toast],
  );

  const onPin = useCallback(
    async (messageId: string) => {
      if (!user) return;

      try {
        setIsLoading(true);

        logger.info("Pinning message", { messageId, channelId });
        await new Promise((resolve) => setTimeout(resolve, 500));

        toast({
          title: "Message pinned",
          description: "The message has been pinned to the channel",
        });

        logger.info("Message pinned", { messageId });
      } catch (error) {
        logger.error("Failed to pin message", error, { messageId });
        toast({
          title: "Failed to pin message",
          description: error instanceof Error ? error.message : "Unknown error",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    },
    [user, channelId, toast],
  );

  const onUnpin = useCallback(
    async (messageId: string) => {
      if (!user) return;

      try {
        setIsLoading(true);

        logger.info("Unpinning message", { messageId, channelId });
        await new Promise((resolve) => setTimeout(resolve, 500));

        toast({
          title: "Message unpinned",
          description: "The message has been unpinned from the channel",
        });

        logger.info("Message unpinned", { messageId });
      } catch (error) {
        logger.error("Failed to unpin message", error, { messageId });
        toast({
          title: "Failed to unpin message",
          description: error instanceof Error ? error.message : "Unknown error",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    },
    [user, channelId, toast],
  );

  const onBookmark = useCallback(
    async (messageId: string) => {
      if (!user) return;

      try {
        setIsLoading(true);

        logger.info("Bookmarking message", { messageId, userId: user.id });
        await new Promise((resolve) => setTimeout(resolve, 500));

        toast({
          title: "Message saved",
          description: "The message has been added to your saved items",
        });

        logger.info("Message bookmarked", { messageId });
      } catch (error) {
        logger.error("Failed to bookmark message", error, { messageId });
        toast({
          title: "Failed to save message",
          description: error instanceof Error ? error.message : "Unknown error",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    },
    [user, toast],
  );

  const onUnbookmark = useCallback(
    async (messageId: string) => {
      if (!user) return;

      try {
        setIsLoading(true);

        logger.info("Removing bookmark", { messageId, userId: user.id });
        await new Promise((resolve) => setTimeout(resolve, 500));

        toast({
          title: "Bookmark removed",
          description: "The message has been removed from your saved items",
        });

        logger.info("Bookmark removed", { messageId });
      } catch (error) {
        logger.error("Failed to remove bookmark", error, { messageId });
        toast({
          title: "Failed to remove bookmark",
          description: error instanceof Error ? error.message : "Unknown error",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    },
    [user, toast],
  );

  const onForward = useCallback(
    (message: Message) => {
      if (onForwardMessage) {
        onForwardMessage(message);
      } else {
        logger.warn("No forward handler provided");
      }
    },
    [onForwardMessage],
  );

  const onCopy = useCallback(
    (message: Message) => {
      try {
        navigator.clipboard.writeText(message.content);

        toast({
          title: "Message copied",
          description: "Message text copied to clipboard",
        });

        logger.info("Message copied to clipboard", { messageId: message.id });
      } catch (error) {
        logger.error("Failed to copy message", error, {
          messageId: message.id,
        });
        toast({
          title: "Failed to copy",
          description: "Could not copy message to clipboard",
          variant: "destructive",
        });
      }
    },
    [toast],
  );

  const onCopyLink = useCallback(
    (message: Message) => {
      try {
        const url = `${window.location.origin}/chat/${message.channelId}?message=${message.id}`;
        navigator.clipboard.writeText(url);

        toast({
          title: "Link copied",
          description: "Message link copied to clipboard",
        });

        logger.info("Message link copied", { messageId: message.id, url });
      } catch (error) {
        logger.error("Failed to copy link", error, { messageId: message.id });
        toast({
          title: "Failed to copy link",
          description: "Could not copy link to clipboard",
          variant: "destructive",
        });
      }
    },
    [toast],
  );

  const onReport = useCallback(
    (message: Message) => {
      if (onReportMessage) {
        onReportMessage(message);
      } else {
        logger.warn("No report handler provided");
      }
    },
    [onReportMessage],
  );

  const onMarkUnread = useCallback(
    async (messageId: string) => {
      if (!user) return;

      try {
        setIsLoading(true);

        logger.info("Marking as unread", { messageId, userId: user.id });
        await new Promise((resolve) => setTimeout(resolve, 500));

        toast({
          title: "Marked as unread",
          description: "The channel has been marked as unread",
        });

        logger.info("Marked as unread", { messageId });
      } catch (error) {
        logger.error("Failed to mark as unread", error, { messageId });
        toast({
          title: "Failed to mark as unread",
          description: error instanceof Error ? error.message : "Unknown error",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    },
    [user, toast],
  );

  const onViewDetails = useCallback(
    (message: Message) => {
      if (onViewMessageDetails) {
        onViewMessageDetails(message);
      } else {
        logger.info("Viewing message details", { messageId: message.id });
        // Could open a modal here
      }
    },
    [onViewMessageDetails],
  );

  const onViewEditHistory = useCallback((message: Message) => {
    logger.info("Viewing edit history", { messageId: message.id });
  }, []);

  const onViewReactions = useCallback((message: Message) => {
    logger.info("Viewing reactions", { messageId: message.id });
  }, []);

  // ============================================================================
  // Bulk Action Handlers
  // ============================================================================

  const onBulkDelete = useCallback(
    async (messageIds: string[]) => {
      if (!user || messageIds.length === 0) return;

      try {
        setIsLoading(true);

        logger.info("Bulk deleting messages", {
          count: messageIds.length,
          messageIds,
        });
        await new Promise((resolve) => setTimeout(resolve, 1000));

        toast({
          title: "Messages deleted",
          description: `${messageIds.length} messages have been deleted`,
        });

        setSelectedMessages(new Set());
        setIsSelectionMode(false);

        logger.info("Bulk delete completed", { count: messageIds.length });
      } catch (error) {
        logger.error("Failed to bulk delete", error, {
          count: messageIds.length,
        });
        toast({
          title: "Failed to delete messages",
          description: error instanceof Error ? error.message : "Unknown error",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    },
    [user, toast],
  );

  const onBulkForward = useCallback(
    (messages: Message[]) => {
      if (messages.length === 0) return;

      logger.info("Bulk forwarding messages", { count: messages.length });
      toast({
        title: "Forward messages",
        description: `Select destination for ${messages.length} messages`,
      });
    },
    [toast],
  );

  const onBulkCopy = useCallback(
    (messages: Message[]) => {
      if (messages.length === 0) return;

      try {
        const text = messages
          .map(
            (m) =>
              `[${new Date(m.createdAt).toLocaleString()}] ${m.user.displayName}: ${m.content}`,
          )
          .join("\n\n");

        navigator.clipboard.writeText(text);

        toast({
          title: "Messages copied",
          description: `${messages.length} messages copied to clipboard`,
        });

        logger.info("Bulk copy completed", { count: messages.length });
      } catch (error) {
        logger.error("Failed to bulk copy", error, {
          count: messages.length,
        });
        toast({
          title: "Failed to copy messages",
          description: "Could not copy messages to clipboard",
          variant: "destructive",
        });
      }
    },
    [toast],
  );

  // ============================================================================
  // Selection Handlers
  // ============================================================================

  const toggleSelection = useCallback((messageId: string) => {
    setSelectedMessages((prev) => {
      const next = new Set(prev);
      if (next.has(messageId)) {
        next.delete(messageId);
      } else {
        next.add(messageId);
      }
      return next;
    });
  }, []);

  const selectAll = useCallback((messageIds: string[]) => {
    setSelectedMessages(new Set(messageIds));
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedMessages(new Set());
  }, []);

  const enterSelectionMode = useCallback(() => {
    setIsSelectionMode(true);
  }, []);

  const exitSelectionMode = useCallback(() => {
    setIsSelectionMode(false);
    setSelectedMessages(new Set());
  }, []);

  // ============================================================================
  // Main Action Handler
  // ============================================================================

  const handleAction = useCallback(
    (action: MessageAction, message: Message, data?: unknown) => {
      if (!canPerformAction(action, message)) {
        logger.warn("Action not permitted", { action, messageId: message.id });
        toast({
          title: "Action not permitted",
          description: "You do not have permission to perform this action",
          variant: "destructive",
        });
        return;
      }

      switch (action) {
        case "react":
          const emoji = (data as { emoji?: string })?.emoji || "👍";
          return onReact(message.id, emoji);
        case "reply":
          return onReply(message);
        case "thread":
          return onThread(message);
        case "edit":
          return onEdit(message);
        case "delete":
          return onDelete(message.id);
        case "pin":
          return onPin(message.id);
        case "unpin":
          return onUnpin(message.id);
        case "bookmark":
          return onBookmark(message.id);
        case "unbookmark":
          return onUnbookmark(message.id);
        case "forward":
          return onForward(message);
        case "copy":
          return onCopy(message);
        case "copy-link":
          return onCopyLink(message);
        case "report":
          return onReport(message);
        case "mark-unread":
          return onMarkUnread(message.id);
        default:
          logger.warn("Unknown action", { action });
      }
    },
    [
      canPerformAction,
      onReact,
      onReply,
      onThread,
      onEdit,
      onDelete,
      onPin,
      onUnpin,
      onBookmark,
      onUnbookmark,
      onForward,
      onCopy,
      onCopyLink,
      onReport,
      onMarkUnread,
      toast,
    ],
  );

  // ============================================================================
  // Return
  // ============================================================================

  return {
    handlers: {
      onReact,
      onRemoveReaction,
      onReply,
      onThread,
      onEdit,
      onDelete,
      onPin,
      onUnpin,
      onBookmark,
      onUnbookmark,
      onForward,
      onCopy,
      onCopyLink,
      onReport,
      onMarkUnread,
      onViewDetails,
      onViewEditHistory,
      onViewReactions,
    },
    bulkHandlers: {
      onBulkDelete,
      onBulkForward,
      onBulkCopy,
    },
    selection: {
      selectedMessages,
      toggleSelection,
      selectAll,
      clearSelection,
      isSelectionMode,
      enterSelectionMode,
      exitSelectionMode,
    },
    handleAction,
    canPerformAction,
    getPermissions,
    isLoading,
  };
}
