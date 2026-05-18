/**
 * Message Forwarding Module Tests
 *
 * Comprehensive tests for message forwarding functionality.
 */

import { act } from "@testing-library/react";
import {
  // Types
  type ForwardingMode,
  type ForwardDestination,
  type ForwardDestinationType,
  type ForwardableMessage,
  type ForwardRequest,
  type ForwardResult,
  type ForwardOperationResult,
  type ForwardModalState,
  // Constants
  MAX_FORWARD_MESSAGES,
  MAX_FORWARD_DESTINATIONS,
  MAX_FORWARD_COMMENT_LENGTH,
  MAX_RECENT_DESTINATIONS,
  MAX_HISTORY_ENTRIES,
  // Utilities
  generateForwardRequestId,
  createForwardRequest,
  formatForwardedContent,
  validateForwardRequest,
  canForwardMessage,
  canForwardToDestination,
  getDestinationDisplayText,
  getForwardModeDisplayText,
  getForwardModeDescription,
  sortDestinations,
  filterDestinations,
  isDestinationSelected,
  getForwardSummary,
  // Store
  useForwardingStore,
  // Selectors
  selectIsForwardModalOpen,
  selectForwardMessages,
  selectSelectedDestinations,
  selectForwardingMode,
  selectForwardComment,
  selectForwardSearchQuery,
  selectRecentDestinations,
  selectIsForwarding,
  selectForwardStep,
  selectForwardHistory,
  selectCanForward,
  selectForwardValidation,
} from "../message-forwarding";

// ============================================================================
// Test Data
// ============================================================================

const createTestMessage = (
  overrides?: Partial<ForwardableMessage>,
): ForwardableMessage => ({
  id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
  content: "Test message content",
  author: {
    id: "user1",
    username: "testuser",
    displayName: "Test User",
    avatarUrl: "https://example.com/avatar.png",
  },
  channelId: "ch1",
  channelName: "general",
  createdAt: Date.now(),
  ...overrides,
});

const createTestDestination = (
  overrides?: Partial<ForwardDestination>,
): ForwardDestination => ({
  type: "channel",
  id: `dest_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
  name: "test-channel",
  ...overrides,
});

// ============================================================================
// Test Setup
// ============================================================================

describe("Message Forwarding Module", () => {
  beforeEach(() => {
    act(() => {
      useForwardingStore.getState().reset();
    });
  });

  // ==========================================================================
  // Utility Functions Tests
  // ==========================================================================

  describe("generateForwardRequestId", () => {
    it("should generate unique IDs", () => {
      const id1 = generateForwardRequestId();
      const id2 = generateForwardRequestId();
      expect(id1).not.toBe(id2);
    });

    it('should start with "fwd_"', () => {
      const id = generateForwardRequestId();
      expect(id.startsWith("fwd_")).toBe(true);
    });

    it("should contain timestamp", () => {
      const before = Date.now();
      const id = generateForwardRequestId();
      const after = Date.now();
      const parts = id.split("_");
      const timestamp = parseInt(parts[1], 10);
      expect(timestamp).toBeGreaterThanOrEqual(before);
      expect(timestamp).toBeLessThanOrEqual(after);
    });
  });

  describe("createForwardRequest", () => {
    it("should create a forward request", () => {
      const messages = [createTestMessage()];
      const destinations = [createTestDestination()];
      const request = createForwardRequest(
        messages,
        destinations,
        "forward",
        "user1",
        "Comment",
      );

      expect(request.id).toBeDefined();
      expect(request.messages).toEqual(messages);
      expect(request.destinations).toEqual(destinations);
      expect(request.mode).toBe("forward");
      expect(request.forwardedBy).toBe("user1");
      expect(request.comment).toBe("Comment");
      expect(request.createdAt).toBeDefined();
    });

    it("should work without comment", () => {
      const messages = [createTestMessage()];
      const destinations = [createTestDestination()];
      const request = createForwardRequest(
        messages,
        destinations,
        "copy",
        "user1",
      );

      expect(request.comment).toBeUndefined();
    });
  });

  describe("formatForwardedContent", () => {
    const message = createTestMessage({ content: "Hello world" });

    it("should format for forward mode", () => {
      const result = formatForwardedContent(message, "forward");
      expect(result.content).toBe("Hello world");
      expect(result.attribution).toContain(message.author.displayName);
    });

    it("should format for copy mode", () => {
      const result = formatForwardedContent(message, "copy");
      expect(result.content).toBe("Hello world");
      expect(result.attribution).toBeUndefined();
    });

    it("should format for quote mode", () => {
      const result = formatForwardedContent(message, "quote");
      expect(result.content).toContain("> Hello world");
      expect(result.content).toContain(message.author.displayName);
    });

    it("should handle multiline content in quote mode", () => {
      const multilineMessage = createTestMessage({
        content: "Line 1\nLine 2\nLine 3",
      });
      const result = formatForwardedContent(multilineMessage, "quote");
      expect(result.content).toContain("> Line 1");
      expect(result.content).toContain("> Line 2");
      expect(result.content).toContain("> Line 3");
    });
  });

  describe("validateForwardRequest", () => {
    it("should return valid for correct request", () => {
      const messages = [createTestMessage()];
      const destinations = [createTestDestination()];
      const result = validateForwardRequest(messages, destinations);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("should return invalid for empty messages", () => {
      const result = validateForwardRequest([], [createTestDestination()]);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("At least one message is required");
    });

    it("should return invalid for empty destinations", () => {
      const result = validateForwardRequest([createTestMessage()], []);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("At least one destination is required");
    });

    it("should return invalid for too many messages", () => {
      const messages = Array.from({ length: MAX_FORWARD_MESSAGES + 1 }, () =>
        createTestMessage(),
      );
      const result = validateForwardRequest(messages, [
        createTestDestination(),
      ]);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes("more than"))).toBe(true);
    });

    it("should return invalid for too many destinations", () => {
      const destinations = Array.from(
        { length: MAX_FORWARD_DESTINATIONS + 1 },
        () => createTestDestination(),
      );
      const result = validateForwardRequest(
        [createTestMessage()],
        destinations,
      );
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes("more than"))).toBe(true);
    });

    it("should return invalid for comment exceeding limit", () => {
      const longComment = "a".repeat(MAX_FORWARD_COMMENT_LENGTH + 1);
      const result = validateForwardRequest(
        [createTestMessage()],
        [createTestDestination()],
        longComment,
      );
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes("Comment exceeds"))).toBe(
        true,
      );
    });

    it("should accumulate multiple errors", () => {
      const result = validateForwardRequest([], []);
      expect(result.errors.length).toBeGreaterThan(1);
    });
  });

  describe("canForwardMessage", () => {
    it("should return true for regular message", () => {
      expect(canForwardMessage(createTestMessage())).toBe(true);
    });

    it("should return true for already forwarded message", () => {
      expect(canForwardMessage(createTestMessage({ isForwarded: true }))).toBe(
        true,
      );
    });
  });

  describe("canForwardToDestination", () => {
    it("should return true for channel destination", () => {
      expect(
        canForwardToDestination(
          createTestDestination({ type: "channel" }),
          "user1",
        ),
      ).toBe(true);
    });

    it("should return true for user destination", () => {
      expect(
        canForwardToDestination(
          createTestDestination({ type: "user" }),
          "user1",
        ),
      ).toBe(true);
    });
  });

  describe("getDestinationDisplayText", () => {
    it("should format channel destination", () => {
      const dest = createTestDestination({ type: "channel", name: "general" });
      expect(getDestinationDisplayText(dest)).toBe("#general");
    });

    it("should format user destination", () => {
      const dest = createTestDestination({ type: "user", name: "johndoe" });
      expect(getDestinationDisplayText(dest)).toBe("@johndoe");
    });

    it("should format thread destination", () => {
      const dest = createTestDestination({
        type: "thread",
        name: "Discussion",
      });
      expect(getDestinationDisplayText(dest)).toBe("Thread: Discussion");
    });
  });

  describe("getForwardModeDisplayText", () => {
    it("should return text for forward mode", () => {
      expect(getForwardModeDisplayText("forward")).toBe(
        "Forward with attribution",
      );
    });

    it("should return text for copy mode", () => {
      expect(getForwardModeDisplayText("copy")).toBe(
        "Copy without attribution",
      );
    });

    it("should return text for quote mode", () => {
      expect(getForwardModeDisplayText("quote")).toBe("Quote message");
    });
  });

  describe("getForwardModeDescription", () => {
    it("should return description for forward mode", () => {
      expect(getForwardModeDescription("forward")).toContain("originally sent");
    });

    it("should return description for copy mode", () => {
      expect(getForwardModeDescription("copy")).toContain("you wrote");
    });

    it("should return description for quote mode", () => {
      expect(getForwardModeDescription("quote")).toContain("quoted");
    });
  });

  describe("sortDestinations", () => {
    it("should sort channels first", () => {
      const destinations: ForwardDestination[] = [
        createTestDestination({ type: "user", name: "user1" }),
        createTestDestination({ type: "channel", name: "channel1" }),
        createTestDestination({ type: "thread", name: "thread1" }),
      ];
      const sorted = sortDestinations(destinations);
      expect(sorted[0].type).toBe("channel");
      expect(sorted[1].type).toBe("user");
      expect(sorted[2].type).toBe("thread");
    });

    it("should sort by name within same type", () => {
      const destinations: ForwardDestination[] = [
        createTestDestination({ type: "channel", name: "zebra" }),
        createTestDestination({ type: "channel", name: "alpha" }),
        createTestDestination({ type: "channel", name: "beta" }),
      ];
      const sorted = sortDestinations(destinations);
      expect(sorted[0].name).toBe("alpha");
      expect(sorted[1].name).toBe("beta");
      expect(sorted[2].name).toBe("zebra");
    });

    it("should not mutate original array", () => {
      const destinations: ForwardDestination[] = [
        createTestDestination({ type: "user", name: "user1" }),
        createTestDestination({ type: "channel", name: "channel1" }),
      ];
      const original = [...destinations];
      sortDestinations(destinations);
      expect(destinations).toEqual(original);
    });
  });

  describe("filterDestinations", () => {
    const destinations: ForwardDestination[] = [
      createTestDestination({ type: "channel", name: "general" }),
      createTestDestination({ type: "channel", name: "random" }),
      createTestDestination({ type: "user", name: "johndoe" }),
    ];

    it("should return all destinations for empty query", () => {
      expect(filterDestinations(destinations, "")).toHaveLength(3);
      expect(filterDestinations(destinations, "   ")).toHaveLength(3);
    });

    it("should filter by name", () => {
      const filtered = filterDestinations(destinations, "general");
      expect(filtered).toHaveLength(1);
      expect(filtered[0].name).toBe("general");
    });

    it("should be case insensitive", () => {
      const filtered = filterDestinations(destinations, "GENERAL");
      expect(filtered).toHaveLength(1);
    });

    it("should match partial names", () => {
      const filtered = filterDestinations(destinations, "gen");
      expect(filtered).toHaveLength(1);
      expect(filtered[0].name).toBe("general");
    });
  });

  describe("isDestinationSelected", () => {
    it("should return true for selected destination", () => {
      const dest = createTestDestination({ type: "channel", id: "ch1" });
      const selected = [dest];
      expect(isDestinationSelected(dest, selected)).toBe(true);
    });

    it("should return false for unselected destination", () => {
      const dest = createTestDestination({ type: "channel", id: "ch1" });
      const other = createTestDestination({ type: "channel", id: "ch2" });
      expect(isDestinationSelected(dest, [other])).toBe(false);
    });

    it("should check both type and id", () => {
      const dest = createTestDestination({ type: "channel", id: "id1" });
      const sameIdDifferentType = createTestDestination({
        type: "user",
        id: "id1",
      });
      expect(isDestinationSelected(dest, [sameIdDifferentType])).toBe(false);
    });
  });

  describe("getForwardSummary", () => {
    it("should use singular for single message", () => {
      expect(getForwardSummary(1, 2, "forward")).toContain("1 message");
    });

    it("should use plural for multiple messages", () => {
      expect(getForwardSummary(5, 2, "forward")).toContain("5 messages");
    });

    it("should use singular for single destination", () => {
      expect(getForwardSummary(2, 1, "forward")).toContain("1 destination");
    });

    it("should use plural for multiple destinations", () => {
      expect(getForwardSummary(2, 3, "forward")).toContain("3 destinations");
    });

    it("should use correct verb for forward mode", () => {
      expect(getForwardSummary(1, 1, "forward")).toContain("forwarding");
    });

    it("should use correct verb for copy mode", () => {
      expect(getForwardSummary(1, 1, "copy")).toContain("copying");
    });

    it("should use correct verb for quote mode", () => {
      expect(getForwardSummary(1, 1, "quote")).toContain("quoting");
    });
  });

  // ==========================================================================
  // Store Tests
  // ==========================================================================

  describe("Store: Modal Operations", () => {
    describe("openForwardModal", () => {
      it("should open modal with messages", () => {
        const messages = [createTestMessage()];
        act(() => {
          useForwardingStore.getState().openForwardModal(messages);
        });

        const state = useForwardingStore.getState();
        expect(state.modal.isOpen).toBe(true);
        expect(state.modal.messages).toEqual(messages);
      });

      it("should reset other modal state", () => {
        act(() => {
          useForwardingStore.getState().setComment("Previous comment");
          useForwardingStore.getState().openForwardModal([createTestMessage()]);
        });

        const state = useForwardingStore.getState();
        expect(state.modal.comment).toBe("");
        expect(state.modal.selectedDestinations).toEqual([]);
        expect(state.modal.mode).toBe("forward");
      });
    });

    describe("closeForwardModal", () => {
      it("should close modal", () => {
        act(() => {
          useForwardingStore.getState().openForwardModal([createTestMessage()]);
          useForwardingStore.getState().closeForwardModal();
        });

        expect(useForwardingStore.getState().modal.isOpen).toBe(false);
      });

      it("should preserve recent destinations", () => {
        act(() => {
          useForwardingStore
            .getState()
            .addRecentDestination(createTestDestination());
          useForwardingStore.getState().openForwardModal([createTestMessage()]);
          useForwardingStore.getState().closeForwardModal();
        });

        expect(
          useForwardingStore.getState().modal.recentDestinations.length,
        ).toBe(1);
      });
    });

    describe("setForwardingMode", () => {
      it("should set forwarding mode", () => {
        act(() => {
          useForwardingStore.getState().setForwardingMode("copy");
        });

        expect(useForwardingStore.getState().modal.mode).toBe("copy");
      });
    });

    describe("setComment", () => {
      it("should set comment", () => {
        act(() => {
          useForwardingStore.getState().setComment("Test comment");
        });

        expect(useForwardingStore.getState().modal.comment).toBe(
          "Test comment",
        );
      });

      it("should truncate long comments", () => {
        const longComment = "a".repeat(MAX_FORWARD_COMMENT_LENGTH + 100);
        act(() => {
          useForwardingStore.getState().setComment(longComment);
        });

        expect(useForwardingStore.getState().modal.comment.length).toBe(
          MAX_FORWARD_COMMENT_LENGTH,
        );
      });
    });

    describe("setSearchQuery", () => {
      it("should set search query", () => {
        act(() => {
          useForwardingStore.getState().setSearchQuery("test");
        });

        expect(useForwardingStore.getState().modal.searchQuery).toBe("test");
      });
    });

    describe("setStep", () => {
      it("should set step", () => {
        act(() => {
          useForwardingStore.getState().setStep("confirm");
        });

        expect(useForwardingStore.getState().modal.step).toBe("confirm");
      });
    });
  });

  describe("Store: Destination Selection", () => {
    describe("addDestination", () => {
      it("should add destination", () => {
        const dest = createTestDestination();
        act(() => {
          useForwardingStore.getState().addDestination(dest);
        });

        expect(
          useForwardingStore.getState().modal.selectedDestinations,
        ).toContainEqual(dest);
      });

      it("should not add duplicate", () => {
        const dest = createTestDestination();
        act(() => {
          useForwardingStore.getState().addDestination(dest);
          useForwardingStore.getState().addDestination(dest);
        });

        expect(
          useForwardingStore.getState().modal.selectedDestinations.length,
        ).toBe(1);
      });

      it("should not exceed max destinations", () => {
        act(() => {
          for (let i = 0; i < MAX_FORWARD_DESTINATIONS + 5; i++) {
            useForwardingStore
              .getState()
              .addDestination(createTestDestination({ id: `dest_${i}` }));
          }
        });

        expect(
          useForwardingStore.getState().modal.selectedDestinations.length,
        ).toBe(MAX_FORWARD_DESTINATIONS);
      });
    });

    describe("removeDestination", () => {
      it("should remove destination", () => {
        const dest = createTestDestination({ id: "dest1" });
        act(() => {
          useForwardingStore.getState().addDestination(dest);
          useForwardingStore.getState().removeDestination("dest1");
        });

        expect(
          useForwardingStore.getState().modal.selectedDestinations,
        ).toHaveLength(0);
      });
    });

    describe("clearDestinations", () => {
      it("should clear all destinations", () => {
        act(() => {
          useForwardingStore.getState().addDestination(createTestDestination());
          useForwardingStore.getState().addDestination(createTestDestination());
          useForwardingStore.getState().clearDestinations();
        });

        expect(
          useForwardingStore.getState().modal.selectedDestinations,
        ).toHaveLength(0);
      });
    });

    describe("toggleDestination", () => {
      it("should add if not selected", () => {
        const dest = createTestDestination();
        act(() => {
          useForwardingStore.getState().toggleDestination(dest);
        });

        expect(
          useForwardingStore.getState().modal.selectedDestinations,
        ).toContainEqual(dest);
      });

      it("should remove if selected", () => {
        const dest = createTestDestination();
        act(() => {
          useForwardingStore.getState().toggleDestination(dest);
          useForwardingStore.getState().toggleDestination(dest);
        });

        expect(
          useForwardingStore.getState().modal.selectedDestinations,
        ).toHaveLength(0);
      });
    });
  });

  describe("Store: Message Selection", () => {
    describe("addMessage", () => {
      it("should add message", () => {
        const msg = createTestMessage();
        act(() => {
          useForwardingStore.getState().addMessage(msg);
        });

        expect(useForwardingStore.getState().modal.messages).toContainEqual(
          msg,
        );
      });

      it("should not add duplicate", () => {
        const msg = createTestMessage();
        act(() => {
          useForwardingStore.getState().addMessage(msg);
          useForwardingStore.getState().addMessage(msg);
        });

        expect(useForwardingStore.getState().modal.messages.length).toBe(1);
      });

      it("should not exceed max messages", () => {
        act(() => {
          for (let i = 0; i < MAX_FORWARD_MESSAGES + 5; i++) {
            useForwardingStore
              .getState()
              .addMessage(createTestMessage({ id: `msg_${i}` }));
          }
        });

        expect(useForwardingStore.getState().modal.messages.length).toBe(
          MAX_FORWARD_MESSAGES,
        );
      });
    });

    describe("removeMessage", () => {
      it("should remove message", () => {
        const msg = createTestMessage({ id: "msg1" });
        act(() => {
          useForwardingStore.getState().addMessage(msg);
          useForwardingStore.getState().removeMessage("msg1");
        });

        expect(useForwardingStore.getState().modal.messages).toHaveLength(0);
      });
    });

    describe("clearMessages", () => {
      it("should clear all messages", () => {
        act(() => {
          useForwardingStore.getState().addMessage(createTestMessage());
          useForwardingStore.getState().addMessage(createTestMessage());
          useForwardingStore.getState().clearMessages();
        });

        expect(useForwardingStore.getState().modal.messages).toHaveLength(0);
      });
    });
  });

  describe("Store: Forward Execution", () => {
    describe("startForwarding", () => {
      it("should set isForwarding to true", () => {
        act(() => {
          useForwardingStore.getState().startForwarding();
        });

        expect(useForwardingStore.getState().modal.isForwarding).toBe(true);
      });
    });

    describe("finishForwarding", () => {
      const createResult = (success: boolean): ForwardOperationResult => ({
        request: createForwardRequest(
          [createTestMessage()],
          [createTestDestination()],
          "forward",
          "user1",
        ),
        results: [
          {
            destination: createTestDestination(),
            success,
            messageIds: success ? ["new_msg_1"] : undefined,
            error: success ? undefined : "Error",
          },
        ],
        successCount: success ? 1 : 0,
        failureCount: success ? 0 : 1,
      });

      it("should set isForwarding to false", () => {
        act(() => {
          useForwardingStore.getState().startForwarding();
          useForwardingStore.getState().finishForwarding(createResult(true));
        });

        expect(useForwardingStore.getState().modal.isForwarding).toBe(false);
      });

      it("should add to history", () => {
        act(() => {
          useForwardingStore.getState().finishForwarding(createResult(true));
        });

        expect(useForwardingStore.getState().forwardHistory.length).toBe(1);
      });

      it("should add successful destinations to recent", () => {
        const result = createResult(true);
        act(() => {
          useForwardingStore.getState().finishForwarding(result);
        });

        expect(
          useForwardingStore.getState().modal.recentDestinations.length,
        ).toBe(1);
      });

      it("should close modal on full success", () => {
        act(() => {
          useForwardingStore.getState().openForwardModal([createTestMessage()]);
          useForwardingStore.getState().finishForwarding(createResult(true));
        });

        expect(useForwardingStore.getState().modal.isOpen).toBe(false);
      });

      it("should keep modal open on failure", () => {
        act(() => {
          useForwardingStore.getState().openForwardModal([createTestMessage()]);
          useForwardingStore.getState().finishForwarding(createResult(false));
        });

        expect(useForwardingStore.getState().modal.isOpen).toBe(true);
      });
    });
  });

  describe("Store: History", () => {
    describe("addToHistory", () => {
      it("should add result to history", () => {
        const result: ForwardOperationResult = {
          request: createForwardRequest(
            [createTestMessage()],
            [createTestDestination()],
            "forward",
            "user1",
          ),
          results: [],
          successCount: 0,
          failureCount: 0,
        };

        act(() => {
          useForwardingStore.getState().addToHistory(result);
        });

        expect(useForwardingStore.getState().forwardHistory.length).toBe(1);
      });

      it("should limit history entries", () => {
        act(() => {
          for (let i = 0; i < MAX_HISTORY_ENTRIES + 10; i++) {
            useForwardingStore.getState().addToHistory({
              request: createForwardRequest(
                [createTestMessage()],
                [createTestDestination()],
                "forward",
                "user1",
              ),
              results: [],
              successCount: 0,
              failureCount: 0,
            });
          }
        });

        expect(useForwardingStore.getState().forwardHistory.length).toBe(
          MAX_HISTORY_ENTRIES,
        );
      });
    });

    describe("clearHistory", () => {
      it("should clear history", () => {
        act(() => {
          useForwardingStore.getState().addToHistory({
            request: createForwardRequest(
              [createTestMessage()],
              [createTestDestination()],
              "forward",
              "user1",
            ),
            results: [],
            successCount: 0,
            failureCount: 0,
          });
          useForwardingStore.getState().clearHistory();
        });

        expect(useForwardingStore.getState().forwardHistory).toHaveLength(0);
      });
    });
  });

  describe("Store: Recent Destinations", () => {
    describe("addRecentDestination", () => {
      it("should add destination to recent", () => {
        const dest = createTestDestination();
        act(() => {
          useForwardingStore.getState().addRecentDestination(dest);
        });

        expect(
          useForwardingStore.getState().modal.recentDestinations,
        ).toContainEqual(dest);
      });

      it("should move existing to front", () => {
        const dest1 = createTestDestination({ id: "dest1", type: "channel" });
        const dest2 = createTestDestination({ id: "dest2", type: "channel" });
        act(() => {
          useForwardingStore.getState().addRecentDestination(dest1);
          useForwardingStore.getState().addRecentDestination(dest2);
          useForwardingStore.getState().addRecentDestination(dest1);
        });

        const recent = useForwardingStore.getState().modal.recentDestinations;
        expect(recent[0]).toEqual(dest1);
        expect(recent.length).toBe(2);
      });

      it("should limit recent destinations", () => {
        act(() => {
          for (let i = 0; i < MAX_RECENT_DESTINATIONS + 5; i++) {
            useForwardingStore
              .getState()
              .addRecentDestination(createTestDestination({ id: `dest_${i}` }));
          }
        });

        expect(
          useForwardingStore.getState().modal.recentDestinations.length,
        ).toBe(MAX_RECENT_DESTINATIONS);
      });
    });

    describe("clearRecentDestinations", () => {
      it("should clear recent destinations", () => {
        act(() => {
          useForwardingStore
            .getState()
            .addRecentDestination(createTestDestination());
          useForwardingStore.getState().clearRecentDestinations();
        });

        expect(
          useForwardingStore.getState().modal.recentDestinations,
        ).toHaveLength(0);
      });
    });
  });

  describe("Store: reset", () => {
    it("should reset all state", () => {
      act(() => {
        useForwardingStore.getState().openForwardModal([createTestMessage()]);
        useForwardingStore.getState().addDestination(createTestDestination());
        useForwardingStore.getState().setComment("Test");
        useForwardingStore.getState().reset();
      });

      const state = useForwardingStore.getState();
      expect(state.modal.isOpen).toBe(false);
      expect(state.modal.messages).toHaveLength(0);
      expect(state.modal.selectedDestinations).toHaveLength(0);
      expect(state.modal.comment).toBe("");
      expect(state.forwardHistory).toHaveLength(0);
    });
  });

  // ==========================================================================
  // Selectors Tests
  // ==========================================================================

  describe("Selectors", () => {
    beforeEach(() => {
      act(() => {
        useForwardingStore.getState().openForwardModal([createTestMessage()]);
        useForwardingStore.getState().addDestination(createTestDestination());
        useForwardingStore.getState().setComment("Test comment");
      });
    });

    it("selectIsForwardModalOpen should return modal open state", () => {
      expect(selectIsForwardModalOpen(useForwardingStore.getState())).toBe(
        true,
      );
    });

    it("selectForwardMessages should return messages", () => {
      expect(selectForwardMessages(useForwardingStore.getState()).length).toBe(
        1,
      );
    });

    it("selectSelectedDestinations should return destinations", () => {
      expect(
        selectSelectedDestinations(useForwardingStore.getState()).length,
      ).toBe(1);
    });

    it("selectForwardingMode should return mode", () => {
      expect(selectForwardingMode(useForwardingStore.getState())).toBe(
        "forward",
      );
    });

    it("selectForwardComment should return comment", () => {
      expect(selectForwardComment(useForwardingStore.getState())).toBe(
        "Test comment",
      );
    });

    it("selectForwardSearchQuery should return query", () => {
      act(() => {
        useForwardingStore.getState().setSearchQuery("test");
      });
      expect(selectForwardSearchQuery(useForwardingStore.getState())).toBe(
        "test",
      );
    });

    it("selectIsForwarding should return forwarding state", () => {
      expect(selectIsForwarding(useForwardingStore.getState())).toBe(false);
    });

    it("selectForwardStep should return step", () => {
      expect(selectForwardStep(useForwardingStore.getState())).toBe(
        "select-destinations",
      );
    });

    it("selectCanForward should return true when valid", () => {
      expect(selectCanForward(useForwardingStore.getState())).toBe(true);
    });

    it("selectCanForward should return false when no messages", () => {
      act(() => {
        useForwardingStore.getState().clearMessages();
      });
      expect(selectCanForward(useForwardingStore.getState())).toBe(false);
    });

    it("selectCanForward should return false when no destinations", () => {
      act(() => {
        useForwardingStore.getState().clearDestinations();
      });
      expect(selectCanForward(useForwardingStore.getState())).toBe(false);
    });

    it("selectForwardValidation should return validation result", () => {
      const validation = selectForwardValidation(useForwardingStore.getState());
      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });
  });

  // ==========================================================================
  // Constants Tests
  // ==========================================================================

  describe("Constants", () => {
    it("should have valid MAX_FORWARD_MESSAGES", () => {
      expect(MAX_FORWARD_MESSAGES).toBe(50);
    });

    it("should have valid MAX_FORWARD_DESTINATIONS", () => {
      expect(MAX_FORWARD_DESTINATIONS).toBe(10);
    });

    it("should have valid MAX_FORWARD_COMMENT_LENGTH", () => {
      expect(MAX_FORWARD_COMMENT_LENGTH).toBe(500);
    });

    it("should have valid MAX_RECENT_DESTINATIONS", () => {
      expect(MAX_RECENT_DESTINATIONS).toBe(10);
    });

    it("should have valid MAX_HISTORY_ENTRIES", () => {
      expect(MAX_HISTORY_ENTRIES).toBe(50);
    });
  });
});
