/**
 * useQuickRecall Hook
 *
 * Unified hook for quick access to pins, bookmarks, saved messages, and stars.
 * Provides a single interface for all "saved for later" functionality.
 */

import { useCallback, useMemo } from "react";
import { usePinnedStore } from "@/stores/pinned-store";
import { useBookmarkStore } from "@/lib/bookmarks/bookmark-store";
import { useSavedStore } from "@/stores/saved-store";
import { useStarStore } from "@/stores/star-store";
import type { PinnedMessage } from "@/lib/pinned";
import type { Bookmark } from "@/lib/bookmarks/bookmark-store";
import type { SavedMessage } from "@/lib/saved";
import type { StarredMessage, StarColor } from "@/lib/stars";

// ============================================================================
// Types
// ============================================================================

export type QuickRecallItemType = "pin" | "bookmark" | "saved" | "star";

export interface QuickRecallItem {
  id: string;
  type: QuickRecallItemType;
  messageId: string;
  channelId: string;
  content: string;
  createdAt: Date;
  savedAt: Date;
  note?: string;
  // Type-specific properties
  starColor?: StarColor;
  isQuickAccess?: boolean;
  isPinned?: boolean;
  folderId?: string;
  collectionIds?: string[];
  tags?: string[];
}

export interface QuickRecallStats {
  totalPins: number;
  totalBookmarks: number;
  totalSaved: number;
  totalStarred: number;
  quickAccessCount: number;
  highPriorityCount: number;
}

export type QuickRecallFilter =
  | "all"
  | "pins"
  | "bookmarks"
  | "saved"
  | "stars";
export type QuickRecallSort = "recent" | "oldest" | "priority" | "channel";

interface UseQuickRecallOptions {
  channelId?: string;
  limit?: number;
}

interface UseQuickRecallReturn {
  // Data
  items: QuickRecallItem[];
  recentItems: QuickRecallItem[];
  quickAccessItems: QuickRecallItem[];
  stats: QuickRecallStats;

  // Filtering
  filter: QuickRecallFilter;
  setFilter: (filter: QuickRecallFilter) => void;
  sort: QuickRecallSort;
  setSort: (sort: QuickRecallSort) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;

  // Actions
  jumpToMessage: (item: QuickRecallItem) => void;
  removeItem: (item: QuickRecallItem) => void;
  toggleQuickAccess: (item: QuickRecallItem) => void;

  // Panel state
  isPanelOpen: boolean;
  openPanel: () => void;
  closePanel: () => void;
  togglePanel: () => void;

  // Loading
  isLoading: boolean;
}

// ============================================================================
// Hook Implementation
// ============================================================================

/**
 * Unified hook for quick access to all saved items.
 */
export function useQuickRecall(
  options: UseQuickRecallOptions = {},
): UseQuickRecallReturn {
  const { channelId, limit = 50 } = options;

  // Stores
  const pinnedStore = usePinnedStore();
  const bookmarkStore = useBookmarkStore();
  const savedStore = useSavedStore();
  const starStore = useStarStore();

  // Local state for filters (would normally be in a dedicated store)
  const filter = "all" as QuickRecallFilter;
  const sort = "recent" as QuickRecallSort;
  const searchQuery = "" as string;

  // Convert items to unified format
  const convertPinnedToItem = useCallback(
    (pin: PinnedMessage): QuickRecallItem => ({
      id: `pin-${pin.id}`,
      type: "pin",
      messageId: pin.messageId,
      channelId: pin.channelId,
      content: pin.message?.content ?? "",
      createdAt: new Date(pin.message?.createdAt ?? new Date()),
      savedAt:
        pin.pinnedAt instanceof Date ? pin.pinnedAt : new Date(pin.pinnedAt),
      note: pin.note,
      isPinned: true,
    }),
    [],
  );

  const convertBookmarkToItem = useCallback(
    (bookmark: Bookmark): QuickRecallItem => ({
      id: `bookmark-${bookmark.id}`,
      type: "bookmark",
      messageId: bookmark.message_id,
      channelId: bookmark.message?.channel?.id ?? "",
      content: bookmark.message?.content ?? "",
      createdAt: new Date(bookmark.message?.created_at ?? new Date()),
      savedAt: new Date(bookmark.created_at),
      note: bookmark.note,
      folderId: bookmark.folder_id,
    }),
    [],
  );

  const convertSavedToItem = useCallback(
    (saved: SavedMessage): QuickRecallItem => ({
      id: `saved-${saved.id}`,
      type: "saved",
      messageId: saved.messageId,
      channelId: saved.channelId,
      content: saved.message?.content ?? "",
      createdAt: new Date(saved.message?.createdAt ?? new Date()),
      savedAt:
        saved.savedAt instanceof Date ? saved.savedAt : new Date(saved.savedAt),
      note: saved.note,
      collectionIds: saved.collectionIds,
      tags: saved.tags,
    }),
    [],
  );

  const convertStarToItem = useCallback(
    (star: StarredMessage): QuickRecallItem => ({
      id: `star-${star.id}`,
      type: "star",
      messageId: star.messageId,
      channelId: star.channelId,
      content: star.message?.content ?? "",
      createdAt: new Date(star.message?.createdAt ?? new Date()),
      savedAt:
        star.starredAt instanceof Date
          ? star.starredAt
          : new Date(star.starredAt),
      note: star.note,
      starColor: star.color,
      isQuickAccess: star.quickAccess,
    }),
    [],
  );

  // Get all items
  const items = useMemo(() => {
    let allItems: QuickRecallItem[] = [];

    // Get pins
    if (filter === "all" || filter === "pins") {
      if (channelId) {
        const pins = pinnedStore.getPinnedMessages(channelId);
        allItems.push(...pins.map(convertPinnedToItem));
      } else {
        pinnedStore.pinnedByChannel.forEach((pins) => {
          allItems.push(...pins.map(convertPinnedToItem));
        });
      }
    }

    // Get bookmarks
    if (filter === "all" || filter === "bookmarks") {
      const bookmarks = Array.from(bookmarkStore.bookmarks.values());
      const filteredBookmarks = channelId
        ? bookmarks.filter((b) => b.message?.channel?.id === channelId)
        : bookmarks;
      allItems.push(...filteredBookmarks.map(convertBookmarkToItem));
    }

    // Get saved messages
    if (filter === "all" || filter === "saved") {
      const saved = Array.from(savedStore.savedMessages.values());
      const filteredSaved = channelId
        ? saved.filter((s) => s.channelId === channelId)
        : saved;
      allItems.push(...filteredSaved.map(convertSavedToItem));
    }

    // Get stars
    if (filter === "all" || filter === "stars") {
      const stars = Array.from(starStore.starredMessages.values());
      const filteredStars = channelId
        ? stars.filter((s) => s.channelId === channelId)
        : stars;
      allItems.push(...filteredStars.map(convertStarToItem));
    }

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      allItems = allItems.filter(
        (item) =>
          item.content.toLowerCase().includes(query) ||
          item.note?.toLowerCase().includes(query),
      );
    }

    // Sort items
    allItems.sort((a, b) => {
      switch (sort) {
        case "recent":
          return b.savedAt.getTime() - a.savedAt.getTime();
        case "oldest":
          return a.savedAt.getTime() - b.savedAt.getTime();
        case "priority":
          // Stars with quick access first, then by date
          if (a.isQuickAccess !== b.isQuickAccess) {
            return a.isQuickAccess ? -1 : 1;
          }
          return b.savedAt.getTime() - a.savedAt.getTime();
        case "channel":
          const channelCompare = a.channelId.localeCompare(b.channelId);
          if (channelCompare !== 0) return channelCompare;
          return b.savedAt.getTime() - a.savedAt.getTime();
        default:
          return 0;
      }
    });

    // Apply limit
    return allItems.slice(0, limit);
  }, [
    filter,
    channelId,
    searchQuery,
    sort,
    limit,
    pinnedStore,
    bookmarkStore.bookmarks,
    savedStore.savedMessages,
    starStore.starredMessages,
    convertPinnedToItem,
    convertBookmarkToItem,
    convertSavedToItem,
    convertStarToItem,
  ]);

  // Recent items (last 5)
  const recentItems = useMemo(() => {
    return [...items]
      .sort((a, b) => b.savedAt.getTime() - a.savedAt.getTime())
      .slice(0, 5);
  }, [items]);

  // Quick access items (stars with quick access enabled)
  const quickAccessItems = useMemo(() => {
    return items.filter((item) => item.isQuickAccess);
  }, [items]);

  // Stats
  const stats = useMemo((): QuickRecallStats => {
    let totalPins = 0;
    pinnedStore.pinnedByChannel.forEach((pins) => {
      totalPins += pins.length;
    });

    return {
      totalPins,
      totalBookmarks: bookmarkStore.totalCount,
      totalSaved: savedStore.totalCount,
      totalStarred: starStore.totalCount,
      quickAccessCount: Array.from(starStore.starredMessages.values()).filter(
        (s) => s.quickAccess,
      ).length,
      highPriorityCount: Array.from(starStore.starredMessages.values()).filter(
        (s) => s.priority === "urgent" || s.priority === "high",
      ).length,
    };
  }, [
    pinnedStore.pinnedByChannel,
    bookmarkStore.totalCount,
    savedStore.totalCount,
    starStore,
  ]);

  // Actions
  const jumpToMessage = useCallback((item: QuickRecallItem) => {
    // This would navigate to the message in the chat
    // Implementation depends on routing setup
    console.log(
      "Jump to message:",
      item.messageId,
      "in channel:",
      item.channelId,
    );
  }, []);

  const removeItem = useCallback(
    (item: QuickRecallItem) => {
      switch (item.type) {
        case "pin":
          const pinId = item.id.replace("pin-", "");
          pinnedStore.removePinnedMessage(item.channelId, item.messageId);
          break;
        case "bookmark":
          const bookmarkId = item.id.replace("bookmark-", "");
          bookmarkStore.removeBookmark(bookmarkId);
          break;
        case "saved":
          savedStore.removeSavedByMessageId(item.messageId);
          break;
        case "star":
          starStore.removeStarByMessageId(item.messageId);
          break;
      }
    },
    [pinnedStore, bookmarkStore, savedStore, starStore],
  );

  const toggleQuickAccess = useCallback(
    (item: QuickRecallItem) => {
      if (item.type === "star") {
        const starId = item.id.replace("star-", "");
        starStore.toggleQuickAccess(starId);
      }
    },
    [starStore],
  );

  // Panel state - use star store panel for now
  const isPanelOpen = starStore.isPanelOpen;
  const openPanel = useCallback(() => starStore.openPanel(), [starStore]);
  const closePanel = useCallback(() => starStore.closePanel(), [starStore]);
  const togglePanel = useCallback(() => starStore.togglePanel(), [starStore]);

  // Loading state
  const isLoading =
    pinnedStore.isLoading ||
    bookmarkStore.isLoading ||
    savedStore.isLoading ||
    starStore.isLoading;

  return {
    items,
    recentItems,
    quickAccessItems,
    stats,
    filter,
    setFilter: () => {}, // Would be connected to state
    sort,
    setSort: () => {}, // Would be connected to state
    searchQuery,
    setSearchQuery: () => {}, // Would be connected to state
    jumpToMessage,
    removeItem,
    toggleQuickAccess,
    isPanelOpen,
    openPanel,
    closePanel,
    togglePanel,
    isLoading,
  };
}
