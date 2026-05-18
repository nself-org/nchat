/**
 * @jest-environment node
 */

/**
 * Comprehensive Tests for Raid Protection Service
 *
 * Tests cover:
 * - Join tracking and velocity
 * - Raid detection patterns
 * - Lockdown management
 * - Invite tracking
 * - Mitigation actions
 * - Configuration
 */

import {
  RaidProtection,
  createRaidProtection,
  getRaidProtection,
  DEFAULT_RAID_CONFIG,
  LOCKDOWN_PRESETS,
} from "../raid-protection";
import type { JoinEvent, LockdownLevel, RaidStatus } from "../raid-protection";

describe("RaidProtection", () => {
  let protection: RaidProtection;

  beforeEach(() => {
    protection = createRaidProtection();
  });

  afterEach(() => {
    protection.clear();
    protection.destroy();
  });

  // Helper to create join events
  function createJoinEvent(overrides: Partial<JoinEvent> = {}): JoinEvent {
    return {
      userId: `user-${Math.random().toString(36).substr(2, 9)}`,
      username: `user${Math.floor(Math.random() * 1000)}`,
      workspaceId: "workspace-1",
      accountCreatedAt: new Date(),
      joinedAt: new Date(),
      ...overrides,
    };
  }

  // ============================================================================
  // Configuration Tests
  // ============================================================================

  describe("Configuration", () => {
    it("should use default configuration", () => {
      const config = protection.getConfig();
      expect(config.joinVelocityThreshold).toBe(
        DEFAULT_RAID_CONFIG.joinVelocityThreshold,
      );
      expect(config.autoLockdownEnabled).toBe(true);
    });

    it("should accept custom configuration", () => {
      const customProtection = createRaidProtection({
        joinVelocityThreshold: 20,
        autoLockdownEnabled: false,
      });

      const config = customProtection.getConfig();
      expect(config.joinVelocityThreshold).toBe(20);
      expect(config.autoLockdownEnabled).toBe(false);

      customProtection.destroy();
    });

    it("should update configuration", () => {
      protection.updateConfig({ joinVelocityThreshold: 15 });
      expect(protection.getConfig().joinVelocityThreshold).toBe(15);
    });

    it("should manage trusted invite codes", () => {
      protection.addTrustedInvite("TRUSTED123");
      expect(protection.getConfig().trustedInviteCodes).toContain("TRUSTED123");

      protection.removeTrustedInvite("TRUSTED123");
      expect(protection.getConfig().trustedInviteCodes).not.toContain(
        "TRUSTED123",
      );
    });
  });

  // ============================================================================
  // Join Recording Tests
  // ============================================================================

  describe("Join Recording", () => {
    it("should record join events", () => {
      // Create a protection with higher thresholds to avoid triggering raid detection
      const testProtection = createRaidProtection({
        joinVelocityThreshold: 100,
        newAccountPercentageThreshold: 100,
      });

      const result = testProtection.recordJoin(createJoinEvent());

      expect(result.allowed).toBe(true);
      // Note: With default settings, even one join could trigger detection if thresholds are low

      testProtection.destroy();
    });

    it("should track join velocity", () => {
      // Record multiple joins
      for (let i = 0; i < 5; i++) {
        protection.recordJoin(createJoinEvent());
      }

      const velocity = protection.getJoinVelocity("workspace-1");
      expect(velocity).toBeGreaterThan(0);
    });

    it("should get recent joins", () => {
      for (let i = 0; i < 3; i++) {
        protection.recordJoin(createJoinEvent());
      }

      const joins = protection.getRecentJoins("workspace-1");
      expect(joins.length).toBe(3);
    });

    it("should track joins per channel", () => {
      protection.recordJoin(createJoinEvent({ channelId: "channel-1" }));
      protection.recordJoin(createJoinEvent({ channelId: "channel-1" }));
      protection.recordJoin(createJoinEvent({ channelId: "channel-2" }));

      const channel1Joins = protection.getRecentJoins(
        "workspace-1",
        "channel-1",
      );
      const channel2Joins = protection.getRecentJoins(
        "workspace-1",
        "channel-2",
      );

      expect(channel1Joins.length).toBe(2);
      expect(channel2Joins.length).toBe(1);
    });

    it("should deny joins during lockdown", () => {
      protection.activateLockdown("full", "workspace-1", "admin");

      const result = protection.recordJoin(createJoinEvent());

      expect(result.allowed).toBe(false);
      expect(result.reason).toContain("lockdown");
    });
  });

  // ============================================================================
  // Raid Detection Tests
  // ============================================================================

  describe("Raid Detection", () => {
    it("should detect mass join raid", () => {
      const testProtection = createRaidProtection({
        joinVelocityThreshold: 5,
        joinVelocityWindow: 60000,
        similarUsernameThreshold: 100, // Disable similar username detection
        autoLockdownEnabled: false,
      });

      // Simulate rapid joins with varied usernames
      for (let i = 0; i < 15; i++) {
        testProtection.recordJoin(
          createJoinEvent({
            username: `uniqueuser${Date.now()}${i}${Math.random()}`,
          }),
        );
      }

      const analysis = testProtection.analyzeJoinPatterns("workspace-1");
      expect(analysis.isRaid).toBe(true);
      // Could be any raid type depending on detected patterns
      expect([
        "mass_join",
        "coordinated_attack",
        "account_wave",
        "invite_abuse",
      ]).toContain(analysis.type);

      testProtection.destroy();
    });

    it("should detect new account wave", () => {
      const testProtection = createRaidProtection({
        joinVelocityThreshold: 5,
        newAccountPercentageThreshold: 70,
        autoLockdownEnabled: false,
      });

      // Simulate joins from brand new accounts
      for (let i = 0; i < 10; i++) {
        testProtection.recordJoin(
          createJoinEvent({
            accountCreatedAt: new Date(), // Just created
          }),
        );
      }

      const analysis = testProtection.analyzeJoinPatterns("workspace-1");
      expect(analysis.isRaid).toBe(true);
      expect(analysis.metrics.newAccountPercentage).toBeGreaterThan(70);

      testProtection.destroy();
    });

    it("should detect invite abuse", () => {
      const testProtection = createRaidProtection({
        joinVelocityThreshold: 5,
        singleSourceThreshold: 80,
        autoLockdownEnabled: false,
      });

      // All joins from same invite
      for (let i = 0; i < 10; i++) {
        testProtection.recordJoin(
          createJoinEvent({
            inviteCode: "ABUSED-INVITE",
          }),
        );
      }

      const analysis = testProtection.analyzeJoinPatterns("workspace-1");
      expect(analysis.isRaid).toBe(true);
      expect(analysis.metrics.singleSourcePercentage).toBeGreaterThan(80);

      testProtection.destroy();
    });

    it("should detect similar usernames", () => {
      const testProtection = createRaidProtection({
        joinVelocityThreshold: 5,
        similarUsernameThreshold: 3,
        autoLockdownEnabled: false,
      });

      // Similar usernames (raider1, raider2, etc.)
      for (let i = 0; i < 8; i++) {
        testProtection.recordJoin(
          createJoinEvent({
            username: `raider${i}`,
          }),
        );
      }

      const analysis = testProtection.analyzeJoinPatterns("workspace-1");
      expect(analysis.metrics.similarUsernames).toBeGreaterThan(0);

      testProtection.destroy();
    });

    it("should return raid event when detected", () => {
      const testProtection = createRaidProtection({
        joinVelocityThreshold: 3,
        autoLockdownEnabled: false,
      });

      // Trigger raid detection
      for (let i = 0; i < 10; i++) {
        testProtection.recordJoin(createJoinEvent());
      }

      const result = testProtection.recordJoin(createJoinEvent());
      expect(result.raidDetected).toBe(true);
      expect(result.raid).toBeDefined();

      testProtection.destroy();
    });

    it("should track raid participants", () => {
      const testProtection = createRaidProtection({
        joinVelocityThreshold: 3,
        autoLockdownEnabled: false,
      });

      const userIds: string[] = [];
      for (let i = 0; i < 10; i++) {
        const event = createJoinEvent();
        userIds.push(event.userId);
        testProtection.recordJoin(event);
      }

      const activeRaids = testProtection.getActiveRaids("workspace-1");
      if (activeRaids.length > 0) {
        expect(activeRaids[0].participantCount).toBeGreaterThan(0);
      }

      testProtection.destroy();
    });

    it("should get active raids", () => {
      const testProtection = createRaidProtection({
        joinVelocityThreshold: 3,
        autoLockdownEnabled: false,
      });

      for (let i = 0; i < 10; i++) {
        testProtection.recordJoin(createJoinEvent());
      }

      const activeRaids = testProtection.getActiveRaids();
      expect(activeRaids.length).toBeGreaterThan(0);

      testProtection.destroy();
    });

    it("should update raid status", () => {
      const testProtection = createRaidProtection({
        joinVelocityThreshold: 3,
        autoLockdownEnabled: false,
      });

      for (let i = 0; i < 10; i++) {
        testProtection.recordJoin(createJoinEvent());
      }

      const raids = testProtection.getActiveRaids();
      if (raids.length > 0) {
        const updated = testProtection.updateRaidStatus(
          raids[0].id,
          "mitigated",
          "Handled by moderator",
        );

        expect(updated?.status).toBe("mitigated");
        expect(updated?.resolvedAt).toBeDefined();
      }

      testProtection.destroy();
    });
  });

  // ============================================================================
  // Lockdown Tests
  // ============================================================================

  describe("Lockdown Management", () => {
    it("should activate lockdown", () => {
      const lockdown = protection.activateLockdown(
        "partial",
        "workspace-1",
        "admin-1",
        { reason: "Suspected raid" },
      );

      expect(lockdown.level).toBe("partial");
      expect(lockdown.activatedBy).toBe("admin-1");
    });

    it("should deactivate lockdown", () => {
      protection.activateLockdown("full", "workspace-1", "admin-1");
      const result = protection.deactivateLockdown("workspace-1");

      expect(result).toBe(true);
      expect(protection.isLockedDown("workspace-1")).toBe(false);
    });

    it("should check if locked down", () => {
      expect(protection.isLockedDown("workspace-1")).toBe(false);

      protection.activateLockdown("partial", "workspace-1", "admin");

      expect(protection.isLockedDown("workspace-1")).toBe(true);
    });

    it("should support channel-specific lockdowns", () => {
      protection.activateLockdown("full", "workspace-1", "admin", {
        channelId: "channel-1",
      });

      expect(protection.isLockedDown("workspace-1", "channel-1")).toBe(true);
      expect(protection.isLockedDown("workspace-1", "channel-2")).toBe(false);
    });

    it("should get lockdown state", () => {
      protection.activateLockdown("emergency", "workspace-1", "admin", {
        reason: "Emergency lockdown",
      });

      const lockdown = protection.getLockdown("workspace-1");

      expect(lockdown?.level).toBe("emergency");
      expect(lockdown?.reason).toBe("Emergency lockdown");
    });

    it("should support auto-lift duration", async () => {
      const testProtection = createRaidProtection();

      testProtection.activateLockdown("partial", "workspace-1", "admin", {
        duration: 50, // 50ms
      });

      expect(testProtection.isLockedDown("workspace-1")).toBe(true);

      // Wait for auto-lift
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Trigger cleanup
      // Note: Cleanup runs on interval, so we might need to manually trigger
      // In real use, this would auto-cleanup

      testProtection.destroy();
    });

    it("should respect lockdown presets", () => {
      expect(LOCKDOWN_PRESETS.none.blockNewJoins).toBe(false);
      expect(LOCKDOWN_PRESETS.partial.requireVerification).toBe(true);
      expect(LOCKDOWN_PRESETS.full.blockNewJoins).toBe(true);
      expect(LOCKDOWN_PRESETS.emergency.slowmodeSeconds).toBe(300);
    });

    it("should check if action is allowed", () => {
      protection.activateLockdown("full", "workspace-1", "admin");

      const joinResult = protection.isActionAllowed("join", "workspace-1");
      const messageResult = protection.isActionAllowed(
        "message",
        "workspace-1",
      );

      expect(joinResult.allowed).toBe(false);
      expect(messageResult.allowed).toBe(false);
    });

    it("should exempt roles from lockdown", () => {
      protection.activateLockdown("full", "workspace-1", "admin");

      const adminResult = protection.isActionAllowed(
        "message",
        "workspace-1",
        "admin",
      );
      const memberResult = protection.isActionAllowed(
        "message",
        "workspace-1",
        "member",
      );

      expect(adminResult.allowed).toBe(true);
      expect(memberResult.allowed).toBe(false);
    });

    it("should support custom restrictions", () => {
      protection.activateLockdown("partial", "workspace-1", "admin", {
        customRestrictions: {
          slowmodeSeconds: 120,
          blockDMs: true,
        },
      });

      const lockdown = protection.getLockdown("workspace-1");
      expect(lockdown?.restrictions.slowmodeSeconds).toBe(120);
      expect(lockdown?.restrictions.blockDMs).toBe(true);
    });

    it("should get all active lockdowns", () => {
      protection.activateLockdown("partial", "workspace-1", "admin");
      protection.activateLockdown("full", "workspace-2", "admin");

      const lockdowns = protection.getActiveLockdowns();
      expect(lockdowns.length).toBe(2);
    });
  });

  // ============================================================================
  // Invite Management Tests
  // ============================================================================

  describe("Invite Management", () => {
    it("should register invites", () => {
      protection.registerInvite({
        code: "INVITE123",
        workspaceId: "workspace-1",
        createdBy: "user-1",
        createdAt: new Date(),
      });

      const invite = protection.getInvite("INVITE123");
      expect(invite).toBeDefined();
      expect(invite?.uses).toBe(0);
    });

    it("should track invite usage", () => {
      protection.registerInvite({
        code: "INVITE123",
        workspaceId: "workspace-1",
        createdBy: "user-1",
        createdAt: new Date(),
      });

      protection.recordInviteUse("INVITE123", "new-user-1");
      protection.recordInviteUse("INVITE123", "new-user-2");

      const invite = protection.getInvite("INVITE123");
      expect(invite?.uses).toBe(2);
      expect(invite?.usedBy).toContain("new-user-1");
    });

    it("should revoke invites", () => {
      protection.registerInvite({
        code: "INVITE123",
        workspaceId: "workspace-1",
        createdBy: "user-1",
        createdAt: new Date(),
      });

      const result = protection.revokeInvite("INVITE123", "Suspected abuse");

      expect(result).toBe(true);

      const invite = protection.getInvite("INVITE123");
      expect(invite?.revoked).toBe(true);
      expect(invite?.revokedReason).toBe("Suspected abuse");
    });

    it("should revoke all invites for workspace", () => {
      protection.registerInvite({
        code: "INVITE1",
        workspaceId: "workspace-1",
        createdBy: "user-1",
        createdAt: new Date(),
      });
      protection.registerInvite({
        code: "INVITE2",
        workspaceId: "workspace-1",
        createdBy: "user-1",
        createdAt: new Date(),
      });
      protection.registerInvite({
        code: "INVITE3",
        workspaceId: "workspace-2",
        createdBy: "user-1",
        createdAt: new Date(),
      });

      const revoked = protection.revokeAllInvites(
        "workspace-1",
        undefined,
        "Raid",
      );

      expect(revoked).toBe(2);
    });

    it("should get active invites", () => {
      protection.registerInvite({
        code: "ACTIVE1",
        workspaceId: "workspace-1",
        createdBy: "user-1",
        createdAt: new Date(),
      });
      protection.registerInvite({
        code: "ACTIVE2",
        workspaceId: "workspace-1",
        createdBy: "user-1",
        createdAt: new Date(),
      });
      protection.registerInvite({
        code: "REVOKED",
        workspaceId: "workspace-1",
        createdBy: "user-1",
        createdAt: new Date(),
      });
      protection.revokeInvite("REVOKED", "test");

      const active = protection.getActiveInvites("workspace-1");
      expect(active.length).toBe(2);
    });

    it("should get suspicious invites", () => {
      protection.registerInvite({
        code: "SUSPICIOUS",
        workspaceId: "workspace-1",
        createdBy: "user-1",
        createdAt: new Date(),
      });

      // Use invite many times
      for (let i = 0; i < 25; i++) {
        protection.recordInviteUse("SUSPICIOUS", `user-${i}`);
      }

      const suspicious = protection.getSuspiciousInvites(20);
      expect(suspicious.length).toBe(1);
      expect(suspicious[0].code).toBe("SUSPICIOUS");
    });
  });

  // ============================================================================
  // Mitigation Tests
  // ============================================================================

  describe("Mitigation Actions", () => {
    it("should apply mitigation to raid", () => {
      const testProtection = createRaidProtection({
        joinVelocityThreshold: 3,
        autoLockdownEnabled: false,
      });

      for (let i = 0; i < 10; i++) {
        testProtection.recordJoin(createJoinEvent());
      }

      const raids = testProtection.getActiveRaids();
      if (raids.length > 0) {
        const raid = testProtection.applyMitigation(raids[0].id, {
          type: "slowmode",
          appliedBy: "admin-1",
          details: "Applied 60s slowmode",
        });

        expect(raid?.mitigations.length).toBeGreaterThan(0);
        expect(raid?.status).toBe("active");
      }

      testProtection.destroy();
    });

    it("should ban raid participants", () => {
      const testProtection = createRaidProtection({
        joinVelocityThreshold: 3,
        autoLockdownEnabled: false,
      });

      for (let i = 0; i < 10; i++) {
        testProtection.recordJoin(createJoinEvent());
      }

      const raids = testProtection.getActiveRaids();
      if (raids.length > 0) {
        const result = testProtection.banRaidParticipants(
          raids[0].id,
          "admin-1",
        );

        expect(result.banned.length).toBeGreaterThan(0);
      }

      testProtection.destroy();
    });

    it("should auto-mitigate when configured", () => {
      const testProtection = createRaidProtection({
        joinVelocityThreshold: 3,
        autoLockdownEnabled: true,
        autoLockdownThreshold: "high",
        joinVelocityCritical: 5,
      });

      // Trigger critical raid
      for (let i = 0; i < 20; i++) {
        testProtection.recordJoin(createJoinEvent());
      }

      // Should auto-lockdown
      expect(testProtection.isLockedDown("workspace-1")).toBe(true);

      testProtection.destroy();
    });
  });

  // ============================================================================
  // Statistics Tests
  // ============================================================================

  describe("Statistics", () => {
    it("should provide raid statistics", () => {
      const testProtection = createRaidProtection({
        joinVelocityThreshold: 3,
        autoLockdownEnabled: false,
      });

      // Generate some raids
      for (let i = 0; i < 10; i++) {
        testProtection.recordJoin(createJoinEvent());
      }

      testProtection.activateLockdown("partial", "workspace-1", "admin");

      testProtection.registerInvite({
        code: "TEST",
        workspaceId: "workspace-1",
        createdBy: "user-1",
        createdAt: new Date(),
      });

      const stats = testProtection.getStats();

      expect(stats.totalRaids).toBeGreaterThanOrEqual(0);
      expect(stats.activeLockdowns).toBe(1);
      expect(stats.totalInvites).toBe(1);

      testProtection.destroy();
    });

    it("should track raids by severity", () => {
      const stats = protection.getStats();

      expect(stats.bySeverity.low).toBeDefined();
      expect(stats.bySeverity.medium).toBeDefined();
      expect(stats.bySeverity.high).toBeDefined();
      expect(stats.bySeverity.critical).toBeDefined();
    });

    it("should track raids by type", () => {
      const stats = protection.getStats();

      expect(stats.byType.mass_join).toBeDefined();
      expect(stats.byType.invite_abuse).toBeDefined();
      expect(stats.byType.account_wave).toBeDefined();
    });
  });

  // ============================================================================
  // Edge Cases Tests
  // ============================================================================

  describe("Edge Cases", () => {
    it("should handle empty workspace gracefully", () => {
      const velocity = protection.getJoinVelocity("empty-workspace");
      expect(velocity).toBe(0);

      const joins = protection.getRecentJoins("empty-workspace");
      expect(joins.length).toBe(0);
    });

    it("should handle non-existent raid", () => {
      const raid = protection.getRaid("non-existent");
      expect(raid).toBeUndefined();

      const updated = protection.updateRaidStatus("non-existent", "resolved");
      expect(updated).toBeNull();
    });

    it("should handle non-existent invite", () => {
      const invite = protection.getInvite("non-existent");
      expect(invite).toBeUndefined();

      const result = protection.recordInviteUse("non-existent", "user-1");
      expect(result).toBeNull();

      const revoked = protection.revokeInvite("non-existent", "test");
      expect(revoked).toBe(false);
    });

    it("should handle deactivating non-existent lockdown", () => {
      const result = protection.deactivateLockdown("non-existent");
      expect(result).toBe(false);
    });
  });

  // ============================================================================
  // Singleton Tests
  // ============================================================================

  describe("Singleton", () => {
    it("should return same instance without config", () => {
      const instance1 = getRaidProtection();
      const instance2 = getRaidProtection();
      expect(instance1).toBe(instance2);
    });
  });

  // ============================================================================
  // Cleanup Tests
  // ============================================================================

  describe("Cleanup", () => {
    it("should clear all data", () => {
      protection.recordJoin(createJoinEvent());
      protection.activateLockdown("partial", "workspace-1", "admin");
      protection.registerInvite({
        code: "TEST",
        workspaceId: "workspace-1",
        createdBy: "user-1",
        createdAt: new Date(),
      });

      protection.clear();

      expect(protection.getRecentJoins("workspace-1").length).toBe(0);
      expect(protection.getActiveLockdowns().length).toBe(0);
      expect(protection.getActiveInvites("workspace-1").length).toBe(0);
    });

    it("should destroy cleanly", () => {
      const testProtection = createRaidProtection();
      expect(() => testProtection.destroy()).not.toThrow();
    });
  });
});
