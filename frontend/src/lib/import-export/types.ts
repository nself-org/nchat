// ============================================================================
// IMPORT/EXPORT TYPE DEFINITIONS
// ============================================================================

// ============================================================================
// COMMON TYPES
// ============================================================================

export type ImportSource = "slack" | "discord" | "file";
export type ExportFormat = "json" | "csv";
export type ImportStatus =
  | "pending"
  | "validating"
  | "mapping"
  | "importing"
  | "completed"
  | "failed";
export type ExportStatus = "pending" | "generating" | "completed" | "failed";

export interface ImportProgress {
  status: ImportStatus;
  currentStep: number;
  totalSteps: number;
  itemsProcessed: number;
  totalItems: number;
  currentItem?: string;
  errors: ImportError[];
  warnings: ImportWarning[];
}

export interface ExportProgress {
  status: ExportStatus;
  progress: number;
  currentItem?: string;
  downloadUrl?: string;
  error?: string;
}

export interface ImportError {
  code: string;
  message: string;
  item?: string;
  details?: Record<string, unknown>;
}

export interface ImportWarning {
  code: string;
  message: string;
  item?: string;
  suggestion?: string;
}

// ============================================================================
// FIELD MAPPING TYPES
// ============================================================================

export interface FieldMapping {
  sourceField: string;
  targetField: string;
  transform?: FieldTransform;
}

export type FieldTransform =
  | "none"
  | "lowercase"
  | "uppercase"
  | "trim"
  | "date"
  | "timestamp"
  | "markdown"
  | "html_to_markdown";

export interface MappingConfig {
  users: FieldMapping[];
  channels: FieldMapping[];
  messages: FieldMapping[];
  customMappings?: Record<string, FieldMapping[]>;
}

// ============================================================================
// UNIFIED DATA TYPES (Internal representation)
// ============================================================================

export interface UnifiedUser {
  externalId: string;
  email?: string;
  username: string;
  displayName: string;
  avatarUrl?: string;
  isBot?: boolean;
  isAdmin?: boolean;
  timezone?: string;
  metadata?: Record<string, unknown>;
}

export interface UnifiedChannel {
  externalId: string;
  name: string;
  slug?: string;
  description?: string;
  topic?: string;
  type: "public" | "private" | "direct" | "group";
  isArchived?: boolean;
  createdAt?: string;
  creatorId?: string;
  memberIds?: string[];
  metadata?: Record<string, unknown>;
}

export interface UnifiedMessage {
  externalId: string;
  channelId: string;
  userId: string;
  content: string;
  type: "text" | "system" | "file" | "image" | "video" | "audio";
  createdAt: string;
  editedAt?: string;
  threadId?: string;
  parentId?: string;
  attachments?: UnifiedAttachment[];
  reactions?: UnifiedReaction[];
  metadata?: Record<string, unknown>;
}

export interface UnifiedAttachment {
  externalId?: string;
  name: string;
  url: string;
  mimeType?: string;
  size?: number;
  width?: number;
  height?: number;
}

export interface UnifiedReaction {
  emoji: string;
  userIds: string[];
  count: number;
}

// ============================================================================
// SLACK TYPES
// ============================================================================

export interface SlackExportData {
  users: SlackUser[];
  channels: SlackChannel[];
  messagesByChannel: Record<string, SlackMessage[]>;
}

export interface SlackUser {
  id: string;
  name: string;
  real_name?: string;
  profile?: {
    email?: string;
    display_name?: string;
    image_72?: string;
    image_192?: string;
    image_original?: string;
  };
  is_admin?: boolean;
  is_owner?: boolean;
  is_bot?: boolean;
  deleted?: boolean;
  tz?: string;
}

export interface SlackChannel {
  id: string;
  name: string;
  purpose?: {
    value: string;
  };
  topic?: {
    value: string;
  };
  is_private?: boolean;
  is_archived?: boolean;
  is_general?: boolean;
  created?: number;
  creator?: string;
  members?: string[];
}

export interface SlackMessage {
  type: string;
  subtype?: string;
  ts: string;
  user?: string;
  text: string;
  thread_ts?: string;
  reply_count?: number;
  reply_users?: string[];
  reply_users_count?: number;
  reactions?: SlackReaction[];
  files?: SlackFile[];
  attachments?: SlackAttachment[];
  edited?: {
    user: string;
    ts: string;
  };
  bot_id?: string;
}

export interface SlackReaction {
  name: string;
  count: number;
  users: string[];
}

export interface SlackFile {
  id: string;
  name: string;
  mimetype: string;
  size?: number;
  url_private?: string;
  url_private_download?: string;
  thumb_160?: string;
  thumb_360?: string;
  thumb_480?: string;
  thumb_720?: string;
  mode?: string;
}

export interface SlackAttachment {
  fallback?: string;
  text?: string;
  pretext?: string;
  color?: string;
  title?: string;
  title_link?: string;
  image_url?: string;
  thumb_url?: string;
  footer?: string;
  ts?: number;
}

// ============================================================================
// DISCORD TYPES
// ============================================================================

export interface DiscordExportData {
  guild: DiscordGuild;
  channels: DiscordChannel[];
  messages: DiscordMessage[];
}

export interface DiscordGuild {
  id: string;
  name: string;
  iconUrl?: string;
  exportDate?: string;
}

export interface DiscordChannel {
  id: string;
  type: DiscordChannelType;
  name: string;
  topic?: string;
  guild?: {
    id: string;
    name: string;
  };
  categoryId?: string;
  categoryName?: string;
}

export type DiscordChannelType =
  | 0
  | 1
  | 2
  | 4
  | 5
  | 10
  | 11
  | 12
  | 13
  | 14
  | 15;
// 0 = Text, 1 = DM, 2 = Voice, 4 = Category, 5 = News, 10-15 = Thread types

export interface DiscordMessage {
  id: string;
  type: DiscordMessageType;
  timestamp: string;
  timestampEdited?: string;
  isPinned: boolean;
  content: string;
  author: DiscordAuthor;
  attachments: DiscordAttachment[];
  embeds: DiscordEmbed[];
  reactions?: DiscordReaction[];
  mentions?: DiscordMention[];
  reference?: DiscordMessageReference;
}

export type DiscordMessageType =
  | "Default"
  | "RecipientAdd"
  | "RecipientRemove"
  | "Call"
  | "ChannelNameChange"
  | "ChannelIconChange"
  | "ChannelPinnedMessage"
  | "GuildMemberJoin"
  | "Reply"
  | "ThreadCreated";

export interface DiscordAuthor {
  id: string;
  name: string;
  discriminator: string;
  nickname?: string;
  color?: string;
  isBot: boolean;
  avatarUrl?: string;
}

export interface DiscordAttachment {
  id: string;
  url: string;
  fileName: string;
  fileSizeBytes: number;
}

export interface DiscordEmbed {
  title?: string;
  url?: string;
  timestamp?: string;
  description?: string;
  color?: string;
  author?: {
    name: string;
    url?: string;
    iconUrl?: string;
  };
  thumbnail?: {
    url: string;
    width?: number;
    height?: number;
  };
  image?: {
    url: string;
    width?: number;
    height?: number;
  };
  footer?: {
    text: string;
    iconUrl?: string;
  };
  fields?: {
    name: string;
    value: string;
    inline?: boolean;
  }[];
}

export interface DiscordReaction {
  emoji: {
    id?: string;
    name: string;
    code?: string;
    isAnimated?: boolean;
    imageUrl?: string;
  };
  count: number;
}

export interface DiscordMention {
  id: string;
  name: string;
  discriminator: string;
  nickname?: string;
  isBot: boolean;
}

export interface DiscordMessageReference {
  messageId?: string;
  channelId?: string;
  guildId?: string;
}

// ============================================================================
// IMPORT CONFIG TYPES
// ============================================================================

export interface ImportConfig {
  source: ImportSource;
  options: ImportOptions;
  mapping: MappingConfig;
}

export interface ImportOptions {
  importUsers: boolean;
  importChannels: boolean;
  importMessages: boolean;
  importAttachments: boolean;
  importReactions: boolean;
  preserveTimestamps: boolean;
  deduplicateUsers: boolean;
  skipBots: boolean;
  skipSystemMessages: boolean;
  dateRange?: {
    start?: string;
    end?: string;
  };
  channelFilter?: string[];
  userFilter?: string[];
}

// ============================================================================
// EXPORT CONFIG TYPES
// ============================================================================

export interface ExportConfig {
  format: ExportFormat;
  options: ExportOptions;
  filters: ExportFilters;
}

export interface ExportOptions {
  includeUsers: boolean;
  includeChannels: boolean;
  includeMessages: boolean;
  includeAttachments: boolean;
  includeReactions: boolean;
  includeThreads: boolean;
  includeMetadata: boolean;
  flattenThreads: boolean;
  anonymizeUsers: boolean;
}

export interface ExportFilters {
  channelIds?: string[];
  userIds?: string[];
  dateRange?: {
    start?: string;
    end?: string;
  };
  messageTypes?: string[];
  searchQuery?: string;
}

// ============================================================================
// RESULT TYPES
// ============================================================================

export interface ImportResult {
  success: boolean;
  stats: ImportStats;
  errors: ImportError[];
  warnings: ImportWarning[];
  userIdMap: Record<string, string>;
  channelIdMap: Record<string, string>;
  messageIdMap: Record<string, string>;
}

export interface ImportStats {
  usersImported: number;
  usersSkipped: number;
  usersFailed: number;
  channelsImported: number;
  channelsSkipped: number;
  channelsFailed: number;
  messagesImported: number;
  messagesSkipped: number;
  messagesFailed: number;
  attachmentsImported: number;
  attachmentsFailed: number;
  reactionsImported: number;
  duration: number;
}

export interface ExportResult {
  success: boolean;
  downloadUrl?: string;
  stats: ExportStats;
  error?: string;
}

export interface ExportStats {
  usersExported: number;
  channelsExported: number;
  messagesExported: number;
  attachmentsExported: number;
  fileSizeBytes: number;
  duration: number;
}

// ============================================================================
// PREVIEW TYPES
// ============================================================================

export interface ImportPreview {
  users: UnifiedUser[];
  channels: UnifiedChannel[];
  messages: UnifiedMessage[];
  stats: {
    totalUsers: number;
    totalChannels: number;
    totalMessages: number;
    dateRange: {
      earliest?: string;
      latest?: string;
    };
  };
}
