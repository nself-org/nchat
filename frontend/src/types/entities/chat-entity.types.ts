/**
 * Unified Chat Entity Types
 *
 * Complete type definitions for all chat entity types:
 * - Direct Messages (DM): 1-on-1 private conversations
 * - Groups: Small groups up to 256 members
 * - Supergroups: Large groups up to 100,000+ members (Telegram-style)
 * - Communities: Container for channels/categories (Discord-style)
 * - Channels: One-to-many broadcast (admin-only posting)
 *
 * @module types/entities/chat-entity
 */

// =============================================================================
// ENTITY TYPE ENUMS
// =============================================================================

/**
 * Primary chat entity types
 */
export type ChatEntityType =
  | "dm" // 1-on-1 direct message
  | "group" // Small group (2-256 members)
  | "supergroup" // Large group (up to 100,000+)
  | "community" // Discord-style server/guild
  | "channel"; // Broadcast channel

/**
 * Entity visibility settings
 */
export type EntityVisibility = "private" | "public" | "discoverable";

/**
 * Entity status
 */
export type EntityStatus = "active" | "archived" | "deleted" | "suspended";

/**
 * Member role in an entity
 */
export type EntityMemberRole =
  | "owner" // Full control, can delete entity
  | "admin" // Can manage members, settings
  | "moderator" // Can manage content
  | "member" // Regular participant
  | "subscriber" // Read-only (for channels)
  | "guest"; // Limited access

// =============================================================================
// ENTITY LIMITS
// =============================================================================

/**
 * Limits for each entity type
 */
export const ENTITY_LIMITS = {
  dm: {
    minMembers: 2,
    maxMembers: 2,
    maxPinnedMessages: 5,
    maxAdmins: 0,
    canHaveCategories: false,
    canBroadcast: false,
    hasPublicLink: false,
  },
  group: {
    minMembers: 2,
    maxMembers: 256,
    maxPinnedMessages: 50,
    maxAdmins: 10,
    canHaveCategories: false,
    canBroadcast: false,
    hasPublicLink: true,
  },
  supergroup: {
    minMembers: 2,
    maxMembers: 200_000,
    maxPinnedMessages: 100,
    maxAdmins: 50,
    canHaveCategories: false,
    canBroadcast: true, // Admin-only broadcast mode
    hasPublicLink: true,
  },
  community: {
    minMembers: 1,
    maxMembers: Infinity, // Unlimited
    maxPinnedMessages: 100,
    maxAdmins: 100,
    canHaveCategories: true,
    canBroadcast: true,
    hasPublicLink: true,
    maxChannels: 500,
    maxCategories: 50,
    maxRoles: 250,
  },
  channel: {
    minMembers: 1,
    maxMembers: Infinity, // Unlimited subscribers
    maxPinnedMessages: 100,
    maxAdmins: 50,
    canHaveCategories: false,
    canBroadcast: true, // Always broadcast mode
    hasPublicLink: true,
  },
} as const;

export type EntityLimits = (typeof ENTITY_LIMITS)[ChatEntityType];

// =============================================================================
// ENTITY FEATURES BY TYPE
// =============================================================================

/**
 * Feature flags available per entity type
 */
export interface EntityFeatures {
  // Messaging
  sendMessages: boolean;
  sendMedia: boolean;
  sendVoiceMessages: boolean;
  sendStickers: boolean;
  sendGifs: boolean;
  sendPolls: boolean;

  // Interactions
  reactions: boolean;
  threads: boolean;
  mentions: boolean;
  readReceipts: boolean;
  typingIndicators: boolean;
  messageEditing: boolean;
  messageDeleting: boolean;

  // Media
  voiceCalls: boolean;
  videoCalls: boolean;
  screenSharing: boolean;
  liveStreaming: boolean;

  // Moderation
  slowMode: boolean;
  memberBanning: boolean;
  messagePinning: boolean;
  messageReporting: boolean;
  autoModeration: boolean;

  // Discovery
  publicJoinLink: boolean;
  discoverability: boolean;
  vanityUrl: boolean;

  // Organization
  categories: boolean;
  nestedChannels: boolean;
  roles: boolean;
  permissions: boolean;
}

/**
 * Default features per entity type
 */
export const DEFAULT_ENTITY_FEATURES: Record<ChatEntityType, EntityFeatures> = {
  dm: {
    sendMessages: true,
    sendMedia: true,
    sendVoiceMessages: true,
    sendStickers: true,
    sendGifs: true,
    sendPolls: false,
    reactions: true,
    threads: false,
    mentions: false,
    readReceipts: true,
    typingIndicators: true,
    messageEditing: true,
    messageDeleting: true,
    voiceCalls: true,
    videoCalls: true,
    screenSharing: true,
    liveStreaming: false,
    slowMode: false,
    memberBanning: false,
    messagePinning: true,
    messageReporting: false,
    autoModeration: false,
    publicJoinLink: false,
    discoverability: false,
    vanityUrl: false,
    categories: false,
    nestedChannels: false,
    roles: false,
    permissions: false,
  },
  group: {
    sendMessages: true,
    sendMedia: true,
    sendVoiceMessages: true,
    sendStickers: true,
    sendGifs: true,
    sendPolls: true,
    reactions: true,
    threads: true,
    mentions: true,
    readReceipts: true,
    typingIndicators: true,
    messageEditing: true,
    messageDeleting: true,
    voiceCalls: true,
    videoCalls: true,
    screenSharing: true,
    liveStreaming: false,
    slowMode: true,
    memberBanning: true,
    messagePinning: true,
    messageReporting: true,
    autoModeration: false,
    publicJoinLink: true,
    discoverability: false,
    vanityUrl: false,
    categories: false,
    nestedChannels: false,
    roles: false,
    permissions: true,
  },
  supergroup: {
    sendMessages: true,
    sendMedia: true,
    sendVoiceMessages: true,
    sendStickers: true,
    sendGifs: true,
    sendPolls: true,
    reactions: true,
    threads: true,
    mentions: true,
    readReceipts: false, // Not practical at scale
    typingIndicators: false, // Not practical at scale
    messageEditing: true,
    messageDeleting: true,
    voiceCalls: false, // Use separate voice channels
    videoCalls: false,
    screenSharing: false,
    liveStreaming: true,
    slowMode: true,
    memberBanning: true,
    messagePinning: true,
    messageReporting: true,
    autoModeration: true,
    publicJoinLink: true,
    discoverability: true,
    vanityUrl: true,
    categories: false,
    nestedChannels: false,
    roles: true,
    permissions: true,
  },
  community: {
    sendMessages: true,
    sendMedia: true,
    sendVoiceMessages: true,
    sendStickers: true,
    sendGifs: true,
    sendPolls: true,
    reactions: true,
    threads: true,
    mentions: true,
    readReceipts: false,
    typingIndicators: true,
    messageEditing: true,
    messageDeleting: true,
    voiceCalls: true,
    videoCalls: true,
    screenSharing: true,
    liveStreaming: true,
    slowMode: true,
    memberBanning: true,
    messagePinning: true,
    messageReporting: true,
    autoModeration: true,
    publicJoinLink: true,
    discoverability: true,
    vanityUrl: true,
    categories: true,
    nestedChannels: true,
    roles: true,
    permissions: true,
  },
  channel: {
    sendMessages: false, // Only admins
    sendMedia: false,
    sendVoiceMessages: false,
    sendStickers: false,
    sendGifs: false,
    sendPolls: true, // Polls for subscribers
    reactions: true,
    threads: false,
    mentions: false,
    readReceipts: false,
    typingIndicators: false,
    messageEditing: true,
    messageDeleting: true,
    voiceCalls: false,
    videoCalls: false,
    screenSharing: false,
    liveStreaming: true,
    slowMode: false,
    memberBanning: true,
    messagePinning: true,
    messageReporting: true,
    autoModeration: true,
    publicJoinLink: true,
    discoverability: true,
    vanityUrl: true,
    categories: false,
    nestedChannels: false,
    roles: false,
    permissions: true,
  },
};

// =============================================================================
// BASE ENTITY INTERFACE
// =============================================================================

/**
 * Base interface for all chat entities
 */
export interface BaseChatEntity {
  /** Unique identifier */
  id: string;

  /** Entity type */
  type: ChatEntityType;

  /** Display name */
  name: string;

  /** URL-safe slug */
  slug: string;

  /** Description or topic */
  description: string | null;

  /** Avatar/icon URL */
  avatarUrl: string | null;

  /** Banner/header image URL */
  bannerUrl: string | null;

  /** Visibility setting */
  visibility: EntityVisibility;

  /** Current status */
  status: EntityStatus;

  /** Owner/creator user ID */
  ownerId: string;

  /** Workspace ID (for multi-tenant) */
  workspaceId: string;

  /** Current member count */
  memberCount: number;

  /** Creation timestamp */
  createdAt: string;

  /** Last update timestamp */
  updatedAt: string;

  /** Entity settings */
  settings: EntitySettings;

  /** Feature flags */
  features: Partial<EntityFeatures>;

  /** Metadata for extensions */
  metadata: Record<string, unknown>;
}

/**
 * Common settings for entities
 */
export interface EntitySettings {
  /** Slow mode delay in seconds (0 = disabled) */
  slowModeSeconds: number;

  /** Whether new members are muted by default */
  muteNewMembers: boolean;

  /** Minimum account age to join (in days) */
  minAccountAgeDays: number;

  /** Whether entity is age-restricted */
  isNsfw: boolean;

  /** Default notification level */
  defaultNotificationLevel: "all" | "mentions" | "none";

  /** Who can send messages */
  whoCanSendMessages: "everyone" | "admins" | "no_one";

  /** Who can add members */
  whoCanAddMembers: "everyone" | "admins" | "no_one";

  /** Who can edit entity info */
  whoCanEditInfo: "everyone" | "admins" | "owner";

  /** Message retention days (0 = forever) */
  messageRetentionDays: number;

  /** Whether to show member list */
  showMemberList: boolean;
}

/**
 * Default settings for entities
 */
export const DEFAULT_ENTITY_SETTINGS: EntitySettings = {
  slowModeSeconds: 0,
  muteNewMembers: false,
  minAccountAgeDays: 0,
  isNsfw: false,
  defaultNotificationLevel: "all",
  whoCanSendMessages: "everyone",
  whoCanAddMembers: "admins",
  whoCanEditInfo: "admins",
  messageRetentionDays: 0,
  showMemberList: true,
};

// =============================================================================
// DIRECT MESSAGE ENTITY
// =============================================================================

/**
 * Direct Message (1-on-1) entity
 */
export interface DirectMessageEntity extends BaseChatEntity {
  type: "dm";

  /** Always 2 for DMs */
  memberCount: 2;

  /** The other participant (for display) */
  otherParticipant: EntityMember;

  /** Participant IDs [userId1, userId2] */
  participantIds: [string, string];

  /** Last message preview */
  lastMessage: LastMessagePreview | null;

  /** Archived by user (one-sided) */
  archivedByUserId: string | null;

  /** Pinned by user (one-sided) */
  isPinned: boolean;

  /** Whether encryption is enabled */
  isEncrypted: boolean;
}

// =============================================================================
// GROUP ENTITY
// =============================================================================

/**
 * Group entity (2-256 members)
 */
export interface GroupEntity extends BaseChatEntity {
  type: "group";

  /** Group-specific settings */
  groupSettings: GroupSettings;

  /** Public join link (if enabled) */
  joinLink: string | null;

  /** Join link expiry */
  joinLinkExpiresAt: string | null;

  /** Last message preview */
  lastMessage: LastMessagePreview | null;

  /** Admin user IDs */
  adminIds: string[];

  /** Pinned message IDs */
  pinnedMessageIds: string[];

  /** Whether this can be upgraded to supergroup */
  canUpgradeToSupergroup: boolean;
}

/**
 * Group-specific settings
 */
export interface GroupSettings {
  /** Who can send messages */
  sendMessagesPermission: "everyone" | "admins";

  /** Who can add members */
  addMembersPermission: "everyone" | "admins";

  /** Who can change group info */
  changeInfoPermission: "everyone" | "admins";

  /** Who can pin messages */
  pinMessagesPermission: "everyone" | "admins";

  /** Whether members can invite via link */
  membersCanShareLink: boolean;

  /** Approval required for join requests */
  approvalRequired: boolean;
}

export const DEFAULT_GROUP_SETTINGS: GroupSettings = {
  sendMessagesPermission: "everyone",
  addMembersPermission: "admins",
  changeInfoPermission: "admins",
  pinMessagesPermission: "admins",
  membersCanShareLink: true,
  approvalRequired: false,
};

// =============================================================================
// SUPERGROUP ENTITY
// =============================================================================

/**
 * Supergroup entity (Telegram-style, up to 200,000 members)
 */
export interface SupergroupEntity extends BaseChatEntity {
  type: "supergroup";

  /** Supergroup-specific settings */
  supergroupSettings: SupergroupSettings;

  /** Public username (for discoverable groups) */
  username: string | null;

  /** Public join link */
  joinLink: string | null;

  /** Admin list with permissions */
  admins: SupergroupAdmin[];

  /** Pinned message IDs */
  pinnedMessageIds: string[];

  /** Linked channel ID (for discussion groups) */
  linkedChannelId: string | null;

  /** Last message preview */
  lastMessage: LastMessagePreview | null;

  /** Upgrade info from group */
  upgradedFromGroupId: string | null;
  upgradedAt: string | null;
}

/**
 * Supergroup-specific settings
 */
export interface SupergroupSettings {
  /** Slow mode seconds (0, 10, 30, 60, 300, 900, 3600) */
  slowModeSeconds: 0 | 10 | 30 | 60 | 300 | 900 | 3600;

  /** Whether only admins can send messages */
  restrictedMode: boolean;

  /** Hide member list from non-admins */
  hideMemberList: boolean;

  /** Whether join requests require approval */
  approvalRequired: boolean;

  /** Topics/forum mode enabled */
  forumMode: boolean;

  /** Who can invite via link */
  invitePermission: "everyone" | "admins";

  /** Anti-spam settings */
  antiSpam: {
    enabled: boolean;
    deleteSpam: boolean;
    banSpammers: boolean;
    minAccountAge: number; // days
  };

  /** Content restrictions */
  restrictions: {
    stickersDisabled: boolean;
    gifsDisabled: boolean;
    mediaDisabled: boolean;
    pollsDisabled: boolean;
    linksDisabled: boolean;
  };
}

/**
 * Supergroup admin with granular permissions
 */
export interface SupergroupAdmin {
  userId: string;
  title: string | null;
  addedBy: string;
  addedAt: string;
  permissions: SupergroupAdminPermissions;
}

/**
 * Granular admin permissions
 */
export interface SupergroupAdminPermissions {
  changeInfo: boolean;
  deleteMessages: boolean;
  banUsers: boolean;
  inviteUsers: boolean;
  pinMessages: boolean;
  addAdmins: boolean;
  manageTopics: boolean;
  manageVideoChats: boolean;
  anonymous: boolean;
}

export const DEFAULT_SUPERGROUP_SETTINGS: SupergroupSettings = {
  slowModeSeconds: 0,
  restrictedMode: false,
  hideMemberList: false,
  approvalRequired: false,
  forumMode: false,
  invitePermission: "admins",
  antiSpam: {
    enabled: true,
    deleteSpam: true,
    banSpammers: false,
    minAccountAge: 0,
  },
  restrictions: {
    stickersDisabled: false,
    gifsDisabled: false,
    mediaDisabled: false,
    pollsDisabled: false,
    linksDisabled: false,
  },
};

// =============================================================================
// COMMUNITY ENTITY (Discord-style)
// =============================================================================

/**
 * Community/Server entity (Discord-style)
 */
export interface CommunityEntity extends BaseChatEntity {
  type: "community";

  /** Community-specific settings */
  communitySettings: CommunitySettings;

  /** Vanity URL slug */
  vanityUrl: string | null;

  /** Splash image for invites */
  splashUrl: string | null;

  /** Discovery splash */
  discoverySplashUrl: string | null;

  /** System channel for join/leave messages */
  systemChannelId: string | null;

  /** Rules channel */
  rulesChannelId: string | null;

  /** Welcome channel */
  welcomeChannelId: string | null;

  /** Default channel */
  defaultChannelId: string | null;

  /** Categories in this community */
  categories: CommunityCategory[];

  /** Roles defined in this community */
  roles: CommunityRole[];

  /** Verification level */
  verificationLevel: VerificationLevel;

  /** Content filter level */
  contentFilterLevel: ContentFilterLevel;

  /** Boost tier and count */
  boostTier: 0 | 1 | 2 | 3;
  boostCount: number;

  /** Total channel count */
  channelCount: number;
}

/**
 * Community-specific settings
 */
export interface CommunitySettings {
  /** Who can create channels */
  createChannelsPermission: "admins" | "moderators";

  /** Who can create categories */
  createCategoriesPermission: "admins" | "moderators";

  /** Who can create events */
  createEventsPermission: "everyone" | "admins" | "moderators";

  /** Enable server discovery */
  discoverable: boolean;

  /** Enable community features */
  communityEnabled: boolean;

  /** Welcome screen configuration */
  welcomeScreen: {
    enabled: boolean;
    description: string | null;
    channels: Array<{
      channelId: string;
      description: string;
      emoji: string | null;
    }>;
  };

  /** Default notification settings */
  defaultNotifications: "all" | "mentions" | "nothing";

  /** Whether @everyone is restricted */
  everyoneRestricted: boolean;

  /** Max file upload size (MB) */
  maxFileSizeMb: number;
}

/**
 * Community category (channel folder)
 */
export interface CommunityCategory {
  id: string;
  communityId: string;
  name: string;
  position: number;
  isCollapsed: boolean;
  channelIds: string[];
  permissions: CategoryPermissionOverride[];
}

/**
 * Community role
 */
export interface CommunityRole {
  id: string;
  communityId: string;
  name: string;
  color: string | null;
  icon: string | null;
  position: number; // Higher = more power
  permissions: bigint; // Bitfield
  isDefault: boolean;
  isMentionable: boolean;
  isHoisted: boolean; // Display separately in sidebar
  memberCount: number;
}

/**
 * Category permission override
 */
export interface CategoryPermissionOverride {
  roleId: string;
  allow: bigint;
  deny: bigint;
}

/**
 * Verification levels
 */
export type VerificationLevel =
  | "none" // No restriction
  | "low" // Must have verified email
  | "medium" // Must be registered for 5+ minutes
  | "high" // Must be member for 10+ minutes
  | "very_high"; // Must have verified phone

/**
 * Content filter levels
 */
export type ContentFilterLevel =
  | "disabled" // Don't scan
  | "members_without_roles" // Scan new members
  | "all_members"; // Scan everyone

export const DEFAULT_COMMUNITY_SETTINGS: CommunitySettings = {
  createChannelsPermission: "admins",
  createCategoriesPermission: "admins",
  createEventsPermission: "moderators",
  discoverable: false,
  communityEnabled: true,
  welcomeScreen: {
    enabled: false,
    description: null,
    channels: [],
  },
  defaultNotifications: "mentions",
  everyoneRestricted: true,
  maxFileSizeMb: 25,
};

// =============================================================================
// CHANNEL ENTITY (Broadcast)
// =============================================================================

/**
 * Broadcast channel entity
 */
export interface ChannelEntity extends BaseChatEntity {
  type: "channel";

  /** Channel-specific settings */
  channelSettings: ChannelSettings;

  /** Public username (for discoverable channels) */
  username: string | null;

  /** Public join link */
  joinLink: string | null;

  /** Subscriber count */
  subscriberCount: number;

  /** Admin list */
  admins: ChannelAdmin[];

  /** Linked discussion group ID */
  linkedGroupId: string | null;

  /** Last post preview */
  lastPost: LastMessagePreview | null;

  /** Whether channel is verified */
  isVerified: boolean;

  /** Signature enabled (show admin name on posts) */
  signatureEnabled: boolean;

  /** Content restriction age */
  contentRestriction: "none" | "16+" | "18+";
}

/**
 * Channel-specific settings
 */
export interface ChannelSettings {
  /** Allow comments/reactions */
  allowReactions: boolean;

  /** Show signature on posts */
  showSignature: boolean;

  /** Enable discussion group */
  discussionEnabled: boolean;

  /** Slow mode for linked discussion */
  discussionSlowMode: number;

  /** Who can view subscriber list */
  subscriberListVisibility: "public" | "admins";

  /** Post scheduling enabled */
  schedulingEnabled: boolean;

  /** Silent broadcast (no notification) by default */
  silentBroadcast: boolean;
}

/**
 * Channel admin
 */
export interface ChannelAdmin {
  userId: string;
  title: string | null;
  addedBy: string;
  addedAt: string;
  permissions: ChannelAdminPermissions;
}

/**
 * Channel admin permissions
 */
export interface ChannelAdminPermissions {
  postMessages: boolean;
  editMessages: boolean;
  deleteMessages: boolean;
  inviteSubscribers: boolean;
  manageDiscussion: boolean;
  addAdmins: boolean;
}

export const DEFAULT_CHANNEL_SETTINGS: ChannelSettings = {
  allowReactions: true,
  showSignature: true,
  discussionEnabled: false,
  discussionSlowMode: 0,
  subscriberListVisibility: "public",
  schedulingEnabled: true,
  silentBroadcast: false,
};

// =============================================================================
// SHARED TYPES
// =============================================================================

/**
 * Entity member
 */
export interface EntityMember {
  id: string;
  entityId: string;
  userId: string;
  role: EntityMemberRole;
  joinedAt: string;
  lastReadAt: string | null;
  lastReadMessageId: string | null;
  notificationLevel: "all" | "mentions" | "none";
  isMuted: boolean;
  mutedUntil: string | null;
  isBanned: boolean;
  bannedAt: string | null;
  bannedBy: string | null;
  banReason: string | null;

  // User info
  user: EntityUser;
}

/**
 * User info for display
 */
export interface EntityUser {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  status: "online" | "away" | "busy" | "offline";
  lastSeenAt: string | null;
}

/**
 * Last message preview
 */
export interface LastMessagePreview {
  id: string;
  content: string;
  senderId: string;
  senderName: string;
  timestamp: string;
  hasAttachment: boolean;
  attachmentType: string | null;
}

/**
 * Join request for approval-required entities
 */
export interface EntityJoinRequest {
  id: string;
  entityId: string;
  userId: string;
  requestedAt: string;
  message: string | null;
  status: "pending" | "approved" | "rejected";
  reviewedBy: string | null;
  reviewedAt: string | null;
}

/**
 * Invite link
 */
export interface EntityInviteLink {
  id: string;
  entityId: string;
  code: string;
  createdBy: string;
  createdAt: string;
  expiresAt: string | null;
  maxUses: number | null;
  uses: number;
  isRevoked: boolean;
  isPermanent: boolean;
}

// =============================================================================
// UNION TYPES
// =============================================================================

/**
 * Union of all entity types
 */
export type ChatEntity =
  | DirectMessageEntity
  | GroupEntity
  | SupergroupEntity
  | CommunityEntity
  | ChannelEntity;

/**
 * Entities that support multiple members
 */
export type MultiMemberEntity =
  | GroupEntity
  | SupergroupEntity
  | CommunityEntity
  | ChannelEntity;

/**
 * Entities that support admin roles
 */
export type AdminSupportedEntity =
  | GroupEntity
  | SupergroupEntity
  | CommunityEntity
  | ChannelEntity;

/**
 * Entities that can be broadcast (admin-only posting)
 */
export type BroadcastCapableEntity = SupergroupEntity | ChannelEntity;

// =============================================================================
// INPUT TYPES
// =============================================================================

/**
 * Create DM input
 */
export interface CreateDMInput {
  participantId: string;
}

/**
 * Create group input
 */
export interface CreateGroupInput {
  name: string;
  description?: string;
  avatarUrl?: string;
  participantIds: string[];
  settings?: Partial<GroupSettings>;
}

/**
 * Create supergroup input
 */
export interface CreateSupergroupInput {
  name: string;
  description?: string;
  avatarUrl?: string;
  bannerUrl?: string;
  username?: string;
  visibility?: EntityVisibility;
  settings?: Partial<SupergroupSettings>;
}

/**
 * Create community input
 */
export interface CreateCommunityInput {
  name: string;
  description?: string;
  avatarUrl?: string;
  bannerUrl?: string;
  vanityUrl?: string;
  template?: "blank" | "default" | "community" | "gaming" | "study";
  visibility?: EntityVisibility;
  settings?: Partial<CommunitySettings>;
}

/**
 * Create channel input
 */
export interface CreateChannelInput {
  name: string;
  description?: string;
  avatarUrl?: string;
  username?: string;
  visibility?: EntityVisibility;
  settings?: Partial<ChannelSettings>;
}

/**
 * Upgrade group to supergroup input
 */
export interface UpgradeToSupergroupInput {
  groupId: string;
  reason?: string;
}
