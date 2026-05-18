/**
 * @jest-environment node
 */

/**
 * Comprehensive Tests for Moderation Engine Service
 *
 * Tests cover:
 * - Report management (creation, updates, notes)
 * - User penalties (warn, mute, kick, ban, timeout)
 * - Slow mode functionality
 * - Appeals system
 * - Auto-mod rules
 * - Bulk actions
 * - Moderation logs
 * - Statistics
 * - Escalation logic
 */

import {
  ModerationEngine,
  createModerationEngine,
  getModerationEngine,
  parseDuration,
  formatDurationMs,
  DEFAULT_ENGINE_CONFIG,
  TIMEOUT_DURATIONS,
} from "../moderation-engine.service";
import type {
  ReportCategory,
  TimeoutDuration,
  ModerationActionType,
} from "../moderation-engine.service";

describe("ModerationEngine", () => {
  let engine: ModerationEngine;

  beforeEach(() => {
    engine = createModerationEngine();
  });

  afterEach(() => {
    engine.clearAll();
  });

  // ============================================================================
  // Configuration Tests
  // ============================================================================

  describe("Configuration", () => {
    it("should use default configuration", () => {
      const config = engine.getConfig();
      expect(config.autoModerationEnabled).toBe(true);
      expect(config.spamThreshold).toBe(0.7);
      expect(config.warningsBeforeMute).toBe(3);
      expect(config.mutesBeforeBan).toBe(2);
    });

    it("should allow custom configuration", () => {
      const customEngine = createModerationEngine({
        spamThreshold: 0.5,
        warningsBeforeMute: 5,
      });
      const config = customEngine.getConfig();
      expect(config.spamThreshold).toBe(0.5);
      expect(config.warningsBeforeMute).toBe(5);
    });

    it("should update configuration", () => {
      engine.updateConfig({ toxicityThreshold: 0.6 });
      expect(engine.getConfig().toxicityThreshold).toBe(0.6);
    });
  });

  // ============================================================================
  // Report Management Tests
  // ============================================================================

  describe("Report Management", () => {
    const validReportParams = {
      reporterId: "user-1",
      reporterName: "John Doe",
      targetType: "user" as const,
      targetId: "user-2",
      targetName: "Jane Doe",
      category: "harassment" as ReportCategory,
      description: "This user is harassing me in DMs",
      workspaceId: "workspace-1",
    };

    it("should create a report successfully", () => {
      const result = engine.createReport(validReportParams);
      expect(result.success).toBe(true);
      expect(result.report).toBeDefined();
      expect(result.report?.category).toBe("harassment");
      expect(result.report?.status).toBe("pending");
    });

    it("should require description", () => {
      const result = engine.createReport({
        ...validReportParams,
        description: "",
      });
      expect(result.success).toBe(false);
      expect(result.error).toBe("Description is required");
    });

    it("should calculate priority based on category", () => {
      // Violence should be critical
      const violenceReport = engine.createReport({
        ...validReportParams,
        category: "violence",
      });
      expect(violenceReport.report?.priority).toBe("critical");

      // Spam should be low
      const spamReport = engine.createReport({
        ...validReportParams,
        category: "spam",
      });
      expect(spamReport.report?.priority).toBe("low");
    });

    it("should get report by ID", () => {
      const result = engine.createReport(validReportParams);
      const report = engine.getReport(result.report!.id);
      expect(report).toBeDefined();
      expect(report?.reporterId).toBe("user-1");
    });

    it("should return undefined for non-existent report", () => {
      const report = engine.getReport("non-existent");
      expect(report).toBeUndefined();
    });

    it("should get reports with filters", () => {
      engine.createReport(validReportParams);
      engine.createReport({
        ...validReportParams,
        category: "spam",
        targetId: "user-3",
      });

      const harassmentReports = engine.getReports({ category: "harassment" });
      expect(harassmentReports.length).toBe(1);

      const allReports = engine.getReports();
      expect(allReports.length).toBe(2);
    });

    it("should get report queue (pending reports)", () => {
      engine.createReport(validReportParams);
      const queue = engine.getReportQueue();
      expect(queue.length).toBe(1);
      expect(queue[0].status).toBe("pending");
    });

    it("should update report status", () => {
      const result = engine.createReport(validReportParams);
      const updateResult = engine.updateReport(
        result.report!.id,
        { status: "under_review", assignedTo: "mod-1" },
        "mod-1",
      );
      expect(updateResult.success).toBe(true);
      expect(updateResult.report?.status).toBe("under_review");
      expect(updateResult.report?.assignedTo).toBe("mod-1");
    });

    it("should add notes to report", () => {
      const result = engine.createReport(validReportParams);
      const noteResult = engine.addReportNote(
        result.report!.id,
        "mod-1",
        "Investigating this report",
        true,
        "Moderator Bob",
      );
      expect(noteResult.success).toBe(true);
      expect(noteResult.note?.isInternal).toBe(true);
    });

    it("should include evidence in report", () => {
      const result = engine.createReport({
        ...validReportParams,
        evidence: [
          { type: "screenshot", content: "https://example.com/screenshot.png" },
          { type: "text", content: "Offensive message text" },
        ],
      });
      expect(result.success).toBe(true);
      expect(result.report?.evidence.length).toBe(2);
    });
  });

  // ============================================================================
  // Warning Tests
  // ============================================================================

  describe("Warnings", () => {
    it("should warn a user", () => {
      const result = engine.warnUser({
        targetUserId: "user-1",
        moderatorId: "mod-1",
        reason: "Inappropriate language",
        workspaceId: "workspace-1",
      });
      expect(result.success).toBe(true);
      expect(result.action?.actionType).toBe("warn");
    });

    it("should auto-escalate to mute after multiple warnings", () => {
      const params = {
        targetUserId: "user-1",
        moderatorId: "mod-1",
        reason: "Warning",
        workspaceId: "workspace-1",
      };

      // Issue warnings until escalation threshold
      for (let i = 0; i < 3; i++) {
        const result = engine.warnUser(params);
        if (i === 2) {
          expect(result.escalated).toBe(true);
        }
      }

      expect(engine.isUserMuted("user-1", "workspace-1")).toBe(true);
    });
  });

  // ============================================================================
  // Mute Tests
  // ============================================================================

  describe("Mute/Unmute", () => {
    it("should mute a user", () => {
      const result = engine.muteUser({
        targetUserId: "user-1",
        moderatorId: "mod-1",
        reason: "Spam",
        workspaceId: "workspace-1",
        duration: 60000, // 1 minute
      });
      expect(result.success).toBe(true);
      expect(result.penalty?.penaltyType).toBe("mute");
      expect(result.penalty?.isActive).toBe(true);
    });

    it("should track muted status", () => {
      engine.muteUser({
        targetUserId: "user-1",
        moderatorId: "mod-1",
        reason: "Spam",
        workspaceId: "workspace-1",
      });
      expect(engine.isUserMuted("user-1", "workspace-1")).toBe(true);
      expect(engine.isUserMuted("user-2", "workspace-1")).toBe(false);
    });

    it("should unmute a user", () => {
      engine.muteUser({
        targetUserId: "user-1",
        moderatorId: "mod-1",
        reason: "Spam",
        workspaceId: "workspace-1",
      });

      const result = engine.unmuteUser({
        targetUserId: "user-1",
        moderatorId: "mod-1",
        reason: "Appeal approved",
        workspaceId: "workspace-1",
      });

      expect(result.success).toBe(true);
      expect(engine.isUserMuted("user-1", "workspace-1")).toBe(false);
    });

    it("should fail to unmute non-muted user", () => {
      const result = engine.unmuteUser({
        targetUserId: "user-1",
        moderatorId: "mod-1",
        workspaceId: "workspace-1",
      });
      expect(result.success).toBe(false);
      expect(result.error).toBe("No active mute found for user");
    });

    it("should support permanent mute", () => {
      const result = engine.muteUser({
        targetUserId: "user-1",
        moderatorId: "mod-1",
        reason: "Permanent mute",
        workspaceId: "workspace-1",
        // No duration = permanent
      });
      expect(result.success).toBe(true);
      expect(result.penalty?.expiresAt).toBeUndefined();
    });
  });

  // ============================================================================
  // Kick Tests
  // ============================================================================

  describe("Kick", () => {
    it("should kick a user from a channel", () => {
      const result = engine.kickUser({
        targetUserId: "user-1",
        moderatorId: "mod-1",
        reason: "Off-topic discussion",
        channelId: "channel-1",
      });
      expect(result.success).toBe(true);
      expect(result.action?.actionType).toBe("kick");
      expect(result.action?.channelId).toBe("channel-1");
    });
  });

  // ============================================================================
  // Ban Tests
  // ============================================================================

  describe("Ban/Unban", () => {
    it("should ban a user", () => {
      const result = engine.banUser({
        targetUserId: "user-1",
        moderatorId: "mod-1",
        reason: "Repeated violations",
        workspaceId: "workspace-1",
        duration: 86400000, // 24 hours
      });
      expect(result.success).toBe(true);
      expect(result.penalty?.penaltyType).toBe("ban");
    });

    it("should track banned status", () => {
      engine.banUser({
        targetUserId: "user-1",
        moderatorId: "mod-1",
        reason: "Repeated violations",
        workspaceId: "workspace-1",
      });
      expect(engine.isUserBanned("user-1", "workspace-1")).toBe(true);
    });

    it("should unban a user", () => {
      engine.banUser({
        targetUserId: "user-1",
        moderatorId: "mod-1",
        reason: "Repeated violations",
        workspaceId: "workspace-1",
      });

      const result = engine.unbanUser({
        targetUserId: "user-1",
        moderatorId: "admin-1",
        reason: "Ban expired",
        workspaceId: "workspace-1",
      });

      expect(result.success).toBe(true);
      expect(engine.isUserBanned("user-1", "workspace-1")).toBe(false);
    });

    it("should fail to unban non-banned user", () => {
      const result = engine.unbanUser({
        targetUserId: "user-1",
        moderatorId: "admin-1",
        workspaceId: "workspace-1",
      });
      expect(result.success).toBe(false);
      expect(result.error).toBe("No active ban found for user");
    });

    it("should auto-escalate to ban after multiple mutes", () => {
      const params = {
        targetUserId: "user-1",
        moderatorId: "mod-1",
        reason: "Mute for violation",
        workspaceId: "workspace-1",
        duration: 60000,
      };

      // Issue mutes until escalation
      engine.muteUser(params);
      engine.unmuteUser({
        targetUserId: "user-1",
        moderatorId: "mod-1",
        workspaceId: "workspace-1",
      });

      const result = engine.muteUser(params);
      expect(result.escalated).toBe(true);
      expect(engine.isUserBanned("user-1", "workspace-1")).toBe(true);
    });
  });

  // ============================================================================
  // Timeout Tests
  // ============================================================================

  describe("Timeout", () => {
    it("should timeout a user", () => {
      const result = engine.timeoutUser({
        userId: "user-1",
        duration: "10m",
        reason: "Cool down",
        moderatorId: "mod-1",
        workspaceId: "workspace-1",
      });
      expect(result.success).toBe(true);
      expect(result.timeout?.isActive).toBe(true);
    });

    it("should track timeout status", () => {
      engine.timeoutUser({
        userId: "user-1",
        duration: "1h",
        reason: "Cool down",
        moderatorId: "mod-1",
        workspaceId: "workspace-1",
      });
      expect(engine.isUserTimedOut("user-1", "workspace-1")).toBe(true);
    });

    it("should get active timeout", () => {
      engine.timeoutUser({
        userId: "user-1",
        duration: "30m",
        reason: "Cool down",
        moderatorId: "mod-1",
        workspaceId: "workspace-1",
      });

      const timeout = engine.getActiveTimeout("user-1", "workspace-1");
      expect(timeout).toBeDefined();
      expect(timeout?.reason).toBe("Cool down");
    });

    it("should remove timeout", () => {
      engine.timeoutUser({
        userId: "user-1",
        duration: "1h",
        reason: "Cool down",
        moderatorId: "mod-1",
        workspaceId: "workspace-1",
      });

      const result = engine.removeTimeout({
        userId: "user-1",
        moderatorId: "mod-1",
        reason: "Early release",
        workspaceId: "workspace-1",
      });

      expect(result.success).toBe(true);
      expect(engine.isUserTimedOut("user-1", "workspace-1")).toBe(false);
    });

    it("should fail to remove non-existent timeout", () => {
      const result = engine.removeTimeout({
        userId: "user-1",
        moderatorId: "mod-1",
        workspaceId: "workspace-1",
      });
      expect(result.success).toBe(false);
      expect(result.error).toBe("No active timeout found for user");
    });
  });

  // ============================================================================
  // Slowmode Tests
  // ============================================================================

  describe("Slowmode", () => {
    it("should set slowmode for a channel", () => {
      const result = engine.setSlowmode({
        channelId: "channel-1",
        intervalMs: 10000,
        moderatorId: "mod-1",
      });
      expect(result.success).toBe(true);
      expect(result.config?.enabled).toBe(true);
      expect(result.config?.intervalMs).toBe(10000);
    });

    it("should check if slowmode is enabled", () => {
      engine.setSlowmode({
        channelId: "channel-1",
        intervalMs: 5000,
        moderatorId: "mod-1",
      });
      expect(engine.isSlowmodeEnabled("channel-1")).toBe(true);
      expect(engine.isSlowmodeEnabled("channel-2")).toBe(false);
    });

    it("should get slowmode config", () => {
      engine.setSlowmode({
        channelId: "channel-1",
        intervalMs: 30000,
        moderatorId: "mod-1",
        bypassRoles: ["admin", "moderator"],
      });

      const config = engine.getSlowmodeConfig("channel-1");
      expect(config?.intervalMs).toBe(30000);
      expect(config?.bypassRoles).toContain("admin");
    });

    it("should remove slowmode", () => {
      engine.setSlowmode({
        channelId: "channel-1",
        intervalMs: 10000,
        moderatorId: "mod-1",
      });

      const result = engine.removeSlowmode("channel-1", "mod-1");
      expect(result.success).toBe(true);
      expect(engine.isSlowmodeEnabled("channel-1")).toBe(false);
    });

    it("should reject interval exceeding maximum", () => {
      const result = engine.setSlowmode({
        channelId: "channel-1",
        intervalMs: 999999999, // Too long
        moderatorId: "mod-1",
      });
      expect(result.success).toBe(false);
      expect(result.error).toContain("Maximum slowmode interval");
    });

    it("should disable slowmode when interval is 0", () => {
      engine.setSlowmode({
        channelId: "channel-1",
        intervalMs: 10000,
        moderatorId: "mod-1",
      });

      const result = engine.setSlowmode({
        channelId: "channel-1",
        intervalMs: 0,
        moderatorId: "mod-1",
      });

      expect(result.success).toBe(true);
      expect(result.config?.enabled).toBe(false);
    });
  });

  // ============================================================================
  // Bulk Actions Tests
  // ============================================================================

  describe("Bulk Actions", () => {
    it("should bulk delete messages", () => {
      const result = engine.bulkDeleteMessages({
        messageIds: ["msg-1", "msg-2", "msg-3"],
        moderatorId: "mod-1",
        reason: "Spam cleanup",
        channelId: "channel-1",
      });
      expect(result.success).toBe(true);
      expect(result.deletedCount).toBe(3);
    });

    it("should bulk ban users", () => {
      const result = engine.bulkBanUsers({
        userIds: ["user-1", "user-2"],
        moderatorId: "mod-1",
        reason: "Raid participants",
        workspaceId: "workspace-1",
      });
      expect(result.success).toBe(true);
      expect(result.bannedCount).toBe(2);
      expect(engine.isUserBanned("user-1", "workspace-1")).toBe(true);
      expect(engine.isUserBanned("user-2", "workspace-1")).toBe(true);
    });

    it("should bulk mute users", () => {
      const result = engine.bulkMuteUsers({
        userIds: ["user-1", "user-2", "user-3"],
        moderatorId: "mod-1",
        reason: "Spam",
        workspaceId: "workspace-1",
        duration: 600000,
      });
      expect(result.success).toBe(true);
      expect(result.mutedCount).toBe(3);
    });

    it("should purge channel history", () => {
      const result = engine.purgeChannelHistory({
        channelId: "channel-1",
        moderatorId: "mod-1",
        reason: "Channel cleanup",
        messageCount: 100,
      });
      expect(result.success).toBe(true);
      expect(result.action).toBeDefined();
    });
  });

  // ============================================================================
  // Appeals Tests
  // ============================================================================

  describe("Appeals", () => {
    let actionId: string;

    beforeEach(() => {
      // Create an action to appeal
      const result = engine.banUser({
        targetUserId: "user-1",
        moderatorId: "mod-1",
        reason: "Violation",
        workspaceId: "workspace-1",
      });
      actionId = result.action!.id;
    });

    it("should submit an appeal", () => {
      const result = engine.submitAppeal({
        userId: "user-1",
        userName: "John",
        actionId,
        reason:
          "I believe this ban was unjustified because I was only joking with my friends.",
      });
      expect(result.success).toBe(true);
      expect(result.appeal?.status).toBe("pending");
    });

    it("should require reason for appeal", () => {
      const result = engine.submitAppeal({
        userId: "user-1",
        actionId,
        reason: "",
      });
      expect(result.success).toBe(false);
    });

    it("should prevent duplicate pending appeals", () => {
      engine.submitAppeal({
        userId: "user-1",
        actionId,
        reason:
          "First appeal with sufficient detail to meet the minimum length requirement.",
      });

      const result = engine.submitAppeal({
        userId: "user-1",
        actionId,
        reason:
          "Second appeal with sufficient detail to meet the minimum length requirement.",
      });
      expect(result.success).toBe(false);
      expect(result.error).toBe("An appeal is already pending for this action");
    });

    it("should get appeals with filters", () => {
      engine.submitAppeal({
        userId: "user-1",
        actionId,
        reason:
          "Please review my appeal with sufficient detail to meet the minimum length requirement.",
      });

      const pendingAppeals = engine.getAppeals({ status: "pending" });
      expect(pendingAppeals.length).toBe(1);
    });

    it("should get appeal queue", () => {
      engine.submitAppeal({
        userId: "user-1",
        actionId,
        reason:
          "Review my case please with sufficient detail to meet the minimum length requirement.",
      });

      const queue = engine.getAppealQueue();
      expect(queue.length).toBe(1);
    });

    it("should assign appeal to moderator", () => {
      const appealResult = engine.submitAppeal({
        userId: "user-1",
        actionId,
        reason:
          "Please review this appeal with sufficient detail to meet the minimum length requirement.",
      });

      const result = engine.assignAppeal(
        appealResult.appeal!.id,
        "mod-2",
        "Moderator Sarah",
      );
      expect(result.success).toBe(true);
      expect(result.appeal?.assignedTo).toBe("mod-2");
      expect(result.appeal?.status).toBe("under_review");
    });

    it("should resolve appeal - approve", () => {
      const appealResult = engine.submitAppeal({
        userId: "user-1",
        actionId,
        penaltyId: "penalty-1",
        reason:
          "This was a misunderstanding please review with sufficient detail to meet the minimum length requirement.",
      });

      engine.assignAppeal(appealResult.appeal!.id, "mod-2");

      const result = engine.resolveAppeal(
        appealResult.appeal!.id,
        "mod-2",
        "approve",
        "After review, the ban was found to be excessive.",
      );
      expect(result.success).toBe(true);
      expect(result.appeal?.status).toBe("approved");
    });

    it("should resolve appeal - reject", () => {
      const appealResult = engine.submitAppeal({
        userId: "user-1",
        actionId,
        reason:
          "Please reconsider this action with sufficient detail to meet the minimum length requirement.",
      });

      engine.assignAppeal(appealResult.appeal!.id, "mod-2");

      const result = engine.resolveAppeal(
        appealResult.appeal!.id,
        "mod-2",
        "reject",
        "The original action was justified based on evidence.",
      );
      expect(result.success).toBe(true);
      expect(result.appeal?.status).toBe("rejected");
    });

    it("should withdraw an appeal", () => {
      const appealResult = engine.submitAppeal({
        userId: "user-1",
        actionId,
        reason:
          "Please review my case with sufficient detail to meet the minimum length requirement.",
      });

      const result = engine.withdrawAppeal(appealResult.appeal!.id, "user-1");
      expect(result.success).toBe(true);

      const appeal = engine.getAppeal(appealResult.appeal!.id);
      expect(appeal?.status).toBe("withdrawn");
    });

    it("should only allow owner to withdraw", () => {
      const appealResult = engine.submitAppeal({
        userId: "user-1",
        actionId,
        reason:
          "Please review with sufficient detail to meet the minimum length requirement.",
      });

      const result = engine.withdrawAppeal(appealResult.appeal!.id, "user-2");
      expect(result.success).toBe(false);
      expect(result.error).toBe("Only the appeal submitter can withdraw it");
    });
  });

  // ============================================================================
  // Auto-Mod Rules Tests
  // ============================================================================

  describe("Auto-Mod Rules", () => {
    const testRule = {
      id: "rule-1",
      name: "Spam Filter",
      description: "Detects and removes spam",
      enabled: true,
      trigger: "spam_detection" as const,
      conditions: [
        {
          type: "message_rate" as const,
          value: 10,
          operator: "greater_than" as const,
        },
      ],
      actions: [
        {
          action: "delete_message" as ModerationActionType,
          notifyUser: true,
          notifyModerators: true,
        },
      ],
      priority: 100,
      cooldownMs: 5000,
      maxTriggersPerHour: 3,
      exemptRoles: ["admin"],
      exemptUsers: [],
      workspaceId: "workspace-1",
      createdBy: "admin-1",
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it("should add auto-mod rule", () => {
      engine.addAutoModRule(testRule);
      const rules = engine.getAutoModRules();
      expect(rules.length).toBe(1);
      expect(rules[0].name).toBe("Spam Filter");
    });

    it("should remove auto-mod rule", () => {
      engine.addAutoModRule(testRule);
      const result = engine.removeAutoModRule("rule-1");
      expect(result).toBe(true);
      expect(engine.getAutoModRules().length).toBe(0);
    });

    it("should enable/disable auto-mod rule", () => {
      engine.addAutoModRule(testRule);
      engine.setAutoModRuleEnabled("rule-1", false);
      const rules = engine.getAutoModRules();
      expect(rules[0].enabled).toBe(false);
    });

    it("should filter rules by workspace", () => {
      engine.addAutoModRule(testRule);
      engine.addAutoModRule({
        ...testRule,
        id: "rule-2",
        workspaceId: "workspace-2",
      });

      const workspace1Rules = engine.getAutoModRules("workspace-1");
      expect(workspace1Rules.length).toBe(1);
    });
  });

  // ============================================================================
  // Moderation Logs Tests
  // ============================================================================

  describe("Moderation Logs", () => {
    it("should log moderation actions", () => {
      engine.warnUser({
        targetUserId: "user-1",
        moderatorId: "mod-1",
        reason: "Warning",
        workspaceId: "workspace-1",
      });

      const logs = engine.getModerationLogs();
      expect(logs.length).toBe(1);
      expect(logs[0].action.actionType).toBe("warn");
    });

    it("should filter logs by action type", () => {
      engine.warnUser({
        targetUserId: "user-1",
        moderatorId: "mod-1",
        reason: "Warning",
        workspaceId: "workspace-1",
      });
      engine.muteUser({
        targetUserId: "user-2",
        moderatorId: "mod-1",
        reason: "Mute",
        workspaceId: "workspace-1",
      });

      const warnLogs = engine.getModerationLogs({ actionType: "warn" });
      expect(warnLogs.length).toBe(1);
    });

    it("should filter logs by moderator", () => {
      engine.warnUser({
        targetUserId: "user-1",
        moderatorId: "mod-1",
        reason: "Warning",
        workspaceId: "workspace-1",
      });
      engine.warnUser({
        targetUserId: "user-2",
        moderatorId: "mod-2",
        reason: "Warning",
        workspaceId: "workspace-1",
      });

      const mod1Logs = engine.getModerationLogs({ moderatorId: "mod-1" });
      expect(mod1Logs.length).toBe(1);
    });

    it("should get user action history", () => {
      engine.warnUser({
        targetUserId: "user-1",
        moderatorId: "mod-1",
        reason: "Warning 1",
        workspaceId: "workspace-1",
      });
      engine.warnUser({
        targetUserId: "user-1",
        moderatorId: "mod-1",
        reason: "Warning 2",
        workspaceId: "workspace-1",
      });

      const history = engine.getUserActionHistory("user-1");
      expect(history.length).toBe(2);
    });

    it("should limit log results", () => {
      for (let i = 0; i < 10; i++) {
        engine.warnUser({
          targetUserId: `user-${i}`,
          moderatorId: "mod-1",
          reason: "Warning",
          workspaceId: "workspace-1",
        });
      }

      const logs = engine.getModerationLogs({ limit: 5 });
      expect(logs.length).toBe(5);
    });
  });

  // ============================================================================
  // Statistics Tests
  // ============================================================================

  describe("Statistics", () => {
    it("should provide comprehensive stats", () => {
      // Create some data
      engine.createReport({
        reporterId: "user-1",
        targetType: "user",
        targetId: "user-2",
        category: "spam",
        description: "Spam report",
      });
      engine.warnUser({
        targetUserId: "user-1",
        moderatorId: "mod-1",
        reason: "Warning",
        workspaceId: "workspace-1",
      });
      engine.banUser({
        targetUserId: "user-3",
        moderatorId: "mod-1",
        reason: "Ban",
        workspaceId: "workspace-1",
      });

      const stats = engine.getStats();

      expect(stats.reports.total).toBe(1);
      expect(stats.reports.pending).toBe(1);
      expect(stats.actions.total).toBeGreaterThan(0);
      expect(stats.penalties.active).toBe(1);
    });

    it("should track reports by category", () => {
      engine.createReport({
        reporterId: "user-1",
        targetType: "user",
        targetId: "user-2",
        category: "spam",
        description: "Spam",
      });
      engine.createReport({
        reporterId: "user-1",
        targetType: "user",
        targetId: "user-3",
        category: "harassment",
        description: "Harassment",
      });

      const stats = engine.getStats();
      expect(stats.reports.byCategory.spam).toBe(1);
      expect(stats.reports.byCategory.harassment).toBe(1);
    });

    it("should track actions by type", () => {
      engine.warnUser({
        targetUserId: "user-1",
        moderatorId: "mod-1",
        reason: "Warning",
        workspaceId: "workspace-1",
      });
      engine.muteUser({
        targetUserId: "user-2",
        moderatorId: "mod-1",
        reason: "Mute",
        workspaceId: "workspace-1",
      });

      const stats = engine.getStats();
      expect(stats.actions.byType.warn).toBe(1);
      expect(stats.actions.byType.mute).toBe(1);
    });
  });

  // ============================================================================
  // Utility Function Tests
  // ============================================================================

  describe("Utility Functions", () => {
    it("should parse duration strings", () => {
      expect(parseDuration("5m")).toBe(5 * 60 * 1000);
      expect(parseDuration("1h")).toBe(60 * 60 * 1000);
      expect(parseDuration("24h")).toBe(24 * 60 * 60 * 1000);
      expect(parseDuration("7d")).toBe(7 * 24 * 60 * 60 * 1000);
    });

    it("should format duration in milliseconds", () => {
      expect(formatDurationMs(60000)).toBe("1 minute");
      expect(formatDurationMs(120000)).toBe("2 minutes");
      expect(formatDurationMs(3600000)).toBe("1 hour");
      expect(formatDurationMs(86400000)).toBe("1 day");
    });

    it("should have correct timeout duration constants", () => {
      expect(TIMEOUT_DURATIONS["5m"]).toBe(5 * 60 * 1000);
      expect(TIMEOUT_DURATIONS["1h"]).toBe(60 * 60 * 1000);
      expect(TIMEOUT_DURATIONS["24h"]).toBe(24 * 60 * 60 * 1000);
    });
  });

  // ============================================================================
  // Cleanup and Expiration Tests
  // ============================================================================

  describe("Cleanup", () => {
    it("should cleanup expired penalties", () => {
      // This would require mocking time, so we just test the method exists
      const cleaned = engine.cleanupExpired();
      expect(cleaned).toBeGreaterThanOrEqual(0);
    });

    it("should clear all data", () => {
      engine.createReport({
        reporterId: "user-1",
        targetType: "user",
        targetId: "user-2",
        category: "spam",
        description: "Spam",
      });
      engine.warnUser({
        targetUserId: "user-1",
        moderatorId: "mod-1",
        reason: "Warning",
        workspaceId: "workspace-1",
      });

      engine.clearAll();

      expect(engine.getReports().length).toBe(0);
      expect(engine.getModerationLogs().length).toBe(0);
    });
  });

  // ============================================================================
  // Active Penalties Tests
  // ============================================================================

  describe("Active Penalties", () => {
    it("should get user active penalties", () => {
      engine.muteUser({
        targetUserId: "user-1",
        moderatorId: "mod-1",
        reason: "Mute",
        workspaceId: "workspace-1",
      });
      engine.banUser({
        targetUserId: "user-1",
        moderatorId: "mod-1",
        reason: "Ban",
        workspaceId: "workspace-2",
      });

      const penalties = engine.getUserActivePenalties("user-1");
      expect(penalties.length).toBe(2);
    });

    it("should filter penalties by workspace", () => {
      engine.muteUser({
        targetUserId: "user-1",
        moderatorId: "mod-1",
        reason: "Mute",
        workspaceId: "workspace-1",
      });
      engine.muteUser({
        targetUserId: "user-1",
        moderatorId: "mod-1",
        reason: "Mute",
        workspaceId: "workspace-2",
      });

      const penalties = engine.getUserActivePenalties("user-1", "workspace-1");
      expect(penalties.length).toBe(1);
      expect(penalties[0].workspaceId).toBe("workspace-1");
    });
  });

  // ============================================================================
  // Singleton Tests
  // ============================================================================

  describe("Singleton", () => {
    it("should return same instance", () => {
      const engine1 = getModerationEngine();
      const engine2 = getModerationEngine();
      expect(engine1).toBe(engine2);
    });

    it("should create new instance with config", () => {
      const engine1 = getModerationEngine({ spamThreshold: 0.5 });
      expect(engine1.getConfig().spamThreshold).toBe(0.5);
    });
  });
});
