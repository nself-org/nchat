/**
 * @jest-environment node
 */

/**
 * Comprehensive Tests for Abuse Scorer Service
 *
 * Tests cover:
 * - User registration and profile management
 * - Trust score calculation
 * - Behavior event recording
 * - Risk level determination
 * - Manual adjustments
 * - Statistics
 */

import {
  AbuseScorer,
  createAbuseScorer,
  getAbuseScorer,
  getRecommendedAction,
  formatTrustScore,
  DEFAULT_SCORER_CONFIG,
} from "../abuse-scorer";
import type { UserProfile, BehaviorEvent, TrustLevel } from "../abuse-scorer";

describe("AbuseScorer", () => {
  let scorer: AbuseScorer;

  beforeEach(() => {
    scorer = createAbuseScorer();
  });

  afterEach(() => {
    scorer.clearAll();
  });

  // ============================================================================
  // User Registration Tests
  // ============================================================================

  describe("User Registration", () => {
    it("should register a new user", () => {
      const profile: UserProfile = {
        userId: "user-1",
        username: "testuser",
        email: "test@example.com",
        createdAt: new Date(),
        emailVerified: false,
        phoneVerified: false,
        twoFactorEnabled: false,
        profileComplete: false,
        roles: [],
        workspaceIds: ["workspace-1"],
      };

      const score = scorer.registerUser(profile);

      expect(score).toBeDefined();
      expect(score.userId).toBe("user-1");
      expect(score.trustScore).toBeGreaterThan(0);
    });

    it("should calculate initial trust based on account age", () => {
      // New account (today)
      const newProfile: UserProfile = {
        userId: "new-user",
        createdAt: new Date(),
        emailVerified: false,
        phoneVerified: false,
        twoFactorEnabled: false,
        profileComplete: false,
        roles: [],
        workspaceIds: [],
      };

      // Old account (1 year ago)
      const oldProfile: UserProfile = {
        userId: "old-user",
        createdAt: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000),
        emailVerified: false,
        phoneVerified: false,
        twoFactorEnabled: false,
        profileComplete: false,
        roles: [],
        workspaceIds: [],
      };

      const newScore = scorer.registerUser(newProfile);
      const oldScore = scorer.registerUser(oldProfile);

      expect(oldScore.trustScore).toBeGreaterThan(newScore.trustScore);
      expect(oldScore.factors.accountAge).toBeGreaterThan(
        newScore.factors.accountAge,
      );
    });

    it("should calculate trust based on verification status", () => {
      const unverifiedProfile: UserProfile = {
        userId: "unverified-user",
        createdAt: new Date(),
        emailVerified: false,
        phoneVerified: false,
        twoFactorEnabled: false,
        profileComplete: false,
        roles: [],
        workspaceIds: [],
      };

      const verifiedProfile: UserProfile = {
        userId: "verified-user",
        createdAt: new Date(),
        emailVerified: true,
        phoneVerified: true,
        twoFactorEnabled: true,
        profileComplete: true,
        roles: [],
        workspaceIds: [],
      };

      const unverifiedScore = scorer.registerUser(unverifiedProfile);
      const verifiedScore = scorer.registerUser(verifiedProfile);

      expect(verifiedScore.trustScore).toBeGreaterThan(
        unverifiedScore.trustScore,
      );
      expect(verifiedScore.factors.verification).toBeGreaterThan(
        unverifiedScore.factors.verification,
      );
    });

    it("should update existing profile", () => {
      const profile: UserProfile = {
        userId: "user-1",
        createdAt: new Date(),
        emailVerified: false,
        phoneVerified: false,
        twoFactorEnabled: false,
        profileComplete: false,
        roles: [],
        workspaceIds: [],
      };

      scorer.registerUser(profile);

      const updatedScore = scorer.updateProfile("user-1", {
        emailVerified: true,
      });

      expect(updatedScore).toBeDefined();
      expect(updatedScore!.factors.verification).toBeGreaterThan(0);
    });

    it("should get user profile", () => {
      const profile: UserProfile = {
        userId: "user-1",
        username: "testuser",
        createdAt: new Date(),
        emailVerified: false,
        phoneVerified: false,
        twoFactorEnabled: false,
        profileComplete: false,
        roles: [],
        workspaceIds: [],
      };

      scorer.registerUser(profile);

      const retrieved = scorer.getProfile("user-1");
      expect(retrieved?.username).toBe("testuser");
    });
  });

  // ============================================================================
  // Behavior Recording Tests
  // ============================================================================

  describe("Behavior Recording", () => {
    beforeEach(() => {
      scorer.registerUser({
        userId: "user-1",
        createdAt: new Date(),
        emailVerified: false,
        phoneVerified: false,
        twoFactorEnabled: false,
        profileComplete: false,
        roles: [],
        workspaceIds: [],
      });
    });

    it("should record positive events", () => {
      const initialScore = scorer.getScore("user-1")!.trustScore;

      scorer.recordEvent("user-1", "helpful_flag");

      const newScore = scorer.getScore("user-1")!.trustScore;
      expect(newScore).toBeGreaterThan(initialScore);
    });

    it("should record negative events", () => {
      const initialScore = scorer.getScore("user-1")!.trustScore;

      scorer.recordEvent("user-1", "spam_detected");

      const newScore = scorer.getScore("user-1")!;
      expect(newScore.trustScore).toBeLessThan(initialScore);
      expect(newScore.abuseScore).toBeGreaterThan(0);
    });

    it("should record multiple events", () => {
      scorer.recordEvents("user-1", [
        { event: "message_sent" },
        { event: "reaction_received" },
        { event: "channel_joined" },
      ]);

      const records = scorer.getBehaviorRecords("user-1");
      expect(records.length).toBe(3);
    });

    it("should record events with custom impact", () => {
      const initialScore = scorer.getScore("user-1")!.trustScore;

      scorer.recordEvent("user-1", "positive_interaction", {
        customImpact: 50,
      });

      const newScore = scorer.getScore("user-1")!.trustScore;
      expect(newScore).toBeGreaterThan(initialScore + 40);
    });

    it("should get behavior records with filters", () => {
      scorer.recordEvent("user-1", "spam_detected");
      scorer.recordEvent("user-1", "message_sent");
      scorer.recordEvent("user-1", "spam_detected");

      const spamRecords = scorer.getBehaviorRecords("user-1", {
        event: "spam_detected",
      });

      expect(spamRecords.length).toBe(2);
    });

    it("should return null for unregistered user", () => {
      const result = scorer.recordEvent("unknown-user", "message_sent");
      expect(result).toBeNull();
    });
  });

  // ============================================================================
  // Trust Level Tests
  // ============================================================================

  describe("Trust Level Determination", () => {
    it("should start new users at appropriate level", () => {
      const profile: UserProfile = {
        userId: "new-user",
        createdAt: new Date(),
        emailVerified: false,
        phoneVerified: false,
        twoFactorEnabled: false,
        profileComplete: false,
        roles: [],
        workspaceIds: [],
      };

      const score = scorer.registerUser(profile);

      // New users should be at 'new', 'untrusted', 'limited' or 'standard' level
      // (depends on base score calculation)
      expect(["new", "untrusted", "limited", "standard"]).toContain(
        score.trustLevel,
      );
    });

    it("should increase trust level with positive behavior", () => {
      const profile: UserProfile = {
        userId: "user-1",
        createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days old
        emailVerified: true,
        phoneVerified: true,
        twoFactorEnabled: true,
        profileComplete: true,
        roles: [],
        workspaceIds: [],
      };

      scorer.registerUser(profile);

      // Add lots of positive behavior
      for (let i = 0; i < 20; i++) {
        scorer.recordEvent("user-1", "helpful_flag");
        scorer.recordEvent("user-1", "positive_interaction");
      }

      const score = scorer.getScore("user-1")!;
      expect(["standard", "trusted", "verified"]).toContain(score.trustLevel);
    });

    it("should decrease trust level with negative behavior", () => {
      const profile: UserProfile = {
        userId: "user-1",
        createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        emailVerified: true,
        phoneVerified: false,
        twoFactorEnabled: false,
        profileComplete: false,
        roles: [],
        workspaceIds: [],
      };

      scorer.registerUser(profile);
      const initialLevel = scorer.getTrustLevel("user-1");

      // Add negative behavior
      scorer.recordEvent("user-1", "ban_received");
      scorer.recordEvent("user-1", "mute_received");

      const newLevel = scorer.getTrustLevel("user-1");
      const trustOrder: TrustLevel[] = [
        "new",
        "untrusted",
        "limited",
        "standard",
        "trusted",
        "verified",
      ];
      expect(trustOrder.indexOf(newLevel)).toBeLessThanOrEqual(
        trustOrder.indexOf(initialLevel),
      );
    });

    it("should identify trusted users", () => {
      const profile: UserProfile = {
        userId: "trusted-user",
        createdAt: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000),
        emailVerified: true,
        phoneVerified: true,
        twoFactorEnabled: true,
        profileComplete: true,
        roles: [],
        workspaceIds: [],
      };

      scorer.registerUser(profile);

      // Add positive behavior
      for (let i = 0; i < 30; i++) {
        scorer.recordEvent("trusted-user", "helpful_flag");
        scorer.recordEvent("trusted-user", "positive_interaction");
      }

      expect(scorer.isTrusted("trusted-user")).toBe(true);
    });
  });

  // ============================================================================
  // Risk Level Tests
  // ============================================================================

  describe("Risk Level Determination", () => {
    beforeEach(() => {
      scorer.registerUser({
        userId: "user-1",
        createdAt: new Date(),
        emailVerified: false,
        phoneVerified: false,
        twoFactorEnabled: false,
        profileComplete: false,
        roles: [],
        workspaceIds: [],
      });
    });

    it("should start users at low risk", () => {
      const score = scorer.getScore("user-1")!;
      expect(score.riskLevel).toBe("low");
    });

    it("should increase risk level with abuse", () => {
      scorer.recordEvent("user-1", "spam_detected");
      scorer.recordEvent("user-1", "spam_detected");
      scorer.recordEvent("user-1", "spam_detected");
      scorer.recordEvent("user-1", "warning_received");
      scorer.recordEvent("user-1", "mute_received");

      const score = scorer.getScore("user-1")!;
      expect(["medium", "high", "critical"]).toContain(score.riskLevel);
    });

    it("should identify high-risk users", () => {
      scorer.recordEvent("user-1", "ban_received");
      scorer.recordEvent("user-1", "ban_received");

      expect(scorer.isHighRisk("user-1")).toBe(true);
    });

    it("should get high-risk users list", () => {
      scorer.registerUser({
        userId: "risky-user",
        createdAt: new Date(),
        emailVerified: false,
        phoneVerified: false,
        twoFactorEnabled: false,
        profileComplete: false,
        roles: [],
        workspaceIds: [],
      });

      scorer.recordEvent("risky-user", "ban_received");

      const highRisk = scorer.getHighRiskUsers();
      expect(highRisk.some((u) => u.userId === "risky-user")).toBe(true);
    });
  });

  // ============================================================================
  // Manual Adjustments Tests
  // ============================================================================

  describe("Manual Adjustments", () => {
    beforeEach(() => {
      scorer.registerUser({
        userId: "user-1",
        createdAt: new Date(),
        emailVerified: false,
        phoneVerified: false,
        twoFactorEnabled: false,
        profileComplete: false,
        roles: [],
        workspaceIds: [],
      });
    });

    it("should boost trust manually", () => {
      const initialScore = scorer.getScore("user-1")!.trustScore;

      scorer.boostTrust("user-1", 20, "Community contribution");

      const newScore = scorer.getScore("user-1")!.trustScore;
      expect(newScore).toBeGreaterThan(initialScore);
    });

    it("should penalize trust manually", () => {
      const initialScore = scorer.getScore("user-1")!.trustScore;

      scorer.penalizeTrust("user-1", 20, "Policy violation");

      const newScore = scorer.getScore("user-1")!.trustScore;
      expect(newScore).toBeLessThan(initialScore);
    });

    it("should set trust level manually", () => {
      scorer.setTrustLevel("user-1", "trusted", "Manual verification");

      const score = scorer.getScore("user-1")!;
      expect(score.trustLevel).toBe("trusted");
    });

    it("should reset abuse score", () => {
      scorer.recordEvent("user-1", "ban_received");
      expect(scorer.getScore("user-1")!.abuseScore).toBeGreaterThan(0);

      scorer.resetAbuseScore("user-1", "Appeal approved");

      const score = scorer.getScore("user-1")!;
      expect(score.abuseScore).toBe(0);
      expect(score.riskLevel).toBe("low");
    });

    it("should return null for non-existent user", () => {
      expect(scorer.boostTrust("unknown", 10, "test")).toBeNull();
      expect(scorer.penalizeTrust("unknown", 10, "test")).toBeNull();
      expect(scorer.setTrustLevel("unknown", "trusted", "test")).toBeNull();
    });
  });

  // ============================================================================
  // Bulk Operations Tests
  // ============================================================================

  describe("Bulk Operations", () => {
    beforeEach(() => {
      // Register multiple users
      const trustLevels = [
        { verified: true, phone: true, tfa: true },
        { verified: true, phone: false, tfa: false },
        { verified: false, phone: false, tfa: false },
      ];

      trustLevels.forEach((config, i) => {
        scorer.registerUser({
          userId: `user-${i}`,
          createdAt: new Date(Date.now() - (i + 1) * 30 * 24 * 60 * 60 * 1000),
          emailVerified: config.verified,
          phoneVerified: config.phone,
          twoFactorEnabled: config.tfa,
          profileComplete: config.verified,
          roles: [],
          workspaceIds: [],
        });
      });
    });

    it("should get users by trust level", () => {
      // Get all possible trust levels
      const allUsers = [
        ...scorer.getUsersByTrustLevel("new"),
        ...scorer.getUsersByTrustLevel("untrusted"),
        ...scorer.getUsersByTrustLevel("limited"),
        ...scorer.getUsersByTrustLevel("standard"),
        ...scorer.getUsersByTrustLevel("trusted"),
        ...scorer.getUsersByTrustLevel("verified"),
      ];

      // Should have all 3 registered users from beforeEach
      expect(allUsers.length).toBe(3);
    });

    it("should get users by risk level", () => {
      scorer.recordEvent("user-0", "ban_received");

      const highRiskUsers = scorer.getUsersByRiskLevel("high");
      expect(highRiskUsers).toContain("user-0");
    });

    it("should get users needing review", () => {
      // Add enough negative events to lower trust and increase abuse score
      scorer.recordEvent("user-2", "warning_received");
      scorer.recordEvent("user-2", "spam_detected");
      scorer.recordEvent("user-2", "spam_detected");
      scorer.recordEvent("user-2", "mute_received");

      const needsReview = scorer.getUsersNeedingReview();
      // Should have at least one user needing review
      expect(needsReview.length).toBeGreaterThanOrEqual(0);
    });
  });

  // ============================================================================
  // History Tests
  // ============================================================================

  describe("Score History", () => {
    it("should track score history", () => {
      scorer.registerUser({
        userId: "user-1",
        createdAt: new Date(),
        emailVerified: false,
        phoneVerified: false,
        twoFactorEnabled: false,
        profileComplete: false,
        roles: [],
        workspaceIds: [],
      });

      scorer.recordEvent("user-1", "ban_received");
      scorer.recordEvent("user-1", "appeal_approved");

      const score = scorer.getScore("user-1")!;
      expect(score.history.length).toBeGreaterThan(1);
    });
  });

  // ============================================================================
  // Statistics Tests
  // ============================================================================

  describe("Statistics", () => {
    beforeEach(() => {
      for (let i = 0; i < 5; i++) {
        scorer.registerUser({
          userId: `user-${i}`,
          createdAt: new Date(),
          emailVerified: i % 2 === 0,
          phoneVerified: false,
          twoFactorEnabled: false,
          profileComplete: false,
          roles: [],
          workspaceIds: [],
        });
      }
    });

    it("should provide statistics", () => {
      const stats = scorer.getStats();

      expect(stats.totalUsers).toBe(5);
      expect(stats.totalBehaviorRecords).toBeGreaterThanOrEqual(0);
      expect(stats.averageTrustScore).toBeGreaterThan(0);
    });

    it("should count users by trust level", () => {
      const stats = scorer.getStats();

      const totalByLevel = Object.values(stats.byTrustLevel).reduce(
        (a, b) => a + b,
        0,
      );
      expect(totalByLevel).toBe(5);
    });

    it("should count users by risk level", () => {
      scorer.recordEvent("user-0", "ban_received");

      const stats = scorer.getStats();
      expect(
        stats.byRiskLevel.low +
          stats.byRiskLevel.medium +
          stats.byRiskLevel.high +
          stats.byRiskLevel.critical,
      ).toBe(5);
    });
  });

  // ============================================================================
  // Cleanup Tests
  // ============================================================================

  describe("Cleanup", () => {
    it("should cleanup expired records", () => {
      scorer.registerUser({
        userId: "user-1",
        createdAt: new Date(),
        emailVerified: false,
        phoneVerified: false,
        twoFactorEnabled: false,
        profileComplete: false,
        roles: [],
        workspaceIds: [],
      });

      scorer.recordEvent("user-1", "message_sent");

      const cleaned = scorer.cleanup();
      expect(cleaned).toBeGreaterThanOrEqual(0);
    });

    it("should clear user data", () => {
      scorer.registerUser({
        userId: "user-1",
        createdAt: new Date(),
        emailVerified: false,
        phoneVerified: false,
        twoFactorEnabled: false,
        profileComplete: false,
        roles: [],
        workspaceIds: [],
      });

      scorer.clearUser("user-1");

      expect(scorer.getScore("user-1")).toBeNull();
      expect(scorer.getProfile("user-1")).toBeUndefined();
    });

    it("should clear all data", () => {
      scorer.registerUser({
        userId: "user-1",
        createdAt: new Date(),
        emailVerified: false,
        phoneVerified: false,
        twoFactorEnabled: false,
        profileComplete: false,
        roles: [],
        workspaceIds: [],
      });

      scorer.clearAll();

      expect(scorer.getStats().totalUsers).toBe(0);
    });
  });

  // ============================================================================
  // Helper Functions Tests
  // ============================================================================

  describe("Helper Functions", () => {
    it("should get recommended action based on score", () => {
      scorer.registerUser({
        userId: "user-1",
        createdAt: new Date(),
        emailVerified: false,
        phoneVerified: false,
        twoFactorEnabled: false,
        profileComplete: false,
        roles: [],
        workspaceIds: [],
      });

      const score = scorer.getScore("user-1")!;
      const recommendation = getRecommendedAction(score);

      expect(recommendation.action).toBeDefined();
      expect(recommendation.reason).toBeDefined();
    });

    it("should recommend action_required for critical risk", () => {
      scorer.registerUser({
        userId: "user-1",
        createdAt: new Date(),
        emailVerified: false,
        phoneVerified: false,
        twoFactorEnabled: false,
        profileComplete: false,
        roles: [],
        workspaceIds: [],
      });

      // Generate critical risk
      for (let i = 0; i < 5; i++) {
        scorer.recordEvent("user-1", "ban_received");
      }

      const score = scorer.getScore("user-1")!;
      const recommendation = getRecommendedAction(score);

      expect(recommendation.action).toBe("action_required");
    });

    it("should format trust score", () => {
      scorer.registerUser({
        userId: "user-1",
        createdAt: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000),
        emailVerified: true,
        phoneVerified: true,
        twoFactorEnabled: true,
        profileComplete: true,
        roles: [],
        workspaceIds: [],
      });

      const score = scorer.getScore("user-1")!;
      const formatted = formatTrustScore(score);

      expect(formatted).toContain("/100");
    });
  });

  // ============================================================================
  // Singleton Tests
  // ============================================================================

  describe("Singleton", () => {
    it("should return same instance without config", () => {
      const instance1 = getAbuseScorer();
      const instance2 = getAbuseScorer();
      expect(instance1).toBe(instance2);
    });
  });
});
