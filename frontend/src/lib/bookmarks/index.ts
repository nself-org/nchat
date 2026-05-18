// Bookmark Library - Store and hooks for bookmark management

// Store
export {
  useBookmarkStore,
  selectAllBookmarks,
  selectBookmarkCount,
  selectAllFolders,
  selectFolderCount,
  selectUncategorizedBookmarks,
  selectUncategorizedCount,
  selectBookmarksByChannel,
  selectUniqueChannels,
  selectRecentBookmarks,
} from "./bookmark-store";

export type {
  Bookmark,
  BookmarkFolder,
  BookmarkMessage,
  BookmarkUser,
  BookmarkChannel,
  BookmarkAttachment,
  BookmarkState,
  BookmarkActions,
  BookmarkStore,
  SortBy,
  SortOrder,
} from "./bookmark-store";

// Hooks
export {
  useBookmarks,
  useBookmark,
  useBookmarkActions,
  useBookmarkFolders,
  useBookmarkSearch,
  useBookmarkFilters,
  useRecentBookmarks,
  useBookmarkCount,
  useBookmarkPanel,
} from "./use-bookmarks";

export type {
  UseBookmarksOptions,
  UseBookmarksReturn,
  UseBookmarkReturn,
  UseBookmarkActionsReturn,
  UseBookmarkFoldersReturn,
  UseBookmarkSearchReturn,
  UseBookmarkFiltersReturn,
} from "./use-bookmarks";
