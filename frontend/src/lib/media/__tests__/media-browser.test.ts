/**
 * Media Browser - Comprehensive Tests
 *
 * Tests for the shared media browser, album system, and document preview service.
 * Covers platform-aware behavior across WhatsApp, Telegram, Discord, Slack presets.
 *
 * Test groups:
 * 1. Media Browser Core (browse, filter, search, pagination, grouping)
 * 2. Platform Behavior (per-preset behavior configs)
 * 3. Album System (create, auto-generate, share, merge, sort, filter)
 * 4. Document Preview (detection, config, capabilities, platform configs)
 * 5. Selection & Navigation (multi-select, keyboard nav, view modes)
 * 6. Integration (browser + albums + document preview together)
 */

import type { MediaItem, MediaType } from "../media-types";
import type { PlatformPreset } from "../media-parity";

// Media Browser imports
import {
  browseMedia,
  createBrowserConfig,
  createBrowserState,
  getPlatformBehavior,
  getPlatformLimits,
  applyTabFilter,
  applyGrouping,
  browserSearch,
  searchByMediaType,
  searchByDateRange,
  searchBySender,
  searchByChannel,
  searchByExtension,
  searchBySizeRange,
  toggleItemSelection,
  selectItemRange,
  selectAllItems,
  clearSelection,
  getSelectedItems,
  createAlbumFromSelection,
  generateAutoAlbums,
  getAlbumItems,
  addItemsToAlbum,
  removeItemsFromAlbum,
  getBrowserStats,
  getBrowseSummary,
  getGridColumns,
  getThumbnailSize,
  isViewModeAvailable,
  getRecommendedViewMode,
  getNextFocusedItem,
  isTypePreviewable,
  getAttachmentLayout,
  getMaxGalleryItems,
  isFeatureAvailable,
  DEFAULT_BROWSER_CONFIG,
  DEFAULT_BROWSER_STATE,
  PLATFORM_BEHAVIORS,
  THUMBNAIL_SIZES,
} from "../media-browser";
import type {
  MediaBrowserState,
  BrowserTab,
  GroupingMode,
  BrowseResult,
} from "../media-browser";

// Album imports
import {
  createAlbum,
  updateAlbum,
  deleteAlbums,
  createAutoAlbums,
  createMonthlyAlbums,
  createTypeAlbums,
  createChannelAlbums,
  createFavoritesAlbum,
  sortAlbums,
  filterAlbumsByType,
  filterAlbumsByVisibility,
  filterAlbumsByTag,
  searchAlbums,
  getAlbumStats,
  createAlbumShare,
  isShareExpired,
  hasShareAccess,
  mergeAlbums,
  duplicateAlbum,
  findBestCoverItem,
  getAlbumCoverCandidates,
  validateAlbumName,
  generateAlbumId,
} from "../albums";
import type {
  Album,
  AlbumType,
  AlbumSortBy,
  AlbumShareConfig,
} from "../albums";

// Document Preview imports
import {
  getDocumentTypeFromExtension,
  getDocumentTypeFromMime,
  detectDocumentType,
  getCodeLanguage,
  getDocumentPreviewConfig,
  canPreviewDocument,
  getPreviewCapabilities,
  isCodeFile,
  isTextBasedFile,
  getDefaultPDFConfig,
  getPlatformPDFConfig,
  getDefaultCodeConfig,
  getPlatformCodeConfig,
  getDefaultOfficeConfig,
  getOfficePreviewUrl,
  createEmptyPreviewResult,
  createTextPreviewResult,
  truncatePreview,
  EXTENSION_TO_DOCUMENT_TYPE,
  EXTENSION_TO_LANGUAGE,
  MIME_TO_DOCUMENT_TYPE,
  DOCUMENT_TYPE_STYLES,
} from "../document-preview";
import type {
  DocumentType,
  CodeLanguage,
  PreviewMode,
} from "../document-preview";

// ============================================================================
// Test Helpers
// ============================================================================

function createMockMediaItem(overrides: Partial<MediaItem> = {}): MediaItem {
  return {
    id: `item_${Math.random().toString(36).substr(2, 9)}`,
    fileName: "test-image.jpg",
    fileType: "image" as MediaType,
    mimeType: "image/jpeg",
    fileSize: 1024 * 1024,
    fileExtension: "jpg",
    url: "https://example.com/test.jpg",
    thumbnailUrl: "https://example.com/test-thumb.jpg",
    channelId: "channel-1",
    channelName: "general",
    threadId: null,
    messageId: "msg-1",
    uploadedBy: {
      id: "user-1",
      username: "testuser",
      displayName: "Test User",
      avatarUrl: null,
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    metadata: {},
    canDelete: true,
    canShare: true,
    canDownload: true,
    ...overrides,
  };
}

function createMockItems(count: number): MediaItem[] {
  const types: MediaType[] = ["image", "video", "audio", "document", "archive"];
  const channels = ["channel-1", "channel-2", "channel-3"];
  const users = ["user-1", "user-2", "user-3"];

  return Array.from({ length: count }, (_, i) => {
    const type = types[i % types.length];
    const ext = {
      image: "jpg",
      video: "mp4",
      audio: "mp3",
      document: "pdf",
      archive: "zip",
    }[type];
    const mime = {
      image: "image/jpeg",
      video: "video/mp4",
      audio: "audio/mpeg",
      document: "application/pdf",
      archive: "application/zip",
    }[type];

    return createMockMediaItem({
      id: `item-${i}`,
      fileName: `file-${i}.${ext}`,
      fileType: type,
      mimeType: mime,
      fileExtension: ext,
      fileSize: (i + 1) * 1024 * 100,
      channelId: channels[i % channels.length],
      channelName: `Channel ${(i % channels.length) + 1}`,
      uploadedBy: {
        id: users[i % users.length],
        username: `user${(i % users.length) + 1}`,
        displayName: `User ${(i % users.length) + 1}`,
        avatarUrl: null,
      },
      createdAt: new Date(Date.now() - i * 86400000).toISOString(),
      isFavorite: i % 5 === 0,
    });
  });
}

function createDefaultState(
  overrides: Partial<MediaBrowserState> = {},
): MediaBrowserState {
  return {
    ...DEFAULT_BROWSER_STATE,
    ...overrides,
    selectedIds: overrides.selectedIds || new Set(),
  };
}

// ============================================================================
// 1. Media Browser Core Tests
// ============================================================================

describe("Media Browser Core", () => {
  const items = createMockItems(25);

  describe("createBrowserConfig", () => {
    it("should create config with default values", () => {
      const config = createBrowserConfig("default");
      expect(config.platform).toBe("default");
      expect(config.defaultViewMode).toBe("grid");
      expect(config.pageSize).toBe(50);
      expect(config.albumsEnabled).toBe(true);
      expect(config.documentPreviewEnabled).toBe(true);
    });

    it("should create config with platform-specific album support", () => {
      const whatsappConfig = createBrowserConfig("whatsapp");
      expect(whatsappConfig.albumsEnabled).toBe(false); // WhatsApp doesn't support albums

      const telegramConfig = createBrowserConfig("telegram");
      expect(telegramConfig.albumsEnabled).toBe(true);
    });

    it("should apply overrides", () => {
      const config = createBrowserConfig("default", {
        pageSize: 100,
        defaultViewMode: "list",
      });
      expect(config.pageSize).toBe(100);
      expect(config.defaultViewMode).toBe("list");
    });

    it("should create config for each platform", () => {
      const presets: PlatformPreset[] = [
        "whatsapp",
        "telegram",
        "discord",
        "slack",
        "default",
      ];
      for (const preset of presets) {
        const config = createBrowserConfig(preset);
        expect(config.platform).toBe(preset);
      }
    });
  });

  describe("createBrowserState", () => {
    it("should create state from config", () => {
      const config = createBrowserConfig("default");
      const state = createBrowserState(config);
      expect(state.activeTab).toBe("media");
      expect(state.viewMode).toBe("grid");
      expect(state.pagination.limit).toBe(50);
      expect(state.isLoading).toBe(false);
    });

    it("should use config defaults for tab and view mode", () => {
      const config = createBrowserConfig("default", {
        defaultTab: "documents",
        defaultViewMode: "list",
        defaultGrouping: "date",
      });
      const state = createBrowserState(config);
      expect(state.activeTab).toBe("documents");
      expect(state.viewMode).toBe("list");
      expect(state.grouping).toBe("date");
    });
  });

  describe("browseMedia", () => {
    it("should return paginated results", () => {
      const state = createDefaultState({
        pagination: { ...DEFAULT_BROWSER_STATE.pagination, limit: 10 },
      });
      const config = createBrowserConfig("default");
      const result = browseMedia(items, state, config);

      expect(result.items.length).toBeLessThanOrEqual(10);
      expect(result.totalCount).toBe(25);
      expect(result.pagination.totalPages).toBeGreaterThan(0);
    });

    it("should filter by active tab", () => {
      const state = createDefaultState({ activeTab: "documents" });
      const config = createBrowserConfig("default");
      const result = browseMedia(items, state, config);

      for (const item of result.items) {
        expect(["document", "archive", "other"]).toContain(item.fileType);
      }
    });

    it("should apply search query", () => {
      const state = createDefaultState({
        isSearchActive: true,
        searchQuery: "file-0",
      });
      const config = createBrowserConfig("default");
      const result = browseMedia(items, state, config);

      expect(result.filteredCount).toBeGreaterThan(0);
      expect(result.filteredCount).toBeLessThan(items.length);
    });

    it("should apply grouping", () => {
      const state = createDefaultState({ grouping: "type" });
      const config = createBrowserConfig("default");
      const result = browseMedia(items, state, config);

      expect(result.groups).not.toBeNull();
      expect(result.groups!.size).toBeGreaterThan(0);
    });

    it("should handle empty items", () => {
      const state = createDefaultState();
      const config = createBrowserConfig("default");
      const result = browseMedia([], state, config);

      expect(result.items).toEqual([]);
      expect(result.totalCount).toBe(0);
      expect(result.filteredCount).toBe(0);
    });

    it("should handle page 2", () => {
      const state = createDefaultState({
        pagination: { ...DEFAULT_BROWSER_STATE.pagination, page: 2, limit: 10 },
      });
      const config = createBrowserConfig("default");
      const result = browseMedia(items, state, config);

      expect(result.items.length).toBeGreaterThan(0);
      expect(result.pagination.page).toBe(2);
    });
  });

  describe("applyTabFilter", () => {
    it("should filter media tab (images, videos, audio)", () => {
      const filtered = applyTabFilter(items, "media");
      for (const item of filtered) {
        expect(["image", "video", "audio"]).toContain(item.fileType);
      }
    });

    it("should filter documents tab", () => {
      const filtered = applyTabFilter(items, "documents");
      for (const item of filtered) {
        expect(["document", "archive", "other"]).toContain(item.fileType);
      }
    });

    it("should return all items for albums tab", () => {
      const filtered = applyTabFilter(items, "albums");
      expect(filtered.length).toBe(items.length);
    });
  });

  describe("applyGrouping", () => {
    it("should group by date", () => {
      const groups = applyGrouping(items, "date");
      expect(groups.size).toBeGreaterThan(0);

      let totalGroupedItems = 0;
      for (const groupItems of groups.values()) {
        totalGroupedItems += groupItems.length;
      }
      expect(totalGroupedItems).toBe(items.length);
    });

    it("should group by type", () => {
      const groups = applyGrouping(items, "type");
      expect(groups.has("image")).toBe(true);
      expect(groups.has("video")).toBe(true);
    });

    it("should group by sender", () => {
      const groups = applyGrouping(items, "sender");
      expect(groups.size).toBeGreaterThan(0);
    });

    it("should group by channel", () => {
      const groups = applyGrouping(items, "channel");
      expect(groups.size).toBeGreaterThan(0);
    });

    it("should return empty map for no grouping", () => {
      const groups = applyGrouping(items, "none");
      expect(groups.size).toBe(0);
    });
  });

  describe("getBrowseSummary", () => {
    it("should generate summary text", () => {
      const result: BrowseResult = {
        items: items.slice(0, 10),
        groups: null,
        totalCount: 25,
        filteredCount: 15,
        pagination: {
          page: 1,
          limit: 10,
          total: 15,
          totalPages: 2,
          hasMore: true,
          cursor: null,
        },
      };
      const state = createDefaultState();
      const summary = getBrowseSummary(result, state);

      expect(summary).toContain("15 items");
      expect(summary).toContain("25 total");
    });

    it("should include search query in summary", () => {
      const result: BrowseResult = {
        items: [],
        groups: null,
        totalCount: 25,
        filteredCount: 3,
        pagination: {
          page: 1,
          limit: 50,
          total: 3,
          totalPages: 1,
          hasMore: false,
          cursor: null,
        },
      };
      const state = createDefaultState({
        isSearchActive: true,
        searchQuery: "test",
      });
      const summary = getBrowseSummary(result, state);

      expect(summary).toContain('Search: "test"');
    });
  });
});

// ============================================================================
// 2. Platform Behavior Tests
// ============================================================================

describe("Platform Behavior", () => {
  describe("getPlatformBehavior", () => {
    const presets: PlatformPreset[] = [
      "whatsapp",
      "telegram",
      "discord",
      "slack",
      "default",
    ];

    it("should return behavior for all presets", () => {
      for (const preset of presets) {
        const behavior = getPlatformBehavior(preset);
        expect(behavior.name).toBeTruthy();
        expect(behavior.maxAttachments).toBeGreaterThan(0);
        expect(behavior.gridColumns.mobile).toBeGreaterThan(0);
        expect(behavior.gridColumns.tablet).toBeGreaterThan(0);
        expect(behavior.gridColumns.desktop).toBeGreaterThan(0);
      }
    });

    it("should have correct WhatsApp behavior", () => {
      const behavior = getPlatformBehavior("whatsapp");
      expect(behavior.autoCompress).toBe(true);
      expect(behavior.stripExif).toBe(true);
      expect(behavior.albumsSupported).toBe(false);
      expect(behavior.attachmentLayout).toBe("grid");
    });

    it("should have correct Telegram behavior", () => {
      const behavior = getPlatformBehavior("telegram");
      expect(behavior.autoCompress).toBe(false);
      expect(behavior.albumsSupported).toBe(true);
      expect(behavior.maxGalleryItems).toBe(100);
    });

    it("should have correct Discord behavior", () => {
      const behavior = getPlatformBehavior("discord");
      expect(behavior.documentPreviewSupported).toBe(false);
      expect(behavior.attachmentLayout).toBe("stacked");
    });

    it("should have correct Slack behavior", () => {
      const behavior = getPlatformBehavior("slack");
      expect(behavior.documentPreviewSupported).toBe(true);
      expect(behavior.albumsSupported).toBe(true);
      expect(behavior.attachmentLayout).toBe("stacked");
    });
  });

  describe("getPlatformLimits", () => {
    it("should return base limits for non-premium", () => {
      const limits = getPlatformLimits("discord", false);
      expect(limits.maxFileSize).toBe(8 * 1024 * 1024);
    });

    it("should return premium limits", () => {
      const limits = getPlatformLimits("discord", true);
      expect(limits.maxFileSize).toBe(500 * 1024 * 1024);
    });

    it("should return base limits when no premium tier", () => {
      const limits = getPlatformLimits("default", true);
      expect(limits.maxFileSize).toBe(100 * 1024 * 1024);
    });
  });

  describe("isTypePreviewable", () => {
    it("should check previewable types per platform", () => {
      expect(isTypePreviewable("image/jpeg", "whatsapp")).toBe(true);
      expect(isTypePreviewable("application/pdf", "whatsapp")).toBe(true);
      expect(isTypePreviewable("application/pdf", "discord")).toBe(false); // Discord doesn't preview docs
    });
  });

  describe("getAttachmentLayout", () => {
    it("should return correct layout per platform", () => {
      expect(getAttachmentLayout("whatsapp")).toBe("grid");
      expect(getAttachmentLayout("discord")).toBe("stacked");
      expect(getAttachmentLayout("slack")).toBe("stacked");
      expect(getAttachmentLayout("telegram")).toBe("grid");
    });
  });

  describe("getMaxGalleryItems", () => {
    it("should return correct max items per platform", () => {
      expect(getMaxGalleryItems("whatsapp")).toBe(30);
      expect(getMaxGalleryItems("telegram")).toBe(100);
      expect(getMaxGalleryItems("discord")).toBe(50);
      expect(getMaxGalleryItems("slack")).toBe(100);
    });
  });

  describe("isFeatureAvailable", () => {
    it("should check album support", () => {
      expect(isFeatureAvailable("albums", "telegram")).toBe(true);
      expect(isFeatureAvailable("albums", "whatsapp")).toBe(false);
      expect(isFeatureAvailable("albums", "discord")).toBe(false);
    });

    it("should check document preview support", () => {
      expect(isFeatureAvailable("documentPreview", "slack")).toBe(true);
      expect(isFeatureAvailable("documentPreview", "discord")).toBe(false);
    });

    it("should check autoCompress", () => {
      expect(isFeatureAvailable("autoCompress", "whatsapp")).toBe(true);
      expect(isFeatureAvailable("autoCompress", "discord")).toBe(false);
    });

    it("should check stripExif", () => {
      expect(isFeatureAvailable("stripExif", "whatsapp")).toBe(true);
      expect(isFeatureAvailable("stripExif", "telegram")).toBe(false);
    });
  });

  describe("getGridColumns", () => {
    it("should return columns for all viewports", () => {
      const viewports: ("mobile" | "tablet" | "desktop")[] = [
        "mobile",
        "tablet",
        "desktop",
      ];
      for (const viewport of viewports) {
        const cols = getGridColumns("default", viewport);
        expect(cols).toBeGreaterThan(0);
      }
    });

    it("should have more columns on desktop than mobile", () => {
      const mobileCols = getGridColumns("default", "mobile");
      const desktopCols = getGridColumns("default", "desktop");
      expect(desktopCols).toBeGreaterThan(mobileCols);
    });
  });

  describe("getThumbnailSize", () => {
    it("should return correct sizes", () => {
      expect(getThumbnailSize("small")).toBe(100);
      expect(getThumbnailSize("medium")).toBe(200);
      expect(getThumbnailSize("large")).toBe(400);
    });
  });
});

// ============================================================================
// 3. Search Functions Tests
// ============================================================================

describe("Browser Search Functions", () => {
  const items = createMockItems(20);

  describe("browserSearch", () => {
    it("should search within the active tab", () => {
      const state = createDefaultState({ activeTab: "media" });
      const results = browserSearch(items, "file", state);
      expect(results.length).toBeGreaterThan(0);
    });

    it("should return empty for no match", () => {
      const state = createDefaultState();
      const results = browserSearch(items, "zzzznonexistent", state);
      expect(results.length).toBe(0);
    });
  });

  describe("searchByMediaType", () => {
    it("should filter by single type", () => {
      const result = searchByMediaType(items, ["image"]);
      for (const item of result) {
        expect(item.fileType).toBe("image");
      }
    });

    it("should filter by multiple types", () => {
      const result = searchByMediaType(items, ["image", "video"]);
      for (const item of result) {
        expect(["image", "video"]).toContain(item.fileType);
      }
    });
  });

  describe("searchByDateRange", () => {
    it("should filter within date range", () => {
      const start = new Date(Date.now() - 5 * 86400000);
      const end = new Date();
      const result = searchByDateRange(items, start, end);
      for (const item of result) {
        const date = new Date(item.createdAt);
        expect(date >= start).toBe(true);
        expect(date <= end).toBe(true);
      }
    });
  });

  describe("searchBySender", () => {
    it("should filter by sender ID", () => {
      const result = searchBySender(items, "user-1");
      for (const item of result) {
        expect(item.uploadedBy.id).toBe("user-1");
      }
    });
  });

  describe("searchByChannel", () => {
    it("should filter by channel ID", () => {
      const result = searchByChannel(items, "channel-1");
      for (const item of result) {
        expect(item.channelId).toBe("channel-1");
      }
    });
  });

  describe("searchByExtension", () => {
    it("should filter by extension", () => {
      const result = searchByExtension(items, ["jpg"]);
      for (const item of result) {
        expect(item.fileExtension.toLowerCase()).toBe("jpg");
      }
    });

    it("should handle dot prefix", () => {
      const result = searchByExtension(items, [".jpg"]);
      for (const item of result) {
        expect(item.fileExtension.toLowerCase()).toBe("jpg");
      }
    });
  });

  describe("searchBySizeRange", () => {
    it("should filter by minimum size", () => {
      const result = searchBySizeRange(items, 500 * 1024);
      for (const item of result) {
        expect(item.fileSize).toBeGreaterThanOrEqual(500 * 1024);
      }
    });

    it("should filter by maximum size", () => {
      const result = searchBySizeRange(items, undefined, 1024 * 1024);
      for (const item of result) {
        expect(item.fileSize).toBeLessThanOrEqual(1024 * 1024);
      }
    });

    it("should filter by range", () => {
      const min = 200 * 1024;
      const max = 800 * 1024;
      const result = searchBySizeRange(items, min, max);
      for (const item of result) {
        expect(item.fileSize).toBeGreaterThanOrEqual(min);
        expect(item.fileSize).toBeLessThanOrEqual(max);
      }
    });
  });
});

// ============================================================================
// 4. Selection & Navigation Tests
// ============================================================================

describe("Selection & Navigation", () => {
  const items = createMockItems(20);

  describe("toggleItemSelection", () => {
    it("should add item to selection", () => {
      const state = createDefaultState();
      const result = toggleItemSelection(state, "item-0", 100);
      expect(result.has("item-0")).toBe(true);
    });

    it("should remove item from selection", () => {
      const state = createDefaultState({ selectedIds: new Set(["item-0"]) });
      const result = toggleItemSelection(state, "item-0", 100);
      expect(result.has("item-0")).toBe(false);
    });

    it("should respect max selection limit", () => {
      const state = createDefaultState({
        selectedIds: new Set(["item-0", "item-1"]),
      });
      const result = toggleItemSelection(state, "item-2", 2);
      expect(result.has("item-2")).toBe(false); // Should not add because limit is 2
    });
  });

  describe("selectItemRange", () => {
    it("should select a range of items", () => {
      const selected = selectItemRange(items, "item-2", "item-5", new Set());
      expect(selected.size).toBe(4);
      expect(selected.has("item-2")).toBe(true);
      expect(selected.has("item-5")).toBe(true);
    });

    it("should work in reverse direction", () => {
      const selected = selectItemRange(items, "item-5", "item-2", new Set());
      expect(selected.size).toBe(4);
    });

    it("should merge with existing selection", () => {
      const existing = new Set(["item-0"]);
      const selected = selectItemRange(items, "item-3", "item-5", existing);
      expect(selected.has("item-0")).toBe(true); // Existing preserved
      expect(selected.has("item-3")).toBe(true);
      expect(selected.has("item-5")).toBe(true);
    });

    it("should handle invalid IDs", () => {
      const existing = new Set(["item-0"]);
      const selected = selectItemRange(
        items,
        "nonexistent",
        "item-5",
        existing,
      );
      expect(selected).toBe(existing); // Returns original set
    });
  });

  describe("selectAllItems", () => {
    it("should select all items", () => {
      const selected = selectAllItems(items);
      expect(selected.size).toBe(items.length);
    });
  });

  describe("clearSelection", () => {
    it("should return empty set", () => {
      const selected = clearSelection();
      expect(selected.size).toBe(0);
    });
  });

  describe("getSelectedItems", () => {
    it("should return matching items", () => {
      const selectedIds = new Set(["item-0", "item-2", "item-4"]);
      const result = getSelectedItems(items, selectedIds);
      expect(result.length).toBe(3);
      expect(result[0].id).toBe("item-0");
    });
  });

  describe("getNextFocusedItem", () => {
    it("should navigate right", () => {
      const next = getNextFocusedItem(items, "item-0", "right", 4);
      expect(next).toBe("item-1");
    });

    it("should navigate left", () => {
      const next = getNextFocusedItem(items, "item-1", "left", 4);
      expect(next).toBe("item-0");
    });

    it("should navigate down (by column count)", () => {
      const next = getNextFocusedItem(items, "item-0", "down", 4);
      expect(next).toBe("item-4");
    });

    it("should navigate up (by column count)", () => {
      const next = getNextFocusedItem(items, "item-4", "up", 4);
      expect(next).toBe("item-0");
    });

    it("should not go below zero", () => {
      const next = getNextFocusedItem(items, "item-0", "left", 4);
      expect(next).toBe("item-0");
    });

    it("should not exceed max index", () => {
      const lastId = items[items.length - 1].id;
      const next = getNextFocusedItem(items, lastId, "right", 4);
      expect(next).toBe(lastId);
    });

    it("should return first item when no current focus", () => {
      const next = getNextFocusedItem(items, null, "right", 4);
      expect(next).toBe("item-0");
    });

    it("should handle empty items", () => {
      const next = getNextFocusedItem([], null, "right", 4);
      expect(next).toBeNull();
    });
  });

  describe("isViewModeAvailable", () => {
    it("should allow all modes for media tab", () => {
      expect(isViewModeAvailable("grid", "media")).toBe(true);
      expect(isViewModeAvailable("list", "media")).toBe(true);
      expect(isViewModeAvailable("masonry", "media")).toBe(true);
    });

    it("should restrict modes for documents tab", () => {
      expect(isViewModeAvailable("list", "documents")).toBe(true);
      expect(isViewModeAvailable("grid", "documents")).toBe(true);
      expect(isViewModeAvailable("masonry", "documents")).toBe(false);
    });

    it("should only allow list for links tab", () => {
      expect(isViewModeAvailable("list", "links")).toBe(true);
      expect(isViewModeAvailable("grid", "links")).toBe(false);
    });
  });

  describe("getRecommendedViewMode", () => {
    it("should recommend grid for media", () => {
      expect(getRecommendedViewMode("media")).toBe("grid");
    });

    it("should recommend list for documents", () => {
      expect(getRecommendedViewMode("documents")).toBe("list");
    });

    it("should recommend list for links", () => {
      expect(getRecommendedViewMode("links")).toBe("list");
    });

    it("should recommend grid for albums", () => {
      expect(getRecommendedViewMode("albums")).toBe("grid");
    });
  });
});

// ============================================================================
// 5. Album System Tests
// ============================================================================

describe("Album System", () => {
  const items = createMockItems(30);

  describe("createAlbum", () => {
    it("should create a custom album", () => {
      const album = createAlbum({
        name: "My Album",
        type: "custom",
        createdBy: "user-1",
      });
      expect(album.name).toBe("My Album");
      expect(album.type).toBe("custom");
      expect(album.itemIds).toEqual([]);
      expect(album.itemCount).toBe(0);
    });

    it("should create album with items", () => {
      const album = createAlbum({
        name: "With Items",
        type: "custom",
        itemIds: ["item-1", "item-2"],
        createdBy: "user-1",
      });
      expect(album.itemCount).toBe(2);
      expect(album.coverItemId).toBe("item-1"); // First item as cover
    });

    it("should set custom cover", () => {
      const album = createAlbum({
        name: "Custom Cover",
        type: "custom",
        itemIds: ["item-1", "item-2"],
        createdBy: "user-1",
        coverItemId: "item-2",
      });
      expect(album.coverItemId).toBe("item-2");
    });

    it("should throw for empty name", () => {
      expect(() =>
        createAlbum({ name: "", type: "custom", createdBy: "user-1" }),
      ).toThrow("Album name is required");
    });

    it("should truncate long names", () => {
      const longName = "A".repeat(200);
      const album = createAlbum({
        name: longName,
        type: "custom",
        createdBy: "user-1",
      });
      expect(album.name.length).toBeLessThanOrEqual(128);
    });

    it("should set default visibility to private", () => {
      const album = createAlbum({
        name: "Test",
        type: "custom",
        createdBy: "user-1",
      });
      expect(album.visibility).toBe("private");
    });

    it("should accept tags", () => {
      const album = createAlbum({
        name: "Tagged",
        type: "custom",
        createdBy: "user-1",
        tags: ["travel", "photos"],
      });
      expect(album.tags).toEqual(["travel", "photos"]);
    });
  });

  describe("updateAlbum", () => {
    it("should update album name", () => {
      const album = createAlbum({
        name: "Original",
        type: "custom",
        createdBy: "user-1",
      });
      const updated = updateAlbum(album, { name: "Updated" });
      expect(updated.name).toBe("Updated");
      expect(updated.updatedAt.getTime()).toBeGreaterThanOrEqual(
        album.updatedAt.getTime(),
      );
    });

    it("should update visibility", () => {
      const album = createAlbum({
        name: "Test",
        type: "custom",
        createdBy: "user-1",
      });
      const updated = updateAlbum(album, { visibility: "public" });
      expect(updated.visibility).toBe("public");
    });

    it("should update isPinned", () => {
      const album = createAlbum({
        name: "Test",
        type: "custom",
        createdBy: "user-1",
      });
      const updated = updateAlbum(album, { isPinned: true });
      expect(updated.isPinned).toBe(true);
    });
  });

  describe("deleteAlbums", () => {
    it("should delete specified albums", () => {
      const albums = [
        createAlbum({ name: "A", type: "custom", createdBy: "user-1" }),
        createAlbum({ name: "B", type: "custom", createdBy: "user-1" }),
        createAlbum({ name: "C", type: "custom", createdBy: "user-1" }),
      ];
      const result = deleteAlbums(albums, [albums[1].id]);
      expect(result.length).toBe(2);
      expect(result.find((a) => a.id === albums[1].id)).toBeUndefined();
    });
  });

  describe("Auto Albums", () => {
    it("should create monthly albums", () => {
      const albums = createMonthlyAlbums(items);
      expect(albums.length).toBeGreaterThan(0);
      for (const album of albums) {
        expect(album.type).toBe("auto-date");
        expect(album.autoKey).toBeTruthy();
      }
    });

    it("should create type-based albums", () => {
      const albums = createTypeAlbums(items);
      expect(albums.length).toBeGreaterThan(0);
      for (const album of albums) {
        expect(album.type).toBe("auto-type");
      }
    });

    it("should create channel-based albums", () => {
      const albums = createChannelAlbums(items);
      expect(albums.length).toBeGreaterThan(0);
      for (const album of albums) {
        expect(album.type).toBe("auto-channel");
      }
    });

    it("should create all auto albums", () => {
      const albums = createAutoAlbums(items);
      const types = new Set(albums.map((a) => a.type));
      expect(types.has("auto-date")).toBe(true);
      expect(types.has("auto-type")).toBe(true);
      expect(types.has("auto-channel")).toBe(true);
    });

    it("should filter channel albums when channelId provided", () => {
      const albums = createAutoAlbums(items, "channel-1");
      const channelAlbums = albums.filter((a) => a.type === "auto-channel");
      // When channelId is specified, channel albums are NOT created
      expect(channelAlbums.length).toBe(0);
    });

    it("should skip groups with fewer than 2 items", () => {
      const singleItem = [
        createMockMediaItem({ id: "lonely", channelId: "unique-channel" }),
      ];
      const albums = createChannelAlbums(singleItem);
      // No album created for a single item
      expect(
        albums.filter((a) => a.channelId === "unique-channel").length,
      ).toBe(0);
    });
  });

  describe("createFavoritesAlbum", () => {
    it("should create album from favorite items", () => {
      const album = createFavoritesAlbum(items, "user-1");
      expect(album.type).toBe("favorites");
      expect(album.name).toBe("Favorites");
      expect(album.isPinned).toBe(true);
      expect(album.itemCount).toBeGreaterThan(0); // Some items marked as favorite
    });
  });

  describe("sortAlbums", () => {
    it("should sort by name ascending", () => {
      const albums = [
        createAlbum({ name: "C Album", type: "custom", createdBy: "user-1" }),
        createAlbum({ name: "A Album", type: "custom", createdBy: "user-1" }),
        createAlbum({ name: "B Album", type: "custom", createdBy: "user-1" }),
      ];
      const sorted = sortAlbums(albums, "name_asc");
      expect(sorted[0].name).toBe("A Album");
      expect(sorted[1].name).toBe("B Album");
      expect(sorted[2].name).toBe("C Album");
    });

    it("should sort by name descending", () => {
      const albums = [
        createAlbum({ name: "A Album", type: "custom", createdBy: "user-1" }),
        createAlbum({ name: "C Album", type: "custom", createdBy: "user-1" }),
      ];
      const sorted = sortAlbums(albums, "name_desc");
      expect(sorted[0].name).toBe("C Album");
    });

    it("should sort by item count", () => {
      const albums = [
        createAlbum({
          name: "Small",
          type: "custom",
          createdBy: "user-1",
          itemIds: ["a"],
        }),
        createAlbum({
          name: "Big",
          type: "custom",
          createdBy: "user-1",
          itemIds: ["a", "b", "c"],
        }),
      ];
      const sorted = sortAlbums(albums, "item_count_desc");
      expect(sorted[0].name).toBe("Big");
    });

    it("should keep pinned albums first", () => {
      const pinned = createAlbum({
        name: "Pinned",
        type: "custom",
        createdBy: "user-1",
      });
      const updated = updateAlbum(pinned, { isPinned: true });
      const unpinned = createAlbum({
        name: "A First",
        type: "custom",
        createdBy: "user-1",
      });

      const sorted = sortAlbums([unpinned, updated], "name_asc");
      expect(sorted[0].isPinned).toBe(true);
    });
  });

  describe("filterAlbumsByType", () => {
    it("should filter by type", () => {
      const albums = createAutoAlbums(items);
      const dateAlbums = filterAlbumsByType(albums, ["auto-date"]);
      for (const album of dateAlbums) {
        expect(album.type).toBe("auto-date");
      }
    });

    it("should filter by multiple types", () => {
      const albums = createAutoAlbums(items);
      const filtered = filterAlbumsByType(albums, ["auto-date", "auto-type"]);
      for (const album of filtered) {
        expect(["auto-date", "auto-type"]).toContain(album.type);
      }
    });
  });

  describe("filterAlbumsByVisibility", () => {
    it("should filter by visibility", () => {
      const album1 = createAlbum({
        name: "Private",
        type: "custom",
        createdBy: "user-1",
        visibility: "private",
      });
      const album2 = createAlbum({
        name: "Public",
        type: "custom",
        createdBy: "user-1",
        visibility: "public",
      });
      const result = filterAlbumsByVisibility([album1, album2], "private");
      expect(result.length).toBe(1);
      expect(result[0].name).toBe("Private");
    });
  });

  describe("filterAlbumsByTag", () => {
    it("should filter by tag", () => {
      const album1 = createAlbum({
        name: "Travel",
        type: "custom",
        createdBy: "user-1",
        tags: ["travel"],
      });
      const album2 = createAlbum({
        name: "Work",
        type: "custom",
        createdBy: "user-1",
        tags: ["work"],
      });
      const result = filterAlbumsByTag([album1, album2], "travel");
      expect(result.length).toBe(1);
      expect(result[0].name).toBe("Travel");
    });
  });

  describe("searchAlbums", () => {
    it("should search by name", () => {
      const albums = [
        createAlbum({
          name: "Vacation Photos",
          type: "custom",
          createdBy: "user-1",
        }),
        createAlbum({
          name: "Work Documents",
          type: "custom",
          createdBy: "user-1",
        }),
      ];
      const result = searchAlbums(albums, "vacation");
      expect(result.length).toBe(1);
      expect(result[0].name).toBe("Vacation Photos");
    });

    it("should search by description", () => {
      const albums = [
        createAlbum({
          name: "Album",
          type: "custom",
          createdBy: "user-1",
          description: "Trip to Paris",
        }),
      ];
      const result = searchAlbums(albums, "paris");
      expect(result.length).toBe(1);
    });

    it("should return all for empty query", () => {
      const albums = [
        createAlbum({ name: "A", type: "custom", createdBy: "user-1" }),
      ];
      const result = searchAlbums(albums, "");
      expect(result.length).toBe(1);
    });
  });

  describe("getAlbumStats", () => {
    it("should calculate stats", () => {
      const album = createAlbum({
        name: "Stats Test",
        type: "custom",
        itemIds: items.slice(0, 5).map((i) => i.id),
        createdBy: "user-1",
      });
      const stats = getAlbumStats(album, items);
      expect(stats.totalItems).toBe(5);
      expect(stats.totalSize).toBeGreaterThan(0);
      expect(stats.uniqueSenders).toBeGreaterThan(0);
    });
  });

  describe("Album Sharing", () => {
    it("should create share config", () => {
      const share = createAlbumShare("album-1", "user-1", ["user-2", "user-3"]);
      expect(share.albumId).toBe("album-1");
      expect(share.sharedWith).toEqual(["user-2", "user-3"]);
      expect(share.expiresAt).toBeNull();
    });

    it("should create share with expiry", () => {
      const future = new Date(Date.now() + 86400000);
      const share = createAlbumShare("album-1", "user-1", ["user-2"], {
        expiresAt: future,
      });
      expect(share.expiresAt).toBe(future);
    });

    it("should detect expired share", () => {
      const past = new Date(Date.now() - 86400000);
      const share = createAlbumShare("album-1", "user-1", ["user-2"], {
        expiresAt: past,
      });
      expect(isShareExpired(share)).toBe(true);
    });

    it("should detect non-expired share", () => {
      const future = new Date(Date.now() + 86400000);
      const share = createAlbumShare("album-1", "user-1", ["user-2"], {
        expiresAt: future,
      });
      expect(isShareExpired(share)).toBe(false);
    });

    it("should handle null expiry as non-expired", () => {
      const share = createAlbumShare("album-1", "user-1", ["user-2"]);
      expect(isShareExpired(share)).toBe(false);
    });

    it("should check user access", () => {
      const share = createAlbumShare("album-1", "user-1", ["user-2", "user-3"]);
      expect(hasShareAccess(share, "user-2")).toBe(true);
      expect(hasShareAccess(share, "user-1")).toBe(true); // Owner has access
      expect(hasShareAccess(share, "user-4")).toBe(false);
    });

    it("should deny access on expired share", () => {
      const past = new Date(Date.now() - 86400000);
      const share = createAlbumShare("album-1", "user-1", ["user-2"], {
        expiresAt: past,
      });
      expect(hasShareAccess(share, "user-2")).toBe(false);
    });
  });

  describe("mergeAlbums", () => {
    it("should merge two albums", () => {
      const a = createAlbum({
        name: "A",
        type: "custom",
        createdBy: "user-1",
        itemIds: ["i1", "i2"],
      });
      const b = createAlbum({
        name: "B",
        type: "custom",
        createdBy: "user-1",
        itemIds: ["i3", "i4"],
      });
      const merged = mergeAlbums(a, b);

      expect(merged.itemCount).toBe(4);
      expect(merged.name).toBe("A + B");
    });

    it("should deduplicate items", () => {
      const a = createAlbum({
        name: "A",
        type: "custom",
        createdBy: "user-1",
        itemIds: ["i1", "i2"],
      });
      const b = createAlbum({
        name: "B",
        type: "custom",
        createdBy: "user-1",
        itemIds: ["i2", "i3"],
      });
      const merged = mergeAlbums(a, b);

      expect(merged.itemCount).toBe(3); // i1, i2, i3 (no duplicates)
    });

    it("should use custom name when provided", () => {
      const a = createAlbum({ name: "A", type: "custom", createdBy: "user-1" });
      const b = createAlbum({ name: "B", type: "custom", createdBy: "user-1" });
      const merged = mergeAlbums(a, b, "Combined");
      expect(merged.name).toBe("Combined");
    });
  });

  describe("duplicateAlbum", () => {
    it("should create a copy with new ID", () => {
      const original = createAlbum({
        name: "Original",
        type: "custom",
        createdBy: "user-1",
        itemIds: ["i1"],
      });
      const copy = duplicateAlbum(original);
      expect(copy.id).not.toBe(original.id);
      expect(copy.name).toBe("Original (Copy)");
      expect(copy.itemIds).toEqual(original.itemIds);
    });

    it("should use custom name for copy", () => {
      const original = createAlbum({
        name: "Original",
        type: "custom",
        createdBy: "user-1",
      });
      const copy = duplicateAlbum(original, "My Copy");
      expect(copy.name).toBe("My Copy");
    });
  });

  describe("findBestCoverItem", () => {
    it("should prefer images", () => {
      const testItems = [
        createMockMediaItem({
          id: "doc",
          fileType: "document",
          createdAt: new Date().toISOString(),
        }),
        createMockMediaItem({
          id: "img",
          fileType: "image",
          createdAt: new Date().toISOString(),
        }),
      ];
      expect(findBestCoverItem(testItems)).toBe("img");
    });

    it("should prefer videos when no images", () => {
      const testItems = [
        createMockMediaItem({
          id: "doc",
          fileType: "document",
          createdAt: new Date().toISOString(),
        }),
        createMockMediaItem({
          id: "vid",
          fileType: "video",
          createdAt: new Date().toISOString(),
        }),
      ];
      expect(findBestCoverItem(testItems)).toBe("vid");
    });

    it("should fallback to most recent item", () => {
      const testItems = [
        createMockMediaItem({
          id: "old",
          fileType: "document",
          createdAt: new Date(2020, 0, 1).toISOString(),
        }),
        createMockMediaItem({
          id: "new",
          fileType: "document",
          createdAt: new Date(2026, 0, 1).toISOString(),
        }),
      ];
      expect(findBestCoverItem(testItems)).toBe("new");
    });

    it("should return null for empty list", () => {
      expect(findBestCoverItem([])).toBeNull();
    });
  });

  describe("getAlbumCoverCandidates", () => {
    it("should return limited candidates", () => {
      const album = createAlbum({
        name: "Test",
        type: "custom",
        itemIds: items.slice(0, 10).map((i) => i.id),
        createdBy: "user-1",
      });
      const candidates = getAlbumCoverCandidates(album, items, 4);
      expect(candidates.length).toBeLessThanOrEqual(4);
    });

    it("should prioritize images", () => {
      const album = createAlbum({
        name: "Test",
        type: "custom",
        itemIds: items.slice(0, 10).map((i) => i.id),
        createdBy: "user-1",
      });
      const candidates = getAlbumCoverCandidates(album, items, 2);
      // First candidate should be an image (if any exist)
      if (candidates.length > 0 && items.some((i) => i.fileType === "image")) {
        expect(candidates[0].fileType).toBe("image");
      }
    });
  });

  describe("validateAlbumName", () => {
    it("should accept valid names", () => {
      expect(validateAlbumName("My Album").valid).toBe(true);
      expect(validateAlbumName("Vacation 2026").valid).toBe(true);
    });

    it("should reject empty names", () => {
      expect(validateAlbumName("").valid).toBe(false);
      expect(validateAlbumName("   ").valid).toBe(false);
    });

    it("should reject names with forbidden characters", () => {
      expect(validateAlbumName("test<script>").valid).toBe(false);
      expect(validateAlbumName("path/to/file").valid).toBe(false);
      expect(validateAlbumName("file:name").valid).toBe(false);
    });

    it("should reject excessively long names", () => {
      const longName = "A".repeat(200);
      expect(validateAlbumName(longName).valid).toBe(false);
    });
  });

  describe("generateAlbumId", () => {
    it("should generate unique IDs", () => {
      const id1 = generateAlbumId();
      const id2 = generateAlbumId();
      expect(id1).not.toBe(id2);
    });

    it("should start with album_ prefix", () => {
      const id = generateAlbumId();
      expect(id.startsWith("album_")).toBe(true);
    });
  });
});

// ============================================================================
// 6. Album Integration with Browser
// ============================================================================

describe("Album-Browser Integration", () => {
  const items = createMockItems(20);

  describe("createAlbumFromSelection", () => {
    it("should create album from selected items", () => {
      const selectedIds = new Set(["item-0", "item-2", "item-4"]);
      const album = createAlbumFromSelection(
        items,
        selectedIds,
        "Selection",
        "user-1",
      );
      expect(album.itemCount).toBe(3);
      expect(album.name).toBe("Selection");
    });
  });

  describe("generateAutoAlbums", () => {
    it("should generate albums from items", () => {
      const albums = generateAutoAlbums(items);
      expect(albums.length).toBeGreaterThan(0);
    });
  });

  describe("getAlbumItems", () => {
    it("should return items in album", () => {
      const album = createAlbum({
        name: "Test",
        type: "custom",
        itemIds: ["item-0", "item-1", "item-2"],
        createdBy: "user-1",
      });
      const albumItems = getAlbumItems(items, album);
      expect(albumItems.length).toBe(3);
    });
  });

  describe("addItemsToAlbum", () => {
    it("should add new items to album", () => {
      const album = createAlbum({
        name: "Test",
        type: "custom",
        itemIds: ["item-0"],
        createdBy: "user-1",
      });
      const updated = addItemsToAlbum(album, ["item-1", "item-2"]);
      expect(updated.itemCount).toBe(3);
    });

    it("should not add duplicate items", () => {
      const album = createAlbum({
        name: "Test",
        type: "custom",
        itemIds: ["item-0"],
        createdBy: "user-1",
      });
      const updated = addItemsToAlbum(album, ["item-0", "item-1"]);
      expect(updated.itemCount).toBe(2); // Only item-1 is new
    });
  });

  describe("removeItemsFromAlbum", () => {
    it("should remove items from album", () => {
      const album = createAlbum({
        name: "Test",
        type: "custom",
        itemIds: ["item-0", "item-1", "item-2"],
        createdBy: "user-1",
      });
      const updated = removeItemsFromAlbum(album, ["item-1"]);
      expect(updated.itemCount).toBe(2);
      expect(updated.itemIds).not.toContain("item-1");
    });

    it("should update cover if removed", () => {
      const album = createAlbum({
        name: "Test",
        type: "custom",
        itemIds: ["item-0", "item-1"],
        createdBy: "user-1",
        coverItemId: "item-0",
      });
      const updated = removeItemsFromAlbum(album, ["item-0"]);
      expect(updated.coverItemId).toBe("item-1");
    });
  });

  describe("getBrowserStats", () => {
    it("should calculate comprehensive stats", () => {
      const albums = createAutoAlbums(items);
      const stats = getBrowserStats(items, albums);

      expect(stats.totalItems).toBe(items.length);
      expect(stats.totalSize).toBeGreaterThan(0);
      expect(stats.albumCount).toBeGreaterThan(0);
      expect(stats.byChannel.size).toBeGreaterThan(0);
      expect(stats.bySender.size).toBeGreaterThan(0);
      expect(stats.dateRange.earliest).not.toBeNull();
      expect(stats.dateRange.latest).not.toBeNull();
    });

    it("should handle empty items", () => {
      const stats = getBrowserStats([], []);
      expect(stats.totalItems).toBe(0);
      expect(stats.totalSize).toBe(0);
      expect(stats.dateRange.earliest).toBeNull();
    });
  });
});

// ============================================================================
// 7. Document Preview Tests
// ============================================================================

describe("Document Preview", () => {
  describe("Document Type Detection", () => {
    it("should detect PDF from extension", () => {
      expect(getDocumentTypeFromExtension("report.pdf")).toBe("pdf");
    });

    it("should detect Word from extension", () => {
      expect(getDocumentTypeFromExtension("doc.docx")).toBe("word");
      expect(getDocumentTypeFromExtension("doc.doc")).toBe("word");
    });

    it("should detect Excel from extension", () => {
      expect(getDocumentTypeFromExtension("sheet.xlsx")).toBe("excel");
      expect(getDocumentTypeFromExtension("data.csv")).toBe("csv");
    });

    it("should detect PowerPoint from extension", () => {
      expect(getDocumentTypeFromExtension("slides.pptx")).toBe("powerpoint");
    });

    it("should detect text from extension", () => {
      expect(getDocumentTypeFromExtension("readme.txt")).toBe("text");
      expect(getDocumentTypeFromExtension("notes.md")).toBe("markdown");
    });

    it("should detect code from extension", () => {
      expect(getDocumentTypeFromExtension("app.js")).toBe("code");
      expect(getDocumentTypeFromExtension("main.ts")).toBe("code");
      expect(getDocumentTypeFromExtension("index.html")).toBe("code");
      expect(getDocumentTypeFromExtension("style.css")).toBe("code");
      expect(getDocumentTypeFromExtension("script.py")).toBe("code");
      expect(getDocumentTypeFromExtension("Main.java")).toBe("code");
      expect(getDocumentTypeFromExtension("app.go")).toBe("code");
      expect(getDocumentTypeFromExtension("lib.rs")).toBe("code");
    });

    it("should detect JSON and XML from extension", () => {
      expect(getDocumentTypeFromExtension("config.json")).toBe("json");
      expect(getDocumentTypeFromExtension("data.xml")).toBe("xml");
    });

    it("should return unknown for unrecognized extensions", () => {
      expect(getDocumentTypeFromExtension("file.xyz")).toBe("unknown");
    });

    it("should detect from MIME type", () => {
      expect(getDocumentTypeFromMime("application/pdf")).toBe("pdf");
      expect(getDocumentTypeFromMime("application/msword")).toBe("word");
      expect(getDocumentTypeFromMime("text/plain")).toBe("text");
      expect(getDocumentTypeFromMime("application/json")).toBe("json");
    });

    it("should handle MIME type with charset", () => {
      expect(getDocumentTypeFromMime("text/plain; charset=utf-8")).toBe("text");
    });

    it("should detect using both MIME and extension", () => {
      expect(detectDocumentType("application/pdf", "file.pdf")).toBe("pdf");
      // MIME type takes precedence
      expect(detectDocumentType("application/pdf", "file.txt")).toBe("pdf");
      // Fallback to extension
      expect(detectDocumentType("application/octet-stream", "file.py")).toBe(
        "code",
      );
    });
  });

  describe("Code Language Detection", () => {
    it("should detect JavaScript", () => {
      expect(getCodeLanguage("app.js")).toBe("javascript");
    });

    it("should detect TypeScript", () => {
      expect(getCodeLanguage("main.ts")).toBe("typescript");
    });

    it("should detect JSX/TSX", () => {
      expect(getCodeLanguage("component.jsx")).toBe("jsx");
      expect(getCodeLanguage("component.tsx")).toBe("tsx");
    });

    it("should detect Python", () => {
      expect(getCodeLanguage("script.py")).toBe("python");
    });

    it("should detect Go", () => {
      expect(getCodeLanguage("main.go")).toBe("go");
    });

    it("should detect Rust", () => {
      expect(getCodeLanguage("lib.rs")).toBe("rust");
    });

    it("should detect CSS/SCSS", () => {
      expect(getCodeLanguage("style.css")).toBe("css");
      expect(getCodeLanguage("theme.scss")).toBe("scss");
    });

    it("should detect YAML", () => {
      expect(getCodeLanguage("config.yaml")).toBe("yaml");
      expect(getCodeLanguage("config.yml")).toBe("yaml");
    });

    it("should detect SQL", () => {
      expect(getCodeLanguage("migration.sql")).toBe("sql");
    });

    it("should detect Bash", () => {
      expect(getCodeLanguage("deploy.sh")).toBe("bash");
    });

    it("should return plaintext for unknown", () => {
      expect(getCodeLanguage("file.xyz")).toBe("plaintext");
    });
  });

  describe("getDocumentPreviewConfig", () => {
    it("should configure PDF preview", () => {
      const config = getDocumentPreviewConfig(
        "application/pdf",
        "doc.pdf",
        1024 * 1024,
      );
      expect(config.documentType).toBe("pdf");
      expect(config.previewMode).toBe("native");
      expect(config.canPreviewInline).toBe(true);
      expect(config.paginatable).toBe(true);
      expect(config.searchable).toBe(true);
    });

    it("should configure code preview", () => {
      const config = getDocumentPreviewConfig(
        "text/javascript",
        "app.js",
        10 * 1024,
      );
      expect(config.documentType).toBe("code");
      expect(config.previewMode).toBe("rendered");
      expect(config.codeLanguage).toBe("javascript");
      expect(config.selectable).toBe(true);
    });

    it("should configure text preview", () => {
      const config = getDocumentPreviewConfig("text/plain", "readme.txt", 1024);
      expect(config.documentType).toBe("text");
      expect(config.previewMode).toBe("native");
      expect(config.canPreviewInline).toBe(true);
    });

    it("should configure markdown preview", () => {
      const config = getDocumentPreviewConfig(
        "text/markdown",
        "README.md",
        2048,
      );
      expect(config.documentType).toBe("markdown");
      expect(config.previewMode).toBe("rendered");
      expect(config.codeLanguage).toBe("markdown");
    });

    it("should configure Word preview as external", () => {
      const config = getDocumentPreviewConfig(
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "report.docx",
        1024 * 1024,
      );
      expect(config.documentType).toBe("word");
      expect(config.previewMode).toBe("external");
      expect(config.canPreviewInline).toBe(false);
    });

    it("should configure Excel preview as external", () => {
      const config = getDocumentPreviewConfig(
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "data.xlsx",
        1024 * 1024,
      );
      expect(config.documentType).toBe("excel");
      expect(config.previewMode).toBe("external");
      expect(config.paginatable).toBe(true);
    });

    it("should fall back to metadata for large files", () => {
      const largeSize = 100 * 1024 * 1024; // 100MB
      const config = getDocumentPreviewConfig(
        "text/plain",
        "huge.txt",
        largeSize,
      );
      expect(config.previewMode).toBe("metadata");
      expect(config.canPreviewInline).toBe(false);
    });

    it("should handle unknown types", () => {
      const config = getDocumentPreviewConfig(
        "application/octet-stream",
        "file.bin",
        1024,
      );
      expect(config.documentType).toBe("unknown");
      expect(config.previewMode).toBe("metadata");
    });

    it("should configure JSON preview", () => {
      const config = getDocumentPreviewConfig(
        "application/json",
        "config.json",
        1024,
      );
      expect(config.documentType).toBe("json");
      expect(config.previewMode).toBe("rendered");
      expect(config.codeLanguage).toBe("json");
    });

    it("should configure CSV preview", () => {
      const config = getDocumentPreviewConfig("text/csv", "data.csv", 1024);
      expect(config.documentType).toBe("csv");
      expect(config.previewMode).toBe("native");
    });
  });

  describe("canPreviewDocument", () => {
    it("should return true for PDFs", () => {
      expect(
        canPreviewDocument("application/pdf", "doc.pdf", 1024 * 1024),
      ).toBe(true);
    });

    it("should return true for code files", () => {
      expect(canPreviewDocument("text/javascript", "app.js", 10 * 1024)).toBe(
        true,
      );
    });

    it("should return true for text files", () => {
      expect(canPreviewDocument("text/plain", "readme.txt", 1024)).toBe(true);
    });

    it("should return true for office docs (via external)", () => {
      expect(
        canPreviewDocument(
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          "report.docx",
          1024 * 1024,
        ),
      ).toBe(true);
    });

    it("should return false for unknown types", () => {
      expect(
        canPreviewDocument("application/octet-stream", "file.bin", 1024),
      ).toBe(false);
    });
  });

  describe("getPreviewCapabilities", () => {
    it("should return full capabilities for PDF", () => {
      const caps = getPreviewCapabilities("application/pdf", "doc.pdf", 1024);
      expect(caps.canPreview).toBe(true);
      expect(caps.canSearch).toBe(true);
      expect(caps.canSelect).toBe(true);
      expect(caps.canPaginate).toBe(true);
    });

    it("should return capabilities for code", () => {
      const caps = getPreviewCapabilities("text/javascript", "app.js", 1024);
      expect(caps.canPreview).toBe(true);
      expect(caps.canSearch).toBe(true);
      expect(caps.language).toBe("javascript");
    });
  });

  describe("isCodeFile", () => {
    it("should identify code files", () => {
      expect(isCodeFile("app.js")).toBe(true);
      expect(isCodeFile("main.ts")).toBe(true);
      expect(isCodeFile("style.css")).toBe(true);
      expect(isCodeFile("index.html")).toBe(true);
      expect(isCodeFile("script.py")).toBe(true);
    });

    it("should not identify non-code files", () => {
      expect(isCodeFile("photo.jpg")).toBe(false);
      expect(isCodeFile("doc.pdf")).toBe(false);
      expect(isCodeFile("notes.txt")).toBe(false);
    });
  });

  describe("isTextBasedFile", () => {
    it("should identify text-based files", () => {
      expect(isTextBasedFile("text/plain", "readme.txt")).toBe(true);
      expect(isTextBasedFile("text/javascript", "app.js")).toBe(true);
      expect(isTextBasedFile("application/json", "config.json")).toBe(true);
      expect(isTextBasedFile("text/csv", "data.csv")).toBe(true);
      expect(isTextBasedFile("text/markdown", "README.md")).toBe(true);
    });

    it("should not identify binary files", () => {
      expect(isTextBasedFile("application/pdf", "doc.pdf")).toBe(false);
      expect(isTextBasedFile("image/jpeg", "photo.jpg")).toBe(false);
    });
  });
});

// ============================================================================
// 8. Platform-Specific Preview Config Tests
// ============================================================================

describe("Platform-Specific Preview Configs", () => {
  describe("PDF Config", () => {
    it("should return default PDF config", () => {
      const config = getDefaultPDFConfig();
      expect(config.renderMode).toBe("canvas");
      expect(config.defaultZoom).toBe(1.0);
      expect(config.enableTextSelection).toBe(true);
      expect(config.enableSearch).toBe(true);
    });

    it("should adjust for WhatsApp", () => {
      const config = getPlatformPDFConfig("whatsapp");
      expect(config.showThumbnails).toBe(false);
      expect(config.maxRenderedPages).toBe(5);
    });

    it("should adjust for Telegram", () => {
      const config = getPlatformPDFConfig("telegram");
      expect(config.showThumbnails).toBe(true);
      expect(config.maxRenderedPages).toBe(20);
    });

    it("should adjust for Discord", () => {
      const config = getPlatformPDFConfig("discord");
      expect(config.enableTextSelection).toBe(false);
      expect(config.enableSearch).toBe(false);
      expect(config.maxRenderedPages).toBe(3);
    });

    it("should adjust for Slack", () => {
      const config = getPlatformPDFConfig("slack");
      expect(config.showThumbnails).toBe(true);
      expect(config.enablePrint).toBe(true);
      expect(config.maxRenderedPages).toBe(15);
    });
  });

  describe("Code Config", () => {
    it("should return default code config", () => {
      const config = getDefaultCodeConfig();
      expect(config.showLineNumbers).toBe(true);
      expect(config.tabSize).toBe(2);
      expect(config.theme).toBe("auto");
    });

    it("should adjust for Discord (dark theme)", () => {
      const config = getPlatformCodeConfig("discord");
      expect(config.theme).toBe("dark");
      expect(config.maxLines).toBe(100);
    });

    it("should adjust for WhatsApp (compact)", () => {
      const config = getPlatformCodeConfig("whatsapp");
      expect(config.showLineNumbers).toBe(false);
      expect(config.maxLines).toBe(50);
    });

    it("should adjust for Slack (full featured)", () => {
      const config = getPlatformCodeConfig("slack");
      expect(config.showMinimap).toBe(true);
      expect(config.maxLines).toBe(500);
    });
  });

  describe("Office Config", () => {
    it("should return default office config", () => {
      const config = getDefaultOfficeConfig();
      expect(config.provider).toBe("google");
      expect(config.showOutline).toBe(true);
    });

    it("should generate Google viewer URL", () => {
      const url = getOfficePreviewUrl("https://example.com/doc.docx");
      expect(url).toContain("docs.google.com/gview");
      expect(url).toContain(encodeURIComponent("https://example.com/doc.docx"));
    });

    it("should generate Microsoft viewer URL", () => {
      const url = getOfficePreviewUrl("https://example.com/doc.docx", {
        provider: "microsoft",
      });
      expect(url).toContain("view.officeapps.live.com");
    });

    it("should return null for none provider", () => {
      const url = getOfficePreviewUrl("https://example.com/doc.docx", {
        provider: "none",
      });
      expect(url).toBeNull();
    });
  });
});

// ============================================================================
// 9. Preview Result Tests
// ============================================================================

describe("Preview Result Generation", () => {
  describe("createEmptyPreviewResult", () => {
    it("should create successful empty result", () => {
      const result = createEmptyPreviewResult(1024);
      expect(result.success).toBe(true);
      expect(result.content).toBeNull();
      expect(result.error).toBeNull();
      expect(result.metadata.fileSize).toBe(1024);
    });

    it("should create error result", () => {
      const result = createEmptyPreviewResult(1024, "File too large");
      expect(result.success).toBe(false);
      expect(result.error).toBe("File too large");
    });
  });

  describe("createTextPreviewResult", () => {
    it("should create result from text content", () => {
      const content = "Hello\nWorld\nTest";
      const result = createTextPreviewResult(content, content.length);
      expect(result.success).toBe(true);
      expect(result.content).toBe(content);
      expect(result.lineCount).toBe(3);
      expect(result.metadata.wordCount).toBe(3);
      expect(result.metadata.characterCount).toBe(content.length);
    });

    it("should include language", () => {
      const result = createTextPreviewResult("const x = 1;", 13, "javascript");
      expect(result.language).toBe("javascript");
      expect(result.metadata.language).toBe("javascript");
    });
  });

  describe("truncatePreview", () => {
    it("should truncate long content", () => {
      const content = Array.from({ length: 50 }, (_, i) => `Line ${i}`).join(
        "\n",
      );
      const result = truncatePreview(content, 10);
      expect(result.isTruncated).toBe(true);
      expect(result.truncated.endsWith("...")).toBe(true);
      expect(result.totalLines).toBe(50);
    });

    it("should not truncate short content", () => {
      const content = "Line 1\nLine 2\nLine 3";
      const result = truncatePreview(content, 10);
      expect(result.isTruncated).toBe(false);
      expect(result.truncated).toBe(content);
      expect(result.totalLines).toBe(3);
    });

    it("should handle exact boundary", () => {
      const content = "Line 1\nLine 2\nLine 3";
      const result = truncatePreview(content, 3);
      expect(result.isTruncated).toBe(false);
    });
  });
});

// ============================================================================
// 10. Constants and Mappings Completeness Tests
// ============================================================================

describe("Constants and Mappings", () => {
  describe("EXTENSION_TO_DOCUMENT_TYPE", () => {
    it("should have mappings for common document extensions", () => {
      const expected = [
        "pdf",
        "doc",
        "docx",
        "xls",
        "xlsx",
        "ppt",
        "pptx",
        "txt",
        "md",
        "csv",
      ];
      for (const ext of expected) {
        expect(EXTENSION_TO_DOCUMENT_TYPE[ext]).toBeDefined();
      }
    });

    it("should have mappings for common code extensions", () => {
      const expected = [
        "js",
        "ts",
        "jsx",
        "tsx",
        "py",
        "java",
        "go",
        "rs",
        "html",
        "css",
      ];
      for (const ext of expected) {
        expect(EXTENSION_TO_DOCUMENT_TYPE[ext]).toBe("code");
      }
    });
  });

  describe("EXTENSION_TO_LANGUAGE", () => {
    it("should have language mappings for code extensions", () => {
      expect(EXTENSION_TO_LANGUAGE["js"]).toBe("javascript");
      expect(EXTENSION_TO_LANGUAGE["ts"]).toBe("typescript");
      expect(EXTENSION_TO_LANGUAGE["py"]).toBe("python");
      expect(EXTENSION_TO_LANGUAGE["go"]).toBe("go");
      expect(EXTENSION_TO_LANGUAGE["rs"]).toBe("rust");
    });
  });

  describe("MIME_TO_DOCUMENT_TYPE", () => {
    it("should have mappings for common MIME types", () => {
      expect(MIME_TO_DOCUMENT_TYPE["application/pdf"]).toBe("pdf");
      expect(MIME_TO_DOCUMENT_TYPE["text/plain"]).toBe("text");
      expect(MIME_TO_DOCUMENT_TYPE["application/json"]).toBe("json");
    });
  });

  describe("DOCUMENT_TYPE_STYLES", () => {
    it("should have styles for all document types", () => {
      const types: DocumentType[] = [
        "pdf",
        "word",
        "excel",
        "powerpoint",
        "text",
        "markdown",
        "csv",
        "code",
        "json",
        "xml",
        "rtf",
        "unknown",
      ];
      for (const type of types) {
        const style = DOCUMENT_TYPE_STYLES[type];
        expect(style.icon).toBeTruthy();
        expect(style.label).toBeTruthy();
        expect(style.color).toBeTruthy();
      }
    });
  });

  describe("PLATFORM_BEHAVIORS", () => {
    it("should have behavior for all presets", () => {
      const presets: PlatformPreset[] = [
        "whatsapp",
        "telegram",
        "discord",
        "slack",
        "default",
      ];
      for (const preset of presets) {
        const behavior = PLATFORM_BEHAVIORS[preset];
        expect(behavior.name).toBeTruthy();
        expect(behavior.previewableTypes.length).toBeGreaterThan(0);
        expect(behavior.gridColumns).toBeDefined();
      }
    });
  });

  describe("THUMBNAIL_SIZES", () => {
    it("should have all three sizes", () => {
      expect(THUMBNAIL_SIZES.small).toBeDefined();
      expect(THUMBNAIL_SIZES.medium).toBeDefined();
      expect(THUMBNAIL_SIZES.large).toBeDefined();
      expect(THUMBNAIL_SIZES.small).toBeLessThan(THUMBNAIL_SIZES.medium);
      expect(THUMBNAIL_SIZES.medium).toBeLessThan(THUMBNAIL_SIZES.large);
    });
  });

  describe("DEFAULT_BROWSER_CONFIG", () => {
    it("should have sensible defaults", () => {
      expect(DEFAULT_BROWSER_CONFIG.platform).toBe("default");
      expect(DEFAULT_BROWSER_CONFIG.pageSize).toBeGreaterThan(0);
      expect(DEFAULT_BROWSER_CONFIG.searchEnabled).toBe(true);
      expect(DEFAULT_BROWSER_CONFIG.keyboardNavigation).toBe(true);
    });
  });
});
