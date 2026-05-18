"use client";

/**
 * Message Keyboard Shortcuts Hook
 *
 * Provides keyboard shortcuts for interacting with messages:
 * - Edit last message
 * - Reply to selected message
 * - Add reactions
 * - Delete messages
 * - Open threads
 * - Pin/unpin messages
 */

import { useCallback, useMemo } from "react";
import { useShortcut, useScopedKeyboard } from "@/lib/keyboard";
import { useMessageStore } from "@/stores/message-store";
import { useUIStore } from "@/stores/ui-store";
import { useAuth } from "@/contexts/auth-context";
import type { Message } from "@/types/message";

// Re-export Message type for consumers
export type { Message };

export interface UseMessageShortcutsOptions {
  /** The current channel ID */
  channelId: string;
  /** List of messages in the channel (if not using store) */
  messages?: Message[];
  /** Currently selected message ID (if any) */
  selectedMessageId?: string | null;
  /** Whether the message input is empty */
  isInputEmpty?: boolean;
  /** Whether the message input is focused */
  isInputFocused?: boolean;
  /** Callback when edit mode should activate */
  onEditMessage?: (messageId: string) => void;
  /** Callback when reply mode should activate */
  onReplyToMessage?: (messageId: string) => void;
  /** Callback when reaction picker should open */
  onOpenReactionPicker?: (messageId: string) => void;
  /** Callback when message should be deleted */
  onDeleteMessage?: (messageId: string) => void;
  /** Callback when thread should open */
  onOpenThread?: (messageId: string) => void;
  /** Callback when message selection changes */
  onSelectMessage?: (messageId: string | null) => void;
  /** Callback when message should be pinned/unpinned */
  onTogglePin?: (messageId: string) => void;
  /** Callback when message should be marked as unread */
  onMarkUnread?: (messageId: string) => void;
}

// ============================================================================
// Hook
// ============================================================================

/**
 * Register message-related keyboard shortcuts
 *
 * @param options - Configuration and callbacks
 *
 * @example
 * ```tsx
 * function MessageList({ channelId }: { channelId: string }) {
 *   const [selectedMessageId, setSelectedMessageId] = useState<string | null>(null);
 *
 *   useMessageShortcuts({
 *     channelId,
 *     selectedMessageId,
 *     onEditMessage: (id) => setEditingMessageId(id),
 *     onReplyToMessage: (id) => setReplyingToMessageId(id),
 *     onSelectMessage: setSelectedMessageId,
 *   });
 *
 *   // ...
 * }
 * ```
 */
export function useMessageShortcuts(options: UseMessageShortcutsOptions) {
  const {
    channelId,
    messages: propMessages,
    selectedMessageId,
    isInputEmpty = true,
    isInputFocused = false,
    onEditMessage,
    onReplyToMessage,
    onOpenReactionPicker,
    onDeleteMessage,
    onOpenThread,
    onSelectMessage,
    onTogglePin,
    onMarkUnread,
  } = options;

  const { user } = useAuth();

  // Get messages from store or use provided messages
  const storeMessages = useMessageStore(
    (state) => state.messagesByChannel[channelId] || [],
  );
  const messages = propMessages || storeMessages;

  const removeMessage = useMessageStore((state) => state.removeMessage);
  const { setThreadPanelOpen, toggleEmojiPicker } = useUIStore();

  // Activate scoped shortcuts when a message is selected
  useScopedKeyboard("message-selected", !!selectedMessageId);

  // Get user's last message for edit functionality
  const userLastMessage = useMemo(() => {
    if (!user || !messages) return null;

    const userMessages = messages
      .filter((m) => m.userId === user.id)
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );

    return userMessages[0] || null;
  }, [messages, user]);

  // Get currently selected message
  const currentSelectedMessage = useMemo(() => {
    if (!selectedMessageId || !messages) return null;
    return messages.find((m) => m.id === selectedMessageId) || null;
  }, [selectedMessageId, messages]);

  // ============================================================================
  // Edit Last Message (Arrow Up when input is empty)
  // ============================================================================

  const handleEditLast = useCallback(() => {
    // Only trigger if input is focused and empty
    if (!isInputFocused || !isInputEmpty) return;
    if (!userLastMessage) return;

    if (onEditMessage) {
      onEditMessage(userLastMessage.id);
    }
  }, [isInputFocused, isInputEmpty, userLastMessage, onEditMessage]);

  useShortcut("EDIT_LAST", handleEditLast, {
    when: isInputFocused && isInputEmpty,
    ignoreScope: true,
  });

  // ============================================================================
  // Reply to Selected Message (R)
  // ============================================================================

  const handleReply = useCallback(() => {
    if (!selectedMessageId) return;

    if (onReplyToMessage) {
      onReplyToMessage(selectedMessageId);
    }
  }, [selectedMessageId, onReplyToMessage]);

  useShortcut("REPLY", handleReply, {
    when: !!selectedMessageId,
  });

  // ============================================================================
  // Add Reaction (E)
  // ============================================================================

  const handleReact = useCallback(() => {
    if (!selectedMessageId) return;

    if (onOpenReactionPicker) {
      onOpenReactionPicker(selectedMessageId);
    } else {
      // Open emoji picker at message position
      const messageElement = document.querySelector(
        `[data-message-id="${selectedMessageId}"]`,
      );
      if (messageElement) {
        const rect = messageElement.getBoundingClientRect();
        toggleEmojiPicker({ x: rect.right, y: rect.top });
      }
    }
  }, [selectedMessageId, onOpenReactionPicker, toggleEmojiPicker]);

  useShortcut("REACT", handleReact, {
    when: !!selectedMessageId,
  });

  // ============================================================================
  // Delete Message (Backspace)
  // ============================================================================

  const handleDelete = useCallback(() => {
    if (!selectedMessageId || !currentSelectedMessage || !user) return;

    // Only allow deleting own messages
    if (currentSelectedMessage.userId !== user.id) {
      // Could show a toast here: "You can only delete your own messages"
      return;
    }

    if (onDeleteMessage) {
      onDeleteMessage(selectedMessageId);
    } else {
      removeMessage(channelId, selectedMessageId);
    }

    // Clear selection after delete
    if (onSelectMessage) {
      onSelectMessage(null);
    }
  }, [
    selectedMessageId,
    currentSelectedMessage,
    user,
    onDeleteMessage,
    removeMessage,
    channelId,
    onSelectMessage,
  ]);

  useShortcut("DELETE_MESSAGE", handleDelete, {
    when: !!selectedMessageId && currentSelectedMessage?.userId === user?.id,
  });

  // ============================================================================
  // Open Thread (T)
  // ============================================================================

  const handleOpenThread = useCallback(() => {
    if (!selectedMessageId) return;

    if (onOpenThread) {
      onOpenThread(selectedMessageId);
    } else {
      // Use the UI store to open thread panel
      setThreadPanelOpen(true);
      // Store might need to track which message's thread is open
    }
  }, [selectedMessageId, onOpenThread, setThreadPanelOpen]);

  useShortcut("THREAD", handleOpenThread, {
    when: !!selectedMessageId,
  });

  // ============================================================================
  // Pin/Unpin Message (P)
  // ============================================================================

  const handlePin = useCallback(() => {
    if (!selectedMessageId) return;

    if (onTogglePin) {
      onTogglePin(selectedMessageId);
    }
    // Note: Pin functionality should be implemented via callback
  }, [selectedMessageId, onTogglePin]);

  useShortcut("PIN_MESSAGE", handlePin, {
    when: !!selectedMessageId && !!onTogglePin,
  });

  // ============================================================================
  // Mark as Unread (U)
  // ============================================================================

  const handleMarkUnread = useCallback(() => {
    if (!selectedMessageId) return;

    if (onMarkUnread) {
      onMarkUnread(selectedMessageId);
    }
    // Note: Mark as unread functionality should be implemented via callback
  }, [selectedMessageId, onMarkUnread]);

  useShortcut("MARK_UNREAD", handleMarkUnread, {
    when: !!selectedMessageId && !!onMarkUnread,
  });

  // ============================================================================
  // Copy Message (Cmd+C) - only when message selected, not in input
  // ============================================================================

  const handleCopyMessage = useCallback(() => {
    if (!currentSelectedMessage) return;

    navigator.clipboard.writeText(currentSelectedMessage.content);
    // Could show a toast: "Message copied"
  }, [currentSelectedMessage]);

  useShortcut("COPY_MESSAGE", handleCopyMessage, {
    when: !!selectedMessageId && !isInputFocused,
  });

  // Return useful state and functions
  return {
    selectedMessageId,
    selectedMessage: currentSelectedMessage,
    userLastMessage,
    canEdit: !!userLastMessage && isInputFocused && isInputEmpty,
    canDelete:
      !!selectedMessageId && currentSelectedMessage?.userId === user?.id,
  };
}

// ============================================================================
// Navigation within Message List
// ============================================================================

export interface UseMessageNavigationOptions {
  /** List of message IDs in order */
  messageIds: string[];
  /** Currently selected message ID */
  selectedMessageId: string | null;
  /** Callback when selection changes */
  onSelectMessage: (messageId: string | null) => void;
  /** Enable navigation shortcuts */
  enabled?: boolean;
}

/**
 * Hook for navigating through messages with keyboard
 */
export function useMessageNavigation(options: UseMessageNavigationOptions) {
  const {
    messageIds,
    selectedMessageId,
    onSelectMessage,
    enabled = true,
  } = options;

  // Navigate to next message (j or Down in message list)
  const handleNextMessage = useCallback(() => {
    if (messageIds.length === 0) return;

    if (!selectedMessageId) {
      // Select first message
      onSelectMessage(messageIds[0]);
      return;
    }

    const currentIndex = messageIds.indexOf(selectedMessageId);
    if (currentIndex < messageIds.length - 1) {
      onSelectMessage(messageIds[currentIndex + 1]);
    }
  }, [messageIds, selectedMessageId, onSelectMessage]);

  // Navigate to previous message (k or Up in message list)
  const handlePrevMessage = useCallback(() => {
    if (messageIds.length === 0) return;

    if (!selectedMessageId) {
      // Select last message
      onSelectMessage(messageIds[messageIds.length - 1]);
      return;
    }

    const currentIndex = messageIds.indexOf(selectedMessageId);
    if (currentIndex > 0) {
      onSelectMessage(messageIds[currentIndex - 1]);
    }
  }, [messageIds, selectedMessageId, onSelectMessage]);

  // Clear selection (Escape when message is selected)
  const handleClearSelection = useCallback(() => {
    if (selectedMessageId) {
      onSelectMessage(null);
    }
  }, [selectedMessageId, onSelectMessage]);

  // Register custom shortcuts for vim-like navigation
  // These are custom shortcuts not in the main SHORTCUTS constant
  // Using useHotkeys directly for these specialized controls

  return {
    handleNextMessage,
    handlePrevMessage,
    handleClearSelection,
    hasSelection: !!selectedMessageId,
    selectedIndex: selectedMessageId
      ? messageIds.indexOf(selectedMessageId)
      : -1,
    totalMessages: messageIds.length,
  };
}
