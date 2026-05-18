/**
 * Message Edit History Types
 *
 * Type definitions for message edit history tracking, viewing, and management.
 */

import type { MessageUser } from "@/types/message";

// ============================================================================
// Core Edit History Types
// ============================================================================

/**
 * A single edit version of a message.
 */
export interface MessageVersion {
  /** Unique version identifier */
  id: string;
  /** Message ID this version belongs to */
  messageId: string;
  /** Version number (1 = original, 2 = first edit, etc.) */
  versionNumber: number;
  /** Content of the message at this version */
  content: string;
  /** When this version was created */
  createdAt: Date;
  /** Who created this version (the editor) */
  editedBy: MessageUser;
  /** Whether this is the original version */
  isOriginal: boolean;
  /** Whether this is the current/active version */
  isCurrent: boolean;
}

/**
 * Complete edit history for a message.
 */
export interface MessageEditHistory {
  /** Message ID */
  messageId: string;
  /** Channel ID the message belongs to */
  channelId: string;
  /** Current content of the message */
  currentContent: string;
  /** Original content (first version) */
  originalContent: string;
  /** All versions ordered by creation date */
  versions: MessageVersion[];
  /** Total number of edits (versions - 1) */
  editCount: number;
  /** Original author of the message */
  author: MessageUser;
  /** When the message was originally created */
  createdAt: Date;
  /** When the message was last edited */
  lastEditedAt: Date | null;
  /** Who made the last edit */
  lastEditedBy: MessageUser | null;
}

/**
 * Summary of edit history for display on messages.
 */
export interface EditHistorySummary {
  /** Whether the message has been edited */
  isEdited: boolean;
  /** Number of times edited */
  editCount: number;
  /** When last edited */
  lastEditedAt: Date | null;
  /** Who last edited */
  lastEditedBy: MessageUser | null;
}

// ============================================================================
// Diff Types
// ============================================================================

/**
 * Type of change in a diff segment.
 */
export type DiffChangeType = "unchanged" | "added" | "removed";

/**
 * A segment of text in a diff.
 */
export interface DiffSegment {
  /** The text content */
  text: string;
  /** Type of change */
  type: DiffChangeType;
}

/**
 * Diff result between two versions.
 */
export interface VersionDiff {
  /** Source version (older) */
  fromVersion: MessageVersion;
  /** Target version (newer) */
  toVersion: MessageVersion;
  /** Diff segments showing changes */
  segments: DiffSegment[];
  /** Number of characters added */
  charsAdded: number;
  /** Number of characters removed */
  charsRemoved: number;
  /** Summary of changes */
  summary: string;
}

/**
 * Word-level diff for more granular comparison.
 */
export interface WordDiff {
  /** Word or whitespace */
  value: string;
  /** Type of change */
  type: DiffChangeType;
}

// ============================================================================
// Version Comparison Types
// ============================================================================

/**
 * Version selection for comparison.
 */
export interface VersionSelection {
  /** Left/older version */
  left: MessageVersion | null;
  /** Right/newer version */
  right: MessageVersion | null;
}

/**
 * Comparison view mode.
 */
export type ComparisonViewMode = "side-by-side" | "inline" | "unified";

/**
 * Comparison result for two versions.
 */
export interface VersionComparison {
  /** Left version */
  left: MessageVersion;
  /** Right version */
  right: MessageVersion;
  /** Diff between versions */
  diff: VersionDiff;
  /** Time between versions */
  timeDelta: number;
  /** Whether same editor */
  sameEditor: boolean;
}

// ============================================================================
// History Settings Types
// ============================================================================

/**
 * Who can view edit history.
 */
export type HistoryViewPermission =
  | "everyone" // All users can view history
  | "author-only" // Only message author can view
  | "moderators" // Moderators and above
  | "admins" // Admins and owner only
  | "disabled"; // No one can view (history still tracked)

/**
 * Edit history retention settings.
 */
export interface HistoryRetentionSettings {
  /** Whether edit history is enabled */
  enabled: boolean;
  /** How long to retain history (in days, 0 = forever) */
  retentionDays: number;
  /** Maximum versions to keep per message (0 = unlimited) */
  maxVersionsPerMessage: number;
}

/**
 * Edit history feature settings.
 */
export interface EditHistorySettings {
  /** Whether edit history tracking is enabled */
  trackingEnabled: boolean;
  /** Who can view edit history */
  viewPermission: HistoryViewPermission;
  /** Whether to show "(edited)" indicator on messages */
  showEditedIndicator: boolean;
  /** Retention settings */
  retention: HistoryRetentionSettings;
  /** Whether to show edit time on hover */
  showEditTimeOnHover: boolean;
  /** Whether admins can restore previous versions */
  allowVersionRestore: boolean;
  /** Whether admins can clear history */
  allowHistoryClear: boolean;
}

/**
 * Default edit history settings.
 */
export const DEFAULT_EDIT_HISTORY_SETTINGS: EditHistorySettings = {
  trackingEnabled: true,
  viewPermission: "everyone",
  showEditedIndicator: true,
  retention: {
    enabled: true,
    retentionDays: 90,
    maxVersionsPerMessage: 50,
  },
  showEditTimeOnHover: true,
  allowVersionRestore: true,
  allowHistoryClear: true,
};

// ============================================================================
// Admin History Types
// ============================================================================

/**
 * Filters for admin history view.
 */
export interface AdminHistoryFilters {
  /** Filter by channel ID */
  channelId?: string;
  /** Filter by user ID (editor) */
  editorId?: string;
  /** Filter by author ID */
  authorId?: string;
  /** Date range start */
  dateFrom?: Date;
  /** Date range end */
  dateTo?: Date;
  /** Minimum number of edits */
  minEdits?: number;
  /** Search in content */
  searchQuery?: string;
}

/**
 * Admin history list item.
 */
export interface AdminHistoryItem {
  /** Message ID */
  messageId: string;
  /** Channel info */
  channel: {
    id: string;
    name: string;
  };
  /** Original author */
  author: MessageUser;
  /** Current content preview */
  contentPreview: string;
  /** Original content preview */
  originalPreview: string;
  /** Number of edits */
  editCount: number;
  /** When first created */
  createdAt: Date;
  /** When last edited */
  lastEditedAt: Date;
  /** Last editor */
  lastEditedBy: MessageUser;
}

/**
 * Bulk action for admin history management.
 */
export type AdminHistoryAction =
  | "clear-history" // Clear all edit history
  | "restore-original" // Restore to original version
  | "delete-versions" // Delete specific versions
  | "export-history"; // Export history data

/**
 * Result of an admin history action.
 */
export interface AdminHistoryActionResult {
  success: boolean;
  action: AdminHistoryAction;
  messageId: string;
  message?: string;
  error?: string;
}

// ============================================================================
// Event Types
// ============================================================================

/**
 * Edit history event types.
 */
export type HistoryEventType =
  | "version-created"
  | "version-restored"
  | "history-cleared"
  | "versions-deleted";

/**
 * Edit history event.
 */
export interface HistoryEvent {
  type: HistoryEventType;
  messageId: string;
  timestamp: Date;
  actor: MessageUser;
  data?: Record<string, unknown>;
}

// ============================================================================
// API Types
// ============================================================================

/**
 * Request to get edit history.
 */
export interface GetHistoryRequest {
  messageId: string;
  includeContent?: boolean;
}

/**
 * Request to restore a version.
 */
export interface RestoreVersionRequest {
  messageId: string;
  versionId: string;
  reason?: string;
}

/**
 * Request to clear edit history.
 */
export interface ClearHistoryRequest {
  messageId: string;
  keepOriginal?: boolean;
  reason?: string;
}

/**
 * Response for edit history operations.
 */
export interface HistoryOperationResponse {
  success: boolean;
  messageId: string;
  message?: string;
  error?: string;
  newVersion?: MessageVersion;
}
