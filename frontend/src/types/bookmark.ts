/**
 * Bookmark Types for nself-chat
 *
 * Type definitions for bookmarks (starred messages), bookmark collections,
 * and saved messages functionality.
 */

import type { Message, MessageUser } from "./message";
import type { Channel } from "./channel";

// ============================================================================
// Core Bookmark Types
// ============================================================================

/**
 * A bookmarked (starred) message
 */
export interface Bookmark {
  /** Unique bookmark ID */
  id: string;
  /** Message ID */
  messageId: string;
  /** User ID who bookmarked */
  userId: string;
  /** When the message was bookmarked */
  bookmarkedAt: Date;
  /** Optional note about why this was bookmarked */
  note?: string;
  /** Collection IDs this bookmark belongs to */
  collectionIds: string[];
  /** Tags for organization */
  tags: string[];
  /** The bookmarked message */
  message: Message;
}

/**
 * Minimal bookmark info for lists
 */
export interface BookmarkListItem {
  id: string;
  messageId: string;
  bookmarkedAt: Date;
  note?: string;
  collectionIds: string[];
  tags: string[];
  message: {
    id: string;
    content: string;
    createdAt: Date;
    channelId: string;
    userId: string;
    user: MessageUser;
    channel: {
      id: string;
      name: string;
      type: "public" | "private" | "dm" | "group_dm";
    };
    hasAttachments: boolean;
    attachmentCount?: number;
  };
}

// ============================================================================
// Bookmark Collection Types
// ============================================================================

/**
 * Collection of bookmarks for organization
 */
export interface BookmarkCollection {
  /** Unique collection ID */
  id: string;
  /** Collection name */
  name: string;
  /** Optional description */
  description?: string;
  /** User ID who owns the collection */
  userId: string;
  /** Icon for the collection */
  icon?: string;
  /** Color for the collection */
  color?: string;
  /** Number of bookmarks in this collection */
  bookmarkCount: number;
  /** When the collection was created */
  createdAt: Date;
  /** When the collection was last updated */
  updatedAt: Date;
  /** Whether this collection is private */
  isPrivate: boolean;
  /** Sort order for display */
  sortOrder: number;
}

/**
 * Input for creating a bookmark collection
 */
export interface CreateBookmarkCollectionInput {
  name: string;
  description?: string;
  icon?: string;
  color?: string;
  isPrivate?: boolean;
}

/**
 * Input for updating a bookmark collection
 */
export interface UpdateBookmarkCollectionInput {
  name?: string;
  description?: string;
  icon?: string;
  color?: string;
  isPrivate?: boolean;
  sortOrder?: number;
}

// ============================================================================
// Saved Messages Types
// ============================================================================

/**
 * A saved message (personal message space like Telegram)
 */
export interface SavedMessage {
  /** Unique saved message ID */
  id: string;
  /** User ID who saved this */
  userId: string;
  /** Original message ID (if saved from a message) */
  originalMessageId?: string;
  /** Saved message content */
  content: string;
  /** When it was saved */
  savedAt: Date;
  /** Optional note */
  note?: string;
  /** Source channel (if from a message) */
  sourceChannelId?: string;
  /** Source channel info */
  sourceChannel?: {
    id: string;
    name: string;
    type: "public" | "private" | "dm" | "group_dm";
  };
  /** Original author (if from a message) */
  originalAuthor?: MessageUser;
  /** Attachments */
  attachments?: unknown[];
  /** Tags */
  tags: string[];
}

/**
 * Input for saving a message
 */
export interface SaveMessageInput {
  content: string;
  originalMessageId?: string;
  sourceChannelId?: string;
  note?: string;
  tags?: string[];
  attachments?: unknown[];
}

// ============================================================================
// Bookmark Filter & Sort Types
// ============================================================================

/**
 * Filter options for bookmarks
 */
export interface BookmarkFilter {
  /** Filter by channel */
  channelId?: string;
  /** Filter by collection */
  collectionId?: string;
  /** Filter by tag */
  tag?: string;
  /** Filter by date range */
  dateRange?: {
    start: Date;
    end: Date;
  };
  /** Filter by content type */
  hasAttachments?: boolean;
  /** Search query */
  searchQuery?: string;
  /** Filter by user (for shared bookmarks) */
  userId?: string;
}

/**
 * Sort options for bookmarks
 */
export type BookmarkSortBy =
  | "bookmarked_at_desc"
  | "bookmarked_at_asc"
  | "message_created_at_desc"
  | "message_created_at_asc"
  | "channel_name"
  | "relevance";

/**
 * Bookmark sort options
 */
export interface BookmarkSortOptions {
  sortBy: BookmarkSortBy;
  sortOrder?: "asc" | "desc";
}

// ============================================================================
// Bookmark Statistics Types
// ============================================================================

/**
 * Statistics about user's bookmarks
 */
export interface BookmarkStats {
  /** Total number of bookmarks */
  totalBookmarks: number;
  /** Bookmarks by channel */
  byChannel: Array<{
    channelId: string;
    channelName: string;
    count: number;
  }>;
  /** Bookmarks by collection */
  byCollection: Array<{
    collectionId: string;
    collectionName: string;
    count: number;
  }>;
  /** Most used tags */
  topTags: Array<{
    tag: string;
    count: number;
  }>;
  /** Recent activity */
  recentActivity: Array<{
    date: Date;
    count: number;
  }>;
}

// ============================================================================
// Bookmark Export Types
// ============================================================================

/**
 * Export format options
 */
export type BookmarkExportFormat = "json" | "csv" | "markdown" | "html";

/**
 * Export options
 */
export interface BookmarkExportOptions {
  format: BookmarkExportFormat;
  includeContent: boolean;
  includeAttachments: boolean;
  includeMetadata: boolean;
  collectionIds?: string[];
  channelIds?: string[];
  dateRange?: {
    start: Date;
    end: Date;
  };
}

/**
 * Exported bookmark data
 */
export interface BookmarkExportData {
  exportedAt: Date;
  format: BookmarkExportFormat;
  totalCount: number;
  bookmarks: Array<{
    id: string;
    content: string;
    bookmarkedAt: Date;
    note?: string;
    tags: string[];
    collections: string[];
    channel: {
      id: string;
      name: string;
      type: string;
    };
    author: {
      id: string;
      displayName: string;
    };
    messageCreatedAt: Date;
    attachments?: unknown[];
    metadata?: Record<string, unknown>;
  }>;
}

// ============================================================================
// Bookmark Action Types
// ============================================================================

/**
 * Bookmark action permissions
 */
export interface BookmarkActionPermissions {
  canAdd: boolean;
  canRemove: boolean;
  canEdit: boolean;
  canCreateCollection: boolean;
  canShare: boolean;
  canExport: boolean;
}

/**
 * Bookmark action type
 */
export type BookmarkAction =
  | "add"
  | "remove"
  | "edit"
  | "add-to-collection"
  | "remove-from-collection"
  | "add-tag"
  | "remove-tag"
  | "jump-to-message"
  | "copy-link"
  | "share"
  | "export";

// ============================================================================
// Bookmark Input Types
// ============================================================================

/**
 * Input for adding a bookmark
 */
export interface AddBookmarkInput {
  messageId: string;
  note?: string;
  collectionIds?: string[];
  tags?: string[];
}

/**
 * Input for updating a bookmark
 */
export interface UpdateBookmarkInput {
  bookmarkId: string;
  note?: string;
  collectionIds?: string[];
  tags?: string[];
}

/**
 * Input for removing a bookmark
 */
export interface RemoveBookmarkInput {
  bookmarkId: string;
}

/**
 * Batch add bookmarks input
 */
export interface BatchAddBookmarksInput {
  messageIds: string[];
  collectionId?: string;
  tags?: string[];
}

// ============================================================================
// Bookmark Event Types
// ============================================================================

/**
 * Bookmark event type
 */
export type BookmarkEventType =
  | "bookmark_added"
  | "bookmark_removed"
  | "bookmark_updated"
  | "collection_created"
  | "collection_updated"
  | "collection_deleted";

/**
 * Bookmark event
 */
export interface BookmarkEvent {
  type: BookmarkEventType;
  bookmarkId?: string;
  collectionId?: string;
  userId: string;
  timestamp: Date;
  metadata?: Record<string, unknown>;
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Check if a message is bookmarked
 */
export function isMessageBookmarked(
  messageId: string,
  bookmarks: Bookmark[],
): boolean {
  return bookmarks.some((b) => b.messageId === messageId);
}

/**
 * Get bookmark for a message
 */
export function getBookmarkForMessage(
  messageId: string,
  bookmarks: Bookmark[],
): Bookmark | undefined {
  return bookmarks.find((b) => b.messageId === messageId);
}

/**
 * Format bookmark count
 */
export function formatBookmarkCount(count: number): string {
  if (count === 0) return "No bookmarks";
  if (count === 1) return "1 bookmark";
  return `${count.toLocaleString()} bookmarks`;
}

/**
 * Get bookmarks by collection
 */
export function getBookmarksByCollection(
  collectionId: string,
  bookmarks: Bookmark[],
): Bookmark[] {
  return bookmarks.filter((b) => b.collectionIds.includes(collectionId));
}

/**
 * Get bookmarks by tag
 */
export function getBookmarksByTag(
  tag: string,
  bookmarks: Bookmark[],
): Bookmark[] {
  return bookmarks.filter((b) => b.tags.includes(tag));
}

/**
 * Get bookmarks by channel
 */
export function getBookmarksByChannel(
  channelId: string,
  bookmarks: BookmarkListItem[],
): BookmarkListItem[] {
  return bookmarks.filter((b) => b.message.channelId === channelId);
}

/**
 * Get all unique tags from bookmarks
 */
export function getAllTags(bookmarks: Bookmark[]): string[] {
  const tags = new Set<string>();
  bookmarks.forEach((b) => {
    b.tags.forEach((tag) => tags.add(tag));
  });
  return Array.from(tags).sort();
}

/**
 * Get all unique channels from bookmarks
 */
export function getAllChannels(bookmarks: BookmarkListItem[]): Array<{
  id: string;
  name: string;
  count: number;
}> {
  const channelMap = new Map<
    string,
    { id: string; name: string; count: number }
  >();

  bookmarks.forEach((b) => {
    const existing = channelMap.get(b.message.channelId);
    if (existing) {
      existing.count++;
    } else {
      channelMap.set(b.message.channelId, {
        id: b.message.channelId,
        name: b.message.channel.name,
        count: 1,
      });
    }
  });

  return Array.from(channelMap.values()).sort((a, b) => b.count - a.count);
}

/**
 * Search bookmarks
 */
export function searchBookmarks(
  query: string,
  bookmarks: BookmarkListItem[],
): BookmarkListItem[] {
  const lowerQuery = query.toLowerCase();
  return bookmarks.filter(
    (b) =>
      b.message.content.toLowerCase().includes(lowerQuery) ||
      b.note?.toLowerCase().includes(lowerQuery) ||
      b.tags.some((tag) => tag.toLowerCase().includes(lowerQuery)) ||
      b.message.user.displayName.toLowerCase().includes(lowerQuery) ||
      b.message.channel.name.toLowerCase().includes(lowerQuery),
  );
}

/**
 * Sort bookmarks
 */
export function sortBookmarks(
  bookmarks: BookmarkListItem[],
  sortBy: BookmarkSortBy,
): BookmarkListItem[] {
  const sorted = [...bookmarks];

  switch (sortBy) {
    case "bookmarked_at_desc":
      return sorted.sort(
        (a, b) => b.bookmarkedAt.getTime() - a.bookmarkedAt.getTime(),
      );
    case "bookmarked_at_asc":
      return sorted.sort(
        (a, b) => a.bookmarkedAt.getTime() - b.bookmarkedAt.getTime(),
      );
    case "message_created_at_desc":
      return sorted.sort(
        (a, b) => b.message.createdAt.getTime() - a.message.createdAt.getTime(),
      );
    case "message_created_at_asc":
      return sorted.sort(
        (a, b) => a.message.createdAt.getTime() - b.message.createdAt.getTime(),
      );
    case "channel_name":
      return sorted.sort((a, b) =>
        a.message.channel.name.localeCompare(b.message.channel.name),
      );
    default:
      return sorted;
  }
}

/**
 * Export bookmarks to JSON
 */
export function exportBookmarksToJSON(
  bookmarks: BookmarkListItem[],
  options: BookmarkExportOptions,
): string {
  const exportData: BookmarkExportData = {
    exportedAt: new Date(),
    format: "json",
    totalCount: bookmarks.length,
    bookmarks: bookmarks.map((b) => ({
      id: b.id,
      content: options.includeContent ? b.message.content : "[content hidden]",
      bookmarkedAt: b.bookmarkedAt,
      note: b.note,
      tags: b.tags,
      collections: b.collectionIds,
      channel: {
        id: b.message.channelId,
        name: b.message.channel.name,
        type: b.message.channel.type,
      },
      author: {
        id: b.message.userId,
        displayName: b.message.user.displayName,
      },
      messageCreatedAt: b.message.createdAt,
      ...(options.includeAttachments && {
        attachments: [],
      }),
      ...(options.includeMetadata && {
        metadata: {},
      }),
    })),
  };

  return JSON.stringify(exportData, null, 2);
}

/**
 * Export bookmarks to CSV
 */
export function exportBookmarksToCSV(
  bookmarks: BookmarkListItem[],
  options: BookmarkExportOptions,
): string {
  const headers = [
    "ID",
    "Content",
    "Bookmarked At",
    "Note",
    "Tags",
    "Collections",
    "Channel",
    "Author",
    "Message Created At",
  ];

  const rows = bookmarks.map((b) => [
    b.id,
    options.includeContent
      ? `"${b.message.content.replace(/"/g, '""')}"`
      : "[hidden]",
    b.bookmarkedAt.toISOString(),
    b.note ? `"${b.note.replace(/"/g, '""')}"` : "",
    b.tags.join("; "),
    b.collectionIds.join("; "),
    b.message.channel.name,
    b.message.user.displayName,
    b.message.createdAt.toISOString(),
  ]);

  return [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
}
