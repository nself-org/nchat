/**
 * Import & Migration Tools - Type Definitions
 *
 * Comprehensive type system for importing data from various platforms
 * including Slack, Discord, and generic formats (CSV, JSON).
 */

export type ImportSource = "slack" | "discord" | "csv" | "json";

export type ImportStatus =
  | "idle"
  | "validating"
  | "importing"
  | "completed"
  | "error"
  | "cancelled";

export interface ImportOptions {
  importUsers: boolean;
  importChannels: boolean;
  importMessages: boolean;
  importFiles: boolean;
  importReactions: boolean;
  importThreads: boolean;
  dateRangeStart?: Date;
  dateRangeEnd?: Date;
  channelFilter?: string[];
  userFilter?: string[];
  preserveIds: boolean;
  overwriteExisting: boolean;
}

export interface ImportProgress {
  status: ImportStatus;
  currentStep: string;
  totalSteps: number;
  currentStepNumber: number;
  progress: number; // 0-100
  itemsProcessed: number;
  itemsTotal: number;
  errors: ImportError[];
  warnings: ImportWarning[];
  startedAt?: Date;
  completedAt?: Date;
  estimatedTimeRemaining?: number; // seconds
}

export interface ImportError {
  type: "user" | "channel" | "message" | "file" | "validation" | "unknown";
  message: string;
  details?: string;
  item?: unknown;
  timestamp: Date;
  recoverable: boolean;
}

export interface ImportWarning {
  type: "skipped" | "modified" | "unsupported" | "duplicate";
  message: string;
  details?: string;
  item?: unknown;
  timestamp: Date;
}

export interface ImportResult {
  success: boolean;
  progress: ImportProgress;
  stats: ImportStats;
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
  filesImported: number;
  filesSkipped: number;
  filesFailed: number;
  reactionsImported: number;
  threadsImported: number;
  totalDuration: number; // milliseconds
}

// Slack-specific types
export interface SlackExport {
  channels: SlackChannel[];
  users: SlackUser[];
  messages: SlackMessage[];
}

export interface SlackChannel {
  id: string;
  name: string;
  created: number;
  creator: string;
  is_archived: boolean;
  is_general: boolean;
  members: string[];
  topic?: {
    value: string;
    creator: string;
    last_set: number;
  };
  purpose?: {
    value: string;
    creator: string;
    last_set: number;
  };
}

export interface SlackUser {
  id: string;
  team_id: string;
  name: string;
  deleted: boolean;
  real_name: string;
  profile: {
    real_name: string;
    display_name: string;
    email?: string;
    image_24?: string;
    image_32?: string;
    image_48?: string;
    image_72?: string;
    image_192?: string;
    image_512?: string;
  };
}

export interface SlackMessage {
  type: string;
  user?: string;
  text: string;
  ts: string;
  thread_ts?: string;
  reply_count?: number;
  reply_users_count?: number;
  reactions?: SlackReaction[];
  files?: SlackFile[];
  attachments?: unknown[];
}

export interface SlackReaction {
  name: string;
  users: string[];
  count: number;
}

export interface SlackFile {
  id: string;
  name: string;
  title: string;
  mimetype: string;
  filetype: string;
  url_private: string;
  url_private_download: string;
  size: number;
}

// Discord-specific types
export interface DiscordExport {
  guild: DiscordGuild;
  channels: DiscordChannel[];
  messages: DiscordMessage[];
}

export interface DiscordGuild {
  id: string;
  name: string;
  iconUrl?: string;
  createdTimestamp: number;
  memberCount: number;
}

export interface DiscordChannel {
  id: string;
  type: number;
  categoryId?: string;
  category?: string;
  name: string;
  topic?: string;
  position: number;
}

export interface DiscordMessage {
  id: string;
  type: string;
  timestamp: string;
  timestampEdited?: string;
  callEndedTimestamp?: string;
  isPinned: boolean;
  content: string;
  author: DiscordUser;
  attachments: DiscordAttachment[];
  embeds: DiscordEmbed[];
  reactions: DiscordReaction[];
  mentions: DiscordUser[];
  reference?: {
    messageId: string;
    channelId: string;
    guildId?: string;
  };
}

export interface DiscordUser {
  id: string;
  name: string;
  discriminator: string;
  nickname?: string;
  avatarUrl?: string;
  isBot: boolean;
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
  description?: string;
  color?: string;
  timestamp?: string;
  author?: {
    name: string;
    url?: string;
    iconUrl?: string;
  };
  fields?: Array<{
    name: string;
    value: string;
    inline?: boolean;
  }>;
}

export interface DiscordReaction {
  emoji: {
    id?: string;
    name: string;
    isAnimated: boolean;
    imageUrl?: string;
  };
  count: number;
}

// Generic import types
export interface GenericImportData {
  users?: GenericUser[];
  channels?: GenericChannel[];
  messages?: GenericMessage[];
}

export interface GenericUser {
  id: string;
  email?: string;
  username: string;
  displayName?: string;
  avatarUrl?: string;
  role?: string;
  createdAt?: string;
}

export interface GenericChannel {
  id: string;
  name: string;
  description?: string;
  isPrivate?: boolean;
  createdBy?: string;
  createdAt?: string;
  members?: string[];
}

export interface GenericMessage {
  id: string;
  channelId: string;
  userId: string;
  content: string;
  createdAt: string;
  editedAt?: string;
  parentId?: string;
  attachments?: GenericAttachment[];
  reactions?: GenericReaction[];
}

export interface GenericAttachment {
  url: string;
  filename: string;
  mimeType?: string;
  size?: number;
}

export interface GenericReaction {
  emoji: string;
  userId: string;
}

// Field mapping for CSV/JSON imports
export interface FieldMapping {
  source: string;
  target: string;
  transform?: (value: unknown) => unknown;
}

export interface ImportMapping {
  users?: Record<string, string>; // source field -> target field
  channels?: Record<string, string>;
  messages?: Record<string, string>;
}
