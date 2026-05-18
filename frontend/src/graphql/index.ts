/**
 * nself-chat GraphQL Operations
 *
 * This module exports all GraphQL queries, mutations, subscriptions, and fragments
 * needed for a full-featured Slack/Discord/Telegram clone.
 *
 * Usage:
 * ```typescript
 * import { GET_MESSAGES, SEND_MESSAGE, MESSAGE_SUBSCRIPTION } from '@/graphql'
 * // or
 * import { messages } from '@/graphql'
 * messages.GET_MESSAGES
 * ```
 */

// ============================================================================
// FRAGMENTS - Reusable GraphQL fragments
// ============================================================================
export * from "./fragments";

// ============================================================================
// MESSAGES - Message operations (CRUD, pin, forward, subscriptions)
// ============================================================================
export * from "./messages";

// ============================================================================
// CHANNELS - Channel operations (CRUD, members, settings)
// ============================================================================
export * from "./channels";

// ============================================================================
// THREADS - Thread operations (create, reply, participants)
// ============================================================================
export * from "./threads";

// ============================================================================
// REACTIONS - Reaction operations (add, remove, toggle)
// ============================================================================
export * from "./reactions";

// ============================================================================
// USERS - User operations (profile, presence, status)
// ============================================================================
export * from "./users";

// ============================================================================
// SEARCH - Search operations (messages, files, users, channels)
// ============================================================================
export * from "./search";

// ============================================================================
// ATTACHMENTS - File operations (upload, download, manage)
// ============================================================================
export * from "./attachments";

// ============================================================================
// NOTIFICATIONS - Notification operations (read, preferences)
// ============================================================================
export * from "./notifications";

// ============================================================================
// MENTIONS - Mention operations (@user, @channel, @everyone)
// ============================================================================
export * from "./mentions";

// ============================================================================
// BOOKMARKS - Bookmark/saved items operations
// ============================================================================
export * from "./bookmarks";

// ============================================================================
// TYPING - Typing indicator operations
// ============================================================================
export * from "./typing";

// ============================================================================
// READ RECEIPTS - Read tracking operations
// ============================================================================
export * from "./read-receipts";

// ============================================================================
// MESSAGE STATUS - Edit history and delivery status operations
// ============================================================================
export * from "./message-status";

// ============================================================================
// APP CONFIG - Application configuration (from existing file)
// ============================================================================
export * from "./app-config";

// ============================================================================
// MODERATION - Blocking, reporting, and muting operations
// ============================================================================
export * from "./moderation";

// ============================================================================
// BROADCASTS - Broadcast lists and announcements
// ============================================================================
export * from "./broadcasts";

// ============================================================================
// NAMESPACE EXPORTS - For organized imports
// ============================================================================
import * as fragments from "./fragments";
import * as messages from "./messages";
import * as channels from "./channels";
import * as threads from "./threads";
import * as reactions from "./reactions";
import * as users from "./users";
import * as search from "./search";
import * as attachments from "./attachments";
import * as notifications from "./notifications";
import * as mentions from "./mentions";
import * as bookmarks from "./bookmarks";
import * as typing from "./typing";
import * as readReceipts from "./read-receipts";
import * as messageStatus from "./message-status";
import * as appConfig from "./app-config";
import * as moderation from "./moderation";
import * as broadcasts from "./broadcasts";

export {
  fragments,
  messages,
  channels,
  threads,
  reactions,
  users,
  search,
  attachments,
  notifications,
  mentions,
  bookmarks,
  typing,
  readReceipts,
  messageStatus,
  appConfig,
  moderation,
  broadcasts,
};

// ============================================================================
// TYPE RE-EXPORTS - For TypeScript convenience
// ============================================================================
export type {
  // Messages
  GetMessagesVariables,
  GetMessageVariables,
  SendMessageVariables,
  EditMessageVariables,
  DeleteMessageVariables,
  PinMessageVariables,
  ForwardMessageVariables,
  MessageSubscriptionVariables,
  ThreadMessageSubscriptionVariables,
} from "./messages";

export type {
  // Channels
  ChannelType,
  GetChannelsVariables,
  GetChannelVariables,
  GetChannelMembersVariables,
  CreateChannelVariables,
  UpdateChannelVariables,
  UpdateChannelSettingsVariables,
  ChannelMemberVariables,
  InviteToChannelVariables,
} from "./channels";

export type {
  // Threads
  GetThreadMessagesVariables,
  GetThreadParticipantsVariables,
  CreateThreadVariables,
  ReplyToThreadVariables,
  JoinThreadVariables,
  LeaveThreadVariables,
  ThreadSubscriptionVariables,
} from "./threads";

export type {
  // Reactions
  GetMessageReactionsVariables,
  AddReactionVariables,
  RemoveReactionVariables,
  ReactionSubscriptionVariables,
  ReactionCount,
} from "./reactions";

export type {
  // Users
  UserStatus,
  GetUserVariables,
  GetUsersVariables,
  UpdateProfileVariables,
  UpdateStatusVariables,
  UpdatePresenceVariables,
  UserSubscriptionVariables,
  UsersSubscriptionVariables,
} from "./users";

export type {
  // Search
  SearchMessagesVariables,
  SearchFilesVariables,
  SearchUsersVariables,
  SearchChannelsVariables,
  SearchAllVariables,
  SearchResult,
} from "./search";

export type {
  // Attachments
  AttachmentType,
  GetAttachmentVariables,
  GetChannelFilesVariables,
  CreateAttachmentVariables,
  DeleteAttachmentVariables,
  GetUploadUrlVariables,
  UploadUrlResponse,
} from "./attachments";

export type {
  // Notifications
  NotificationType,
  GetNotificationsVariables,
  GetUnreadCountVariables,
  MarkAsReadVariables,
  MarkAllAsReadVariables,
  UpdateNotificationPreferencesVariables,
  NotificationSubscriptionVariables,
} from "./notifications";

export type {
  // Mentions
  MentionType,
  GetMentionsVariables,
  CreateMentionVariables,
  MentionSubscriptionVariables,
} from "./mentions";

export type {
  // Bookmarks
  GetBookmarksVariables,
  AddBookmarkVariables,
  RemoveBookmarkVariables,
  UpdateBookmarkVariables,
} from "./bookmarks";

export type {
  // Typing
  StartTypingVariables,
  StopTypingVariables,
  TypingSubscriptionVariables,
  TypingUser,
} from "./typing";

export type {
  // Read Receipts
  GetReadReceiptsVariables,
  MarkChannelReadVariables,
  ReadReceiptSubscriptionVariables,
  UnreadInfo,
} from "./read-receipts";

export type {
  // Message Status
  GetMessageEditHistoryVariables,
  MessageEditHistoryRecord,
  GetMessageStatusVariables,
  MessageStatusData,
  GetMessageReadByVariables,
  MessageReadByData,
} from "./message-status";

export type {
  // Moderation
  ReportReason,
  ReportStatus,
  MuteDuration,
  BlockUserVariables,
  UnblockUserVariables,
  GetBlockedUsersVariables,
  ReportUserVariables,
  ReportMessageVariables,
  MuteUserVariables,
  UnmuteUserVariables,
  GetReportsVariables,
  ResolveReportVariables,
} from "./moderation";

export type {
  // Broadcasts
  BroadcastList,
  Broadcast,
  CreateBroadcastListInput,
  UpdateBroadcastListInput,
  SendBroadcastInput,
  GetBroadcastListsVariables,
  GetBroadcastListVariables,
  CreateBroadcastListVariables,
  UpdateBroadcastListVariables,
  DeleteBroadcastListVariables,
  SendBroadcastVariables,
  GetBroadcastHistoryVariables,
} from "./broadcasts";
