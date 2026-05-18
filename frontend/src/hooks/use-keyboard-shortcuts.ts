"use client";

import { useEffect, useCallback, useRef } from "react";

export type KeyboardShortcutHandler = (event: KeyboardEvent) => void | boolean;

export interface KeyboardShortcut {
  /** Unique identifier for the shortcut */
  id: string;
  /** Keys to match (e.g., ['Cmd', 'K'] or ['Ctrl', 'K']) */
  keys: string[];
  /** Description of what the shortcut does */
  description: string;
  /** Handler function to call when shortcut is triggered */
  handler: KeyboardShortcutHandler;
  /** Whether the shortcut is enabled */
  enabled?: boolean;
  /** Prevent default browser behavior */
  preventDefault?: boolean;
  /** Stop event propagation */
  stopPropagation?: boolean;
  /** Category for grouping */
  category?: string;
}

export interface UseKeyboardShortcutsOptions {
  /** Whether shortcuts are enabled globally */
  enabled?: boolean;
  /** Whether to ignore shortcuts when typing in input fields */
  ignoreInputFields?: boolean;
}

/**
 * Hook for managing keyboard shortcuts
 *
 * @example
 * ```tsx
 * const { registerShortcut, unregisterShortcut } = useKeyboardShortcuts({
 *   enabled: true,
 *   ignoreInputFields: true,
 * });
 *
 * useEffect(() => {
 *   const shortcut = registerShortcut({
 *     id: 'open-search',
 *     keys: ['Cmd', 'K'],
 *     description: 'Open search',
 *     handler: () => {
 *       openSearch();
 *     },
 *     preventDefault: true,
 *   });
 *
 *   return () => unregisterShortcut(shortcut.id);
 * }, []);
 * ```
 */
export function useKeyboardShortcuts(
  options: UseKeyboardShortcutsOptions = {},
) {
  const { enabled = true, ignoreInputFields = true } = options;
  const shortcutsRef = useRef<Map<string, KeyboardShortcut>>(new Map());

  const registerShortcut = useCallback((shortcut: KeyboardShortcut) => {
    shortcutsRef.current.set(shortcut.id, {
      ...shortcut,
      enabled: shortcut.enabled ?? true,
    });
    return shortcut;
  }, []);

  const unregisterShortcut = useCallback((id: string) => {
    shortcutsRef.current.delete(id);
  }, []);

  const getShortcuts = useCallback(() => {
    return Array.from(shortcutsRef.current.values());
  }, []);

  const isModifierKey = useCallback((key: string) => {
    return ["Control", "Alt", "Shift", "Meta", "Cmd", "Ctrl"].includes(key);
  }, []);

  const normalizeKey = useCallback((key: string, event: KeyboardEvent) => {
    // Normalize Cmd/Ctrl for cross-platform compatibility
    if (key === "Cmd" || key === "Ctrl") {
      return event.metaKey || event.ctrlKey ? key : null;
    }
    if (key === "Alt") return event.altKey ? key : null;
    if (key === "Shift") return event.shiftKey ? key : null;
    return key;
  }, []);

  const matchesShortcut = useCallback(
    (event: KeyboardEvent, shortcut: KeyboardShortcut) => {
      const { keys } = shortcut;

      // Get pressed keys
      const pressedKeys = [];
      if (event.metaKey || event.ctrlKey) pressedKeys.push("Cmd");
      if (event.altKey) pressedKeys.push("Alt");
      if (event.shiftKey) pressedKeys.push("Shift");

      // Add the main key (not a modifier)
      if (!isModifierKey(event.key)) {
        pressedKeys.push(event.key);
      }

      // Check if all shortcut keys are pressed
      return keys.every((key) => {
        if (key === "Cmd" || key === "Ctrl") {
          return event.metaKey || event.ctrlKey;
        }
        if (key === "Alt") return event.altKey;
        if (key === "Shift") return event.shiftKey;
        return (
          event.key === key || event.key.toLowerCase() === key.toLowerCase()
        );
      });
    },
    [isModifierKey],
  );

  const shouldIgnoreEvent = useCallback(
    (event: KeyboardEvent) => {
      if (!ignoreInputFields) return false;

      const target = event.target as HTMLElement;
      const tagName = target.tagName.toLowerCase();
      const isEditable =
        target.isContentEditable ||
        tagName === "input" ||
        tagName === "textarea" ||
        tagName === "select";

      return isEditable;
    },
    [ignoreInputFields],
  );

  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (shouldIgnoreEvent(event)) return;

      for (const shortcut of shortcutsRef.current.values()) {
        if (!shortcut.enabled) continue;

        if (matchesShortcut(event, shortcut)) {
          if (shortcut.preventDefault) {
            event.preventDefault();
          }
          if (shortcut.stopPropagation) {
            event.stopPropagation();
          }

          const result = shortcut.handler(event);

          // If handler returns false, stop checking other shortcuts
          if (result === false) break;
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [enabled, shouldIgnoreEvent, matchesShortcut]);

  return {
    registerShortcut,
    unregisterShortcut,
    getShortcuts,
  };
}

/**
 * Format keyboard shortcut for display
 */
export function formatShortcut(keys: string[]): string {
  const isMac =
    typeof navigator !== "undefined" && navigator.platform.includes("Mac");

  return keys
    .map((key) => {
      if (key === "Cmd") return isMac ? "⌘" : "Ctrl";
      if (key === "Ctrl") return isMac ? "⌃" : "Ctrl";
      if (key === "Alt") return isMac ? "⌥" : "Alt";
      if (key === "Shift") return isMac ? "⇧" : "Shift";
      if (key === "Enter") return "↵";
      if (key === "Escape" || key === "Esc") return "Esc";
      if (key === "ArrowUp") return "↑";
      if (key === "ArrowDown") return "↓";
      if (key === "ArrowLeft") return "←";
      if (key === "ArrowRight") return "→";
      return key;
    })
    .join(isMac ? "" : "+");
}

/**
 * Default keyboard shortcuts for the application
 */
export const DEFAULT_SHORTCUTS = {
  // Global
  COMMAND_PALETTE: {
    keys: ["Cmd", "K"],
    description: "Open command palette",
    category: "Global",
  },
  SEARCH: {
    keys: ["Cmd", "F"],
    description: "Search messages",
    category: "Global",
  },
  SETTINGS: {
    keys: ["Cmd", ","],
    description: "Open settings",
    category: "Global",
  },
  TOGGLE_SIDEBAR: {
    keys: ["Cmd", "\\"],
    description: "Toggle sidebar",
    category: "Global",
  },
  ACCESSIBILITY_MENU: {
    keys: ["Cmd", "Shift", "A"],
    description: "Open accessibility menu",
    category: "Global",
  },

  // Navigation
  NEXT_CHANNEL: {
    keys: ["Alt", "ArrowDown"],
    description: "Next channel",
    category: "Navigation",
  },
  PREV_CHANNEL: {
    keys: ["Alt", "ArrowUp"],
    description: "Previous channel",
    category: "Navigation",
  },
  NEXT_UNREAD: {
    keys: ["Alt", "Shift", "ArrowDown"],
    description: "Next unread channel",
    category: "Navigation",
  },
  PREV_UNREAD: {
    keys: ["Alt", "Shift", "ArrowUp"],
    description: "Previous unread channel",
    category: "Navigation",
  },

  // Messaging
  NEW_MESSAGE: {
    keys: ["Cmd", "N"],
    description: "New message",
    category: "Messaging",
  },
  SEND_MESSAGE: {
    keys: ["Cmd", "Enter"],
    description: "Send message",
    category: "Messaging",
  },
  EDIT_LAST_MESSAGE: {
    keys: ["ArrowUp"],
    description: "Edit last message",
    category: "Messaging",
  },
  REPLY: {
    keys: ["R"],
    description: "Reply to message",
    category: "Messaging",
  },
  THREAD: { keys: ["T"], description: "Open thread", category: "Messaging" },
  REACT: { keys: ["E"], description: "Add reaction", category: "Messaging" },

  // Formatting
  BOLD: {
    keys: ["Cmd", "B"],
    description: "Bold text",
    category: "Formatting",
  },
  ITALIC: {
    keys: ["Cmd", "I"],
    description: "Italic text",
    category: "Formatting",
  },
  UNDERLINE: {
    keys: ["Cmd", "U"],
    description: "Underline text",
    category: "Formatting",
  },
  CODE: {
    keys: ["Cmd", "E"],
    description: "Code block",
    category: "Formatting",
  },
  LINK: {
    keys: ["Cmd", "Shift", "K"],
    description: "Insert link",
    category: "Formatting",
  },

  // Actions
  MARK_AS_READ: {
    keys: ["Shift", "Escape"],
    description: "Mark all as read",
    category: "Actions",
  },
  PIN_MESSAGE: { keys: ["P"], description: "Pin message", category: "Actions" },
  SAVE_MESSAGE: {
    keys: ["S"],
    description: "Save message",
    category: "Actions",
  },
  UPLOAD_FILE: {
    keys: ["Cmd", "U"],
    description: "Upload file",
    category: "Actions",
  },

  // Close/Cancel
  CLOSE_MODAL: {
    keys: ["Escape"],
    description: "Close modal",
    category: "Actions",
  },
  CANCEL: {
    keys: ["Escape"],
    description: "Cancel action",
    category: "Actions",
  },
} as const;

export default useKeyboardShortcuts;
