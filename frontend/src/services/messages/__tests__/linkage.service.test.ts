/**
 * Message Linkage Service Tests
 *
 * Comprehensive test suite for quote/reply/thread linkage consistency.
 * Tests cover:
 * - Reply linkage (parent references, chains, depth)
 * - Quote snapshots (content preservation, truncation)
 * - Thread linkage (participants, activity, orphaned handling)
 * - Edit handling (preview updates, context marking)
 * - Delete handling (cascade, orphan resolution)
 * - Export/import (preservation, re-linking, validation)
 */

import { ApolloClient, NormalizedCacheObject } from "@apollo/client";
import {
  MessageLinkageService,
  createLinkageService,
  type ReplyReference,
  type QuoteSnapshot,
  type ThreadLinkage,
  type LinkageValidationResult,
  type LinkageRepairOptions,
  type ExportedLinkage,
  type ImportLinkageMapping,
  type LinkageEditConfig,
} from "../linkage.service";
import type { Message, MessageUser } from "@/types/message";

// ============================================================================
// MOCK SETUP
// ============================================================================

const mockQuery = jest.fn();
const mockMutate = jest.fn();

const mockApolloClient = {
  query: mockQuery,
  mutate: mockMutate,
} as unknown as ApolloClient<NormalizedCacheObject>;

const createTestMessage = (overrides: Partial<Message> = {}): Message => ({
  id: "msg-1",
  channelId: "channel-1",
  content: "Test message content",
  type: "text",
  userId: "user-1",
  user: {
    id: "user-1",
    username: "testuser",
    displayName: "Test User",
    avatarUrl: "https://example.com/avatar.jpg",
  },
  createdAt: new Date("2024-01-15T10:00:00Z"),
  isEdited: false,
  ...overrides,
});

const createTestUser = (overrides: Partial<MessageUser> = {}): MessageUser => ({
  id: "user-1",
  username: "testuser",
  displayName: "Test User",
  avatarUrl: "https://example.com/avatar.jpg",
  ...overrides,
});

describe("MessageLinkageService", () => {
  let service: MessageLinkageService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = createLinkageService({ apolloClient: mockApolloClient });
  });

  // ==========================================================================
  // REPLY LINKAGE TESTS
  // ==========================================================================

  describe("Reply Linkage", () => {
    describe("getReplyReference", () => {
      it("should return null for message without parent", async () => {
        mockQuery.mockResolvedValueOnce({
          data: {
            nchat_messages_by_pk: {
              id: "msg-1",
              parent_message_id: null,
            },
          },
        });

        const result = await service.getReplyReference("msg-1");

        expect(result.success).toBe(true);
        expect(result.data).toBeNull();
      });

      it("should return reply reference with valid parent", async () => {
        mockQuery.mockResolvedValueOnce({
          data: {
            nchat_messages_by_pk: {
              id: "msg-2",
              parent_message_id: "msg-1",
              parent: {
                id: "msg-1",
                content: "Parent message",
                is_deleted: false,
                is_edited: false,
                created_at: "2024-01-15T09:00:00Z",
                user: {
                  id: "user-1",
                  username: "parent_user",
                  display_name: "Parent User",
                },
              },
            },
          },
        });

        const result = await service.getReplyReference("msg-2");

        expect(result.success).toBe(true);
        expect(result.data).not.toBeNull();
        expect(result.data!.parentId).toBe("msg-1");
        expect(result.data!.parent).not.toBeNull();
        expect(result.data!.isParentDeleted).toBe(false);
        expect(result.data!.isParentEdited).toBe(false);
        expect(result.data!.depth).toBe(1);
      });

      it("should handle deleted parent gracefully", async () => {
        mockQuery.mockResolvedValueOnce({
          data: {
            nchat_messages_by_pk: {
              id: "msg-2",
              parent_message_id: "msg-1",
              parent: {
                id: "msg-1",
                content: "Deleted parent message",
                is_deleted: true,
                is_edited: false,
                created_at: "2024-01-15T09:00:00Z",
                user: null,
              },
            },
          },
        });

        const result = await service.getReplyReference("msg-2");

        expect(result.success).toBe(true);
        expect(result.data!.isParentDeleted).toBe(true);
        // Parent object exists but isParentDeleted flag indicates it was deleted
        expect(result.data!.parent?.isDeleted).toBe(true);
      });

      it("should detect edited parent", async () => {
        mockQuery.mockResolvedValueOnce({
          data: {
            nchat_messages_by_pk: {
              id: "msg-2",
              parent_message_id: "msg-1",
              parent: {
                id: "msg-1",
                content: "Edited parent message",
                is_deleted: false,
                is_edited: true,
                edited_at: "2024-01-15T11:00:00Z",
                created_at: "2024-01-15T09:00:00Z",
                user: {
                  id: "user-1",
                  username: "parent_user",
                  display_name: "Parent User",
                },
              },
            },
          },
        });

        const result = await service.getReplyReference("msg-2");

        expect(result.success).toBe(true);
        expect(result.data!.isParentEdited).toBe(true);
      });

      it("should handle missing parent (null in DB)", async () => {
        mockQuery.mockResolvedValueOnce({
          data: {
            nchat_messages_by_pk: {
              id: "msg-2",
              parent_message_id: "msg-deleted",
              parent: null,
            },
          },
        });

        const result = await service.getReplyReference("msg-2");

        expect(result.success).toBe(true);
        expect(result.data!.isParentDeleted).toBe(true);
        expect(result.data!.parent).toBeNull();
      });

      it("should handle query error", async () => {
        mockQuery.mockRejectedValueOnce(new Error("Network error"));

        const result = await service.getReplyReference("msg-1");

        expect(result.success).toBe(false);
        expect(result.error?.code).toBe("INTERNAL_ERROR");
      });
    });

    describe("getReplyChain", () => {
      it("should return empty chain for top-level message", async () => {
        mockQuery.mockResolvedValueOnce({
          data: {
            nchat_messages_by_pk: {
              id: "msg-1",
              parent: null,
            },
          },
        });

        const result = await service.getReplyChain("msg-1");

        expect(result.success).toBe(true);
        expect(result.data).toHaveLength(0);
      });

      it("should return full reply chain up to max depth", async () => {
        mockQuery.mockResolvedValueOnce({
          data: {
            nchat_messages_by_pk: {
              id: "msg-3",
              parent_message_id: "msg-2",
              parent: {
                id: "msg-2",
                content: "Level 1 parent",
                is_deleted: false,
                is_edited: false,
                created_at: "2024-01-15T09:30:00Z",
                user: {
                  id: "user-1",
                  username: "user1",
                  display_name: "User 1",
                },
                parent: {
                  id: "msg-1",
                  content: "Level 2 parent (root)",
                  is_deleted: false,
                  is_edited: false,
                  created_at: "2024-01-15T09:00:00Z",
                  user: {
                    id: "user-2",
                    username: "user2",
                    display_name: "User 2",
                  },
                  parent: null,
                },
              },
            },
          },
        });

        const result = await service.getReplyChain("msg-3", 10);

        expect(result.success).toBe(true);
        expect(result.data).toHaveLength(2);
        expect(result.data![0].parentId).toBe("msg-2");
        expect(result.data![0].depth).toBe(1);
        expect(result.data![1].parentId).toBe("msg-1");
        expect(result.data![1].depth).toBe(2);
      });

      it("should respect max depth limit", async () => {
        mockQuery.mockResolvedValueOnce({
          data: {
            nchat_messages_by_pk: {
              id: "msg-5",
              parent: {
                id: "msg-4",
                content: "Depth 1",
                is_deleted: false,
                is_edited: false,
                created_at: "2024-01-15T09:40:00Z",
                user: {
                  id: "user-1",
                  username: "user1",
                  display_name: "User 1",
                },
                parent: {
                  id: "msg-3",
                  content: "Depth 2",
                  is_deleted: false,
                  is_edited: false,
                  created_at: "2024-01-15T09:30:00Z",
                  user: {
                    id: "user-2",
                    username: "user2",
                    display_name: "User 2",
                  },
                  parent: {
                    id: "msg-2",
                    content: "Depth 3 (should stop here)",
                    is_deleted: false,
                    is_edited: false,
                    created_at: "2024-01-15T09:20:00Z",
                    user: {
                      id: "user-3",
                      username: "user3",
                      display_name: "User 3",
                    },
                    parent: null,
                  },
                },
              },
            },
          },
        });

        const result = await service.getReplyChain("msg-5", 2);

        expect(result.success).toBe(true);
        expect(result.data).toHaveLength(2); // Stops at depth 2
      });

      it("should handle chain with deleted messages", async () => {
        mockQuery.mockResolvedValueOnce({
          data: {
            nchat_messages_by_pk: {
              id: "msg-3",
              parent: {
                id: "msg-2",
                content: "This was deleted",
                is_deleted: true,
                is_edited: false,
                created_at: "2024-01-15T09:30:00Z",
                user: null,
                parent: {
                  id: "msg-1",
                  content: "Root message",
                  is_deleted: false,
                  is_edited: false,
                  created_at: "2024-01-15T09:00:00Z",
                  user: {
                    id: "user-1",
                    username: "user1",
                    display_name: "User 1",
                  },
                  parent: null,
                },
              },
            },
          },
        });

        const result = await service.getReplyChain("msg-3");

        expect(result.success).toBe(true);
        expect(result.data![0].isParentDeleted).toBe(true);
        expect(result.data![0].parent).toBeNull();
        expect(result.data![1].isParentDeleted).toBe(false);
        expect(result.data![1].parent).not.toBeNull();
      });
    });

    describe("getRepliesTo", () => {
      it("should return empty array when no replies", async () => {
        mockQuery.mockResolvedValueOnce({
          data: {
            nchat_messages: [],
          },
        });

        const result = await service.getRepliesTo("msg-1");

        expect(result.success).toBe(true);
        expect(result.data).toHaveLength(0);
      });

      it("should return all replies to a message", async () => {
        mockQuery.mockResolvedValueOnce({
          data: {
            nchat_messages: [
              {
                id: "reply-1",
                content: "Reply 1",
                created_at: "2024-01-15T10:00:00Z",
                user_id: "user-1",
              },
              {
                id: "reply-2",
                content: "Reply 2",
                created_at: "2024-01-15T10:05:00Z",
                user_id: "user-2",
              },
              {
                id: "reply-3",
                content: "Reply 3",
                created_at: "2024-01-15T10:10:00Z",
                user_id: "user-3",
              },
            ],
          },
        });

        const result = await service.getRepliesTo("msg-1");

        expect(result.success).toBe(true);
        expect(result.data).toHaveLength(3);
      });
    });

    describe("createReplyLinkage", () => {
      it("should create reply linkage successfully", async () => {
        mockMutate.mockResolvedValueOnce({
          data: {
            update_nchat_messages_by_pk: {
              id: "msg-2",
              parent_message_id: "msg-1",
            },
          },
        });

        const result = await service.createReplyLinkage("msg-2", "msg-1");

        expect(result.success).toBe(true);
        expect(result.data!.linked).toBe(true);
        expect(mockMutate).toHaveBeenCalled();
      });

      it("should handle mutation error", async () => {
        mockMutate.mockResolvedValueOnce({
          errors: [{ message: "Foreign key violation" }],
        });

        const result = await service.createReplyLinkage(
          "msg-2",
          "non-existent",
        );

        expect(result.success).toBe(false);
      });
    });

    describe("handleDeletedParent", () => {
      it("should remove references when action is remove_reference", async () => {
        mockQuery.mockResolvedValueOnce({
          data: {
            nchat_messages: [
              {
                id: "reply-1",
                content: "Reply",
                created_at: "2024-01-15T10:00:00Z",
                user_id: "user-1",
              },
              {
                id: "reply-2",
                content: "Reply 2",
                created_at: "2024-01-15T10:05:00Z",
                user_id: "user-2",
              },
            ],
          },
        });

        mockMutate.mockResolvedValue({ data: {} });

        const result = await service.handleDeletedParent(
          "msg-1",
          "remove_reference",
        );

        expect(result.success).toBe(true);
        expect(result.data!.updatedCount).toBe(2);
        expect(mockMutate).toHaveBeenCalledTimes(2);
      });

      it("should not update when action is keep", async () => {
        mockQuery.mockResolvedValueOnce({
          data: {
            nchat_messages: [{ id: "reply-1" }],
          },
        });

        const result = await service.handleDeletedParent("msg-1", "keep");

        expect(result.success).toBe(true);
        expect(result.data!.updatedCount).toBe(0);
        expect(mockMutate).not.toHaveBeenCalled();
      });
    });
  });

  // ==========================================================================
  // QUOTE SNAPSHOT TESTS
  // ==========================================================================

  describe("Quote Snapshots", () => {
    describe("createQuoteSnapshot", () => {
      it("should create quote snapshot with all fields", async () => {
        const originalMessage = createTestMessage({
          id: "original-1",
          content: "This is the original message content to be quoted",
          contentHtml:
            "<p>This is the original message content to be quoted</p>",
          attachments: [
            {
              id: "att-1",
              type: "image",
              name: "image.jpg",
              url: "https://example.com/image.jpg",
            },
          ],
        });

        mockMutate.mockResolvedValueOnce({ data: {} });

        const result = await service.createQuoteSnapshot(
          "msg-2",
          originalMessage,
        );

        expect(result.success).toBe(true);
        expect(result.data!.originalMessageId).toBe("original-1");
        expect(result.data!.originalContent).toBe(
          "This is the original message content to be quoted",
        );
        expect(result.data!.originalExists).toBe(true);
        expect(result.data!.wasEdited).toBe(false);
        expect(result.data!.truncatedContent).toBe(
          "This is the original message content to be quoted",
        );
        expect(result.data!.mediaSnapshot).toHaveLength(1);
      });

      it("should truncate long content", async () => {
        const longContent = "A".repeat(300);
        const originalMessage = createTestMessage({
          content: longContent,
        });

        mockMutate.mockResolvedValueOnce({ data: {} });

        const result = await service.createQuoteSnapshot(
          "msg-2",
          originalMessage,
          100,
        );

        expect(result.success).toBe(true);
        expect(result.data!.truncatedContent.length).toBeLessThanOrEqual(100);
        expect(result.data!.truncatedContent).toContain("...");
      });

      it("should preserve sender info", async () => {
        const originalMessage = createTestMessage({
          user: {
            id: "quoted-user",
            username: "quoteduser",
            displayName: "Quoted User",
            avatarUrl: "https://example.com/quoted-avatar.jpg",
          },
        });

        mockMutate.mockResolvedValueOnce({ data: {} });

        const result = await service.createQuoteSnapshot(
          "msg-2",
          originalMessage,
        );

        expect(result.success).toBe(true);
        expect(result.data!.originalSender.id).toBe("quoted-user");
        expect(result.data!.originalSender.displayName).toBe("Quoted User");
      });
    });

    describe("getQuoteSnapshot", () => {
      it("should return null when no snapshot exists", async () => {
        mockQuery.mockResolvedValueOnce({
          data: {
            nchat_quote_snapshots: [],
          },
        });

        const result = await service.getQuoteSnapshot("msg-1");

        expect(result.success).toBe(true);
        expect(result.data).toBeNull();
      });

      it("should return snapshot with original status", async () => {
        mockQuery.mockResolvedValueOnce({
          data: {
            nchat_quote_snapshots: [
              {
                id: "snapshot-1",
                original_message_id: "original-1",
                original_content: "Original quoted content",
                original_sender_id: "user-1",
                original_timestamp: "2024-01-15T09:00:00Z",
                original_sender: {
                  id: "user-1",
                  username: "originaluser",
                  display_name: "Original User",
                },
                original_message: {
                  id: "original-1",
                  content: "Updated content after quote",
                  is_deleted: false,
                  is_edited: true,
                },
              },
            ],
          },
        });

        const result = await service.getQuoteSnapshot("msg-1");

        expect(result.success).toBe(true);
        expect(result.data!.originalContent).toBe("Original quoted content");
        expect(result.data!.originalExists).toBe(true);
        expect(result.data!.wasEdited).toBe(true);
      });

      it("should detect when original is deleted", async () => {
        mockQuery.mockResolvedValueOnce({
          data: {
            nchat_quote_snapshots: [
              {
                id: "snapshot-1",
                original_message_id: "original-1",
                original_content: "Original content before deletion",
                original_timestamp: "2024-01-15T09:00:00Z",
                original_sender: {
                  id: "user-1",
                  username: "user",
                  display_name: "User",
                },
                original_message: {
                  id: "original-1",
                  is_deleted: true,
                },
              },
            ],
          },
        });

        const result = await service.getQuoteSnapshot("msg-1");

        expect(result.success).toBe(true);
        expect(result.data!.originalExists).toBe(false);
        expect(result.data!.originalContent).toBe(
          "Original content before deletion",
        );
      });
    });

    describe("getQuoteDisplayContent", () => {
      it("should return original content for deleted message", async () => {
        mockQuery.mockResolvedValueOnce({
          data: {
            nchat_quote_snapshots: [
              {
                id: "snapshot-1",
                original_content: "Preserved content",
                original_timestamp: "2024-01-15T09:00:00Z",
                original_sender: {
                  id: "user-1",
                  username: "user",
                  display_name: "User",
                },
                original_message: { is_deleted: true },
              },
            ],
          },
        });

        const result = await service.getQuoteDisplayContent("msg-1");

        expect(result.success).toBe(true);
        expect(result.data!.content).toContain("Preserved content");
        expect(result.data!.isOriginal).toBe(true);
      });

      it("should indicate when content was edited", async () => {
        mockQuery.mockResolvedValueOnce({
          data: {
            nchat_quote_snapshots: [
              {
                id: "snapshot-1",
                original_content: "Original at quote time",
                original_timestamp: "2024-01-15T09:00:00Z",
                original_sender: {
                  id: "user-1",
                  username: "user",
                  display_name: "User",
                },
                original_message: { is_deleted: false, is_edited: true },
              },
            ],
          },
        });

        const result = await service.getQuoteDisplayContent("msg-1", true);

        expect(result.success).toBe(true);
        expect(result.data!.wasEdited).toBe(true);
      });

      it("should return fallback for missing quote", async () => {
        mockQuery.mockResolvedValueOnce({
          data: { nchat_quote_snapshots: [] },
        });

        const result = await service.getQuoteDisplayContent("msg-1");

        expect(result.success).toBe(true);
        expect(result.data!.content).toBe("[Quote not found]");
      });
    });
  });

  // ==========================================================================
  // THREAD LINKAGE TESTS
  // ==========================================================================

  describe("Thread Linkage", () => {
    describe("getThreadLinkage", () => {
      it("should return null for non-existent thread", async () => {
        mockQuery.mockResolvedValueOnce({
          data: { nchat_threads_by_pk: null },
        });

        const result = await service.getThreadLinkage("thread-nonexistent");

        expect(result.success).toBe(true);
        expect(result.data).toBeNull();
      });

      it("should return full thread linkage info", async () => {
        mockQuery.mockResolvedValueOnce({
          data: {
            nchat_threads_by_pk: {
              id: "thread-1",
              channel_id: "channel-1",
              parent_message_id: "msg-1",
              message_count: 15,
              last_reply_at: "2024-01-15T12:00:00Z",
              is_archived: false,
              is_locked: false,
              parent_message: {
                id: "msg-1",
                content: "Thread root message",
                is_deleted: false,
                created_at: "2024-01-15T09:00:00Z",
                user: {
                  id: "user-1",
                  username: "threadstarter",
                  display_name: "Thread Starter",
                  avatar_url: "https://example.com/avatar.jpg",
                },
              },
              participants: [
                {
                  user_id: "user-1",
                  user: {
                    id: "user-1",
                    username: "user1",
                    display_name: "User 1",
                  },
                },
                {
                  user_id: "user-2",
                  user: {
                    id: "user-2",
                    username: "user2",
                    display_name: "User 2",
                  },
                },
                {
                  user_id: "user-3",
                  user: {
                    id: "user-3",
                    username: "user3",
                    display_name: "User 3",
                  },
                },
              ],
            },
          },
        });

        const result = await service.getThreadLinkage("thread-1");

        expect(result.success).toBe(true);
        expect(result.data!.threadId).toBe("thread-1");
        expect(result.data!.rootMessage).not.toBeNull();
        expect(result.data!.rootMessage!.content).toBe("Thread root message");
        expect(result.data!.isRootDeleted).toBe(false);
        expect(result.data!.participantIds).toHaveLength(3);
        expect(result.data!.participants).toHaveLength(3);
        expect(result.data!.replyCount).toBe(15);
        expect(result.data!.isOrphaned).toBe(false);
      });

      it("should detect orphaned thread (root deleted)", async () => {
        mockQuery.mockResolvedValueOnce({
          data: {
            nchat_threads_by_pk: {
              id: "thread-1",
              channel_id: "channel-1",
              parent_message_id: "msg-deleted",
              message_count: 5,
              last_reply_at: "2024-01-15T12:00:00Z",
              parent_message: {
                id: "msg-deleted",
                content: "Deleted root",
                is_deleted: true,
                created_at: "2024-01-15T09:00:00Z",
                user: null,
              },
              participants: [],
            },
          },
        });

        const result = await service.getThreadLinkage("thread-1");

        expect(result.success).toBe(true);
        expect(result.data!.isRootDeleted).toBe(true);
        expect(result.data!.isOrphaned).toBe(true);
        expect(result.data!.rootMessage).toBeNull();
      });

      it("should track last activity timestamp", async () => {
        const lastReplyAt = "2024-01-15T14:30:00Z";
        mockQuery.mockResolvedValueOnce({
          data: {
            nchat_threads_by_pk: {
              id: "thread-1",
              channel_id: "channel-1",
              message_count: 10,
              last_reply_at: lastReplyAt,
              parent_message: {
                id: "msg-1",
                content: "Root",
                is_deleted: false,
                user: { id: "u1" },
              },
              participants: [],
            },
          },
        });

        const result = await service.getThreadLinkage("thread-1");

        expect(result.success).toBe(true);
        expect(result.data!.lastActivityAt.toISOString()).toBe(
          new Date(lastReplyAt).toISOString(),
        );
      });
    });

    describe("updateThreadParticipants", () => {
      it("should update participant list", async () => {
        mockMutate.mockResolvedValueOnce({ data: { affected_rows: 3 } });

        const result = await service.updateThreadParticipants("thread-1", [
          "user-1",
          "user-2",
          "user-3",
        ]);

        expect(result.success).toBe(true);
        expect(result.data!.updated).toBe(true);
        expect(mockMutate).toHaveBeenCalled();
      });
    });

    describe("handleOrphanedThread", () => {
      it("should handle orphaned thread with archive action", async () => {
        const result = await service.handleOrphanedThread(
          "thread-1",
          "archive",
        );

        expect(result.success).toBe(true);
        expect(result.data!.handled).toBe(true);
        expect(result.data!.action).toBe("archive");
      });

      it("should handle orphaned thread with delete action", async () => {
        const result = await service.handleOrphanedThread("thread-1", "delete");

        expect(result.success).toBe(true);
        expect(result.data!.action).toBe("delete");
      });

      it("should handle orphaned thread with keep action", async () => {
        const result = await service.handleOrphanedThread("thread-1", "keep");

        expect(result.success).toBe(true);
        expect(result.data!.action).toBe("keep");
      });
    });
  });

  // ==========================================================================
  // EDIT HANDLING TESTS
  // ==========================================================================

  describe("Edit Handling", () => {
    describe("handleParentEdit", () => {
      it("should return affected reply count", async () => {
        mockQuery.mockResolvedValueOnce({
          data: {
            nchat_messages: [
              {
                id: "reply-1",
                content: "Reply 1",
                created_at: "2024-01-15T10:00:00Z",
                user_id: "user-1",
              },
              {
                id: "reply-2",
                content: "Reply 2",
                created_at: "2024-01-15T10:05:00Z",
                user_id: "user-2",
              },
            ],
          },
        });

        const result = await service.handleParentEdit(
          "msg-1",
          "Updated content",
        );

        expect(result.success).toBe(true);
        expect(result.data!.affectedReplies).toBe(2);
      });

      it("should return 0 when no replies exist", async () => {
        mockQuery.mockResolvedValueOnce({
          data: { nchat_messages: [] },
        });

        const result = await service.handleParentEdit(
          "msg-1",
          "Updated content",
        );

        expect(result.success).toBe(true);
        expect(result.data!.affectedReplies).toBe(0);
      });

      it("should respect edit config setting", async () => {
        const customService = createLinkageService({
          apolloClient: mockApolloClient,
          editConfig: {
            updateReplyPreviewsOnEdit: false,
            preserveOriginalInQuotes: true,
            markEditedInReplyContext: true,
          },
        });

        const result = await customService.handleParentEdit(
          "msg-1",
          "Updated content",
        );

        expect(result.success).toBe(true);
        expect(result.data!.affectedReplies).toBe(0);
        expect(mockQuery).not.toHaveBeenCalled();
      });
    });
  });

  // ==========================================================================
  // VALIDATION & REPAIR TESTS
  // ==========================================================================

  describe("Validation & Repair", () => {
    describe("validateChannelLinkages", () => {
      it("should return valid result when no orphans", async () => {
        mockQuery.mockResolvedValueOnce({
          data: {
            orphaned_replies: [],
            orphaned_threads: [],
          },
        });

        const result = await service.validateChannelLinkages("channel-1");

        expect(result.success).toBe(true);
        expect(result.data!.isValid).toBe(true);
        expect(result.data!.orphanedReplies).toHaveLength(0);
        expect(result.data!.orphanedThreads).toHaveLength(0);
      });

      it("should detect orphaned replies", async () => {
        mockQuery.mockResolvedValueOnce({
          data: {
            orphaned_replies: [
              { id: "orphan-1", parent_message_id: "deleted-1" },
              { id: "orphan-2", parent_message_id: "deleted-2" },
            ],
            orphaned_threads: [],
          },
        });

        const result = await service.validateChannelLinkages("channel-1");

        expect(result.success).toBe(true);
        expect(result.data!.isValid).toBe(false);
        expect(result.data!.orphanedReplies).toHaveLength(2);
        expect(result.data!.orphanedReplies).toContain("orphan-1");
      });

      it("should detect orphaned threads", async () => {
        mockQuery.mockResolvedValueOnce({
          data: {
            orphaned_replies: [],
            orphaned_threads: [
              { id: "thread-orphan-1", parent_message_id: "deleted-root" },
            ],
          },
        });

        const result = await service.validateChannelLinkages("channel-1");

        expect(result.success).toBe(true);
        expect(result.data!.isValid).toBe(false);
        expect(result.data!.orphanedThreads).toHaveLength(1);
      });

      it("should provide summary in validation result", async () => {
        mockQuery.mockResolvedValueOnce({
          data: {
            orphaned_replies: [{ id: "o1" }, { id: "o2" }],
            orphaned_threads: [{ id: "t1" }],
          },
        });

        const result = await service.validateChannelLinkages("channel-1");

        expect(result.success).toBe(true);
        expect(result.data!.summary).toContain("2 orphaned replies");
        expect(result.data!.summary).toContain("1 orphaned threads");
      });
    });

    describe("repairLinkages", () => {
      it("should remove orphaned reply references", async () => {
        mockQuery.mockResolvedValueOnce({
          data: {
            orphaned_replies: [{ id: "orphan-1" }, { id: "orphan-2" }],
            orphaned_threads: [],
          },
        });
        mockMutate.mockResolvedValue({ data: {} });

        const options: LinkageRepairOptions = {
          orphanedReplyAction: "remove_reference",
          orphanedThreadAction: "keep",
          updateQuoteSnapshots: false,
          cascadeDeleteThreadReplies: false,
        };

        const result = await service.repairLinkages("channel-1", options);

        expect(result.success).toBe(true);
        expect(result.data!.repairedCount).toBe(2);
        expect(result.data!.details).toContain(
          "Removed reference from reply orphan-1",
        );
        expect(result.data!.details).toContain(
          "Removed reference from reply orphan-2",
        );
      });

      it("should archive orphaned threads", async () => {
        mockQuery.mockResolvedValueOnce({
          data: {
            orphaned_replies: [],
            orphaned_threads: [{ id: "thread-1" }],
          },
        });

        const options: LinkageRepairOptions = {
          orphanedReplyAction: "keep",
          orphanedThreadAction: "archive",
          updateQuoteSnapshots: false,
          cascadeDeleteThreadReplies: false,
        };

        const result = await service.repairLinkages("channel-1", options);

        expect(result.success).toBe(true);
        expect(result.data!.repairedCount).toBe(1);
        expect(result.data!.details).toContain("archive thread thread-1");
      });

      it("should not repair when action is keep", async () => {
        mockQuery.mockResolvedValueOnce({
          data: {
            orphaned_replies: [{ id: "orphan-1" }],
            orphaned_threads: [{ id: "thread-1" }],
          },
        });

        const options: LinkageRepairOptions = {
          orphanedReplyAction: "keep",
          orphanedThreadAction: "keep",
          updateQuoteSnapshots: false,
          cascadeDeleteThreadReplies: false,
        };

        const result = await service.repairLinkages("channel-1", options);

        expect(result.success).toBe(true);
        expect(result.data!.repairedCount).toBe(0);
        expect(result.data!.details).toHaveLength(0);
      });
    });
  });

  // ==========================================================================
  // EXPORT / IMPORT TESTS
  // ==========================================================================

  describe("Export / Import", () => {
    describe("exportLinkages", () => {
      it("should export linkage data for messages", async () => {
        // Mock getReplyChain calls
        mockQuery.mockResolvedValueOnce({
          data: {
            nchat_messages_by_pk: {
              id: "msg-1",
              parent: {
                id: "parent-1",
                content: "Parent",
                is_deleted: false,
                is_edited: false,
                created_at: "2024-01-15T09:00:00Z",
                user: { id: "u1" },
                parent: null,
              },
            },
          },
        });
        mockQuery.mockResolvedValueOnce({
          data: { nchat_quote_snapshots: [] },
        });

        const result = await service.exportLinkages(["msg-1"]);

        expect(result.success).toBe(true);
        expect(result.data).toHaveLength(1);
        expect(result.data![0].messageId).toBe("msg-1");
        expect(result.data![0].replyChain).toContain("parent-1");
      });

      it("should include quote snapshots in export", async () => {
        mockQuery.mockResolvedValueOnce({
          data: { nchat_messages_by_pk: { id: "msg-1", parent: null } },
        });
        mockQuery.mockResolvedValueOnce({
          data: {
            nchat_quote_snapshots: [
              {
                id: "snap-1",
                original_message_id: "quoted-1",
                original_content: "Quoted content",
                original_timestamp: "2024-01-15T09:00:00Z",
                original_sender: {
                  id: "u1",
                  username: "user",
                  display_name: "User",
                },
                original_message: { is_deleted: false, is_edited: false },
              },
            ],
          },
        });

        const result = await service.exportLinkages(["msg-1"]);

        expect(result.success).toBe(true);
        expect(result.data![0].quotes).toHaveLength(1);
        expect(result.data![0].quotes[0].originalMessageId).toBe("quoted-1");
      });

      it("should handle empty message list", async () => {
        const result = await service.exportLinkages([]);

        expect(result.success).toBe(true);
        expect(result.data).toHaveLength(0);
      });
    });

    describe("importLinkages", () => {
      it("should re-link messages using mapping", async () => {
        const linkages: ExportedLinkage[] = [
          {
            messageId: "old-msg-1",
            replyChain: ["old-parent-1"],
            quotes: [],
          },
        ];

        const mapping: ImportLinkageMapping = {
          idMapping: new Map([
            ["old-msg-1", "new-msg-1"],
            ["old-parent-1", "new-parent-1"],
          ]),
          channelMapping: new Map(),
          userMapping: new Map(),
        };

        mockMutate.mockResolvedValueOnce({ data: {} });

        const result = await service.importLinkages(linkages, mapping);

        expect(result.success).toBe(true);
        expect(result.data!.linkedCount).toBe(1);
        expect(result.data!.failedCount).toBe(0);
      });

      it("should report missing mappings", async () => {
        const linkages: ExportedLinkage[] = [
          {
            messageId: "unmapped-msg",
            replyChain: [],
            quotes: [],
          },
        ];

        const mapping: ImportLinkageMapping = {
          idMapping: new Map(),
          channelMapping: new Map(),
          userMapping: new Map(),
        };

        const result = await service.importLinkages(linkages, mapping);

        expect(result.success).toBe(true);
        expect(result.data!.failedCount).toBe(1);
        expect(result.data!.errors).toContain(
          "No mapping for message unmapped-msg",
        );
      });

      it("should handle missing parent in mapping", async () => {
        const linkages: ExportedLinkage[] = [
          {
            messageId: "old-msg-1",
            replyChain: ["unmapped-parent"],
            quotes: [],
          },
        ];

        const mapping: ImportLinkageMapping = {
          idMapping: new Map([["old-msg-1", "new-msg-1"]]),
          channelMapping: new Map(),
          userMapping: new Map(),
        };

        const result = await service.importLinkages(linkages, mapping);

        expect(result.success).toBe(true);
        expect(result.data!.errors).toContain(
          "Parent unmapped-parent not found in mapping",
        );
      });
    });

    describe("validateImportLinkages", () => {
      it("should validate all mappings exist", () => {
        const linkages: ExportedLinkage[] = [
          { messageId: "msg-1", replyChain: ["parent-1"], quotes: [] },
          { messageId: "msg-2", replyChain: [], quotes: [] },
        ];

        const mapping: ImportLinkageMapping = {
          idMapping: new Map([
            ["msg-1", "new-1"],
            ["msg-2", "new-2"],
            ["parent-1", "new-parent"],
          ]),
          channelMapping: new Map(),
          userMapping: new Map(),
        };

        const result = service.validateImportLinkages(linkages, mapping);

        expect(result.valid).toBe(true);
        expect(result.missingReferences).toHaveLength(0);
        expect(result.warnings).toHaveLength(0);
      });

      it("should detect missing message mappings", () => {
        const linkages: ExportedLinkage[] = [
          { messageId: "msg-1", replyChain: [], quotes: [] },
        ];

        const mapping: ImportLinkageMapping = {
          idMapping: new Map(),
          channelMapping: new Map(),
          userMapping: new Map(),
        };

        const result = service.validateImportLinkages(linkages, mapping);

        expect(result.valid).toBe(false);
        expect(result.missingReferences).toContain("Message msg-1");
      });

      it("should warn about missing parent mappings", () => {
        const linkages: ExportedLinkage[] = [
          { messageId: "msg-1", replyChain: ["unmapped-parent"], quotes: [] },
        ];

        const mapping: ImportLinkageMapping = {
          idMapping: new Map([["msg-1", "new-1"]]),
          channelMapping: new Map(),
          userMapping: new Map(),
        };

        const result = service.validateImportLinkages(linkages, mapping);

        expect(result.valid).toBe(true); // Valid but with warnings
        expect(result.warnings.some((w) => w.includes("unmapped-parent"))).toBe(
          true,
        );
      });

      it("should warn about missing thread root", () => {
        const linkages: ExportedLinkage[] = [
          {
            messageId: "msg-1",
            replyChain: [],
            quotes: [],
            thread: {
              threadId: "thread-1",
              rootMessageId: "root-msg",
              isReply: true,
            },
          },
        ];

        const mapping: ImportLinkageMapping = {
          idMapping: new Map([["msg-1", "new-1"]]),
          channelMapping: new Map(),
          userMapping: new Map(),
        };

        const result = service.validateImportLinkages(linkages, mapping);

        expect(result.warnings.some((w) => w.includes("root-msg"))).toBe(true);
      });
    });
  });

  // ==========================================================================
  // DELETE HANDLING TESTS
  // ==========================================================================

  describe("Delete Handling", () => {
    describe("handleMessageDeletion", () => {
      it("should return affected counts", async () => {
        mockQuery.mockResolvedValueOnce({
          data: {
            nchat_messages: [{ id: "reply-1" }, { id: "reply-2" }],
          },
        });
        mockQuery.mockResolvedValueOnce({
          data: { nchat_threads_by_pk: null },
        });

        const result = await service.handleMessageDeletion("msg-1");

        expect(result.success).toBe(true);
        expect(result.data!.affectedReplies).toBe(2);
        expect(result.data!.affectedThreads).toBe(0);
      });

      it("should handle thread root deletion", async () => {
        mockQuery.mockResolvedValueOnce({
          data: { nchat_messages: [] },
        });
        mockQuery.mockResolvedValueOnce({
          data: {
            nchat_threads_by_pk: {
              id: "thread-1",
              channel_id: "channel-1",
              message_count: 10,
              parent_message: {
                id: "msg-1",
                is_deleted: false,
                user: { id: "u1" },
              },
              participants: [],
            },
          },
        });

        const result = await service.handleMessageDeletion("msg-1", {
          preserveThreads: false,
        });

        expect(result.success).toBe(true);
        expect(result.data!.affectedThreads).toBe(1);
      });

      it("should preserve thread when option is set", async () => {
        mockQuery.mockResolvedValueOnce({
          data: { nchat_messages: [] },
        });
        mockQuery.mockResolvedValueOnce({
          data: {
            nchat_threads_by_pk: {
              id: "thread-1",
              channel_id: "channel-1",
              message_count: 5,
              parent_message: {
                id: "msg-1",
                is_deleted: false,
                user: { id: "u1" },
              },
              participants: [],
            },
          },
        });

        const result = await service.handleMessageDeletion("msg-1", {
          preserveThreads: true,
        });

        expect(result.success).toBe(true);
        expect(result.data!.affectedThreads).toBe(1);
      });
    });

    describe("handleBulkDeletion", () => {
      it("should aggregate counts from multiple deletions", async () => {
        // First message
        mockQuery.mockResolvedValueOnce({
          data: { nchat_messages: [{ id: "r1" }] },
        });
        mockQuery.mockResolvedValueOnce({
          data: { nchat_threads_by_pk: null },
        });

        // Second message
        mockQuery.mockResolvedValueOnce({
          data: { nchat_messages: [{ id: "r2" }, { id: "r3" }] },
        });
        mockQuery.mockResolvedValueOnce({
          data: { nchat_threads_by_pk: null },
        });

        // Third message
        mockQuery.mockResolvedValueOnce({ data: { nchat_messages: [] } });
        mockQuery.mockResolvedValueOnce({
          data: {
            nchat_threads_by_pk: {
              id: "thread-1",
              message_count: 5,
              parent_message: {
                id: "msg-3",
                is_deleted: false,
                user: { id: "u1" },
              },
              participants: [],
            },
          },
        });

        const result = await service.handleBulkDeletion([
          "msg-1",
          "msg-2",
          "msg-3",
        ]);

        expect(result.success).toBe(true);
        expect(result.data!.totalAffectedReplies).toBe(3);
        expect(result.data!.totalAffectedThreads).toBe(1);
      });

      it("should handle empty array", async () => {
        const result = await service.handleBulkDeletion([]);

        expect(result.success).toBe(true);
        expect(result.data!.totalAffectedReplies).toBe(0);
        expect(result.data!.totalAffectedThreads).toBe(0);
      });
    });
  });

  // ==========================================================================
  // SERVICE CONFIGURATION TESTS
  // ==========================================================================

  describe("Service Configuration", () => {
    it("should use default edit config", () => {
      const defaultService = createLinkageService({
        apolloClient: mockApolloClient,
      });
      expect(defaultService).toBeDefined();
    });

    it("should accept custom edit config", () => {
      const customConfig: LinkageEditConfig = {
        updateReplyPreviewsOnEdit: false,
        preserveOriginalInQuotes: false,
        markEditedInReplyContext: false,
      };

      const customService = createLinkageService({
        apolloClient: mockApolloClient,
        editConfig: customConfig,
      });

      expect(customService).toBeDefined();
    });
  });
});
