/**
 * @jest-environment node
 */
import { MessageService } from "../message.service";
import { v4 as uuidv4 } from "uuid";

// Mock uuid
jest.mock("uuid", () => ({
  v4: jest.fn(() => "mock-uuid-" + Math.random().toString(36).substr(2, 9)),
}));

// Mock the logger to reduce noise
jest.mock("@/lib/logger", () => ({
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

// Mock audit events
jest.mock("@/lib/audit/audit-events", () => ({
  logAuditEvent: jest.fn().mockResolvedValue(undefined),
}));

// Mock formatter service
jest.mock("@/services/messages/formatter.service", () => ({
  getFormatterService: () => ({
    formatMessage: (content: string) => ({
      html: `<p>${content}</p>`,
      mentions: [],
      links: [],
    }),
  }),
}));

// Helper to create mock message data in DB format
const createMockDbMessage = (overrides: Partial<any> = {}) => {
  const id = overrides.id || uuidv4();
  const now = new Date().toISOString();
  return {
    id,
    channel_id: overrides.channel_id || "channel-123",
    user_id: overrides.user_id || "user-123",
    content: overrides.content || "Test message",
    content_html: overrides.content_html || "<p>Test message</p>",
    type: overrides.type || "text",
    thread_id: overrides.thread_id || null,
    parent_message_id: overrides.parent_message_id || null,
    mentions: overrides.mentions || [],
    mentioned_roles: overrides.mentioned_roles || [],
    mentioned_channels: overrides.mentioned_channels || [],
    attachments: overrides.attachments || [],
    reactions: overrides.reactions || [],
    is_pinned: overrides.is_pinned || false,
    pinned_at: overrides.pinned_at || null,
    pinned_by: overrides.pinned_by || null,
    is_edited: overrides.is_edited || false,
    edited_at: overrides.edited_at || null,
    deleted_at: overrides.deleted_at || null,
    metadata: overrides.metadata || null,
    created_at: overrides.created_at || now,
    updated_at: overrides.updated_at || now,
    ttl_seconds: overrides.ttl_seconds || null,
    expires_at: overrides.expires_at || null,
    user: overrides.user || {
      id: "user-123",
      username: "testuser",
      display_name: "Test User",
      avatar_url: null,
    },
    ...overrides,
  };
};

// Create mock Apollo client with proper responses
const createMockApolloClient = () => {
  const messages: Map<string, any> = new Map();
  const editHistory: Map<string, any[]> = new Map();

  return {
    query: jest.fn().mockImplementation(({ variables }) => {
      // GET_CHANNEL_TTL query
      if (variables?.channelId && !variables?.limit) {
        return Promise.resolve({
          data: {
            nchat_channels_by_pk: {
              default_message_ttl_seconds: null,
            },
          },
        });
      }
      // GET_MESSAGE query (single by id)
      if (variables?.id && !variables?.channelId) {
        const message = messages.get(variables.id);
        return Promise.resolve({
          data: {
            nchat_messages_by_pk: message || null,
          },
        });
      }
      // SEARCH_MESSAGES (query comes as `%searchterm%` pattern) - check BEFORE getMessages
      if (
        variables?.query !== undefined &&
        typeof variables.query === "string"
      ) {
        // Remove the % wildcards for matching
        const searchTerm = variables.query.replace(/%/g, "").toLowerCase();
        const results = Array.from(messages.values()).filter((m) =>
          m.content.toLowerCase().includes(searchTerm),
        );
        return Promise.resolve({
          data: {
            nchat_messages: results,
            nchat_messages_aggregate: { aggregate: { count: results.length } },
          },
        });
      }
      // GET_MESSAGES (channel messages with limit/offset)
      if (variables?.channelId && variables?.limit !== undefined) {
        const channelMessages = Array.from(messages.values())
          .filter((m) => m.channel_id === variables.channelId && !m.deleted_at)
          .slice(
            variables.offset || 0,
            (variables.offset || 0) + variables.limit,
          );
        return Promise.resolve({
          data: {
            nchat_messages: channelMessages,
            nchat_messages_aggregate: {
              aggregate: {
                count: Array.from(messages.values()).filter(
                  (m) => m.channel_id === variables.channelId,
                ).length,
              },
            },
          },
        });
      }
      // GET_THREAD_MESSAGES
      if (variables?.threadId) {
        const threadMessages = Array.from(messages.values()).filter(
          (m) => m.thread_id === variables.threadId,
        );
        return Promise.resolve({
          data: {
            nchat_messages: threadMessages,
            nchat_messages_aggregate: {
              aggregate: { count: threadMessages.length },
            },
          },
        });
      }
      // GET_EDIT_HISTORY
      if (variables?.messageId && variables?.limit !== undefined) {
        const history = editHistory.get(variables.messageId) || [];
        // Transform to expected format with editor object
        const formattedHistory = history.map((h) => ({
          id: h.id,
          message_id: h.message_id,
          editor_id: h.editor_id,
          previous_content: h.previous_content,
          new_content: h.new_content,
          edited_at: h.edited_at,
          change_summary: h.change_summary,
          editor: {
            id: h.editor_id,
            username: "testuser",
            display_name: "Test User",
            avatar_url: null,
          },
        }));
        return Promise.resolve({
          data: {
            nchat_message_edits: formattedHistory,
            nchat_message_edits_aggregate: {
              aggregate: { count: formattedHistory.length },
            },
          },
        });
      }
      return Promise.resolve({ data: {} });
    }),
    mutate: jest.fn().mockImplementation(({ variables }) => {
      // SEND_MESSAGE mutation (with or without TTL)
      if (
        variables?.content !== undefined &&
        variables?.channelId &&
        variables?.userId
      ) {
        const message = createMockDbMessage({
          channel_id: variables.channelId,
          user_id: variables.userId,
          content: variables.content,
          content_html: variables.contentHtml || `<p>${variables.content}</p>`,
          type: variables.type || "text",
          thread_id: variables.threadId || null,
          mentions: variables.mentions || [],
          metadata: variables.metadata || null,
          ttl_seconds: variables.ttlSeconds || null,
          expires_at: variables.expiresAt || null,
        });
        messages.set(message.id, message);
        return Promise.resolve({
          data: {
            insert_nchat_messages_one: message,
          },
        });
      }
      // UPDATE_MESSAGE mutation
      if (
        variables?.id &&
        variables?.content !== undefined &&
        !variables?.deletedAt
      ) {
        const existing = messages.get(variables.id);
        if (existing) {
          // Store edit history
          const history = editHistory.get(variables.id) || [];
          history.push({
            id: uuidv4(),
            message_id: variables.id,
            previous_content: existing.content,
            new_content: variables.content,
            edited_at: new Date().toISOString(),
            editor_id: variables.editorId || existing.user_id,
          });
          editHistory.set(variables.id, history);

          existing.content = variables.content;
          existing.content_html =
            variables.contentHtml || `<p>${variables.content}</p>`;
          existing.is_edited = true;
          existing.edited_at = new Date().toISOString();
          existing.updated_at = new Date().toISOString();
          messages.set(variables.id, existing);
          return Promise.resolve({
            data: {
              update_nchat_messages_by_pk: existing,
            },
          });
        }
        return Promise.resolve({ data: { update_nchat_messages_by_pk: null } });
      }
      // SOFT_DELETE_MESSAGE mutation
      if (variables?.id && !variables?.content) {
        const existing = messages.get(variables.id);
        if (existing) {
          existing.deleted_at = new Date().toISOString();
          existing.content = "[deleted]";
          messages.set(variables.id, existing);
          return Promise.resolve({
            data: {
              update_nchat_messages_by_pk: existing,
            },
          });
        }
        return Promise.resolve({ data: { update_nchat_messages_by_pk: null } });
      }
      // PIN_MESSAGE mutation
      if (variables?.id && variables?.isPinned !== undefined) {
        const existing = messages.get(variables.id);
        if (existing) {
          existing.is_pinned = variables.isPinned;
          existing.pinned_at = variables.isPinned
            ? new Date().toISOString()
            : null;
          existing.pinned_by = variables.pinnedBy || null;
          messages.set(variables.id, existing);
          return Promise.resolve({
            data: {
              update_nchat_messages_by_pk: existing,
            },
          });
        }
        return Promise.resolve({ data: { update_nchat_messages_by_pk: null } });
      }
      // ADD_REACTION mutation
      if (variables?.messageId && variables?.emoji && variables?.userId) {
        return Promise.resolve({
          data: {
            insert_nchat_reactions_one: {
              id: uuidv4(),
              message_id: variables.messageId,
              user_id: variables.userId,
              emoji: variables.emoji,
            },
          },
        });
      }
      // REMOVE_REACTION mutation
      if (
        variables?.messageId &&
        variables?.emoji &&
        variables?.userId &&
        !variables?.content
      ) {
        return Promise.resolve({
          data: {
            delete_nchat_reactions: { affected_rows: 1 },
          },
        });
      }
      // UPDATE_CHANNEL_LAST_MESSAGE
      if (variables?.channelId && variables?.lastMessageId) {
        return Promise.resolve({
          data: {
            update_nchat_channels_by_pk: { id: variables.channelId },
          },
        });
      }
      // RECORD_EDIT_HISTORY
      if (variables?.messageId && variables?.previousContent !== undefined) {
        const history = editHistory.get(variables.messageId) || [];
        const record = {
          id: uuidv4(),
          message_id: variables.messageId,
          previous_content: variables.previousContent,
          new_content: variables.newContent,
          change_summary: variables.changeSummary,
          edited_at: new Date().toISOString(),
          editor_id: variables.editorId,
        };
        history.push(record);
        editHistory.set(variables.messageId, history);
        return Promise.resolve({
          data: {
            insert_nchat_message_edit_history_one: record,
          },
        });
      }
      return Promise.resolve({ data: {} });
    }),
    subscribe: jest.fn().mockReturnValue({ subscribe: jest.fn() }),
    watchQuery: jest.fn().mockReturnValue({ subscribe: jest.fn() }),
    // Helper to clear state between tests
    __reset: () => {
      messages.clear();
      editHistory.clear();
    },
    __getMessages: () => messages,
    __getEditHistory: () => editHistory,
  };
};

describe("MessageService", () => {
  let service: MessageService;
  let mockClient: ReturnType<typeof createMockApolloClient>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockClient = createMockApolloClient();
    service = new MessageService({
      apolloClient: mockClient as any,
    });
  });

  afterEach(() => {
    mockClient.__reset();
  });

  describe("sendMessage", () => {
    it("should send a text message", async () => {
      const result = await service.sendMessage({
        channelId: "channel-123",
        userId: "user-123",
        content: "Hello, world!",
        type: "text",
      });

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data?.content).toBe("Hello, world!");
      expect(result.data?.id).toBeDefined();
      expect(result.data?.createdAt).toBeDefined();
    });

    it("should send a message with mentions", async () => {
      const result = await service.sendMessage({
        channelId: "channel-123",
        userId: "user-123",
        content: "Hey @mentioned-user!",
        type: "text",
        mentions: ["mentioned-user-id"],
      });

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      // The mock stores the mentions in the DB format
      expect(mockClient.mutate).toHaveBeenCalled();
    });

    it("should send a message with thread reference", async () => {
      // First send a parent message
      const parentResult = await service.sendMessage({
        channelId: "channel-123",
        userId: "user-123",
        content: "Parent message",
        type: "text",
      });

      const parentId = parentResult.data?.id!;

      // Send reply in thread
      const result = await service.sendMessage({
        channelId: "channel-123",
        userId: "user-123",
        content: "Thread reply",
        type: "text",
        threadId: parentId,
      });

      expect(result.success).toBe(true);
      // The transformed message uses parentThreadId not threadId
      expect(result.data?.parentThreadId).toBe(parentId);
    });

    it("should handle message with TTL", async () => {
      const result = await service.sendMessage({
        channelId: "channel-123",
        userId: "user-123",
        content: "Ephemeral message",
        type: "text",
        ttlSeconds: 3600,
      });

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
    });
  });

  describe("getMessage", () => {
    it("should retrieve a message by ID", async () => {
      // First send a message
      const sendResult = await service.sendMessage({
        channelId: "channel-123",
        userId: "user-123",
        content: "Test message",
        type: "text",
      });

      expect(sendResult.success).toBe(true);
      const messageId = sendResult.data?.id;

      // Then retrieve it
      const getResult = await service.getMessage(messageId!);

      expect(getResult.success).toBe(true);
      expect(getResult.data?.id).toBe(messageId);
      expect(getResult.data?.content).toBe("Test message");
    });

    it("should return null for non-existent message", async () => {
      const result = await service.getMessage("non-existent-id");
      // The service returns success: true with data: null for not found
      expect(result.success).toBe(true);
      expect(result.data).toBeNull();
    });
  });

  describe("getMessages", () => {
    it("should retrieve messages for a channel", async () => {
      // Send some messages
      await service.sendMessage({
        channelId: "channel-456",
        userId: "user-123",
        content: "Message 1",
        type: "text",
      });
      await service.sendMessage({
        channelId: "channel-456",
        userId: "user-123",
        content: "Message 2",
        type: "text",
      });

      const result = await service.getMessages({
        channelId: "channel-456",
        limit: 50,
        offset: 0,
      });

      expect(result.success).toBe(true);
      expect(result.data?.messages.length).toBeGreaterThanOrEqual(2);
    });

    it("should support pagination", async () => {
      // Send multiple messages
      for (let i = 0; i < 5; i++) {
        await service.sendMessage({
          channelId: "channel-789",
          userId: "user-123",
          content: `Message ${i}`,
          type: "text",
        });
      }

      const page1 = await service.getMessages({
        channelId: "channel-789",
        limit: 2,
        offset: 0,
      });

      const page2 = await service.getMessages({
        channelId: "channel-789",
        limit: 2,
        offset: 2,
      });

      expect(page1.success).toBe(true);
      expect(page2.success).toBe(true);
      expect(page1.data?.messages.length).toBe(2);
      expect(page2.data?.messages.length).toBe(2);
    });
  });

  describe("updateMessage", () => {
    it("should update message content", async () => {
      // Send a message first
      const sendResult = await service.sendMessage({
        channelId: "channel-123",
        userId: "user-123",
        content: "Original content",
        type: "text",
      });

      expect(sendResult.success).toBe(true);
      const messageId = sendResult.data?.id!;

      // Update it
      const updateResult = await service.updateMessage({
        id: messageId,
        content: "Updated content",
      });

      expect(updateResult.success).toBe(true);
      expect(updateResult.data?.content).toBe("Updated content");
      expect(updateResult.data?.isEdited).toBe(true);
    });

    it("should return error for non-existent message", async () => {
      const updateResult = await service.updateMessage({
        id: "non-existent",
        content: "Updated",
      });

      expect(updateResult.success).toBe(false);
    });
  });

  describe("deleteMessage", () => {
    it("should soft delete a message", async () => {
      // Send a message
      const sendResult = await service.sendMessage({
        channelId: "channel-123",
        userId: "user-123",
        content: "To delete",
        type: "text",
      });

      const messageId = sendResult.data?.id!;

      // Delete it
      const deleteResult = await service.deleteMessage(messageId);

      expect(deleteResult.success).toBe(true);
      expect(deleteResult.data?.deleted).toBe(true);

      // Retrieve and verify
      const getResult = await service.getMessage(messageId);
      expect(getResult.data?.deletedAt).toBeDefined();
      expect(getResult.data?.content).toBe("[deleted]");
    });
  });

  describe("addReaction", () => {
    it("should add a reaction to a message", async () => {
      // Send a message
      const sendResult = await service.sendMessage({
        channelId: "channel-123",
        userId: "user-123",
        content: "Test",
        type: "text",
      });

      const messageId = sendResult.data?.id!;

      // Add reaction (three separate params)
      const reactionResult = await service.addReaction(
        messageId,
        "user-123",
        "👍",
      );

      expect(reactionResult.success).toBe(true);
      expect(reactionResult.data?.added).toBe(true);
    });
  });

  describe("removeReaction", () => {
    it("should remove a reaction from a message", async () => {
      // Send a message
      const sendResult = await service.sendMessage({
        channelId: "channel-123",
        userId: "user-123",
        content: "Test",
        type: "text",
      });

      const messageId = sendResult.data?.id!;

      // Add reaction
      await service.addReaction(messageId, "user-123", "👍");

      // Remove reaction
      const removeResult = await service.removeReaction(
        messageId,
        "user-123",
        "👍",
      );

      expect(removeResult.success).toBe(true);
      expect(removeResult.data?.removed).toBe(true);
    });
  });

  describe("pinMessage", () => {
    it("should pin a message", async () => {
      // Send a message
      const sendResult = await service.sendMessage({
        channelId: "channel-123",
        userId: "user-123",
        content: "Important",
        type: "text",
      });

      const messageId = sendResult.data?.id!;

      // Pin it (API: pinMessage(messageId, channelId, userId) returns { pinned: boolean })
      const pinResult = await service.pinMessage(
        messageId,
        "channel-123",
        "user-123",
      );

      expect(pinResult.success).toBe(true);
      expect(pinResult.data?.pinned).toBe(true);
    });
  });

  describe("unpinMessage", () => {
    it("should unpin a message", async () => {
      // Send a message
      const sendResult = await service.sendMessage({
        channelId: "channel-123",
        userId: "user-123",
        content: "Test",
        type: "text",
      });

      const messageId = sendResult.data?.id!;

      // Pin then unpin (API: unpinMessage(messageId, channelId) returns { unpinned: boolean })
      await service.pinMessage(messageId, "channel-123", "user-123");
      const unpinResult = await service.unpinMessage(messageId, "channel-123");

      expect(unpinResult.success).toBe(true);
      expect(unpinResult.data?.unpinned).toBe(true);
    });
  });

  describe("searchMessages", () => {
    it("should search messages by content", async () => {
      // Send some messages
      await service.sendMessage({
        channelId: "channel-123",
        userId: "user-123",
        content: "JavaScript is great",
        type: "text",
      });
      await service.sendMessage({
        channelId: "channel-123",
        userId: "user-123",
        content: "Python is awesome",
        type: "text",
      });

      const result = await service.searchMessages({
        query: "JavaScript",
      });

      expect(result.success).toBe(true);
      expect(result.data?.messages.length).toBeGreaterThanOrEqual(1);
      expect(result.data?.messages[0].content).toContain("JavaScript");
    });

    it("should return empty results for no matches", async () => {
      const result = await service.searchMessages({
        query: "nonexistent-xyz-abc-123",
      });

      expect(result.success).toBe(true);
      expect(result.data?.messages).toEqual([]);
    });
  });

  describe("getThreadMessages", () => {
    it("should retrieve messages in a thread", async () => {
      // Send parent message
      const parentResult = await service.sendMessage({
        channelId: "channel-123",
        userId: "user-123",
        content: "Parent message",
        type: "text",
      });

      const parentId = parentResult.data?.id!;

      // Send thread replies
      await service.sendMessage({
        channelId: "channel-123",
        userId: "user-123",
        content: "Reply 1",
        type: "text",
        threadId: parentId,
      });
      await service.sendMessage({
        channelId: "channel-123",
        userId: "user-123",
        content: "Reply 2",
        type: "text",
        threadId: parentId,
      });

      const result = await service.getThreadMessages(parentId);

      expect(result.success).toBe(true);
      expect(result.data?.messages.length).toBe(2);
      // Transformed messages use parentThreadId
      expect(
        result.data?.messages.every((m) => m.parentThreadId === parentId),
      ).toBe(true);
    });
  });

  describe("getEditHistory", () => {
    it("should retrieve edit history for a message", async () => {
      // Send a message
      const sendResult = await service.sendMessage({
        channelId: "channel-123",
        userId: "user-123",
        content: "Original",
        type: "text",
      });

      expect(sendResult.success).toBe(true);
      const messageId = sendResult.data?.id!;

      // Update twice
      const update1 = await service.updateMessage({
        id: messageId,
        content: "Edit 1",
      });
      expect(update1.success).toBe(true);

      const update2 = await service.updateMessage({
        id: messageId,
        content: "Edit 2",
      });
      expect(update2.success).toBe(true);

      // Verify edit history was stored in mock
      const storedHistory = mockClient.__getEditHistory().get(messageId);
      expect(storedHistory).toBeDefined();

      // Check edit history
      const historyResult = await service.getEditHistory({
        messageId,
        limit: 50,
        offset: 0,
      });

      // Debug output
      if (!historyResult.success) {
        console.log("getEditHistory error:", historyResult.error);
      }

      expect(historyResult.success).toBe(true);
      expect(historyResult.data?.edits.length).toBeGreaterThanOrEqual(2);
    });
  });
});
