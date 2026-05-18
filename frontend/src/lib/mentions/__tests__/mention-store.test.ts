/**
 * Mention Store Unit Tests
 *
 * Comprehensive tests for mention store functionality including:
 * - Mention CRUD operations
 * - Mark as read operations
 * - Panel state management
 * - Selectors
 * - Helper functions
 */

import { act } from "@testing-library/react";
import {
  useMentionStore,
  selectMentions,
  selectUnreadMentions,
  selectUnreadCount,
  selectMentionById,
  selectMentionsByChannel,
  selectIsPanelOpen,
  selectPanelFilter,
  selectSelectedMentionId,
  selectIsLoading,
  selectError,
  getMentionTypeLabel,
  getMentionTypeIcon,
  isGroupMention,
  extractMentionPreview,
  normalizeMention,
  type Mention,
  type MentionType,
} from "../mention-store";

// ============================================================================
// Test Helpers
// ============================================================================

const createTestMention = (overrides: Partial<Mention> = {}): Mention => ({
  id: `mention-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
  message_id: `msg-${Date.now()}`,
  user_id: "user-1",
  type: "user" as MentionType,
  is_read: false,
  read_at: null,
  created_at: new Date().toISOString(),
  message: {
    id: `msg-${Date.now()}`,
    channel_id: "channel-1",
    user_id: "user-2",
    content: "Hey @user1, how are you?",
    type: "text",
    is_edited: false,
    is_pinned: false,
    is_deleted: false,
    created_at: new Date().toISOString(),
    edited_at: null,
    user: {
      id: "user-2",
      username: "sender",
      display_name: "Sender User",
      avatar_url: null,
    },
    channel: {
      id: "channel-1",
      name: "General",
      slug: "general",
      description: "General discussion",
      type: "public",
      is_private: false,
      is_archived: false,
      is_default: true,
    },
  },
  ...overrides,
});

// ============================================================================
// Setup/Teardown
// ============================================================================

describe("Mention Store", () => {
  beforeEach(() => {
    act(() => {
      useMentionStore.getState().reset();
    });
  });

  // ==========================================================================
  // Initial State Tests
  // ==========================================================================

  describe("Initial State", () => {
    it("should have empty mentions map", () => {
      const state = useMentionStore.getState();
      expect(state.mentions.size).toBe(0);
    });

    it("should have empty unread set", () => {
      const state = useMentionStore.getState();
      expect(state.unreadMentionIds.size).toBe(0);
    });

    it("should not be loading", () => {
      const state = useMentionStore.getState();
      expect(state.isLoading).toBe(false);
    });

    it("should have no error", () => {
      const state = useMentionStore.getState();
      expect(state.error).toBeNull();
    });

    it("should have closed panel", () => {
      const state = useMentionStore.getState();
      expect(state.panel.isOpen).toBe(false);
    });

    it('should have "all" filter', () => {
      const state = useMentionStore.getState();
      expect(state.panel.filter).toBe("all");
    });

    it("should have no selected mention", () => {
      const state = useMentionStore.getState();
      expect(state.selectedMentionId).toBeNull();
    });
  });

  // ==========================================================================
  // Mention CRUD Tests
  // ==========================================================================

  describe("Mention CRUD", () => {
    describe("setMentions", () => {
      it("should set mentions from array", () => {
        const mentions = [
          createTestMention({ id: "m-1", is_read: false }),
          createTestMention({ id: "m-2", is_read: true }),
        ];

        act(() => {
          useMentionStore.getState().setMentions(mentions);
        });

        const state = useMentionStore.getState();
        expect(state.mentions.size).toBe(2);
        expect(state.unreadMentionIds.size).toBe(1);
        expect(state.unreadMentionIds.has("m-1")).toBe(true);
      });

      it("should overwrite existing mentions", () => {
        const initial = [createTestMention({ id: "m-1" })];
        const updated = [createTestMention({ id: "m-2" })];

        act(() => {
          useMentionStore.getState().setMentions(initial);
          useMentionStore.getState().setMentions(updated);
        });

        const state = useMentionStore.getState();
        expect(state.mentions.size).toBe(1);
        expect(state.mentions.has("m-2")).toBe(true);
        expect(state.mentions.has("m-1")).toBe(false);
      });
    });

    describe("addMention", () => {
      it("should add a single mention", () => {
        const mention = createTestMention({ id: "m-1" });

        act(() => {
          useMentionStore.getState().addMention(mention);
        });

        const state = useMentionStore.getState();
        expect(state.mentions.has("m-1")).toBe(true);
      });

      it("should add to unread set if not read", () => {
        const mention = createTestMention({ id: "m-1", is_read: false });

        act(() => {
          useMentionStore.getState().addMention(mention);
        });

        const state = useMentionStore.getState();
        expect(state.unreadMentionIds.has("m-1")).toBe(true);
      });

      it("should not add to unread set if already read", () => {
        const mention = createTestMention({ id: "m-1", is_read: true });

        act(() => {
          useMentionStore.getState().addMention(mention);
        });

        const state = useMentionStore.getState();
        expect(state.unreadMentionIds.has("m-1")).toBe(false);
      });
    });

    describe("removeMention", () => {
      it("should remove mention by ID", () => {
        const mention = createTestMention({ id: "m-1" });

        act(() => {
          useMentionStore.getState().addMention(mention);
          useMentionStore.getState().removeMention("m-1");
        });

        const state = useMentionStore.getState();
        expect(state.mentions.has("m-1")).toBe(false);
      });

      it("should remove from unread set", () => {
        const mention = createTestMention({ id: "m-1", is_read: false });

        act(() => {
          useMentionStore.getState().addMention(mention);
          useMentionStore.getState().removeMention("m-1");
        });

        const state = useMentionStore.getState();
        expect(state.unreadMentionIds.has("m-1")).toBe(false);
      });

      it("should clear selected mention if removed", () => {
        const mention = createTestMention({ id: "m-1" });

        act(() => {
          useMentionStore.getState().addMention(mention);
          useMentionStore.getState().selectMention("m-1");
          useMentionStore.getState().removeMention("m-1");
        });

        const state = useMentionStore.getState();
        expect(state.selectedMentionId).toBeNull();
      });
    });

    describe("updateMention", () => {
      it("should update mention properties", () => {
        const mention = createTestMention({ id: "m-1", is_read: false });

        act(() => {
          useMentionStore.getState().addMention(mention);
          useMentionStore.getState().updateMention("m-1", { is_read: true });
        });

        const state = useMentionStore.getState();
        expect(state.mentions.get("m-1")?.is_read).toBe(true);
      });

      it("should update unread set when marking as read", () => {
        const mention = createTestMention({ id: "m-1", is_read: false });

        act(() => {
          useMentionStore.getState().addMention(mention);
          useMentionStore.getState().updateMention("m-1", { is_read: true });
        });

        const state = useMentionStore.getState();
        expect(state.unreadMentionIds.has("m-1")).toBe(false);
      });

      it("should update unread set when marking as unread", () => {
        const mention = createTestMention({ id: "m-1", is_read: true });

        act(() => {
          useMentionStore.getState().addMention(mention);
          useMentionStore.getState().updateMention("m-1", { is_read: false });
        });

        const state = useMentionStore.getState();
        expect(state.unreadMentionIds.has("m-1")).toBe(true);
      });

      it("should not update non-existent mention", () => {
        act(() => {
          useMentionStore
            .getState()
            .updateMention("non-existent", { is_read: true });
        });

        const state = useMentionStore.getState();
        expect(state.mentions.size).toBe(0);
      });
    });
  });

  // ==========================================================================
  // Mark as Read Tests
  // ==========================================================================

  describe("Mark as Read Operations", () => {
    describe("markAsRead", () => {
      it("should mark mention as read", () => {
        const mention = createTestMention({ id: "m-1", is_read: false });

        act(() => {
          useMentionStore.getState().addMention(mention);
          useMentionStore.getState().markAsRead("m-1");
        });

        const state = useMentionStore.getState();
        const updated = state.mentions.get("m-1");
        expect(updated?.is_read).toBe(true);
        expect(updated?.read_at).not.toBeNull();
      });

      it("should remove from unread set", () => {
        const mention = createTestMention({ id: "m-1", is_read: false });

        act(() => {
          useMentionStore.getState().addMention(mention);
          useMentionStore.getState().markAsRead("m-1");
        });

        const state = useMentionStore.getState();
        expect(state.unreadMentionIds.has("m-1")).toBe(false);
      });

      it("should not update already read mention", () => {
        const existingReadAt = "2024-01-01T00:00:00Z";
        const mention = createTestMention({
          id: "m-1",
          is_read: true,
          read_at: existingReadAt,
        });

        act(() => {
          useMentionStore.getState().addMention(mention);
          useMentionStore.getState().markAsRead("m-1");
        });

        const state = useMentionStore.getState();
        expect(state.mentions.get("m-1")?.read_at).toBe(existingReadAt);
      });
    });

    describe("markMultipleAsRead", () => {
      it("should mark multiple mentions as read", () => {
        const mentions = [
          createTestMention({ id: "m-1", is_read: false }),
          createTestMention({ id: "m-2", is_read: false }),
          createTestMention({ id: "m-3", is_read: false }),
        ];

        act(() => {
          useMentionStore.getState().setMentions(mentions);
          useMentionStore.getState().markMultipleAsRead(["m-1", "m-2"]);
        });

        const state = useMentionStore.getState();
        expect(state.mentions.get("m-1")?.is_read).toBe(true);
        expect(state.mentions.get("m-2")?.is_read).toBe(true);
        expect(state.mentions.get("m-3")?.is_read).toBe(false);
      });

      it("should update unread count correctly", () => {
        const mentions = [
          createTestMention({ id: "m-1", is_read: false }),
          createTestMention({ id: "m-2", is_read: false }),
        ];

        act(() => {
          useMentionStore.getState().setMentions(mentions);
          useMentionStore.getState().markMultipleAsRead(["m-1", "m-2"]);
        });

        const state = useMentionStore.getState();
        expect(state.unreadMentionIds.size).toBe(0);
      });
    });

    describe("markAllAsRead", () => {
      it("should mark all mentions as read", () => {
        const mentions = [
          createTestMention({ id: "m-1", is_read: false }),
          createTestMention({ id: "m-2", is_read: false }),
          createTestMention({ id: "m-3", is_read: true }),
        ];

        act(() => {
          useMentionStore.getState().setMentions(mentions);
          useMentionStore.getState().markAllAsRead();
        });

        const state = useMentionStore.getState();
        expect(state.unreadMentionIds.size).toBe(0);
        expect(state.mentions.get("m-1")?.is_read).toBe(true);
        expect(state.mentions.get("m-2")?.is_read).toBe(true);
      });

      it("should set read_at for all unread mentions", () => {
        const mentions = [
          createTestMention({ id: "m-1", is_read: false }),
          createTestMention({ id: "m-2", is_read: false }),
        ];

        act(() => {
          useMentionStore.getState().setMentions(mentions);
          useMentionStore.getState().markAllAsRead();
        });

        const state = useMentionStore.getState();
        expect(state.mentions.get("m-1")?.read_at).not.toBeNull();
        expect(state.mentions.get("m-2")?.read_at).not.toBeNull();
      });
    });
  });

  // ==========================================================================
  // Loading and Error State Tests
  // ==========================================================================

  describe("Loading and Error States", () => {
    describe("setLoading", () => {
      it("should set loading state", () => {
        act(() => {
          useMentionStore.getState().setLoading(true);
        });

        expect(useMentionStore.getState().isLoading).toBe(true);
      });
    });

    describe("setError", () => {
      it("should set error message", () => {
        act(() => {
          useMentionStore.getState().setError("Something went wrong");
        });

        expect(useMentionStore.getState().error).toBe("Something went wrong");
      });

      it("should clear error with null", () => {
        act(() => {
          useMentionStore.getState().setError("Error");
          useMentionStore.getState().setError(null);
        });

        expect(useMentionStore.getState().error).toBeNull();
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
          useMentionStore.getState().openPanel();
        });

        expect(useMentionStore.getState().panel.isOpen).toBe(true);
      });
    });

    describe("closePanel", () => {
      it("should close panel", () => {
        act(() => {
          useMentionStore.getState().openPanel();
          useMentionStore.getState().closePanel();
        });

        expect(useMentionStore.getState().panel.isOpen).toBe(false);
      });
    });

    describe("togglePanel", () => {
      it("should toggle panel on", () => {
        act(() => {
          useMentionStore.getState().togglePanel();
        });

        expect(useMentionStore.getState().panel.isOpen).toBe(true);
      });

      it("should toggle panel off", () => {
        act(() => {
          useMentionStore.getState().openPanel();
          useMentionStore.getState().togglePanel();
        });

        expect(useMentionStore.getState().panel.isOpen).toBe(false);
      });
    });

    describe("setFilter", () => {
      it("should set filter to unread", () => {
        act(() => {
          useMentionStore.getState().setFilter("unread");
        });

        expect(useMentionStore.getState().panel.filter).toBe("unread");
      });

      it("should set filter to all", () => {
        act(() => {
          useMentionStore.getState().setFilter("unread");
          useMentionStore.getState().setFilter("all");
        });

        expect(useMentionStore.getState().panel.filter).toBe("all");
      });
    });
  });

  // ==========================================================================
  // Selection Tests
  // ==========================================================================

  describe("Selection", () => {
    describe("selectMention", () => {
      it("should select mention", () => {
        act(() => {
          useMentionStore.getState().selectMention("m-1");
        });

        expect(useMentionStore.getState().selectedMentionId).toBe("m-1");
      });

      it("should clear selection with null", () => {
        act(() => {
          useMentionStore.getState().selectMention("m-1");
          useMentionStore.getState().selectMention(null);
        });

        expect(useMentionStore.getState().selectedMentionId).toBeNull();
      });
    });
  });

  // ==========================================================================
  // Computed Getter Tests
  // ==========================================================================

  describe("Computed Getters", () => {
    describe("getMention", () => {
      it("should return mention by ID", () => {
        const mention = createTestMention({ id: "m-1" });

        act(() => {
          useMentionStore.getState().addMention(mention);
        });

        const result = useMentionStore.getState().getMention("m-1");
        expect(result?.id).toBe("m-1");
      });

      it("should return undefined for non-existent ID", () => {
        const result = useMentionStore.getState().getMention("non-existent");
        expect(result).toBeUndefined();
      });
    });

    describe("getMentionsByChannel", () => {
      it("should return mentions for a channel", () => {
        const mentions = [
          createTestMention({
            id: "m-1",
            message: {
              ...createTestMention().message,
              channel_id: "ch-1",
            },
          }),
          createTestMention({
            id: "m-2",
            message: {
              ...createTestMention().message,
              channel_id: "ch-1",
            },
          }),
          createTestMention({
            id: "m-3",
            message: {
              ...createTestMention().message,
              channel_id: "ch-2",
            },
          }),
        ];

        act(() => {
          useMentionStore.getState().setMentions(mentions);
        });

        const result = useMentionStore.getState().getMentionsByChannel("ch-1");
        expect(result).toHaveLength(2);
      });

      it("should sort by created_at descending", () => {
        const mentions = [
          createTestMention({
            id: "m-1",
            created_at: "2024-01-01T00:00:00Z",
            message: { ...createTestMention().message, channel_id: "ch-1" },
          }),
          createTestMention({
            id: "m-2",
            created_at: "2024-03-01T00:00:00Z",
            message: { ...createTestMention().message, channel_id: "ch-1" },
          }),
        ];

        act(() => {
          useMentionStore.getState().setMentions(mentions);
        });

        const result = useMentionStore.getState().getMentionsByChannel("ch-1");
        expect(result[0].id).toBe("m-2");
        expect(result[1].id).toBe("m-1");
      });
    });

    describe("getUnreadMentions", () => {
      it("should return only unread mentions", () => {
        const mentions = [
          createTestMention({ id: "m-1", is_read: false }),
          createTestMention({ id: "m-2", is_read: true }),
          createTestMention({ id: "m-3", is_read: false }),
        ];

        act(() => {
          useMentionStore.getState().setMentions(mentions);
        });

        const result = useMentionStore.getState().getUnreadMentions();
        expect(result).toHaveLength(2);
        expect(result.every((m) => !m.is_read)).toBe(true);
      });

      it("should sort by created_at descending", () => {
        const mentions = [
          createTestMention({
            id: "m-1",
            is_read: false,
            created_at: "2024-01-01T00:00:00Z",
          }),
          createTestMention({
            id: "m-2",
            is_read: false,
            created_at: "2024-03-01T00:00:00Z",
          }),
        ];

        act(() => {
          useMentionStore.getState().setMentions(mentions);
        });

        const result = useMentionStore.getState().getUnreadMentions();
        expect(result[0].id).toBe("m-2");
      });
    });

    describe("getAllMentions", () => {
      it("should return all mentions", () => {
        const mentions = [
          createTestMention({ id: "m-1" }),
          createTestMention({ id: "m-2" }),
        ];

        act(() => {
          useMentionStore.getState().setMentions(mentions);
        });

        const result = useMentionStore.getState().getAllMentions();
        expect(result).toHaveLength(2);
      });

      it("should sort by created_at descending", () => {
        const mentions = [
          createTestMention({
            id: "m-1",
            created_at: "2024-01-01T00:00:00Z",
          }),
          createTestMention({
            id: "m-2",
            created_at: "2024-03-01T00:00:00Z",
          }),
        ];

        act(() => {
          useMentionStore.getState().setMentions(mentions);
        });

        const result = useMentionStore.getState().getAllMentions();
        expect(result[0].id).toBe("m-2");
      });
    });

    describe("getUnreadCount", () => {
      it("should return count of unread mentions", () => {
        const mentions = [
          createTestMention({ id: "m-1", is_read: false }),
          createTestMention({ id: "m-2", is_read: true }),
          createTestMention({ id: "m-3", is_read: false }),
        ];

        act(() => {
          useMentionStore.getState().setMentions(mentions);
        });

        const result = useMentionStore.getState().getUnreadCount();
        expect(result).toBe(2);
      });

      it("should return 0 for empty mentions", () => {
        const result = useMentionStore.getState().getUnreadCount();
        expect(result).toBe(0);
      });
    });
  });

  // ==========================================================================
  // Reset Tests
  // ==========================================================================

  describe("reset", () => {
    it("should reset to initial state", () => {
      act(() => {
        useMentionStore.getState().addMention(createTestMention());
        useMentionStore.getState().openPanel();
        useMentionStore.getState().selectMention("m-1");
        useMentionStore.getState().setError("Error");
        useMentionStore.getState().reset();
      });

      const state = useMentionStore.getState();
      expect(state.mentions.size).toBe(0);
      expect(state.unreadMentionIds.size).toBe(0);
      expect(state.panel.isOpen).toBe(false);
      expect(state.selectedMentionId).toBeNull();
      expect(state.error).toBeNull();
    });
  });

  // ==========================================================================
  // Selector Tests
  // ==========================================================================

  describe("Selectors", () => {
    beforeEach(() => {
      const mentions = [
        createTestMention({ id: "m-1", is_read: false }),
        createTestMention({ id: "m-2", is_read: true }),
      ];

      act(() => {
        useMentionStore.getState().setMentions(mentions);
        useMentionStore.getState().openPanel();
        useMentionStore.getState().selectMention("m-1");
        useMentionStore.getState().setLoading(true);
        useMentionStore.getState().setError("Test error");
      });
    });

    describe("selectMentions", () => {
      it("should return all mentions as array", () => {
        const result = selectMentions(useMentionStore.getState());
        expect(result).toHaveLength(2);
      });
    });

    describe("selectUnreadMentions", () => {
      it("should return unread mentions", () => {
        const result = selectUnreadMentions(useMentionStore.getState());
        expect(result).toHaveLength(1);
        expect(result[0].id).toBe("m-1");
      });
    });

    describe("selectUnreadCount", () => {
      it("should return unread count", () => {
        const result = selectUnreadCount(useMentionStore.getState());
        expect(result).toBe(1);
      });
    });

    describe("selectMentionById", () => {
      it("should return mention by ID", () => {
        const result = selectMentionById("m-1")(useMentionStore.getState());
        expect(result?.id).toBe("m-1");
      });
    });

    describe("selectIsPanelOpen", () => {
      it("should return panel open state", () => {
        const result = selectIsPanelOpen(useMentionStore.getState());
        expect(result).toBe(true);
      });
    });

    describe("selectPanelFilter", () => {
      it("should return panel filter", () => {
        const result = selectPanelFilter(useMentionStore.getState());
        expect(result).toBe("all");
      });
    });

    describe("selectSelectedMentionId", () => {
      it("should return selected mention ID", () => {
        const result = selectSelectedMentionId(useMentionStore.getState());
        expect(result).toBe("m-1");
      });
    });

    describe("selectIsLoading", () => {
      it("should return loading state", () => {
        const result = selectIsLoading(useMentionStore.getState());
        expect(result).toBe(true);
      });
    });

    describe("selectError", () => {
      it("should return error", () => {
        const result = selectError(useMentionStore.getState());
        expect(result).toBe("Test error");
      });
    });
  });
});

// ============================================================================
// Helper Function Tests
// ============================================================================

describe("Mention Store Helpers", () => {
  describe("getMentionTypeLabel", () => {
    it("should return label for user mention", () => {
      expect(getMentionTypeLabel("user")).toBe("Direct mention");
    });

    it("should return label for channel mention", () => {
      expect(getMentionTypeLabel("channel")).toBe("@channel");
    });

    it("should return label for everyone mention", () => {
      expect(getMentionTypeLabel("everyone")).toBe("@everyone");
    });

    it("should return label for here mention", () => {
      expect(getMentionTypeLabel("here")).toBe("@here");
    });

    it("should return default for unknown type", () => {
      expect(getMentionTypeLabel("unknown" as MentionType)).toBe("Mention");
    });
  });

  describe("getMentionTypeIcon", () => {
    it("should return @ for user mention", () => {
      expect(getMentionTypeIcon("user")).toBe("@");
    });

    it("should return # for channel mention", () => {
      expect(getMentionTypeIcon("channel")).toBe("#");
    });

    it("should return @ for everyone mention", () => {
      expect(getMentionTypeIcon("everyone")).toBe("@");
    });

    it("should return @ for here mention", () => {
      expect(getMentionTypeIcon("here")).toBe("@");
    });

    it("should return @ for unknown type", () => {
      expect(getMentionTypeIcon("unknown" as MentionType)).toBe("@");
    });
  });

  describe("isGroupMention", () => {
    it("should return false for user mention", () => {
      expect(isGroupMention("user")).toBe(false);
    });

    it("should return true for channel mention", () => {
      expect(isGroupMention("channel")).toBe(true);
    });

    it("should return true for everyone mention", () => {
      expect(isGroupMention("everyone")).toBe(true);
    });

    it("should return true for here mention", () => {
      expect(isGroupMention("here")).toBe(true);
    });
  });

  describe("extractMentionPreview", () => {
    it("should return full content if under limit", () => {
      expect(extractMentionPreview("Hello world")).toBe("Hello world");
    });

    it("should truncate long content", () => {
      const long = "a".repeat(150);
      const result = extractMentionPreview(long, 100);
      expect(result.length).toBe(100);
      expect(result.endsWith("...")).toBe(true);
    });

    it("should collapse whitespace", () => {
      const input = "Hello    world\n\nhow   are   you";
      const result = extractMentionPreview(input);
      expect(result).toBe("Hello world how are you");
    });

    it("should trim content", () => {
      const input = "   Hello world   ";
      const result = extractMentionPreview(input);
      expect(result).toBe("Hello world");
    });

    it("should use default maxLength of 100", () => {
      const long = "a".repeat(150);
      const result = extractMentionPreview(long);
      expect(result.length).toBe(100);
    });
  });

  describe("normalizeMention", () => {
    it("should normalize API response", () => {
      const apiMention = {
        id: "m-1",
        message_id: "msg-1",
        user_id: "user-1",
        type: "user",
        is_read: true,
        read_at: "2024-01-01T00:00:00Z",
        created_at: "2024-01-01T00:00:00Z",
        message: {
          id: "msg-1",
          channel_id: "ch-1",
          user_id: "user-2",
          content: "Hello @user1",
          type: "text",
          is_edited: false,
          is_pinned: false,
          is_deleted: false,
          created_at: "2024-01-01T00:00:00Z",
          edited_at: null,
          user: {
            id: "user-2",
            username: "sender",
            display_name: "Sender",
            avatar_url: null,
          },
          channel: {
            id: "ch-1",
            name: "General",
            slug: "general",
            description: null,
            type: "public",
            is_private: false,
            is_archived: false,
            is_default: true,
          },
        },
      };

      const result = normalizeMention(apiMention);

      expect(result.id).toBe("m-1");
      expect(result.message.content).toBe("Hello @user1");
      expect(result.message.user.username).toBe("sender");
      expect(result.message.channel.name).toBe("General");
    });

    it("should default is_read to false if not provided", () => {
      const apiMention = {
        id: "m-1",
        message_id: "msg-1",
        user_id: "user-1",
        type: "user",
        // is_read not provided
        read_at: null,
        created_at: "2024-01-01T00:00:00Z",
        message: {
          id: "msg-1",
          channel_id: "ch-1",
          user_id: "user-2",
          content: "Hello",
          type: "text",
          is_edited: false,
          is_pinned: false,
          is_deleted: false,
          created_at: "2024-01-01T00:00:00Z",
          edited_at: null,
          user: {
            id: "user-2",
            username: "sender",
            display_name: "Sender",
            avatar_url: null,
          },
          channel: {
            id: "ch-1",
            name: "General",
            slug: "general",
            description: null,
            type: "public",
            is_private: false,
            is_archived: false,
            is_default: true,
          },
        },
      };

      const result = normalizeMention(apiMention);
      expect(result.is_read).toBe(false);
    });
  });
});

// ============================================================================
// Edge Cases
// ============================================================================

describe("Edge Cases", () => {
  beforeEach(() => {
    act(() => {
      useMentionStore.getState().reset();
    });
  });

  it("should handle empty mentions list", () => {
    const state = useMentionStore.getState();
    expect(state.getAllMentions()).toEqual([]);
    expect(state.getUnreadMentions()).toEqual([]);
    expect(state.getUnreadCount()).toBe(0);
  });

  it("should handle marking non-existent mention as read", () => {
    act(() => {
      useMentionStore.getState().markAsRead("non-existent");
    });

    // Should not throw, just do nothing
    expect(useMentionStore.getState().mentions.size).toBe(0);
  });

  it("should handle removing non-existent mention", () => {
    act(() => {
      useMentionStore.getState().removeMention("non-existent");
    });

    // Should not throw
    expect(useMentionStore.getState().mentions.size).toBe(0);
  });

  it("should handle getMentionsByChannel with no matching channel", () => {
    const mention = createTestMention({
      id: "m-1",
      message: { ...createTestMention().message, channel_id: "ch-1" },
    });

    act(() => {
      useMentionStore.getState().addMention(mention);
    });

    const result = useMentionStore.getState().getMentionsByChannel("ch-2");
    expect(result).toEqual([]);
  });

  it("should handle markMultipleAsRead with empty array", () => {
    const mention = createTestMention({ id: "m-1", is_read: false });

    act(() => {
      useMentionStore.getState().addMention(mention);
      useMentionStore.getState().markMultipleAsRead([]);
    });

    const state = useMentionStore.getState();
    expect(state.unreadMentionIds.size).toBe(1);
  });

  it("should handle markMultipleAsRead with non-existent IDs", () => {
    const mention = createTestMention({ id: "m-1", is_read: false });

    act(() => {
      useMentionStore.getState().addMention(mention);
      useMentionStore
        .getState()
        .markMultipleAsRead(["non-existent-1", "non-existent-2"]);
    });

    const state = useMentionStore.getState();
    expect(state.unreadMentionIds.size).toBe(1);
    expect(state.mentions.get("m-1")?.is_read).toBe(false);
  });
});
