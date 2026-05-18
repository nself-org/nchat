/**
 * Message Store Unit Tests
 *
 * Tests for the message store including adding, updating, deleting messages,
 * managing drafts, typing indicators, reactions, and channel clearing.
 */

import { act } from "@testing-library/react";
import { useMessageStore } from "../message-store";
import type { Message, Reaction, TypingUser } from "@/types/message";

// ============================================================================
// Test Helpers
// ============================================================================

const createTestMessage = (overrides?: Partial<Message>): Message => ({
  id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
  channelId: "channel-1",
  content: "Test message",
  type: "text",
  userId: "user-1",
  user: {
    id: "user-1",
    username: "testuser",
    displayName: "Test User",
  },
  createdAt: new Date(),
  isEdited: false,
  ...overrides,
});

const createTestReaction = (overrides?: Partial<Reaction>): Reaction => ({
  emoji: "👍",
  count: 1,
  users: [
    {
      id: "user-1",
      username: "testuser",
      displayName: "Test User",
    },
  ],
  hasReacted: true,
  ...overrides,
});

const createTestTypingUser = (overrides?: Partial<TypingUser>): TypingUser => ({
  id: "user-2",
  displayName: "Alice",
  startedAt: new Date(),
  ...overrides,
});

// ============================================================================
// Setup/Teardown
// ============================================================================

describe("Message Store", () => {
  beforeEach(() => {
    // Reset store to initial state before each test
    act(() => {
      useMessageStore.getState().reset();
    });
  });

  // ==========================================================================
  // Message Operations Tests
  // ==========================================================================

  describe("Message Operations", () => {
    describe("setMessages", () => {
      it("should set messages for a channel", () => {
        const messages = [
          createTestMessage({ id: "msg-1", content: "First message" }),
          createTestMessage({ id: "msg-2", content: "Second message" }),
        ];

        act(() => {
          useMessageStore.getState().setMessages("channel-1", messages);
        });

        const state = useMessageStore.getState();
        expect(state.messagesByChannel["channel-1"]).toHaveLength(2);
        expect(state.messagesByChannel["channel-1"][0].content).toBe(
          "First message",
        );
        expect(state.messagesByChannel["channel-1"][1].content).toBe(
          "Second message",
        );
      });

      it("should overwrite existing messages for a channel", () => {
        const initialMessages = [
          createTestMessage({ id: "msg-1", content: "Initial" }),
        ];
        const newMessages = [
          createTestMessage({ id: "msg-2", content: "New" }),
        ];

        act(() => {
          useMessageStore.getState().setMessages("channel-1", initialMessages);
          useMessageStore.getState().setMessages("channel-1", newMessages);
        });

        const state = useMessageStore.getState();
        expect(state.messagesByChannel["channel-1"]).toHaveLength(1);
        expect(state.messagesByChannel["channel-1"][0].content).toBe("New");
      });
    });

    describe("addMessage", () => {
      it("should add a message to a channel", () => {
        const message = createTestMessage({ id: "msg-1", content: "Hello" });

        act(() => {
          useMessageStore.getState().addMessage("channel-1", message);
        });

        const state = useMessageStore.getState();
        expect(state.messagesByChannel["channel-1"]).toHaveLength(1);
        expect(state.messagesByChannel["channel-1"][0].content).toBe("Hello");
      });

      it("should create channel array if not exists", () => {
        const message = createTestMessage({ id: "msg-1" });

        act(() => {
          useMessageStore.getState().addMessage("new-channel", message);
        });

        const state = useMessageStore.getState();
        expect(state.messagesByChannel["new-channel"]).toBeDefined();
        expect(state.messagesByChannel["new-channel"]).toHaveLength(1);
      });

      it("should append message to existing messages", () => {
        const msg1 = createTestMessage({ id: "msg-1", content: "First" });
        const msg2 = createTestMessage({ id: "msg-2", content: "Second" });

        act(() => {
          useMessageStore.getState().addMessage("channel-1", msg1);
          useMessageStore.getState().addMessage("channel-1", msg2);
        });

        const state = useMessageStore.getState();
        expect(state.messagesByChannel["channel-1"]).toHaveLength(2);
      });
    });

    describe("updateMessage", () => {
      it("should update a message in a channel", () => {
        const message = createTestMessage({ id: "msg-1", content: "Original" });

        act(() => {
          useMessageStore.getState().addMessage("channel-1", message);
          useMessageStore.getState().updateMessage("channel-1", "msg-1", {
            content: "Updated",
            isEdited: true,
          });
        });

        const state = useMessageStore.getState();
        expect(state.messagesByChannel["channel-1"][0].content).toBe("Updated");
        expect(state.messagesByChannel["channel-1"][0].isEdited).toBe(true);
      });

      it("should not update if message not found", () => {
        const message = createTestMessage({ id: "msg-1", content: "Original" });

        act(() => {
          useMessageStore.getState().addMessage("channel-1", message);
          useMessageStore
            .getState()
            .updateMessage("channel-1", "non-existent", {
              content: "Updated",
            });
        });

        const state = useMessageStore.getState();
        expect(state.messagesByChannel["channel-1"][0].content).toBe(
          "Original",
        );
      });

      it("should not modify other messages", () => {
        const msg1 = createTestMessage({ id: "msg-1", content: "First" });
        const msg2 = createTestMessage({ id: "msg-2", content: "Second" });

        act(() => {
          useMessageStore.getState().addMessage("channel-1", msg1);
          useMessageStore.getState().addMessage("channel-1", msg2);
          useMessageStore.getState().updateMessage("channel-1", "msg-1", {
            content: "Updated First",
          });
        });

        const state = useMessageStore.getState();
        expect(state.messagesByChannel["channel-1"][0].content).toBe(
          "Updated First",
        );
        expect(state.messagesByChannel["channel-1"][1].content).toBe("Second");
      });
    });

    describe("removeMessage", () => {
      it("should remove a message from a channel", () => {
        const msg1 = createTestMessage({ id: "msg-1", content: "First" });
        const msg2 = createTestMessage({ id: "msg-2", content: "Second" });

        act(() => {
          useMessageStore.getState().addMessage("channel-1", msg1);
          useMessageStore.getState().addMessage("channel-1", msg2);
          useMessageStore.getState().removeMessage("channel-1", "msg-1");
        });

        const state = useMessageStore.getState();
        expect(state.messagesByChannel["channel-1"]).toHaveLength(1);
        expect(state.messagesByChannel["channel-1"][0].id).toBe("msg-2");
      });

      it("should handle removing non-existent message gracefully", () => {
        const message = createTestMessage({ id: "msg-1" });

        act(() => {
          useMessageStore.getState().addMessage("channel-1", message);
          useMessageStore.getState().removeMessage("channel-1", "non-existent");
        });

        const state = useMessageStore.getState();
        expect(state.messagesByChannel["channel-1"]).toHaveLength(1);
      });
    });

    describe("prependMessages", () => {
      it("should prepend messages to existing messages", () => {
        const existing = createTestMessage({
          id: "msg-3",
          content: "Existing",
        });
        const older = [
          createTestMessage({ id: "msg-1", content: "Older 1" }),
          createTestMessage({ id: "msg-2", content: "Older 2" }),
        ];

        act(() => {
          useMessageStore.getState().addMessage("channel-1", existing);
          useMessageStore.getState().prependMessages("channel-1", older);
        });

        const state = useMessageStore.getState();
        expect(state.messagesByChannel["channel-1"]).toHaveLength(3);
        expect(state.messagesByChannel["channel-1"][0].id).toBe("msg-1");
        expect(state.messagesByChannel["channel-1"][2].id).toBe("msg-3");
      });
    });
  });

  // ==========================================================================
  // Channel State Tests
  // ==========================================================================

  describe("Channel State", () => {
    describe("setCurrentChannel", () => {
      it("should set the current channel", () => {
        act(() => {
          useMessageStore.getState().setCurrentChannel("channel-1");
        });

        const state = useMessageStore.getState();
        expect(state.currentChannelId).toBe("channel-1");
      });

      it("should clear editing and replying state when changing channels", () => {
        const message = createTestMessage({ id: "msg-1" });

        act(() => {
          useMessageStore.getState().addMessage("channel-1", message);
          useMessageStore.getState().startEditing("msg-1", "Original content");
          useMessageStore.getState().setCurrentChannel("channel-2");
        });

        const state = useMessageStore.getState();
        expect(state.editingMessage).toBeNull();
        expect(state.replyingTo).toBeNull();
      });

      it("should set channel to null", () => {
        act(() => {
          useMessageStore.getState().setCurrentChannel("channel-1");
          useMessageStore.getState().setCurrentChannel(null);
        });

        const state = useMessageStore.getState();
        expect(state.currentChannelId).toBeNull();
      });
    });
  });

  // ==========================================================================
  // Edit/Reply State Tests
  // ==========================================================================

  describe("Edit/Reply State", () => {
    describe("startEditing", () => {
      it("should start editing a message", () => {
        act(() => {
          useMessageStore.getState().startEditing("msg-1", "Original content");
        });

        const state = useMessageStore.getState();
        expect(state.editingMessage).toEqual({
          messageId: "msg-1",
          originalContent: "Original content",
        });
      });

      it("should clear replying state when starting to edit", () => {
        const message = createTestMessage({ id: "msg-1" });

        act(() => {
          useMessageStore.getState().startReplying(message);
          useMessageStore.getState().startEditing("msg-2", "Content");
        });

        const state = useMessageStore.getState();
        expect(state.replyingTo).toBeNull();
        expect(state.editingMessage).not.toBeNull();
      });
    });

    describe("stopEditing", () => {
      it("should stop editing", () => {
        act(() => {
          useMessageStore.getState().startEditing("msg-1", "Content");
          useMessageStore.getState().stopEditing();
        });

        const state = useMessageStore.getState();
        expect(state.editingMessage).toBeNull();
      });
    });

    describe("startReplying", () => {
      it("should start replying to a message", () => {
        const message = createTestMessage({
          id: "msg-1",
          content: "Reply to this",
        });

        act(() => {
          useMessageStore.getState().startReplying(message);
        });

        const state = useMessageStore.getState();
        expect(state.replyingTo).toEqual({
          messageId: "msg-1",
          message: message,
        });
      });

      it("should clear editing state when starting to reply", () => {
        const message = createTestMessage({ id: "msg-1" });

        act(() => {
          useMessageStore.getState().startEditing("msg-2", "Content");
          useMessageStore.getState().startReplying(message);
        });

        const state = useMessageStore.getState();
        expect(state.editingMessage).toBeNull();
        expect(state.replyingTo).not.toBeNull();
      });
    });

    describe("stopReplying", () => {
      it("should stop replying", () => {
        const message = createTestMessage({ id: "msg-1" });

        act(() => {
          useMessageStore.getState().startReplying(message);
          useMessageStore.getState().stopReplying();
        });

        const state = useMessageStore.getState();
        expect(state.replyingTo).toBeNull();
      });
    });
  });

  // ==========================================================================
  // Draft Management Tests
  // ==========================================================================

  describe("Draft Management", () => {
    describe("saveDraft", () => {
      it("should save a draft for a channel", () => {
        act(() => {
          useMessageStore.getState().saveDraft("channel-1", "Draft content");
        });

        const state = useMessageStore.getState();
        expect(state.drafts["channel-1"]).toBeDefined();
        expect(state.drafts["channel-1"].content).toBe("Draft content");
      });

      it("should save draft with replyToId", () => {
        act(() => {
          useMessageStore
            .getState()
            .saveDraft("channel-1", "Reply draft", "msg-1");
        });

        const state = useMessageStore.getState();
        expect(state.drafts["channel-1"].replyToId).toBe("msg-1");
      });

      it("should overwrite existing draft", () => {
        act(() => {
          useMessageStore.getState().saveDraft("channel-1", "First draft");
          useMessageStore.getState().saveDraft("channel-1", "Second draft");
        });

        const state = useMessageStore.getState();
        expect(state.drafts["channel-1"].content).toBe("Second draft");
      });
    });

    describe("clearDraft", () => {
      it("should clear a draft for a channel", () => {
        act(() => {
          useMessageStore.getState().saveDraft("channel-1", "Draft content");
          useMessageStore.getState().clearDraft("channel-1");
        });

        const state = useMessageStore.getState();
        expect(state.drafts["channel-1"]).toBeUndefined();
      });
    });

    describe("getDraft", () => {
      it("should get a draft for a channel", () => {
        act(() => {
          useMessageStore.getState().saveDraft("channel-1", "Draft content");
        });

        const draft = useMessageStore.getState().getDraft("channel-1");
        expect(draft?.content).toBe("Draft content");
      });

      it("should return undefined for non-existent draft", () => {
        const draft = useMessageStore.getState().getDraft("non-existent");
        expect(draft).toBeUndefined();
      });
    });
  });

  // ==========================================================================
  // Typing Indicators Tests
  // ==========================================================================

  describe("Typing Indicators", () => {
    describe("setTypingUsers", () => {
      it("should set typing users for a channel", () => {
        const users = [
          createTestTypingUser({ id: "user-1", displayName: "Alice" }),
          createTestTypingUser({ id: "user-2", displayName: "Bob" }),
        ];

        act(() => {
          useMessageStore.getState().setTypingUsers("channel-1", users);
        });

        const state = useMessageStore.getState();
        expect(state.typingUsers["channel-1"]).toHaveLength(2);
      });
    });

    describe("addTypingUser", () => {
      it("should add a typing user", () => {
        const user = createTestTypingUser({
          id: "user-1",
          displayName: "Alice",
        });

        act(() => {
          useMessageStore.getState().addTypingUser("channel-1", user);
        });

        const state = useMessageStore.getState();
        expect(state.typingUsers["channel-1"]).toHaveLength(1);
        expect(state.typingUsers["channel-1"][0].displayName).toBe("Alice");
      });

      it("should not add duplicate typing user", () => {
        const user = createTestTypingUser({
          id: "user-1",
          displayName: "Alice",
        });

        act(() => {
          useMessageStore.getState().addTypingUser("channel-1", user);
          useMessageStore.getState().addTypingUser("channel-1", user);
        });

        const state = useMessageStore.getState();
        expect(state.typingUsers["channel-1"]).toHaveLength(1);
      });
    });

    describe("removeTypingUser", () => {
      it("should remove a typing user", () => {
        const user1 = createTestTypingUser({
          id: "user-1",
          displayName: "Alice",
        });
        const user2 = createTestTypingUser({
          id: "user-2",
          displayName: "Bob",
        });

        act(() => {
          useMessageStore.getState().addTypingUser("channel-1", user1);
          useMessageStore.getState().addTypingUser("channel-1", user2);
          useMessageStore.getState().removeTypingUser("channel-1", "user-1");
        });

        const state = useMessageStore.getState();
        expect(state.typingUsers["channel-1"]).toHaveLength(1);
        expect(state.typingUsers["channel-1"][0].id).toBe("user-2");
      });
    });
  });

  // ==========================================================================
  // Unread Tracking Tests
  // ==========================================================================

  describe("Unread Tracking", () => {
    describe("markAsRead", () => {
      it("should mark channel as read", () => {
        act(() => {
          useMessageStore.getState().setUnreadCount("channel-1", 5);
          useMessageStore.getState().markAsRead("channel-1");
        });

        const state = useMessageStore.getState();
        expect(state.unreadCountByChannel["channel-1"]).toBe(0);
        expect(state.lastReadByChannel["channel-1"]).toBeDefined();
      });
    });

    describe("setUnreadCount", () => {
      it("should set unread count for a channel", () => {
        act(() => {
          useMessageStore.getState().setUnreadCount("channel-1", 10);
        });

        const state = useMessageStore.getState();
        expect(state.unreadCountByChannel["channel-1"]).toBe(10);
      });
    });
  });

  // ==========================================================================
  // Reaction Tests
  // ==========================================================================

  describe("Reactions", () => {
    describe("addReaction", () => {
      it("should add a reaction to a message", () => {
        const message = createTestMessage({ id: "msg-1", reactions: [] });
        const reaction = createTestReaction({ emoji: "👍", count: 1 });

        act(() => {
          useMessageStore.getState().addMessage("channel-1", message);
          useMessageStore
            .getState()
            .addReaction("channel-1", "msg-1", reaction);
        });

        const state = useMessageStore.getState();
        const updatedMessage = state.messagesByChannel["channel-1"][0];
        expect(updatedMessage.reactions).toHaveLength(1);
        expect(updatedMessage.reactions?.[0].emoji).toBe("👍");
      });

      it("should update existing reaction", () => {
        const message = createTestMessage({
          id: "msg-1",
          reactions: [createTestReaction({ emoji: "👍", count: 1 })],
        });
        const updatedReaction = createTestReaction({ emoji: "👍", count: 2 });

        act(() => {
          useMessageStore.getState().addMessage("channel-1", message);
          useMessageStore
            .getState()
            .addReaction("channel-1", "msg-1", updatedReaction);
        });

        const state = useMessageStore.getState();
        const updatedMessage = state.messagesByChannel["channel-1"][0];
        expect(updatedMessage.reactions).toHaveLength(1);
        expect(updatedMessage.reactions?.[0].count).toBe(2);
      });
    });

    describe("removeReaction", () => {
      it("should remove a reaction from a message", () => {
        const message = createTestMessage({
          id: "msg-1",
          reactions: [
            createTestReaction({
              emoji: "👍",
              count: 1,
              users: [
                {
                  id: "user-1",
                  username: "testuser",
                  displayName: "Test User",
                },
              ],
            }),
          ],
        });

        act(() => {
          useMessageStore.getState().addMessage("channel-1", message);
          useMessageStore
            .getState()
            .removeReaction("channel-1", "msg-1", "👍", "user-1");
        });

        const state = useMessageStore.getState();
        const updatedMessage = state.messagesByChannel["channel-1"][0];
        expect(updatedMessage.reactions).toHaveLength(0);
      });
    });

    describe("updateRecentEmojis", () => {
      it("should add emoji to recent list", () => {
        act(() => {
          useMessageStore.getState().updateRecentEmojis("😀");
        });

        const state = useMessageStore.getState();
        expect(state.recentEmojis).toContain("😀");
        expect(state.recentEmojis[0]).toBe("😀");
      });

      it("should move emoji to front if already exists", () => {
        act(() => {
          useMessageStore.getState().updateRecentEmojis("😀");
          useMessageStore.getState().updateRecentEmojis("😂");
          useMessageStore.getState().updateRecentEmojis("😀");
        });

        const state = useMessageStore.getState();
        expect(state.recentEmojis[0]).toBe("😀");
        expect(state.recentEmojis[1]).toBe("😂");
      });

      it("should limit recent emojis to 20", () => {
        act(() => {
          for (let i = 0; i < 25; i++) {
            useMessageStore.getState().updateRecentEmojis(`emoji-${i}`);
          }
        });

        const state = useMessageStore.getState();
        expect(state.recentEmojis.length).toBeLessThanOrEqual(20);
      });
    });
  });

  // ==========================================================================
  // Utility Tests
  // ==========================================================================

  describe("Utility Operations", () => {
    describe("clearChannel", () => {
      it("should clear all data for a channel", () => {
        const message = createTestMessage({ id: "msg-1" });
        const typingUser = createTestTypingUser();

        act(() => {
          useMessageStore.getState().addMessage("channel-1", message);
          useMessageStore.getState().saveDraft("channel-1", "Draft");
          useMessageStore.getState().addTypingUser("channel-1", typingUser);
          useMessageStore.getState().setHasMore("channel-1", true);
          useMessageStore.getState().setLoading("channel-1", true);
          useMessageStore.getState().clearChannel("channel-1");
        });

        const state = useMessageStore.getState();
        expect(state.messagesByChannel["channel-1"]).toBeUndefined();
        expect(state.drafts["channel-1"]).toBeUndefined();
        expect(state.typingUsers["channel-1"]).toBeUndefined();
        expect(state.hasMoreByChannel["channel-1"]).toBeUndefined();
        expect(state.loadingChannels.has("channel-1")).toBe(false);
      });
    });

    describe("reset", () => {
      it("should reset store to initial state", () => {
        const message = createTestMessage({ id: "msg-1" });

        act(() => {
          useMessageStore.getState().addMessage("channel-1", message);
          useMessageStore.getState().setCurrentChannel("channel-1");
          useMessageStore.getState().saveDraft("channel-1", "Draft");
          useMessageStore.getState().reset();
        });

        const state = useMessageStore.getState();
        expect(Object.keys(state.messagesByChannel)).toHaveLength(0);
        expect(state.currentChannelId).toBeNull();
        expect(Object.keys(state.drafts)).toHaveLength(0);
      });
    });
  });

  // ==========================================================================
  // Loading State Tests
  // ==========================================================================

  describe("Loading State", () => {
    describe("setLoading", () => {
      it("should set loading state for a channel", () => {
        act(() => {
          useMessageStore.getState().setLoading("channel-1", true);
        });

        const state = useMessageStore.getState();
        expect(state.loadingChannels.has("channel-1")).toBe(true);
      });

      it("should remove loading state for a channel", () => {
        act(() => {
          useMessageStore.getState().setLoading("channel-1", true);
          useMessageStore.getState().setLoading("channel-1", false);
        });

        const state = useMessageStore.getState();
        expect(state.loadingChannels.has("channel-1")).toBe(false);
      });
    });

    describe("setHasMore", () => {
      it("should set hasMore state for a channel", () => {
        act(() => {
          useMessageStore.getState().setHasMore("channel-1", false);
        });

        const state = useMessageStore.getState();
        expect(state.hasMoreByChannel["channel-1"]).toBe(false);
      });
    });
  });

  // ==========================================================================
  // Selector Tests
  // ==========================================================================

  describe("Selectors", () => {
    it("selectMessages should return messages for a channel", () => {
      const messages = [
        createTestMessage({ id: "msg-1" }),
        createTestMessage({ id: "msg-2" }),
      ];

      act(() => {
        useMessageStore.getState().setMessages("channel-1", messages);
      });

      const { selectMessages } = require("../message-store");
      const state = useMessageStore.getState();
      const channelMessages = selectMessages("channel-1")(state);
      expect(channelMessages).toHaveLength(2);
    });

    it("selectMessages should return empty array for non-existent channel", () => {
      const { selectMessages } = require("../message-store");
      const state = useMessageStore.getState();
      const channelMessages = selectMessages("non-existent")(state);
      expect(channelMessages).toHaveLength(0);
    });

    it("selectIsLoading should return loading state", () => {
      act(() => {
        useMessageStore.getState().setLoading("channel-1", true);
      });

      const { selectIsLoading } = require("../message-store");
      const state = useMessageStore.getState();
      expect(selectIsLoading("channel-1")(state)).toBe(true);
      expect(selectIsLoading("channel-2")(state)).toBe(false);
    });

    it("selectTypingUsers should return typing users", () => {
      const user = createTestTypingUser();

      act(() => {
        useMessageStore.getState().addTypingUser("channel-1", user);
      });

      const { selectTypingUsers } = require("../message-store");
      const state = useMessageStore.getState();
      const typingUsers = selectTypingUsers("channel-1")(state);
      expect(typingUsers).toHaveLength(1);
    });

    it("selectUnreadCount should return unread count", () => {
      act(() => {
        useMessageStore.getState().setUnreadCount("channel-1", 5);
      });

      const { selectUnreadCount } = require("../message-store");
      const state = useMessageStore.getState();
      expect(selectUnreadCount("channel-1")(state)).toBe(5);
      expect(selectUnreadCount("channel-2")(state)).toBe(0);
    });
  });
});
