/**
 * Thread Service Tests
 *
 * Tests for thread lifecycle management including creation, participants,
 * following, archiving, and notifications.
 *
 * Phase 6: Task 35 - Complete channel/category/thread/forum behavior
 */

import {
  ThreadService,
  getThreadService,
  createThreadService,
} from "../thread.service";

// Mock fetch
global.fetch = jest.fn();

describe("ThreadService", () => {
  let service: ThreadService;
  const mockUserId = "user-123";

  beforeEach(() => {
    service = new ThreadService(mockUserId);
    jest.clearAllMocks();
  });

  // ===========================================================================
  // THREAD CRUD TESTS
  // ===========================================================================

  describe("createThread", () => {
    it("should create a thread successfully", async () => {
      const input = {
        channelId: "ch-1",
        parentMessageId: "msg-1",
        content: "This is a thread reply",
      };

      const mockThread = {
        id: "thread-1",
        ...input,
        creatorId: mockUserId,
        messageCount: 1,
        participantCount: 1,
        createdAt: new Date().toISOString(),
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ thread: mockThread }),
      });

      const result = await service.createThread(input);

      expect(global.fetch).toHaveBeenCalledWith("/api/threads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...input, userId: mockUserId }),
      });
      expect(result.id).toBe("thread-1");
    });

    it("should throw error on creation failure", async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: "Message not found" }),
      });

      await expect(
        service.createThread({
          channelId: "ch-1",
          parentMessageId: "invalid",
          content: "Test",
        }),
      ).rejects.toThrow("Message not found");
    });
  });

  describe("getThread", () => {
    it("should fetch a thread by ID", async () => {
      const mockThread = {
        id: "thread-1",
        channelId: "ch-1",
        messageCount: 5,
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ thread: mockThread }),
      });

      const result = await service.getThread("thread-1");

      expect(result).not.toBeNull();
      expect(result?.id).toBe("thread-1");
    });

    it("should return null for non-existent thread", async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 404,
      });

      const result = await service.getThread("non-existent");

      expect(result).toBeNull();
    });

    it("should include messages when requested", async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ thread: { id: "thread-1" } }),
      });

      await service.getThread("thread-1", true);

      expect(global.fetch).toHaveBeenCalledWith(
        "/api/threads/thread-1?includeMessages=true",
      );
    });
  });

  describe("getThreads", () => {
    it("should fetch threads list", async () => {
      const mockThreads = [{ id: "thread-1" }, { id: "thread-2" }];

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          threads: mockThreads,
          total: 2,
          hasMore: false,
        }),
      });

      const result = await service.getThreads({ channelId: "ch-1" });

      expect(result.threads).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(result.hasMore).toBe(false);
    });

    it("should pass filter options", async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ threads: [], total: 0, hasMore: false }),
      });

      await service.getThreads({
        channelId: "ch-1",
        includeArchived: true,
        limit: 10,
        offset: 20,
      });

      const url = (global.fetch as jest.Mock).mock.calls[0][0];
      expect(url).toContain("channelId=ch-1");
      expect(url).toContain("includeArchived=true");
      expect(url).toContain("limit=10");
      expect(url).toContain("offset=20");
    });
  });

  describe("getMyThreads", () => {
    it("should fetch threads for current user", async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ threads: [], total: 0, hasMore: false }),
      });

      await service.getMyThreads();

      const url = (global.fetch as jest.Mock).mock.calls[0][0];
      expect(url).toContain(`userId=${mockUserId}`);
    });
  });

  describe("getUnreadCount", () => {
    it("should fetch unread thread count", async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ count: 5 }),
      });

      const result = await service.getUnreadCount();

      expect(result).toBe(5);
    });

    it("should return 0 on error", async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
      });

      const result = await service.getUnreadCount();

      expect(result).toBe(0);
    });
  });

  // ===========================================================================
  // THREAD MESSAGES TESTS
  // ===========================================================================

  describe("replyToThread", () => {
    it("should reply to a thread", async () => {
      const mockMessage = {
        id: "msg-1",
        threadId: "thread-1",
        content: "Reply content",
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ message: mockMessage }),
      });

      const result = await service.replyToThread({
        threadId: "thread-1",
        content: "Reply content",
      });

      expect(global.fetch).toHaveBeenCalledWith(
        "/api/threads/thread-1/messages",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            content: "Reply content",
            type: "text",
            attachments: undefined,
            userId: mockUserId,
          }),
        },
      );
      expect(result.content).toBe("Reply content");
    });

    it("should include attachments", async () => {
      const attachments = [
        { type: "image", name: "test.png", url: "/test.png", size: 1024 },
      ];

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ message: { id: "msg-1" } }),
      });

      await service.replyToThread({
        threadId: "thread-1",
        content: "Reply",
        attachments,
      });

      expect(global.fetch).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          body: expect.stringContaining('"attachments"'),
        }),
      );
    });
  });

  describe("getThreadMessages", () => {
    it("should fetch thread messages", async () => {
      const mockMessages = [{ id: "msg-1" }, { id: "msg-2" }];

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ messages: mockMessages, hasMore: true }),
      });

      const result = await service.getThreadMessages("thread-1");

      expect(result.messages).toHaveLength(2);
      expect(result.hasMore).toBe(true);
    });

    it("should pass pagination options", async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ messages: [], hasMore: false }),
      });

      await service.getThreadMessages("thread-1", {
        limit: 50,
        before: "2024-01-01",
      });

      const url = (global.fetch as jest.Mock).mock.calls[0][0];
      expect(url).toContain("limit=50");
      expect(url).toContain("before=2024-01-01");
    });
  });

  // ===========================================================================
  // PARTICIPANT TESTS
  // ===========================================================================

  describe("getParticipants", () => {
    it("should fetch thread participants", async () => {
      const mockParticipants = [
        { id: "p-1", userId: "user-1" },
        { id: "p-2", userId: "user-2" },
      ];

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ participants: mockParticipants }),
      });

      const result = await service.getParticipants("thread-1");

      expect(result).toHaveLength(2);
    });
  });

  describe("followThread", () => {
    it("should follow a thread", async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      });

      await service.followThread("thread-1");

      expect(global.fetch).toHaveBeenCalledWith(
        "/api/threads/thread-1/follow",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId: mockUserId }),
        },
      );
    });
  });

  describe("unfollowThread", () => {
    it("should unfollow a thread", async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      });

      await service.unfollowThread("thread-1");

      expect(global.fetch).toHaveBeenCalledWith(
        "/api/threads/thread-1/follow",
        {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId: mockUserId }),
        },
      );
    });
  });

  describe("isFollowing", () => {
    it("should return true if user is following", async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          participants: [{ id: "p-1", userId: mockUserId }],
        }),
      });

      const result = await service.isFollowing("thread-1");

      expect(result).toBe(true);
    });

    it("should return false if user is not following", async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          participants: [{ id: "p-1", userId: "other-user" }],
        }),
      });

      const result = await service.isFollowing("thread-1");

      expect(result).toBe(false);
    });
  });

  // ===========================================================================
  // NOTIFICATION TESTS
  // ===========================================================================

  describe("updateNotifications", () => {
    it("should enable notifications", async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      });

      await service.updateNotifications("thread-1", true);

      expect(global.fetch).toHaveBeenCalledWith(
        "/api/threads/thread-1/notifications",
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId: mockUserId, enabled: true }),
        },
      );
    });
  });

  describe("muteThread", () => {
    it("should mute thread notifications", async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      });

      await service.muteThread("thread-1");

      const body = JSON.parse(
        (global.fetch as jest.Mock).mock.calls[0][1].body,
      );
      expect(body.enabled).toBe(false);
    });
  });

  describe("unmuteThread", () => {
    it("should unmute thread notifications", async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      });

      await service.unmuteThread("thread-1");

      const body = JSON.parse(
        (global.fetch as jest.Mock).mock.calls[0][1].body,
      );
      expect(body.enabled).toBe(true);
    });
  });

  // ===========================================================================
  // READ STATUS TESTS
  // ===========================================================================

  describe("markAsRead", () => {
    it("should mark thread as read", async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      });

      await service.markAsRead("thread-1");

      expect(global.fetch).toHaveBeenCalledWith("/api/threads/thread-1/read", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: mockUserId }),
      });
    });
  });

  describe("getThreadUnreadCount", () => {
    it("should get unread count for thread", async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ count: 3 }),
      });

      const result = await service.getThreadUnreadCount("thread-1");

      expect(result).toBe(3);
    });
  });

  // ===========================================================================
  // ARCHIVE TESTS
  // ===========================================================================

  describe("archiveThread", () => {
    it("should archive a thread", async () => {
      const mockThread = {
        id: "thread-1",
        isArchived: true,
        archivedAt: new Date().toISOString(),
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ thread: mockThread }),
      });

      const result = await service.archiveThread("thread-1", {
        reason: "No activity",
      });

      expect(global.fetch).toHaveBeenCalledWith(
        "/api/threads/thread-1/archive",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: mockUserId,
            reason: "No activity",
            autoArchive: false,
          }),
        },
      );
      expect(result.isArchived).toBe(true);
    });
  });

  describe("unarchiveThread", () => {
    it("should unarchive a thread", async () => {
      const mockThread = {
        id: "thread-1",
        isArchived: false,
        archivedAt: null,
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ thread: mockThread }),
      });

      const result = await service.unarchiveThread("thread-1");

      expect(result.isArchived).toBe(false);
    });
  });

  describe("setAutoArchiveDuration", () => {
    it("should set auto-archive duration", async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      });

      await service.setAutoArchiveDuration("thread-1", 1440);

      expect(global.fetch).toHaveBeenCalledWith(
        "/api/threads/thread-1/settings",
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ autoArchiveMinutes: 1440 }),
        },
      );
    });

    it('should handle "never" duration', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      });

      await service.setAutoArchiveDuration("thread-1", "never");

      const body = JSON.parse(
        (global.fetch as jest.Mock).mock.calls[0][1].body,
      );
      expect(body.autoArchiveMinutes).toBe(0);
    });
  });

  // ===========================================================================
  // LOCK TESTS
  // ===========================================================================

  describe("lockThread", () => {
    it("should lock a thread", async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      });

      await service.lockThread("thread-1");

      expect(global.fetch).toHaveBeenCalledWith("/api/threads/thread-1/lock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: mockUserId }),
      });
    });
  });

  describe("unlockThread", () => {
    it("should unlock a thread", async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      });

      await service.unlockThread("thread-1");

      expect(global.fetch).toHaveBeenCalledWith("/api/threads/thread-1/lock", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: mockUserId }),
      });
    });
  });

  // ===========================================================================
  // DELETE TESTS
  // ===========================================================================

  describe("deleteThread", () => {
    it("should delete a thread", async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      });

      await service.deleteThread("thread-1");

      expect(global.fetch).toHaveBeenCalledWith("/api/threads/thread-1", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: mockUserId }),
      });
    });

    it("should throw error on deletion failure", async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: "Permission denied" }),
      });

      await expect(service.deleteThread("thread-1")).rejects.toThrow(
        "Permission denied",
      );
    });
  });

  // ===========================================================================
  // SINGLETON FACTORY TESTS
  // ===========================================================================

  describe("getThreadService", () => {
    it("should return same instance for same user", () => {
      const service1 = getThreadService("user-1");
      const service2 = getThreadService("user-1");

      expect(service1).toBe(service2);
    });

    it("should return different instances for different users", () => {
      const service1 = getThreadService("user-1");
      const service2 = getThreadService("user-2");

      expect(service1).not.toBe(service2);
    });
  });

  describe("createThreadService", () => {
    it("should always create new instance", () => {
      const service1 = createThreadService("user-1");
      const service2 = createThreadService("user-1");

      expect(service1).not.toBe(service2);
    });
  });
});
