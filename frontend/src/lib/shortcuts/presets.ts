/**
 * Platform-Specific Shortcut Presets
 *
 * Defines complete shortcut configurations inspired by popular messaging and
 * productivity applications: nChat (default), Slack, Discord, Telegram, WhatsApp.
 *
 * Each preset contains 30+ shortcuts covering navigation, messaging,
 * formatting, media, calls, and admin categories.
 */

import type {
  ShortcutRegistrationOptions,
  ShortcutCategory,
  ShortcutContext,
} from "./shortcut-registry";

// ============================================================================
// Types
// ============================================================================

/** A shortcut entry within a preset (no id prefix needed, the preset applies it) */
export interface PresetShortcut {
  /** Suffix for the shortcut id (preset name is prepended) */
  id: string;
  /** Key combination string */
  keys: string;
  /** Human-readable label */
  description: string;
  /** Category */
  category: ShortcutCategory;
  /** Context */
  context: ShortcutContext;
  /** Whether to prevent default */
  preventDefault?: boolean;
  /** Whether to allow in inputs */
  enableInInputs?: boolean;
  /** Priority */
  priority?: number;
}

/** A complete shortcut preset */
export interface ShortcutPreset {
  /** Unique name (e.g., "nchat", "slack", "discord") */
  name: string;
  /** Display label */
  label: string;
  /** Description of the preset */
  description: string;
  /** The shortcuts in this preset */
  shortcuts: PresetShortcut[];
}

/** User-level overrides on top of any preset */
export interface UserShortcutOverrides {
  /** Map of shortcut id -> new key combo */
  keyOverrides: Record<string, string>;
  /** Set of shortcut IDs to disable */
  disabledIds: Set<string>;
}

// ============================================================================
// Shared shortcut templates (reused across presets with key overrides)
// ============================================================================

function nav(
  id: string,
  keys: string,
  description: string,
  opts: Partial<PresetShortcut> = {},
): PresetShortcut {
  return {
    id,
    keys,
    description,
    category: "navigation",
    context: "global",
    preventDefault: true,
    ...opts,
  };
}

function msg(
  id: string,
  keys: string,
  description: string,
  opts: Partial<PresetShortcut> = {},
): PresetShortcut {
  return {
    id,
    keys,
    description,
    category: "messaging",
    context: "chat",
    ...opts,
  };
}

function fmt(
  id: string,
  keys: string,
  description: string,
  opts: Partial<PresetShortcut> = {},
): PresetShortcut {
  return {
    id,
    keys,
    description,
    category: "formatting",
    context: "editor",
    enableInInputs: true,
    ...opts,
  };
}

function med(
  id: string,
  keys: string,
  description: string,
  opts: Partial<PresetShortcut> = {},
): PresetShortcut {
  return {
    id,
    keys,
    description,
    category: "media",
    context: "global",
    preventDefault: true,
    ...opts,
  };
}

function call(
  id: string,
  keys: string,
  description: string,
  opts: Partial<PresetShortcut> = {},
): PresetShortcut {
  return {
    id,
    keys,
    description,
    category: "calls",
    context: "global",
    preventDefault: true,
    ...opts,
  };
}

function admin(
  id: string,
  keys: string,
  description: string,
  opts: Partial<PresetShortcut> = {},
): PresetShortcut {
  return {
    id,
    keys,
    description,
    category: "admin",
    context: "global",
    preventDefault: true,
    ...opts,
  };
}

// ============================================================================
// nChat Default Preset
// ============================================================================

export const nchatPreset: ShortcutPreset = {
  name: "nchat",
  label: "nChat (Default)",
  description:
    "Default nChat keyboard shortcuts optimized for team communication.",
  shortcuts: [
    // Navigation (10)
    nav("quick-switcher", "mod+k", "Open quick switcher"),
    nav("search", "mod+f", "Search messages and files"),
    nav("next-channel", "alt+arrowdown", "Navigate to next channel"),
    nav("prev-channel", "alt+arrowup", "Navigate to previous channel"),
    nav("next-unread", "alt+shift+arrowdown", "Jump to next unread channel"),
    nav("prev-unread", "alt+shift+arrowup", "Jump to previous unread channel"),
    nav("goto-dms", "mod+shift+k", "Open direct messages"),
    nav("focus-input", "mod+/", "Focus message input"),
    nav("goto-home", "mod+shift+h", "Go to home view"),
    nav("command-palette", "mod+shift+p", "Open command palette"),

    // Messaging (10)
    msg("send-message", "enter", "Send message", { enableInInputs: true }),
    msg("new-line", "shift+enter", "Insert new line in message", {
      enableInInputs: true,
    }),
    msg("edit-last", "arrowup", "Edit last message", { enableInInputs: true }),
    msg("reply", "r", "Reply to selected message"),
    msg("react", "e", "Add reaction to selected message"),
    msg("pin-message", "p", "Pin or unpin selected message"),
    msg("delete-message", "backspace", "Delete selected message"),
    msg("copy-message", "mod+c", "Copy selected message text"),
    msg("mark-unread", "u", "Mark as unread from selected message"),
    msg("open-thread", "t", "Open thread for selected message"),

    // Formatting (10)
    fmt("bold", "mod+b", "Bold selected text"),
    fmt("italic", "mod+i", "Italic selected text"),
    fmt("underline", "mod+u", "Underline selected text"),
    fmt("strikethrough", "mod+shift+x", "Strikethrough selected text"),
    fmt("code-inline", "mod+shift+c", "Format as inline code", {
      preventDefault: true,
    }),
    fmt("code-block", "mod+shift+enter", "Insert code block"),
    fmt("link", "mod+shift+u", "Insert or edit link", { preventDefault: true }),
    fmt("quote", "mod+shift+.", "Format as blockquote"),
    fmt("bullet-list", "mod+shift+8", "Create bullet list"),
    fmt("numbered-list", "mod+shift+7", "Create numbered list"),

    // Media (5)
    med("upload-file", "mod+shift+u", "Upload a file", { context: "chat" }),
    med("emoji-picker", "mod+shift+e", "Open emoji picker"),
    med("gif-picker", "mod+shift+g", "Open GIF picker"),
    med("record-audio", "mod+shift+r", "Record voice message"),
    med("screenshot", "mod+shift+s", "Take and share a screenshot"),

    // Calls (5)
    call("start-call", "mod+shift+c", "Start a call in current channel"),
    call("toggle-mute", "mod+shift+m", "Toggle microphone mute"),
    call("toggle-video", "mod+shift+v", "Toggle camera"),
    call("toggle-screenshare", "mod+shift+z", "Toggle screen sharing"),
    call("end-call", "mod+shift+q", "End current call"),

    // Admin / UI (5)
    admin("toggle-sidebar", "mod+shift+d", "Toggle sidebar"),
    admin("toggle-members", "mod+shift+m", "Toggle members panel", {
      context: "chat",
    }),
    admin("show-shortcuts", "?", "Show keyboard shortcuts", {
      context: "global",
      preventDefault: false,
    }),
    admin("open-settings", "mod+,", "Open settings"),
    admin("toggle-compact", "mod+shift+j", "Toggle compact mode"),
  ],
};

// ============================================================================
// Slack-like Preset
// ============================================================================

export const slackPreset: ShortcutPreset = {
  name: "slack",
  label: "Slack",
  description:
    "Shortcuts modeled after Slack for users familiar with that workflow.",
  shortcuts: [
    // Navigation (10)
    nav("quick-switcher", "mod+k", "Quick switcher (Jump to)"),
    nav("search", "mod+g", "Search messages"),
    nav("next-channel", "alt+arrowdown", "Next channel"),
    nav("prev-channel", "alt+arrowup", "Previous channel"),
    nav("next-unread", "alt+shift+arrowdown", "Next unread channel"),
    nav("prev-unread", "alt+shift+arrowup", "Previous unread channel"),
    nav("all-unreads", "mod+shift+a", "View all unreads"),
    nav("all-dms", "mod+shift+k", "All direct messages"),
    nav("threads", "mod+shift+t", "All threads"),
    nav("activity", "mod+shift+m", "Activity and mentions"),

    // Messaging (10)
    msg("send-message", "enter", "Send message", { enableInInputs: true }),
    msg("new-line", "shift+enter", "New line in message", {
      enableInInputs: true,
    }),
    msg("edit-last", "arrowup", "Edit last message", { enableInInputs: true }),
    msg("reply-thread", "r", "Reply in thread"),
    msg("react", "mod+shift+\\", "React to message"),
    msg("pin-message", "p", "Pin message"),
    msg("mark-unread", "u", "Mark unread"),
    msg("delete-message", "backspace", "Delete message"),
    msg("copy-message", "mod+c", "Copy message text"),
    msg("star-message", "s", "Star message"),

    // Formatting (10)
    fmt("bold", "mod+b", "Bold"),
    fmt("italic", "mod+i", "Italic"),
    fmt("strikethrough", "mod+shift+x", "Strikethrough"),
    fmt("code-inline", "mod+shift+c", "Inline code", { preventDefault: true }),
    fmt("code-block", "mod+shift+enter", "Code block"),
    fmt("link", "mod+shift+u", "Insert link", { preventDefault: true }),
    fmt("quote", "mod+shift+9", "Blockquote"),
    fmt("bullet-list", "mod+shift+8", "Bullet list"),
    fmt("numbered-list", "mod+shift+7", "Numbered list"),
    fmt("snippet", "mod+shift+enter", "Create snippet"),

    // Media (5)
    med("upload-file", "mod+u", "Upload file", { context: "chat" }),
    med("emoji-picker", "mod+shift+e", "Emoji picker"),
    med("gif-picker", "mod+shift+g", "Giphy search"),
    med("record-clip", "mod+shift+v", "Record video clip"),
    med("create-post", "mod+shift+enter", "Create post"),

    // Calls (5)
    call("start-huddle", "mod+shift+h", "Start huddle"),
    call("toggle-mute", "m", "Toggle mute in huddle"),
    call("toggle-video", "v", "Toggle video"),
    call("toggle-screenshare", "mod+shift+z", "Share screen"),
    call("end-call", "mod+shift+q", "Leave huddle"),

    // Admin (5)
    admin("toggle-sidebar", "mod+shift+d", "Toggle sidebar"),
    admin("channel-details", "mod+shift+i", "Channel details"),
    admin("show-shortcuts", "mod+/", "Show shortcuts"),
    admin("open-settings", "mod+,", "Preferences"),
    admin("toggle-fullscreen", "mod+shift+f", "Toggle fullscreen"),
  ],
};

// ============================================================================
// Discord-like Preset
// ============================================================================

export const discordPreset: ShortcutPreset = {
  name: "discord",
  label: "Discord",
  description:
    "Shortcuts modeled after Discord for gamers and community users.",
  shortcuts: [
    // Navigation (10)
    nav("quick-switcher", "mod+k", "Quick switcher"),
    nav("search", "mod+f", "Search"),
    nav("next-channel", "alt+arrowdown", "Next channel"),
    nav("prev-channel", "alt+arrowup", "Previous channel"),
    nav("next-server", "ctrl+alt+arrowdown", "Next server", {
      preventDefault: true,
    }),
    nav("prev-server", "ctrl+alt+arrowup", "Previous server", {
      preventDefault: true,
    }),
    nav("create-server", "mod+shift+n", "Create or join server"),
    nav("shortcut-help", "ctrl+/", "Open keyboard shortcut help"),
    nav("goto-unread", "shift+escape", "Mark server as read", {
      preventDefault: false,
    }),
    nav("goto-mentions", "mod+shift+m", "Open recent mentions"),

    // Messaging (10)
    msg("send-message", "enter", "Send message", { enableInInputs: true }),
    msg("new-line", "shift+enter", "New line", { enableInInputs: true }),
    msg("edit-last", "arrowup", "Edit last message", { enableInInputs: true }),
    msg("reply", "r", "Reply to message"),
    msg("react", "e", "Add reaction"),
    msg("pin-message", "p", "Pin message"),
    msg("delete-message", "backspace", "Delete message"),
    msg("copy-message", "mod+c", "Copy message"),
    msg("mark-unread", "u", "Mark unread"),
    msg("spoiler", "mod+shift+s", "Mark as spoiler", {
      context: "editor",
      enableInInputs: true,
    }),

    // Formatting (10)
    fmt("bold", "mod+b", "Bold"),
    fmt("italic", "mod+i", "Italic"),
    fmt("underline", "mod+u", "Underline"),
    fmt("strikethrough", "mod+shift+x", "Strikethrough"),
    fmt("code-inline", "mod+e", "Inline code"),
    fmt("code-block", "mod+shift+enter", "Code block"),
    fmt("link", "mod+shift+u", "Insert link", { preventDefault: true }),
    fmt("quote", "mod+shift+.", "Quote"),
    fmt("bullet-list", "mod+shift+8", "Bullet list"),
    fmt("numbered-list", "mod+shift+7", "Ordered list"),

    // Media (5)
    med("upload-file", "mod+shift+u", "Upload file", { context: "chat" }),
    med("emoji-picker", "mod+shift+e", "Emoji picker"),
    med("gif-picker", "mod+shift+g", "GIF picker"),
    med("sticker-picker", "mod+shift+s", "Sticker picker"),
    med("screenshot", "mod+shift+x", "Screenshot"),

    // Calls (5)
    call("join-voice", "mod+shift+j", "Join voice channel"),
    call("toggle-mute", "mod+shift+m", "Toggle mute"),
    call("toggle-deafen", "mod+shift+d", "Toggle deafen"),
    call("toggle-screenshare", "mod+shift+z", "Share screen"),
    call("disconnect", "mod+shift+q", "Disconnect from voice"),

    // Admin (5)
    admin("toggle-sidebar", "mod+\\", "Toggle member list"),
    admin("server-settings", "mod+,", "Server settings"),
    admin("show-shortcuts", "ctrl+/", "Keyboard shortcuts"),
    admin("toggle-pins", "mod+p", "Toggle pinned messages"),
    admin("toggle-fullscreen", "mod+shift+f", "Toggle fullscreen"),
  ],
};

// ============================================================================
// Telegram-like Preset
// ============================================================================

export const telegramPreset: ShortcutPreset = {
  name: "telegram",
  label: "Telegram",
  description:
    "Shortcuts modeled after Telegram Desktop for speed-focused users.",
  shortcuts: [
    // Navigation (10)
    nav("search", "mod+f", "Search in chat"),
    nav("global-search", "mod+shift+f", "Global search"),
    nav("next-chat", "alt+arrowdown", "Next chat"),
    nav("prev-chat", "alt+arrowup", "Previous chat"),
    nav("next-unread", "mod+shift+arrowdown", "Next unread chat"),
    nav("prev-unread", "mod+shift+arrowup", "Previous unread chat"),
    nav("goto-chat", "mod+k", "Go to chat"),
    nav("close-chat", "escape", "Close current chat", {
      preventDefault: false,
    }),
    nav("scroll-down", "mod+arrowdown", "Scroll to bottom"),
    nav("lock-app", "mod+l", "Lock the app"),

    // Messaging (10)
    msg("send-message", "enter", "Send message", { enableInInputs: true }),
    msg("new-line", "shift+enter", "New line", { enableInInputs: true }),
    msg("edit-last", "arrowup", "Edit last message", { enableInInputs: true }),
    msg("reply", "mod+arrowup", "Reply to last message", {
      enableInInputs: true,
    }),
    msg("forward", "mod+shift+f", "Forward message"),
    msg("pin-message", "p", "Pin message"),
    msg("delete-message", "delete", "Delete message"),
    msg("copy-message", "mod+c", "Copy message"),
    msg("select-message", "mod+shift+click", "Select message"),
    msg("save-message", "mod+s", "Save to Saved Messages"),

    // Formatting (10)
    fmt("bold", "mod+b", "Bold"),
    fmt("italic", "mod+i", "Italic"),
    fmt("underline", "mod+u", "Underline"),
    fmt("strikethrough", "mod+shift+x", "Strikethrough"),
    fmt("code-inline", "mod+shift+m", "Monospace (code)"),
    fmt("code-block", "mod+shift+enter", "Code block"),
    fmt("link", "mod+shift+u", "Add link", { preventDefault: true }),
    fmt("spoiler", "mod+shift+p", "Spoiler text"),
    fmt("quote", "mod+shift+.", "Blockquote"),
    fmt("clear-formatting", "mod+shift+n", "Clear formatting"),

    // Media (5)
    med("send-file", "mod+o", "Send file", { context: "chat" }),
    med("emoji-picker", "mod+shift+e", "Emoji and stickers"),
    med("voice-message", "mod+shift+r", "Voice message"),
    med("video-message", "mod+shift+v", "Video message"),
    med("quick-photo", "mod+shift+p", "Quick photo"),

    // Calls (5)
    call("start-voice-call", "mod+shift+c", "Start voice call"),
    call("start-video-call", "mod+shift+v", "Start video call"),
    call("toggle-mute", "mod+shift+m", "Toggle mute"),
    call("toggle-video", "mod+shift+v", "Toggle video"),
    call("end-call", "mod+shift+q", "End call"),

    // Admin (5)
    admin("toggle-sidebar", "mod+shift+d", "Toggle info panel"),
    admin("chat-settings", "mod+,", "Chat settings"),
    admin("show-shortcuts", "mod+/", "Show shortcuts"),
    admin("toggle-notifications", "mod+shift+n", "Toggle notifications"),
    admin("archive-chat", "mod+shift+a", "Archive chat"),
  ],
};

// ============================================================================
// WhatsApp-like Preset
// ============================================================================

export const whatsappPreset: ShortcutPreset = {
  name: "whatsapp",
  label: "WhatsApp",
  description:
    "Shortcuts modeled after WhatsApp Desktop for simplicity-focused users.",
  shortcuts: [
    // Navigation (10)
    nav("search", "mod+f", "Search in chat"),
    nav("global-search", "mod+shift+f", "Search all chats"),
    nav("new-chat", "mod+n", "New chat"),
    nav("next-chat", "mod+shift+]", "Next chat"),
    nav("prev-chat", "mod+shift+[", "Previous chat"),
    nav("goto-archived", "mod+shift+a", "Go to archived chats"),
    nav("goto-starred", "mod+shift+s", "Go to starred messages"),
    nav("close-chat", "escape", "Close current chat", {
      preventDefault: false,
    }),
    nav("focus-input", "mod+/", "Focus message input"),
    nav("goto-settings", "mod+,", "Go to settings"),

    // Messaging (10)
    msg("send-message", "enter", "Send message", { enableInInputs: true }),
    msg("new-line", "shift+enter", "New line", { enableInInputs: true }),
    msg("reply", "mod+shift+r", "Reply to message"),
    msg("forward", "mod+shift+f", "Forward message"),
    msg("star-message", "mod+shift+s", "Star message"),
    msg("delete-message", "delete", "Delete message"),
    msg("copy-message", "mod+c", "Copy message"),
    msg("select-all", "mod+a", "Select all messages"),
    msg("info", "mod+shift+i", "Message info"),
    msg("mark-unread", "mod+shift+u", "Mark as unread"),

    // Formatting (10)
    fmt("bold", "mod+b", "Bold"),
    fmt("italic", "mod+i", "Italic"),
    fmt("strikethrough", "mod+shift+x", "Strikethrough"),
    fmt("code-inline", "mod+shift+c", "Monospace", { preventDefault: true }),
    fmt("bullet-list", "mod+shift+8", "Bullet list"),
    fmt("numbered-list", "mod+shift+7", "Numbered list"),
    fmt("quote", "mod+shift+.", "Quote"),
    fmt("link", "mod+shift+u", "Insert link", { preventDefault: true }),
    fmt("underline", "mod+u", "Underline"),
    fmt("code-block", "mod+shift+enter", "Code block"),

    // Media (5)
    med("send-file", "mod+shift+a", "Attach file", { context: "chat" }),
    med("emoji-picker", "mod+shift+e", "Emoji picker"),
    med("sticker-picker", "mod+shift+s", "Sticker picker"),
    med("camera", "mod+shift+c", "Open camera"),
    med("voice-message", "mod+shift+r", "Voice message"),

    // Calls (5)
    call("voice-call", "mod+shift+c", "Voice call"),
    call("video-call", "mod+shift+v", "Video call"),
    call("toggle-mute", "mod+shift+m", "Mute/unmute"),
    call("toggle-video", "mod+shift+v", "Toggle video"),
    call("end-call", "mod+shift+q", "End call"),

    // Admin (5)
    admin("toggle-sidebar", "mod+shift+d", "Toggle contact info"),
    admin("show-shortcuts", "mod+/", "Keyboard shortcuts"),
    admin("settings", "mod+,", "Settings"),
    admin("new-group", "mod+shift+n", "New group"),
    admin("toggle-dark-mode", "mod+shift+t", "Toggle dark mode"),
  ],
};

// ============================================================================
// Preset Map & Helpers
// ============================================================================

/** All available presets indexed by name */
export const PRESETS: Record<string, ShortcutPreset> = {
  nchat: nchatPreset,
  slack: slackPreset,
  discord: discordPreset,
  telegram: telegramPreset,
  whatsapp: whatsappPreset,
};

/**
 * Get all preset names.
 */
export function getPresetNames(): string[] {
  return Object.keys(PRESETS);
}

/**
 * Get a preset by name.
 */
export function getPreset(name: string): ShortcutPreset | undefined {
  return PRESETS[name];
}

/**
 * Get all presets as an array.
 */
export function getAllPresets(): ShortcutPreset[] {
  return Object.values(PRESETS);
}

/**
 * Convert a preset's shortcuts into ShortcutRegistrationOptions
 * ready for the ShortcutRegistry.
 *
 * @param preset - The preset to convert
 * @returns Array of registration options with prefixed IDs
 */
export function presetToRegistrationOptions(
  preset: ShortcutPreset,
): ShortcutRegistrationOptions[] {
  return preset.shortcuts.map((s) => ({
    id: `${preset.name}:${s.id}`,
    keys: s.keys,
    description: s.description,
    category: s.category,
    context: s.context,
    preventDefault: s.preventDefault ?? false,
    enableInInputs: s.enableInInputs ?? false,
    priority: s.priority ?? 0,
    preset: preset.name,
  }));
}

/**
 * Apply user overrides on top of a set of registration options.
 *
 * @param options - Base registration options
 * @param overrides - User overrides
 * @returns Modified registration options
 */
export function applyUserOverrides(
  options: ShortcutRegistrationOptions[],
  overrides: UserShortcutOverrides,
): ShortcutRegistrationOptions[] {
  return options
    .filter((opt) => !overrides.disabledIds.has(opt.id))
    .map((opt) => {
      const keyOverride = overrides.keyOverrides[opt.id];
      if (keyOverride) {
        return { ...opt, keys: keyOverride };
      }
      return opt;
    });
}

/**
 * Create an empty UserShortcutOverrides object.
 */
export function createEmptyOverrides(): UserShortcutOverrides {
  return {
    keyOverrides: {},
    disabledIds: new Set(),
  };
}

/**
 * Get the count of shortcuts per category in a preset.
 */
export function getPresetCategoryCounts(
  preset: ShortcutPreset,
): Record<ShortcutCategory, number> {
  const counts: Record<ShortcutCategory, number> = {
    navigation: 0,
    messaging: 0,
    formatting: 0,
    media: 0,
    calls: 0,
    admin: 0,
    custom: 0,
  };
  for (const s of preset.shortcuts) {
    counts[s.category]++;
  }
  return counts;
}
