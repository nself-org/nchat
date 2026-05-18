/**
 * Archive Service Tests
 *
 * Tests for archive management including channels, threads, and posts.
 *
 * Phase 6: Task 35 - Complete channel/category/thread/forum behavior
 */

import {
  ArchiveService,
  getArchiveService,
  createArchiveService,
} from "../archive.service";

// Mock fetch
global.fetch = jest.fn();

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: jest.fn((key: string) => store[key] || null),
    setItem: jest.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: jest.fn((key: string) => {
      delete store[key];
    }),
    clear: jest.fn(() => {
      store = {};
    }),
  };
})();
Object.defineProperty(global, "localStorage", { value: localStorageMock });

describe("ArchiveService", () => {
  let service: ArchiveService;
  const mockUserId = "user-123";

  beforeEach(() => {
    service = new ArchiveService(mockUserId, "admin");
    jest.clearAllMocks();
    localStorageMock.clear();
  });

  // ===========================================================================
  // CHANNEL ARCHIVE TESTS
  // ===========================================================================

  describe("archiveChannel", () => {
    it("should archive a channel successfully", async () => {
      const mockChannel = {
        id: "ch-1",
        isArchived: true,
        archivedAt: new Date().toISOString(),
        archivedBy: mockUserId,
        archiveReason: "No longer active",
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ channel: mockChannel }),
      });

      const result = await service.archiveChannel("ch-1", {
        reason: "No longer active",
      });

      expect(global.fetch).toHaveBeenCalledWith("/api/channels/ch-1/archive", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: mockUserId,
          reason: "No longer active",
          expiresAt: undefined,
          autoArchive: false,
        }),
      });
      expect(result.isArchived).toBe(true);
      expect(result.archiveReason).toBe("No longer active");
    });

    it("should throw error on archive failure", async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: "Permission denied" }),
      });

      await expect(service.archiveChannel("ch-1")).rejects.toThrow(
        "Permission denied",
      );
    });

    it("should support auto-archive option", async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          channel: { id: "ch-1", isArchived: true, autoArchived: true },
        }),
      });

      const result = await service.archiveChannel("ch-1", {
        autoArchive: true,
      });

      const body = JSON.parse(
        (global.fetch as jest.Mock).mock.calls[0][1].body,
      );
      expect(body.autoArchive).toBe(true);
      expect(result.autoArchived).toBe(true);
    });
  });

  describe("unarchiveChannel", () => {
    it("should unarchive a channel", async () => {
      const mockChannel = {
        id: "ch-1",
        isArchived: false,
        archivedAt: null,
        archivedBy: null,
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ channel: mockChannel }),
      });

      const result = await service.unarchiveChannel("ch-1");

      expect(global.fetch).toHaveBeenCalledWith("/api/channels/ch-1/archive", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: mockUserId }),
      });
      expect(result.isArchived).toBe(false);
    });
  });

  // ===========================================================================
  // THREAD ARCHIVE TESTS
  // ===========================================================================

  describe("archiveThread", () => {
    it("should archive a thread", async () => {
      const mockThread = {
        id: "thread-1",
        isArchived: true,
        archivedAt: new Date().toISOString(),
        archiveReason: "Resolved",
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ thread: mockThread }),
      });

      const result = await service.archiveThread("thread-1", {
        reason: "Resolved",
      });

      expect(result.isArchived).toBe(true);
      expect(result.archiveReason).toBe("Resolved");
    });
  });

  describe("unarchiveThread", () => {
    it("should unarchive a thread", async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ thread: { id: "thread-1", isArchived: false } }),
      });

      const result = await service.unarchiveThread("thread-1");

      expect(result.isArchived).toBe(false);
    });
  });

  // ===========================================================================
  // POST ARCHIVE TESTS
  // ===========================================================================

  describe("archivePost", () => {
    it("should archive a post", async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ post: { id: "post-1", isArchived: true } }),
      });

      const result = await service.archivePost("post-1", {
        reason: "Outdated",
      });

      expect(result.isArchived).toBe(true);
    });
  });

  describe("unarchivePost", () => {
    it("should unarchive a post", async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ post: { id: "post-1", isArchived: false } }),
      });

      const result = await service.unarchivePost("post-1");

      expect(result.isArchived).toBe(false);
    });
  });

  // ===========================================================================
  // BULK OPERATIONS TESTS
  // ===========================================================================

  describe("bulkArchiveChannels", () => {
    it("should archive multiple channels", async () => {
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ channel: { id: "ch-1", isArchived: true } }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ channel: { id: "ch-2", isArchived: true } }),
        });

      const result = await service.bulkArchiveChannels(["ch-1", "ch-2"], {
        reason: "Cleanup",
      });

      expect(result.success).toBe(true);
      expect(result.archived).toEqual(["ch-1", "ch-2"]);
      expect(result.failed).toHaveLength(0);
    });

    it("should handle partial failures", async () => {
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ channel: { id: "ch-1", isArchived: true } }),
        })
        .mockResolvedValueOnce({
          ok: false,
          json: async () => ({ error: "Permission denied" }),
        });

      const result = await service.bulkArchiveChannels(["ch-1", "ch-2"]);

      expect(result.success).toBe(false);
      expect(result.archived).toEqual(["ch-1"]);
      expect(result.failed).toHaveLength(1);
      expect(result.failed[0].id).toBe("ch-2");
    });
  });

  describe("bulkUnarchiveChannels", () => {
    it("should unarchive multiple channels", async () => {
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ channel: { id: "ch-1", isArchived: false } }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ channel: { id: "ch-2", isArchived: false } }),
        });

      const result = await service.bulkUnarchiveChannels(["ch-1", "ch-2"]);

      expect(result.success).toBe(true);
      expect(result.archived).toEqual(["ch-1", "ch-2"]);
    });
  });

  // ===========================================================================
  // ARCHIVE HISTORY TESTS
  // ===========================================================================

  describe("getArchiveHistory", () => {
    it("should fetch archive history for an entity", async () => {
      const mockHistory = [
        {
          id: "1",
          action: "archive",
          userId: "user-1",
          createdAt: new Date().toISOString(),
        },
        {
          id: "2",
          action: "unarchive",
          userId: "user-2",
          createdAt: new Date().toISOString(),
        },
      ];

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ history: mockHistory }),
      });

      const result = await service.getArchiveHistory("channel", "ch-1");

      expect(global.fetch).toHaveBeenCalledWith(
        "/api/archive/history?entityType=channel&entityId=ch-1",
      );
      expect(result).toHaveLength(2);
    });
  });

  describe("getRecentArchiveActivity", () => {
    it("should fetch recent archive activity", async () => {
      const mockActivity = [
        { id: "1", entityType: "channel", action: "archive" },
      ];

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ activity: mockActivity }),
      });

      const result = await service.getRecentArchiveActivity("ws-1", 10);

      expect(global.fetch).toHaveBeenCalledWith(
        "/api/archive/activity?workspaceId=ws-1&limit=10",
      );
      expect(result).toHaveLength(1);
    });
  });

  // ===========================================================================
  // ARCHIVE LISTINGS TESTS
  // ===========================================================================

  describe("getArchivedChannels", () => {
    it("should fetch archived channels", async () => {
      const mockChannels = [
        {
          id: "ch-1",
          name: "archived-channel",
          archivedAt: new Date().toISOString(),
        },
      ];

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ channels: mockChannels, total: 1 }),
      });

      const result = await service.getArchivedChannels("ws-1");

      expect(result.channels).toHaveLength(1);
      expect(result.channels[0].isArchived).toBe(true);
      expect(result.total).toBe(1);
    });
  });

  describe("getArchivedThreads", () => {
    it("should fetch archived threads", async () => {
      const mockThreads = [
        {
          id: "thread-1",
          parentMessage: { content: "Original message" },
          archivedAt: new Date().toISOString(),
        },
      ];

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ threads: mockThreads, total: 1 }),
      });

      const result = await service.getArchivedThreads("ch-1");

      expect(result.threads).toHaveLength(1);
      expect(result.threads[0].type).toBe("thread");
    });
  });

  // ===========================================================================
  // SETTINGS TESTS
  // ===========================================================================

  describe("getSettings", () => {
    it("should return current settings", () => {
      const settings = service.getSettings();

      expect(settings).toHaveProperty("showArchivedChannels");
      expect(settings).toHaveProperty("showArchivedThreads");
      expect(settings).toHaveProperty("archiveNotificationEnabled");
      expect(settings).toHaveProperty("defaultAutoArchiveDays");
    });
  });

  describe("updateSettings", () => {
    it("should update settings", () => {
      service.updateSettings({ showArchivedChannels: true });

      const settings = service.getSettings();
      expect(settings.showArchivedChannels).toBe(true);
    });

    it("should persist settings to localStorage", () => {
      service.updateSettings({ showArchivedChannels: true });

      expect(localStorageMock.setItem).toHaveBeenCalled();
    });
  });

  describe("toggleShowArchivedChannels", () => {
    it("should toggle and return new value", () => {
      const initial = service.getSettings().showArchivedChannels;
      const result = service.toggleShowArchivedChannels();

      expect(result).toBe(!initial);
      expect(service.getSettings().showArchivedChannels).toBe(!initial);
    });
  });

  describe("toggleShowArchivedThreads", () => {
    it("should toggle and return new value", () => {
      const initial = service.getSettings().showArchivedThreads;
      const result = service.toggleShowArchivedThreads();

      expect(result).toBe(!initial);
      expect(service.getSettings().showArchivedThreads).toBe(!initial);
    });
  });

  // ===========================================================================
  // PERMISSION TESTS
  // ===========================================================================

  describe("canArchive", () => {
    it("should return true for admin users", async () => {
      const result = await service.canArchive("channel", "ch-1");

      expect(result).toBe(true);
    });

    it("should check permissions for moderators on channels", async () => {
      const moderatorService = new ArchiveService(mockUserId, "moderator");

      const result = await moderatorService.canArchive("channel", "ch-1");

      expect(result).toBe(false);
    });

    it("should allow moderators to archive threads", async () => {
      const moderatorService = new ArchiveService(mockUserId, "moderator");

      const result = await moderatorService.canArchive("thread", "thread-1");

      expect(result).toBe(true);
    });

    it("should check API for member permissions", async () => {
      const memberService = new ArchiveService(mockUserId, "member");

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ canArchive: false }),
      });

      const result = await memberService.canArchive("thread", "thread-1");

      expect(result).toBe(false);
    });
  });

  describe("canUnarchive", () => {
    it("should use same logic as canArchive", async () => {
      const canArchive = await service.canArchive("channel", "ch-1");
      const canUnarchive = await service.canUnarchive("channel", "ch-1");

      expect(canArchive).toBe(canUnarchive);
    });
  });

  // ===========================================================================
  // AUTO-ARCHIVE TESTS
  // ===========================================================================

  describe("setAutoArchive", () => {
    it("should set auto-archive duration", async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      });

      await service.setAutoArchive("thread-1", 1440);

      expect(global.fetch).toHaveBeenCalledWith(
        "/api/threads/thread-1/settings",
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ autoArchiveMinutes: 1440 }),
        },
      );
    });
  });

  describe("disableAutoArchive", () => {
    it("should disable auto-archive", async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      });

      await service.disableAutoArchive("thread-1");

      const body = JSON.parse(
        (global.fetch as jest.Mock).mock.calls[0][1].body,
      );
      expect(body.autoArchiveMinutes).toBe(0);
    });
  });

  describe("getAutoArchiveOptions", () => {
    it("should return available options", () => {
      const options = service.getAutoArchiveOptions();

      expect(options).toContainEqual({ label: "Never", value: 0 });
      expect(options).toContainEqual({ label: "1 hour", value: 60 });
      expect(options).toContainEqual({ label: "24 hours", value: 1440 });
      expect(options).toContainEqual({ label: "3 days", value: 4320 });
      expect(options).toContainEqual({ label: "1 week", value: 10080 });
    });
  });

  // ===========================================================================
  // SINGLETON FACTORY TESTS
  // ===========================================================================

  describe("getArchiveService", () => {
    it("should return same instance for same user and role", () => {
      const service1 = getArchiveService("user-1", "admin");
      const service2 = getArchiveService("user-1", "admin");

      expect(service1).toBe(service2);
    });

    it("should return different instances for different roles", () => {
      const service1 = getArchiveService("user-1", "admin");
      const service2 = getArchiveService("user-1", "member");

      expect(service1).not.toBe(service2);
    });
  });

  describe("createArchiveService", () => {
    it("should always create new instance", () => {
      const service1 = createArchiveService("user-1", "admin");
      const service2 = createArchiveService("user-1", "admin");

      expect(service1).not.toBe(service2);
    });
  });
});
