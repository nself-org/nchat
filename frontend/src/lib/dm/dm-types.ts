/**
 * Direct Message Types - TypeScript definitions for the DM system
 *
 * Supports 1:1 direct messages and group DMs with up to configurable members
 */

// ============================================================================
// Core DM Types
// ============================================================================

export type DMType = "direct" | "group";

export type DMStatus = "active" | "archived" | "deleted";

export type DMNotificationSetting = "all" | "mentions" | "none";

export interface DMParticipant {
  id: string;
  userId: string;
  dmId: string;
  joinedAt: string;
  lastReadAt: string | null;
  lastReadMessageId: string | null;
  notificationSetting: DMNotificationSetting;
  isMuted: boolean;
  mutedUntil: string | null;
  role: "owner" | "admin" | "member";
  user: DMUser;
}

export interface DMUser {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  status: UserStatus;
  statusEmoji: string | null;
  lastSeenAt: string | null;
}

export type UserStatus = "online" | "away" | "busy" | "offline";

export interface DirectMessage {
  id: string;
  type: DMType;
  name: string | null; // null for 1:1, custom name for group DMs
  slug: string;
  description: string | null;
  avatarUrl: string | null; // custom group photo
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  status: DMStatus;
  archivedAt: string | null;
  archivedBy: string | null;

  // Participants
  participants: DMParticipant[];
  participantCount: number;

  // Last message info
  lastMessageId: string | null;
  lastMessageAt: string | null;
  lastMessagePreview: string | null;
  lastMessageUserId: string | null;

  // Settings
  settings: DMSettings;

  // Derived (computed on client)
  otherParticipants?: DMParticipant[]; // excludes current user
  unreadCount?: number;
  hasUnread?: boolean;
}

export interface DMSettings {
  allowReactions: boolean;
  allowAttachments: boolean;
  maxAttachmentSize: number; // in bytes
  allowVoiceMessages: boolean;
  allowVideoMessages: boolean;
  readReceiptsEnabled: boolean;
  typingIndicatorsEnabled: boolean;
}

// ============================================================================
// Group DM Types
// ============================================================================

export interface GroupDM extends DirectMessage {
  type: "group";
  name: string; // Required for group DMs
  maxParticipants: number;
}

export interface GroupDMCreateInput {
  name: string;
  description?: string;
  participantIds: string[];
  avatarUrl?: string;
}

export interface GroupDMUpdateInput {
  name?: string;
  description?: string;
  avatarUrl?: string;
}

// ============================================================================
// DM Message Types
// ============================================================================

export type DMMessageType =
  | "text"
  | "image"
  | "video"
  | "audio"
  | "file"
  | "voice"
  | "sticker"
  | "gif"
  | "system";

export interface DMMessage {
  id: string;
  dmId: string;
  userId: string;
  content: string;
  type: DMMessageType;
  replyToId: string | null;
  forwardedFromId: string | null;
  isEdited: boolean;
  isPinned: boolean;
  isDeleted: boolean;
  deletedAt: string | null;
  createdAt: string;
  editedAt: string | null;

  // Relations
  user: DMUser;
  replyTo: DMMessage | null;
  attachments: DMAttachment[];
  reactions: DMReaction[];
  readReceipts: DMReadReceipt[];
}

export interface DMAttachment {
  id: string;
  messageId: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  fileUrl: string;
  thumbnailUrl: string | null;
  width: number | null;
  height: number | null;
  duration: number | null; // for audio/video
  metadata: Record<string, unknown>;
  createdAt: string;
}

export interface DMReaction {
  id: string;
  messageId: string;
  userId: string;
  emoji: string;
  createdAt: string;
  user: DMUser;
}

export interface DMReadReceipt {
  id: string;
  messageId: string;
  userId: string;
  readAt: string;
  user: DMUser;
}

// ============================================================================
// DM List & Filter Types
// ============================================================================

export type DMFilterType = "all" | "unread" | "starred" | "archived" | "muted";

export type DMSortType = "recent" | "unread" | "alphabetical";

export interface DMFilters {
  type: DMFilterType;
  searchQuery: string;
  participantIds: string[];
}

export interface DMListOptions {
  filters: DMFilters;
  sort: DMSortType;
  limit: number;
  offset: number;
}

// ============================================================================
// Pinned & Shared Content Types
// ============================================================================

export interface DMPinnedMessage {
  id: string;
  dmId: string;
  messageId: string;
  pinnedBy: string;
  pinnedAt: string;
  message: DMMessage;
  pinnedByUser: DMUser;
}

export interface DMSharedFile {
  id: string;
  dmId: string;
  messageId: string;
  attachment: DMAttachment;
  sharedBy: string;
  sharedAt: string;
  user: DMUser;
}

export interface DMMediaItem {
  id: string;
  dmId: string;
  messageId: string;
  type: "image" | "video" | "gif";
  url: string;
  thumbnailUrl: string | null;
  width: number | null;
  height: number | null;
  duration: number | null;
  createdAt: string;
  user: DMUser;
}

// ============================================================================
// Typing & Presence Types
// ============================================================================

export interface DMTypingIndicator {
  dmId: string;
  userId: string;
  startedAt: string;
  expiresAt: string;
  user: DMUser;
}

export interface DMPresence {
  userId: string;
  dmId: string;
  status: "viewing" | "typing" | "idle";
  lastActivityAt: string;
}

// ============================================================================
// Notification Types
// ============================================================================

export interface DMNotificationPreference {
  dmId: string;
  userId: string;
  setting: DMNotificationSetting;
  muteUntil: string | null;
  soundEnabled: boolean;
  desktopEnabled: boolean;
  mobileEnabled: boolean;
  emailEnabled: boolean;
  keywords: string[];
}

// ============================================================================
// Search Types
// ============================================================================

export interface DMSearchResult {
  dm: DirectMessage;
  messages: DMMessage[];
  matchCount: number;
  highlights: DMSearchHighlight[];
}

export interface DMSearchHighlight {
  messageId: string;
  field: "content" | "fileName";
  fragment: string;
  positions: Array<{ start: number; end: number }>;
}

export interface DMSearchOptions {
  query: string;
  dmId?: string;
  fromUserId?: string;
  hasAttachment?: boolean;
  messageTypes?: DMMessageType[];
  dateFrom?: string;
  dateTo?: string;
  limit: number;
  offset: number;
}

// ============================================================================
// Archive Types
// ============================================================================

export interface DMArchiveInfo {
  dmId: string;
  archivedAt: string;
  archivedBy: string;
  reason?: string;
  canUnarchive: boolean;
}

// ============================================================================
// Action Types (for mutations)
// ============================================================================

export interface CreateDMInput {
  participantIds: string[];
}

export interface SendDMMessageInput {
  dmId: string;
  content: string;
  type?: DMMessageType;
  replyToId?: string;
  attachmentIds?: string[];
}

export interface UpdateDMMessageInput {
  messageId: string;
  content: string;
}

export interface AddParticipantsInput {
  dmId: string;
  userIds: string[];
}

export interface RemoveParticipantInput {
  dmId: string;
  userId: string;
}

export interface UpdateDMNotificationInput {
  dmId: string;
  setting: DMNotificationSetting;
  muteUntil?: string | null;
}

// ============================================================================
// Event Types (for subscriptions)
// ============================================================================

export type DMEventType =
  | "message_created"
  | "message_updated"
  | "message_deleted"
  | "message_pinned"
  | "message_unpinned"
  | "reaction_added"
  | "reaction_removed"
  | "participant_joined"
  | "participant_left"
  | "participant_removed"
  | "dm_updated"
  | "dm_archived"
  | "dm_unarchived"
  | "typing_started"
  | "typing_stopped"
  | "read_receipt";

export interface DMEvent {
  type: DMEventType;
  dmId: string;
  userId: string;
  timestamp: string;
  data: Record<string, unknown>;
}

// ============================================================================
// Constants
// ============================================================================

export const DM_CONSTANTS = {
  MAX_GROUP_PARTICIPANTS: 256,
  MAX_MESSAGE_LENGTH: 4000,
  MAX_ATTACHMENT_SIZE: 100 * 1024 * 1024, // 100MB
  MAX_ATTACHMENTS_PER_MESSAGE: 10,
  TYPING_INDICATOR_TIMEOUT: 5000, // 5 seconds
  DEFAULT_PAGE_SIZE: 50,
  MAX_PINNED_MESSAGES: 50,
} as const;
