/**
 * Star Store Tests
 *
 * Tests for the Zustand star store.
 */

import { act, renderHook } from "@testing-library/react";
import {
  useStarStore,
  selectStarredCount,
  selectQuickAccessCount,
  selectHighPriorityCount,
  selectIsPanelOpen,
  selectIsLoading,
  selectError,
} from "../star-store";
import type { StarredMessage, StarColor, StarCategory } from "@/lib/stars";

// ============================================================================
// Test Fixtures
// ============================================================================

function createStarredMessage(
  overrides: Partial<StarredMessage> = {},
): StarredMessage {
  return {
    id: `star-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    userId: "user-1",
    messageId: `msg-${Date.now()}`,
    channelId: "channel-1",
    starredAt: new Date(),
    message: {
      id: "msg-1",
      content: "Test message content",
      type: "text",
      createdAt: new Date(),
      userId: "user-1",
      user: {
        id: "user-1",
        displayName: "Test User",
        username: "testuser",
      },
      channelId: "channel-1",
    } as any,
    color: "yellow",
    priority: "medium",
    quickAccess: false,
    ...overrides,
  };
}

// ============================================================================
// Store Tests
// ============================================================================

describe("useStarStore", () => {
  beforeEach(() => {
    // Reset store before each test
    const { result } = renderHook(() => useStarStore());
    act(() => {
      result.current.resetStore();
    });
  });

  describe("starred message operations", () => {
    it("should add a starred message", () => {
      const { result } = renderHook(() => useStarStore());
      const star = createStarredMessage({ id: "star-1", messageId: "msg-1" });

      act(() => {
        result.current.addStarredMessage(star);
      });

      expect(result.current.starredMessages.size).toBe(1);
      expect(result.current.getStarredMessage("star-1")).toBeDefined();
    });

    it("should set multiple starred messages", () => {
      const { result } = renderHook(() => useStarStore());
      const stars = [
        createStarredMessage({ id: "star-1", messageId: "msg-1" }),
        createStarredMessage({ id: "star-2", messageId: "msg-2" }),
      ];

      act(() => {
        result.current.setStarredMessages(stars);
      });

      expect(result.current.starredMessages.size).toBe(2);
      expect(result.current.totalCount).toBe(2);
    });

    it("should update a starred message", () => {
      const { result } = renderHook(() => useStarStore());
      const star = createStarredMessage({
        id: "star-1",
        messageId: "msg-1",
        note: "old note",
      });

      act(() => {
        result.current.addStarredMessage(star);
      });

      act(() => {
        result.current.updateStarredMessage("star-1", { note: "new note" });
      });

      expect(result.current.getStarredMessage("star-1")?.note).toBe("new note");
    });

    it("should remove a starred message", () => {
      const { result } = renderHook(() => useStarStore());
      const star = createStarredMessage({ id: "star-1", messageId: "msg-1" });

      act(() => {
        result.current.addStarredMessage(star);
      });

      act(() => {
        result.current.removeStarredMessage("star-1");
      });

      expect(result.current.starredMessages.size).toBe(0);
      expect(result.current.totalCount).toBe(0);
    });

    it("should remove star by message ID", () => {
      const { result } = renderHook(() => useStarStore());
      const star = createStarredMessage({ id: "star-1", messageId: "msg-1" });

      act(() => {
        result.current.addStarredMessage(star);
      });

      act(() => {
        result.current.removeStarByMessageId("msg-1");
      });

      expect(result.current.starredMessages.size).toBe(0);
    });

    it("should clear all starred messages", () => {
      const { result } = renderHook(() => useStarStore());
      const stars = [
        createStarredMessage({ id: "star-1", messageId: "msg-1" }),
        createStarredMessage({ id: "star-2", messageId: "msg-2" }),
      ];

      act(() => {
        result.current.setStarredMessages(stars);
      });

      act(() => {
        result.current.clearAllStarred();
      });

      expect(result.current.starredMessages.size).toBe(0);
      expect(result.current.totalCount).toBe(0);
    });
  });

  describe("get operations", () => {
    it("should get starred message by ID", () => {
      const { result } = renderHook(() => useStarStore());
      const star = createStarredMessage({ id: "star-1", messageId: "msg-1" });

      act(() => {
        result.current.addStarredMessage(star);
      });

      const retrieved = result.current.getStarredMessage("star-1");
      expect(retrieved?.id).toBe("star-1");
    });

    it("should get star by message ID", () => {
      const { result } = renderHook(() => useStarStore());
      const star = createStarredMessage({ id: "star-1", messageId: "msg-1" });

      act(() => {
        result.current.addStarredMessage(star);
      });

      const retrieved = result.current.getStarByMessageId("msg-1");
      expect(retrieved?.messageId).toBe("msg-1");
    });

    it("should check if message is starred", () => {
      const { result } = renderHook(() => useStarStore());
      const star = createStarredMessage({ id: "star-1", messageId: "msg-1" });

      act(() => {
        result.current.addStarredMessage(star);
      });

      expect(result.current.isMessageStarred("msg-1")).toBe(true);
      expect(result.current.isMessageStarred("msg-999")).toBe(false);
    });

    it("should get quick access stars", () => {
      const { result } = renderHook(() => useStarStore());
      const stars = [
        createStarredMessage({
          id: "star-1",
          messageId: "msg-1",
          quickAccess: true,
        }),
        createStarredMessage({
          id: "star-2",
          messageId: "msg-2",
          quickAccess: false,
        }),
        createStarredMessage({
          id: "star-3",
          messageId: "msg-3",
          quickAccess: true,
        }),
      ];

      act(() => {
        result.current.setStarredMessages(stars);
      });

      const quickAccess = result.current.getQuickAccessStars();
      expect(quickAccess).toHaveLength(2);
      expect(quickAccess.every((s) => s.quickAccess)).toBe(true);
    });

    it("should get high priority stars", () => {
      const { result } = renderHook(() => useStarStore());
      const stars = [
        createStarredMessage({
          id: "star-1",
          messageId: "msg-1",
          priority: "urgent",
        }),
        createStarredMessage({
          id: "star-2",
          messageId: "msg-2",
          priority: "low",
        }),
        createStarredMessage({
          id: "star-3",
          messageId: "msg-3",
          priority: "high",
        }),
      ];

      act(() => {
        result.current.setStarredMessages(stars);
      });

      const highPriority = result.current.getHighPriorityStars();
      expect(highPriority).toHaveLength(2);
    });

    it("should get all categories", () => {
      const { result } = renderHook(() => useStarStore());
      const stars = [
        createStarredMessage({
          id: "star-1",
          messageId: "msg-1",
          category: "meeting",
        }),
        createStarredMessage({
          id: "star-2",
          messageId: "msg-2",
          category: "reference",
        }),
        createStarredMessage({ id: "star-3", messageId: "msg-3" }),
      ];

      act(() => {
        result.current.setStarredMessages(stars);
      });

      const categories = result.current.getAllCategories();
      expect(categories).toContain("meeting");
      expect(categories).toContain("reference");
    });
  });

  describe("color operations", () => {
    it("should change star color", () => {
      const { result } = renderHook(() => useStarStore());
      const star = createStarredMessage({
        id: "star-1",
        messageId: "msg-1",
        color: "yellow",
      });

      act(() => {
        result.current.addStarredMessage(star);
      });

      act(() => {
        result.current.changeStarColor("star-1", "red");
      });

      expect(result.current.getStarredMessage("star-1")?.color).toBe("red");
    });

    it("should get starred by color", () => {
      const { result } = renderHook(() => useStarStore());
      const stars = [
        createStarredMessage({
          id: "star-1",
          messageId: "msg-1",
          color: "red",
        }),
        createStarredMessage({
          id: "star-2",
          messageId: "msg-2",
          color: "yellow",
        }),
        createStarredMessage({
          id: "star-3",
          messageId: "msg-3",
          color: "red",
        }),
      ];

      act(() => {
        result.current.setStarredMessages(stars);
      });

      const redStars = result.current.getStarredByColor("red");
      expect(redStars).toHaveLength(2);
    });
  });

  describe("quick access operations", () => {
    it("should toggle quick access", () => {
      const { result } = renderHook(() => useStarStore());
      const star = createStarredMessage({
        id: "star-1",
        messageId: "msg-1",
        quickAccess: false,
      });

      act(() => {
        result.current.addStarredMessage(star);
      });

      act(() => {
        result.current.toggleQuickAccess("star-1");
      });

      expect(result.current.getStarredMessage("star-1")?.quickAccess).toBe(
        true,
      );

      act(() => {
        result.current.toggleQuickAccess("star-1");
      });

      expect(result.current.getStarredMessage("star-1")?.quickAccess).toBe(
        false,
      );
    });
  });

  describe("category operations", () => {
    it("should set star category", () => {
      const { result } = renderHook(() => useStarStore());
      const star = createStarredMessage({ id: "star-1", messageId: "msg-1" });

      act(() => {
        result.current.addStarredMessage(star);
      });

      act(() => {
        result.current.setStarCategory("star-1", "meeting");
      });

      expect(result.current.getStarredMessage("star-1")?.category).toBe(
        "meeting",
      );
    });

    it("should add category", () => {
      const { result } = renderHook(() => useStarStore());
      const category: StarCategory = {
        id: "cat-1",
        name: "Important",
        color: "#ff0000",
      };

      act(() => {
        result.current.addCategory(category);
      });

      expect(result.current.categories.size).toBe(1);
    });
  });

  describe("panel state", () => {
    it("should open panel", () => {
      const { result } = renderHook(() => useStarStore());

      act(() => {
        result.current.openPanel();
      });

      expect(result.current.isPanelOpen).toBe(true);
    });

    it("should close panel", () => {
      const { result } = renderHook(() => useStarStore());

      act(() => {
        result.current.openPanel();
      });

      act(() => {
        result.current.closePanel();
      });

      expect(result.current.isPanelOpen).toBe(false);
    });

    it("should toggle panel", () => {
      const { result } = renderHook(() => useStarStore());

      act(() => {
        result.current.togglePanel();
      });

      expect(result.current.isPanelOpen).toBe(true);

      act(() => {
        result.current.togglePanel();
      });

      expect(result.current.isPanelOpen).toBe(false);
    });

    it("should open edit star modal", () => {
      const { result } = renderHook(() => useStarStore());

      act(() => {
        result.current.openEditStar("star-1");
      });

      expect(result.current.isEditStarOpen).toBe(true);
      expect(result.current.selectedStarId).toBe("star-1");
    });

    it("should close edit star modal", () => {
      const { result } = renderHook(() => useStarStore());

      act(() => {
        result.current.openEditStar("star-1");
      });

      act(() => {
        result.current.closeEditStar();
      });

      expect(result.current.isEditStarOpen).toBe(false);
      expect(result.current.selectedStarId).toBeNull();
    });
  });

  describe("filters and sorting", () => {
    it("should set filters", () => {
      const { result } = renderHook(() => useStarStore());

      act(() => {
        result.current.setFilters({ channelId: "channel-1" });
      });

      expect(result.current.filters.channelId).toBe("channel-1");
    });

    it("should clear filters", () => {
      const { result } = renderHook(() => useStarStore());

      act(() => {
        result.current.setFilters({ channelId: "channel-1" });
        result.current.setSelectedColorFilter("red");
        result.current.setSearchQuery("test");
      });

      act(() => {
        result.current.clearFilters();
      });

      expect(result.current.filters).toEqual({});
      expect(result.current.selectedColorFilter).toBeNull();
      expect(result.current.searchQuery).toBe("");
    });

    it("should set sort by", () => {
      const { result } = renderHook(() => useStarStore());

      act(() => {
        result.current.setSortBy("priority");
      });

      expect(result.current.sortBy).toBe("priority");
    });

    it("should set sort order", () => {
      const { result } = renderHook(() => useStarStore());

      act(() => {
        result.current.setSortOrder("asc");
      });

      expect(result.current.sortOrder).toBe("asc");
    });

    it("should set search query", () => {
      const { result } = renderHook(() => useStarStore());

      act(() => {
        result.current.setSearchQuery("test query");
      });

      expect(result.current.searchQuery).toBe("test query");
    });

    it("should set color filter", () => {
      const { result } = renderHook(() => useStarStore());

      act(() => {
        result.current.setSelectedColorFilter("red");
      });

      expect(result.current.selectedColorFilter).toBe("red");
    });
  });

  describe("loading and error state", () => {
    it("should set loading state", () => {
      const { result } = renderHook(() => useStarStore());

      act(() => {
        result.current.setLoading(true);
      });

      expect(result.current.isLoading).toBe(true);
    });

    it("should set starring state", () => {
      const { result } = renderHook(() => useStarStore());

      act(() => {
        result.current.setStarring(true);
      });

      expect(result.current.isStarring).toBe(true);
    });

    it("should set error", () => {
      const { result } = renderHook(() => useStarStore());

      act(() => {
        result.current.setError("Test error");
      });

      expect(result.current.error).toBe("Test error");
    });
  });

  describe("pagination", () => {
    it("should set has more", () => {
      const { result } = renderHook(() => useStarStore());

      act(() => {
        result.current.setHasMore(true);
      });

      expect(result.current.hasMore).toBe(true);
    });

    it("should set cursor", () => {
      const { result } = renderHook(() => useStarStore());

      act(() => {
        result.current.setCursor(10);
      });

      expect(result.current.cursor).toBe(10);
    });

    it("should set total count", () => {
      const { result } = renderHook(() => useStarStore());

      act(() => {
        result.current.setTotalCount(100);
      });

      expect(result.current.totalCount).toBe(100);
    });
  });
});

// ============================================================================
// Selector Tests
// ============================================================================

describe("Star Store Selectors", () => {
  beforeEach(() => {
    const { result } = renderHook(() => useStarStore());
    act(() => {
      result.current.resetStore();
    });
  });

  it("selectStarredCount should return total count", () => {
    const { result } = renderHook(() => useStarStore());
    const stars = [
      createStarredMessage({ id: "star-1", messageId: "msg-1" }),
      createStarredMessage({ id: "star-2", messageId: "msg-2" }),
    ];

    act(() => {
      result.current.setStarredMessages(stars);
    });

    expect(selectStarredCount(result.current)).toBe(2);
  });

  it("selectQuickAccessCount should return quick access count", () => {
    const { result } = renderHook(() => useStarStore());
    const stars = [
      createStarredMessage({
        id: "star-1",
        messageId: "msg-1",
        quickAccess: true,
      }),
      createStarredMessage({
        id: "star-2",
        messageId: "msg-2",
        quickAccess: false,
      }),
    ];

    act(() => {
      result.current.setStarredMessages(stars);
    });

    expect(selectQuickAccessCount(result.current)).toBe(1);
  });

  it("selectHighPriorityCount should return high priority count", () => {
    const { result } = renderHook(() => useStarStore());
    const stars = [
      createStarredMessage({
        id: "star-1",
        messageId: "msg-1",
        priority: "urgent",
      }),
      createStarredMessage({
        id: "star-2",
        messageId: "msg-2",
        priority: "high",
      }),
      createStarredMessage({
        id: "star-3",
        messageId: "msg-3",
        priority: "low",
      }),
    ];

    act(() => {
      result.current.setStarredMessages(stars);
    });

    expect(selectHighPriorityCount(result.current)).toBe(2);
  });

  it("selectIsPanelOpen should return panel state", () => {
    const { result } = renderHook(() => useStarStore());

    expect(selectIsPanelOpen(result.current)).toBe(false);

    act(() => {
      result.current.openPanel();
    });

    expect(selectIsPanelOpen(result.current)).toBe(true);
  });

  it("selectIsLoading should return loading state", () => {
    const { result } = renderHook(() => useStarStore());

    expect(selectIsLoading(result.current)).toBe(false);

    act(() => {
      result.current.setLoading(true);
    });

    expect(selectIsLoading(result.current)).toBe(true);
  });

  it("selectError should return error state", () => {
    const { result } = renderHook(() => useStarStore());

    expect(selectError(result.current)).toBeNull();

    act(() => {
      result.current.setError("Test error");
    });

    expect(selectError(result.current)).toBe("Test error");
  });
});
