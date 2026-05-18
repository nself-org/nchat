/**
 * Drafts Store Unit Tests
 *
 * Comprehensive tests for drafts store functionality including:
 * - Draft CRUD operations
 * - Auto-save state management
 * - Filtering and sorting
 * - Selectors
 */

import { act } from "@testing-library/react";
import {
  useDraftsStore,
  selectDrafts,
  selectDraftsWithContent,
  selectDraft,
  selectDraftByContext,
  selectDraftCount,
  selectHasDraft,
  selectHasDraftForContext,
  selectActiveDraft,
  selectDraftMetadata,
  selectAutoSaveState,
  selectDraftsByType,
  selectChannelDrafts,
  selectThreadDrafts,
  selectDMDrafts,
} from "../drafts-store";
import type {
  Draft,
  DraftContextType,
  DraftAttachment,
} from "@/lib/drafts/draft-types";

// ============================================================================
// Mock the draft manager module
// ============================================================================

jest.mock("@/lib/drafts", () => ({
  getDraftManager: jest.fn(() => ({
    getAllWithContent: jest.fn().mockResolvedValue([]),
    getDraftMetadata: jest.fn().mockResolvedValue([]),
    save: jest.fn().mockResolvedValue({}),
    delete: jest.fn().mockResolvedValue(true),
    clearAll: jest.fn().mockResolvedValue(undefined),
    restore: jest.fn().mockResolvedValue(null),
    scheduleAutoSave: jest.fn(),
    addEventListener: jest.fn(),
    configureAutoSave: jest.fn(),
  })),
  createContextKey: jest.fn((type: string, id: string) => `${type}:${id}`),
  hasDraftContent: jest.fn((draft?: Draft) => {
    if (!draft) return false;
    return (
      draft.content?.trim().length > 0 || (draft.attachments?.length ?? 0) > 0
    );
  }),
  getDraftPreview: jest.fn((draft: Draft) => draft.content.substring(0, 50)),
}));

// ============================================================================
// Test Helpers
// ============================================================================

const createTestDraft = (overrides: Partial<Draft> = {}): Draft => ({
  id: `draft-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
  contextKey: "channel:channel-1",
  contextType: "channel" as DraftContextType,
  contextId: "channel-1",
  content: "Test draft content",
  contentHtml: "<p>Test draft content</p>",
  replyToMessageId: null,
  attachmentIds: [],
  mentions: [],
  selectionStart: 0,
  selectionEnd: 0,
  createdAt: Date.now(),
  lastModified: Date.now(),
  version: 1,
  ...overrides,
});

const createTestAttachment = (
  overrides: Partial<DraftAttachment> = {},
): DraftAttachment => ({
  id: `attachment-${Date.now()}`,
  name: "test.txt",
  type: "text/plain",
  size: 1024,
  localUrl: "blob:http://localhost:3000/test",
  ...overrides,
});

// ============================================================================
// Setup/Teardown
// ============================================================================

describe("Drafts Store", () => {
  beforeEach(() => {
    act(() => {
      useDraftsStore.getState().reset();
    });
    jest.clearAllMocks();
  });

  // ==========================================================================
  // Initial State Tests
  // ==========================================================================

  describe("Initial State", () => {
    it("should have empty drafts map", () => {
      const state = useDraftsStore.getState();
      expect(state.drafts.size).toBe(0);
    });

    it("should have empty metadata array", () => {
      const state = useDraftsStore.getState();
      expect(state.draftMetadata).toEqual([]);
    });

    it("should have null active draft key", () => {
      const state = useDraftsStore.getState();
      expect(state.activeDraftKey).toBeNull();
    });

    it("should have idle auto-save status", () => {
      const state = useDraftsStore.getState();
      expect(state.autoSaveStatus).toBe("idle");
    });

    it("should not be initialized", () => {
      const state = useDraftsStore.getState();
      expect(state.isInitialized).toBe(false);
    });

    it("should have auto-save enabled by default", () => {
      const state = useDraftsStore.getState();
      expect(state.autoSaveEnabled).toBe(true);
    });

    it("should have default auto-save debounce", () => {
      const state = useDraftsStore.getState();
      expect(state.autoSaveDebounceMs).toBe(500);
    });
  });

  // ==========================================================================
  // Draft CRUD Tests (Synchronous Operations)
  // ==========================================================================

  describe("Draft Operations", () => {
    describe("getDraft", () => {
      it("should return undefined for non-existent draft", () => {
        const result = useDraftsStore.getState().getDraft("non-existent");
        expect(result).toBeUndefined();
      });

      it("should return draft when it exists", () => {
        const draft = createTestDraft({ contextKey: "channel:test" });

        act(() => {
          useDraftsStore.setState((state) => {
            state.drafts.set("channel:test", draft);
          });
        });

        const result = useDraftsStore.getState().getDraft("channel:test");
        expect(result).toBeDefined();
        expect(result?.contextKey).toBe("channel:test");
      });
    });

    describe("getDraftByContext", () => {
      it("should return draft by context type and id", () => {
        const draft = createTestDraft({
          contextKey: "channel:ch-123",
          contextType: "channel",
          contextId: "ch-123",
        });

        act(() => {
          useDraftsStore.setState((state) => {
            state.drafts.set("channel:ch-123", draft);
          });
        });

        const result = useDraftsStore
          .getState()
          .getDraftByContext("channel", "ch-123");
        expect(result).toBeDefined();
        expect(result?.contextId).toBe("ch-123");
      });
    });
  });

  // ==========================================================================
  // Active Draft Tests
  // ==========================================================================

  describe("Active Draft", () => {
    describe("setActiveDraftKey", () => {
      it("should set active draft key", () => {
        act(() => {
          useDraftsStore.getState().setActiveDraftKey("channel:test");
        });

        expect(useDraftsStore.getState().activeDraftKey).toBe("channel:test");
      });

      it("should clear active draft key with null", () => {
        act(() => {
          useDraftsStore.getState().setActiveDraftKey("channel:test");
          useDraftsStore.getState().setActiveDraftKey(null);
        });

        expect(useDraftsStore.getState().activeDraftKey).toBeNull();
      });
    });
  });

  // ==========================================================================
  // Query Tests
  // ==========================================================================

  describe("Query Operations", () => {
    describe("getDraftCount", () => {
      it("should return 0 for empty drafts", () => {
        const count = useDraftsStore.getState().getDraftCount();
        expect(count).toBe(0);
      });

      it("should count only drafts with content", () => {
        const draftWithContent = createTestDraft({
          contextKey: "ch:1",
          content: "Hello",
        });
        const emptyDraft = createTestDraft({ contextKey: "ch:2", content: "" });

        act(() => {
          useDraftsStore.setState((state) => {
            state.drafts.set("ch:1", draftWithContent);
            state.drafts.set("ch:2", emptyDraft);
          });
        });

        // Due to mock, hasDraftContent checks content.trim().length
        const count = useDraftsStore.getState().getDraftCount();
        expect(count).toBe(1);
      });
    });

    describe("hasDraft", () => {
      it("should return false for non-existent draft", () => {
        const result = useDraftsStore.getState().hasDraft("non-existent");
        expect(result).toBe(false);
      });

      it("should return true for draft with content", () => {
        const draft = createTestDraft({
          contextKey: "channel:test",
          content: "Hello",
        });

        act(() => {
          useDraftsStore.setState((state) => {
            state.drafts.set("channel:test", draft);
          });
        });

        const result = useDraftsStore.getState().hasDraft("channel:test");
        expect(result).toBe(true);
      });
    });

    describe("hasDraftForContext", () => {
      it("should check by context type and id", () => {
        const draft = createTestDraft({
          contextKey: "channel:ch-123",
          content: "Hello",
        });

        act(() => {
          useDraftsStore.setState((state) => {
            state.drafts.set("channel:ch-123", draft);
          });
        });

        const result = useDraftsStore
          .getState()
          .hasDraftForContext("channel", "ch-123");
        expect(result).toBe(true);
      });
    });

    describe("getFilteredDrafts", () => {
      beforeEach(() => {
        const drafts = [
          createTestDraft({
            contextKey: "channel:ch-1",
            contextType: "channel",
            content: "Channel draft",
            lastModified: 1000,
          }),
          createTestDraft({
            contextKey: "thread:th-1",
            contextType: "thread",
            content: "Thread draft",
            replyToMessageId: "msg-1",
            lastModified: 2000,
          }),
          createTestDraft({
            contextKey: "dm:dm-1",
            contextType: "dm",
            content: "DM draft",
            attachments: [createTestAttachment()],
            lastModified: 3000,
          }),
          createTestDraft({
            contextKey: "channel:ch-2",
            contextType: "channel",
            content: "",
            lastModified: 4000,
          }),
        ];

        act(() => {
          useDraftsStore.setState((state) => {
            drafts.forEach((d) => state.drafts.set(d.contextKey, d));
          });
        });
      });

      it("should filter by context type", () => {
        const result = useDraftsStore.getState().getFilteredDrafts({
          contextType: "channel",
        });
        expect(result.length).toBe(1); // Only one has content
        expect(result[0].contextType).toBe("channel");
      });

      it("should filter by hasAttachments", () => {
        const result = useDraftsStore.getState().getFilteredDrafts({
          hasAttachments: true,
        });
        expect(result.length).toBe(1);
        expect(result[0].contextKey).toBe("dm:dm-1");
      });

      it("should filter by isReply", () => {
        const result = useDraftsStore.getState().getFilteredDrafts({
          isReply: true,
        });
        expect(result.length).toBe(1);
        expect(result[0].contextKey).toBe("thread:th-1");
      });

      it("should filter by modifiedAfter", () => {
        const result = useDraftsStore.getState().getFilteredDrafts({
          modifiedAfter: 2500,
        });
        expect(result.length).toBe(1);
        expect(result[0].lastModified).toBeGreaterThan(2500);
      });

      it("should filter by modifiedBefore", () => {
        const result = useDraftsStore.getState().getFilteredDrafts({
          modifiedBefore: 1500,
        });
        expect(result.length).toBe(1);
        expect(result[0].lastModified).toBeLessThan(1500);
      });

      it("should filter by search term", () => {
        const result = useDraftsStore.getState().getFilteredDrafts({
          searchTerm: "thread",
        });
        expect(result.length).toBe(1);
        expect(result[0].content.toLowerCase()).toContain("thread");
      });
    });

    describe("getSortedDrafts", () => {
      beforeEach(() => {
        const drafts = [
          createTestDraft({
            contextKey: "channel:ch-1",
            content: "Draft 1",
            lastModified: 2000,
            createdAt: 1000,
          }),
          createTestDraft({
            contextKey: "thread:th-1",
            content: "Draft 2",
            lastModified: 1000,
            createdAt: 2000,
          }),
          createTestDraft({
            contextKey: "dm:dm-1",
            content: "Draft 3",
            lastModified: 3000,
            createdAt: 3000,
          }),
        ];

        act(() => {
          useDraftsStore.setState((state) => {
            drafts.forEach((d) => state.drafts.set(d.contextKey, d));
          });
        });
      });

      it("should sort by lastModified ascending", () => {
        const result = useDraftsStore.getState().getSortedDrafts({
          field: "lastModified",
          direction: "asc",
        });
        expect(result[0].lastModified).toBe(1000);
        expect(result[2].lastModified).toBe(3000);
      });

      it("should sort by lastModified descending", () => {
        const result = useDraftsStore.getState().getSortedDrafts({
          field: "lastModified",
          direction: "desc",
        });
        expect(result[0].lastModified).toBe(3000);
        expect(result[2].lastModified).toBe(1000);
      });

      it("should sort by createdAt ascending", () => {
        const result = useDraftsStore.getState().getSortedDrafts({
          field: "createdAt",
          direction: "asc",
        });
        expect(result[0].createdAt).toBe(1000);
        expect(result[2].createdAt).toBe(3000);
      });

      it("should sort by contextName", () => {
        const result = useDraftsStore.getState().getSortedDrafts({
          field: "contextName",
          direction: "asc",
        });
        // Sorted alphabetically by contextKey
        expect(result[0].contextKey).toBe("channel:ch-1");
      });
    });
  });

  // ==========================================================================
  // Auto-save Tests
  // ==========================================================================

  describe("Auto-save", () => {
    describe("setAutoSaveEnabled", () => {
      it("should enable auto-save", () => {
        act(() => {
          useDraftsStore.getState().setAutoSaveEnabled(true);
        });

        expect(useDraftsStore.getState().autoSaveEnabled).toBe(true);
      });

      it("should disable auto-save", () => {
        act(() => {
          useDraftsStore.getState().setAutoSaveEnabled(false);
        });

        expect(useDraftsStore.getState().autoSaveEnabled).toBe(false);
      });
    });

    describe("setAutoSaveDebounce", () => {
      it("should set debounce time", () => {
        act(() => {
          useDraftsStore.getState().setAutoSaveDebounce(1000);
        });

        expect(useDraftsStore.getState().autoSaveDebounceMs).toBe(1000);
      });
    });

    describe("updateAutoSaveStatus", () => {
      it("should update to saving status", () => {
        act(() => {
          useDraftsStore.getState().updateAutoSaveStatus("saving");
        });

        const state = useDraftsStore.getState();
        expect(state.autoSaveStatus).toBe("saving");
      });

      it("should update to saved status with timestamp", () => {
        const beforeTime = Date.now();

        act(() => {
          useDraftsStore.getState().updateAutoSaveStatus("saved");
        });

        const state = useDraftsStore.getState();
        expect(state.autoSaveStatus).toBe("saved");
        expect(state.lastAutoSaveTime).toBeGreaterThanOrEqual(beforeTime);
      });

      it("should update to error status with message", () => {
        act(() => {
          useDraftsStore
            .getState()
            .updateAutoSaveStatus("error", "Save failed");
        });

        const state = useDraftsStore.getState();
        expect(state.autoSaveStatus).toBe("error");
        expect(state.autoSaveError).toBe("Save failed");
      });

      it("should clear error on non-error status", () => {
        act(() => {
          useDraftsStore
            .getState()
            .updateAutoSaveStatus("error", "Previous error");
          useDraftsStore.getState().updateAutoSaveStatus("idle");
        });

        const state = useDraftsStore.getState();
        expect(state.autoSaveStatus).toBe("idle");
        expect(state.autoSaveError).toBeNull();
      });
    });
  });

  // ==========================================================================
  // Reset Tests
  // ==========================================================================

  describe("reset", () => {
    it("should reset to initial state", () => {
      act(() => {
        useDraftsStore.setState((state) => {
          state.drafts.set("test", createTestDraft());
          state.activeDraftKey = "test";
          state.autoSaveStatus = "saved";
          state.isInitialized = true;
        });
        useDraftsStore.getState().reset();
      });

      const state = useDraftsStore.getState();
      expect(state.drafts.size).toBe(0);
      expect(state.activeDraftKey).toBeNull();
      expect(state.autoSaveStatus).toBe("idle");
      expect(state.isInitialized).toBe(false);
    });
  });

  // ==========================================================================
  // Selector Tests
  // ==========================================================================

  describe("Selectors", () => {
    beforeEach(() => {
      const drafts = [
        createTestDraft({
          contextKey: "channel:ch-1",
          contextType: "channel",
          content: "Channel 1",
        }),
        createTestDraft({
          contextKey: "channel:ch-2",
          contextType: "channel",
          content: "Channel 2",
        }),
        createTestDraft({
          contextKey: "thread:th-1",
          contextType: "thread",
          content: "Thread 1",
        }),
        createTestDraft({
          contextKey: "dm:dm-1",
          contextType: "dm",
          content: "DM 1",
        }),
        createTestDraft({
          contextKey: "channel:ch-empty",
          contextType: "channel",
          content: "",
        }),
      ];

      act(() => {
        useDraftsStore.setState((state) => {
          drafts.forEach((d) => state.drafts.set(d.contextKey, d));
          state.activeDraftKey = "channel:ch-1";
          state.autoSaveStatus = "saved";
          state.lastAutoSaveTime = 12345;
          state.autoSaveError = null;
          state.autoSaveEnabled = true;
        });
      });
    });

    describe("selectDrafts", () => {
      it("should return all drafts as array", () => {
        const result = selectDrafts(useDraftsStore.getState());
        expect(result).toHaveLength(5);
      });
    });

    describe("selectDraftsWithContent", () => {
      it("should return only drafts with content", () => {
        const result = selectDraftsWithContent(useDraftsStore.getState());
        expect(result).toHaveLength(4);
        expect(result.every((d) => d.content.length > 0)).toBe(true);
      });
    });

    describe("selectDraft", () => {
      it("should select draft by context key", () => {
        const result = selectDraft("channel:ch-1")(useDraftsStore.getState());
        expect(result?.content).toBe("Channel 1");
      });

      it("should return undefined for non-existent key", () => {
        const result = selectDraft("non-existent")(useDraftsStore.getState());
        expect(result).toBeUndefined();
      });
    });

    describe("selectDraftByContext", () => {
      it("should select draft by type and id", () => {
        const result = selectDraftByContext(
          "channel",
          "ch-1",
        )(useDraftsStore.getState());
        expect(result?.content).toBe("Channel 1");
      });
    });

    describe("selectDraftCount", () => {
      it("should return count of drafts with content", () => {
        const result = selectDraftCount(useDraftsStore.getState());
        expect(result).toBe(4);
      });
    });

    describe("selectHasDraft", () => {
      it("should return true for existing draft with content", () => {
        const result = selectHasDraft("channel:ch-1")(
          useDraftsStore.getState(),
        );
        expect(result).toBe(true);
      });

      it("should return false for empty draft", () => {
        const result = selectHasDraft("channel:ch-empty")(
          useDraftsStore.getState(),
        );
        expect(result).toBe(false);
      });
    });

    describe("selectHasDraftForContext", () => {
      it("should check by type and id", () => {
        const result = selectHasDraftForContext(
          "channel",
          "ch-1",
        )(useDraftsStore.getState());
        expect(result).toBe(true);
      });
    });

    describe("selectActiveDraft", () => {
      it("should return active draft", () => {
        const result = selectActiveDraft(useDraftsStore.getState());
        expect(result?.content).toBe("Channel 1");
      });

      it("should return undefined when no active draft", () => {
        act(() => {
          useDraftsStore.getState().setActiveDraftKey(null);
        });

        const result = selectActiveDraft(useDraftsStore.getState());
        expect(result).toBeUndefined();
      });
    });

    describe("selectDraftMetadata", () => {
      it("should return metadata array", () => {
        act(() => {
          useDraftsStore.setState((state) => {
            state.draftMetadata = [
              { contextKey: "test", lastModified: 123 },
            ] as any;
          });
        });

        const result = selectDraftMetadata(useDraftsStore.getState());
        expect(result).toHaveLength(1);
      });
    });

    describe("selectAutoSaveState", () => {
      it("should return auto-save state object", () => {
        const result = selectAutoSaveState(useDraftsStore.getState());
        expect(result.status).toBe("saved");
        expect(result.lastSaveTime).toBe(12345);
        expect(result.error).toBeNull();
        expect(result.enabled).toBe(true);
      });
    });

    describe("selectDraftsByType", () => {
      it("should select channel drafts", () => {
        const result = selectDraftsByType("channel")(useDraftsStore.getState());
        expect(result).toHaveLength(2); // Only 2 channel drafts with content
        expect(result.every((d) => d.contextType === "channel")).toBe(true);
      });

      it("should select thread drafts", () => {
        const result = selectDraftsByType("thread")(useDraftsStore.getState());
        expect(result).toHaveLength(1);
        expect(result[0].contextType).toBe("thread");
      });

      it("should select DM drafts", () => {
        const result = selectDraftsByType("dm")(useDraftsStore.getState());
        expect(result).toHaveLength(1);
        expect(result[0].contextType).toBe("dm");
      });
    });

    describe("selectChannelDrafts", () => {
      it("should return channel drafts with content", () => {
        const result = selectChannelDrafts(useDraftsStore.getState());
        expect(result).toHaveLength(2);
      });
    });

    describe("selectThreadDrafts", () => {
      it("should return thread drafts with content", () => {
        const result = selectThreadDrafts(useDraftsStore.getState());
        expect(result).toHaveLength(1);
      });
    });

    describe("selectDMDrafts", () => {
      it("should return DM drafts with content", () => {
        const result = selectDMDrafts(useDraftsStore.getState());
        expect(result).toHaveLength(1);
      });
    });
  });

  // ==========================================================================
  // Edge Cases
  // ==========================================================================

  describe("Edge Cases", () => {
    it("should handle empty search term", () => {
      act(() => {
        useDraftsStore.setState((state) => {
          state.drafts.set("test", createTestDraft({ content: "Test" }));
        });
      });

      const result = useDraftsStore.getState().getFilteredDrafts({
        searchTerm: "",
      });
      expect(result).toHaveLength(1);
    });

    it("should handle special characters in search", () => {
      act(() => {
        useDraftsStore.setState((state) => {
          state.drafts.set(
            "test",
            createTestDraft({ content: "Hello @user!" }),
          );
        });
      });

      const result = useDraftsStore.getState().getFilteredDrafts({
        searchTerm: "@user",
      });
      expect(result).toHaveLength(1);
    });

    it("should handle case insensitive search", () => {
      act(() => {
        useDraftsStore.setState((state) => {
          state.drafts.set("test", createTestDraft({ content: "HELLO WORLD" }));
        });
      });

      const result = useDraftsStore.getState().getFilteredDrafts({
        searchTerm: "hello",
      });
      expect(result).toHaveLength(1);
    });

    it("should handle drafts with both attachments and content", () => {
      act(() => {
        useDraftsStore.setState((state) => {
          state.drafts.set(
            "test",
            createTestDraft({
              content: "With attachment",
              attachments: [createTestAttachment()],
            }),
          );
        });
      });

      // Should match hasAttachments filter
      const withAttachments = useDraftsStore.getState().getFilteredDrafts({
        hasAttachments: true,
      });
      expect(withAttachments).toHaveLength(1);

      // Should also be included in general count
      const count = useDraftsStore.getState().getDraftCount();
      expect(count).toBe(1);
    });

    it("should handle multiple filters combined", () => {
      const now = Date.now();
      act(() => {
        useDraftsStore.setState((state) => {
          state.drafts.set(
            "ch:1",
            createTestDraft({
              contextKey: "channel:1",
              contextType: "channel",
              content: "Channel with reply",
              replyToMessageId: "msg-1",
              lastModified: now,
            }),
          );
          state.drafts.set(
            "ch:2",
            createTestDraft({
              contextKey: "channel:2",
              contextType: "channel",
              content: "Channel without reply",
              replyToMessageId: null,
              lastModified: now - 10000,
            }),
          );
        });
      });

      const result = useDraftsStore.getState().getFilteredDrafts({
        contextType: "channel",
        isReply: true,
        modifiedAfter: now - 5000,
      });
      expect(result).toHaveLength(1);
      expect(result[0].replyToMessageId).toBe("msg-1");
    });
  });
});
