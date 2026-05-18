/**
 * Channel Types for nself-chat
 *
 * Core type definitions for channels, channel members, settings, and categories.
 * Supports public/private channels, direct messages, and group DMs.
 */

import type { UserBasicInfo, UserRole } from "./user";

// ============================================================================
// Channel Type Definitions
// ============================================================================

/**
 * Types of channels available in the system.
 */
export type ChannelType = "public" | "private" | "direct" | "group_dm";

/**
 * Human-readable labels for channel types.
 */
export const ChannelTypeLabels: Record<ChannelType, string> = {
  public: "Public Channel",
  private: "Private Channel",
  direct: "Direct Message",
  group_dm: "Group Direct Message",
} as const;

/**
 * Icons for channel types (emoji representation).
 */
export const ChannelTypeIcons: Record<ChannelType, string> = {
  public: "#",
  private: "🔒",
  direct: "💬",
  group_dm: "👥",
} as const;

/**
 * Channel visibility status.
 */
export type ChannelVisibility = "visible" | "hidden" | "archived";

// ============================================================================
// Channel Category Types
// ============================================================================

/**
 * Channel category for organizing channels.
 */
export interface ChannelCategory {
  /** Unique category identifier */
  id: string;
  /** Category name */
  name: string;
  /** Category description */
  description?: string;
  /** Display order position */
  position: number;
  /** Whether the category is collapsed in the sidebar */
  isCollapsed: boolean;
  /** Channels in this category */
  channelIds: string[];
  /** When the category was created */
  createdAt: Date;
  /** When the category was last updated */
  updatedAt: Date;
}

/**
 * Input for creating a new category.
 */
export interface CreateChannelCategoryInput {
  name: string;
  description?: string;
  position?: number;
}

/**
 * Input for updating a category.
 */
export interface UpdateChannelCategoryInput {
  name?: string;
  description?: string;
  position?: number;
  isCollapsed?: boolean;
}

// ============================================================================
// Channel Settings Types
// ============================================================================

/**
 * Slow mode duration options (in seconds).
 */
export type SlowModeDuration =
  | 0
  | 5
  | 10
  | 15
  | 30
  | 60
  | 120
  | 300
  | 600
  | 900
  | 1800
  | 3600;

/**
 * Channel-specific settings and permissions.
 */
export interface ChannelSettings {
  /** Allow message reactions */
  allowReactions: boolean;
  /** Allow message threads */
  allowThreads: boolean;
  /** Allow file uploads */
  allowFileUploads: boolean;
  /** Allow link previews */
  allowLinkPreviews: boolean;
  /** Allow @everyone mentions */
  allowEveryoneMentions: boolean;
  /** Allow @here mentions */
  allowHereMentions: boolean;
  /** Slow mode delay in seconds (0 = disabled) */
  slowModeDelay: SlowModeDuration;
  /** Auto-archive inactive threads after days (0 = disabled) */
  autoArchiveThreadsDays: 0 | 1 | 3 | 7;
  /** Default message notification level */
  defaultNotificationLevel: ChannelNotificationLevel;
  /** Whether channel is NSFW (age-restricted) */
  isNsfw: boolean;
  /** Minimum role required to send messages */
  minRoleToSend?: UserRole;
  /** Minimum role required to create threads */
  minRoleToThread?: UserRole;
  /** Minimum role required to mention @everyone */
  minRoleToMentionEveryone?: UserRole;
  /** Custom permissions for this channel */
  customPermissions?: ChannelPermissionOverrides[];
}

/**
 * Default channel settings.
 */
export const DefaultChannelSettings: ChannelSettings = {
  allowReactions: true,
  allowThreads: true,
  allowFileUploads: true,
  allowLinkPreviews: true,
  allowEveryoneMentions: false,
  allowHereMentions: true,
  slowModeDelay: 0,
  autoArchiveThreadsDays: 0,
  defaultNotificationLevel: "all",
  isNsfw: false,
};

/**
 * Notification level for a channel.
 */
export type ChannelNotificationLevel = "all" | "mentions" | "none";

/**
 * Permission overrides for a specific role in a channel.
 */
export interface ChannelPermissionOverrides {
  /** Role or user ID this override applies to */
  targetId: string;
  /** Whether this is a role or user override */
  targetType: "role" | "user";
  /** Permissions to allow (overrides deny) */
  allow: Partial<ChannelPermissionFlags>;
  /** Permissions to deny */
  deny: Partial<ChannelPermissionFlags>;
}

/**
 * Channel-specific permission flags.
 */
export interface ChannelPermissionFlags {
  viewChannel: boolean;
  sendMessages: boolean;
  createThreads: boolean;
  sendMessagesInThreads: boolean;
  embedLinks: boolean;
  attachFiles: boolean;
  addReactions: boolean;
  useExternalEmojis: boolean;
  mentionEveryone: boolean;
  manageMessages: boolean;
  manageThreads: boolean;
  readMessageHistory: boolean;
  sendVoiceMessages: boolean;
}

// ============================================================================
// Channel Member Types
// ============================================================================

/**
 * Channel member representing a user's membership in a channel.
 */
export interface ChannelMember {
  /** Channel ID */
  channelId: string;
  /** User ID */
  userId: string;
  /** User information */
  user: UserBasicInfo;
  /** When the user joined the channel */
  joinedAt: Date;
  /** User's notification preferences for this channel */
  notificationLevel: ChannelNotificationLevel;
  /** Whether channel is muted */
  isMuted: boolean;
  /** When mute expires (null = indefinite) */
  mutedUntil?: Date | null;
  /** Whether channel is pinned/favorited */
  isPinned: boolean;
  /** Last message ID the user has read */
  lastReadMessageId?: string;
  /** Last time user read the channel */
  lastReadAt?: Date;
  /** Unread message count */
  unreadCount: number;
  /** Unread mention count */
  unreadMentionCount: number;
  /** Custom nickname in this channel */
  nickname?: string;
}

/**
 * Minimal channel member info for lists.
 */
export type ChannelMemberBasic = Pick<
  ChannelMember,
  "channelId" | "userId" | "joinedAt" | "notificationLevel" | "isMuted"
> & {
  user: UserBasicInfo;
};

// ============================================================================
// Channel Invite Types
// ============================================================================

/**
 * Channel invite link.
 */
export interface ChannelInvite {
  /** Unique invite code */
  code: string;
  /** Channel ID */
  channelId: string;
  /** User who created the invite */
  createdBy: string;
  /** When the invite was created */
  createdAt: Date;
  /** When the invite expires (null = never) */
  expiresAt?: Date | null;
  /** Maximum number of uses (null = unlimited) */
  maxUses?: number | null;
  /** Current number of times used */
  uses: number;
  /** Whether the invite is active */
  isActive: boolean;
  /** Whether to grant temporary membership */
  isTemporary: boolean;
}

/**
 * Input for creating a channel invite.
 */
export interface CreateChannelInviteInput {
  channelId: string;
  /** Duration in seconds (null = never expires) */
  expiresIn?: number | null;
  maxUses?: number | null;
  isTemporary?: boolean;
}

// ============================================================================
// Main Channel Interface
// ============================================================================

/**
 * Core Channel interface representing a chat channel.
 */
export interface Channel {
  /** Unique channel identifier */
  id: string;
  /** Channel name (for public/private channels) */
  name: string;
  /** Channel description */
  description?: string;
  /** Channel topic (displayed in header) */
  topic?: string;
  /** Channel type */
  type: ChannelType;
  /** Channel visibility */
  visibility: ChannelVisibility;
  /** Channel icon URL or emoji */
  icon?: string;
  /** Category this channel belongs to */
  categoryId?: string;
  /** Display order within category */
  position: number;
  /** Channel creator */
  createdBy: string;
  /** When the channel was created */
  createdAt: Date;
  /** When the channel was last updated */
  updatedAt: Date;
  /** Channel settings */
  settings: ChannelSettings;
  /** Number of members (cached) */
  memberCount: number;
  /** Last message timestamp */
  lastMessageAt?: Date;
  /** Last message ID */
  lastMessageId?: string;
  /** Whether channel is default (users auto-join) */
  isDefault: boolean;
  /** Whether channel is read-only (announcements) */
  isReadOnly: boolean;
  /** Whether channel is archived */
  isArchived: boolean;
  /** When channel was archived */
  archivedAt?: Date;
  /** Who archived the channel */
  archivedBy?: string;
  /** Pinned message IDs */
  pinnedMessageIds?: string[];
}

/**
 * Direct message channel with participant information.
 */
export interface DirectMessageChannel extends Omit<Channel, "name" | "type"> {
  type: "direct";
  /** The other participant (for display) */
  participant: UserBasicInfo;
  /** Participants in the DM */
  participantIds: [string, string];
}

/**
 * Group DM channel with participant information.
 */
export interface GroupDMChannel extends Omit<Channel, "type"> {
  type: "group_dm";
  /** All participants in the group */
  participants: UserBasicInfo[];
  /** Participant user IDs */
  participantIds: string[];
  /** Owner of the group DM */
  ownerId: string;
}

/**
 * Union type for all channel variations.
 */
export type AnyChannel = Channel | DirectMessageChannel | GroupDMChannel;

// ============================================================================
// Channel State Types
// ============================================================================

/**
 * Channel with current user's membership info.
 */
export interface ChannelWithMembership extends Channel {
  /** Current user's membership */
  membership?: ChannelMember;
  /** Whether current user is a member */
  isMember: boolean;
}

/**
 * Channel list item for sidebar display.
 */
export interface ChannelListItem {
  /** Channel ID */
  id: string;
  /** Channel name */
  name: string;
  /** Channel type */
  type: ChannelType;
  /** Channel icon */
  icon?: string;
  /** Unread count */
  unreadCount: number;
  /** Unread mention count */
  unreadMentionCount: number;
  /** Whether channel is muted */
  isMuted: boolean;
  /** Whether channel is pinned */
  isPinned: boolean;
  /** Last message preview */
  lastMessage?: {
    content: string;
    authorName: string;
    timestamp: Date;
  };
  /** Category ID (for organization) */
  categoryId?: string;
  /** Position for sorting */
  position: number;
  /** Whether channel is active/selected */
  isActive?: boolean;
}

/**
 * Thread channel (message thread).
 */
export interface Thread {
  /** Thread ID (same as root message ID) */
  id: string;
  /** Parent channel ID */
  channelId: string;
  /** Root message ID */
  rootMessageId: string;
  /** Thread name (from root message preview) */
  name: string;
  /** Thread owner (root message author) */
  ownerId: string;
  /** Number of replies */
  replyCount: number;
  /** Participating users */
  participantIds: string[];
  /** Last reply timestamp */
  lastReplyAt?: Date;
  /** Last reply user ID */
  lastReplyUserId?: string;
  /** When thread was created */
  createdAt: Date;
  /** Whether thread is archived */
  isArchived: boolean;
  /** Whether thread is locked (no new replies) */
  isLocked: boolean;
}

// ============================================================================
// Input Types
// ============================================================================

/**
 * Input for creating a new channel.
 */
export interface CreateChannelInput {
  name: string;
  type: ChannelType;
  description?: string;
  topic?: string;
  icon?: string;
  categoryId?: string;
  isDefault?: boolean;
  isReadOnly?: boolean;
  settings?: Partial<ChannelSettings>;
  /** Initial member IDs (for private/group_dm) */
  memberIds?: string[];
}

/**
 * Input for updating a channel.
 */
export interface UpdateChannelInput {
  name?: string;
  description?: string;
  topic?: string;
  icon?: string;
  categoryId?: string;
  position?: number;
  isDefault?: boolean;
  isReadOnly?: boolean;
  settings?: Partial<ChannelSettings>;
}

/**
 * Input for creating a direct message channel.
 */
export interface CreateDirectMessageInput {
  /** User ID to start DM with */
  userId: string;
}

/**
 * Input for creating a group DM.
 */
export interface CreateGroupDMInput {
  name?: string;
  icon?: string;
  /** User IDs to include (2-10 users) */
  userIds: string[];
}

// ============================================================================
// Filter and Query Types
// ============================================================================

/**
 * Channel search/filter criteria.
 */
export interface ChannelFilter {
  /** Search by name or description */
  search?: string;
  /** Filter by channel types */
  types?: ChannelType[];
  /** Filter by category */
  categoryId?: string;
  /** Include archived channels */
  includeArchived?: boolean;
  /** Only channels user is a member of */
  onlyJoined?: boolean;
  /** Only channels with unread messages */
  onlyUnread?: boolean;
  /** Only pinned channels */
  onlyPinned?: boolean;
}

/**
 * Channel sort options.
 */
export type ChannelSortBy =
  | "name"
  | "created"
  | "lastMessage"
  | "memberCount"
  | "position";

/**
 * Channel sort order.
 */
export interface ChannelSortOptions {
  sortBy: ChannelSortBy;
  sortOrder: "asc" | "desc";
}

// ============================================================================
// Channel Event Types
// ============================================================================

/**
 * Channel update event types.
 */
export type ChannelUpdateType =
  | "created"
  | "updated"
  | "deleted"
  | "archived"
  | "unarchived"
  | "member_joined"
  | "member_left"
  | "member_updated"
  | "settings_updated"
  | "topic_changed"
  | "pinned_messages_changed";

/**
 * Channel update event payload.
 */
export interface ChannelUpdateEvent {
  type: ChannelUpdateType;
  channelId: string;
  channel?: Channel;
  userId?: string;
  member?: ChannelMember;
  previousValue?: unknown;
  newValue?: unknown;
  timestamp: Date;
}

// ============================================================================
// Utility Types
// ============================================================================

/**
 * Check if a channel is a DM or group DM.
 */
export function isDirectMessage(
  channel: AnyChannel,
): channel is DirectMessageChannel | GroupDMChannel {
  return channel.type === "direct" || channel.type === "group_dm";
}

/**
 * Check if a channel is a regular channel.
 */
export function isRegularChannel(channel: AnyChannel): channel is Channel {
  return channel.type === "public" || channel.type === "private";
}

/**
 * Get display name for a channel (handles DMs).
 */
export function getChannelDisplayName(
  channel: AnyChannel,
  currentUserId?: string,
): string {
  if (channel.type === "direct") {
    const dmChannel = channel as DirectMessageChannel;
    return dmChannel.participant?.displayName || "Direct Message";
  }
  if (channel.type === "group_dm") {
    const groupChannel = channel as GroupDMChannel;
    if (groupChannel.name) return groupChannel.name;
    const otherParticipants = groupChannel.participants?.filter(
      (p) => p.id !== currentUserId,
    );
    return (
      otherParticipants?.map((p) => p.displayName).join(", ") || "Group Chat"
    );
  }
  return channel.name;
}
