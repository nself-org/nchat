/**
 * @fileoverview Tests for Presence Tracker
 */

import {
  PresenceTracker,
  getPresenceTracker,
  destroyPresenceTracker,
} from "../presence-tracker";

describe("PresenceTracker", () => {
  let tracker: PresenceTracker;

  beforeEach(() => {
    tracker = new PresenceTracker();
  });

  afterEach(() => {
    tracker.clear();
    destroyPresenceTracker();
  });

  describe("updatePresence", () => {
    it("should add a new user presence", () => {
      tracker.updatePresence("user-1", "online");

      const presence = tracker.getPresence("user-1");
      expect(presence).toBeDefined();
      expect(presence?.status).toBe("online");
      expect(presence?.userId).toBe("user-1");
    });

    it("should update existing user presence", () => {
      tracker.updatePresence("user-1", "online");
      tracker.updatePresence("user-1", "away");

      expect(tracker.getStatus("user-1")).toBe("away");
    });

    it("should include custom status", () => {
      tracker.updatePresence("user-1", "online", {
        emoji: "🎉",
        text: "Celebrating!",
      });

      const presence = tracker.getPresence("user-1");
      expect(presence?.customStatus?.emoji).toBe("🎉");
      expect(presence?.customStatus?.text).toBe("Celebrating!");
    });

    it("should set lastSeenAt for non-online statuses", () => {
      tracker.updatePresence("user-1", "away");

      const presence = tracker.getPresence("user-1");
      expect(presence?.lastSeenAt).toBeDefined();
    });

    it("should call onPresenceChange callback", () => {
      const callback = jest.fn();
      tracker.setOnPresenceChange(callback);

      tracker.updatePresence("user-1", "online");

      expect(callback).toHaveBeenCalledWith(
        "user-1",
        expect.objectContaining({
          userId: "user-1",
          status: "online",
        }),
      );
    });
  });

  describe("updateFromEvent", () => {
    it("should handle socket event format", () => {
      tracker.updateFromEvent({
        userId: "user-1",
        status: "online",
        customStatus: "Working hard",
        customEmoji: "💻",
        lastSeen: "2024-01-15T10:00:00Z",
      });

      const presence = tracker.getPresence("user-1");
      expect(presence?.status).toBe("online");
      expect(presence?.customStatus?.text).toBe("Working hard");
      expect(presence?.customStatus?.emoji).toBe("💻");
    });
  });

  describe("updateBulk", () => {
    it("should update multiple users at once", () => {
      tracker.updateBulk([
        { userId: "user-1", status: "online" },
        { userId: "user-2", status: "away" },
        { userId: "user-3", status: "dnd" },
      ]);

      expect(tracker.getStatus("user-1")).toBe("online");
      expect(tracker.getStatus("user-2")).toBe("away");
      expect(tracker.getStatus("user-3")).toBe("dnd");
    });
  });

  describe("getStatus", () => {
    it("should return offline for unknown users", () => {
      expect(tracker.getStatus("unknown")).toBe("offline");
    });

    it("should return correct status for known users", () => {
      tracker.updatePresence("user-1", "dnd");
      expect(tracker.getStatus("user-1")).toBe("dnd");
    });
  });

  describe("isOnline", () => {
    it("should return true for online status", () => {
      tracker.updatePresence("user-1", "online");
      expect(tracker.isOnline("user-1")).toBe(true);
    });

    it("should return true for dnd status", () => {
      tracker.updatePresence("user-1", "dnd");
      expect(tracker.isOnline("user-1")).toBe(true);
    });

    it("should return false for away status", () => {
      tracker.updatePresence("user-1", "away");
      expect(tracker.isOnline("user-1")).toBe(false);
    });

    it("should return false for unknown users", () => {
      expect(tracker.isOnline("unknown")).toBe(false);
    });
  });

  describe("isActive", () => {
    it("should return true for online, away, and dnd", () => {
      tracker.updatePresence("user-1", "online");
      tracker.updatePresence("user-2", "away");
      tracker.updatePresence("user-3", "dnd");

      expect(tracker.isActive("user-1")).toBe(true);
      expect(tracker.isActive("user-2")).toBe(true);
      expect(tracker.isActive("user-3")).toBe(true);
    });

    it("should return false for offline and invisible", () => {
      tracker.updatePresence("user-1", "offline");
      tracker.updatePresence("user-2", "invisible");

      expect(tracker.isActive("user-1")).toBe(false);
      expect(tracker.isActive("user-2")).toBe(false);
    });
  });

  describe("getOnlineUsers", () => {
    it("should return only online and dnd users", () => {
      tracker.updatePresence("user-1", "online");
      tracker.updatePresence("user-2", "away");
      tracker.updatePresence("user-3", "dnd");
      tracker.updatePresence("user-4", "offline");

      const onlineUsers = tracker.getOnlineUsers();
      expect(onlineUsers).toHaveLength(2);
      expect(onlineUsers.map((u) => u.userId)).toContain("user-1");
      expect(onlineUsers.map((u) => u.userId)).toContain("user-3");
    });
  });

  describe("getActiveUsers", () => {
    it("should return online, away, and dnd users", () => {
      tracker.updatePresence("user-1", "online");
      tracker.updatePresence("user-2", "away");
      tracker.updatePresence("user-3", "dnd");
      tracker.updatePresence("user-4", "offline");

      const activeUsers = tracker.getActiveUsers();
      expect(activeUsers).toHaveLength(3);
    });
  });

  describe("getUsersByStatus", () => {
    it("should filter users by status", () => {
      tracker.updatePresence("user-1", "away");
      tracker.updatePresence("user-2", "away");
      tracker.updatePresence("user-3", "online");

      const awayUsers = tracker.getUsersByStatus("away");
      expect(awayUsers).toHaveLength(2);
    });
  });

  describe("getOnlineCount", () => {
    it("should return correct count", () => {
      tracker.updatePresence("user-1", "online");
      tracker.updatePresence("user-2", "dnd");
      tracker.updatePresence("user-3", "offline");

      expect(tracker.getOnlineCount()).toBe(2);
    });
  });

  describe("setOffline", () => {
    it("should set user to offline with lastSeenAt", () => {
      tracker.updatePresence("user-1", "online");
      tracker.setOffline("user-1");

      expect(tracker.getStatus("user-1")).toBe("offline");
      expect(tracker.getLastSeen("user-1")).toBeDefined();
    });
  });

  describe("removeUser", () => {
    it("should remove user from tracker", () => {
      tracker.updatePresence("user-1", "online");
      tracker.removeUser("user-1");

      expect(tracker.hasUser("user-1")).toBe(false);
    });
  });

  describe("clearExpiredStatuses", () => {
    it("should clear expired custom statuses", () => {
      const expiredDate = new Date(Date.now() - 1000); // 1 second ago

      tracker.updatePresence("user-1", "online", {
        text: "Expired status",
        expiresAt: expiredDate,
      });

      tracker.clearExpiredStatuses();

      const presence = tracker.getPresence("user-1");
      expect(presence?.customStatus).toBeUndefined();
    });

    it("should keep non-expired custom statuses", () => {
      const futureDate = new Date(Date.now() + 60000); // 1 minute from now

      tracker.updatePresence("user-1", "online", {
        text: "Active status",
        expiresAt: futureDate,
      });

      tracker.clearExpiredStatuses();

      const presence = tracker.getPresence("user-1");
      expect(presence?.customStatus?.text).toBe("Active status");
    });
  });

  describe("cleanup", () => {
    it("should remove old offline users", () => {
      jest.useFakeTimers();

      tracker = new PresenceTracker({ offlineCacheDuration: 1000 });

      // Add user and set offline with past lastSeenAt
      tracker.updatePresence(
        "user-1",
        "offline",
        undefined,
        new Date(Date.now() - 2000),
      );

      tracker.cleanup();

      expect(tracker.hasUser("user-1")).toBe(false);

      jest.useRealTimers();
    });

    it("should enforce max users limit", () => {
      tracker = new PresenceTracker({ maxUsers: 2 });

      // Add 3 users
      tracker.updatePresence(
        "user-1",
        "offline",
        undefined,
        new Date(Date.now() - 3000),
      );
      tracker.updatePresence(
        "user-2",
        "offline",
        undefined,
        new Date(Date.now() - 2000),
      );
      tracker.updatePresence("user-3", "online");

      tracker.cleanup();

      // Should have removed oldest offline user
      expect(tracker.getTrackedUserIds()).toHaveLength(2);
      expect(tracker.hasUser("user-3")).toBe(true); // Online user kept
    });
  });

  describe("Singleton", () => {
    it("should return same instance", () => {
      const instance1 = getPresenceTracker();
      const instance2 = getPresenceTracker();

      expect(instance1).toBe(instance2);
    });

    it("should allow destroying and recreating", () => {
      const instance1 = getPresenceTracker();
      destroyPresenceTracker();

      const instance2 = getPresenceTracker();
      expect(instance1).not.toBe(instance2);
    });
  });
});
