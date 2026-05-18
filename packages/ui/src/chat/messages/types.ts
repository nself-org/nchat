/**
 * Shared types for messages domain — inlined from nchat/frontend source.
 * Avoids cross-package imports.
 *
 * @module chat/messages/types
 */

// ============================================================================
// Message Edit History
// ============================================================================

export interface MessageVersion {
  id: string;
  content: string;
  editedAt: string;
  editedBy?: {
    id: string;
    displayName: string;
    avatarUrl?: string;
  };
  reason?: string;
}

export interface MessageEditHistory {
  messageId: string;
  currentContent: string;
  editCount: number;
  firstEditedAt: string;
  lastEditedAt: string;
  versions: MessageVersion[];
}

// ============================================================================
// Pinned Messages
// ============================================================================

export interface PinnedMessage {
  id: string;
  messageId: string;
  channelId: string;
  pinnedAt: string;
  pinnedBy?: {
    id: string;
    displayName: string;
    avatarUrl?: string;
  };
  message: {
    id: string;
    content: string;
    authorId: string;
    authorName: string;
    authorAvatarUrl?: string;
    createdAt: string;
    type?: 'text' | 'image' | 'file' | 'code';
  };
}

export type PinSortBy = 'date' | 'author' | 'type';
export type SortOrder = 'asc' | 'desc';

export interface PinFilters {
  searchQuery?: string;
  messageType?: 'text' | 'image' | 'file' | 'code';
  pinnedBy?: string;
}

export interface ChannelPinStats {
  totalPins: number;
  remainingSlots: number;
  maxPins?: number;
}

// ============================================================================
// Bookmarks
// ============================================================================

export interface BookmarkFolder {
  id: string;
  name: string;
  icon?: string;
  color?: string;
  bookmarkCount?: number;
}

export interface BookmarkChannel {
  id: string;
  name: string;
  slug?: string;
}

export interface BookmarkMessage {
  id: string;
  content: string;
  authorId: string;
  authorName: string;
  authorAvatarUrl?: string;
  createdAt: string;
  channel: BookmarkChannel;
}

export interface Bookmark {
  id: string;
  messageId: string;
  message: BookmarkMessage;
  folderId?: string;
  folder?: BookmarkFolder;
  savedAt: string;
  note?: string;
}

export type BookmarkSortBy = 'date' | 'channel' | 'folder';
