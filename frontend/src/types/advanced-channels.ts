/**
 * Advanced Channel Types - Tasks 60-65
 *
 * Type definitions for:
 * - Channel categories with ordering
 * - Guild/server structures
 * - Telegram-style supergroups/gigagroups
 * - WhatsApp-style communities
 * - Broadcast lists
 * - Permission overrides (bitfield-based)
 */

import type { UserRole } from "./user";

// =============================================================================
// ENUMS
// =============================================================================

export type ChannelSubtype =
  | "standard"
  | "supergroup" // Telegram: >200 members
  | "gigagroup" // Telegram: admin-only posting
  | "community_announcement" // WhatsApp: announcement channel
  | "news"; // Discord: news channel

export type BroadcastSubscriptionStatus = "active" | "unsubscribed" | "blocked";

export type SubscriptionMode = "open" | "invite" | "admin";

export type PermissionTarget = "role" | "user";

// =============================================================================
// CATEGORIES
// =============================================================================

export interface ChannelCategory {
  id: string;
  workspaceId: string;
  name: string;
  description?: string;
  icon?: string;
  color?: string;
  position: number;
  defaultPermissions: bigint;
  syncPermissions: boolean;
  isSystem: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCategoryInput {
  workspaceId: string;
  name: string;
  description?: string;
  icon?: string;
  color?: string;
  position?: number;
  defaultPermissions?: bigint;
  syncPermissions?: boolean;
}

export interface UpdateCategoryInput {
  name?: string;
  description?: string;
  icon?: string;
  color?: string;
  position?: number;
  defaultPermissions?: bigint;
  syncPermissions?: boolean;
}

export interface CategoryWithChannels extends ChannelCategory {
  channels: Channel[];
  channelCount: number;
}

// =============================================================================
// WORKSPACE / GUILD ENHANCEMENTS
// =============================================================================

export interface WorkspaceEnhancements {
  vanityUrl?: string;
  splashUrl?: string;
  discoverySplashUrl?: string;
  isDiscoverable: boolean;
  verificationLevel: number;
  explicitContentFilter: number;
  systemChannelId?: string;
  rulesChannelId?: string;
  memberCount: number;
  boostTier: number;
  boostCount: number;
}

export interface Workspace {
  id: string;
  organizationId: string;
  name: string;
  slug: string;
  description?: string;
  iconUrl?: string;
  bannerUrl?: string;
  settings: Record<string, unknown>;
  features: Record<string, unknown>;
  maxMembers: number;
  maxChannels: number;
  maxFileSizeMb: number;
  ownerId: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;

  // Guild enhancements
  vanityUrl?: string;
  splashUrl?: string;
  discoverySplashUrl?: string;
  isDiscoverable: boolean;
  verificationLevel: number;
  explicitContentFilter: number;
  systemChannelId?: string;
  rulesChannelId?: string;
  memberCount: number;
  boostTier: number;
  boostCount: number;
}

// =============================================================================
// CHANNELS (EXTENDED)
// =============================================================================

export interface Channel {
  id: string;
  workspaceId: string;
  categoryId?: string;
  name: string;
  slug: string;
  description?: string;
  topic?: string;
  icon?: string;
  type:
    | "public"
    | "private"
    | "direct"
    | "group"
    | "broadcast"
    | "voice"
    | "stage"
    | "forum";
  subtype?: ChannelSubtype;
  isPrivate: boolean;
  isArchived: boolean;
  isDefault: boolean;
  isReadonly: boolean;
  isNsfw: boolean;
  maxMembers: number;
  slowmodeSeconds: number;
  bannerUrl?: string;
  position: number;
  permissionSyncId?: string;
  creatorId: string;
  lastMessageAt?: string;
  lastMessageId?: string;
  messageCount: number;
  memberCount: number;
  createdAt: string;
  updatedAt: string;
  archivedAt?: string;
}

export interface CreateChannelInput {
  workspaceId: string;
  categoryId?: string;
  name: string;
  slug?: string;
  description?: string;
  topic?: string;
  icon?: string;
  type:
    | "public"
    | "private"
    | "direct"
    | "group"
    | "broadcast"
    | "voice"
    | "stage"
    | "forum";
  subtype?: ChannelSubtype;
  isPrivate?: boolean;
  isDefault?: boolean;
  isReadonly?: boolean;
  isNsfw?: boolean;
  maxMembers?: number;
  slowmodeSeconds?: number;
  bannerUrl?: string;
  position?: number;
  memberIds?: string[];
}

// =============================================================================
// PERMISSION OVERRIDES
// =============================================================================

// Permission flags (bitfield positions)
export const CHANNEL_PERMISSIONS = {
  VIEW_CHANNEL: 1n << 0n,
  READ_MESSAGE_HISTORY: 1n << 1n,
  SEND_MESSAGES: 1n << 2n,
  SEND_MESSAGES_IN_THREADS: 1n << 3n,
  EMBED_LINKS: 1n << 4n,
  ATTACH_FILES: 1n << 5n,
  ADD_REACTIONS: 1n << 6n,
  USE_EXTERNAL_EMOJIS: 1n << 7n,
  USE_EXTERNAL_STICKERS: 1n << 8n,
  MENTION_EVERYONE: 1n << 9n,
  MENTION_ROLES: 1n << 10n,
  CREATE_PUBLIC_THREADS: 1n << 11n,
  CREATE_PRIVATE_THREADS: 1n << 12n,
  CONNECT: 1n << 13n,
  SPEAK: 1n << 14n,
  VIDEO: 1n << 15n,
  USE_SOUNDBOARD: 1n << 16n,
  USE_VOICE_ACTIVITY: 1n << 17n,
  PRIORITY_SPEAKER: 1n << 18n,
  MUTE_MEMBERS: 1n << 19n,
  DEAFEN_MEMBERS: 1n << 20n,
  MOVE_MEMBERS: 1n << 21n,
  MANAGE_MESSAGES: 1n << 22n,
  MANAGE_THREADS: 1n << 23n,
  MANAGE_CHANNEL: 1n << 24n,
  SEND_VOICE_MESSAGES: 1n << 25n,
  SEND_POLLS: 1n << 26n,
  USE_APPLICATION_COMMANDS: 1n << 27n,
} as const;

export type ChannelPermission = keyof typeof CHANNEL_PERMISSIONS;

export interface ChannelPermissionOverride {
  id: string;
  channelId: string;
  targetType: PermissionTarget;
  targetId: string;
  allowPermissions: bigint;
  denyPermissions: bigint;
  createdAt: string;
  createdBy: string;
  expiresAt?: string;
}

export interface CreatePermissionOverrideInput {
  channelId: string;
  targetType: PermissionTarget;
  targetId: string;
  allowPermissions: bigint;
  denyPermissions: bigint;
  expiresAt?: string;
}

export interface PermissionContext {
  workspace: Workspace;
  channel: Channel;
  category?: ChannelCategory;
  userRoles: string[];
  userOverrides: ChannelPermissionOverride[];
  roleOverrides: ChannelPermissionOverride[];
}

// =============================================================================
// COMMUNITIES (WhatsApp-style)
// =============================================================================

export interface Community {
  id: string;
  workspaceId: string;
  name: string;
  description?: string;
  iconUrl?: string;
  announcementChannelId: string;
  addGroupsPermission: "admin" | "member";
  membersCanInvite: boolean;
  approvalRequired: boolean;
  eventsEnabled: boolean;
  maxGroups: number;
  maxMembers: number;
  groupCount: number;
  totalMemberCount: number;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCommunityInput {
  workspaceId: string;
  name: string;
  description?: string;
  iconUrl?: string;
  addGroupsPermission?: "admin" | "member";
  membersCanInvite?: boolean;
  approvalRequired?: boolean;
  eventsEnabled?: boolean;
  maxGroups?: number;
  maxMembers?: number;
}

export interface CommunityGroup {
  communityId: string;
  channelId: string;
  position: number;
  addedAt: string;
  addedBy: string;
}

export interface CommunityWithGroups extends Community {
  announcementChannel: Channel;
  groups: Array<CommunityGroup & { channel: Channel }>;
}

// =============================================================================
// BROADCAST LISTS
// =============================================================================

export interface BroadcastList {
  id: string;
  workspaceId: string;
  name: string;
  description?: string;
  icon?: string;
  ownerId: string;
  subscriptionMode: SubscriptionMode;
  allowReplies: boolean;
  showSenderName: boolean;
  trackDelivery: boolean;
  trackReads: boolean;
  maxSubscribers: number;
  subscriberCount: number;
  totalMessagesSent: number;
  lastBroadcastAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateBroadcastListInput {
  workspaceId: string;
  name: string;
  description?: string;
  icon?: string;
  subscriptionMode?: SubscriptionMode;
  allowReplies?: boolean;
  showSenderName?: boolean;
  trackDelivery?: boolean;
  trackReads?: boolean;
  maxSubscribers?: number;
}

export interface BroadcastSubscriber {
  broadcastListId: string;
  userId: string;
  subscribedAt: string;
  subscribedBy?: string;
  notificationsEnabled: boolean;
  status: BroadcastSubscriptionStatus;
  unsubscribedAt?: string;
}

export interface BroadcastMessage {
  id: string;
  broadcastListId: string;
  content: string;
  attachments: unknown[];
  sentBy: string;
  sentAt: string;
  scheduledFor?: string;
  isScheduled: boolean;
  totalRecipients: number;
  deliveredCount: number;
  readCount: number;
  failedCount: number;
}

export interface SendBroadcastInput {
  broadcastListId: string;
  content: string;
  attachments?: unknown[];
  scheduledFor?: string;
}

export interface BroadcastDelivery {
  id: string;
  broadcastMessageId: string;
  userId: string;
  status: "pending" | "delivered" | "read" | "failed";
  deliveredAt?: string;
  readAt?: string;
  failedAt?: string;
  errorMessage?: string;
}

export interface BroadcastMessageWithDelivery extends BroadcastMessage {
  deliveries: BroadcastDelivery[];
}

// =============================================================================
// CHANNEL INVITES
// =============================================================================

export interface ChannelInvite {
  id: string;
  code: string;
  workspaceId?: string;
  channelId?: string;
  createdBy: string;
  createdAt: string;
  expiresAt?: string;
  maxUses: number;
  uses: number;
  isTemporary: boolean;
  isActive: boolean;
}

export interface CreateInviteInput {
  workspaceId?: string;
  channelId?: string;
  maxUses?: number;
  expiresAt?: string;
  isTemporary?: boolean;
}

export interface InviteWithMetadata extends ChannelInvite {
  workspace?: Workspace;
  channel?: Channel;
  creator: {
    id: string;
    username: string;
    displayName: string;
    avatarUrl?: string;
  };
}

// =============================================================================
// HELPER TYPES
// =============================================================================

export interface ReorderCategoriesInput {
  workspaceId: string;
  categoryIds: string[];
}

export interface ReorderChannelsInput {
  categoryId?: string;
  channelIds: string[];
}

export interface MoveChannelInput {
  channelId: string;
  categoryId?: string;
  position?: number;
}

export interface PromoteToSupergroupInput {
  channelId: string;
  reason?: string;
}

export interface AddCommunityGroupInput {
  communityId: string;
  channelId: string;
  position?: number;
}

export interface BulkAddMembersInput {
  channelId: string;
  userIds: string[];
  role?: UserRole;
}

export interface BulkSubscribersInput {
  broadcastListId: string;
  userIds: string[];
}

// =============================================================================
// QUERY FILTERS
// =============================================================================

export interface CategoryFilters {
  workspaceId: string;
  includeSystem?: boolean;
}

export interface ChannelFilters {
  workspaceId?: string;
  categoryId?: string;
  type?: string;
  subtype?: ChannelSubtype;
  includeArchived?: boolean;
  isPrivate?: boolean;
  isNsfw?: boolean;
}

export interface CommunityFilters {
  workspaceId: string;
  includeGroups?: boolean;
}

export interface BroadcastListFilters {
  workspaceId: string;
  ownerId?: string;
}

// =============================================================================
// RESPONSE TYPES
// =============================================================================

export interface CategoryResponse {
  category: ChannelCategory;
  channels?: Channel[];
}

export interface CommunityResponse {
  community: Community;
  announcementChannel: Channel;
  groups?: Array<CommunityGroup & { channel: Channel }>;
}

export interface BroadcastResponse {
  broadcastList: BroadcastList;
  subscribers?: BroadcastSubscriber[];
}

export interface InviteResponse {
  invite: ChannelInvite;
  workspace?: Workspace;
  channel?: Channel;
}
