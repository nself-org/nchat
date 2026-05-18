/**
 * Extended Message Types for nself-chat
 *
 * Complete message model parity with support for all message types:
 * - Text messages (plain, markdown, code blocks)
 * - Media messages (images, videos, audio, voice)
 * - File attachments (documents, archives)
 * - Stickers and GIFs
 * - Polls (single/multi choice, quiz mode)
 * - Location messages
 * - Contact cards
 * - System events (join, leave, rename, etc.)
 *
 * Plus full support for:
 * - Reply/Forward semantics
 * - Rich content (link previews, embeds, code highlighting)
 * - Message metadata (timestamps, edit history, delivery status)
 * - Message states (sending, sent, delivered, read, failed)
 */

import type {
  Message,
  MessageUser,
  Reaction,
  Attachment,
  LinkPreview,
} from "./message";
import type { Poll } from "./poll";
import type { Sticker } from "./sticker";
import type { UserBasicInfo } from "./user";

// ============================================================================
// EXTENDED MESSAGE TYPES
// ============================================================================

/**
 * All supported message types in the system.
 */
export type ExtendedMessageType =
  // Content messages
  | "text"
  | "rich_text"
  | "code_block"
  | "markdown"
  // Media messages
  | "image"
  | "video"
  | "audio"
  | "voice"
  | "gif"
  // File messages
  | "file"
  | "document"
  | "archive"
  // Interactive messages
  | "poll"
  | "quiz"
  | "sticker"
  // Location and contact
  | "location"
  | "live_location"
  | "contact"
  | "contact_card"
  // Forwarding
  | "forward"
  | "quote"
  // System messages
  | "system"
  | "user_joined"
  | "user_left"
  | "user_added"
  | "user_removed"
  | "user_banned"
  | "user_unbanned"
  | "user_muted"
  | "user_unmuted"
  | "role_assigned"
  | "role_removed"
  | "channel_created"
  | "channel_renamed"
  | "channel_archived"
  | "channel_unarchived"
  | "channel_deleted"
  | "topic_changed"
  | "description_changed"
  | "icon_changed"
  | "message_pinned"
  | "message_unpinned"
  | "call_started"
  | "call_ended"
  | "call_missed"
  | "screen_share_started"
  | "screen_share_ended"
  | "recording_started"
  | "recording_stopped"
  | "thread_created"
  | "thread_resolved"
  | "integration"
  | "bot_message"
  | "webhook_message"
  // Moderation
  | "message_deleted"
  | "message_edited_by_mod"
  | "auto_moderation"
  | "spam_detected"
  | "warning_issued";

// ============================================================================
// LOCATION MESSAGE TYPES
// ============================================================================

/**
 * Geographic location data.
 */
export interface GeoLocation {
  /** Latitude coordinate */
  latitude: number;
  /** Longitude coordinate */
  longitude: number;
  /** Location accuracy in meters */
  accuracy?: number;
  /** Altitude in meters */
  altitude?: number;
  /** Altitude accuracy in meters */
  altitudeAccuracy?: number;
  /** Heading/bearing in degrees */
  heading?: number;
  /** Speed in m/s */
  speed?: number;
}

/**
 * Location message data.
 */
export interface LocationMessageData {
  /** Location coordinates */
  location: GeoLocation;
  /** Display name for the location */
  name?: string;
  /** Address string */
  address?: string;
  /** Venue/place name */
  venue?: string;
  /** Venue type/category */
  venueType?: string;
  /** Google/Apple Maps place ID */
  placeId?: string;
  /** Static map image URL */
  staticMapUrl?: string;
  /** Map zoom level */
  zoomLevel?: number;
}

/**
 * Live location sharing data.
 */
export interface LiveLocationData extends LocationMessageData {
  /** When sharing started */
  startedAt: Date;
  /** Duration in seconds (how long to share) */
  duration: number;
  /** When sharing expires */
  expiresAt: Date;
  /** Last updated timestamp */
  lastUpdatedAt: Date;
  /** Whether sharing is still active */
  isActive: boolean;
  /** Update interval in seconds */
  updateInterval?: number;
}

// ============================================================================
// CONTACT MESSAGE TYPES
// ============================================================================

/**
 * Contact card phone number.
 */
export interface ContactPhone {
  /** Phone type */
  type: "mobile" | "home" | "work" | "fax" | "other";
  /** Phone number */
  number: string;
  /** Is primary */
  isPrimary?: boolean;
}

/**
 * Contact card email.
 */
export interface ContactEmail {
  /** Email type */
  type: "personal" | "work" | "other";
  /** Email address */
  email: string;
  /** Is primary */
  isPrimary?: boolean;
}

/**
 * Contact card address.
 */
export interface ContactAddress {
  /** Address type */
  type: "home" | "work" | "other";
  /** Street address */
  street?: string;
  /** City */
  city?: string;
  /** State/Province */
  state?: string;
  /** Postal/ZIP code */
  postalCode?: string;
  /** Country */
  country?: string;
  /** Full formatted address */
  formatted?: string;
}

/**
 * Contact card data.
 */
export interface ContactCardData {
  /** Contact ID (if internal user) */
  userId?: string;
  /** First name */
  firstName: string;
  /** Last name */
  lastName?: string;
  /** Full display name */
  displayName: string;
  /** Nickname */
  nickname?: string;
  /** Company/Organization */
  organization?: string;
  /** Job title */
  jobTitle?: string;
  /** Department */
  department?: string;
  /** Avatar/photo URL */
  avatarUrl?: string;
  /** Phone numbers */
  phones?: ContactPhone[];
  /** Email addresses */
  emails?: ContactEmail[];
  /** Addresses */
  addresses?: ContactAddress[];
  /** Website URLs */
  websites?: string[];
  /** Birthday */
  birthday?: Date;
  /** Notes */
  notes?: string;
  /** vCard string (for export) */
  vCard?: string;
}

// ============================================================================
// FORWARDED MESSAGE TYPES
// ============================================================================

/**
 * Forwarding modes.
 */
export type ForwardingMode =
  | "forward" // Regular forward with attribution
  | "copy" // Copy without attribution
  | "quote"; // Quote with reply context

/**
 * Forward attribution data.
 */
export interface ForwardAttribution {
  /** Original message ID */
  originalMessageId: string;
  /** Original channel ID */
  originalChannelId: string;
  /** Original channel name */
  originalChannelName?: string;
  /** Original author */
  originalAuthor: MessageUser;
  /** When the original was sent */
  originalSentAt: Date;
  /** Chain of forwards (for multi-hop) */
  forwardChain?: ForwardChainEntry[];
  /** Forward mode used */
  mode: ForwardingMode;
  /** Whether original is still accessible */
  isOriginalAccessible?: boolean;
}

/**
 * Entry in forward chain (for tracking multi-hop forwards).
 */
export interface ForwardChainEntry {
  /** Message ID in chain */
  messageId: string;
  /** Channel ID */
  channelId: string;
  /** Who forwarded */
  forwardedBy: MessageUser;
  /** When forwarded */
  forwardedAt: Date;
}

/**
 * Forward destination.
 */
export interface ForwardDestination {
  /** Destination type */
  type: "channel" | "user" | "thread";
  /** Destination ID */
  id: string;
  /** Destination name */
  name: string;
  /** Is private */
  isPrivate?: boolean;
  /** Avatar URL */
  avatarUrl?: string;
}

/**
 * Multi-forward request.
 */
export interface MultiForwardRequest {
  /** Messages to forward */
  messageIds: string[];
  /** Destinations */
  destinations: ForwardDestination[];
  /** Forward mode */
  mode: ForwardingMode;
  /** Optional comment */
  comment?: string;
  /** Remove attribution (for copy mode) */
  removeAttribution?: boolean;
}

// ============================================================================
// RICH CONTENT TYPES
// ============================================================================

/**
 * Embed types for rich content.
 */
export type EmbedType =
  | "link_preview"
  | "youtube"
  | "vimeo"
  | "twitter"
  | "github"
  | "spotify"
  | "soundcloud"
  | "twitch"
  | "codepen"
  | "codesandbox"
  | "figma"
  | "loom"
  | "notion"
  | "google_docs"
  | "google_sheets"
  | "google_slides"
  | "custom";

/**
 * Rich embed data.
 */
export interface RichEmbed {
  /** Embed type */
  type: EmbedType;
  /** Original URL */
  url: string;
  /** Title */
  title?: string;
  /** Description */
  description?: string;
  /** Thumbnail URL */
  thumbnailUrl?: string;
  /** Thumbnail dimensions */
  thumbnailWidth?: number;
  thumbnailHeight?: number;
  /** Provider name (YouTube, Twitter, etc.) */
  provider?: string;
  /** Provider icon URL */
  providerIcon?: string;
  /** Author name */
  author?: string;
  /** Author URL */
  authorUrl?: string;
  /** Author icon */
  authorIcon?: string;
  /** Embed color (hex) */
  color?: string;
  /** Video URL (for video embeds) */
  videoUrl?: string;
  /** Video dimensions */
  videoWidth?: number;
  videoHeight?: number;
  /** Audio URL (for audio embeds) */
  audioUrl?: string;
  /** Embed HTML (for custom embeds) */
  html?: string;
  /** Additional fields */
  fields?: EmbedField[];
  /** Footer text */
  footer?: string;
  /** Footer icon */
  footerIcon?: string;
  /** Timestamp */
  timestamp?: Date;
}

/**
 * Embed field (for Discord-style embeds).
 */
export interface EmbedField {
  /** Field name */
  name: string;
  /** Field value */
  value: string;
  /** Display inline */
  inline?: boolean;
}

/**
 * Code block data.
 */
export interface CodeBlockData {
  /** Programming language */
  language?: string;
  /** Code content */
  code: string;
  /** Filename (if applicable) */
  filename?: string;
  /** Line numbers to highlight */
  highlightLines?: number[];
  /** Starting line number */
  startLine?: number;
  /** Show line numbers */
  showLineNumbers?: boolean;
  /** Enable copy button */
  enableCopy?: boolean;
  /** GitHub/GitLab URL (if from repo) */
  sourceUrl?: string;
}

/**
 * LaTeX/Math content data.
 */
export interface MathContentData {
  /** LaTeX/KaTeX expression */
  expression: string;
  /** Display mode (block vs inline) */
  displayMode: boolean;
  /** Already rendered HTML */
  renderedHtml?: string;
}

/**
 * Custom emoji in message.
 */
export interface CustomEmoji {
  /** Emoji ID */
  id: string;
  /** Emoji name */
  name: string;
  /** Emoji URL */
  url: string;
  /** Is animated */
  animated?: boolean;
  /** Pack ID */
  packId?: string;
}

// ============================================================================
// MESSAGE DELIVERY & STATE TYPES
// ============================================================================

/**
 * Message delivery status.
 */
export type MessageDeliveryStatus =
  | "pending" // Client-side only, not sent yet
  | "sending" // Being sent to server
  | "sent" // Server received
  | "delivered" // Delivered to recipients
  | "read" // Read by recipients
  | "failed" // Failed to send
  | "expired"; // Ephemeral message expired

/**
 * Detailed delivery info for a message.
 */
export interface MessageDeliveryInfo {
  /** Current status */
  status: MessageDeliveryStatus;
  /** When queued for sending */
  queuedAt?: Date;
  /** When sent to server */
  sentAt?: Date;
  /** When server confirmed receipt */
  serverReceivedAt?: Date;
  /** When delivered to first recipient */
  firstDeliveredAt?: Date;
  /** When all recipients received */
  allDeliveredAt?: Date;
  /** When first read */
  firstReadAt?: Date;
  /** When all read */
  allReadAt?: Date;
  /** Error info if failed */
  error?: {
    code: string;
    message: string;
    retryable: boolean;
    retryCount: number;
    lastRetryAt?: Date;
  };
  /** Ephemeral expiry info */
  ephemeral?: {
    expiresAt: Date;
    ttlSeconds: number;
  };
}

/**
 * Per-user read receipt.
 */
export interface ReadReceipt {
  /** User ID */
  userId: string;
  /** User info */
  user: MessageUser;
  /** When read */
  readAt: Date;
  /** Device info */
  device?: string;
}

/**
 * Message state flags.
 */
export interface MessageStateFlags {
  /** Is sending */
  isSending: boolean;
  /** Is sent */
  isSent: boolean;
  /** Is delivered */
  isDelivered: boolean;
  /** Is read by at least one recipient */
  isRead: boolean;
  /** Send failed */
  isFailed: boolean;
  /** Is edited */
  isEdited: boolean;
  /** Is deleted */
  isDeleted: boolean;
  /** Is pinned */
  isPinned: boolean;
  /** Is bookmarked (by current user) */
  isBookmarked: boolean;
  /** Is highlighted (search result, etc.) */
  isHighlighted: boolean;
  /** Is ephemeral */
  isEphemeral: boolean;
  /** Is encrypted */
  isEncrypted: boolean;
  /** Is forwarded */
  isForwarded: boolean;
  /** Is reply */
  isReply: boolean;
  /** Is in thread */
  isThreadReply: boolean;
  /** Is thread root */
  isThreadRoot: boolean;
}

// ============================================================================
// EXTENDED MESSAGE INTERFACE
// ============================================================================

/**
 * Extended Message interface with full model parity.
 */
export interface ExtendedMessage extends Message {
  /** Extended message type */
  extendedType?: ExtendedMessageType;

  // ===== Location Data =====
  /** Location message data */
  locationData?: LocationMessageData;
  /** Live location data */
  liveLocationData?: LiveLocationData;

  // ===== Contact Data =====
  /** Contact card data */
  contactData?: ContactCardData;

  // ===== Forward Data =====
  /** Forward attribution */
  forwardAttribution?: ForwardAttribution;
  /** Forward destinations (for multi-forward) */
  forwardDestinations?: ForwardDestination[];

  // ===== Rich Content =====
  /** Rich embeds */
  embeds?: RichEmbed[];
  /** Code blocks */
  codeBlocks?: CodeBlockData[];
  /** Math/LaTeX content */
  mathContent?: MathContentData[];
  /** Custom emojis used */
  customEmojis?: CustomEmoji[];

  // ===== Poll/Sticker Data =====
  /** Poll data (if poll message) */
  poll?: Poll;
  /** Sticker data (if sticker message) */
  sticker?: Sticker;

  // ===== GIF Data =====
  /** GIF URL */
  gifUrl?: string;
  /** GIF metadata */
  gifMetadata?: {
    id?: string;
    width: number;
    height: number;
    previewUrl?: string;
    title?: string;
    source?: "giphy" | "tenor" | "custom";
  };

  // ===== Delivery & State =====
  /** Delivery info */
  deliveryInfo?: MessageDeliveryInfo;
  /** Read receipts */
  readReceipts?: ReadReceipt[];
  /** State flags */
  stateFlags?: MessageStateFlags;

  // ===== System Message Data =====
  /** System message metadata */
  systemData?: SystemEventData;

  // ===== Moderation =====
  /** Moderation action that affected this message */
  moderationAction?: ModerationActionData;
}

/**
 * System event data for system messages.
 */
export interface SystemEventData {
  /** Event type */
  eventType: ExtendedMessageType;
  /** Actor who performed the action */
  actor?: MessageUser;
  /** Target user (if applicable) */
  targetUser?: MessageUser;
  /** Target entity (channel, message, etc.) */
  targetEntity?: {
    type: "channel" | "message" | "thread" | "role";
    id: string;
    name?: string;
  };
  /** Old value (for changes) */
  oldValue?: string | Record<string, unknown>;
  /** New value (for changes) */
  newValue?: string | Record<string, unknown>;
  /** Duration (for calls) */
  duration?: number;
  /** Participant count (for calls) */
  participantCount?: number;
  /** Additional metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Moderation action data.
 */
export interface ModerationActionData {
  /** Action type */
  action: "delete" | "edit" | "hide" | "warn" | "auto_mod";
  /** Moderator who took action */
  moderator?: MessageUser;
  /** Reason for action */
  reason?: string;
  /** Auto-moderation rule that triggered */
  autoModRule?: string;
  /** When action was taken */
  actionAt: Date;
  /** Original content (for edits) */
  originalContent?: string;
}

// ============================================================================
// MESSAGE CREATION/INPUT TYPES
// ============================================================================

/**
 * Input for creating a location message.
 */
export interface CreateLocationMessageInput {
  channelId: string;
  location: GeoLocation;
  name?: string;
  address?: string;
  venue?: string;
  isLiveLocation?: boolean;
  liveDuration?: number; // seconds
}

/**
 * Input for creating a contact message.
 */
export interface CreateContactMessageInput {
  channelId: string;
  contact: ContactCardData;
  /** Share as vCard */
  shareVCard?: boolean;
}

/**
 * Input for forwarding messages.
 */
export interface ForwardMessagesInput {
  /** Message IDs to forward */
  messageIds: string[];
  /** Target destinations */
  destinations: ForwardDestination[];
  /** Forward mode */
  mode: ForwardingMode;
  /** Optional comment */
  comment?: string;
}

/**
 * Input for creating a rich message with embeds.
 */
export interface CreateRichMessageInput {
  channelId: string;
  content: string;
  embeds?: Partial<RichEmbed>[];
  codeBlocks?: CodeBlockData[];
  mathContent?: MathContentData[];
}

// ============================================================================
// SEARCH & FILTER EXTENSIONS
// ============================================================================

/**
 * Extended search filters for message types.
 */
export interface ExtendedMessageSearchFilters {
  /** Filter by extended message types */
  messageTypes?: ExtendedMessageType[];
  /** Has location data */
  hasLocation?: boolean;
  /** Has contact data */
  hasContact?: boolean;
  /** Has poll */
  hasPoll?: boolean;
  /** Has sticker */
  hasSticker?: boolean;
  /** Has GIF */
  hasGif?: boolean;
  /** Has code block */
  hasCodeBlock?: boolean;
  /** Has embed */
  hasEmbed?: boolean;
  /** Is forwarded */
  isForwarded?: boolean;
  /** Is system message */
  isSystemMessage?: boolean;
  /** Programming language (for code blocks) */
  codeLanguage?: string;
  /** Poll status */
  pollStatus?: "active" | "closed";
}

// ============================================================================
// EXPORT TYPES
// ============================================================================

/**
 * Export format options.
 */
export type MessageExportFormat = "json" | "csv" | "html" | "markdown" | "pdf";

/**
 * Message export options.
 */
export interface MessageExportOptions {
  /** Export format */
  format: MessageExportFormat;
  /** Include attachments */
  includeAttachments?: boolean;
  /** Include media files */
  includeMedia?: boolean;
  /** Include reactions */
  includeReactions?: boolean;
  /** Include thread replies */
  includeThreadReplies?: boolean;
  /** Include read receipts */
  includeReadReceipts?: boolean;
  /** Include edit history */
  includeEditHistory?: boolean;
  /** Include system messages */
  includeSystemMessages?: boolean;
  /** Date range filter */
  dateRange?: {
    from?: Date;
    to?: Date;
  };
  /** Message type filter */
  messageTypes?: ExtendedMessageType[];
  /** User filter */
  userIds?: string[];
  /** Max messages */
  limit?: number;
}

/**
 * Exported message data.
 */
export interface ExportedMessage {
  id: string;
  type: ExtendedMessageType;
  content: string;
  contentHtml?: string;
  author: {
    id: string;
    username: string;
    displayName: string;
  };
  createdAt: string;
  editedAt?: string;
  isEdited: boolean;
  isForwarded: boolean;
  forwardedFrom?: {
    channelName: string;
    authorName: string;
    originalDate: string;
  };
  attachments?: Array<{
    type: string;
    name: string;
    url: string;
    size?: number;
  }>;
  reactions?: Array<{
    emoji: string;
    count: number;
    users: string[];
  }>;
  poll?: {
    question: string;
    options: Array<{
      text: string;
      votes: number;
      percentage: number;
    }>;
    totalVotes: number;
    status: string;
  };
  location?: {
    latitude: number;
    longitude: number;
    name?: string;
    address?: string;
  };
  contact?: {
    name: string;
    phones?: string[];
    emails?: string[];
  };
  threadReplies?: ExportedMessage[];
  editHistory?: Array<{
    previousContent: string;
    editedAt: string;
    editorId: string;
  }>;
}

/**
 * Export result.
 */
export interface MessageExportResult {
  /** Export ID */
  exportId: string;
  /** Export format */
  format: MessageExportFormat;
  /** Number of messages */
  messageCount: number;
  /** File size in bytes */
  fileSize: number;
  /** Download URL */
  downloadUrl: string;
  /** Expiration time */
  expiresAt: Date;
  /** Channel info */
  channel: {
    id: string;
    name: string;
  };
  /** Date range */
  dateRange: {
    from: Date;
    to: Date;
  };
  /** When export was created */
  createdAt: Date;
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Check if message type is a content message.
 */
export function isContentMessage(type: ExtendedMessageType): boolean {
  return ["text", "rich_text", "code_block", "markdown"].includes(type);
}

/**
 * Check if message type is a media message.
 */
export function isMediaMessage(type: ExtendedMessageType): boolean {
  return ["image", "video", "audio", "voice", "gif"].includes(type);
}

/**
 * Check if message type is a file message.
 */
export function isFileMessage(type: ExtendedMessageType): boolean {
  return ["file", "document", "archive"].includes(type);
}

/**
 * Check if message type is an interactive message.
 */
export function isInteractiveMessage(type: ExtendedMessageType): boolean {
  return ["poll", "quiz", "sticker"].includes(type);
}

/**
 * Check if message type is a location/contact message.
 */
export function isLocationOrContactMessage(type: ExtendedMessageType): boolean {
  return ["location", "live_location", "contact", "contact_card"].includes(
    type,
  );
}

/**
 * Check if message type is a system message.
 */
export function isSystemMessageType(type: ExtendedMessageType): boolean {
  const systemTypes: ExtendedMessageType[] = [
    "system",
    "user_joined",
    "user_left",
    "user_added",
    "user_removed",
    "user_banned",
    "user_unbanned",
    "user_muted",
    "user_unmuted",
    "role_assigned",
    "role_removed",
    "channel_created",
    "channel_renamed",
    "channel_archived",
    "channel_unarchived",
    "channel_deleted",
    "topic_changed",
    "description_changed",
    "icon_changed",
    "message_pinned",
    "message_unpinned",
    "call_started",
    "call_ended",
    "call_missed",
    "screen_share_started",
    "screen_share_ended",
    "recording_started",
    "recording_stopped",
    "thread_created",
    "thread_resolved",
    "integration",
    "bot_message",
    "webhook_message",
    "message_deleted",
    "message_edited_by_mod",
    "auto_moderation",
    "spam_detected",
    "warning_issued",
  ];
  return systemTypes.includes(type);
}

/**
 * Check if message is forwardable.
 */
export function isForwardableMessage(type: ExtendedMessageType): boolean {
  // System messages cannot be forwarded
  if (isSystemMessageType(type)) return false;
  // Forward messages can be re-forwarded
  return true;
}

/**
 * Get display label for message type.
 */
export function getMessageTypeLabel(type: ExtendedMessageType): string {
  const labels: Record<ExtendedMessageType, string> = {
    text: "Text",
    rich_text: "Rich Text",
    code_block: "Code",
    markdown: "Markdown",
    image: "Image",
    video: "Video",
    audio: "Audio",
    voice: "Voice Message",
    gif: "GIF",
    file: "File",
    document: "Document",
    archive: "Archive",
    poll: "Poll",
    quiz: "Quiz",
    sticker: "Sticker",
    location: "Location",
    live_location: "Live Location",
    contact: "Contact",
    contact_card: "Contact Card",
    forward: "Forwarded",
    quote: "Quoted",
    system: "System",
    user_joined: "User Joined",
    user_left: "User Left",
    user_added: "User Added",
    user_removed: "User Removed",
    user_banned: "User Banned",
    user_unbanned: "User Unbanned",
    user_muted: "User Muted",
    user_unmuted: "User Unmuted",
    role_assigned: "Role Assigned",
    role_removed: "Role Removed",
    channel_created: "Channel Created",
    channel_renamed: "Channel Renamed",
    channel_archived: "Channel Archived",
    channel_unarchived: "Channel Unarchived",
    channel_deleted: "Channel Deleted",
    topic_changed: "Topic Changed",
    description_changed: "Description Changed",
    icon_changed: "Icon Changed",
    message_pinned: "Message Pinned",
    message_unpinned: "Message Unpinned",
    call_started: "Call Started",
    call_ended: "Call Ended",
    call_missed: "Missed Call",
    screen_share_started: "Screen Share Started",
    screen_share_ended: "Screen Share Ended",
    recording_started: "Recording Started",
    recording_stopped: "Recording Stopped",
    thread_created: "Thread Created",
    thread_resolved: "Thread Resolved",
    integration: "Integration",
    bot_message: "Bot",
    webhook_message: "Webhook",
    message_deleted: "Message Deleted",
    message_edited_by_mod: "Edited by Mod",
    auto_moderation: "Auto-Moderation",
    spam_detected: "Spam Detected",
    warning_issued: "Warning",
  };
  return labels[type] || "Unknown";
}

/**
 * Get icon name for message type.
 */
export function getMessageTypeIcon(type: ExtendedMessageType): string {
  const icons: Record<ExtendedMessageType, string> = {
    text: "message-square",
    rich_text: "text",
    code_block: "code",
    markdown: "file-text",
    image: "image",
    video: "video",
    audio: "music",
    voice: "mic",
    gif: "film",
    file: "file",
    document: "file-text",
    archive: "archive",
    poll: "bar-chart-2",
    quiz: "help-circle",
    sticker: "smile",
    location: "map-pin",
    live_location: "navigation",
    contact: "user",
    contact_card: "contact",
    forward: "corner-up-right",
    quote: "quote",
    system: "info",
    user_joined: "user-plus",
    user_left: "user-minus",
    user_added: "user-plus",
    user_removed: "user-x",
    user_banned: "user-x",
    user_unbanned: "user-check",
    user_muted: "volume-x",
    user_unmuted: "volume-2",
    role_assigned: "shield",
    role_removed: "shield-off",
    channel_created: "hash",
    channel_renamed: "edit",
    channel_archived: "archive",
    channel_unarchived: "folder-open",
    channel_deleted: "trash-2",
    topic_changed: "message-circle",
    description_changed: "align-left",
    icon_changed: "image",
    message_pinned: "pin",
    message_unpinned: "pin-off",
    call_started: "phone",
    call_ended: "phone-off",
    call_missed: "phone-missed",
    screen_share_started: "monitor",
    screen_share_ended: "monitor-off",
    recording_started: "video",
    recording_stopped: "video-off",
    thread_created: "message-circle",
    thread_resolved: "check-circle",
    integration: "plug",
    bot_message: "bot",
    webhook_message: "webhook",
    message_deleted: "trash",
    message_edited_by_mod: "edit-3",
    auto_moderation: "shield",
    spam_detected: "alert-triangle",
    warning_issued: "alert-circle",
  };
  return icons[type] || "message-square";
}

/**
 * Convert GeoLocation to formatted address string.
 */
export function formatLocation(
  location: GeoLocation,
  name?: string,
  address?: string,
): string {
  if (name) return name;
  if (address) return address;
  return `${location.latitude.toFixed(6)}, ${location.longitude.toFixed(6)}`;
}

/**
 * Generate Google Maps URL for location.
 */
export function getGoogleMapsUrl(location: GeoLocation): string {
  return `https://www.google.com/maps?q=${location.latitude},${location.longitude}`;
}

/**
 * Generate Apple Maps URL for location.
 */
export function getAppleMapsUrl(location: GeoLocation): string {
  return `https://maps.apple.com/?ll=${location.latitude},${location.longitude}`;
}

/**
 * Format contact name.
 */
export function formatContactName(contact: ContactCardData): string {
  if (contact.displayName) return contact.displayName;
  const parts = [contact.firstName, contact.lastName].filter(Boolean);
  return parts.join(" ") || "Unknown Contact";
}

/**
 * Get primary phone from contact.
 */
export function getPrimaryPhone(contact: ContactCardData): string | undefined {
  const primary = contact.phones?.find((p) => p.isPrimary);
  return primary?.number || contact.phones?.[0]?.number;
}

/**
 * Get primary email from contact.
 */
export function getPrimaryEmail(contact: ContactCardData): string | undefined {
  const primary = contact.emails?.find((e) => e.isPrimary);
  return primary?.email || contact.emails?.[0]?.email;
}
