// ===============================================================================
// Telegram Template Configuration - Complete Feature Parity
// ===============================================================================
//
// A comprehensive Telegram-style template featuring bubble messages, gradient
// backgrounds, checkmark read receipts, and the distinctive blue/white color
// scheme with floating input and full feature parity with Telegram.
//
// Key Features:
// - Chat bubbles with tails (green for own, white for others)
// - Single/double checkmarks for delivery/read status
// - Voice messages with waveform visualization
// - Sticker and GIF support
// - Polls and quizzes
// - Scheduled messages
// - Secret chat placeholder (E2E encryption visual indicator)
// - Online status with "last seen" timestamps
// - Supergroups and channels
//
// ===============================================================================

import type { PlatformTemplate } from "../types";

// ---------------------------------------------------------------------------
// Telegram Brand Colors
// ---------------------------------------------------------------------------

export const TELEGRAM_COLORS = {
  // Primary brand colors
  telegramBlue: "#2AABEE",
  telegramBlueDark: "#229ED9",
  telegramBlueDeep: "#1E96C8",
  telegramBlueLight: "#64C8F4",

  // Message bubble colors
  bubbleOutgoing: "#EFFDDE", // Light green (own messages)
  bubbleOutgoingDark: "#2B5278", // Dark mode outgoing
  bubbleIncoming: "#FFFFFF",
  bubbleIncomingDark: "#182533",

  // Status colors
  online: "#4DCD5E", // Green dot for online
  typing: "#2AABEE", // Blue for typing indicator

  // Checkmark colors
  checkSent: "#A0B8C9", // Single check (sent)
  checkDelivered: "#A0B8C9", // Double check (delivered)
  checkRead: "#4FAE4E", // Double check green (read)

  // iOS-style colors used in Telegram
  iosGray: "#8E8E93",
  iosGrayLight: "#C7C7CC",
  iosSeparator: "#C6C6C8",
  iosBackground: "#EFEFF4",

  // Dark mode specific
  darkBackground: "#17212B",
  darkSurface: "#232E3C",
  darkCard: "#1C2733",
  darkBorder: "#344352",
} as const;

// ---------------------------------------------------------------------------
// Typography Configuration
// ---------------------------------------------------------------------------

export const TELEGRAM_TYPOGRAPHY = {
  fontFamily: {
    primary:
      '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    monospace: 'SFMono-Regular, Consolas, "Liberation Mono", Menlo, monospace',
  },
  fontSize: {
    xs: "11px",
    sm: "13px",
    base: "15px",
    lg: "17px",
    xl: "20px",
    "2xl": "24px",
    "3xl": "30px",
  },
  fontWeight: {
    normal: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
  },
  lineHeight: {
    tight: 1.2,
    normal: 1.4,
    relaxed: 1.6,
  },
} as const;

// ---------------------------------------------------------------------------
// Message Bubble Configuration
// ---------------------------------------------------------------------------

export const TELEGRAM_BUBBLES = {
  // Bubble styling
  borderRadius: "18px",
  borderRadiusTail: "4px",
  maxWidth: "75%",
  minWidth: "60px",
  padding: {
    horizontal: "12px",
    vertical: "8px",
  },

  // Tail configuration
  tail: {
    enabled: true,
    width: "12px",
    height: "16px",
  },

  // Spacing between messages
  spacing: {
    sameUser: "2px",
    differentUser: "12px",
    withReply: "4px",
  },

  // Media within bubbles
  media: {
    borderRadius: "14px",
    maxWidth: "320px",
    maxHeight: "320px",
  },

  // Voice message specific
  voice: {
    waveformHeight: "28px",
    waveformBars: 32,
    minWidth: "200px",
  },
} as const;

// ---------------------------------------------------------------------------
// Icons Configuration
// ---------------------------------------------------------------------------

export const TELEGRAM_ICONS = {
  // Navigation
  menu: "menu",
  search: "search",
  back: "arrow-left",
  close: "x",
  more: "more-vertical",

  // Chat types
  privateChat: "user",
  group: "users",
  supergroup: "users-2",
  channel: "megaphone",
  bot: "bot",
  secretChat: "lock",

  // Actions
  send: "send",
  attach: "paperclip",
  camera: "camera",
  microphone: "mic",
  sticker: "sticker",
  gif: "image",
  poll: "bar-chart-2",
  location: "map-pin",
  contact: "user-plus",
  file: "file",

  // Message status
  sending: "clock",
  sent: "check",
  delivered: "check-check",
  read: "check-check",
  failed: "alert-circle",

  // Features
  pin: "pin",
  mute: "bell-off",
  unmute: "bell",
  edit: "pencil",
  delete: "trash-2",
  forward: "forward",
  reply: "reply",
  copy: "copy",
  select: "check-square",

  // Profile
  phone: "phone",
  username: "at-sign",
  bio: "file-text",
  notifications: "bell",
  mediaFiles: "image",
  links: "link",
  voiceMessages: "mic",
  groups: "users",

  // Misc
  calendar: "calendar",
  timer: "timer",
  flame: "flame", // For secret chat self-destruct
} as const;

// ---------------------------------------------------------------------------
// Animation Configuration
// ---------------------------------------------------------------------------

export const TELEGRAM_ANIMATIONS = {
  // Transition durations
  duration: {
    instant: "0ms",
    fast: "150ms",
    normal: "200ms",
    slow: "300ms",
    slower: "400ms",
  },

  // Easing functions
  easing: {
    default: "cubic-bezier(0.25, 0.1, 0.25, 1)",
    easeOut: "cubic-bezier(0, 0, 0.2, 1)",
    easeIn: "cubic-bezier(0.4, 0, 1, 1)",
    easeInOut: "cubic-bezier(0.4, 0, 0.2, 1)",
    spring: "cubic-bezier(0.175, 0.885, 0.32, 1.275)",
  },

  // Message animations
  message: {
    enter: {
      duration: "200ms",
      easing: "cubic-bezier(0.25, 0.1, 0.25, 1)",
      transform: "translateY(10px)",
      opacity: 0,
    },
    exit: {
      duration: "150ms",
      easing: "cubic-bezier(0.4, 0, 1, 1)",
    },
  },

  // Chat list animations
  chatList: {
    reorder: "300ms",
    swipe: "200ms",
  },

  // Sticker animations
  sticker: {
    hover: "150ms",
    send: "250ms",
  },

  // Typing indicator
  typingDots: {
    duration: "1.4s",
    delay: "0.2s",
  },
} as const;

// ---------------------------------------------------------------------------
// Complete Platform Template Export
// ---------------------------------------------------------------------------

export const telegramTemplate: PlatformTemplate = {
  // ---------------------------------------------------------------------------
  // Identity
  // ---------------------------------------------------------------------------

  id: "telegram",
  name: "Telegram",
  description:
    "Complete Telegram clone with 100% feature parity - bubble messages, checkmarks, voice messages, stickers, and more",
  version: "2.0.0",
  author: "nself",

  // ---------------------------------------------------------------------------
  // Theme Configuration (Telegram Blue)
  // ---------------------------------------------------------------------------

  theme: {
    defaultMode: "light",

    light: {
      // Primary colors (Telegram Blue)
      primaryColor: TELEGRAM_COLORS.telegramBlue,
      secondaryColor: TELEGRAM_COLORS.telegramBlueDark,
      accentColor: TELEGRAM_COLORS.online, // iOS green for online status

      // Background colors
      backgroundColor: "#FFFFFF",
      surfaceColor: TELEGRAM_COLORS.iosBackground,
      cardColor: "#FFFFFF",
      popoverColor: "#FFFFFF",

      // Text colors
      textColor: "#000000",
      textMutedColor: TELEGRAM_COLORS.iosGray,
      textInverseColor: "#FFFFFF",

      // Border colors
      borderColor: TELEGRAM_COLORS.iosSeparator,
      borderMutedColor: "#E5E5EA",

      // Button colors
      buttonPrimaryBg: TELEGRAM_COLORS.telegramBlue,
      buttonPrimaryText: "#FFFFFF",
      buttonSecondaryBg: TELEGRAM_COLORS.iosBackground,
      buttonSecondaryText: TELEGRAM_COLORS.telegramBlue,
      buttonGhostHover: "#F2F2F7",

      // Status colors
      successColor: "#34C759",
      warningColor: "#FF9500",
      errorColor: "#FF3B30",
      infoColor: TELEGRAM_COLORS.telegramBlue,

      // Special colors
      linkColor: TELEGRAM_COLORS.telegramBlue,
      focusRingColor: TELEGRAM_COLORS.telegramBlue,
      selectionBg: "rgba(42, 171, 238, 0.2)",
      highlightBg: "rgba(255, 214, 10, 0.2)",

      // Telegram-specific: Message bubbles
      messageBubbleOwn: TELEGRAM_COLORS.bubbleOutgoing,
      messageBubbleOther: TELEGRAM_COLORS.bubbleIncoming,
    },

    dark: {
      // Primary colors
      primaryColor: TELEGRAM_COLORS.telegramBlue,
      secondaryColor: TELEGRAM_COLORS.telegramBlueDark,
      accentColor: TELEGRAM_COLORS.online,

      // Background colors (Telegram dark)
      backgroundColor: TELEGRAM_COLORS.darkBackground,
      surfaceColor: TELEGRAM_COLORS.darkSurface,
      cardColor: TELEGRAM_COLORS.darkCard,
      popoverColor: TELEGRAM_COLORS.darkBackground,

      // Text colors
      textColor: "#FFFFFF",
      textMutedColor: "#708499",
      textInverseColor: "#000000",

      // Border colors
      borderColor: TELEGRAM_COLORS.darkBorder,
      borderMutedColor: TELEGRAM_COLORS.darkSurface,

      // Button colors
      buttonPrimaryBg: TELEGRAM_COLORS.telegramBlue,
      buttonPrimaryText: "#FFFFFF",
      buttonSecondaryBg: TELEGRAM_COLORS.darkSurface,
      buttonSecondaryText: TELEGRAM_COLORS.telegramBlue,
      buttonGhostHover: "#2B3A4A",

      // Status colors
      successColor: "#34C759",
      warningColor: "#FF9F0A",
      errorColor: "#FF453A",
      infoColor: TELEGRAM_COLORS.telegramBlue,

      // Special colors
      linkColor: TELEGRAM_COLORS.telegramBlue,
      focusRingColor: TELEGRAM_COLORS.telegramBlue,
      selectionBg: "rgba(42, 171, 238, 0.27)",
      highlightBg: "rgba(255, 214, 10, 0.13)",

      // Telegram-specific: Message bubbles
      messageBubbleOwn: TELEGRAM_COLORS.bubbleOutgoingDark,
      messageBubbleOther: TELEGRAM_COLORS.bubbleIncomingDark,
    },
  },

  // ---------------------------------------------------------------------------
  // Layout Configuration
  // ---------------------------------------------------------------------------

  layout: {
    // Sidebar (Telegram has narrow chat list)
    sidebarPosition: "left",
    sidebarWidth: 360,
    sidebarCollapsible: true,
    sidebarCollapsedWidth: 0, // Telegram fully hides sidebar on mobile

    // Header
    headerHeight: 56,
    showHeaderBorder: true,

    // Messages (Telegram uses bubble style)
    messageDensity: "comfortable",
    messageGrouping: true,
    messageGroupingTimeout: 1, // Telegram groups very tightly (1 minute)

    // Avatars (Telegram uses circles, hidden in consecutive messages)
    avatarStyle: "circle",
    avatarSize: "md",
    showAvatarInGroup: "last", // Telegram shows avatar at end of group

    // Chats (Telegram shows preview and time)
    showChannelIcons: false, // Telegram uses avatars instead
    showChannelDescription: true, // Shows last message preview
    showMemberCount: true,
    channelListDensity: "comfortable",

    // Users
    showUserStatus: true,
    showPresenceDots: true,
    presenceDotPosition: "bottom-right",
  },

  // ---------------------------------------------------------------------------
  // Feature Configuration
  // ---------------------------------------------------------------------------

  features: {
    // Threads (Telegram has reply-to, not threads like Slack)
    threads: false,
    threadStyle: "inline",
    threadPanelWidth: 0,

    // Reactions (Telegram has emoji reactions with quick-react menu)
    reactions: true,
    reactionStyle: "floating", // Reactions appear floating above message
    quickReactions: ["👍", "❤️", "🔥", "🎉", "😢", "👎", "🤔"],
    maxReactionsDisplay: 3,

    // Rich content
    fileUploads: true,
    voiceMessages: true, // Telegram is famous for voice messages
    codeBlocks: true,
    markdown: true,
    linkPreviews: true,
    emojiPicker: "native", // Telegram uses native emoji
    gifPicker: true,

    // Message actions (Telegram's swipe/long-press actions)
    messageActions: ["reply", "forward", "copy", "pin", "edit", "delete"],
    showActionsOnHover: false, // Telegram uses long-press/right-click on desktop

    // Real-time features
    typing: true,
    typingIndicatorStyle: "text", // "typing..." text style
    presence: true,
    readReceipts: true,
    readReceiptStyle: "checkmarks", // Telegram's signature single/double checkmarks
  },

  // ---------------------------------------------------------------------------
  // Terminology Configuration (Telegram-specific terms)
  // ---------------------------------------------------------------------------

  terminology: {
    // Core concepts
    workspace: "Telegram",
    workspacePlural: "Accounts",
    channel: "Chat",
    channelPlural: "Chats",
    directMessage: "Private Chat",
    directMessagePlural: "Private Chats",
    directMessageShort: "PM",
    thread: "Reply",
    threadPlural: "Replies",
    member: "Member",
    memberPlural: "Members",
    message: "Message",
    messagePlural: "Messages",
    reaction: "Reaction",
    reactionPlural: "Reactions",

    // Actions
    sendMessage: "Send",
    editMessage: "Edit",
    deleteMessage: "Delete",
    replyToThread: "Reply",
    createChannel: "New Group",
    joinChannel: "Join",
    leaveChannel: "Leave Group",

    // Placeholders
    messageInputPlaceholder: "Message",
    searchPlaceholder: "Search",
    newChannelPlaceholder: "Group Name",
  },

  // ---------------------------------------------------------------------------
  // Animation Configuration
  // ---------------------------------------------------------------------------

  animations: {
    enableAnimations: true,
    reducedMotion: false,
    transitionDuration: "fast",
    messageAppear: "slide", // Messages slide in from bottom
    sidebarTransition: "slide",
    modalTransition: "slide", // iOS-style slide up from bottom
  },

  // ---------------------------------------------------------------------------
  // Custom CSS for Telegram-specific styling
  // ---------------------------------------------------------------------------

  customCSS: `
    /* Telegram Chat Bubbles */
    .telegram-message-bubble {
      position: relative;
      padding: ${TELEGRAM_BUBBLES.padding.vertical} ${TELEGRAM_BUBBLES.padding.horizontal};
      border-radius: ${TELEGRAM_BUBBLES.borderRadius};
      max-width: ${TELEGRAM_BUBBLES.maxWidth};
      min-width: ${TELEGRAM_BUBBLES.minWidth};
    }

    .telegram-message-bubble--own {
      background: var(--message-bubble-own);
      border-bottom-right-radius: ${TELEGRAM_BUBBLES.borderRadiusTail};
      margin-left: auto;
    }

    .telegram-message-bubble--other {
      background: var(--message-bubble-other);
      border-bottom-left-radius: ${TELEGRAM_BUBBLES.borderRadiusTail};
    }

    /* Telegram Checkmarks */
    .telegram-checkmark {
      display: inline-flex;
      align-items: center;
      gap: 1px;
      color: ${TELEGRAM_COLORS.checkSent};
    }

    .telegram-checkmark--read {
      color: ${TELEGRAM_COLORS.checkRead};
    }

    /* Telegram Online Status */
    .telegram-online-dot {
      width: 12px;
      height: 12px;
      border-radius: 50%;
      background: ${TELEGRAM_COLORS.online};
      border: 2px solid var(--background);
    }

    /* Telegram Typing Indicator */
    .telegram-typing {
      display: flex;
      align-items: center;
      gap: 3px;
      padding: 8px 12px;
      color: ${TELEGRAM_COLORS.telegramBlue};
      font-size: 13px;
    }

    .telegram-typing-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: ${TELEGRAM_COLORS.telegramBlue};
      animation: telegram-typing-bounce ${TELEGRAM_ANIMATIONS.typingDots.duration} infinite;
    }

    .telegram-typing-dot:nth-child(2) {
      animation-delay: ${TELEGRAM_ANIMATIONS.typingDots.delay};
    }

    .telegram-typing-dot:nth-child(3) {
      animation-delay: calc(${TELEGRAM_ANIMATIONS.typingDots.delay} * 2);
    }

    @keyframes telegram-typing-bounce {
      0%, 60%, 100% {
        transform: translateY(0);
        opacity: 0.4;
      }
      30% {
        transform: translateY(-4px);
        opacity: 1;
      }
    }

    /* Voice Message Waveform */
    .telegram-voice-waveform {
      display: flex;
      align-items: center;
      gap: 2px;
      height: ${TELEGRAM_BUBBLES.voice.waveformHeight};
      min-width: ${TELEGRAM_BUBBLES.voice.minWidth};
    }

    .telegram-voice-bar {
      width: 3px;
      background: currentColor;
      border-radius: 2px;
      transition: height ${TELEGRAM_ANIMATIONS.duration.fast};
    }

    /* Sticker Container */
    .telegram-sticker {
      max-width: 200px;
      max-height: 200px;
    }

    .telegram-sticker img,
    .telegram-sticker video {
      width: 100%;
      height: 100%;
      object-fit: contain;
    }

    /* Poll Styling */
    .telegram-poll {
      padding: 12px;
      min-width: 240px;
      max-width: 320px;
    }

    .telegram-poll-option {
      position: relative;
      padding: 10px 12px;
      border-radius: 10px;
      margin-bottom: 8px;
      background: rgba(0, 0, 0, 0.05);
      cursor: pointer;
      overflow: hidden;
    }

    .telegram-poll-option--selected {
      background: rgba(42, 171, 238, 0.15);
    }

    .telegram-poll-bar {
      position: absolute;
      left: 0;
      top: 0;
      bottom: 0;
      background: ${TELEGRAM_COLORS.telegramBlue};
      opacity: 0.2;
      transition: width ${TELEGRAM_ANIMATIONS.duration.slow};
    }

    /* Secret Chat Indicator */
    .telegram-secret-indicator {
      display: flex;
      align-items: center;
      gap: 6px;
      color: #4DCD5E;
      font-size: 13px;
    }

    /* Chat List Item */
    .telegram-chat-item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 8px 12px;
      cursor: pointer;
      transition: background ${TELEGRAM_ANIMATIONS.duration.fast};
    }

    .telegram-chat-item:hover {
      background: rgba(0, 0, 0, 0.04);
    }

    .telegram-chat-item--active {
      background: ${TELEGRAM_COLORS.telegramBlue};
      color: white;
    }

    .telegram-chat-item--active:hover {
      background: ${TELEGRAM_COLORS.telegramBlueDark};
    }

    /* Unread Badge */
    .telegram-unread-badge {
      min-width: 20px;
      height: 20px;
      padding: 0 6px;
      border-radius: 10px;
      background: ${TELEGRAM_COLORS.telegramBlue};
      color: white;
      font-size: 12px;
      font-weight: 600;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .telegram-unread-badge--muted {
      background: ${TELEGRAM_COLORS.iosGray};
    }

    /* Floating Action Button */
    .telegram-fab {
      position: fixed;
      right: 24px;
      bottom: 24px;
      width: 56px;
      height: 56px;
      border-radius: 50%;
      background: ${TELEGRAM_COLORS.telegramBlue};
      color: white;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      cursor: pointer;
      transition: transform ${TELEGRAM_ANIMATIONS.duration.fast}, box-shadow ${TELEGRAM_ANIMATIONS.duration.fast};
    }

    .telegram-fab:hover {
      transform: scale(1.05);
      box-shadow: 0 6px 16px rgba(0, 0, 0, 0.2);
    }

    .telegram-fab:active {
      transform: scale(0.95);
    }

    /* Scheduled Message Indicator */
    .telegram-scheduled {
      display: flex;
      align-items: center;
      gap: 4px;
      color: ${TELEGRAM_COLORS.telegramBlue};
      font-size: 12px;
    }

    /* Self-destruct Timer */
    .telegram-self-destruct {
      display: flex;
      align-items: center;
      gap: 4px;
      color: #FF6B6B;
      font-size: 11px;
    }

    /* Reply Preview in Bubble */
    .telegram-reply-preview {
      padding: 6px 10px;
      margin-bottom: 4px;
      border-left: 2px solid ${TELEGRAM_COLORS.telegramBlue};
      background: rgba(0, 0, 0, 0.04);
      border-radius: 0 8px 8px 0;
      font-size: 13px;
      cursor: pointer;
    }

    .telegram-reply-preview:hover {
      background: rgba(0, 0, 0, 0.08);
    }

    /* Forward Header */
    .telegram-forward-header {
      display: flex;
      align-items: center;
      gap: 6px;
      padding-bottom: 4px;
      margin-bottom: 4px;
      color: ${TELEGRAM_COLORS.telegramBlue};
      font-size: 13px;
      font-weight: 500;
    }

    /* Media Grid */
    .telegram-media-grid {
      display: grid;
      gap: 2px;
      border-radius: ${TELEGRAM_BUBBLES.media.borderRadius};
      overflow: hidden;
    }

    .telegram-media-grid--2 {
      grid-template-columns: 1fr 1fr;
    }

    .telegram-media-grid--3 {
      grid-template-columns: 1fr 1fr;
      grid-template-rows: 1fr 1fr;
    }

    .telegram-media-grid--3 > :first-child {
      grid-row: span 2;
    }

    .telegram-media-grid--4 {
      grid-template-columns: 1fr 1fr;
      grid-template-rows: 1fr 1fr;
    }
  `,
};

export default telegramTemplate;
