/**
 * Message Types for nself-chat
 *
 * Core type definitions for messages, reactions, attachments, threads, and related entities.
 * This is the central type file for all messaging functionality.
 */

import type { UserBasicInfo, UserPresenceStatus } from "./user";

// ============================================================================
// User Types (for messages)
// ============================================================================

/**
 * Minimal user info for message display.
 */
export interface MessageUser {
  /** User ID */
  id: string;
  /** Unique username */
  username: string;
  /** Display name */
  displayName: string;
  /** Avatar URL */
  avatarUrl?: string;
  /** Current presence status */
  status?: UserPresenceStatus;
  /** User role */
  role?: "owner" | "admin" | "moderator" | "member" | "guest";
}

// ============================================================================
// Reaction Types
// ============================================================================

/**
 * Reaction on a message.
 */
export interface Reaction {
  /** Emoji character or custom emoji ID */
  emoji: string;
  /** Whether this is a custom emoji */
  isCustomEmoji?: boolean;
  /** Custom emoji URL (if custom) */
  customEmojiUrl?: string;
  /** Number of users who reacted */
  count: number;
  /** Users who reacted */
  users: MessageUser[];
  /** Whether current user has reacted with this emoji */
  hasReacted: boolean;
}

/**
 * Reaction add/remove event.
 */
export interface ReactionEvent {
  messageId: string;
  channelId: string;
  emoji: string;
  userId: string;
  user: MessageUser;
  action: "add" | "remove";
  timestamp: Date;
}

// ============================================================================
// Attachment Types
// ============================================================================

/**
 * Types of message attachments.
 */
export type AttachmentType = "image" | "video" | "audio" | "file" | "link";

/**
 * Message attachment.
 */
export interface Attachment {
  /** Unique attachment ID */
  id: string;
  /** Attachment type */
  type: AttachmentType;
  /** URL to the attachment */
  url: string;
  /** Original filename */
  name: string;
  /** File size in bytes */
  size?: number;
  /** MIME type */
  mimeType?: string;
  /** Width in pixels (for images/videos) */
  width?: number;
  /** Height in pixels (for images/videos) */
  height?: number;
  /** Duration in seconds (for audio/video) */
  duration?: number;
  /** Thumbnail URL */
  thumbnailUrl?: string;
  /** Preview URL (for lower resolution) */
  previewUrl?: string;
  /** Blur hash for image placeholder */
  blurHash?: string;
  /** Alt text for accessibility */
  altText?: string;
}

/**
 * Link preview (unfurled URL).
 */
export interface LinkPreview {
  /** Original URL */
  url: string;
  /** Page title */
  title?: string;
  /** Page description */
  description?: string;
  /** Preview image URL */
  imageUrl?: string;
  /** Site name */
  siteName?: string;
  /** Site favicon URL */
  favicon?: string;
  /** Site theme color */
  themeColor?: string;
  /** Video embed URL (for YouTube, etc.) */
  videoUrl?: string;
  /** Author name */
  author?: string;
  /** Published date */
  publishedAt?: Date;
}

// ============================================================================
// Mention Types
// ============================================================================

/**
 * Types of mentions in messages.
 */
export type MentionType = "user" | "channel" | "everyone" | "here" | "role";

/**
 * Mention in a message.
 */
export interface MessageMention {
  /** Mention type */
  type: MentionType;
  /** ID of mentioned entity (user/channel/role) */
  id?: string;
  /** Display text in message */
  displayText: string;
  /** Start position in message content */
  startIndex: number;
  /** End position in message content */
  endIndex: number;
  /** Resolved user/channel info */
  resolved?: UserBasicInfo | { id: string; name: string };
}

// ============================================================================
// Thread Types
// ============================================================================

/**
 * Thread information for a message that has replies.
 */
export interface ThreadInfo {
  /** Number of replies in thread */
  replyCount: number;
  /** Timestamp of last reply */
  lastReplyAt: Date;
  /** Users who have participated in the thread */
  participants: MessageUser[];
  /** Latest reply preview */
  latestReply?: {
    content: string;
    user: MessageUser;
    createdAt: Date;
  };
  /** Whether thread is locked */
  isLocked?: boolean;
}

/**
 * Full thread with messages.
 */
export interface Thread {
  /** Thread ID (same as root message ID) */
  id: string;
  /** Parent channel ID */
  channelId: string;
  /** Root message */
  rootMessage: Message;
  /** Thread replies */
  replies: Message[];
  /** Participant users */
  participants: MessageUser[];
  /** Reply count */
  replyCount: number;
  /** When thread was created */
  createdAt: Date;
  /** Last reply timestamp */
  lastReplyAt: Date;
  /** Whether thread is archived */
  isArchived: boolean;
  /** Whether thread is locked */
  isLocked: boolean;
}

// ============================================================================
// Message Type Definitions
// ============================================================================

/**
 * Types of messages.
 */
export type MessageType =
  // Regular messages
  | "text"
  | "voice"
  | "poll"
  | "sticker"
  // System messages
  | "system"
  | "user_joined"
  | "user_left"
  | "user_added"
  | "user_removed"
  | "user_banned"
  | "channel_created"
  | "channel_renamed"
  | "channel_archived"
  | "topic_changed"
  | "description_changed"
  | "icon_changed"
  | "message_pinned"
  | "message_unpinned"
  | "call_started"
  | "call_ended"
  | "call_missed"
  | "thread_created"
  | "integration"
  | "bot_message";

/**
 * Check if a message type is a system message.
 */
export function isSystemMessage(type: MessageType): boolean {
  return !["text", "voice", "poll", "sticker", "bot_message"].includes(type);
}

// ============================================================================
// Main Message Interface
// ============================================================================

/**
 * Core Message interface.
 */
export interface Message {
  /** Unique message identifier */
  id: string;
  /** Channel ID the message belongs to */
  channelId: string;
  /** Message content (text) */
  content: string;
  /** Pre-rendered HTML content */
  contentHtml?: string;
  /** Message type */
  type: MessageType;

  // Author info
  /** Author's user ID */
  userId: string;
  /** Author's user info */
  user: MessageUser;

  // Timestamps
  /** When the message was created */
  createdAt: Date;
  /** When the message was last updated */
  updatedAt?: Date;

  // Edit state
  /** Whether message has been edited */
  isEdited: boolean;
  /** When message was edited */
  editedAt?: Date;
  /** Edit history (if enabled) */
  editHistory?: MessageEditRecord[];

  // Reply/Thread info
  /** ID of message being replied to (inline reply) */
  replyToId?: string;
  /** Referenced message (inline reply) */
  replyTo?: Message;
  /** Thread info if this message has a thread */
  threadInfo?: ThreadInfo;
  /** Parent thread ID if this is a thread reply */
  parentThreadId?: string;

  // Attachments
  /** File attachments */
  attachments?: Attachment[];
  /** Unfurled link previews */
  linkPreviews?: LinkPreview[];

  // Reactions
  /** Reactions on this message */
  reactions?: Reaction[];

  // State flags
  /** Whether message is pinned */
  isPinned?: boolean;
  /** Whether message is bookmarked by current user */
  isBookmarked?: boolean;
  /** Whether message is deleted (soft delete) */
  isDeleted?: boolean;
  /** When message was deleted */
  deletedAt?: Date;
  /** Who deleted the message */
  deletedBy?: string;

  // Mentions
  /** User IDs mentioned in message */
  mentionedUsers?: string[];
  /** Channel IDs mentioned in message */
  mentionedChannels?: string[];
  /** Whether @everyone was used */
  mentionsEveryone?: boolean;
  /** Whether @here was used */
  mentionsHere?: boolean;
  /** Parsed mentions with positions */
  mentions?: MessageMention[];

  // Read state (for current user)
  /** Whether current user has read this message */
  isRead?: boolean;

  // Bot/integration metadata
  /** Bot ID if sent by a bot */
  botId?: string;
  /** Webhook ID if sent via webhook */
  webhookId?: string;
  /** Integration-specific metadata */
  integrationMetadata?: Record<string, unknown>;

  // Voice message specific
  /** Voice message data */
  voiceMessage?: VoiceMessageData;

  // Poll specific
  /** Poll ID if message type is poll */
  pollId?: string;

  // Sticker specific
  /** Sticker ID if message type is sticker */
  stickerId?: string;
}

/**
 * Voice message data.
 */
export interface VoiceMessageData {
  /** Audio URL */
  url: string;
  /** Duration in seconds */
  duration: number;
  /** Waveform data for visualization */
  waveform?: number[];
  /** Transcript (if available) */
  transcript?: string;
  /** File size in bytes */
  size: number;
  /** Audio format */
  format: "mp3" | "ogg" | "webm" | "wav";
}

/**
 * Message edit history record.
 */
export interface MessageEditRecord {
  /** ID of the edit record */
  id?: string;
  /** Previous content before the edit */
  previousContent: string;
  /** New content after the edit */
  newContent: string;
  /** Summary of the changes */
  changeSummary?: string;
  /** When the edit was made */
  editedAt: Date;
  /** User ID of who made the edit */
  editorId: string;
}

// ============================================================================
// Message Input Types
// ============================================================================

/**
 * Draft message saved locally.
 */
export interface MessageDraft {
  /** Channel ID */
  channelId: string;
  /** Draft content */
  content: string;
  /** Reply to message ID */
  replyToId?: string;
  /** Thread ID if replying in thread */
  threadId?: string;
  /** Pending attachments */
  attachments?: File[];
  /** When draft was saved */
  savedAt: Date;
}

/**
 * Input for sending a new message.
 */
export interface SendMessageInput {
  /** Channel ID */
  channelId: string;
  /** Message content */
  content: string;
  /** Reply to message ID */
  replyToId?: string;
  /** Thread ID if replying in thread */
  threadId?: string;
  /** Attachments to upload */
  attachments?: File[];
  /** Sticker ID */
  stickerId?: string;
  /** Mention settings */
  mentions?: {
    users?: string[];
    channels?: string[];
    everyone?: boolean;
    here?: boolean;
  };
}

/**
 * Input for editing a message.
 */
export interface EditMessageInput {
  messageId: string;
  content: string;
}

/**
 * Mention suggestion for autocomplete.
 */
export interface MentionSuggestion {
  /** ID of the entity */
  id: string;
  /** Type of mention */
  type: "user" | "channel" | "command";
  /** Display label */
  label: string;
  /** Value to insert */
  value: string;
  /** Avatar URL (for users) */
  avatarUrl?: string;
  /** Description/subtitle */
  description?: string;
}

/**
 * Slash command definition.
 */
export interface SlashCommand {
  /** Command name (without /) */
  name: string;
  /** Command description */
  description: string;
  /** Command arguments */
  args?: SlashCommandArg[];
  /** Category for grouping */
  category?: string;
  /** Whether command is available */
  isEnabled?: boolean;
}

/**
 * Slash command argument.
 */
export interface SlashCommandArg {
  /** Argument name */
  name: string;
  /** Whether argument is required */
  required: boolean;
  /** Argument description */
  description: string;
  /** Argument type */
  type?: "string" | "number" | "user" | "channel" | "boolean";
  /** Valid choices (if enum-like) */
  choices?: { value: string; label: string }[];
}

// ============================================================================
// Message List Types
// ============================================================================

/**
 * Grouped messages from the same user.
 */
export interface MessageGroup {
  /** Group ID */
  id: string;
  /** User ID */
  userId: string;
  /** User info */
  user: MessageUser;
  /** Messages in this group */
  messages: Message[];
  /** First message timestamp */
  firstMessageTime: Date;
}

/**
 * Date separator in message list.
 */
export interface DateSeparator {
  /** Discriminant type */
  type: "date-separator";
  /** Date of the separator */
  date: Date;
  /** Display label */
  label: string;
}

/**
 * Unread messages indicator.
 */
export interface UnreadIndicator {
  /** Discriminant type */
  type: "unread-indicator";
  /** Number of unread messages */
  count: number;
  /** When unread messages started */
  since: Date;
}

/**
 * New messages indicator (jump to present).
 */
export interface NewMessagesIndicator {
  /** Discriminant type */
  type: "new-messages-indicator";
  /** Number of new messages */
  count: number;
}

/**
 * Message list item (discriminated union).
 */
export type MessageListItem =
  | {
      type: "message";
      message: Message;
      isGrouped: boolean;
      showAvatar: boolean;
    }
  | DateSeparator
  | UnreadIndicator
  | NewMessagesIndicator;

// ============================================================================
// System Message Types
// ============================================================================

/**
 * Data for system messages.
 */
export interface SystemMessageData {
  /** System message type */
  type: MessageType;
  /** User who performed the action */
  actor?: MessageUser;
  /** Target user or value */
  target?: MessageUser | string;
  /** Previous value (for changes) */
  oldValue?: string;
  /** New value (for changes) */
  newValue?: string;
  /** Call duration for call_ended */
  duration?: number;
  /** Additional metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Format a system message for display.
 */
export function formatSystemMessage(data: SystemMessageData): string {
  const actorName = data.actor?.displayName || "Someone";
  const targetName =
    typeof data.target === "string"
      ? data.target
      : data.target?.displayName || "someone";

  switch (data.type) {
    case "user_joined":
      return `${actorName} joined the channel`;
    case "user_left":
      return `${actorName} left the channel`;
    case "user_added":
      return `${actorName} added ${targetName} to the channel`;
    case "user_removed":
      return `${actorName} removed ${targetName} from the channel`;
    case "channel_created":
      return `${actorName} created this channel`;
    case "channel_renamed":
      return `${actorName} renamed the channel to "${data.newValue}"`;
    case "topic_changed":
      return `${actorName} changed the topic to "${data.newValue}"`;
    case "message_pinned":
      return `${actorName} pinned a message`;
    case "message_unpinned":
      return `${actorName} unpinned a message`;
    case "call_started":
      return `${actorName} started a call`;
    case "call_ended":
      return `Call ended${data.duration ? ` (${Math.floor(data.duration / 60)}m ${data.duration % 60}s)` : ""}`;
    default:
      return "System message";
  }
}

// ============================================================================
// Typing Indicator Types
// ============================================================================

/**
 * User currently typing.
 */
export interface TypingUser {
  /** User ID */
  id: string;
  /** Display name */
  displayName: string;
  /** Avatar URL */
  avatarUrl?: string;
  /** When typing started */
  startedAt: Date;
}

/**
 * Typing state for a channel.
 */
export interface ChannelTypingState {
  /** Channel ID */
  channelId: string;
  /** Users currently typing */
  users: TypingUser[];
}

/**
 * Format typing indicator text.
 */
export function formatTypingIndicator(users: TypingUser[]): string {
  if (users.length === 0) return "";
  if (users.length === 1) return `${users[0].displayName} is typing...`;
  if (users.length === 2)
    return `${users[0].displayName} and ${users[1].displayName} are typing...`;
  if (users.length === 3)
    return `${users[0].displayName}, ${users[1].displayName}, and ${users[2].displayName} are typing...`;
  return `${users[0].displayName}, ${users[1].displayName}, and ${users.length - 2} others are typing...`;
}

// ============================================================================
// Message Actions
// ============================================================================

/**
 * Available message actions.
 */
export type MessageAction =
  | "react"
  | "reply"
  | "thread"
  | "edit"
  | "delete"
  | "pin"
  | "unpin"
  | "bookmark"
  | "unbookmark"
  | "forward"
  | "copy"
  | "copy-link"
  | "report"
  | "mark-unread";

/**
 * Permissions for message actions.
 */
export interface MessageActionPermissions {
  /** Can add reactions */
  canReact: boolean;
  /** Can reply to message */
  canReply: boolean;
  /** Can start/view thread */
  canThread: boolean;
  /** Can edit message */
  canEdit: boolean;
  /** Can delete message */
  canDelete: boolean;
  /** Can pin/unpin message */
  canPin: boolean;
  /** Can bookmark message */
  canBookmark: boolean;
  /** Can forward message */
  canForward: boolean;
  /** Can report message */
  canReport: boolean;
  /** Can copy message */
  canCopy: boolean;
  /** Can mark as unread */
  canMarkUnread: boolean;
}

/**
 * Get message action permissions for a user.
 */
export function getMessagePermissions(
  message: Message,
  currentUserId: string,
  userRole: "owner" | "admin" | "moderator" | "member" | "guest",
): MessageActionPermissions {
  const isAuthor = message.userId === currentUserId;
  const isModerator = ["owner", "admin", "moderator"].includes(userRole);
  const isGuest = userRole === "guest";

  return {
    canReact: !isGuest && !message.isDeleted,
    canReply: !isGuest && !message.isDeleted,
    canThread: !isGuest && !message.isDeleted,
    canEdit: isAuthor && !message.isDeleted,
    canDelete: (isAuthor || isModerator) && !message.isDeleted,
    canPin: isModerator,
    canBookmark: !isGuest,
    canForward: !isGuest && !message.isDeleted,
    canReport: !isGuest && !isAuthor,
    canCopy: true,
    canMarkUnread: !isGuest,
  };
}

// ============================================================================
// Message Search Types
// ============================================================================

/**
 * Message search result.
 */
export interface MessageSearchResult {
  /** The message */
  message: Message;
  /** Channel info */
  channel: { id: string; name: string; type: string };
  /** Highlighted content */
  highlightedContent?: string;
  /** Match score */
  score?: number;
}

/**
 * Message search filters.
 */
export interface MessageSearchFilters {
  /** Search query */
  query: string;
  /** Filter by channel IDs */
  channelIds?: string[];
  /** Filter by user IDs (authors) */
  userIds?: string[];
  /** Filter by date range */
  dateFrom?: Date;
  dateTo?: Date;
  /** Include messages with attachments */
  hasAttachments?: boolean;
  /** Include messages with links */
  hasLinks?: boolean;
  /** Include pinned messages only */
  isPinned?: boolean;
  /** Include messages mentioning current user */
  mentionsMe?: boolean;
}

// ============================================================================
// Read State Types
// ============================================================================

/**
 * Read state for a channel.
 */
export interface ChannelReadState {
  /** Channel ID */
  channelId: string;
  /** Last read message ID */
  lastReadMessageId?: string;
  /** Last read timestamp */
  lastReadAt?: Date;
  /** Unread message count */
  unreadCount: number;
  /** Unread mention count */
  unreadMentionCount: number;
}

/**
 * Bulk read state update.
 */
export interface ReadStateUpdate {
  channelId: string;
  messageId: string;
  timestamp: Date;
}
