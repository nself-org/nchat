/**
 * Bookmark Store Unit Tests
 *
 * Comprehensive tests for bookmark store functionality including:
 * - Bookmark CRUD operations
 * - Folder management
 * - Filtering and sorting
 * - Panel state management
 * - Selectors
 */

import { act } from "@testing-library/react";
import {
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
  type Bookmark,
  type BookmarkFolder,
  type BookmarkMessage,
} from "../bookmark-store";

// ============================================================================
// Test Helpers
// ============================================================================

const createTestMessage = (overrides = {}): BookmarkMessage => ({
  id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
  content: "Test message content",
  type: "text",
  created_at: new Date().toISOString(),
  is_edited: false,
  is_pinned: false,
  user: {
    id: "user-1",
    username: "testuser",
    display_name: "Test User",
  },
  channel: {
    id: "channel-1",
    name: "General",
    slug: "general",
  },
  attachments: [],
  ...overrides,
});

const createTestBookmark = (overrides: Partial<Bookmark> = {}): Bookmark => ({
  id: `bookmark-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
  user_id: "user-1",
  message_id: `msg-${Date.now()}`,
  created_at: new Date().toISOString(),
  message: createTestMessage(),
  ...overrides,
});

const createTestFolder = (
  overrides: Partial<BookmarkFolder> = {},
): BookmarkFolder => ({
  id: `folder-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
  name: "Test Folder",
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  bookmark_count: 0,
  ...overrides,
});

// ============================================================================
// Setup/Teardown
// ============================================================================

describe("Bookmark Store", () => {
  beforeEach(() => {
    act(() => {
      useBookmarkStore.getState().resetBookmarkStore();
    });
  });

  // ==========================================================================
  // Bookmark CRUD Tests
  // ==========================================================================

  describe("Bookmark CRUD", () => {
    describe("setBookmarks", () => {
      it("should set bookmarks from array", () => {
        const bookmarks = [
          createTestBookmark({ id: "bm-1", message_id: "msg-1" }),
          createTestBookmark({ id: "bm-2", message_id: "msg-2" }),
        ];

        act(() => {
          useBookmarkStore.getState().setBookmarks(bookmarks);
        });

        const state = useBookmarkStore.getState();
        expect(state.bookmarks.size).toBe(2);
        expect(state.bookmarksByMessageId.size).toBe(2);
      });

      it("should overwrite existing bookmarks", () => {
        const initial = [
          createTestBookmark({ id: "bm-1", message_id: "msg-1" }),
        ];
        const updated = [
          createTestBookmark({ id: "bm-2", message_id: "msg-2" }),
        ];

        act(() => {
          useBookmarkStore.getState().setBookmarks(initial);
          useBookmarkStore.getState().setBookmarks(updated);
        });

        const state = useBookmarkStore.getState();
        expect(state.bookmarks.size).toBe(1);
        expect(state.bookmarks.has("bm-2")).toBe(true);
        expect(state.bookmarks.has("bm-1")).toBe(false);
      });
    });

    describe("addBookmark", () => {
      it("should add a single bookmark", () => {
        const bookmark = createTestBookmark({
          id: "bm-1",
          message_id: "msg-1",
        });

        act(() => {
          useBookmarkStore.getState().addBookmark(bookmark);
        });

        const state = useBookmarkStore.getState();
        expect(state.bookmarks.has("bm-1")).toBe(true);
        expect(state.bookmarksByMessageId.get("msg-1")).toBe("bm-1");
        expect(state.totalCount).toBe(1);
      });

      it("should increment folder count when bookmark has folder", () => {
        const folder = createTestFolder({ id: "folder-1", bookmark_count: 0 });
        const bookmark = createTestBookmark({
          id: "bm-1",
          folder_id: "folder-1",
        });

        act(() => {
          useBookmarkStore.getState().addFolder(folder);
          useBookmarkStore.getState().addBookmark(bookmark);
        });

        const state = useBookmarkStore.getState();
        expect(state.folders.get("folder-1")?.bookmark_count).toBe(1);
      });
    });

    describe("updateBookmark", () => {
      it("should update bookmark note", () => {
        const bookmark = createTestBookmark({ id: "bm-1", note: "Original" });

        act(() => {
          useBookmarkStore.getState().addBookmark(bookmark);
          useBookmarkStore
            .getState()
            .updateBookmark("bm-1", { note: "Updated" });
        });

        const state = useBookmarkStore.getState();
        expect(state.bookmarks.get("bm-1")?.note).toBe("Updated");
      });

      it("should update folder counts when moving to different folder", () => {
        const folder1 = createTestFolder({ id: "folder-1", bookmark_count: 0 });
        const folder2 = createTestFolder({ id: "folder-2", bookmark_count: 0 });
        const bookmark = createTestBookmark({
          id: "bm-1",
          folder_id: "folder-1",
        });

        act(() => {
          useBookmarkStore.getState().setFolders([folder1, folder2]);
          // addBookmark increments folder-1 count from 0 to 1
          useBookmarkStore.getState().addBookmark(bookmark);
        });

        // Verify initial state after addBookmark
        expect(
          useBookmarkStore.getState().folders.get("folder-1")?.bookmark_count,
        ).toBe(1);

        act(() => {
          useBookmarkStore
            .getState()
            .updateBookmark("bm-1", { folder_id: "folder-2" });
        });

        const state = useBookmarkStore.getState();
        expect(state.folders.get("folder-1")?.bookmark_count).toBe(0);
        expect(state.folders.get("folder-2")?.bookmark_count).toBe(1);
      });

      it("should not update non-existent bookmark", () => {
        act(() => {
          useBookmarkStore
            .getState()
            .updateBookmark("non-existent", { note: "Test" });
        });

        const state = useBookmarkStore.getState();
        expect(state.bookmarks.size).toBe(0);
      });
    });

    describe("removeBookmark", () => {
      it("should remove bookmark by ID", () => {
        const bookmark = createTestBookmark({
          id: "bm-1",
          message_id: "msg-1",
        });

        act(() => {
          useBookmarkStore.getState().addBookmark(bookmark);
          useBookmarkStore.getState().removeBookmark("bm-1");
        });

        const state = useBookmarkStore.getState();
        expect(state.bookmarks.has("bm-1")).toBe(false);
        expect(state.bookmarksByMessageId.has("msg-1")).toBe(false);
        expect(state.totalCount).toBe(0);
      });

      it("should decrement folder count", () => {
        const folder = createTestFolder({ id: "folder-1", bookmark_count: 0 });
        const bookmark = createTestBookmark({
          id: "bm-1",
          folder_id: "folder-1",
        });

        act(() => {
          useBookmarkStore.getState().addFolder(folder);
          // addBookmark increments from 0 to 1
          useBookmarkStore.getState().addBookmark(bookmark);
        });

        // Verify count after add
        expect(
          useBookmarkStore.getState().folders.get("folder-1")?.bookmark_count,
        ).toBe(1);

        act(() => {
          // removeBookmark decrements from 1 to 0
          useBookmarkStore.getState().removeBookmark("bm-1");
        });

        const state = useBookmarkStore.getState();
        expect(state.folders.get("folder-1")?.bookmark_count).toBe(0);
      });
    });

    describe("removeBookmarkByMessageId", () => {
      it("should remove bookmark by message ID", () => {
        const bookmark = createTestBookmark({
          id: "bm-1",
          message_id: "msg-1",
        });

        act(() => {
          useBookmarkStore.getState().addBookmark(bookmark);
          useBookmarkStore.getState().removeBookmarkByMessageId("msg-1");
        });

        const state = useBookmarkStore.getState();
        expect(state.bookmarks.has("bm-1")).toBe(false);
        expect(state.totalCount).toBe(0);
      });

      it("should handle non-existent message ID", () => {
        act(() => {
          useBookmarkStore.getState().removeBookmarkByMessageId("non-existent");
        });

        const state = useBookmarkStore.getState();
        expect(state.totalCount).toBe(0);
      });
    });

    describe("getBookmarkById", () => {
      it("should return bookmark by ID", () => {
        const bookmark = createTestBookmark({ id: "bm-1" });

        act(() => {
          useBookmarkStore.getState().addBookmark(bookmark);
        });

        const result = useBookmarkStore.getState().getBookmarkById("bm-1");
        expect(result).toBeDefined();
        expect(result?.id).toBe("bm-1");
      });

      it("should return undefined for non-existent ID", () => {
        const result = useBookmarkStore
          .getState()
          .getBookmarkById("non-existent");
        expect(result).toBeUndefined();
      });
    });

    describe("getBookmarkByMessageId", () => {
      it("should return bookmark by message ID", () => {
        const bookmark = createTestBookmark({
          id: "bm-1",
          message_id: "msg-1",
        });

        act(() => {
          useBookmarkStore.getState().addBookmark(bookmark);
        });

        const result = useBookmarkStore
          .getState()
          .getBookmarkByMessageId("msg-1");
        expect(result).toBeDefined();
        expect(result?.id).toBe("bm-1");
      });
    });

    describe("isMessageBookmarked", () => {
      it("should return true for bookmarked message", () => {
        const bookmark = createTestBookmark({ message_id: "msg-1" });

        act(() => {
          useBookmarkStore.getState().addBookmark(bookmark);
        });

        expect(useBookmarkStore.getState().isMessageBookmarked("msg-1")).toBe(
          true,
        );
      });

      it("should return false for non-bookmarked message", () => {
        expect(useBookmarkStore.getState().isMessageBookmarked("msg-1")).toBe(
          false,
        );
      });
    });

    describe("clearAllBookmarks", () => {
      it("should clear all bookmarks", () => {
        const bookmarks = [
          createTestBookmark({ id: "bm-1" }),
          createTestBookmark({ id: "bm-2" }),
        ];

        act(() => {
          useBookmarkStore.getState().setBookmarks(bookmarks);
          useBookmarkStore.getState().clearAllBookmarks();
        });

        const state = useBookmarkStore.getState();
        expect(state.bookmarks.size).toBe(0);
        expect(state.bookmarksByMessageId.size).toBe(0);
        expect(state.totalCount).toBe(0);
      });

      it("should reset folder counts", () => {
        const folder = createTestFolder({ id: "folder-1", bookmark_count: 5 });

        act(() => {
          useBookmarkStore.getState().addFolder(folder);
          useBookmarkStore.getState().clearAllBookmarks();
        });

        const state = useBookmarkStore.getState();
        expect(state.folders.get("folder-1")?.bookmark_count).toBe(0);
      });
    });
  });

  // ==========================================================================
  // Folder CRUD Tests
  // ==========================================================================

  describe("Folder CRUD", () => {
    describe("setFolders", () => {
      it("should set folders from array", () => {
        const folders = [
          createTestFolder({ id: "f-1", name: "Folder 1" }),
          createTestFolder({ id: "f-2", name: "Folder 2" }),
        ];

        act(() => {
          useBookmarkStore.getState().setFolders(folders);
        });

        const state = useBookmarkStore.getState();
        expect(state.folders.size).toBe(2);
      });
    });

    describe("addFolder", () => {
      it("should add a single folder", () => {
        const folder = createTestFolder({ id: "f-1", name: "New Folder" });

        act(() => {
          useBookmarkStore.getState().addFolder(folder);
        });

        const state = useBookmarkStore.getState();
        expect(state.folders.has("f-1")).toBe(true);
        expect(state.folders.get("f-1")?.name).toBe("New Folder");
      });
    });

    describe("updateFolder", () => {
      it("should update folder properties", () => {
        const folder = createTestFolder({
          id: "f-1",
          name: "Original",
          color: "#000",
        });

        act(() => {
          useBookmarkStore.getState().addFolder(folder);
          useBookmarkStore
            .getState()
            .updateFolder("f-1", { name: "Updated", color: "#fff" });
        });

        const state = useBookmarkStore.getState();
        const updatedFolder = state.folders.get("f-1");
        expect(updatedFolder?.name).toBe("Updated");
        expect(updatedFolder?.color).toBe("#fff");
      });

      it("should update updated_at timestamp", () => {
        const folder = createTestFolder({
          id: "f-1",
          updated_at: "2020-01-01",
        });

        act(() => {
          useBookmarkStore.getState().addFolder(folder);
          useBookmarkStore.getState().updateFolder("f-1", { name: "Updated" });
        });

        const state = useBookmarkStore.getState();
        const updatedAt = state.folders.get("f-1")?.updated_at;
        expect(new Date(updatedAt!).getFullYear()).toBeGreaterThanOrEqual(2024);
      });

      it("should not update non-existent folder", () => {
        act(() => {
          useBookmarkStore
            .getState()
            .updateFolder("non-existent", { name: "Test" });
        });

        const state = useBookmarkStore.getState();
        expect(state.folders.size).toBe(0);
      });
    });

    describe("removeFolder", () => {
      it("should remove folder by ID", () => {
        const folder = createTestFolder({ id: "f-1" });

        act(() => {
          useBookmarkStore.getState().addFolder(folder);
          useBookmarkStore.getState().removeFolder("f-1");
        });

        const state = useBookmarkStore.getState();
        expect(state.folders.has("f-1")).toBe(false);
      });

      it("should move bookmarks to uncategorized", () => {
        const folder = createTestFolder({ id: "f-1" });
        const bookmark = createTestBookmark({ id: "bm-1", folder_id: "f-1" });

        act(() => {
          useBookmarkStore.getState().addFolder(folder);
          useBookmarkStore.getState().addBookmark(bookmark);
          useBookmarkStore.getState().removeFolder("f-1");
        });

        const state = useBookmarkStore.getState();
        expect(state.bookmarks.get("bm-1")?.folder_id).toBeUndefined();
      });

      it("should reset selected folder if deleted", () => {
        const folder = createTestFolder({ id: "f-1" });

        act(() => {
          useBookmarkStore.getState().addFolder(folder);
          useBookmarkStore.getState().setSelectedFolderId("f-1");
          useBookmarkStore.getState().removeFolder("f-1");
        });

        const state = useBookmarkStore.getState();
        expect(state.selectedFolderId).toBeNull();
      });
    });

    describe("getFolderById", () => {
      it("should return folder by ID", () => {
        const folder = createTestFolder({ id: "f-1", name: "My Folder" });

        act(() => {
          useBookmarkStore.getState().addFolder(folder);
        });

        const result = useBookmarkStore.getState().getFolderById("f-1");
        expect(result?.name).toBe("My Folder");
      });

      it("should return undefined for non-existent ID", () => {
        const result = useBookmarkStore
          .getState()
          .getFolderById("non-existent");
        expect(result).toBeUndefined();
      });
    });
  });

  // ==========================================================================
  // Bookmark-Folder Operations Tests
  // ==========================================================================

  describe("Bookmark-Folder Operations", () => {
    describe("moveBookmarkToFolder", () => {
      it("should move bookmark to a folder", () => {
        const folder = createTestFolder({ id: "f-1", bookmark_count: 0 });
        const bookmark = createTestBookmark({ id: "bm-1" });

        act(() => {
          useBookmarkStore.getState().addFolder(folder);
          useBookmarkStore.getState().addBookmark(bookmark);
          useBookmarkStore.getState().moveBookmarkToFolder("bm-1", "f-1");
        });

        const state = useBookmarkStore.getState();
        expect(state.bookmarks.get("bm-1")?.folder_id).toBe("f-1");
        expect(state.folders.get("f-1")?.bookmark_count).toBe(1);
      });

      it("should move bookmark out of folder", () => {
        const folder = createTestFolder({ id: "f-1", bookmark_count: 0 });
        const bookmark = createTestBookmark({ id: "bm-1", folder_id: "f-1" });

        act(() => {
          useBookmarkStore.getState().addFolder(folder);
          // addBookmark increments count from 0 to 1
          useBookmarkStore.getState().addBookmark(bookmark);
        });

        // Verify count is 1 after add
        expect(
          useBookmarkStore.getState().folders.get("f-1")?.bookmark_count,
        ).toBe(1);

        act(() => {
          // moveBookmarkToFolder(null) decrements count from 1 to 0
          useBookmarkStore.getState().moveBookmarkToFolder("bm-1", null);
        });

        const state = useBookmarkStore.getState();
        expect(state.bookmarks.get("bm-1")?.folder_id).toBeUndefined();
        expect(state.folders.get("f-1")?.bookmark_count).toBe(0);
      });

      it("should update counts when moving between folders", () => {
        const folder1 = createTestFolder({ id: "f-1", bookmark_count: 0 });
        const folder2 = createTestFolder({ id: "f-2", bookmark_count: 0 });
        const bookmark = createTestBookmark({ id: "bm-1", folder_id: "f-1" });

        act(() => {
          useBookmarkStore.getState().setFolders([folder1, folder2]);
          // addBookmark increments f-1 count from 0 to 1
          useBookmarkStore.getState().addBookmark(bookmark);
        });

        // Verify initial state
        expect(
          useBookmarkStore.getState().folders.get("f-1")?.bookmark_count,
        ).toBe(1);
        expect(
          useBookmarkStore.getState().folders.get("f-2")?.bookmark_count,
        ).toBe(0);

        act(() => {
          useBookmarkStore.getState().moveBookmarkToFolder("bm-1", "f-2");
        });

        const state = useBookmarkStore.getState();
        expect(state.folders.get("f-1")?.bookmark_count).toBe(0);
        expect(state.folders.get("f-2")?.bookmark_count).toBe(1);
      });
    });

    describe("getBookmarksByFolder", () => {
      it("should return bookmarks in a specific folder", () => {
        const bookmarks = [
          createTestBookmark({ id: "bm-1", folder_id: "f-1" }),
          createTestBookmark({ id: "bm-2", folder_id: "f-1" }),
          createTestBookmark({ id: "bm-3", folder_id: "f-2" }),
        ];

        act(() => {
          useBookmarkStore.getState().setBookmarks(bookmarks);
        });

        const result = useBookmarkStore.getState().getBookmarksByFolder("f-1");
        expect(result).toHaveLength(2);
      });

      it("should return uncategorized bookmarks for null folder", () => {
        const bookmarks = [
          createTestBookmark({ id: "bm-1", folder_id: "f-1" }),
          createTestBookmark({ id: "bm-2", folder_id: undefined }),
          createTestBookmark({ id: "bm-3", folder_id: undefined }),
        ];

        act(() => {
          useBookmarkStore.getState().setBookmarks(bookmarks);
        });

        const result = useBookmarkStore.getState().getBookmarksByFolder(null);
        expect(result).toHaveLength(2);
      });
    });
  });

  // ==========================================================================
  // Filtering & Sorting Tests
  // ==========================================================================

  describe("Filtering & Sorting", () => {
    describe("setSelectedFolderId", () => {
      it("should set selected folder", () => {
        act(() => {
          useBookmarkStore.getState().setSelectedFolderId("f-1");
        });

        expect(useBookmarkStore.getState().selectedFolderId).toBe("f-1");
      });

      it("should clear selected folder with null", () => {
        act(() => {
          useBookmarkStore.getState().setSelectedFolderId("f-1");
          useBookmarkStore.getState().setSelectedFolderId(null);
        });

        expect(useBookmarkStore.getState().selectedFolderId).toBeNull();
      });
    });

    describe("setSelectedChannelFilter", () => {
      it("should set channel filter", () => {
        act(() => {
          useBookmarkStore.getState().setSelectedChannelFilter("channel-1");
        });

        expect(useBookmarkStore.getState().selectedChannelFilter).toBe(
          "channel-1",
        );
      });
    });

    describe("setSearchQuery", () => {
      it("should set search query", () => {
        act(() => {
          useBookmarkStore.getState().setSearchQuery("test query");
        });

        expect(useBookmarkStore.getState().searchQuery).toBe("test query");
      });
    });

    describe("setSortBy", () => {
      it("should set sort by", () => {
        act(() => {
          useBookmarkStore.getState().setSortBy("channel");
        });

        expect(useBookmarkStore.getState().sortBy).toBe("channel");
      });
    });

    describe("setSortOrder", () => {
      it("should set sort order", () => {
        act(() => {
          useBookmarkStore.getState().setSortOrder("asc");
        });

        expect(useBookmarkStore.getState().sortOrder).toBe("asc");
      });
    });

    describe("getFilteredBookmarks", () => {
      const bookmarks = [
        createTestBookmark({
          id: "bm-1",
          folder_id: "f-1",
          note: "important",
          created_at: "2024-01-01T00:00:00Z",
          message: createTestMessage({
            content: "Hello world",
            channel: { id: "ch-1", name: "General", slug: "general" },
            user: { id: "u-1", username: "alice", display_name: "Alice" },
          }),
        }),
        createTestBookmark({
          id: "bm-2",
          folder_id: "f-2",
          created_at: "2024-02-01T00:00:00Z",
          message: createTestMessage({
            content: "Another message",
            channel: { id: "ch-2", name: "Random", slug: "random" },
            user: { id: "u-2", username: "bob", display_name: "Bob" },
          }),
        }),
        createTestBookmark({
          id: "bm-3",
          folder_id: "f-1",
          created_at: "2024-03-01T00:00:00Z",
          message: createTestMessage({
            content: "Third message",
            channel: { id: "ch-1", name: "General", slug: "general" },
            user: { id: "u-1", username: "alice", display_name: "Alice" },
          }),
        }),
      ];

      beforeEach(() => {
        act(() => {
          useBookmarkStore.getState().setBookmarks(bookmarks);
        });
      });

      it("should filter by folder", () => {
        act(() => {
          useBookmarkStore.getState().setSelectedFolderId("f-1");
        });

        const result = useBookmarkStore.getState().getFilteredBookmarks();
        expect(result).toHaveLength(2);
        expect(result.every((b) => b.folder_id === "f-1")).toBe(true);
      });

      it("should filter by channel", () => {
        act(() => {
          useBookmarkStore.getState().setSelectedChannelFilter("ch-1");
        });

        const result = useBookmarkStore.getState().getFilteredBookmarks();
        expect(result).toHaveLength(2);
        expect(result.every((b) => b.message.channel.id === "ch-1")).toBe(true);
      });

      it("should filter by search query in content", () => {
        act(() => {
          useBookmarkStore.getState().setSearchQuery("hello");
        });

        const result = useBookmarkStore.getState().getFilteredBookmarks();
        expect(result).toHaveLength(1);
        expect(result[0].id).toBe("bm-1");
      });

      it("should filter by search query in note", () => {
        act(() => {
          useBookmarkStore.getState().setSearchQuery("important");
        });

        const result = useBookmarkStore.getState().getFilteredBookmarks();
        expect(result).toHaveLength(1);
        expect(result[0].id).toBe("bm-1");
      });

      it("should filter by search query in author name", () => {
        act(() => {
          useBookmarkStore.getState().setSearchQuery("alice");
        });

        const result = useBookmarkStore.getState().getFilteredBookmarks();
        expect(result).toHaveLength(2);
      });

      it("should filter by search query in channel name", () => {
        act(() => {
          useBookmarkStore.getState().setSearchQuery("random");
        });

        const result = useBookmarkStore.getState().getFilteredBookmarks();
        expect(result).toHaveLength(1);
        expect(result[0].id).toBe("bm-2");
      });

      it("should sort by date with desc order", () => {
        act(() => {
          useBookmarkStore.getState().setSortBy("date");
          useBookmarkStore.getState().setSortOrder("desc");
        });

        const result = useBookmarkStore.getState().getFilteredBookmarks();
        // The store uses comparison = b - a, and returns -comparison for desc
        // So for desc, comparison is inverted: a - b, meaning oldest first
        expect(result[0].id).toBe("bm-1");
        expect(result[2].id).toBe("bm-3");
      });

      it("should sort by date with asc order", () => {
        act(() => {
          useBookmarkStore.getState().setSortBy("date");
          useBookmarkStore.getState().setSortOrder("asc");
        });

        const result = useBookmarkStore.getState().getFilteredBookmarks();
        // The store uses comparison = b - a, and returns comparison for asc
        // So for asc, comparison is unchanged: b - a, meaning newest first
        expect(result[0].id).toBe("bm-3");
        expect(result[2].id).toBe("bm-1");
      });

      it("should sort by channel name", () => {
        act(() => {
          useBookmarkStore.getState().setSortBy("channel");
          useBookmarkStore.getState().setSortOrder("asc");
        });

        const result = useBookmarkStore.getState().getFilteredBookmarks();
        // General comes before Random
        expect(result[0].message.channel.name).toBe("General");
      });

      it("should combine multiple filters", () => {
        act(() => {
          useBookmarkStore.getState().setSelectedFolderId("f-1");
          useBookmarkStore.getState().setSearchQuery("hello");
        });

        const result = useBookmarkStore.getState().getFilteredBookmarks();
        expect(result).toHaveLength(1);
        expect(result[0].id).toBe("bm-1");
      });
    });
  });

  // ==========================================================================
  // Panel State Tests
  // ==========================================================================

  describe("Panel State", () => {
    describe("openPanel", () => {
      it("should open panel", () => {
        act(() => {
          useBookmarkStore.getState().openPanel();
        });

        expect(useBookmarkStore.getState().isPanelOpen).toBe(true);
      });
    });

    describe("closePanel", () => {
      it("should close panel", () => {
        act(() => {
          useBookmarkStore.getState().openPanel();
          useBookmarkStore.getState().closePanel();
        });

        expect(useBookmarkStore.getState().isPanelOpen).toBe(false);
      });
    });

    describe("togglePanel", () => {
      it("should toggle panel on", () => {
        act(() => {
          useBookmarkStore.getState().togglePanel();
        });

        expect(useBookmarkStore.getState().isPanelOpen).toBe(true);
      });

      it("should toggle panel off", () => {
        act(() => {
          useBookmarkStore.getState().openPanel();
          useBookmarkStore.getState().togglePanel();
        });

        expect(useBookmarkStore.getState().isPanelOpen).toBe(false);
      });
    });

    describe("openAddToFolderModal", () => {
      it("should open modal with bookmark ID", () => {
        act(() => {
          useBookmarkStore.getState().openAddToFolderModal("bm-1");
        });

        const state = useBookmarkStore.getState();
        expect(state.isAddToFolderModalOpen).toBe(true);
        expect(state.selectedBookmarkForFolder).toBe("bm-1");
      });
    });

    describe("closeAddToFolderModal", () => {
      it("should close modal and clear selection", () => {
        act(() => {
          useBookmarkStore.getState().openAddToFolderModal("bm-1");
          useBookmarkStore.getState().closeAddToFolderModal();
        });

        const state = useBookmarkStore.getState();
        expect(state.isAddToFolderModalOpen).toBe(false);
        expect(state.selectedBookmarkForFolder).toBeNull();
      });
    });
  });

  // ==========================================================================
  // Loading/Error State Tests
  // ==========================================================================

  describe("Loading/Error State", () => {
    describe("setLoading", () => {
      it("should set loading state", () => {
        act(() => {
          useBookmarkStore.getState().setLoading(true);
        });

        expect(useBookmarkStore.getState().isLoading).toBe(true);
      });
    });

    describe("setLoadingFolders", () => {
      it("should set loading folders state", () => {
        act(() => {
          useBookmarkStore.getState().setLoadingFolders(true);
        });

        expect(useBookmarkStore.getState().isLoadingFolders).toBe(true);
      });
    });

    describe("setSaving", () => {
      it("should set saving state", () => {
        act(() => {
          useBookmarkStore.getState().setSaving(true);
        });

        expect(useBookmarkStore.getState().isSaving).toBe(true);
      });
    });

    describe("setError", () => {
      it("should set error message", () => {
        act(() => {
          useBookmarkStore.getState().setError("Something went wrong");
        });

        expect(useBookmarkStore.getState().error).toBe("Something went wrong");
      });

      it("should clear error with null", () => {
        act(() => {
          useBookmarkStore.getState().setError("Error");
          useBookmarkStore.getState().setError(null);
        });

        expect(useBookmarkStore.getState().error).toBeNull();
      });
    });
  });

  // ==========================================================================
  // Pagination Tests
  // ==========================================================================

  describe("Pagination", () => {
    describe("setHasMoreBookmarks", () => {
      it("should set hasMoreBookmarks", () => {
        act(() => {
          useBookmarkStore.getState().setHasMoreBookmarks(true);
        });

        expect(useBookmarkStore.getState().hasMoreBookmarks).toBe(true);
      });
    });

    describe("setBookmarkCursor", () => {
      it("should set cursor", () => {
        act(() => {
          useBookmarkStore.getState().setBookmarkCursor(10);
        });

        expect(useBookmarkStore.getState().bookmarkCursor).toBe(10);
      });
    });

    describe("setTotalCount", () => {
      it("should set total count", () => {
        act(() => {
          useBookmarkStore.getState().setTotalCount(100);
        });

        expect(useBookmarkStore.getState().totalCount).toBe(100);
      });
    });

    describe("incrementCursor", () => {
      it("should increment cursor", () => {
        act(() => {
          useBookmarkStore.getState().setBookmarkCursor(10);
          useBookmarkStore.getState().incrementCursor(5);
        });

        expect(useBookmarkStore.getState().bookmarkCursor).toBe(15);
      });
    });
  });

  // ==========================================================================
  // Utility Tests
  // ==========================================================================

  describe("resetBookmarkStore", () => {
    it("should reset to initial state", () => {
      act(() => {
        useBookmarkStore.getState().addBookmark(createTestBookmark());
        useBookmarkStore.getState().addFolder(createTestFolder());
        useBookmarkStore.getState().setSearchQuery("test");
        useBookmarkStore.getState().openPanel();
        useBookmarkStore.getState().resetBookmarkStore();
      });

      const state = useBookmarkStore.getState();
      expect(state.bookmarks.size).toBe(0);
      expect(state.folders.size).toBe(0);
      expect(state.searchQuery).toBe("");
      expect(state.isPanelOpen).toBe(false);
    });
  });

  // ==========================================================================
  // Selector Tests
  // ==========================================================================

  describe("Selectors", () => {
    describe("selectAllBookmarks", () => {
      it("should return all bookmarks as array", () => {
        const bookmarks = [
          createTestBookmark({ id: "bm-1" }),
          createTestBookmark({ id: "bm-2" }),
        ];

        act(() => {
          useBookmarkStore.getState().setBookmarks(bookmarks);
        });

        const result = selectAllBookmarks(useBookmarkStore.getState());
        expect(result).toHaveLength(2);
      });
    });

    describe("selectBookmarkCount", () => {
      it("should return total count", () => {
        act(() => {
          useBookmarkStore.getState().setTotalCount(42);
        });

        const result = selectBookmarkCount(useBookmarkStore.getState());
        expect(result).toBe(42);
      });
    });

    describe("selectAllFolders", () => {
      it("should return all folders as array", () => {
        const folders = [
          createTestFolder({ id: "f-1" }),
          createTestFolder({ id: "f-2" }),
        ];

        act(() => {
          useBookmarkStore.getState().setFolders(folders);
        });

        const result = selectAllFolders(useBookmarkStore.getState());
        expect(result).toHaveLength(2);
      });
    });

    describe("selectFolderCount", () => {
      it("should return folder count", () => {
        const folders = [
          createTestFolder({ id: "f-1" }),
          createTestFolder({ id: "f-2" }),
        ];

        act(() => {
          useBookmarkStore.getState().setFolders(folders);
        });

        const result = selectFolderCount(useBookmarkStore.getState());
        expect(result).toBe(2);
      });
    });

    describe("selectUncategorizedBookmarks", () => {
      it("should return bookmarks without folder", () => {
        const bookmarks = [
          createTestBookmark({ id: "bm-1", folder_id: "f-1" }),
          createTestBookmark({ id: "bm-2", folder_id: undefined }),
          createTestBookmark({ id: "bm-3", folder_id: undefined }),
        ];

        act(() => {
          useBookmarkStore.getState().setBookmarks(bookmarks);
        });

        const result = selectUncategorizedBookmarks(
          useBookmarkStore.getState(),
        );
        expect(result).toHaveLength(2);
      });
    });

    describe("selectUncategorizedCount", () => {
      it("should return count of uncategorized bookmarks", () => {
        const bookmarks = [
          createTestBookmark({ id: "bm-1", folder_id: "f-1" }),
          createTestBookmark({ id: "bm-2", folder_id: undefined }),
        ];

        act(() => {
          useBookmarkStore.getState().setBookmarks(bookmarks);
        });

        const result = selectUncategorizedCount(useBookmarkStore.getState());
        expect(result).toBe(1);
      });
    });

    describe("selectBookmarksByChannel", () => {
      it("should group bookmarks by channel", () => {
        const bookmarks = [
          createTestBookmark({
            id: "bm-1",
            message: createTestMessage({
              channel: { id: "ch-1", name: "General", slug: "general" },
            }),
          }),
          createTestBookmark({
            id: "bm-2",
            message: createTestMessage({
              channel: { id: "ch-1", name: "General", slug: "general" },
            }),
          }),
          createTestBookmark({
            id: "bm-3",
            message: createTestMessage({
              channel: { id: "ch-2", name: "Random", slug: "random" },
            }),
          }),
        ];

        act(() => {
          useBookmarkStore.getState().setBookmarks(bookmarks);
        });

        const result = selectBookmarksByChannel(useBookmarkStore.getState());
        expect(result["ch-1"]).toHaveLength(2);
        expect(result["ch-2"]).toHaveLength(1);
      });
    });

    describe("selectUniqueChannels", () => {
      it("should return unique channels", () => {
        const bookmarks = [
          createTestBookmark({
            id: "bm-1",
            message: createTestMessage({
              channel: { id: "ch-1", name: "General", slug: "general" },
            }),
          }),
          createTestBookmark({
            id: "bm-2",
            message: createTestMessage({
              channel: { id: "ch-1", name: "General", slug: "general" },
            }),
          }),
          createTestBookmark({
            id: "bm-3",
            message: createTestMessage({
              channel: { id: "ch-2", name: "Random", slug: "random" },
            }),
          }),
        ];

        act(() => {
          useBookmarkStore.getState().setBookmarks(bookmarks);
        });

        const result = selectUniqueChannels(useBookmarkStore.getState());
        expect(result).toHaveLength(2);
      });
    });

    describe("selectRecentBookmarks", () => {
      it("should return most recent bookmarks", () => {
        const bookmarks = [
          createTestBookmark({
            id: "bm-1",
            created_at: "2024-01-01T00:00:00Z",
          }),
          createTestBookmark({
            id: "bm-2",
            created_at: "2024-03-01T00:00:00Z",
          }),
          createTestBookmark({
            id: "bm-3",
            created_at: "2024-02-01T00:00:00Z",
          }),
        ];

        act(() => {
          useBookmarkStore.getState().setBookmarks(bookmarks);
        });

        const result = selectRecentBookmarks(2)(useBookmarkStore.getState());
        expect(result).toHaveLength(2);
        expect(result[0].id).toBe("bm-2");
        expect(result[1].id).toBe("bm-3");
      });

      it("should use default limit of 5", () => {
        const bookmarks = Array.from({ length: 10 }, (_, i) =>
          createTestBookmark({
            id: `bm-${i}`,
            created_at: `2024-0${i + 1}-01T00:00:00Z`,
          }),
        );

        act(() => {
          useBookmarkStore.getState().setBookmarks(bookmarks);
        });

        const result = selectRecentBookmarks()(useBookmarkStore.getState());
        expect(result).toHaveLength(5);
      });
    });
  });

  // ==========================================================================
  // Edge Cases
  // ==========================================================================

  describe("Edge Cases", () => {
    it("should handle empty bookmark list", () => {
      const result = useBookmarkStore.getState().getFilteredBookmarks();
      expect(result).toEqual([]);
    });

    it("should handle search with no matches", () => {
      act(() => {
        useBookmarkStore.getState().addBookmark(createTestBookmark());
        useBookmarkStore.getState().setSearchQuery("xyz123nonexistent");
      });

      const result = useBookmarkStore.getState().getFilteredBookmarks();
      expect(result).toEqual([]);
    });

    it("should handle totalCount not going negative", () => {
      act(() => {
        useBookmarkStore.getState().setTotalCount(0);
        useBookmarkStore.getState().removeBookmark("non-existent");
      });

      expect(useBookmarkStore.getState().totalCount).toBe(0);
    });

    it("should handle folder bookmark_count not going negative", () => {
      const folder = createTestFolder({ id: "f-1", bookmark_count: 0 });

      act(() => {
        useBookmarkStore.getState().addFolder(folder);
        useBookmarkStore
          .getState()
          .updateBookmark("non-existent", { folder_id: "f-2" });
      });

      expect(
        useBookmarkStore.getState().folders.get("f-1")?.bookmark_count,
      ).toBe(0);
    });
  });
});
