/**
 * Search domain types.
 *
 * @module search/types
 */

// ============================================================================
// Search
// ============================================================================

export type SearchResultType = 'message' | 'channel' | 'user' | 'file'

export interface SearchResultBase {
  id: string
  type: SearchResultType
}

export interface MessageSearchResult extends SearchResultBase {
  type: 'message'
  content: string
  authorName: string
  authorAvatarUrl?: string
  channelName: string
  channelId: string
  createdAt: string
  /** Highlighted snippet with matched terms */
  snippet?: string
}

export interface ChannelSearchResult extends SearchResultBase {
  type: 'channel'
  name: string
  description?: string
  memberCount?: number
  isPrivate?: boolean
}

export interface UserSearchResult extends SearchResultBase {
  type: 'user'
  name: string
  displayName?: string
  avatarUrl?: string
  status?: 'online' | 'away' | 'dnd' | 'offline'
}

export interface FileSearchResult extends SearchResultBase {
  type: 'file'
  name: string
  mimeType?: string
  sizeBytes?: number
  uploadedBy?: string
  channelName?: string
  url: string
  thumbnailUrl?: string
  createdAt: string
}

export type SearchResult =
  | MessageSearchResult
  | ChannelSearchResult
  | UserSearchResult
  | FileSearchResult

export type SearchFilterType = 'message' | 'channel' | 'user' | 'file' | 'all'

export interface SearchFilters {
  type?: SearchFilterType
  channelId?: string
  userId?: string
  dateFrom?: string
  dateTo?: string
  hasFiles?: boolean
  hasMentions?: boolean
}

// ============================================================================
// Saved Searches
// ============================================================================

export interface SavedSearch {
  id: string
  query: string
  filters?: SearchFilters
  savedAt: string
  resultCount?: number
}

// ============================================================================
// Bookmarks
// ============================================================================

export interface BookmarkFolder {
  id: string
  name: string
  color?: string
  count: number
}

export interface Bookmark {
  id: string
  messageId: string
  content: string
  authorName: string
  authorAvatarUrl?: string
  channelName: string
  channelId: string
  folderId?: string
  note?: string
  savedAt: string
}

// ============================================================================
// Reminders
// ============================================================================

export type ReminderStatus = 'pending' | 'snoozed' | 'completed' | 'dismissed'
export type ReminderRepeat = 'none' | 'daily' | 'weekly' | 'monthly'

export interface Reminder {
  id: string
  messageId?: string
  messageContent?: string
  channelName?: string
  note?: string
  remindAt: string
  status: ReminderStatus
  repeat: ReminderRepeat
  createdAt: string
}

// ============================================================================
// Quick Recall (recently visited / pinned channels)
// ============================================================================

export interface QuickRecallItem {
  id: string
  type: 'channel' | 'dm' | 'group'
  name: string
  avatarUrl?: string
  lastVisitedAt?: string
  isPinned?: boolean
  unreadCount?: number
}
