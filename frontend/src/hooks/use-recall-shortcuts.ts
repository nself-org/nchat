/**
 * useRecallShortcuts Hook
 *
 * Keyboard shortcuts for quick recall features (pins, bookmarks, saved, stars).
 */

import { useEffect, useCallback } from "react";
import { useStarStore } from "@/stores/star-store";
import { useSavedStore } from "@/stores/saved-store";
import { usePinnedStore } from "@/stores/pinned-store";
import { useBookmarkStore } from "@/lib/bookmarks/bookmark-store";

interface ShortcutHandler {
  key: string;
  ctrlKey?: boolean;
  metaKey?: boolean;
  shiftKey?: boolean;
  altKey?: boolean;
  handler: () => void;
  description: string;
}

interface UseRecallShortcutsOptions {
  /**
   * Current channel ID for channel-specific shortcuts.
   */
  channelId?: string;

  /**
   * Currently selected message ID for message-specific shortcuts.
   */
  selectedMessageId?: string;

  /**
   * Whether shortcuts are enabled.
   */
  enabled?: boolean;

  /**
   * Callback when a message should be starred.
   */
  onStarMessage?: (messageId: string) => void;

  /**
   * Callback when a message should be bookmarked.
   */
  onBookmarkMessage?: (messageId: string) => void;

  /**
   * Callback when a message should be saved.
   */
  onSaveMessage?: (messageId: string) => void;

  /**
   * Callback when a message should be pinned.
   */
  onPinMessage?: (messageId: string) => void;
}

interface UseRecallShortcutsReturn {
  shortcuts: ShortcutHandler[];
}

/**
 * Hook for managing keyboard shortcuts for quick recall features.
 */
export function useRecallShortcuts(
  options: UseRecallShortcutsOptions = {},
): UseRecallShortcutsReturn {
  const {
    channelId,
    selectedMessageId,
    enabled = true,
    onStarMessage,
    onBookmarkMessage,
    onSaveMessage,
    onPinMessage,
  } = options;

  const starStore = useStarStore();
  const savedStore = useSavedStore();
  const pinnedStore = usePinnedStore();
  const bookmarkStore = useBookmarkStore();

  // Define shortcuts
  const shortcuts: ShortcutHandler[] = [
    // Star shortcuts
    {
      key: "s",
      ctrlKey: true,
      shiftKey: true,
      handler: () => {
        if (selectedMessageId && onStarMessage) {
          onStarMessage(selectedMessageId);
        }
      },
      description: "Star selected message",
    },
    {
      key: "*",
      handler: () => {
        if (selectedMessageId && onStarMessage) {
          onStarMessage(selectedMessageId);
        }
      },
      description: "Quick star selected message",
    },

    // Bookmark shortcuts
    {
      key: "b",
      ctrlKey: true,
      shiftKey: true,
      handler: () => {
        if (selectedMessageId && onBookmarkMessage) {
          onBookmarkMessage(selectedMessageId);
        }
      },
      description: "Bookmark selected message",
    },
    {
      key: "d",
      ctrlKey: true,
      handler: () => {
        if (selectedMessageId && onBookmarkMessage) {
          onBookmarkMessage(selectedMessageId);
        }
      },
      description: "Quick bookmark (like browser)",
    },

    // Save shortcuts
    {
      key: "s",
      altKey: true,
      handler: () => {
        if (selectedMessageId && onSaveMessage) {
          onSaveMessage(selectedMessageId);
        }
      },
      description: "Save message to Saved Messages",
    },

    // Pin shortcuts
    {
      key: "p",
      ctrlKey: true,
      shiftKey: true,
      handler: () => {
        if (selectedMessageId && channelId && onPinMessage) {
          onPinMessage(selectedMessageId);
        }
      },
      description: "Pin selected message to channel",
    },

    // Panel shortcuts
    {
      key: "g",
      ctrlKey: true,
      handler: () => {
        starStore.togglePanel();
      },
      description: "Toggle starred messages panel",
    },
    {
      key: "g",
      ctrlKey: true,
      shiftKey: true,
      handler: () => {
        savedStore.togglePanel();
      },
      description: "Toggle saved messages panel",
    },
    {
      key: "p",
      altKey: true,
      handler: () => {
        if (channelId) {
          pinnedStore.togglePanel();
        }
      },
      description: "Toggle pinned messages panel",
    },
    {
      key: "b",
      altKey: true,
      handler: () => {
        bookmarkStore.togglePanel();
      },
      description: "Toggle bookmarks panel",
    },

    // Navigation shortcuts
    {
      key: "1",
      altKey: true,
      handler: () => {
        // Jump to first pinned message
        if (channelId) {
          const pins = pinnedStore.getPinnedMessages(channelId);
          if (pins.length > 0) {
            console.log("Jump to first pin:", pins[0].messageId);
          }
        }
      },
      description: "Jump to first pinned message",
    },
    {
      key: "2",
      altKey: true,
      handler: () => {
        // Jump to first starred message
        const stars = starStore.getQuickAccessStars(1);
        if (stars.length > 0) {
          console.log("Jump to first star:", stars[0].messageId);
        }
      },
      description: "Jump to first quick access star",
    },
  ];

  // Handle keydown events
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!enabled) return;

      // Don't handle shortcuts when typing in input fields
      const target = event.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable
      ) {
        return;
      }

      // Find matching shortcut
      const shortcut = shortcuts.find((s) => {
        if (s.key.toLowerCase() !== event.key.toLowerCase()) return false;
        if (s.ctrlKey && !(event.ctrlKey || event.metaKey)) return false;
        if (s.metaKey && !event.metaKey) return false;
        if (s.shiftKey && !event.shiftKey) return false;
        if (s.altKey && !event.altKey) return false;
        // Check that we don't require modifiers that aren't pressed
        if (!s.ctrlKey && !s.metaKey && (event.ctrlKey || event.metaKey))
          return false;
        if (!s.shiftKey && event.shiftKey) return false;
        if (!s.altKey && event.altKey) return false;
        return true;
      });

      if (shortcut) {
        event.preventDefault();
        shortcut.handler();
      }
    },
    [enabled, shortcuts],
  );

  // Register event listener
  useEffect(() => {
    if (!enabled) return;

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [enabled, handleKeyDown]);

  return { shortcuts };
}

/**
 * Get formatted shortcut key display.
 */
export function formatShortcut(shortcut: ShortcutHandler): string {
  const parts: string[] = [];

  // Detect OS for proper modifier display
  const isMac =
    typeof navigator !== "undefined" && navigator.platform.includes("Mac");

  if (shortcut.ctrlKey || shortcut.metaKey) {
    parts.push(isMac ? "\u2318" : "Ctrl");
  }
  if (shortcut.altKey) {
    parts.push(isMac ? "\u2325" : "Alt");
  }
  if (shortcut.shiftKey) {
    parts.push(isMac ? "\u21E7" : "Shift");
  }

  parts.push(shortcut.key.toUpperCase());

  return parts.join(isMac ? "" : "+");
}
