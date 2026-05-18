/**
 * Report System Integration Tests
 *
 * Comprehensive test suite for the complete reporting workflow
 */

import { describe, it, expect, beforeEach, afterEach } from "@jest/globals";
import {
  createReportHandler,
  createActionContext,
  type ReportAction,
} from "../report-handler";
import { ReportQueue, type CreateReportInput } from "../report-system";

describe("Report System Integration", () => {
  let handler: ReturnType<typeof createReportHandler>;
  let queue: ReportQueue;

  beforeEach(() => {
    handler = createReportHandler({
      enableAutoModeration: true,
      enableNotifications: true,
      enableEscalation: true,
    });
    queue = handler.getQueue();
  });

  afterEach(() => {
    queue.clearAll();
  });

  describe("Report Submission", () => {
    it("should submit a valid report", async () => {
      const input: CreateReportInput = {
        reporterId: "user-123",
        reporterName: "John Doe",
        targetType: "message",
        targetId: "msg-456",
        targetName: "Offensive message",
        categoryId: "spam",
        description: "This message contains spam content",
      };

      const result = await handler.submitReport(input);

      expect(result.success).toBe(true);
      expect(result.reportId).toBeTruthy();
      expect(result.newStatus).toBe("pending");

      const report = queue.getReport(result.reportId);
      expect(report).toBeTruthy();
      expect(report?.targetType).toBe("message");
      expect(report?.categoryId).toBe("spam");
    });

    it("should reject report with missing required fields", async () => {
      const input = {
        reporterId: "",
        targetType: "message",
        targetId: "msg-456",
        categoryId: "spam",
        description: "",
      } as CreateReportInput;

      const result = await handler.submitReport(input);

      expect(result.success).toBe(false);
      expect(result.error).toBeTruthy();
    });

    it("should validate evidence for categories that require it", async () => {
      const input: CreateReportInput = {
        reporterId: "user-123",
        targetType: "user",
        targetId: "user-456",
        categoryId: "harassment", // requires evidence
        description: "User is harassing me",
        evidence: [], // no evidence provided
      };

      const result = await handler.submitReport(input);

      expect(result.success).toBe(false);
      expect(result.error?.toLowerCase()).toContain("evidence");
    });

    it("should accept evidence when required", async () => {
      const input: CreateReportInput = {
        reporterId: "user-123",
        targetType: "user",
        targetId: "user-456",
        categoryId: "harassment",
        description: "User is harassing me",
        evidence: [
          {
            type: "screenshot",
            content: "https://example.com/screenshot.png",
            description: "Screenshot of harassment",
          },
        ],
      };

      const result = await handler.submitReport(input);

      expect(result.success).toBe(true);
      const report = queue.getReport(result.reportId);
      expect(report?.evidence).toHaveLength(1);
    });

    it("should detect duplicate reports", async () => {
      const input: CreateReportInput = {
        reporterId: "user-123",
        targetType: "message",
        targetId: "msg-456",
        categoryId: "spam",
        description: "Spam message",
      };

      // Submit first report
      const result1 = await handler.submitReport(input);
      expect(result1.success).toBe(true);

      // Submit duplicate
      const result2 = await handler.submitReport(input);
      expect(result2.success).toBe(false);
      expect(result2.error).toContain("Duplicate");
    });
  });

  describe("Auto-Escalation", () => {
    it("should auto-escalate hate speech reports", async () => {
      const input: CreateReportInput = {
        reporterId: "user-123",
        targetType: "message",
        targetId: "msg-456",
        categoryId: "hate-speech",
        description: "This message contains hate speech",
        evidence: [
          {
            type: "screenshot",
            content: "https://example.com/evidence.png",
          },
        ],
      };

      const result = await handler.submitReport(input);
      expect(result.success).toBe(true);

      const report = queue.getReport(result.reportId);
      expect(report?.status).toBe("escalated");
      expect(report?.priority).toBe("urgent");
    });

    it("should not auto-escalate spam reports", async () => {
      const input: CreateReportInput = {
        reporterId: "user-123",
        targetType: "message",
        targetId: "msg-456",
        categoryId: "spam",
        description: "Spam content",
      };

      const result = await handler.submitReport(input);
      const report = queue.getReport(result.reportId);

      expect(report?.status).toBe("pending");
      expect(report?.priority).toBe("low");
    });
  });

  describe("Priority Calculation", () => {
    it("should boost priority for channel reports", async () => {
      const input: CreateReportInput = {
        reporterId: "user-123",
        targetType: "channel",
        targetId: "channel-456",
        categoryId: "inappropriate-content",
        description: "Channel has inappropriate content",
        evidence: [{ type: "link", content: "https://example.com" }],
      };

      const result = await handler.submitReport(input);
      const report = queue.getReport(result.reportId);

      // Should be boosted from medium to high
      expect(report?.priority).toBe("high");
    });

    it("should boost priority for reports with multiple evidence", async () => {
      const input: CreateReportInput = {
        reporterId: "user-123",
        targetType: "user",
        targetId: "user-456",
        categoryId: "harassment",
        description: "Multiple harassment instances",
        evidence: [
          { type: "screenshot", content: "https://example.com/1.png" },
          { type: "screenshot", content: "https://example.com/2.png" },
          { type: "screenshot", content: "https://example.com/3.png" },
        ],
      };

      const result = await handler.submitReport(input);
      const report = queue.getReport(result.reportId);

      // Should be high or urgent based on evidence count
      expect(["high", "urgent"]).toContain(report?.priority);
    });
  });

  describe("Moderator Actions", () => {
    it("should approve a report", async () => {
      // Submit report
      const input: CreateReportInput = {
        reporterId: "user-123",
        targetType: "message",
        targetId: "msg-456",
        categoryId: "spam",
        description: "Possible spam",
      };
      const submitResult = await handler.submitReport(input);

      // Approve it
      const context = createActionContext(
        submitResult.reportId,
        "mod-789",
        "approve",
        {
          notes: "Not spam, false alarm",
        },
      );
      const actionResult = await handler.processAction(context);

      expect(actionResult.success).toBe(true);
      expect(actionResult.newStatus).toBe("resolved");

      const report = queue.getReport(submitResult.reportId);
      expect(report?.status).toBe("resolved");
      // Resolution may contain the notes or action type
      expect(report?.resolution).toBeDefined();
    });

    it("should dismiss a report", async () => {
      const input: CreateReportInput = {
        reporterId: "user-123",
        targetType: "message",
        targetId: "msg-456",
        categoryId: "spam",
        description: "Spam",
      };
      const submitResult = await handler.submitReport(input);

      const context = createActionContext(
        submitResult.reportId,
        "mod-789",
        "dismiss",
        {
          notes: "Duplicate report",
        },
      );
      const actionResult = await handler.processAction(context);

      expect(actionResult.success).toBe(true);
      expect(actionResult.newStatus).toBe("dismissed");
    });

    it("should escalate a report", async () => {
      const input: CreateReportInput = {
        reporterId: "user-123",
        targetType: "message",
        targetId: "msg-456",
        categoryId: "spam",
        description: "Spam",
      };
      const submitResult = await handler.submitReport(input);

      const context = createActionContext(
        submitResult.reportId,
        "mod-789",
        "escalate",
        {
          notes: "Needs admin review",
        },
      );
      const actionResult = await handler.processAction(context);

      expect(actionResult.success).toBe(true);
      expect(actionResult.newStatus).toBe("escalated");

      const report = queue.getReport(submitResult.reportId);
      expect(report?.priority).toBe("medium"); // escalated from low
      expect(report?.notes).toHaveLength(1);
    });

    it("should assign a report to moderator", async () => {
      const input: CreateReportInput = {
        reporterId: "user-123",
        targetType: "message",
        targetId: "msg-456",
        categoryId: "spam",
        description: "Spam",
      };
      const submitResult = await handler.submitReport(input);

      const context = createActionContext(
        submitResult.reportId,
        "mod-789",
        "assign",
        {
          moderatorName: "Jane Moderator",
        },
      );
      const actionResult = await handler.processAction(context);

      expect(actionResult.success).toBe(true);
      expect(actionResult.newStatus).toBe("in_review");

      const report = queue.getReport(submitResult.reportId);
      expect(report?.assignedTo).toBe("mod-789");
      expect(report?.assignedToName).toBe("Jane Moderator");
    });

    it("should handle multiple actions on same report", async () => {
      const input: CreateReportInput = {
        reporterId: "user-123",
        targetType: "user",
        targetId: "user-456",
        categoryId: "harassment",
        description: "Harassment",
        evidence: [{ type: "link", content: "https://example.com" }],
      };
      const submitResult = await handler.submitReport(input);

      // Assign to moderator
      await handler.processAction(
        createActionContext(submitResult.reportId, "mod-789", "assign"),
      );

      // Warn user
      await handler.processAction(
        createActionContext(submitResult.reportId, "mod-789", "warn-user", {
          notes: "First warning",
        }),
      );

      const report = queue.getReport(submitResult.reportId);
      expect(report?.status).toBe("resolved");
      expect(report?.assignedTo).toBe("mod-789");
    });
  });

  describe("Report Queue Management", () => {
    it("should filter reports by status", async () => {
      // Create multiple reports with different statuses
      const reports = await Promise.all([
        handler.submitReport({
          reporterId: "user-1",
          targetType: "message",
          targetId: "msg-1",
          categoryId: "spam",
          description: "Report 1",
        }),
        handler.submitReport({
          reporterId: "user-2",
          targetType: "message",
          targetId: "msg-2",
          categoryId: "spam",
          description: "Report 2",
        }),
      ]);

      // Resolve one
      await handler.processAction(
        createActionContext(reports[0].reportId, "mod-1", "approve"),
      );

      const pending = queue.getReports({ status: "pending" });
      const resolved = queue.getReports({ status: "resolved" });

      expect(pending).toHaveLength(1);
      expect(resolved).toHaveLength(1);
    });

    it("should filter reports by priority", async () => {
      await Promise.all([
        handler.submitReport({
          reporterId: "user-1",
          targetType: "message",
          targetId: "msg-1",
          categoryId: "spam", // low priority
          description: "Spam",
        }),
        handler.submitReport({
          reporterId: "user-2",
          targetType: "user",
          targetId: "user-2",
          categoryId: "hate-speech", // urgent priority
          description: "Hate speech",
          evidence: [{ type: "link", content: "https://example.com" }],
        }),
      ]);

      const urgent = queue.getReports({ priority: "urgent" });
      const low = queue.getReports({ priority: "low" });

      expect(urgent).toHaveLength(1);
      expect(low).toHaveLength(1);
    });

    it("should get pending reports", async () => {
      await Promise.all([
        handler.submitReport({
          reporterId: "user-1",
          targetType: "message",
          targetId: "msg-1",
          categoryId: "spam",
          description: "Report 1",
        }),
        handler.submitReport({
          reporterId: "user-2",
          targetType: "message",
          targetId: "msg-2",
          categoryId: "spam",
          description: "Report 2",
        }),
      ]);

      const pending = queue.getPendingReports();
      expect(pending).toHaveLength(2);
    });

    it("should calculate statistics correctly", async () => {
      // Submit multiple reports
      await Promise.all([
        handler.submitReport({
          reporterId: "user-1",
          targetType: "message",
          targetId: "msg-1",
          categoryId: "spam",
          description: "Spam 1",
        }),
        handler.submitReport({
          reporterId: "user-2",
          targetType: "message",
          targetId: "msg-2",
          categoryId: "harassment",
          description: "Harassment",
          evidence: [{ type: "link", content: "https://example.com" }],
        }),
      ]);

      const stats = queue.getStats();

      expect(stats.total).toBe(2);
      expect(stats.pendingCount).toBeGreaterThan(0);
      expect(stats.byStatus.pending).toBeGreaterThan(0);
      expect(stats.byCategory.spam).toBe(1);
      expect(stats.byCategory.harassment).toBe(1);
    });
  });

  describe("Notifications", () => {
    it("should queue notifications for new reports", async () => {
      const input: CreateReportInput = {
        reporterId: "user-123",
        targetType: "message",
        targetId: "msg-456",
        categoryId: "spam",
        description: "Spam",
      };

      await handler.submitReport(input);

      const notifications = handler.getPendingNotifications();
      expect(notifications.length).toBeGreaterThan(0);

      // Should notify moderators
      const moderatorNotif = notifications.find(
        (n) => n.recipient === "moderators",
      );
      expect(moderatorNotif).toBeTruthy();
    });

    it("should send high priority notifications for urgent reports", async () => {
      const input: CreateReportInput = {
        reporterId: "user-123",
        targetType: "user",
        targetId: "user-456",
        categoryId: "hate-speech",
        description: "Hate speech",
        evidence: [{ type: "link", content: "https://example.com" }],
      };

      await handler.submitReport(input);

      const notifications = handler.getPendingNotifications();
      const highPriority = notifications.filter((n) => n.priority === "high");

      expect(highPriority.length).toBeGreaterThan(0);
    });
  });

  describe("Audit Trail", () => {
    it("should log all actions", async () => {
      const input: CreateReportInput = {
        reporterId: "user-123",
        targetType: "message",
        targetId: "msg-456",
        categoryId: "spam",
        description: "Spam",
      };
      const submitResult = await handler.submitReport(input);

      await handler.processAction(
        createActionContext(submitResult.reportId, "mod-789", "approve"),
      );

      const actionLog = handler.getActionLog();
      expect(actionLog.length).toBeGreaterThan(0);

      const approveAction = actionLog.find((a) => a.action === "approve");
      expect(approveAction).toBeTruthy();
      expect(approveAction?.executedBy).toBe("mod-789");
    });

    it("should include metadata in action log", async () => {
      const input: CreateReportInput = {
        reporterId: "user-123",
        targetType: "message",
        targetId: "msg-456",
        categoryId: "spam",
        description: "Spam",
      };
      const submitResult = await handler.submitReport(input);

      await handler.processAction(
        createActionContext(submitResult.reportId, "mod-789", "approve"),
      );

      const actionLog = handler.getActionLog();
      const action = actionLog[actionLog.length - 1];

      expect(action.metadata?.reportId).toBe(submitResult.reportId);
    });
  });

  describe("Error Handling", () => {
    it("should handle invalid report ID gracefully", async () => {
      const context = createActionContext("invalid-id", "mod-789", "approve");
      const result = await handler.processAction(context);

      expect(result.success).toBe(false);
      expect(result.error).toContain("not found");
    });

    it("should handle unknown actions", async () => {
      const input: CreateReportInput = {
        reporterId: "user-123",
        targetType: "message",
        targetId: "msg-456",
        categoryId: "spam",
        description: "Spam",
      };
      const submitResult = await handler.submitReport(input);

      const context = createActionContext(
        submitResult.reportId,
        "mod-789",
        "unknown-action" as ReportAction,
      );
      const result = await handler.processAction(context);

      expect(result.success).toBe(false);
      expect(result.error).toContain("Unknown action");
    });
  });

  describe("Edge Cases", () => {
    it("should handle empty description after trim", async () => {
      const input: CreateReportInput = {
        reporterId: "user-123",
        targetType: "message",
        targetId: "msg-456",
        categoryId: "spam",
        description: "   ",
      };

      const result = await handler.submitReport(input);
      expect(result.success).toBe(false);
    });

    it("should limit evidence to max allowed", async () => {
      const evidence = Array(10)
        .fill(null)
        .map((_, i) => ({
          type: "link" as const,
          content: `https://example.com/${i}`,
        }));

      const input: CreateReportInput = {
        reporterId: "user-123",
        targetType: "user",
        targetId: "user-456",
        categoryId: "harassment",
        description: "Harassment",
        evidence,
      };

      const result = await handler.submitReport(input);
      expect(result.success).toBe(false);
      expect(result.error).toContain("Maximum");
    });

    it("should handle very long descriptions", async () => {
      const longDescription = "a".repeat(3000);

      const input: CreateReportInput = {
        reporterId: "user-123",
        targetType: "message",
        targetId: "msg-456",
        categoryId: "spam",
        description: longDescription,
      };

      const result = await handler.submitReport(input);
      expect(result.success).toBe(false);
      expect(result.error).toContain("exceeds maximum length");
    });
  });
});
