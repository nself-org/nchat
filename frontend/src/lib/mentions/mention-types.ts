/**
 * Mention Types - TypeScript type definitions for the mention system
 *
 * This file contains all type definitions for mentions including:
 * - User mentions (@username)
 * - Channel mentions (#channel)
 * - Group mentions (@everyone, @here, @channel)
 * - Role mentions (@role)
 */

// ============================================================================
// Core Mention Types
// ============================================================================

/**
 * Types of mentions supported in the system
 */
export type MentionType = "user" | "channel" | "everyone" | "here" | "role";

/**
 * Character triggers for different mention types
 */
export const MENTION_TRIGGERS = {
  user: "@",
  channel: "#",
  everyone: "@everyone",
  here: "@here",
  role: "@",
} as const;

/**
 * Special group mention identifiers
 */
export const SPECIAL_MENTIONS = {
  everyone: "everyone",
  here: "here",
  channel: "channel",
} as const;

export type SpecialMentionType = keyof typeof SPECIAL_MENTIONS;

// ============================================================================
// User Mention Types
// ============================================================================

/**
 * User data for mention autocomplete
 */
export interface MentionableUser {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  presence?: "online" | "away" | "dnd" | "offline";
  role?: string;
  isBot?: boolean;
}

/**
 * User mention data stored in a message
 */
export interface UserMentionData {
  type: "user";
  userId: string;
  username: string;
  displayName: string;
}

// ============================================================================
// Channel Mention Types
// ============================================================================

/**
 * Channel data for mention autocomplete
 */
export interface MentionableChannel {
  id: string;
  name: string;
  slug: string;
  type: "public" | "private" | "direct" | "group";
  icon?: string | null;
  description?: string | null;
  isArchived?: boolean;
}

/**
 * Channel mention data stored in a message
 */
export interface ChannelMentionData {
  type: "channel";
  channelId: string;
  channelName: string;
  channelSlug: string;
}

// ============================================================================
// Group Mention Types
// ============================================================================

/**
 * Group mention data (@everyone, @here, @channel)
 */
export interface GroupMentionData {
  type: "everyone" | "here" | "channel";
}

/**
 * Information about a group mention
 */
export interface GroupMentionInfo {
  type: SpecialMentionType;
  label: string;
  description: string;
  icon: string;
  affectsCount: "all" | "online" | "channel";
}

/**
 * Group mention definitions
 */
export const GROUP_MENTIONS: Record<SpecialMentionType, GroupMentionInfo> = {
  everyone: {
    type: "everyone",
    label: "@everyone",
    description: "Notify all members in this workspace",
    icon: "users",
    affectsCount: "all",
  },
  here: {
    type: "here",
    label: "@here",
    description: "Notify online members only",
    icon: "radio",
    affectsCount: "online",
  },
  channel: {
    type: "channel",
    label: "@channel",
    description: "Notify all members in this channel",
    icon: "hash",
    affectsCount: "channel",
  },
};

// ============================================================================
// Role Mention Types
// ============================================================================

/**
 * Role data for mention autocomplete
 */
export interface MentionableRole {
  id: string;
  name: string;
  color?: string;
  memberCount: number;
}

/**
 * Role mention data stored in a message
 */
export interface RoleMentionData {
  type: "role";
  roleId: string;
  roleName: string;
}

// ============================================================================
// Parsed Mention Types
// ============================================================================

/**
 * A parsed mention from message content
 */
export interface ParsedMention {
  /** The type of mention */
  type: MentionType;
  /** The raw text matched (e.g., "@john" or "#general") */
  raw: string;
  /** The extracted identifier (e.g., "john" or "general") */
  identifier: string;
  /** Start position in the text */
  start: number;
  /** End position in the text */
  end: number;
  /** Resolved data (user, channel, etc.) - may be undefined if unresolved */
  data?:
    | UserMentionData
    | ChannelMentionData
    | GroupMentionData
    | RoleMentionData;
}

/**
 * Result of parsing mentions from content
 */
export interface ParsedMentionResult {
  /** All mentions found in the content */
  mentions: ParsedMention[];
  /** User IDs mentioned */
  userIds: string[];
  /** Channel IDs mentioned */
  channelIds: string[];
  /** Role IDs mentioned */
  roleIds: string[];
  /** Whether @everyone was used */
  hasEveryone: boolean;
  /** Whether @here was used */
  hasHere: boolean;
  /** Whether @channel was used */
  hasChannel: boolean;
}

// ============================================================================
// Mention Suggestion Types
// ============================================================================

/**
 * Types of suggestions that can be shown in autocomplete
 */
export type SuggestionType = "user" | "channel" | "group" | "role";

/**
 * A suggestion item for the autocomplete dropdown
 */
export interface MentionSuggestion {
  type: SuggestionType;
  id: string;
  label: string;
  sublabel?: string;
  icon?: string;
  avatarUrl?: string;
  color?: string;
  presence?: "online" | "away" | "dnd" | "offline";
  data:
    | MentionableUser
    | MentionableChannel
    | GroupMentionInfo
    | MentionableRole;
}

// ============================================================================
// Mention Notification Types
// ============================================================================

/**
 * A mention notification
 */
export interface MentionNotification {
  id: string;
  mentionId: string;
  messageId: string;
  channelId: string;
  channelName: string;
  channelSlug: string;
  senderUserId: string;
  senderUsername: string;
  senderDisplayName: string;
  senderAvatarUrl: string | null;
  mentionType: MentionType;
  messagePreview: string;
  isRead: boolean;
  readAt: string | null;
  createdAt: string;
}

// ============================================================================
// Mention Settings Types
// ============================================================================

/**
 * User preferences for mentions
 */
export interface MentionPreferences {
  /** Whether to receive notifications for direct mentions */
  notifyOnMention: boolean;
  /** Whether to receive notifications for @everyone */
  notifyOnEveryone: boolean;
  /** Whether to receive notifications for @here */
  notifyOnHere: boolean;
  /** Whether to receive notifications for @channel */
  notifyOnChannel: boolean;
  /** Whether to highlight mentions in messages */
  highlightMentions: boolean;
  /** Custom highlight color for mentions (CSS color) */
  highlightColor?: string;
  /** Sound for mention notifications */
  mentionSound: "default" | "subtle" | "none";
  /** Whether to show mention badge in sidebar */
  showMentionBadge: boolean;
}

/**
 * Default mention preferences
 */
export const DEFAULT_MENTION_PREFERENCES: MentionPreferences = {
  notifyOnMention: true,
  notifyOnEveryone: true,
  notifyOnHere: true,
  notifyOnChannel: true,
  highlightMentions: true,
  highlightColor: undefined,
  mentionSound: "default",
  showMentionBadge: true,
};

/**
 * Channel-level mention settings (admin controlled)
 */
export interface ChannelMentionSettings {
  /** Whether @everyone is allowed in this channel */
  allowEveryone: boolean;
  /** Whether @here is allowed in this channel */
  allowHere: boolean;
  /** Whether @channel is allowed in this channel */
  allowChannel: boolean;
  /** Minimum role required to use @everyone */
  everyoneMinRole: "owner" | "admin" | "moderator" | "member";
  /** Minimum role required to use @here */
  hereMinRole: "owner" | "admin" | "moderator" | "member";
  /** Minimum role required to use @channel */
  channelMinRole: "owner" | "admin" | "moderator" | "member";
}

/**
 * Default channel mention settings
 */
export const DEFAULT_CHANNEL_MENTION_SETTINGS: ChannelMentionSettings = {
  allowEveryone: true,
  allowHere: true,
  allowChannel: true,
  everyoneMinRole: "admin",
  hereMinRole: "moderator",
  channelMinRole: "moderator",
};

// ============================================================================
// Mention Permission Types
// ============================================================================

/**
 * Permissions for using different mention types
 */
export interface MentionPermissions {
  canMentionUsers: boolean;
  canMentionChannels: boolean;
  canMentionEveryone: boolean;
  canMentionHere: boolean;
  canMentionChannel: boolean;
  canMentionRoles: boolean;
}

/**
 * Default permissions (most permissive)
 */
export const DEFAULT_MENTION_PERMISSIONS: MentionPermissions = {
  canMentionUsers: true,
  canMentionChannels: true,
  canMentionEveryone: false,
  canMentionHere: false,
  canMentionChannel: false,
  canMentionRoles: false,
};

// ============================================================================
// Autocomplete State Types
// ============================================================================

/**
 * State for the mention autocomplete
 */
export interface MentionAutocompleteState {
  /** Whether the autocomplete is open */
  isOpen: boolean;
  /** Current search query */
  query: string;
  /** Current trigger character ('@' or '#') */
  trigger: "@" | "#" | null;
  /** Current suggestions */
  suggestions: MentionSuggestion[];
  /** Currently selected index */
  selectedIndex: number;
  /** Loading state */
  isLoading: boolean;
  /** Error message */
  error: string | null;
  /** Position for the popup */
  position: { top: number; left: number } | null;
}

/**
 * Initial autocomplete state
 */
export const INITIAL_AUTOCOMPLETE_STATE: MentionAutocompleteState = {
  isOpen: false,
  query: "",
  trigger: null,
  suggestions: [],
  selectedIndex: 0,
  isLoading: false,
  error: null,
  position: null,
};

// ============================================================================
// Mention Render Types
// ============================================================================

/**
 * Render mode for mentions in messages
 */
export type MentionRenderMode = "chip" | "inline" | "link";

/**
 * Props for rendering a mention
 */
export interface MentionRenderProps {
  type: MentionType;
  data:
    | UserMentionData
    | ChannelMentionData
    | GroupMentionData
    | RoleMentionData;
  mode: MentionRenderMode;
  isCurrentUser: boolean;
  onClick?: () => void;
  className?: string;
}

// ============================================================================
// Type Guards
// ============================================================================

/**
 * Check if a mention is a user mention
 */
export function isUserMention(
  data:
    | UserMentionData
    | ChannelMentionData
    | GroupMentionData
    | RoleMentionData,
): data is UserMentionData {
  return data.type === "user";
}

/**
 * Check if a mention is a channel mention
 */
export function isChannelMention(
  data:
    | UserMentionData
    | ChannelMentionData
    | GroupMentionData
    | RoleMentionData,
): data is ChannelMentionData {
  return data.type === "channel";
}

/**
 * Check if a mention is a group mention
 */
export function isGroupMention(
  data:
    | UserMentionData
    | ChannelMentionData
    | GroupMentionData
    | RoleMentionData,
): data is GroupMentionData {
  return (
    data.type === "everyone" || data.type === "here" || data.type === "channel"
  );
}

/**
 * Check if a mention is a role mention
 */
export function isRoleMention(
  data:
    | UserMentionData
    | ChannelMentionData
    | GroupMentionData
    | RoleMentionData,
): data is RoleMentionData {
  return data.type === "role";
}

/**
 * Check if a string is a special mention
 */
export function isSpecialMention(text: string): boolean {
  const lower = text.toLowerCase();
  return lower === "everyone" || lower === "here" || lower === "channel";
}
