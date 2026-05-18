/**
 * Bookmark Store - Manages bookmark state for the nself-chat application
 *
 * Handles bookmarked messages, folders, and bookmark organization
 */

import { create } from "zustand";
import { devtools, subscribeWithSelector, persist } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";

// ============================================================================
// Types
// ============================================================================

export interface BookmarkUser {
  id: string;
  username: string;
  display_name: string;
  avatar_url?: string;
}

export interface BookmarkChannel {
  id: string;
  name: string;
  slug: string;
}

export interface BookmarkAttachment {
  id: string;
  file_name: string;
  file_type: string;
  file_url: string;
  thumbnail_url?: string;
}

export interface BookmarkMessage {
  id: string;
  content: string;
  type:
    | "text"
    | "image"
    | "file"
    | "video"
    | "audio"
    | "system"
    | "code"
    | "forwarded";
  created_at: string;
  is_edited: boolean;
  is_pinned: boolean;
  user: BookmarkUser;
  channel: BookmarkChannel;
  attachments: BookmarkAttachment[];
}

export interface Bookmark {
  id: string;
  user_id: string;
  message_id: string;
  note?: string;
  created_at: string;
  folder_id?: string;
  message: BookmarkMessage;
}

export interface BookmarkFolder {
  id: string;
  name: string;
  color?: string;
  icon?: string;
  created_at: string;
  updated_at: string;
  bookmark_count: number;
}

export type SortBy = "date" | "channel" | "folder";
export type SortOrder = "asc" | "desc";

export interface BookmarkState {
  // Bookmark Data
  bookmarks: Map<string, Bookmark>;
  bookmarksByMessageId: Map<string, string>; // messageId -> bookmarkId mapping

  // Folders
  folders: Map<string, BookmarkFolder>;

  // UI State
  selectedFolderId: string | null;
  selectedChannelFilter: string | null;
  searchQuery: string;
  sortBy: SortBy;
  sortOrder: SortOrder;

  // Panel State
  isPanelOpen: boolean;
  isAddToFolderModalOpen: boolean;
  selectedBookmarkForFolder: string | null;

  // Loading States
  isLoading: boolean;
  isLoadingFolders: boolean;
  isSaving: boolean;
  error: string | null;

  // Pagination
  hasMoreBookmarks: boolean;
  bookmarkCursor: number;
  totalCount: number;
}

export interface BookmarkActions {
  // Bookmark CRUD
  setBookmarks: (bookmarks: Bookmark[]) => void;
  addBookmark: (bookmark: Bookmark) => void;
  updateBookmark: (bookmarkId: string, updates: Partial<Bookmark>) => void;
  removeBookmark: (bookmarkId: string) => void;
  removeBookmarkByMessageId: (messageId: string) => void;
  getBookmarkById: (bookmarkId: string) => Bookmark | undefined;
  getBookmarkByMessageId: (messageId: string) => Bookmark | undefined;
  isMessageBookmarked: (messageId: string) => boolean;
  clearAllBookmarks: () => void;

  // Folder CRUD
  setFolders: (folders: BookmarkFolder[]) => void;
  addFolder: (folder: BookmarkFolder) => void;
  updateFolder: (folderId: string, updates: Partial<BookmarkFolder>) => void;
  removeFolder: (folderId: string) => void;
  getFolderById: (folderId: string) => BookmarkFolder | undefined;

  // Bookmark-Folder Operations
  moveBookmarkToFolder: (bookmarkId: string, folderId: string | null) => void;
  getBookmarksByFolder: (folderId: string | null) => Bookmark[];

  // Filtering & Sorting
  setSelectedFolderId: (folderId: string | null) => void;
  setSelectedChannelFilter: (channelId: string | null) => void;
  setSearchQuery: (query: string) => void;
  setSortBy: (sortBy: SortBy) => void;
  setSortOrder: (sortOrder: SortOrder) => void;
  getFilteredBookmarks: () => Bookmark[];

  // Panel State
  openPanel: () => void;
  closePanel: () => void;
  togglePanel: () => void;
  openAddToFolderModal: (bookmarkId: string) => void;
  closeAddToFolderModal: () => void;

  // Loading/Error
  setLoading: (loading: boolean) => void;
  setLoadingFolders: (loading: boolean) => void;
  setSaving: (saving: boolean) => void;
  setError: (error: string | null) => void;

  // Pagination
  setHasMoreBookmarks: (hasMore: boolean) => void;
  setBookmarkCursor: (cursor: number) => void;
  setTotalCount: (count: number) => void;
  incrementCursor: (amount: number) => void;

  // Utility
  resetBookmarkStore: () => void;
}

export type BookmarkStore = BookmarkState & BookmarkActions;

// ============================================================================
// Initial State
// ============================================================================

const initialState: BookmarkState = {
  bookmarks: new Map(),
  bookmarksByMessageId: new Map(),
  folders: new Map(),
  selectedFolderId: null,
  selectedChannelFilter: null,
  searchQuery: "",
  sortBy: "date",
  sortOrder: "desc",
  isPanelOpen: false,
  isAddToFolderModalOpen: false,
  selectedBookmarkForFolder: null,
  isLoading: false,
  isLoadingFolders: false,
  isSaving: false,
  error: null,
  hasMoreBookmarks: false,
  bookmarkCursor: 0,
  totalCount: 0,
};

// ============================================================================
// Store
// ============================================================================

export const useBookmarkStore = create<BookmarkStore>()(
  devtools(
    subscribeWithSelector(
      persist(
        immer((set, get) => ({
          ...initialState,

          // Bookmark CRUD
          setBookmarks: (bookmarks) =>
            set(
              (state) => {
                state.bookmarks = new Map(bookmarks.map((b) => [b.id, b]));
                state.bookmarksByMessageId = new Map(
                  bookmarks.map((b) => [b.message_id, b.id]),
                );
              },
              false,
              "bookmark/setBookmarks",
            ),

          addBookmark: (bookmark) =>
            set(
              (state) => {
                state.bookmarks.set(bookmark.id, bookmark);
                state.bookmarksByMessageId.set(
                  bookmark.message_id,
                  bookmark.id,
                );
                state.totalCount += 1;

                // Update folder count if applicable
                if (bookmark.folder_id) {
                  const folder = state.folders.get(bookmark.folder_id);
                  if (folder) {
                    folder.bookmark_count += 1;
                  }
                }
              },
              false,
              "bookmark/addBookmark",
            ),

          updateBookmark: (bookmarkId, updates) =>
            set(
              (state) => {
                const bookmark = state.bookmarks.get(bookmarkId);
                if (bookmark) {
                  const oldFolderId = bookmark.folder_id;
                  const newFolderId = updates.folder_id;

                  // Update folder counts if folder changed
                  if (oldFolderId !== newFolderId) {
                    if (oldFolderId) {
                      const oldFolder = state.folders.get(oldFolderId);
                      if (oldFolder) {
                        oldFolder.bookmark_count = Math.max(
                          0,
                          oldFolder.bookmark_count - 1,
                        );
                      }
                    }
                    if (newFolderId) {
                      const newFolder = state.folders.get(newFolderId);
                      if (newFolder) {
                        newFolder.bookmark_count += 1;
                      }
                    }
                  }

                  state.bookmarks.set(bookmarkId, { ...bookmark, ...updates });
                }
              },
              false,
              "bookmark/updateBookmark",
            ),

          removeBookmark: (bookmarkId) =>
            set(
              (state) => {
                const bookmark = state.bookmarks.get(bookmarkId);
                if (bookmark) {
                  state.bookmarks.delete(bookmarkId);
                  state.bookmarksByMessageId.delete(bookmark.message_id);
                  state.totalCount = Math.max(0, state.totalCount - 1);

                  // Update folder count if applicable
                  if (bookmark.folder_id) {
                    const folder = state.folders.get(bookmark.folder_id);
                    if (folder) {
                      folder.bookmark_count = Math.max(
                        0,
                        folder.bookmark_count - 1,
                      );
                    }
                  }
                }
              },
              false,
              "bookmark/removeBookmark",
            ),

          removeBookmarkByMessageId: (messageId) =>
            set(
              (state) => {
                const bookmarkId = state.bookmarksByMessageId.get(messageId);
                if (bookmarkId) {
                  const bookmark = state.bookmarks.get(bookmarkId);
                  if (bookmark) {
                    state.bookmarks.delete(bookmarkId);
                    state.bookmarksByMessageId.delete(messageId);
                    state.totalCount = Math.max(0, state.totalCount - 1);

                    if (bookmark.folder_id) {
                      const folder = state.folders.get(bookmark.folder_id);
                      if (folder) {
                        folder.bookmark_count = Math.max(
                          0,
                          folder.bookmark_count - 1,
                        );
                      }
                    }
                  }
                }
              },
              false,
              "bookmark/removeBookmarkByMessageId",
            ),

          getBookmarkById: (bookmarkId) => get().bookmarks.get(bookmarkId),

          getBookmarkByMessageId: (messageId) => {
            const bookmarkId = get().bookmarksByMessageId.get(messageId);
            return bookmarkId ? get().bookmarks.get(bookmarkId) : undefined;
          },

          isMessageBookmarked: (messageId) =>
            get().bookmarksByMessageId.has(messageId),

          clearAllBookmarks: () =>
            set(
              (state) => {
                state.bookmarks = new Map();
                state.bookmarksByMessageId = new Map();
                state.totalCount = 0;

                // Reset folder counts
                state.folders.forEach((folder) => {
                  folder.bookmark_count = 0;
                });
              },
              false,
              "bookmark/clearAllBookmarks",
            ),

          // Folder CRUD
          setFolders: (folders) =>
            set(
              (state) => {
                state.folders = new Map(folders.map((f) => [f.id, f]));
              },
              false,
              "bookmark/setFolders",
            ),

          addFolder: (folder) =>
            set(
              (state) => {
                state.folders.set(folder.id, folder);
              },
              false,
              "bookmark/addFolder",
            ),

          updateFolder: (folderId, updates) =>
            set(
              (state) => {
                const folder = state.folders.get(folderId);
                if (folder) {
                  state.folders.set(folderId, {
                    ...folder,
                    ...updates,
                    updated_at: new Date().toISOString(),
                  });
                }
              },
              false,
              "bookmark/updateFolder",
            ),

          removeFolder: (folderId) =>
            set(
              (state) => {
                state.folders.delete(folderId);

                // Move bookmarks from deleted folder to uncategorized
                state.bookmarks.forEach((bookmark) => {
                  if (bookmark.folder_id === folderId) {
                    bookmark.folder_id = undefined;
                  }
                });

                // Reset selected folder if it was deleted
                if (state.selectedFolderId === folderId) {
                  state.selectedFolderId = null;
                }
              },
              false,
              "bookmark/removeFolder",
            ),

          getFolderById: (folderId) => get().folders.get(folderId),

          // Bookmark-Folder Operations
          moveBookmarkToFolder: (bookmarkId, folderId) =>
            set(
              (state) => {
                const bookmark = state.bookmarks.get(bookmarkId);
                if (bookmark) {
                  const oldFolderId = bookmark.folder_id;

                  // Update old folder count
                  if (oldFolderId) {
                    const oldFolder = state.folders.get(oldFolderId);
                    if (oldFolder) {
                      oldFolder.bookmark_count = Math.max(
                        0,
                        oldFolder.bookmark_count - 1,
                      );
                    }
                  }

                  // Update new folder count
                  if (folderId) {
                    const newFolder = state.folders.get(folderId);
                    if (newFolder) {
                      newFolder.bookmark_count += 1;
                    }
                  }

                  bookmark.folder_id = folderId ?? undefined;
                }
              },
              false,
              "bookmark/moveBookmarkToFolder",
            ),

          getBookmarksByFolder: (folderId) => {
            const bookmarks = Array.from(get().bookmarks.values());
            if (folderId === null) {
              return bookmarks.filter((b) => !b.folder_id);
            }
            return bookmarks.filter((b) => b.folder_id === folderId);
          },

          // Filtering & Sorting
          setSelectedFolderId: (folderId) =>
            set(
              (state) => {
                state.selectedFolderId = folderId;
              },
              false,
              "bookmark/setSelectedFolderId",
            ),

          setSelectedChannelFilter: (channelId) =>
            set(
              (state) => {
                state.selectedChannelFilter = channelId;
              },
              false,
              "bookmark/setSelectedChannelFilter",
            ),

          setSearchQuery: (query) =>
            set(
              (state) => {
                state.searchQuery = query;
              },
              false,
              "bookmark/setSearchQuery",
            ),

          setSortBy: (sortBy) =>
            set(
              (state) => {
                state.sortBy = sortBy;
              },
              false,
              "bookmark/setSortBy",
            ),

          setSortOrder: (sortOrder) =>
            set(
              (state) => {
                state.sortOrder = sortOrder;
              },
              false,
              "bookmark/setSortOrder",
            ),

          getFilteredBookmarks: () => {
            const state = get();
            let bookmarks = Array.from(state.bookmarks.values());

            // Filter by folder
            if (state.selectedFolderId !== null) {
              bookmarks = bookmarks.filter(
                (b) => b.folder_id === state.selectedFolderId,
              );
            }

            // Filter by channel
            if (state.selectedChannelFilter) {
              bookmarks = bookmarks.filter(
                (b) => b.message.channel.id === state.selectedChannelFilter,
              );
            }

            // Filter by search query
            if (state.searchQuery.trim()) {
              const query = state.searchQuery.toLowerCase();
              bookmarks = bookmarks.filter(
                (b) =>
                  b.message.content.toLowerCase().includes(query) ||
                  b.note?.toLowerCase().includes(query) ||
                  b.message.user.display_name.toLowerCase().includes(query) ||
                  b.message.channel.name.toLowerCase().includes(query),
              );
            }

            // Sort bookmarks
            bookmarks.sort((a, b) => {
              let comparison = 0;
              switch (state.sortBy) {
                case "date":
                  comparison =
                    new Date(b.created_at).getTime() -
                    new Date(a.created_at).getTime();
                  break;
                case "channel":
                  comparison = a.message.channel.name.localeCompare(
                    b.message.channel.name,
                  );
                  break;
                case "folder":
                  const folderA = a.folder_id
                    ? (state.folders.get(a.folder_id)?.name ?? "")
                    : "";
                  const folderB = b.folder_id
                    ? (state.folders.get(b.folder_id)?.name ?? "")
                    : "";
                  comparison = folderA.localeCompare(folderB);
                  break;
              }
              return state.sortOrder === "asc" ? comparison : -comparison;
            });

            return bookmarks;
          },

          // Panel State
          openPanel: () =>
            set(
              (state) => {
                state.isPanelOpen = true;
              },
              false,
              "bookmark/openPanel",
            ),

          closePanel: () =>
            set(
              (state) => {
                state.isPanelOpen = false;
              },
              false,
              "bookmark/closePanel",
            ),

          togglePanel: () =>
            set(
              (state) => {
                state.isPanelOpen = !state.isPanelOpen;
              },
              false,
              "bookmark/togglePanel",
            ),

          openAddToFolderModal: (bookmarkId) =>
            set(
              (state) => {
                state.isAddToFolderModalOpen = true;
                state.selectedBookmarkForFolder = bookmarkId;
              },
              false,
              "bookmark/openAddToFolderModal",
            ),

          closeAddToFolderModal: () =>
            set(
              (state) => {
                state.isAddToFolderModalOpen = false;
                state.selectedBookmarkForFolder = null;
              },
              false,
              "bookmark/closeAddToFolderModal",
            ),

          // Loading/Error
          setLoading: (loading) =>
            set(
              (state) => {
                state.isLoading = loading;
              },
              false,
              "bookmark/setLoading",
            ),

          setLoadingFolders: (loading) =>
            set(
              (state) => {
                state.isLoadingFolders = loading;
              },
              false,
              "bookmark/setLoadingFolders",
            ),

          setSaving: (saving) =>
            set(
              (state) => {
                state.isSaving = saving;
              },
              false,
              "bookmark/setSaving",
            ),

          setError: (error) =>
            set(
              (state) => {
                state.error = error;
              },
              false,
              "bookmark/setError",
            ),

          // Pagination
          setHasMoreBookmarks: (hasMore) =>
            set(
              (state) => {
                state.hasMoreBookmarks = hasMore;
              },
              false,
              "bookmark/setHasMoreBookmarks",
            ),

          setBookmarkCursor: (cursor) =>
            set(
              (state) => {
                state.bookmarkCursor = cursor;
              },
              false,
              "bookmark/setBookmarkCursor",
            ),

          setTotalCount: (count) =>
            set(
              (state) => {
                state.totalCount = count;
              },
              false,
              "bookmark/setTotalCount",
            ),

          incrementCursor: (amount) =>
            set(
              (state) => {
                state.bookmarkCursor += amount;
              },
              false,
              "bookmark/incrementCursor",
            ),

          // Utility
          resetBookmarkStore: () =>
            set(
              () => ({
                ...initialState,
                bookmarks: new Map(),
                bookmarksByMessageId: new Map(),
                folders: new Map(),
              }),
              false,
              "bookmark/resetBookmarkStore",
            ),
        })),
        {
          name: "nchat-bookmarks",
          partialize: (state) => ({
            // Only persist UI preferences, not data
            sortBy: state.sortBy,
            sortOrder: state.sortOrder,
          }),
        },
      ),
    ),
    { name: "bookmark-store" },
  ),
);

// ============================================================================
// Selectors
// ============================================================================

export const selectAllBookmarks = (state: BookmarkStore) =>
  Array.from(state.bookmarks.values());

export const selectBookmarkCount = (state: BookmarkStore) => state.totalCount;

export const selectAllFolders = (state: BookmarkStore) =>
  Array.from(state.folders.values());

export const selectFolderCount = (state: BookmarkStore) => state.folders.size;

export const selectUncategorizedBookmarks = (state: BookmarkStore) =>
  Array.from(state.bookmarks.values()).filter((b) => !b.folder_id);

export const selectUncategorizedCount = (state: BookmarkStore) =>
  Array.from(state.bookmarks.values()).filter((b) => !b.folder_id).length;

export const selectBookmarksByChannel = (state: BookmarkStore) => {
  const byChannel: Record<string, Bookmark[]> = {};

  state.bookmarks.forEach((bookmark) => {
    const channelId = bookmark.message.channel.id;
    if (!byChannel[channelId]) {
      byChannel[channelId] = [];
    }
    byChannel[channelId].push(bookmark);
  });

  return byChannel;
};

export const selectUniqueChannels = (state: BookmarkStore) => {
  const channels = new Map<string, BookmarkChannel>();

  state.bookmarks.forEach((bookmark) => {
    const channel = bookmark.message.channel;
    if (!channels.has(channel.id)) {
      channels.set(channel.id, channel);
    }
  });

  return Array.from(channels.values());
};

export const selectRecentBookmarks =
  (limit = 5) =>
  (state: BookmarkStore) =>
    Array.from(state.bookmarks.values())
      .sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      )
      .slice(0, limit);
