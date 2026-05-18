// ═══════════════════════════════════════════════════════════════════════════════
// Platform Template Type Definitions
// ═══════════════════════════════════════════════════════════════════════════════

import type { ComponentType } from "react";

/**
 * Available platform template IDs
 */
export type TemplateId =
  | "default"
  | "slack"
  | "discord"
  | "telegram"
  | "whatsapp";

/**
 * Theme color configuration
 */
export interface ThemeColors {
  // Primary colors
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;

  // Background colors
  backgroundColor: string;
  surfaceColor: string;
  cardColor: string;
  popoverColor: string;

  // Text colors
  textColor: string;
  textMutedColor: string;
  textInverseColor: string;

  // Border colors
  borderColor: string;
  borderMutedColor: string;

  // Button colors
  buttonPrimaryBg: string;
  buttonPrimaryText: string;
  buttonSecondaryBg: string;
  buttonSecondaryText: string;
  buttonGhostHover: string;

  // Status colors
  successColor: string;
  warningColor: string;
  errorColor: string;
  infoColor: string;

  // Special colors
  linkColor: string;
  focusRingColor: string;
  selectionBg: string;
  highlightBg: string;

  // Platform-specific colors (optional)
  messageBubbleOwn?: string; // Own message bubble color
  messageBubbleOther?: string; // Other user's message bubble color
}

/**
 * Layout configuration
 */
export interface LayoutConfig {
  // Sidebar
  sidebarPosition: "left" | "right";
  sidebarWidth: number;
  sidebarCollapsible: boolean;
  sidebarCollapsedWidth: number;

  // Header
  headerHeight: number;
  showHeaderBorder: boolean;

  // Messages
  messageDensity: "compact" | "comfortable" | "spacious";
  messageGrouping: boolean; // Group consecutive messages from same user
  messageGroupingTimeout: number; // Minutes before new group

  // Avatars
  avatarStyle: "circle" | "rounded" | "square";
  avatarSize: "sm" | "md" | "lg";
  showAvatarInGroup: "first" | "last" | "all" | "hover" | "none";

  // Channels
  showChannelIcons: boolean;
  showChannelDescription: boolean;
  showMemberCount: boolean;
  channelListDensity: "compact" | "comfortable";

  // Users
  showUserStatus: boolean;
  showPresenceDots: boolean;
  presenceDotPosition: "bottom-right" | "bottom-left" | "top-right";
}

/**
 * Feature configuration
 */
export interface FeatureConfig {
  // Threads
  threads: boolean;
  threadStyle: "panel" | "inline" | "popup";
  threadPanelWidth: number;

  // Reactions
  reactions: boolean;
  reactionStyle: "inline" | "floating" | "hover";
  quickReactions: string[];
  maxReactionsDisplay: number;

  // Rich content
  fileUploads: boolean;
  voiceMessages: boolean;
  codeBlocks: boolean;
  markdown: boolean;
  linkPreviews: boolean;
  emojiPicker: "native" | "custom" | "both";
  gifPicker: boolean;

  // Message actions
  messageActions: MessageAction[];
  showActionsOnHover: boolean;

  // Real-time
  typing: boolean;
  typingIndicatorStyle: "dots" | "text" | "avatar";
  presence: boolean;
  readReceipts: boolean;
  readReceiptStyle: "checkmarks" | "avatars" | "text";
}

/**
 * Available message actions
 */
export type MessageAction =
  | "reply"
  | "react"
  | "thread"
  | "edit"
  | "delete"
  | "pin"
  | "bookmark"
  | "star"
  | "copy"
  | "share"
  | "forward"
  | "report";

/**
 * Terminology customization for white-labeling
 */
export interface TerminologyConfig {
  // Core concepts
  workspace: string;
  workspacePlural: string;
  channel: string;
  channelPlural: string;
  directMessage: string;
  directMessagePlural: string;
  directMessageShort: string;
  thread: string;
  threadPlural: string;
  member: string;
  memberPlural: string;
  message: string;
  messagePlural: string;
  reaction: string;
  reactionPlural: string;

  // Actions
  sendMessage: string;
  editMessage: string;
  deleteMessage: string;
  replyToThread: string;
  createChannel: string;
  joinChannel: string;
  leaveChannel: string;

  // Placeholders
  messageInputPlaceholder: string;
  searchPlaceholder: string;
  newChannelPlaceholder: string;
}

/**
 * Animation & transition configuration
 */
export interface AnimationConfig {
  enableAnimations: boolean;
  reducedMotion: boolean;
  transitionDuration: "fast" | "normal" | "slow";
  messageAppear: "fade" | "slide" | "none";
  sidebarTransition: "slide" | "overlay" | "push";
  modalTransition: "fade" | "scale" | "slide";
}

/**
 * Component prop types for overrides
 */
export interface MessageItemProps {
  id: string;
  content: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  createdAt: Date;
  isEdited?: boolean;
  isDeleted?: boolean;
  isPinned?: boolean;
  reactions?: { emoji: string; count: number; hasReacted: boolean }[];
  attachments?: { type: string; url: string; name: string }[];
  threadCount?: number;
  isFirstInGroup?: boolean;
  isLastInGroup?: boolean;
}

export interface ChannelItemProps {
  id: string;
  name: string;
  slug: string;
  type: "public" | "private" | "direct" | "group";
  icon?: string;
  unreadCount?: number;
  mentionCount?: number;
  isActive?: boolean;
  isMuted?: boolean;
  lastMessageAt?: Date;
}

export interface UserAvatarProps {
  userId: string;
  name: string;
  avatarUrl?: string;
  status?: "online" | "away" | "dnd" | "offline";
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  showStatus?: boolean;
}

export interface ThreadPanelProps {
  threadId: string;
  parentMessage: MessageItemProps;
  isOpen: boolean;
  onClose: () => void;
}

export interface ReactionPickerProps {
  messageId: string;
  onSelect: (emoji: string) => void;
  onClose: () => void;
  position?: { x: number; y: number };
}

export interface TypingIndicatorProps {
  users: { id: string; name: string; avatar?: string }[];
  channelId: string;
}

/**
 * Component override configuration
 */
export interface ComponentOverrides {
  MessageItem?: ComponentType<MessageItemProps>;
  ChannelItem?: ComponentType<ChannelItemProps>;
  UserAvatar?: ComponentType<UserAvatarProps>;
  ThreadPanel?: ComponentType<ThreadPanelProps>;
  ReactionPicker?: ComponentType<ReactionPickerProps>;
  TypingIndicator?: ComponentType<TypingIndicatorProps>;
}

/**
 * Complete platform template configuration
 */
export interface PlatformTemplate {
  // Identity
  id: TemplateId;
  name: string;
  description: string;
  version: string;
  author?: string;

  // Theme
  theme: {
    light: ThemeColors;
    dark: ThemeColors;
    defaultMode: "light" | "dark" | "system";
  };

  // Layout
  layout: LayoutConfig;

  // Features
  features: FeatureConfig;

  // Terminology
  terminology: TerminologyConfig;

  // Animations
  animations: AnimationConfig;

  // Component overrides (optional)
  components?: ComponentOverrides;

  // Custom CSS (optional)
  customCSS?: string;
}

/**
 * Partial template for extending/overriding
 */
export type PartialTemplate = Partial<
  Omit<
    PlatformTemplate,
    "theme" | "layout" | "features" | "terminology" | "animations"
  >
> & {
  theme?: {
    defaultMode?: "light" | "dark" | "system";
    light?: Partial<ThemeColors>;
    dark?: Partial<ThemeColors>;
  };
  layout?: Partial<LayoutConfig>;
  features?: Partial<FeatureConfig>;
  terminology?: Partial<TerminologyConfig>;
  animations?: Partial<AnimationConfig>;
};

/**
 * Template registry entry
 */
export interface TemplateRegistryEntry {
  id: TemplateId;
  name: string;
  description: string;
  preview?: string; // Preview image URL
  load: () => Promise<PlatformTemplate>;
}
