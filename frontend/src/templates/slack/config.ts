// ═══════════════════════════════════════════════════════════════════════════════
// Slack Template Configuration - Complete Feature Parity
// ═══════════════════════════════════════════════════════════════════════════════
//
// A pixel-perfect Slack clone template featuring the classic aubergine sidebar,
// green accents, and all the familiar Slack interactions and features.
//
// ═══════════════════════════════════════════════════════════════════════════════

import type { PlatformTemplate } from "../types";

// ─────────────────────────────────────────────────────────────────────────────
// Slack Brand Colors
// ─────────────────────────────────────────────────────────────────────────────

export const slackColors = {
  // Primary brand colors
  aubergine: "#4A154B",
  aubergineDark: "#350D36",
  aubergineLight: "#611F69",

  // Accent colors
  green: "#007A5A",
  greenHover: "#006646",
  greenLight: "#2BAC76",

  // Status colors
  blue: "#1264A3",
  blueLight: "#36C5F0",
  yellow: "#ECB22E",
  red: "#E01E5A",

  // Neutral colors
  black: "#1D1C1D",
  darkGray: "#616061",
  mediumGray: "#868686",
  lightGray: "#ABABAD",
  paleGray: "#DDDDDD",
  offWhite: "#F8F8F8",
  white: "#FFFFFF",

  // Sidebar colors (default aubergine theme)
  sidebarBg: "#4A154B",
  sidebarText: "#FFFFFF",
  sidebarTextMuted: "rgba(255, 255, 255, 0.7)",
  sidebarHover: "rgba(255, 255, 255, 0.1)",
  sidebarActive: "#1264A3",
  sidebarPresence: "#2BAC76",
  sidebarUnread: "#FFFFFF",

  // Message colors
  messageBg: "#FFFFFF",
  messageHover: "#F8F8F8",
  mentionBg: "#FEF9E9",
  mentionBorder: "#FAEBAF",
  threadBg: "#F8F8F8",

  // Dark mode colors
  dark: {
    bg: "#1A1D21",
    surface: "#222529",
    card: "#2C2E33",
    border: "#3B3D42",
    text: "#D1D2D3",
    textMuted: "#9B9C9E",
  },
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// Slack Typography
// ─────────────────────────────────────────────────────────────────────────────

export const slackTypography = {
  fontFamily: {
    sans: 'Slack-Lato, Lato, "Helvetica Neue", Helvetica, Arial, sans-serif',
    mono: '"SF Mono", Monaco, Menlo, Consolas, "Liberation Mono", monospace',
  },
  fontSize: {
    xs: "11px",
    sm: "13px",
    base: "15px",
    lg: "18px",
    xl: "22px",
    "2xl": "28px",
  },
  fontWeight: {
    normal: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
    black: 900,
  },
  lineHeight: {
    tight: 1.2,
    normal: 1.46668,
    relaxed: 1.6,
  },
  letterSpacing: {
    tight: "-0.01em",
    normal: "0",
    wide: "0.02em",
  },
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// Slack Spacing System
// ─────────────────────────────────────────────────────────────────────────────

export const slackSpacing = {
  // Base spacing unit: 4px
  0: "0",
  px: "1px",
  0.5: "2px",
  1: "4px",
  1.5: "6px",
  2: "8px",
  2.5: "10px",
  3: "12px",
  4: "16px",
  5: "20px",
  6: "24px",
  7: "28px",
  8: "32px",
  9: "36px",
  10: "40px",
  12: "48px",
  14: "56px",
  16: "64px",
  20: "80px",
  24: "96px",
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// Slack Component Styles
// ─────────────────────────────────────────────────────────────────────────────

export const slackComponentStyles = {
  // Sidebar
  sidebar: {
    width: 260,
    collapsedWidth: 72,
    headerHeight: 49,
    itemHeight: 28,
    sectionGap: 16,
    itemPadding: "4px 16px",
    iconSize: 18,
    borderRadius: 4,
  },

  // Messages
  message: {
    padding: "8px 20px",
    avatarSize: 36,
    avatarRadius: 4,
    groupGap: 4,
    contentGap: 8,
    maxWidth: "none",
    hoverBg: "#F8F8F8",
    highlightBg: "#FEF9E9",
    pinnedBorderColor: "#ECB22E",
  },

  // Thread panel
  thread: {
    width: 380,
    headerHeight: 60,
    inputMinHeight: 44,
  },

  // Channel header
  header: {
    height: 49,
    padding: "0 16px",
    borderWidth: 1,
  },

  // Compose box
  compose: {
    minHeight: 44,
    maxHeight: 300,
    padding: "9px 12px",
    borderRadius: 4,
    borderWidth: 1,
    iconSize: 20,
    buttonSize: 28,
  },

  // Buttons
  button: {
    height: {
      sm: 24,
      md: 32,
      lg: 36,
    },
    padding: {
      sm: "0 8px",
      md: "0 12px",
      lg: "0 16px",
    },
    borderRadius: 4,
    fontSize: {
      sm: 12,
      md: 13,
      lg: 15,
    },
  },

  // Inputs
  input: {
    height: 36,
    padding: "8px 12px",
    borderRadius: 4,
    borderWidth: 1,
  },

  // Modals
  modal: {
    borderRadius: 8,
    padding: 24,
    maxWidth: 520,
    overlayBg: "rgba(0, 0, 0, 0.5)",
  },

  // Tooltips
  tooltip: {
    padding: "4px 8px",
    borderRadius: 4,
    fontSize: 12,
    maxWidth: 250,
  },

  // Popovers
  popover: {
    borderRadius: 6,
    padding: 8,
    shadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
  },

  // Avatars
  avatar: {
    sizes: {
      xs: 16,
      sm: 20,
      md: 24,
      lg: 36,
      xl: 48,
      "2xl": 72,
    },
    borderRadius: 4,
    presenceDotSize: 10,
    presenceDotBorder: 2,
  },

  // Reactions
  reaction: {
    height: 24,
    padding: "0 6px",
    gap: 4,
    borderRadius: 12,
    fontSize: 11,
  },

  // Badges
  badge: {
    height: 18,
    minWidth: 18,
    padding: "0 5px",
    borderRadius: 9,
    fontSize: 11,
  },
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// Slack Animations
// ─────────────────────────────────────────────────────────────────────────────

export const slackAnimations = {
  // Durations
  duration: {
    instant: 0,
    fast: 100,
    normal: 200,
    slow: 300,
    slower: 400,
  },

  // Easings
  easing: {
    default: "cubic-bezier(0.4, 0, 0.2, 1)",
    in: "cubic-bezier(0.4, 0, 1, 1)",
    out: "cubic-bezier(0, 0, 0.2, 1)",
    inOut: "cubic-bezier(0.4, 0, 0.2, 1)",
    bounce: "cubic-bezier(0.68, -0.55, 0.265, 1.55)",
  },

  // Transitions
  transitions: {
    color: "color 100ms ease",
    background: "background-color 100ms ease",
    border: "border-color 100ms ease",
    opacity: "opacity 200ms ease",
    transform: "transform 200ms ease",
    all: "all 200ms ease",
  },

  // Keyframes
  keyframes: {
    fadeIn: {
      from: { opacity: 0 },
      to: { opacity: 1 },
    },
    slideDown: {
      from: { transform: "translateY(-10px)", opacity: 0 },
      to: { transform: "translateY(0)", opacity: 1 },
    },
    slideUp: {
      from: { transform: "translateY(10px)", opacity: 0 },
      to: { transform: "translateY(0)", opacity: 1 },
    },
    pulse: {
      "0%, 100%": { opacity: 1 },
      "50%": { opacity: 0.5 },
    },
    shake: {
      "0%, 100%": { transform: "translateX(0)" },
      "10%, 30%, 50%, 70%, 90%": { transform: "translateX(-2px)" },
      "20%, 40%, 60%, 80%": { transform: "translateX(2px)" },
    },
  },
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// Slack Icon Set
// ─────────────────────────────────────────────────────────────────────────────

export const slackIcons = {
  // Navigation
  home: "home",
  dm: "message-square",
  activity: "bell",
  later: "bookmark",
  more: "more-horizontal",

  // Channels
  channelPublic: "hash",
  channelPrivate: "lock",
  channelShared: "globe",
  channelArchived: "archive",

  // Messages
  thread: "message-circle",
  reaction: "smile",
  pin: "pin",
  bookmark: "bookmark",
  share: "share",
  link: "link",
  edit: "edit-2",
  delete: "trash-2",
  copy: "copy",

  // Files
  attachment: "paperclip",
  file: "file",
  image: "image",
  video: "video",
  audio: "music",
  pdf: "file-text",

  // Actions
  send: "send",
  search: "search",
  filter: "filter",
  sort: "arrow-up-down",
  add: "plus",
  close: "x",
  check: "check",
  chevronDown: "chevron-down",
  chevronRight: "chevron-right",

  // Status
  online: "circle",
  away: "clock",
  dnd: "minus-circle",
  offline: "circle-outline",

  // Features
  huddle: "headphones",
  clip: "video",
  canvas: "layout",
  workflow: "git-branch",
  app: "grid",
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// Main Template Export
// ─────────────────────────────────────────────────────────────────────────────

export const slackTemplate: PlatformTemplate = {
  // ───────────────────────────────────────────────────────────────────────────
  // Identity
  // ───────────────────────────────────────────────────────────────────────────

  id: "slack",
  name: "Slack",
  description:
    "Complete Slack clone with pixel-perfect UI, aubergine sidebar, and all core features",
  version: "2.0.0",
  author: "nself",

  // ───────────────────────────────────────────────────────────────────────────
  // Theme Configuration
  // ───────────────────────────────────────────────────────────────────────────

  theme: {
    defaultMode: "light",

    light: {
      // Primary colors (Slack's aubergine)
      primaryColor: slackColors.aubergine,
      secondaryColor: slackColors.aubergineLight,
      accentColor: slackColors.green,

      // Background colors
      backgroundColor: slackColors.white,
      surfaceColor: slackColors.offWhite,
      cardColor: slackColors.white,
      popoverColor: slackColors.white,

      // Text colors
      textColor: slackColors.black,
      textMutedColor: slackColors.darkGray,
      textInverseColor: slackColors.white,

      // Border colors
      borderColor: slackColors.paleGray,
      borderMutedColor: "#EEEEEE",

      // Button colors
      buttonPrimaryBg: slackColors.green,
      buttonPrimaryText: slackColors.white,
      buttonSecondaryBg: slackColors.white,
      buttonSecondaryText: slackColors.black,
      buttonGhostHover: "#F0F0F0",

      // Status colors
      successColor: slackColors.green,
      warningColor: slackColors.yellow,
      errorColor: slackColors.red,
      infoColor: slackColors.blueLight,

      // Special colors
      linkColor: slackColors.blue,
      focusRingColor: slackColors.blue,
      selectionBg: "#D5E5F2",
      highlightBg: slackColors.mentionBg,

      // Platform-specific
      messageBubbleOwn: undefined,
      messageBubbleOther: undefined,
    },

    dark: {
      // Primary colors
      primaryColor: slackColors.aubergineLight,
      secondaryColor: slackColors.aubergine,
      accentColor: slackColors.greenLight,

      // Background colors
      backgroundColor: slackColors.dark.bg,
      surfaceColor: slackColors.dark.surface,
      cardColor: slackColors.dark.card,
      popoverColor: slackColors.dark.card,

      // Text colors
      textColor: slackColors.dark.text,
      textMutedColor: slackColors.dark.textMuted,
      textInverseColor: slackColors.black,

      // Border colors
      borderColor: slackColors.dark.border,
      borderMutedColor: "#2C2E33",

      // Button colors
      buttonPrimaryBg: slackColors.greenLight,
      buttonPrimaryText: slackColors.white,
      buttonSecondaryBg: slackColors.dark.border,
      buttonSecondaryText: slackColors.dark.text,
      buttonGhostHover: slackColors.dark.border,

      // Status colors
      successColor: slackColors.greenLight,
      warningColor: slackColors.yellow,
      errorColor: slackColors.red,
      infoColor: slackColors.blueLight,

      // Special colors
      linkColor: slackColors.blueLight,
      focusRingColor: slackColors.blueLight,
      selectionBg: slackColors.blue,
      highlightBg: "#5C4C0B",

      // Platform-specific
      messageBubbleOwn: undefined,
      messageBubbleOther: undefined,
    },
  },

  // ───────────────────────────────────────────────────────────────────────────
  // Layout Configuration
  // ───────────────────────────────────────────────────────────────────────────

  layout: {
    // Sidebar
    sidebarPosition: "left",
    sidebarWidth: slackComponentStyles.sidebar.width,
    sidebarCollapsible: true,
    sidebarCollapsedWidth: slackComponentStyles.sidebar.collapsedWidth,

    // Header
    headerHeight: slackComponentStyles.header.height,
    showHeaderBorder: true,

    // Messages (Slack uses comfortable density with message grouping)
    messageDensity: "comfortable",
    messageGrouping: true,
    messageGroupingTimeout: 5, // 5 minutes

    // Avatars (Slack uses rounded squares, not circles)
    avatarStyle: "rounded",
    avatarSize: "lg",
    showAvatarInGroup: "first",

    // Channels
    showChannelIcons: true,
    showChannelDescription: false,
    showMemberCount: false,
    channelListDensity: "compact",

    // Users
    showUserStatus: true,
    showPresenceDots: true,
    presenceDotPosition: "bottom-right",
  },

  // ───────────────────────────────────────────────────────────────────────────
  // Feature Configuration
  // ───────────────────────────────────────────────────────────────────────────

  features: {
    // Threads (Slack's signature feature)
    threads: true,
    threadStyle: "panel",
    threadPanelWidth: slackComponentStyles.thread.width,

    // Reactions (inline style like Slack)
    reactions: true,
    reactionStyle: "inline",
    quickReactions: [
      "\u{1F44D}", // thumbs up
      "\u{2705}", // check mark
      "\u{1F440}", // eyes
      "\u{1F389}", // party popper
      "\u{2764}\u{FE0F}", // red heart
      "\u{1F602}", // tears of joy
    ],
    maxReactionsDisplay: 3,

    // Rich content
    fileUploads: true,
    voiceMessages: false, // Slack doesn't have native voice messages (uses Huddles instead)
    codeBlocks: true,
    markdown: true,
    linkPreviews: true,
    emojiPicker: "custom",
    gifPicker: true,

    // Message actions (Slack's action toolbar)
    messageActions: [
      "react",
      "thread",
      "share",
      "bookmark",
      "pin",
      "edit",
      "delete",
    ],
    showActionsOnHover: true,

    // Real-time features
    typing: true,
    typingIndicatorStyle: "text", // "X is typing..."
    presence: true,
    readReceipts: false, // Slack doesn't show read receipts by default
    readReceiptStyle: "text",
  },

  // ───────────────────────────────────────────────────────────────────────────
  // Terminology Configuration (Slack-specific terms)
  // ───────────────────────────────────────────────────────────────────────────

  terminology: {
    // Core concepts
    workspace: "Workspace",
    workspacePlural: "Workspaces",
    channel: "Channel",
    channelPlural: "Channels",
    directMessage: "Direct message",
    directMessagePlural: "Direct messages",
    directMessageShort: "DM",
    thread: "Thread",
    threadPlural: "Threads",
    member: "Member",
    memberPlural: "Members",
    message: "Message",
    messagePlural: "Messages",
    reaction: "Reaction",
    reactionPlural: "Reactions",

    // Actions
    sendMessage: "Send",
    editMessage: "Edit message",
    deleteMessage: "Delete message",
    replyToThread: "Reply in thread",
    createChannel: "Create a channel",
    joinChannel: "Join channel",
    leaveChannel: "Leave channel",

    // Placeholders
    messageInputPlaceholder: "Message #{{channel}}",
    searchPlaceholder: "Search {{workspace}}",
    newChannelPlaceholder: "e.g. plan-budget",
  },

  // ───────────────────────────────────────────────────────────────────────────
  // Animation Configuration
  // ───────────────────────────────────────────────────────────────────────────

  animations: {
    enableAnimations: true,
    reducedMotion: false,
    transitionDuration: "fast", // Slack is snappy
    messageAppear: "none", // Slack messages appear instantly
    sidebarTransition: "slide",
    modalTransition: "fade",
  },

  // ───────────────────────────────────────────────────────────────────────────
  // Custom CSS
  // ───────────────────────────────────────────────────────────────────────────

  customCSS: `
/* Slack Template Custom Styles */

/* Font smoothing for Slack-like text rendering */
.slack-template {
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  font-family: ${slackTypography.fontFamily.sans};
}

/* Slack sidebar aubergine theme */
.slack-sidebar {
  background-color: ${slackColors.sidebarBg};
  color: ${slackColors.sidebarText};
}

.slack-sidebar-item {
  border-radius: ${slackComponentStyles.sidebar.borderRadius}px;
  padding: ${slackComponentStyles.sidebar.itemPadding};
  transition: background-color 100ms ease;
}

.slack-sidebar-item:hover {
  background-color: ${slackColors.sidebarHover};
}

.slack-sidebar-item.active {
  background-color: ${slackColors.sidebarActive};
}

/* Slack message styling */
.slack-message {
  padding: ${slackComponentStyles.message.padding};
  transition: background-color 100ms ease;
}

.slack-message:hover {
  background-color: ${slackComponentStyles.message.hoverBg};
}

.slack-message.mentioned {
  background-color: ${slackComponentStyles.message.highlightBg};
  border-left: 4px solid ${slackColors.mentionBorder};
}

/* Slack avatar (rounded square) */
.slack-avatar {
  border-radius: ${slackComponentStyles.avatar.borderRadius}px;
}

/* Slack presence indicator */
.slack-presence {
  width: ${slackComponentStyles.avatar.presenceDotSize}px;
  height: ${slackComponentStyles.avatar.presenceDotSize}px;
  border: ${slackComponentStyles.avatar.presenceDotBorder}px solid white;
  border-radius: 50%;
}

.slack-presence.online {
  background-color: ${slackColors.sidebarPresence};
}

.slack-presence.away {
  background-color: transparent;
  border-color: ${slackColors.sidebarPresence};
}

/* Slack reaction pills */
.slack-reaction {
  height: ${slackComponentStyles.reaction.height}px;
  padding: ${slackComponentStyles.reaction.padding};
  border-radius: ${slackComponentStyles.reaction.borderRadius}px;
  font-size: ${slackComponentStyles.reaction.fontSize}px;
  border: 1px solid ${slackColors.paleGray};
  background-color: ${slackColors.white};
  transition: all 100ms ease;
}

.slack-reaction:hover {
  border-color: ${slackColors.blue};
  background-color: ${slackColors.offWhite};
}

.slack-reaction.active {
  background-color: #E8F5FA;
  border-color: ${slackColors.blue};
}

/* Slack button styles */
.slack-btn-primary {
  background-color: ${slackColors.green};
  color: ${slackColors.white};
  border-radius: ${slackComponentStyles.button.borderRadius}px;
  font-weight: ${slackTypography.fontWeight.bold};
  transition: background-color 100ms ease;
}

.slack-btn-primary:hover {
  background-color: ${slackColors.greenHover};
}

/* Slack compose box */
.slack-compose {
  border: 1px solid ${slackColors.paleGray};
  border-radius: ${slackComponentStyles.compose.borderRadius}px;
  background-color: ${slackColors.white};
}

.slack-compose:focus-within {
  border-color: ${slackColors.darkGray};
  box-shadow: 0 0 0 1px ${slackColors.darkGray};
}

/* Slack channel header */
.slack-channel-header {
  height: ${slackComponentStyles.header.height}px;
  border-bottom: 1px solid ${slackColors.paleGray};
  padding: ${slackComponentStyles.header.padding};
}

/* Slack thread panel */
.slack-thread-panel {
  width: ${slackComponentStyles.thread.width}px;
  border-left: 1px solid ${slackColors.paleGray};
  background-color: ${slackColors.white};
}

/* Slack unread badge */
.slack-badge {
  min-width: ${slackComponentStyles.badge.minWidth}px;
  height: ${slackComponentStyles.badge.height}px;
  padding: ${slackComponentStyles.badge.padding};
  border-radius: ${slackComponentStyles.badge.borderRadius}px;
  font-size: ${slackComponentStyles.badge.fontSize}px;
  font-weight: ${slackTypography.fontWeight.bold};
  background-color: ${slackColors.red};
  color: ${slackColors.white};
}

/* Slack typing indicator */
.slack-typing {
  font-size: ${slackTypography.fontSize.sm};
  color: ${slackColors.darkGray};
  font-style: italic;
}

/* Slack link styling */
.slack-link {
  color: ${slackColors.blue};
  text-decoration: none;
}

.slack-link:hover {
  text-decoration: underline;
}

/* Slack mention styling */
.slack-mention {
  background-color: #E8F5FA;
  color: ${slackColors.blue};
  border-radius: 3px;
  padding: 0 2px;
  font-weight: ${slackTypography.fontWeight.medium};
}

/* Slack code styling */
.slack-code {
  font-family: ${slackTypography.fontFamily.mono};
  background-color: #F8F8F8;
  border: 1px solid ${slackColors.paleGray};
  border-radius: 3px;
  padding: 2px 4px;
  font-size: 12px;
  color: ${slackColors.red};
}

.slack-code-block {
  font-family: ${slackTypography.fontFamily.mono};
  background-color: #F8F8F8;
  border: 1px solid ${slackColors.paleGray};
  border-radius: 4px;
  padding: 8px 12px;
  font-size: 12px;
  overflow-x: auto;
}

/* Slack blockquote */
.slack-blockquote {
  border-left: 4px solid ${slackColors.paleGray};
  padding-left: 12px;
  margin-left: 0;
  color: ${slackColors.darkGray};
}

/* Dark mode overrides */
.dark .slack-sidebar {
  background-color: ${slackColors.dark.surface};
}

.dark .slack-message:hover {
  background-color: ${slackColors.dark.card};
}

.dark .slack-compose {
  background-color: ${slackColors.dark.card};
  border-color: ${slackColors.dark.border};
}

.dark .slack-thread-panel {
  background-color: ${slackColors.dark.surface};
  border-color: ${slackColors.dark.border};
}

.dark .slack-code,
.dark .slack-code-block {
  background-color: ${slackColors.dark.card};
  border-color: ${slackColors.dark.border};
}
`,
};

export default slackTemplate;
