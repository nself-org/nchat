/**
 * Saved Messages Types
 *
 * TypeScript type definitions for the saved/starred messages system.
 */

import type { Message, MessageUser } from "@/types/message";

// ============================================================================
// Saved Message Types
// ============================================================================

/**
 * Saved message record.
 */
export interface SavedMessage {
  /** Unique saved item ID */
  id: string;
  /** User who saved the message */
  userId: string;
  /** ID of the saved message */
  messageId: string;
  /** Channel ID where the message exists */
  channelId: string;
  /** Optional collection IDs */
  collectionIds: string[];
  /** When the message was saved */
  savedAt: Date;
  /** The actual message content */
  message: Message;
  /** User's note about the saved message */
  note?: string;
  /** User-defined tags */
  tags: string[];
  /** Whether this is a starred item (quick access) */
  isStarred: boolean;
  /** Reminder date (optional) */
  reminderAt?: Date;
  /** Whether reminder has been triggered */
  reminderTriggered?: boolean;
}

/**
 * Input for saving a message.
 */
export interface SaveMessageInput {
  /** Message ID to save */
  messageId: string;
  /** Channel ID */
  channelId: string;
  /** Optional note */
  note?: string;
  /** Optional collection IDs */
  collectionIds?: string[];
  /** Optional tags */
  tags?: string[];
  /** Star the message */
  isStarred?: boolean;
  /** Optional reminder */
  reminderAt?: Date;
}

/**
 * Input for updating a saved message.
 */
export interface UpdateSavedMessageInput {
  /** Saved item ID */
  savedId: string;
  /** Updated note */
  note?: string;
  /** Updated tags */
  tags?: string[];
  /** Updated starred status */
  isStarred?: boolean;
  /** Updated reminder */
  reminderAt?: Date | null;
}

/**
 * Input for removing a saved message.
 */
export interface UnsaveMessageInput {
  /** Saved item ID or message ID */
  savedId?: string;
  messageId?: string;
}

// ============================================================================
// Collection Types
// ============================================================================

/**
 * Collection of saved messages.
 */
export interface SavedCollection {
  /** Unique collection ID */
  id: string;
  /** Owner user ID */
  userId: string;
  /** Collection name */
  name: string;
  /** Collection description */
  description?: string;
  /** Collection icon (emoji or icon name) */
  icon?: string;
  /** Collection color */
  color?: string;
  /** Number of items in collection */
  itemCount: number;
  /** When created */
  createdAt: Date;
  /** Last updated */
  updatedAt: Date;
  /** Position for ordering */
  position: number;
  /** Whether collection is shared */
  isShared: boolean;
  /** Share settings (if shared) */
  shareSettings?: CollectionShareSettings;
}

/**
 * Collection share settings.
 */
export interface CollectionShareSettings {
  /** Share link */
  shareLink?: string;
  /** Share visibility */
  visibility: "private" | "link" | "workspace";
  /** Users who have access */
  sharedWith?: string[];
  /** Can others add to collection */
  allowContribute: boolean;
  /** Expiration date for share link */
  expiresAt?: Date;
}

/**
 * Input for creating a collection.
 */
export interface CreateCollectionInput {
  /** Collection name */
  name: string;
  /** Description */
  description?: string;
  /** Icon */
  icon?: string;
  /** Color */
  color?: string;
}

/**
 * Input for updating a collection.
 */
export interface UpdateCollectionInput {
  /** Collection ID */
  collectionId: string;
  /** Updated name */
  name?: string;
  /** Updated description */
  description?: string;
  /** Updated icon */
  icon?: string;
  /** Updated color */
  color?: string;
  /** Updated position */
  position?: number;
}

/**
 * Input for sharing a collection.
 */
export interface ShareCollectionInput {
  /** Collection ID */
  collectionId: string;
  /** Share visibility */
  visibility: "private" | "link" | "workspace";
  /** Users to share with */
  sharedWith?: string[];
  /** Allow contributions */
  allowContribute?: boolean;
  /** Link expiration */
  expiresAt?: Date;
}

// ============================================================================
// Filter Types
// ============================================================================

/**
 * Filter options for saved messages.
 */
export interface SavedFilters {
  /** Filter by collection */
  collectionId?: string | null;
  /** Filter by channel */
  channelId?: string;
  /** Filter by tags */
  tags?: string[];
  /** Filter starred only */
  starredOnly?: boolean;
  /** Filter with reminders only */
  hasReminder?: boolean;
  /** Filter with pending reminders only */
  pendingReminders?: boolean;
  /** Filter by date range - saved after */
  savedAfter?: Date;
  /** Filter by date range - saved before */
  savedBefore?: Date;
  /** Filter by message type */
  messageType?: string;
  /** Search query */
  searchQuery?: string;
  /** Filter messages with attachments */
  hasAttachments?: boolean;
  /** Filter by message author */
  authorUserId?: string;
}

/**
 * Sort options for saved messages.
 */
export type SavedSortBy = "savedAt" | "messageDate" | "channel" | "reminder";
export type SavedSortOrder = "asc" | "desc";

/**
 * Saved messages list options.
 */
export interface SavedListOptions {
  filters?: SavedFilters;
  sortBy?: SavedSortBy;
  sortOrder?: SavedSortOrder;
  limit?: number;
  offset?: number;
}

// ============================================================================
// Export Types
// ============================================================================

/**
 * Export format options.
 */
export type ExportFormat = "json" | "markdown" | "html" | "csv";

/**
 * Export options.
 */
export interface ExportOptions {
  /** Export format */
  format: ExportFormat;
  /** Include message content */
  includeContent: boolean;
  /** Include attachments */
  includeAttachments: boolean;
  /** Include notes */
  includeNotes: boolean;
  /** Include tags */
  includeTags: boolean;
  /** Filter by collection */
  collectionId?: string;
  /** Date range filter */
  dateFrom?: Date;
  dateTo?: Date;
}

/**
 * Export result.
 */
export interface ExportResult {
  success: boolean;
  data?: string | Blob;
  filename: string;
  mimeType: string;
  error?: string;
}

// ============================================================================
// Statistics Types
// ============================================================================

/**
 * Saved messages statistics.
 */
export interface SavedStats {
  /** Total saved messages */
  totalSaved: number;
  /** Total starred */
  totalStarred: number;
  /** Total with reminders */
  totalWithReminders: number;
  /** Total pending reminders */
  pendingReminders: number;
  /** Total collections */
  totalCollections: number;
  /** Total tags used */
  totalTags: number;
  /** Saved by channel */
  byChannel: Record<string, number>;
  /** Saved by collection */
  byCollection: Record<string, number>;
  /** Most used tags */
  topTags: { tag: string; count: number }[];
}

// ============================================================================
// Event Types
// ============================================================================

/**
 * Saved message event for real-time updates.
 */
export interface SavedEvent {
  type: "saved" | "unsaved" | "updated" | "collection_updated";
  userId: string;
  savedMessage?: SavedMessage;
  messageId?: string;
  collection?: SavedCollection;
  timestamp: Date;
}
