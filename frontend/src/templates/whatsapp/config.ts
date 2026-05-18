// ===============================================================================
// WhatsApp Template Configuration - Complete Feature Parity
// ===============================================================================
//
// A comprehensive WhatsApp clone template featuring:
// - Authentic teal/green color scheme (#25D366, #128C7E, #075E54)
// - Chat bubble messages with tails
// - Double checkmark read receipts (gray -> blue)
// - Status/Stories feature
// - Voice notes with waveform visualization
// - End-to-end encryption indicators
// - Online/typing indicators
// - Last seen timestamps
// - Contact sharing
// - Location sharing
// - Document attachments
// - Polls
// - Disappearing messages
// - View once media
// - Star messages
// - Forward messages
// - Broadcast lists
// - Groups (up to 1024 members)
//
// ===============================================================================

import type { PlatformTemplate } from "../types";

// WhatsApp Brand Colors
export const WHATSAPP_COLORS = {
  // Primary greens
  primaryGreen: "#25D366", // WhatsApp green (lighter)
  secondaryGreen: "#128C7E", // Teal green
  darkGreen: "#075E54", // Dark teal (header)

  // Message bubbles
  bubbleOutgoing: "#DCF8C6", // Light green (own messages, light mode)
  bubbleIncoming: "#FFFFFF", // White (other messages, light mode)
  bubbleOutgoingDark: "#005C4B", // Dark green (own messages, dark mode)
  bubbleIncomingDark: "#1F2C33", // Dark gray (other messages, dark mode)

  // Background
  chatBgLight: "#ECE5DD", // Doodle pattern background (light)
  chatBgDark: "#0B141A", // Dark background

  // Text
  textPrimary: "#111B21",
  textSecondary: "#667781",
  textPrimaryDark: "#E9EDEF",
  textSecondaryDark: "#8696A0",

  // Checkmarks
  checkGray: "#667781", // Sent/Delivered
  checkBlue: "#53BDEB", // Read

  // Status
  online: "#25D366",
  typing: "#25D366",

  // Unread badge
  unreadBadge: "#25D366",

  // Borders
  borderLight: "#D1D7DB",
  borderDark: "#2A3942",
};

export const whatsappTemplate: PlatformTemplate = {
  // ---------------------------------------------------------------------------
  // Identity
  // ---------------------------------------------------------------------------

  id: "whatsapp",
  name: "WhatsApp",
  description:
    "Complete WhatsApp clone with 100% feature parity - teal accents, bubble messages with tails, double checkmark receipts, status stories, voice notes, and more",
  version: "2.0.0",
  author: "nself",

  // ---------------------------------------------------------------------------
  // Theme Configuration (WhatsApp Teal/Green)
  // ---------------------------------------------------------------------------

  theme: {
    defaultMode: "light",

    light: {
      // Primary colors (WhatsApp Green)
      primaryColor: "#25D366",
      secondaryColor: "#128C7E",
      accentColor: "#075E54",

      // Background colors
      backgroundColor: "#ECE5DD", // Chat wallpaper background
      surfaceColor: "#FFFFFF",
      cardColor: "#FFFFFF",
      popoverColor: "#FFFFFF",

      // Text colors
      textColor: "#111B21",
      textMutedColor: "#667781",
      textInverseColor: "#FFFFFF",

      // Border colors
      borderColor: "#D1D7DB",
      borderMutedColor: "#E9EDEF",

      // Button colors
      buttonPrimaryBg: "#25D366",
      buttonPrimaryText: "#FFFFFF",
      buttonSecondaryBg: "#F0F2F5",
      buttonSecondaryText: "#075E54",
      buttonGhostHover: "#F0F2F5",

      // Status colors
      successColor: "#25D366",
      warningColor: "#FFB800",
      errorColor: "#EA0038",
      infoColor: "#34B7F1",

      // Special colors
      linkColor: "#027EB5",
      focusRingColor: "#25D366",
      selectionBg: "#25D36633",
      highlightBg: "#FFB80033",

      // WhatsApp-specific: Message bubbles
      messageBubbleOwn: "#DCF8C6", // Light green for own messages
      messageBubbleOther: "#FFFFFF", // White for others' messages
    },

    dark: {
      // Primary colors
      primaryColor: "#25D366",
      secondaryColor: "#00A884",
      accentColor: "#00A884",

      // Background colors (WhatsApp dark mode)
      backgroundColor: "#0B141A",
      surfaceColor: "#111B21",
      cardColor: "#1F2C33",
      popoverColor: "#233138",

      // Text colors
      textColor: "#E9EDEF",
      textMutedColor: "#8696A0",
      textInverseColor: "#111B21",

      // Border colors
      borderColor: "#2A3942",
      borderMutedColor: "#1F2C33",

      // Button colors
      buttonPrimaryBg: "#00A884",
      buttonPrimaryText: "#111B21",
      buttonSecondaryBg: "#2A3942",
      buttonSecondaryText: "#00A884",
      buttonGhostHover: "#182229",

      // Status colors
      successColor: "#00A884",
      warningColor: "#FFB800",
      errorColor: "#F15C6D",
      infoColor: "#53BDEB",

      // Special colors
      linkColor: "#53BDEB",
      focusRingColor: "#00A884",
      selectionBg: "#00A88444",
      highlightBg: "#FFB80022",

      // WhatsApp-specific: Message bubbles
      messageBubbleOwn: "#005C4B", // Dark green for own messages
      messageBubbleOther: "#1F2C33", // Dark gray for others' messages
    },
  },

  // ---------------------------------------------------------------------------
  // Layout Configuration
  // ---------------------------------------------------------------------------

  layout: {
    // Sidebar (WhatsApp chat list)
    sidebarPosition: "left",
    sidebarWidth: 360,
    sidebarCollapsible: true,
    sidebarCollapsedWidth: 0, // Full screen mode on mobile

    // Header
    headerHeight: 60,
    showHeaderBorder: false, // WhatsApp uses subtle shadow

    // Messages (WhatsApp bubble style)
    messageDensity: "comfortable",
    messageGrouping: true,
    messageGroupingTimeout: 1, // 1 minute

    // Avatars
    avatarStyle: "circle",
    avatarSize: "lg",
    showAvatarInGroup: "none", // WhatsApp hides avatars in 1-on-1

    // Chats
    showChannelIcons: false,
    showChannelDescription: true, // Last message preview
    showMemberCount: false,
    channelListDensity: "comfortable",

    // Users
    showUserStatus: true,
    showPresenceDots: false, // WhatsApp shows "online" text
    presenceDotPosition: "bottom-right",
  },

  // ---------------------------------------------------------------------------
  // Feature Configuration
  // ---------------------------------------------------------------------------

  features: {
    // Threads (WhatsApp uses inline reply-to only)
    threads: false,
    threadStyle: "inline",
    threadPanelWidth: 0,

    // Reactions
    reactions: true,
    reactionStyle: "floating",
    quickReactions: ["👍", "❤️", "😂", "😮", "😢", "🙏"],
    maxReactionsDisplay: 5,

    // Rich content
    fileUploads: true,
    voiceMessages: true,
    codeBlocks: false, // WhatsApp doesn't have code blocks
    markdown: false, // WhatsApp has limited formatting (*bold*, _italic_, ~strikethrough~, ```monospace```)
    linkPreviews: true,
    emojiPicker: "native",
    gifPicker: true,

    // Message actions (long-press menu)
    messageActions: ["reply", "react", "forward", "star", "copy", "delete"],
    showActionsOnHover: false, // Long-press/right-click menu

    // Real-time (WhatsApp's signature features)
    typing: true,
    typingIndicatorStyle: "text",
    presence: true,
    readReceipts: true,
    readReceiptStyle: "checkmarks", // Double blue checkmarks
  },

  // ---------------------------------------------------------------------------
  // Terminology Configuration (WhatsApp-specific terms)
  // ---------------------------------------------------------------------------

  terminology: {
    // Core concepts
    workspace: "WhatsApp",
    workspacePlural: "Accounts",
    channel: "Chat",
    channelPlural: "Chats",
    directMessage: "Chat",
    directMessagePlural: "Chats",
    directMessageShort: "Chat",
    thread: "Reply",
    threadPlural: "Replies",
    member: "Participant",
    memberPlural: "Participants",
    message: "Message",
    messagePlural: "Messages",
    reaction: "Reaction",
    reactionPlural: "Reactions",

    // Actions
    sendMessage: "Send",
    editMessage: "Edit",
    deleteMessage: "Delete for Me",
    replyToThread: "Reply",
    createChannel: "New Chat",
    joinChannel: "Join Group",
    leaveChannel: "Exit Group",

    // Placeholders
    messageInputPlaceholder: "Type a message",
    searchPlaceholder: "Search or start new chat",
    newChannelPlaceholder: "Group subject",
  },

  // ---------------------------------------------------------------------------
  // Animation Configuration
  // ---------------------------------------------------------------------------

  animations: {
    enableAnimations: true,
    reducedMotion: false,
    transitionDuration: "fast",
    messageAppear: "fade",
    sidebarTransition: "slide",
    modalTransition: "slide",
  },

  // ---------------------------------------------------------------------------
  // Custom CSS (WhatsApp-specific styles)
  // ---------------------------------------------------------------------------

  customCSS: `
    /* WhatsApp Chat Background Pattern */
    .whatsapp-chat-bg {
      background-color: var(--background);
      background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 100 100'%3E%3Cg fill-rule='evenodd'%3E%3Cg fill='%2325D366' fill-opacity='0.05'%3E%3Cpath opacity='.5' d='M96 95h4v1h-4v4h-1v-4h-9v4h-1v-4h-9v4h-1v-4h-9v4h-1v-4h-9v4h-1v-4h-9v4h-1v-4h-9v4h-1v-4h-9v4h-1v-4h-9v4h-1v-4H0v-1h15v-9H0v-1h15v-9H0v-1h15v-9H0v-1h15v-9H0v-1h15v-9H0v-1h15v-9H0v-1h15v-9H0v-1h15v-9H0v-1h15V0h1v15h9V0h1v15h9V0h1v15h9V0h1v15h9V0h1v15h9V0h1v15h9V0h1v15h9V0h1v15h9V0h1v15h4v1h-4v9h4v1h-4v9h4v1h-4v9h4v1h-4v9h4v1h-4v9h4v1h-4v9h4v1h-4v9h4v1h-4v9zm-1 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-9-10h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm9-10v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-9-10h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm9-10v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-9-10h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm9-10v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-9-10h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9z'/%3E%3Cpath d='M6 5V0H5v5H0v1h5v94h1V6h94V5H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E");
    }

    /* Dark mode chat background */
    .dark .whatsapp-chat-bg {
      background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 100 100'%3E%3Cg fill-rule='evenodd'%3E%3Cg fill='%2300A884' fill-opacity='0.03'%3E%3Cpath opacity='.5' d='M96 95h4v1h-4v4h-1v-4h-9v4h-1v-4h-9v4h-1v-4h-9v4h-1v-4h-9v4h-1v-4h-9v4h-1v-4h-9v4h-1v-4h-9v4h-1v-4h-9v4h-1v-4H0v-1h15v-9H0v-1h15v-9H0v-1h15v-9H0v-1h15v-9H0v-1h15v-9H0v-1h15v-9H0v-1h15v-9H0v-1h15v-9H0v-1h15V0h1v15h9V0h1v15h9V0h1v15h9V0h1v15h9V0h1v15h9V0h1v15h9V0h1v15h9V0h1v15h9V0h1v15h4v1h-4v9h4v1h-4v9h4v1h-4v9h4v1h-4v9h4v1h-4v9h4v1h-4v9h4v1h-4v9h4v1h-4v9zm-1 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-9-10h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm9-10v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-9-10h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm9-10v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-9-10h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm9-10v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-9-10h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9z'/%3E%3Cpath d='M6 5V0H5v5H0v1h5v94h1V6h94V5H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E");
    }

    /* WhatsApp Scrollbar */
    .whatsapp-scrollbar::-webkit-scrollbar {
      width: 6px;
    }

    .whatsapp-scrollbar::-webkit-scrollbar-track {
      background: transparent;
    }

    .whatsapp-scrollbar::-webkit-scrollbar-thumb {
      background: rgba(0, 0, 0, 0.2);
      border-radius: 3px;
    }

    .dark .whatsapp-scrollbar::-webkit-scrollbar-thumb {
      background: rgba(255, 255, 255, 0.2);
    }
  `,
};

export default whatsappTemplate;
