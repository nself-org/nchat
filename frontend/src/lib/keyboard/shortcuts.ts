/**
 * Keyboard Shortcuts Configuration
 *
 * Defines all keyboard shortcuts for the nself-chat application.
 * Uses 'mod' for platform-agnostic modifier (Cmd on Mac, Ctrl on Windows/Linux).
 */

// ============================================================================
// Types
// ============================================================================

export type ShortcutCategory =
  | "Navigation"
  | "Messages"
  | "Formatting"
  | "UI"
  | "Actions";

export interface ShortcutDefinition {
  /** The keyboard key combination (uses react-hotkeys-hook format) */
  key: string;
  /** Human-readable label for the shortcut */
  label: string;
  /** Category for grouping in the shortcuts modal */
  category: ShortcutCategory;
  /** Optional description for more context */
  description?: string;
  /** Whether this shortcut should work when an input is focused */
  enableOnFormTags?: boolean;
  /** Whether to prevent default browser behavior */
  preventDefault?: boolean;
  /** Scopes where this shortcut is active */
  scopes?: string[];
}

// ============================================================================
// Shortcut Definitions
// ============================================================================

export const SHORTCUTS = {
  // Navigation
  QUICK_SWITCHER: {
    key: "mod+k",
    label: "Quick switcher",
    category: "Navigation",
    description: "Open quick switcher to navigate channels and DMs",
    preventDefault: true,
  },
  SEARCH: {
    key: "mod+f",
    label: "Search",
    category: "Navigation",
    description: "Search messages, files, and people",
    preventDefault: true,
  },
  NEXT_CHANNEL: {
    key: "alt+ArrowDown",
    label: "Next channel",
    category: "Navigation",
    description: "Navigate to the next channel in the list",
    preventDefault: true,
  },
  PREV_CHANNEL: {
    key: "alt+ArrowUp",
    label: "Previous channel",
    category: "Navigation",
    description: "Navigate to the previous channel in the list",
    preventDefault: true,
  },
  NEXT_UNREAD: {
    key: "alt+shift+ArrowDown",
    label: "Next unread",
    category: "Navigation",
    description: "Jump to the next channel with unread messages",
    preventDefault: true,
  },
  PREV_UNREAD: {
    key: "alt+shift+ArrowUp",
    label: "Previous unread",
    category: "Navigation",
    description: "Jump to the previous channel with unread messages",
    preventDefault: true,
  },
  GOTO_DMS: {
    key: "mod+shift+k",
    label: "Go to DMs",
    category: "Navigation",
    description: "Open direct messages section",
    preventDefault: true,
  },
  FOCUS_MESSAGE_INPUT: {
    key: "mod+/",
    label: "Focus message input",
    category: "Navigation",
    description: "Jump to the message input field",
    preventDefault: true,
  },

  // Messages
  EDIT_LAST: {
    key: "ArrowUp",
    label: "Edit last message",
    category: "Messages",
    description: "Edit your last message (when input is empty and focused)",
    enableOnFormTags: true,
    scopes: ["message-input-empty"],
  },
  REPLY: {
    key: "r",
    label: "Reply to message",
    category: "Messages",
    description: "Reply to the selected message",
    scopes: ["message-selected"],
  },
  REACT: {
    key: "e",
    label: "Add reaction",
    category: "Messages",
    description: "Add an emoji reaction to the selected message",
    scopes: ["message-selected"],
  },
  DELETE_MESSAGE: {
    key: "Backspace",
    label: "Delete message",
    category: "Messages",
    description: "Delete the selected message (if you are the author)",
    scopes: ["message-selected"],
  },
  COPY_MESSAGE: {
    key: "mod+c",
    label: "Copy message",
    category: "Messages",
    description: "Copy the selected message text",
    scopes: ["message-selected"],
  },
  PIN_MESSAGE: {
    key: "p",
    label: "Pin/Unpin message",
    category: "Messages",
    description: "Toggle pin status of the selected message",
    scopes: ["message-selected"],
  },
  MARK_UNREAD: {
    key: "u",
    label: "Mark as unread",
    category: "Messages",
    description: "Mark the selected message and below as unread",
    scopes: ["message-selected"],
  },
  THREAD: {
    key: "t",
    label: "Open thread",
    category: "Messages",
    description: "Open thread for the selected message",
    scopes: ["message-selected"],
  },

  // Formatting (when editor is focused)
  BOLD: {
    key: "mod+b",
    label: "Bold",
    category: "Formatting",
    description: "Make selected text bold",
    enableOnFormTags: true,
    scopes: ["editor"],
  },
  ITALIC: {
    key: "mod+i",
    label: "Italic",
    category: "Formatting",
    description: "Make selected text italic",
    enableOnFormTags: true,
    scopes: ["editor"],
  },
  UNDERLINE: {
    key: "mod+u",
    label: "Underline",
    category: "Formatting",
    description: "Underline selected text",
    enableOnFormTags: true,
    scopes: ["editor"],
  },
  STRIKETHROUGH: {
    key: "mod+shift+x",
    label: "Strikethrough",
    category: "Formatting",
    description: "Strikethrough selected text",
    enableOnFormTags: true,
    scopes: ["editor"],
  },
  LINK: {
    key: "mod+shift+u",
    label: "Insert link",
    category: "Formatting",
    description: "Insert or edit a hyperlink",
    enableOnFormTags: true,
    scopes: ["editor"],
    preventDefault: true,
  },
  CODE: {
    key: "mod+shift+c",
    label: "Code",
    category: "Formatting",
    description: "Format selected text as inline code",
    enableOnFormTags: true,
    scopes: ["editor"],
    preventDefault: true,
  },
  CODE_BLOCK: {
    key: "mod+shift+Enter",
    label: "Code block",
    category: "Formatting",
    description: "Insert a code block",
    enableOnFormTags: true,
    scopes: ["editor"],
  },
  QUOTE: {
    key: "mod+shift+.",
    label: "Quote",
    category: "Formatting",
    description: "Format selected text as a quote",
    enableOnFormTags: true,
    scopes: ["editor"],
  },
  BULLET_LIST: {
    key: "mod+shift+8",
    label: "Bullet list",
    category: "Formatting",
    description: "Create a bullet list",
    enableOnFormTags: true,
    scopes: ["editor"],
  },
  NUMBERED_LIST: {
    key: "mod+shift+7",
    label: "Numbered list",
    category: "Formatting",
    description: "Create a numbered list",
    enableOnFormTags: true,
    scopes: ["editor"],
  },

  // UI
  TOGGLE_SIDEBAR: {
    key: "mod+shift+d",
    label: "Toggle sidebar",
    category: "UI",
    description: "Show or hide the channel sidebar",
    preventDefault: true,
  },
  TOGGLE_THREAD: {
    key: "mod+shift+t",
    label: "Toggle thread panel",
    category: "UI",
    description: "Show or hide the thread panel",
    preventDefault: true,
  },
  TOGGLE_MEMBERS: {
    key: "mod+shift+m",
    label: "Toggle members panel",
    category: "UI",
    description: "Show or hide the members panel",
    preventDefault: true,
  },
  SHOW_SHORTCUTS: {
    key: "?",
    label: "Show shortcuts",
    category: "UI",
    description: "Open this keyboard shortcuts reference",
  },
  CLOSE_MODAL: {
    key: "Escape",
    label: "Close modal",
    category: "UI",
    description: "Close any open modal or overlay",
    enableOnFormTags: true,
  },
  TOGGLE_FULLSCREEN: {
    key: "mod+shift+f",
    label: "Toggle fullscreen",
    category: "UI",
    description: "Enter or exit fullscreen mode",
    preventDefault: true,
  },
  TOGGLE_COMPACT_MODE: {
    key: "mod+shift+j",
    label: "Toggle compact mode",
    category: "UI",
    description: "Switch between comfortable and compact message display",
    preventDefault: true,
  },
  EMOJI_PICKER: {
    key: "mod+shift+e",
    label: "Open emoji picker",
    category: "UI",
    description: "Open the emoji picker",
    preventDefault: true,
  },

  // Actions
  NEW_CHANNEL: {
    key: "mod+shift+n",
    label: "New channel",
    category: "Actions",
    description: "Create a new channel",
    preventDefault: true,
  },
  NEW_DM: {
    key: "mod+n",
    label: "New direct message",
    category: "Actions",
    description: "Start a new direct message",
    preventDefault: true,
  },
  UPLOAD_FILE: {
    key: "mod+shift+u",
    label: "Upload file",
    category: "Actions",
    description: "Upload a file to the current channel",
    preventDefault: true,
    scopes: ["chat"],
  },
  INVITE_MEMBERS: {
    key: "mod+shift+i",
    label: "Invite members",
    category: "Actions",
    description: "Invite members to the current channel",
    preventDefault: true,
  },
  OPEN_SETTINGS: {
    key: "mod+,",
    label: "Open settings",
    category: "Actions",
    description: "Open application settings",
    preventDefault: true,
  },
  OPEN_PROFILE: {
    key: "mod+shift+p",
    label: "Open profile",
    category: "Actions",
    description: "Open your profile settings",
    preventDefault: true,
  },
} as const;

// ============================================================================
// Type exports
// ============================================================================

export type ShortcutKey = keyof typeof SHORTCUTS;
export type Shortcut = (typeof SHORTCUTS)[ShortcutKey];

// ============================================================================
// Helper functions
// ============================================================================

/**
 * Get all shortcuts for a specific category
 */
export function getShortcutsByCategory(category: ShortcutCategory): Array<{
  id: ShortcutKey;
  shortcut: ShortcutDefinition;
}> {
  return Object.entries(SHORTCUTS)
    .filter(([, shortcut]) => shortcut.category === category)
    .map(([id, shortcut]) => ({
      id: id as ShortcutKey,
      shortcut: shortcut as ShortcutDefinition,
    }));
}

/**
 * Get all shortcuts grouped by category
 */
export function getShortcutsGrouped(): Record<
  ShortcutCategory,
  Array<{ id: ShortcutKey; shortcut: ShortcutDefinition }>
> {
  const categories: ShortcutCategory[] = [
    "Navigation",
    "Messages",
    "Formatting",
    "UI",
    "Actions",
  ];

  return categories.reduce(
    (acc, category) => {
      acc[category] = getShortcutsByCategory(category);
      return acc;
    },
    {} as Record<
      ShortcutCategory,
      Array<{ id: ShortcutKey; shortcut: ShortcutDefinition }>
    >,
  );
}

/**
 * Format a keyboard key for display (e.g., "mod+k" -> "Cmd/Ctrl+K")
 */
export function formatKeyForDisplay(
  key: string,
  isMac: boolean = true,
): string {
  return key
    .split("+")
    .map((part) => {
      switch (part.toLowerCase()) {
        case "mod":
          return isMac ? "\u2318" : "Ctrl";
        case "alt":
          return isMac ? "\u2325" : "Alt";
        case "shift":
          return isMac ? "\u21E7" : "Shift";
        case "ctrl":
          return isMac ? "\u2303" : "Ctrl";
        case "enter":
          return isMac ? "\u21A9" : "Enter";
        case "escape":
          return "Esc";
        case "backspace":
          return isMac ? "\u232B" : "Backspace";
        case "arrowup":
          return "\u2191";
        case "arrowdown":
          return "\u2193";
        case "arrowleft":
          return "\u2190";
        case "arrowright":
          return "\u2192";
        default:
          return part.toUpperCase();
      }
    })
    .join(isMac ? "" : "+");
}

/**
 * Check if the current platform is macOS
 */
export function isMacOS(): boolean {
  if (typeof window === "undefined") return false;
  return navigator.platform.toUpperCase().indexOf("MAC") >= 0;
}

/**
 * Get all shortcut categories
 */
export function getCategories(): ShortcutCategory[] {
  return ["Navigation", "Messages", "Formatting", "UI", "Actions"];
}
