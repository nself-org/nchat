/**
 * Admin Dashboard Types for nself-chat
 *
 * Type definitions for analytics, moderation, muting, and data export functionality.
 * Part of STREAM-5: Admin Dashboard implementation for v0.9.1.
 */

import type { User, UserBasicInfo, UserRole } from "./user";
import type { Message } from "./message";
import type { Channel } from "./channel";

// ============================================================================
// Analytics Types
// ============================================================================

/**
 * Time period for analytics data aggregation.
 */
export type AnalyticsPeriod = "24h" | "7d" | "30d" | "90d" | "1y" | "all";

/**
 * Granularity for time-series data.
 */
export type AnalyticsGranularity = "hour" | "day" | "week" | "month";

/**
 * Base analytics data point with timestamp.
 */
export interface AnalyticsDataPoint {
  /** Timestamp for the data point */
  timestamp: Date;
  /** Label for display */
  label: string;
}

/**
 * Message volume analytics data.
 */
export interface MessageVolumeData extends AnalyticsDataPoint {
  /** Total messages sent */
  totalMessages: number;
  /** Messages by channel type */
  publicMessages: number;
  privateMessages: number;
  directMessages: number;
  /** Messages with attachments */
  messagesWithAttachments: number;
  /** Messages with reactions */
  messagesWithReactions: number;
  /** Thread replies */
  threadReplies: number;
}

/**
 * User activity analytics data.
 */
export interface UserActivityData extends AnalyticsDataPoint {
  /** Total active users */
  activeUsers: number;
  /** New user registrations */
  newUsers: number;
  /** Returning users */
  returningUsers: number;
  /** Users by role */
  usersByRole: Record<UserRole, number>;
  /** Peak concurrent users */
  peakConcurrentUsers: number;
  /** Average session duration in minutes */
  avgSessionDuration: number;
}

/**
 * Channel usage analytics data.
 */
export interface ChannelUsageData extends AnalyticsDataPoint {
  /** Channel ID */
  channelId: string;
  /** Channel name */
  channelName: string;
  /** Channel type */
  channelType: "public" | "private" | "direct" | "group_dm";
  /** Total messages in period */
  messageCount: number;
  /** Unique users who sent messages */
  activeUsers: number;
  /** Number of reactions */
  reactionCount: number;
  /** Number of thread replies */
  threadCount: number;
  /** Member count */
  memberCount: number;
  /** Growth percentage vs previous period */
  growthPercent: number;
}

/**
 * Engagement metrics analytics data.
 */
export interface EngagementData extends AnalyticsDataPoint {
  /** Total reactions given */
  totalReactions: number;
  /** Total threads created */
  totalThreads: number;
  /** Total mentions */
  totalMentions: number;
  /** Messages per active user */
  messagesPerUser: number;
  /** Average response time in seconds */
  avgResponseTime: number;
  /** Engagement score (0-100) */
  engagementScore: number;
  /** Top emojis used */
  topEmojis: Array<{ emoji: string; count: number }>;
  /** Peak activity hours (0-23) */
  peakHours: number[];
}

/**
 * Aggregated analytics summary.
 */
export interface AnalyticsSummary {
  /** Period covered */
  period: AnalyticsPeriod;
  /** Start date of period */
  startDate: Date;
  /** End date of period */
  endDate: Date;
  /** Message statistics */
  messages: {
    total: number;
    change: number;
    changePercent: number;
  };
  /** User statistics */
  users: {
    total: number;
    active: number;
    new: number;
    change: number;
    changePercent: number;
  };
  /** Channel statistics */
  channels: {
    total: number;
    active: number;
    new: number;
  };
  /** Engagement statistics */
  engagement: {
    score: number;
    reactions: number;
    threads: number;
    avgResponseTime: number;
  };
}

/**
 * Analytics query options.
 */
export interface AnalyticsQueryOptions {
  /** Time period */
  period: AnalyticsPeriod;
  /** Data granularity */
  granularity: AnalyticsGranularity;
  /** Filter by channel IDs */
  channelIds?: string[];
  /** Filter by user IDs */
  userIds?: string[];
  /** Custom start date */
  startDate?: Date;
  /** Custom end date */
  endDate?: Date;
}

// ============================================================================
// Auto-Moderation Types
// ============================================================================

/**
 * Types of auto-moderation rules.
 */
export type AutoModRuleType =
  | "word_filter"
  | "spam_detect"
  | "link_filter"
  | "caps_filter"
  | "mention_spam"
  | "attachment_filter"
  | "invite_filter"
  | "regex_pattern";

/**
 * Actions that can be taken by auto-moderation.
 */
export type AutoModAction =
  | "flag"
  | "warn"
  | "delete"
  | "mute"
  | "kick"
  | "ban"
  | "quarantine"
  | "notify_mods";

/**
 * Severity levels for moderation actions.
 */
export type AutoModSeverity = "low" | "medium" | "high" | "critical";

/**
 * Base auto-moderation rule interface.
 */
export interface AutoModRule {
  /** Unique rule identifier */
  id: string;
  /** Rule name */
  name: string;
  /** Rule description */
  description?: string;
  /** Rule type */
  type: AutoModRuleType;
  /** Whether rule is enabled */
  enabled: boolean;
  /** Priority (higher = checked first) */
  priority: number;
  /** Severity level */
  severity: AutoModSeverity;
  /** Actions to take when triggered */
  actions: AutoModAction[];
  /** Channels where rule applies (empty = all) */
  channelIds: string[];
  /** Channels to exclude */
  excludedChannelIds: string[];
  /** Roles exempt from this rule */
  exemptRoles: UserRole[];
  /** Users exempt from this rule */
  exemptUserIds: string[];
  /** When the rule was created */
  createdAt: Date;
  /** When the rule was last updated */
  updatedAt: Date;
  /** Who created the rule */
  createdBy: string;
  /** Rule-specific configuration */
  config: AutoModRuleConfig;
}

/**
 * Configuration for word filter rules.
 */
export interface WordFilterConfig {
  /** Words/phrases to block */
  blockedWords: string[];
  /** Words to allow (overrides blocked) */
  allowedWords: string[];
  /** Match whole words only */
  matchWholeWord: boolean;
  /** Case sensitive matching */
  caseSensitive: boolean;
  /** Check for common letter substitutions (l33t speak) */
  checkSubstitutions: boolean;
  /** Minimum word similarity for fuzzy matching (0-1) */
  fuzzyThreshold: number;
  /** Custom replacement text (if not deleting) */
  replacement?: string;
}

/**
 * Configuration for spam detection rules.
 */
export interface SpamDetectConfig {
  /** Maximum messages per time window */
  maxMessages: number;
  /** Time window in seconds */
  timeWindow: number;
  /** Maximum duplicate messages */
  maxDuplicates: number;
  /** Minimum time between messages in seconds */
  minInterval: number;
  /** Check for repeated characters */
  checkRepeatedChars: boolean;
  /** Maximum repeated characters allowed */
  maxRepeatedChars: number;
  /** Check for excessive mentions */
  checkMentionSpam: boolean;
  /** Maximum mentions per message */
  maxMentions: number;
  /** Check for excessive emoji */
  checkEmojiSpam: boolean;
  /** Maximum emoji per message */
  maxEmoji: number;
}

/**
 * Configuration for link filter rules.
 */
export interface LinkFilterConfig {
  /** Block all links */
  blockAllLinks: boolean;
  /** Allowed domains (whitelist) */
  allowedDomains: string[];
  /** Blocked domains (blacklist) */
  blockedDomains: string[];
  /** Block invite links (Discord, Slack, etc.) */
  blockInviteLinks: boolean;
  /** Block shortened URLs */
  blockShortenedUrls: boolean;
  /** Block phishing URLs */
  blockPhishing: boolean;
  /** Allow links from verified users */
  allowVerifiedUsers: boolean;
  /** Minimum account age in days to post links */
  minAccountAge: number;
}

/**
 * Union type for all rule configurations.
 */
export type AutoModRuleConfig =
  | { type: "word_filter"; settings: WordFilterConfig }
  | { type: "spam_detect"; settings: SpamDetectConfig }
  | { type: "link_filter"; settings: LinkFilterConfig }
  | { type: "caps_filter"; settings: CapsFilterConfig }
  | { type: "mention_spam"; settings: MentionSpamConfig }
  | { type: "attachment_filter"; settings: AttachmentFilterConfig }
  | { type: "invite_filter"; settings: InviteFilterConfig }
  | { type: "regex_pattern"; settings: RegexPatternConfig };

/**
 * Configuration for caps filter.
 */
export interface CapsFilterConfig {
  /** Maximum percentage of caps allowed (0-100) */
  maxCapsPercent: number;
  /** Minimum message length to check */
  minLength: number;
}

/**
 * Configuration for mention spam.
 */
export interface MentionSpamConfig {
  /** Maximum mentions per message */
  maxMentionsPerMessage: number;
  /** Maximum role mentions */
  maxRoleMentions: number;
  /** Block @everyone/@here */
  blockEveryoneMentions: boolean;
}

/**
 * Configuration for attachment filter.
 */
export interface AttachmentFilterConfig {
  /** Allowed file extensions */
  allowedExtensions: string[];
  /** Blocked file extensions */
  blockedExtensions: string[];
  /** Maximum file size in bytes */
  maxFileSize: number;
  /** Scan for malware */
  scanMalware: boolean;
  /** Block executable files */
  blockExecutables: boolean;
}

/**
 * Configuration for invite filter.
 */
export interface InviteFilterConfig {
  /** Block Discord invites */
  blockDiscord: boolean;
  /** Block Slack invites */
  blockSlack: boolean;
  /** Block all external invites */
  blockAllExternal: boolean;
  /** Allow internal workspace invites */
  allowInternal: boolean;
}

/**
 * Configuration for regex pattern filter.
 */
export interface RegexPatternConfig {
  /** Regex pattern string */
  pattern: string;
  /** Regex flags */
  flags: string;
  /** Description of what this matches */
  matchDescription: string;
}

/**
 * Result of auto-moderation check.
 */
export interface AutoModResult {
  /** Whether content was flagged */
  flagged: boolean;
  /** Rules that were triggered */
  triggeredRules: Array<{
    ruleId: string;
    ruleName: string;
    ruleType: AutoModRuleType;
    severity: AutoModSeverity;
    matchedContent?: string;
    reason: string;
  }>;
  /** Actions to be taken */
  actions: AutoModAction[];
  /** Overall severity */
  severity: AutoModSeverity | null;
  /** Message to show user (if any) */
  userMessage?: string;
  /** Timestamp of check */
  checkedAt: Date;
}

/**
 * Auto-moderation action log entry.
 */
export interface AutoModActionLog {
  /** Log entry ID */
  id: string;
  /** Rule that was triggered */
  ruleId: string;
  /** Rule name */
  ruleName: string;
  /** Rule type */
  ruleType: AutoModRuleType;
  /** Message ID that triggered the rule */
  messageId: string;
  /** Message content (may be redacted) */
  messageContent: string;
  /** Channel ID */
  channelId: string;
  /** Channel name */
  channelName: string;
  /** User who sent the message */
  userId: string;
  /** User info */
  user: UserBasicInfo;
  /** Action taken */
  action: AutoModAction;
  /** Severity level */
  severity: AutoModSeverity;
  /** Reason/explanation */
  reason: string;
  /** Whether action was reviewed by a moderator */
  reviewed: boolean;
  /** Moderator who reviewed (if any) */
  reviewedBy?: string;
  /** Review timestamp */
  reviewedAt?: Date;
  /** Review decision */
  reviewDecision?: "approve" | "reverse" | "escalate";
  /** When the action occurred */
  createdAt: Date;
}

// ============================================================================
// User Muting Types
// ============================================================================

/**
 * Predefined mute duration options.
 */
export type MuteDuration =
  | "5m"
  | "10m"
  | "30m"
  | "1h"
  | "6h"
  | "12h"
  | "1d"
  | "3d"
  | "7d"
  | "30d"
  | "permanent";

/**
 * Mute duration info.
 */
export interface MuteDurationOption {
  /** Duration key */
  value: MuteDuration;
  /** Human-readable label */
  label: string;
  /** Duration in minutes (0 = permanent) */
  minutes: number;
}

/**
 * All available mute duration options.
 */
export const MUTE_DURATION_OPTIONS: MuteDurationOption[] = [
  { value: "5m", label: "5 minutes", minutes: 5 },
  { value: "10m", label: "10 minutes", minutes: 10 },
  { value: "30m", label: "30 minutes", minutes: 30 },
  { value: "1h", label: "1 hour", minutes: 60 },
  { value: "6h", label: "6 hours", minutes: 360 },
  { value: "12h", label: "12 hours", minutes: 720 },
  { value: "1d", label: "1 day", minutes: 1440 },
  { value: "3d", label: "3 days", minutes: 4320 },
  { value: "7d", label: "1 week", minutes: 10080 },
  { value: "30d", label: "30 days", minutes: 43200 },
  { value: "permanent", label: "Permanent", minutes: 0 },
];

/**
 * User mute record.
 */
export interface UserMuteRecord {
  /** Mute record ID */
  id: string;
  /** User who is muted */
  userId: string;
  /** User info */
  user: UserBasicInfo;
  /** Channel ID (null = server-wide) */
  channelId: string | null;
  /** Channel name (if channel-specific) */
  channelName?: string;
  /** Who muted the user */
  mutedBy: string;
  /** Moderator info */
  moderator: UserBasicInfo;
  /** Reason for mute */
  reason: string;
  /** Duration type */
  duration: MuteDuration;
  /** When mute was created */
  createdAt: Date;
  /** When mute expires (null = permanent) */
  expiresAt: Date | null;
  /** Whether mute is currently active */
  isActive: boolean;
  /** Whether mute was auto-generated by moderation */
  isAutoMod: boolean;
  /** Auto-mod rule ID if auto-generated */
  autoModRuleId?: string;
}

/**
 * Input for creating a mute.
 */
export interface CreateMuteInput {
  /** User ID to mute */
  userId: string;
  /** Channel ID (null = server-wide) */
  channelId?: string | null;
  /** Reason for mute */
  reason: string;
  /** Duration */
  duration: MuteDuration;
  /** Whether to notify the user */
  notifyUser?: boolean;
}

/**
 * Mute history entry.
 */
export interface MuteHistoryEntry {
  /** Record ID */
  id: string;
  /** User ID */
  userId: string;
  /** Channel ID (null = server-wide) */
  channelId: string | null;
  /** Moderator ID */
  mutedBy: string;
  /** Reason */
  reason: string;
  /** Duration */
  duration: MuteDuration;
  /** Created at */
  createdAt: Date;
  /** Expires at */
  expiresAt: Date | null;
  /** When/if unmuted early */
  unmutedAt?: Date;
  /** Who unmuted (if early) */
  unmutedBy?: string;
  /** Unmute reason */
  unmuteReason?: string;
}

// ============================================================================
// Data Export Types
// ============================================================================

/**
 * Export format options.
 */
export type ExportFormat = "json" | "csv" | "xml";

/**
 * Export data types.
 */
export type ExportDataType =
  | "messages"
  | "users"
  | "channels"
  | "moderation_logs"
  | "analytics"
  | "audit_logs";

/**
 * Export status.
 */
export type ExportStatus =
  | "pending"
  | "processing"
  | "completed"
  | "failed"
  | "cancelled";

/**
 * Export request configuration.
 */
export interface ExportRequest {
  /** Export request ID */
  id: string;
  /** Data type to export */
  dataType: ExportDataType;
  /** Export format */
  format: ExportFormat;
  /** Status */
  status: ExportStatus;
  /** Progress (0-100) */
  progress: number;
  /** Filter options */
  filters: ExportFilters;
  /** Who requested the export */
  requestedBy: string;
  /** When request was created */
  createdAt: Date;
  /** When export started */
  startedAt?: Date;
  /** When export completed */
  completedAt?: Date;
  /** Download URL (when complete) */
  downloadUrl?: string;
  /** File size in bytes */
  fileSize?: number;
  /** Number of records exported */
  recordCount?: number;
  /** Error message (if failed) */
  errorMessage?: string;
  /** Expiration time for download */
  expiresAt?: Date;
}

/**
 * Export filter options.
 */
export interface ExportFilters {
  /** Date range start */
  startDate?: Date;
  /** Date range end */
  endDate?: Date;
  /** Channel IDs to include */
  channelIds?: string[];
  /** User IDs to include */
  userIds?: string[];
  /** Include deleted items */
  includeDeleted?: boolean;
  /** Include system messages */
  includeSystem?: boolean;
  /** Fields to include (empty = all) */
  fields?: string[];
  /** Custom query (for advanced exports) */
  customQuery?: string;
}

/**
 * Export progress event.
 */
export interface ExportProgressEvent {
  /** Export ID */
  exportId: string;
  /** Current status */
  status: ExportStatus;
  /** Progress percentage */
  progress: number;
  /** Current phase description */
  phase: string;
  /** Records processed so far */
  recordsProcessed: number;
  /** Total records to process */
  totalRecords: number;
  /** Estimated time remaining in seconds */
  estimatedTimeRemaining?: number;
}

/**
 * Message export record.
 */
export interface MessageExportRecord {
  id: string;
  channelId: string;
  channelName: string;
  userId: string;
  username: string;
  displayName: string;
  content: string;
  type: string;
  createdAt: string;
  editedAt?: string;
  isDeleted: boolean;
  deletedAt?: string;
  hasAttachments: boolean;
  attachmentCount: number;
  reactionCount: number;
  replyCount: number;
  isPinned: boolean;
}

/**
 * User export record.
 */
export interface UserExportRecord {
  id: string;
  username: string;
  displayName: string;
  email: string;
  role: UserRole;
  isActive: boolean;
  isBot: boolean;
  createdAt: string;
  lastLoginAt?: string;
  messageCount: number;
  channelCount: number;
}

/**
 * Channel export record.
 */
export interface ChannelExportRecord {
  id: string;
  name: string;
  type: string;
  description?: string;
  topic?: string;
  createdAt: string;
  createdBy: string;
  memberCount: number;
  messageCount: number;
  isArchived: boolean;
  isDefault: boolean;
  isReadOnly: boolean;
}

// ============================================================================
// GDPR Request Types
// ============================================================================

/**
 * GDPR request types.
 */
export type GDPRRequestType =
  | "access"
  | "export"
  | "rectification"
  | "erasure"
  | "portability";

/**
 * GDPR request status.
 */
export type GDPRRequestStatus =
  | "pending"
  | "in_review"
  | "processing"
  | "completed"
  | "rejected"
  | "cancelled";

/**
 * GDPR request record.
 */
export interface GDPRRequest {
  /** Request ID */
  id: string;
  /** Request type */
  type: GDPRRequestType;
  /** User ID making the request */
  userId: string;
  /** User info */
  user: UserBasicInfo;
  /** Request status */
  status: GDPRRequestStatus;
  /** Request description/details */
  description: string;
  /** Data categories requested */
  dataCategories: string[];
  /** Submitted at */
  submittedAt: Date;
  /** Acknowledged at */
  acknowledgedAt?: Date;
  /** Completed at */
  completedAt?: Date;
  /** Due date (30 days from submission) */
  dueDate: Date;
  /** Assigned reviewer */
  assignedTo?: string;
  /** Reviewer notes */
  reviewerNotes?: string;
  /** Response/result */
  response?: string;
  /** Download URL for data export */
  downloadUrl?: string;
  /** Rejection reason (if rejected) */
  rejectionReason?: string;
}

/**
 * Input for creating a GDPR request.
 */
export interface CreateGDPRRequestInput {
  type: GDPRRequestType;
  description: string;
  dataCategories: string[];
}

/**
 * GDPR data categories.
 */
export const GDPR_DATA_CATEGORIES = [
  {
    id: "profile",
    label: "Profile Information",
    description: "Name, email, avatar, bio",
  },
  {
    id: "messages",
    label: "Messages",
    description: "All messages you have sent",
  },
  {
    id: "reactions",
    label: "Reactions",
    description: "Reactions you have added to messages",
  },
  {
    id: "files",
    label: "Uploaded Files",
    description: "Files and attachments you have uploaded",
  },
  {
    id: "settings",
    label: "Settings",
    description: "Your notification and privacy settings",
  },
  {
    id: "activity",
    label: "Activity Logs",
    description: "Login history and session data",
  },
  {
    id: "moderation",
    label: "Moderation History",
    description: "Warnings, mutes, and bans",
  },
] as const;
