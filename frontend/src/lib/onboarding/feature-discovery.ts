/**
 * Feature Discovery - Feature tip and spotlight management
 *
 * Handles feature tips, pro tips, keyboard shortcut hints, and what's new
 */

import type {
  FeatureId,
  FeatureTip,
  FeatureDiscoveryState,
  FeatureDiscoveryConfig,
  WhatsNewItem,
  WhatsNewState,
} from "./onboarding-types";

// ============================================================================
// Feature Tip Definitions
// ============================================================================

export const featureTips: FeatureTip[] = [
  // Threads
  {
    id: "threads-intro",
    featureId: "threads",
    type: "spotlight",
    title: "Keep Conversations Organized",
    description:
      'Click "Reply in thread" on any message to start a threaded conversation. This keeps the main channel clean while allowing detailed discussions.',
    targetSelector: '[data-feature="thread-button"]',
    placement: "left",
    priority: 1,
    dismissible: true,
    showOnce: true,
  },

  // Reactions
  {
    id: "reactions-intro",
    featureId: "reactions",
    type: "tooltip",
    title: "Quick Reactions",
    description:
      "Hover over a message and click the emoji icon to add a reaction. Express yourself without cluttering the chat!",
    targetSelector: '[data-feature="reaction-button"]',
    placement: "top",
    priority: 2,
    dismissible: true,
    showOnce: true,
  },

  // Mentions
  {
    id: "mentions-intro",
    featureId: "mentions",
    type: "inline",
    title: "Get Someone's Attention",
    description:
      "Type @ followed by a name to mention someone. They'll receive a notification. Use @channel or @here to notify everyone.",
    priority: 3,
    dismissible: true,
    showOnce: true,
  },

  // File Upload
  {
    id: "file-upload-intro",
    featureId: "file-upload",
    type: "tooltip",
    title: "Share Files Easily",
    description:
      "Drag and drop files into the chat or click the attachment button. You can share images, documents, and more.",
    targetSelector: '[data-feature="file-upload"]',
    placement: "top",
    priority: 4,
    dismissible: true,
    showOnce: true,
  },

  // Voice Messages
  {
    id: "voice-messages-intro",
    featureId: "voice-messages",
    type: "spotlight",
    title: "Send Voice Messages",
    description:
      "Click the microphone icon to record and send voice messages. Perfect for quick updates when typing isn't convenient.",
    targetSelector: '[data-feature="voice-message"]',
    placement: "top",
    priority: 5,
    dismissible: true,
    showOnce: true,
  },

  // Scheduled Messages
  {
    id: "scheduled-messages-intro",
    featureId: "scheduled-messages",
    type: "tooltip",
    title: "Schedule Messages",
    description:
      "Click the clock icon next to the send button to schedule a message for later. Great for working across time zones!",
    targetSelector: '[data-feature="schedule-message"]',
    placement: "top",
    priority: 6,
    dismissible: true,
    showOnce: true,
  },

  // Search Filters
  {
    id: "search-filters-intro",
    featureId: "search-filters",
    type: "inline",
    title: "Advanced Search",
    description:
      'Use filters like "from:@user", "in:#channel", "has:link", or "before:date" to find exactly what you\'re looking for.',
    priority: 7,
    dismissible: true,
    showOnce: false,
  },

  // Keyboard Shortcuts
  {
    id: "keyboard-shortcuts-intro",
    featureId: "keyboard-shortcuts",
    type: "modal",
    title: "Work Faster with Shortcuts",
    description:
      "Press ? to see all keyboard shortcuts. Use Cmd/Ctrl+K to quickly switch channels, and Cmd/Ctrl+/ to search.",
    priority: 8,
    dismissible: true,
    showOnce: true,
  },

  // Channel Bookmarks
  {
    id: "channel-bookmarks-intro",
    featureId: "channel-bookmarks",
    type: "tooltip",
    title: "Bookmark Important Channels",
    description:
      'Right-click on a channel and select "Bookmark" to pin it to the top of your sidebar for quick access.',
    targetSelector: '[data-feature="channel-bookmark"]',
    placement: "right",
    priority: 9,
    dismissible: true,
    showOnce: true,
  },

  // Message Pinning
  {
    id: "message-pinning-intro",
    featureId: "message-pinning",
    type: "tooltip",
    title: "Pin Important Messages",
    description:
      "Click the pin icon on any message to pin it to the channel. Pinned messages are easy to find later.",
    targetSelector: '[data-feature="pin-message"]',
    placement: "left",
    priority: 10,
    dismissible: true,
    showOnce: true,
  },

  // Custom Status
  {
    id: "custom-status-intro",
    featureId: "custom-status",
    type: "spotlight",
    title: "Set Your Status",
    description:
      "Click on your profile picture to set a custom status. Let your team know what you're working on or when you'll be away.",
    targetSelector: '[data-feature="user-status"]',
    placement: "bottom",
    priority: 11,
    dismissible: true,
    showOnce: true,
  },

  // Do Not Disturb
  {
    id: "dnd-intro",
    featureId: "do-not-disturb",
    type: "inline",
    title: "Focus Mode",
    description:
      "Enable Do Not Disturb to pause all notifications. Set a schedule in Settings to automatically enable it during certain hours.",
    priority: 12,
    dismissible: true,
    showOnce: true,
  },
];

// ============================================================================
// Pro Tips
// ============================================================================

export interface ProTip {
  id: string;
  title: string;
  description: string;
  category: "productivity" | "communication" | "organization" | "advanced";
}

export const proTips: ProTip[] = [
  {
    id: "markdown-formatting",
    title: "Use Markdown for Rich Text",
    description:
      "Format your messages with *bold*, _italic_, `code`, and more. Start a line with > for a quote.",
    category: "communication",
  },
  {
    id: "slash-commands",
    title: "Try Slash Commands",
    description:
      "Type / in the message input to see available commands like /giphy, /poll, or /remind.",
    category: "productivity",
  },
  {
    id: "channel-organization",
    title: "Organize with Channel Sections",
    description:
      "Drag channels into custom sections in the sidebar to keep your workspace organized.",
    category: "organization",
  },
  {
    id: "message-history",
    title: "Navigate Message History",
    description:
      "Press Up arrow in an empty message input to edit your last message.",
    category: "advanced",
  },
  {
    id: "quick-emoji",
    title: "Quick Emoji Shortcut",
    description:
      "Type : followed by an emoji name (like :smile:) to quickly insert emojis without opening the picker.",
    category: "productivity",
  },
  {
    id: "code-blocks",
    title: "Share Code Snippets",
    description:
      "Wrap code in triple backticks (```) for syntax-highlighted code blocks. Add the language name for proper highlighting.",
    category: "communication",
  },
  {
    id: "link-previews",
    title: "Rich Link Previews",
    description:
      "Share links and nchat will automatically show previews for websites, GitHub repos, and more.",
    category: "communication",
  },
  {
    id: "drag-drop-files",
    title: "Drag and Drop",
    description:
      "Drag files directly from your computer into any chat to share them instantly.",
    category: "productivity",
  },
];

/**
 * Get a random pro tip
 */
export function getRandomProTip(excludeIds: string[] = []): ProTip | null {
  const available = proTips.filter((tip) => !excludeIds.includes(tip.id));
  if (available.length === 0) return null;
  const index = Math.floor(Math.random() * available.length);
  return available[index];
}

/**
 * Get pro tips by category
 */
export function getProTipsByCategory(category: ProTip["category"]): ProTip[] {
  return proTips.filter((tip) => tip.category === category);
}

// ============================================================================
// Keyboard Shortcut Tips
// ============================================================================

export interface KeyboardShortcutTip {
  id: string;
  shortcut: string;
  description: string;
  context?: string;
}

export const keyboardShortcutTips: KeyboardShortcutTip[] = [
  {
    id: "quick-switch",
    shortcut: "Cmd/Ctrl + K",
    description: "Quick switch between channels",
  },
  { id: "search", shortcut: "Cmd/Ctrl + /", description: "Open search" },
  {
    id: "new-message",
    shortcut: "Cmd/Ctrl + N",
    description: "Start a new message",
  },
  { id: "upload-file", shortcut: "Cmd/Ctrl + U", description: "Upload a file" },
  {
    id: "edit-message",
    shortcut: "Up Arrow",
    description: "Edit your last message",
    context: "In empty message input",
  },
  {
    id: "bold",
    shortcut: "Cmd/Ctrl + B",
    description: "Bold selected text",
    context: "While composing",
  },
  {
    id: "italic",
    shortcut: "Cmd/Ctrl + I",
    description: "Italicize selected text",
    context: "While composing",
  },
  {
    id: "toggle-sidebar",
    shortcut: "Cmd/Ctrl + Shift + D",
    description: "Toggle sidebar",
  },
  { id: "mark-read", shortcut: "Escape", description: "Mark channel as read" },
  {
    id: "prev-unread",
    shortcut: "Alt + Shift + Up",
    description: "Jump to previous unread channel",
  },
  {
    id: "next-unread",
    shortcut: "Alt + Shift + Down",
    description: "Jump to next unread channel",
  },
  { id: "help", shortcut: "?", description: "Show all keyboard shortcuts" },
];

/**
 * Get a random keyboard shortcut tip
 */
export function getRandomShortcutTip(
  excludeIds: string[] = [],
): KeyboardShortcutTip | null {
  const available = keyboardShortcutTips.filter(
    (tip) => !excludeIds.includes(tip.id),
  );
  if (available.length === 0) return null;
  const index = Math.floor(Math.random() * available.length);
  return available[index];
}

// ============================================================================
// Feature Discovery State Management
// ============================================================================

/**
 * Create initial feature discovery state
 */
export function createInitialFeatureDiscoveryState(
  userId: string,
): FeatureDiscoveryState {
  return {
    userId,
    discoveredFeatures: [],
    dismissedTips: [],
    seenTips: [],
    lastTipShownAt: undefined,
  };
}

/**
 * Mark feature as discovered
 */
export function markFeatureDiscovered(
  state: FeatureDiscoveryState,
  featureId: FeatureId,
): FeatureDiscoveryState {
  if (state.discoveredFeatures.includes(featureId)) return state;

  return {
    ...state,
    discoveredFeatures: [...state.discoveredFeatures, featureId],
  };
}

/**
 * Mark tip as seen
 */
export function markTipSeen(
  state: FeatureDiscoveryState,
  tipId: string,
): FeatureDiscoveryState {
  if (state.seenTips.includes(tipId)) return state;

  return {
    ...state,
    seenTips: [...state.seenTips, tipId],
    lastTipShownAt: new Date(),
  };
}

/**
 * Dismiss tip
 */
export function dismissTip(
  state: FeatureDiscoveryState,
  tipId: string,
): FeatureDiscoveryState {
  if (state.dismissedTips.includes(tipId)) return state;

  return {
    ...state,
    dismissedTips: [...state.dismissedTips, tipId],
    seenTips: state.seenTips.filter((id) => id !== tipId),
  };
}

/**
 * Get next tip to show
 */
export function getNextTipToShow(
  state: FeatureDiscoveryState,
  config: FeatureDiscoveryConfig,
): FeatureTip | null {
  if (!config.enabled) return null;

  // Check tip frequency
  if (state.lastTipShownAt) {
    const now = new Date();
    const lastShown = new Date(state.lastTipShownAt);
    const hoursSinceLastTip =
      (now.getTime() - lastShown.getTime()) / (1000 * 60 * 60);

    switch (config.tipFrequency) {
      case "daily":
        if (hoursSinceLastTip < 24) return null;
        break;
      case "weekly":
        if (hoursSinceLastTip < 168) return null;
        break;
      case "first_time_only":
        // Don't show any more tips
        break;
    }
  }

  // Find available tips
  const availableTips = featureTips.filter((tip) => {
    // Skip dismissed tips
    if (state.dismissedTips.includes(tip.id)) return false;

    // Skip already seen tips if showOnce is true
    if (tip.showOnce && state.seenTips.includes(tip.id)) return false;

    return true;
  });

  if (availableTips.length === 0) return null;

  // Sort by priority and return highest priority
  availableTips.sort((a, b) => a.priority - b.priority);
  return availableTips[0];
}

/**
 * Check if a feature has been discovered
 */
export function isFeatureDiscovered(
  state: FeatureDiscoveryState,
  featureId: FeatureId,
): boolean {
  return state.discoveredFeatures.includes(featureId);
}

/**
 * Get feature tip by ID
 */
export function getFeatureTipById(tipId: string): FeatureTip | undefined {
  return featureTips.find((tip) => tip.id === tipId);
}

/**
 * Get tips for a specific feature
 */
export function getTipsForFeature(featureId: FeatureId): FeatureTip[] {
  return featureTips.filter((tip) => tip.featureId === featureId);
}

// ============================================================================
// What's New
// ============================================================================

export const whatsNewItems: WhatsNewItem[] = [
  {
    id: "voice-messages-v1",
    title: "Voice Messages",
    description:
      "Now you can record and send voice messages directly in chat. Perfect for quick updates when typing isn't convenient.",
    icon: "Mic",
    learnMoreUrl: "/docs/voice-messages",
    releaseDate: new Date("2024-01-15"),
    category: "feature",
  },
  {
    id: "threads-v2",
    title: "Improved Threads",
    description:
      "Threads now support more features including reactions, file attachments, and better navigation.",
    icon: "MessageSquare",
    learnMoreUrl: "/docs/threads",
    releaseDate: new Date("2024-01-10"),
    category: "improvement",
  },
  {
    id: "search-filters-v1",
    title: "Advanced Search Filters",
    description:
      'Find messages faster with new search filters like "from:", "in:", "has:", and date ranges.',
    icon: "Search",
    learnMoreUrl: "/docs/search",
    releaseDate: new Date("2024-01-05"),
    category: "feature",
  },
];

/**
 * Create initial what's new state
 */
export function createInitialWhatsNewState(): WhatsNewState {
  return {
    lastSeenVersion: "0.0.0",
    seenItems: [],
    dismissedUntil: undefined,
  };
}

/**
 * Get unseen what's new items
 */
export function getUnseenWhatsNewItems(state: WhatsNewState): WhatsNewItem[] {
  // Check if dismissed
  if (state.dismissedUntil && new Date(state.dismissedUntil) > new Date()) {
    return [];
  }

  return whatsNewItems.filter((item) => !state.seenItems.includes(item.id));
}

/**
 * Mark what's new item as seen
 */
export function markWhatsNewSeen(
  state: WhatsNewState,
  itemId: string,
): WhatsNewState {
  if (state.seenItems.includes(itemId)) return state;

  return {
    ...state,
    seenItems: [...state.seenItems, itemId],
  };
}

/**
 * Mark all what's new as seen
 */
export function markAllWhatsNewSeen(state: WhatsNewState): WhatsNewState {
  return {
    ...state,
    seenItems: whatsNewItems.map((item) => item.id),
  };
}

/**
 * Dismiss what's new for a duration
 */
export function dismissWhatsNew(
  state: WhatsNewState,
  days: number = 7,
): WhatsNewState {
  const dismissedUntil = new Date();
  dismissedUntil.setDate(dismissedUntil.getDate() + days);

  return {
    ...state,
    dismissedUntil,
  };
}

// ============================================================================
// Default Configuration
// ============================================================================

export const defaultFeatureDiscoveryConfig: FeatureDiscoveryConfig = {
  enabled: true,
  showProTips: true,
  showKeyboardShortcutTips: true,
  tipFrequency: "daily",
  maxTipsPerSession: 3,
};
