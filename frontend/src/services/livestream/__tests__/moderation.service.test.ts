/**
 * @jest-environment node
 */

/**
 * Livestream Moderation Service Tests
 *
 * Tests for chat moderation controls including slow mode,
 * subscriber-only mode, user bans/timeouts, and auto-moderation.
 */

import {
  LivestreamModerationService,
  createModerationService,
  getModerationService,
} from "../moderation.service";
import type { ChatMode, AutoModConfig } from "../types";

// Mock logger
jest.mock("@/lib/logger", () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

describe("LivestreamModerationService", () => {
  let service: LivestreamModerationService;
  const streamId = "stream-123";
  const broadcasterId = "broadcaster-1";
  const moderatorId = "mod-1";
  const userId = "user-1";

  beforeEach(() => {
    service = createModerationService();
  });

  // ==========================================================================
  // Moderator Management Tests
  // ==========================================================================

  describe("moderator management", () => {
    it("should add moderator to stream", async () => {
      const moderator = await service.addModerator(
        streamId,
        moderatorId,
        broadcasterId,
      );

      expect(moderator.streamId).toBe(streamId);
      expect(moderator.userId).toBe(moderatorId);
      expect(moderator.addedBy).toBe(broadcasterId);
      expect(moderator.permissions.canDeleteMessages).toBe(true);
    });

    it("should throw error when adding duplicate moderator", async () => {
      await service.addModerator(streamId, moderatorId, broadcasterId);

      await expect(
        service.addModerator(streamId, moderatorId, broadcasterId),
      ).rejects.toThrow("User is already a moderator");
    });

    it("should add moderator with custom permissions", async () => {
      const moderator = await service.addModerator(
        streamId,
        moderatorId,
        broadcasterId,
        {
          canBanUsers: true,
          canSubscriberOnlyMode: true,
        },
      );

      expect(moderator.permissions.canBanUsers).toBe(true);
      expect(moderator.permissions.canSubscriberOnlyMode).toBe(true);
      expect(moderator.permissions.canDeleteMessages).toBe(true); // Default
    });

    it("should remove moderator", async () => {
      await service.addModerator(streamId, moderatorId, broadcasterId);
      await service.removeModerator(streamId, moderatorId, broadcasterId);

      const isMod = await service.isModerator(streamId, moderatorId);
      expect(isMod).toBe(false);
    });

    it("should get all moderators for stream", async () => {
      await service.addModerator(streamId, "mod-1", broadcasterId);
      await service.addModerator(streamId, "mod-2", broadcasterId);
      await service.addModerator(streamId, "mod-3", broadcasterId);

      const moderators = await service.getModerators(streamId);

      expect(moderators.length).toBe(3);
    });

    it("should check if user is moderator", async () => {
      await service.addModerator(streamId, moderatorId, broadcasterId);

      const isMod = await service.isModerator(streamId, moderatorId);
      const isNotMod = await service.isModerator(streamId, userId);

      expect(isMod).toBe(true);
      expect(isNotMod).toBe(false);
    });

    it("should get moderator permissions", async () => {
      await service.addModerator(streamId, moderatorId, broadcasterId, {
        canBanUsers: true,
      });

      const permissions = await service.getModeratorPermissions(
        streamId,
        moderatorId,
      );

      expect(permissions?.canBanUsers).toBe(true);
      expect(permissions?.canDeleteMessages).toBe(true);
    });

    it("should return null for non-moderator permissions", async () => {
      const permissions = await service.getModeratorPermissions(
        streamId,
        userId,
      );

      expect(permissions).toBeNull();
    });
  });

  // ==========================================================================
  // Ban Management Tests
  // ==========================================================================

  describe("ban management", () => {
    it("should ban user permanently", async () => {
      const ban = await service.banUser(
        streamId,
        userId,
        moderatorId,
        "Spam",
        true,
      );

      expect(ban.userId).toBe(userId);
      expect(ban.moderatorId).toBe(moderatorId);
      expect(ban.reason).toBe("Spam");
      expect(ban.isPermanent).toBe(true);
      expect(ban.expiresAt).toBeUndefined();
    });

    it("should ban user temporarily", async () => {
      const ban = await service.banUser(
        streamId,
        userId,
        moderatorId,
        "Warning",
        false,
        60,
      );

      expect(ban.isPermanent).toBe(false);
      expect(ban.expiresAt).toBeDefined();
    });

    it("should throw error when banning already banned user", async () => {
      await service.banUser(streamId, userId, moderatorId);

      await expect(
        service.banUser(streamId, userId, moderatorId),
      ).rejects.toThrow("User is already banned");
    });

    it("should unban user", async () => {
      await service.banUser(streamId, userId, moderatorId);
      await service.unbanUser(streamId, userId, moderatorId);

      const isBanned = await service.isUserBanned(streamId, userId);
      expect(isBanned).toBe(false);
    });

    it("should get banned users", async () => {
      await service.banUser(streamId, "user-1", moderatorId);
      await service.banUser(streamId, "user-2", moderatorId);

      const banned = await service.getBannedUsers(streamId);

      expect(banned.length).toBe(2);
    });

    it("should check if user is banned", async () => {
      await service.banUser(streamId, userId, moderatorId);

      const isBanned = await service.isUserBanned(streamId, userId);
      const isNotBanned = await service.isUserBanned(streamId, "other-user");

      expect(isBanned).toBe(true);
      expect(isNotBanned).toBe(false);
    });
  });

  // ==========================================================================
  // Timeout Management Tests
  // ==========================================================================

  describe("timeout management", () => {
    it("should timeout user", async () => {
      const timeout = await service.timeoutUser(
        streamId,
        userId,
        moderatorId,
        600,
        "Cool down",
      );

      expect(timeout.userId).toBe(userId);
      expect(timeout.durationSeconds).toBe(600);
      expect(timeout.reason).toBe("Cool down");
      expect(timeout.expiresAt).toBeDefined();
    });

    it("should replace existing timeout", async () => {
      await service.timeoutUser(streamId, userId, moderatorId, 300);
      const newTimeout = await service.timeoutUser(
        streamId,
        userId,
        moderatorId,
        600,
      );

      expect(newTimeout.durationSeconds).toBe(600);

      const isTimedOut = await service.isUserTimedOut(streamId, userId);
      expect(isTimedOut?.durationSeconds).toBe(600);
    });

    it("should remove timeout", async () => {
      await service.timeoutUser(streamId, userId, moderatorId, 600);
      await service.removeTimeout(streamId, userId, moderatorId);

      const isTimedOut = await service.isUserTimedOut(streamId, userId);
      expect(isTimedOut).toBeNull();
    });

    it("should check if user is timed out", async () => {
      await service.timeoutUser(streamId, userId, moderatorId, 600);

      const timeout = await service.isUserTimedOut(streamId, userId);
      const notTimedOut = await service.isUserTimedOut(streamId, "other-user");

      expect(timeout).not.toBeNull();
      expect(notTimedOut).toBeNull();
    });
  });

  // ==========================================================================
  // Chat Settings Tests
  // ==========================================================================

  describe("chat settings", () => {
    it("should set chat mode", async () => {
      await service.setChatMode(streamId, "subscribers", moderatorId);

      const settings = service.getChatSettings(streamId);
      expect(settings.mode).toBe("subscribers");
      expect(settings.subscriberOnly).toBe(true);
    });

    it("should set slow mode", async () => {
      await service.setSlowMode(streamId, 30, moderatorId);

      const settings = service.getChatSettings(streamId);
      expect(settings.slowModeSeconds).toBe(30);
    });

    it("should set subscriber-only mode", async () => {
      await service.setSubscriberOnlyMode(streamId, true, moderatorId);

      const settings = service.getChatSettings(streamId);
      expect(settings.subscriberOnly).toBe(true);
      expect(settings.mode).toBe("subscribers");
    });

    it("should set follower-only mode", async () => {
      await service.setFollowerOnlyMode(streamId, true, moderatorId);

      const settings = service.getChatSettings(streamId);
      expect(settings.followerOnly).toBe(true);
      expect(settings.mode).toBe("followers");
    });

    it("should return default settings for new stream", () => {
      const settings = service.getChatSettings("new-stream");

      expect(settings.mode).toBe("open");
      expect(settings.slowModeSeconds).toBe(0);
      expect(settings.followerOnly).toBe(false);
      expect(settings.subscriberOnly).toBe(false);
    });
  });

  // ==========================================================================
  // Auto-Moderation Tests
  // ==========================================================================

  describe("auto-moderation", () => {
    it("should configure auto-moderation", async () => {
      const config = await service.configureAutoMod(
        streamId,
        {
          enabled: true,
          profanityFilter: true,
          spamDetection: true,
          linkBlocking: true,
          blockedWords: ["badword1", "badword2"],
        },
        moderatorId,
      );

      expect(config.enabled).toBe(true);
      expect(config.profanityFilter).toBe(true);
      expect(config.linkBlocking).toBe(true);
      expect(config.blockedWords).toEqual(["badword1", "badword2"]);
    });

    it("should get auto-mod config", () => {
      const config = service.getAutoModConfig(streamId);

      expect(config.enabled).toBe(false); // Default
      expect(config.profanityFilter).toBe(true); // Default
    });

    it("should merge partial config updates", async () => {
      await service.configureAutoMod(streamId, { enabled: true }, moderatorId);
      await service.configureAutoMod(
        streamId,
        { linkBlocking: true },
        moderatorId,
      );

      const config = service.getAutoModConfig(streamId);

      expect(config.enabled).toBe(true);
      expect(config.linkBlocking).toBe(true);
    });
  });

  // ==========================================================================
  // Message Check Tests
  // ==========================================================================

  describe("message checking", () => {
    it("should allow valid message", async () => {
      const result = await service.checkMessage(
        streamId,
        userId,
        "Hello world!",
      );

      expect(result.allowed).toBe(true);
    });

    it("should block message when chat is disabled", async () => {
      await service.setChatMode(streamId, "disabled", moderatorId);

      const result = await service.checkMessage(streamId, userId, "Hello!");

      expect(result.allowed).toBe(false);
      expect(result.reason).toBe("Chat is disabled");
    });

    it("should block message from banned user", async () => {
      await service.banUser(streamId, userId, moderatorId);

      const result = await service.checkMessage(streamId, userId, "Hello!");

      expect(result.allowed).toBe(false);
      expect(result.reason).toContain("banned");
    });

    it("should block message from timed out user", async () => {
      await service.timeoutUser(streamId, userId, moderatorId, 600);

      const result = await service.checkMessage(streamId, userId, "Hello!");

      expect(result.allowed).toBe(false);
      expect(result.reason).toContain("Timed out");
    });

    it("should block non-subscriber in subscriber-only mode", async () => {
      await service.setSubscriberOnlyMode(streamId, true, moderatorId);

      const result = await service.checkMessage(streamId, userId, "Hello!", {
        isSubscriber: false,
      });

      expect(result.allowed).toBe(false);
      expect(result.reason).toContain("Subscriber-only");
    });

    it("should allow subscriber in subscriber-only mode", async () => {
      await service.setSubscriberOnlyMode(streamId, true, moderatorId);

      const result = await service.checkMessage(streamId, userId, "Hello!", {
        isSubscriber: true,
      });

      expect(result.allowed).toBe(true);
    });

    it("should enforce slow mode", async () => {
      await service.setSlowMode(streamId, 10, moderatorId);

      // First message should be allowed
      const result1 = await service.checkMessage(streamId, userId, "Hello!");
      expect(result1.allowed).toBe(true);

      // Second immediate message should be blocked
      const result2 = await service.checkMessage(
        streamId,
        userId,
        "Hello again!",
      );
      expect(result2.allowed).toBe(false);
      expect(result2.reason).toContain("Slow mode");
    });

    it("should block profanity when enabled", async () => {
      await service.configureAutoMod(
        streamId,
        {
          enabled: true,
          profanityFilter: true,
          blockedWords: ["badword"],
        },
        moderatorId,
      );

      const result = await service.checkMessage(
        streamId,
        userId,
        "This contains badword",
      );

      expect(result.allowed).toBe(false);
      expect(result.reason).toContain("prohibited content");
    });

    it("should block excessive caps when enabled", async () => {
      await service.configureAutoMod(
        streamId,
        {
          enabled: true,
          capsLimit: 50,
        },
        moderatorId,
      );

      const result = await service.checkMessage(
        streamId,
        userId,
        "THIS IS ALL CAPS MESSAGE",
      );

      expect(result.allowed).toBe(false);
      expect(result.reason).toContain("capital letters");
    });

    it("should block links when link blocking is enabled", async () => {
      await service.configureAutoMod(
        streamId,
        {
          enabled: true,
          linkBlocking: true,
        },
        moderatorId,
      );

      const result = await service.checkMessage(
        streamId,
        userId,
        "Check out https://example.com",
      );

      expect(result.allowed).toBe(false);
      expect(result.reason).toContain("Links are not allowed");
    });

    it("should allow whitelisted links", async () => {
      await service.configureAutoMod(
        streamId,
        {
          enabled: true,
          linkBlocking: true,
          allowedLinks: ["example.com"],
        },
        moderatorId,
      );

      const result = await service.checkMessage(
        streamId,
        userId,
        "Check out example.com",
      );

      expect(result.allowed).toBe(true);
    });
  });

  // ==========================================================================
  // Moderation Log Tests
  // ==========================================================================

  describe("moderation logs", () => {
    it("should log moderation actions", async () => {
      await service.banUser(streamId, userId, moderatorId, "Spam");

      const logs = await service.getModerationLogs(streamId);

      expect(logs.length).toBeGreaterThan(0);
      expect(logs[0].action).toBe("ban");
      expect(logs[0].targetUserId).toBe(userId);
    });

    it("should filter logs by action", async () => {
      await service.banUser(streamId, "user-1", moderatorId);
      await service.timeoutUser(streamId, "user-2", moderatorId, 600);

      const banLogs = await service.getModerationLogs(streamId, {
        action: "ban",
      });
      const timeoutLogs = await service.getModerationLogs(streamId, {
        action: "timeout",
      });

      expect(banLogs.length).toBe(1);
      expect(timeoutLogs.length).toBe(1);
    });

    it("should paginate logs", async () => {
      for (let i = 0; i < 10; i++) {
        await service.addModerator(streamId, `mod-${i}`, broadcasterId);
      }

      const page1 = await service.getModerationLogs(streamId, {
        limit: 5,
        offset: 0,
      });
      const page2 = await service.getModerationLogs(streamId, {
        limit: 5,
        offset: 5,
      });

      expect(page1.length).toBe(5);
      expect(page2.length).toBe(5);
    });
  });

  // ==========================================================================
  // Cleanup Tests
  // ==========================================================================

  describe("cleanup", () => {
    it("should cleanup stream data", async () => {
      await service.addModerator(streamId, moderatorId, broadcasterId);
      await service.banUser(streamId, userId, moderatorId);
      await service.setChatMode(streamId, "subscribers", moderatorId);

      await service.cleanupStream(streamId);

      const moderators = await service.getModerators(streamId);
      const banned = await service.getBannedUsers(streamId);
      const settings = service.getChatSettings(streamId);

      expect(moderators.length).toBe(0);
      expect(banned.length).toBe(0);
      expect(settings.mode).toBe("open"); // Reset to default
    });
  });

  // ==========================================================================
  // Singleton Tests
  // ==========================================================================

  describe("singleton", () => {
    it("should return same instance", () => {
      const instance1 = getModerationService();
      const instance2 = getModerationService();

      expect(instance1).toBe(instance2);
    });
  });
});
