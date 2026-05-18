/**
 * chat/messages barrel export.
 *
 * @module chat/messages
 */

// Types
export type {
  MessageVersion,
  MessageEditHistory,
  PinnedMessage,
  PinFilters,
  PinSortBy,
  SortOrder,
  ChannelPinStats,
  Bookmark,
  BookmarkFolder,
  BookmarkChannel,
  BookmarkMessage,
  BookmarkSortBy,
} from './types';

// Edit history
export { EditHistory, EditHistoryPanel } from './edit-history';
export type { EditHistoryProps, EditHistoryPanelProps } from './edit-history';

// Pinned messages
export { PinnedMessages } from './pinned-messages';
export type { PinnedMessagesProps, PinnedMessagesAdapter } from './pinned-messages';

// Bookmarks
export { BookmarksPanel, InlineBookmarksPanel } from './bookmarks-panel';
export type {
  BookmarksPanelProps,
  InlineBookmarksPanelProps,
  BookmarksAdapter,
} from './bookmarks-panel';
