// ═══════════════════════════════════════════════════════════════════════════════
// Discord Template Configuration
// ═══════════════════════════════════════════════════════════════════════════════
//
// A complete Discord clone template featuring:
// - Blurple (#5865F2) accent color
// - Dark theme with layered backgrounds
// - Server list sidebar
// - Channel categories
// - Role-based colored usernames
// - Whitney-style typography
// - Discord-specific animations
//
// ═══════════════════════════════════════════════════════════════════════════════

import type { PlatformTemplate } from "../types";

// ─────────────────────────────────────────────────────────────────────────────
// Discord Color Palette
// ─────────────────────────────────────────────────────────────────────────────

export const discordColors = {
  // Brand colors
  blurple: "#5865F2",
  blurpleLight: "#7289DA", // Legacy blurple
  green: "#57F287",
  yellow: "#FEE75C",
  fuchsia: "#EB459E",
  red: "#ED4245",
  white: "#FFFFFF",
  black: "#000000",

  // Grays (Dark theme backgrounds - layered from darkest to lightest)
  gray950: "#0C0D0E", // Darkest (popover backgrounds)
  gray900: "#111214", // Server list background
  gray850: "#1E1F22", // Server list, borders
  gray800: "#232428", // Channel list background
  gray750: "#2B2D31", // Channel list, member list
  gray700: "#313338", // Main content background
  gray650: "#383A40", // Input background
  gray600: "#3F4147", // Hover states
  gray550: "#4E5058", // Secondary buttons
  gray500: "#6D6F78", // Muted text
  gray400: "#80848E", // Timestamps
  gray300: "#949BA4", // Secondary text
  gray200: "#B5BAC1", // Primary text (muted)
  gray100: "#DBDEE1", // Primary text
  gray50: "#F2F3F5", // Light mode background

  // Status colors
  statusOnline: "#23A559",
  statusIdle: "#F0B232",
  statusDnd: "#F23F43",
  statusOffline: "#80848E",
  statusStreaming: "#593695",

  // Role colors (common Discord role colors)
  roleRed: "#E74C3C",
  roleOrange: "#E67E22",
  roleYellow: "#F1C40F",
  roleGreen: "#2ECC71",
  roleTeal: "#1ABC9C",
  roleBlue: "#3498DB",
  rolePurple: "#9B59B6",
  rolePink: "#E91E63",
  roleGray: "#95A5A6",
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// Discord Typography
// ─────────────────────────────────────────────────────────────────────────────

export const discordTypography = {
  // Discord uses gg sans as primary font (we use similar alternatives)
  fontFamily:
    '"gg sans", "Noto Sans", "Helvetica Neue", Helvetica, Arial, sans-serif',
  fontFamilyCode:
    'Consolas, "Andale Mono WT", "Andale Mono", "Lucida Console", "Lucida Sans Typewriter", "DejaVu Sans Mono", "Bitstream Vera Sans Mono", "Liberation Mono", "Nimbus Mono L", Monaco, "Courier New", Courier, monospace',
  fontFamilyHeadline:
    '"gg sans", "Noto Sans", "Helvetica Neue", Helvetica, Arial, sans-serif',

  // Font sizes
  fontSize: {
    xs: "12px",
    sm: "14px",
    base: "16px",
    lg: "18px",
    xl: "20px",
    "2xl": "24px",
    "3xl": "28px",
  },

  // Font weights
  fontWeight: {
    normal: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
  },

  // Line heights
  lineHeight: {
    tight: 1.16,
    normal: 1.375,
    relaxed: 1.5,
  },
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// Discord Layout Dimensions
// ─────────────────────────────────────────────────────────────────────────────

export const discordLayout = {
  // Server list (guilds bar)
  serverListWidth: 72,
  serverIconSize: 48,
  serverIconSizeActive: 48,
  serverIconRadius: 16, // Rounded square, 24 when hovered
  serverIconRadiusActive: 16,
  serverGap: 8,

  // Channel list
  channelListWidth: 240,
  channelItemHeight: 34,
  channelCategoryHeight: 24,
  categoryGap: 8,

  // Member list
  memberListWidth: 240,
  memberItemHeight: 44,
  memberAvatarSize: 32,

  // Header
  headerHeight: 48,

  // Message area
  messageMaxWidth: "none", // Discord has no max width
  messagePadding: 16,
  messageGap: 2,
  avatarSize: 40,
  avatarGap: 16,

  // User panel (bottom left)
  userPanelHeight: 52,

  // Thread panel
  threadPanelWidth: 400,
  threadPanelMinWidth: 300,

  // Input
  inputMinHeight: 44,
  inputMaxHeight: 500,
  inputRadius: 8,
} as const;

// ─────────────────────────────────────────════════════════════════════════────
// Discord Animation Timings
// ─────────────────────────────────────────────────────────────────────────────

export const discordAnimations = {
  // Transitions
  transitionFast: "100ms",
  transitionNormal: "150ms",
  transitionSlow: "200ms",
  transitionExpand: "300ms",

  // Easing
  easeOut: "cubic-bezier(0.4, 0, 0.2, 1)",
  easeInOut: "cubic-bezier(0.4, 0, 0.6, 1)",
  spring: "cubic-bezier(0.175, 0.885, 0.32, 1.275)",

  // Server icon hover
  serverIconTransition: "150ms ease-out",
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// Discord Template Export
// ─────────────────────────────────────────────────────────────────────────────

export const discordTemplate: PlatformTemplate = {
  // ─────────────────────────────────────────────────────────────────────────────
  // Identity
  // ─────────────────────────────────────────────────────────────────────────────

  id: "discord",
  name: "Discord",
  description:
    "Complete Discord clone with servers, categories, roles, and dark theme",
  version: "2.0.0",
  author: "nself",

  // ─────────────────────────────────────────────────────────────────────────────
  // Theme Configuration (Discord Blurple Dark)
  // ─────────────────────────────────────────────────────────────────────────────

  theme: {
    defaultMode: "dark",

    light: {
      // Primary colors (Discord Blurple)
      primaryColor: discordColors.blurple,
      secondaryColor: discordColors.fuchsia,
      accentColor: discordColors.green,

      // Background colors (Light mode - rarely used)
      backgroundColor: "#FFFFFF",
      surfaceColor: discordColors.gray50,
      cardColor: "#FFFFFF",
      popoverColor: "#FFFFFF",

      // Text colors
      textColor: "#060607",
      textMutedColor: discordColors.gray550,
      textInverseColor: "#FFFFFF",

      // Border colors
      borderColor: "#E3E5E8",
      borderMutedColor: discordColors.gray50,

      // Button colors
      buttonPrimaryBg: discordColors.blurple,
      buttonPrimaryText: "#FFFFFF",
      buttonSecondaryBg: discordColors.gray550,
      buttonSecondaryText: "#FFFFFF",
      buttonGhostHover: "#E3E5E8",

      // Status colors
      successColor: discordColors.green,
      warningColor: discordColors.yellow,
      errorColor: discordColors.red,
      infoColor: discordColors.blurple,

      // Special colors
      linkColor: "#00AFF4",
      focusRingColor: discordColors.blurple,
      selectionBg: `${discordColors.blurple}33`,
      highlightBg: `${discordColors.yellow}33`,
    },

    dark: {
      // Primary colors (Discord Blurple)
      primaryColor: discordColors.blurple,
      secondaryColor: discordColors.fuchsia,
      accentColor: discordColors.green,

      // Background colors (Discord's layered dark theme)
      backgroundColor: discordColors.gray700, // Main content: #313338
      surfaceColor: discordColors.gray750, // Channel/member list: #2B2D31
      cardColor: discordColors.gray850, // Server list: #1E1F22
      popoverColor: discordColors.gray900, // Popover: #111214

      // Text colors
      textColor: discordColors.gray100, // #DBDEE1
      textMutedColor: discordColors.gray200, // #B5BAC1
      textInverseColor: "#060607",

      // Border colors
      borderColor: discordColors.gray850, // #1E1F22
      borderMutedColor: discordColors.gray750, // #2B2D31

      // Button colors
      buttonPrimaryBg: discordColors.blurple,
      buttonPrimaryText: "#FFFFFF",
      buttonSecondaryBg: discordColors.gray550,
      buttonSecondaryText: "#FFFFFF",
      buttonGhostHover: discordColors.gray600,

      // Status colors
      successColor: discordColors.green,
      warningColor: discordColors.yellow,
      errorColor: discordColors.red,
      infoColor: discordColors.blurple,

      // Special colors
      linkColor: "#00AFF4",
      focusRingColor: discordColors.blurple,
      selectionBg: `${discordColors.blurple}33`,
      highlightBg: `${discordColors.yellow}22`,
    },
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // Layout Configuration
  // ─────────────────────────────────────────────────────────────────────────────

  layout: {
    // Sidebar (Discord uses dual sidebar: server list + channel list)
    sidebarPosition: "left",
    sidebarWidth: discordLayout.channelListWidth,
    sidebarCollapsible: false, // Discord sidebar doesn't collapse
    sidebarCollapsedWidth: discordLayout.serverListWidth,

    // Header
    headerHeight: discordLayout.headerHeight,
    showHeaderBorder: true,

    // Messages (Discord uses compact-ish density)
    messageDensity: "compact",
    messageGrouping: true,
    messageGroupingTimeout: 7, // Discord groups messages within 7 minutes

    // Avatars (Discord uses circles)
    avatarStyle: "circle",
    avatarSize: "md", // 40px
    showAvatarInGroup: "first",

    // Channels (Discord shows category hierarchy)
    showChannelIcons: true,
    showChannelDescription: false,
    showMemberCount: false,
    channelListDensity: "compact",

    // Users
    showUserStatus: true,
    showPresenceDots: true,
    presenceDotPosition: "bottom-right",
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // Feature Configuration
  // ─────────────────────────────────────────────────────────────────────────────

  features: {
    // Threads
    threads: true,
    threadStyle: "inline", // Discord shows threads inline
    threadPanelWidth: discordLayout.threadPanelWidth,

    // Reactions (inline style like Discord)
    reactions: true,
    reactionStyle: "inline",
    quickReactions: ["👍", "😂", "😮", "❤️", "😢", "🔥", "👀", "✅"],
    maxReactionsDisplay: 7,

    // Rich content
    fileUploads: true,
    voiceMessages: false, // Discord recently added this
    codeBlocks: true,
    markdown: true,
    linkPreviews: true,
    emojiPicker: "custom",
    gifPicker: true,

    // Message actions
    messageActions: [
      "react",
      "reply",
      "thread",
      "pin",
      "edit",
      "delete",
      "copy",
      "report",
    ],
    showActionsOnHover: true,

    // Real-time
    typing: true,
    typingIndicatorStyle: "text", // "User is typing..."
    presence: true,
    readReceipts: false, // Discord doesn't show read receipts
    readReceiptStyle: "text",
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // Terminology Configuration (Discord-specific terms)
  // ─────────────────────────────────────────────────────────────────────────────

  terminology: {
    // Core concepts (Discord terminology)
    workspace: "Server",
    workspacePlural: "Servers",
    channel: "Text Channel",
    channelPlural: "Text Channels",
    directMessage: "Direct Message",
    directMessagePlural: "Direct Messages",
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
    sendMessage: "Send Message",
    editMessage: "Edit Message",
    deleteMessage: "Delete Message",
    replyToThread: "Create Thread",
    createChannel: "Create Channel",
    joinChannel: "Join",
    leaveChannel: "Leave Server",

    // Placeholders
    messageInputPlaceholder: "Message #{{channel}}",
    searchPlaceholder: "Search",
    newChannelPlaceholder: "new-channel",
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // Animation Configuration
  // ─────────────────────────────────────────────────────────────────────────────

  animations: {
    enableAnimations: true,
    reducedMotion: false,
    transitionDuration: "normal",
    messageAppear: "fade",
    sidebarTransition: "slide",
    modalTransition: "scale",
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // Custom CSS
  // ─────────────────────────────────────────────────────────────────────────────

  customCSS: `
/* ═══════════════════════════════════════════════════════════════════════════════
 * Discord Template Custom CSS
 * ═══════════════════════════════════════════════════════════════════════════════ */

/* Discord Layout Variables */
:root {
  --discord-server-list-width: ${discordLayout.serverListWidth}px;
  --discord-channel-list-width: ${discordLayout.channelListWidth}px;
  --discord-member-list-width: ${discordLayout.memberListWidth}px;
  --discord-header-height: ${discordLayout.headerHeight}px;
  --discord-user-panel-height: ${discordLayout.userPanelHeight}px;
  --discord-server-icon-size: ${discordLayout.serverIconSize}px;
  --discord-avatar-size: ${discordLayout.avatarSize}px;
  --discord-thread-panel-width: ${discordLayout.threadPanelWidth}px;

  /* Discord Colors */
  --discord-blurple: ${discordColors.blurple};
  --discord-green: ${discordColors.green};
  --discord-yellow: ${discordColors.yellow};
  --discord-fuchsia: ${discordColors.fuchsia};
  --discord-red: ${discordColors.red};

  /* Status Colors */
  --discord-status-online: ${discordColors.statusOnline};
  --discord-status-idle: ${discordColors.statusIdle};
  --discord-status-dnd: ${discordColors.statusDnd};
  --discord-status-offline: ${discordColors.statusOffline};
  --discord-status-streaming: ${discordColors.statusStreaming};

  /* Gray Scale */
  --discord-gray-950: ${discordColors.gray950};
  --discord-gray-900: ${discordColors.gray900};
  --discord-gray-850: ${discordColors.gray850};
  --discord-gray-800: ${discordColors.gray800};
  --discord-gray-750: ${discordColors.gray750};
  --discord-gray-700: ${discordColors.gray700};
  --discord-gray-650: ${discordColors.gray650};
  --discord-gray-600: ${discordColors.gray600};
  --discord-gray-550: ${discordColors.gray550};
  --discord-gray-500: ${discordColors.gray500};
  --discord-gray-400: ${discordColors.gray400};
  --discord-gray-300: ${discordColors.gray300};
  --discord-gray-200: ${discordColors.gray200};
  --discord-gray-100: ${discordColors.gray100};

  /* Typography */
  --discord-font-primary: ${discordTypography.fontFamily};
  --discord-font-code: ${discordTypography.fontFamilyCode};
  --discord-font-headline: ${discordTypography.fontFamilyHeadline};
}

/* Discord Font Family */
.discord-template {
  font-family: var(--discord-font-primary);
}

/* Server Icon Hover Animation */
.discord-server-icon {
  width: var(--discord-server-icon-size);
  height: var(--discord-server-icon-size);
  border-radius: 24px;
  transition: border-radius ${discordAnimations.serverIconTransition},
              background-color ${discordAnimations.serverIconTransition};
}

.discord-server-icon:hover,
.discord-server-icon.active {
  border-radius: 16px;
}

/* Server List Indicator */
.discord-server-indicator {
  position: absolute;
  left: 0;
  width: 4px;
  border-radius: 0 4px 4px 0;
  background-color: white;
  transition: height ${discordAnimations.transitionNormal} ${discordAnimations.easeOut};
}

.discord-server-indicator.hover {
  height: 20px;
}

.discord-server-indicator.active {
  height: 40px;
}

/* Channel Category Collapse */
.discord-category {
  cursor: pointer;
  user-select: none;
}

.discord-category-icon {
  transition: transform ${discordAnimations.transitionFast};
}

.discord-category.collapsed .discord-category-icon {
  transform: rotate(-90deg);
}

/* Message Hover Actions */
.discord-message-actions {
  opacity: 0;
  transition: opacity ${discordAnimations.transitionFast};
}

.discord-message:hover .discord-message-actions {
  opacity: 1;
}

/* Role Colors */
.discord-role-red { color: ${discordColors.roleRed}; }
.discord-role-orange { color: ${discordColors.roleOrange}; }
.discord-role-yellow { color: ${discordColors.roleYellow}; }
.discord-role-green { color: ${discordColors.roleGreen}; }
.discord-role-teal { color: ${discordColors.roleTeal}; }
.discord-role-blue { color: ${discordColors.roleBlue}; }
.discord-role-purple { color: ${discordColors.rolePurple}; }
.discord-role-pink { color: ${discordColors.rolePink}; }

/* Mention Highlight */
.discord-mention {
  background-color: rgba(88, 101, 242, 0.3);
  color: #dee0fc;
  padding: 0 2px;
  border-radius: 3px;
  cursor: pointer;
}

.discord-mention:hover {
  background-color: var(--discord-blurple);
  color: white;
}

/* Scrollbar Styling */
.discord-template ::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

.discord-template ::-webkit-scrollbar-track {
  background: transparent;
}

.discord-template ::-webkit-scrollbar-thumb {
  background-color: var(--discord-gray-850);
  border-radius: 4px;
}

.discord-template ::-webkit-scrollbar-thumb:hover {
  background-color: var(--discord-gray-800);
}

/* Unread Indicator */
.discord-unread-pill {
  background-color: var(--discord-blurple);
  color: white;
  font-size: 10px;
  font-weight: 700;
  padding: 0 4px;
  min-width: 16px;
  height: 16px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* Nitro Badge */
.discord-nitro-badge {
  background: linear-gradient(90deg, #ff73fa 0%, #ffc0cb 100%);
  color: white;
  font-size: 10px;
  font-weight: 700;
  padding: 2px 6px;
  border-radius: 3px;
  text-transform: uppercase;
}

/* Boost Badge */
.discord-boost-badge {
  background: linear-gradient(90deg, #ff73fa 0%, #9b84ec 100%);
  color: white;
  font-size: 10px;
  font-weight: 700;
  padding: 2px 6px;
  border-radius: 3px;
}
`,
};

export default discordTemplate;
