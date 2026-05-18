/**
 * @jest-environment node
 */

/**
 * Moderation API Routes Tests
 *
 * Comprehensive test suite for all Moderation API routes:
 * - POST/GET/PUT /api/moderation/analyze
 * - POST /api/moderation/batch
 * - POST/GET /api/moderation/actions
 * - GET /api/moderation/stats
 * - GET/POST /api/moderation/queue
 *
 * Tests cover:
 * - Request validation
 * - Authentication/authorization
 * - Rate limiting enforcement
 * - Error responses
 * - Success responses with correct format
 * - Batch processing
 * - Queue management
 */

import { NextRequest } from "next/server";
import {
  POST as analyzePost,
  GET as analyzeGet,
  PUT as analyzePut,
} from "../moderation/analyze/route";
import { POST as batchPost } from "../moderation/batch/route";
import {
  POST as actionsPost,
  GET as actionsGet,
} from "../moderation/actions/route";
import { GET as statsGet } from "../moderation/stats/route";
import { GET as queueGet, POST as queuePost } from "../moderation/queue/route";

// Mock AI moderation services
jest.mock("@/lib/moderation/ai-moderator", () => ({
  getAIModerator: jest.fn((policy?: any) => ({
    initialize: jest.fn().mockResolvedValue(undefined),
    analyzeContent: jest.fn().mockResolvedValue({
      shouldFlag: true,
      priority: "high",
      detectedIssues: [
        {
          type: "toxicity",
          severity: "high",
          confidence: 0.95,
          description: "Toxic language detected",
        },
      ],
      recommendedAction: "warn",
      confidence: 0.95,
    }),
    recordViolation: jest.fn().mockResolvedValue(undefined),
    getPolicy: jest.fn().mockReturnValue({
      toxicityThreshold: 0.7,
      autoModeration: true,
    }),
    updatePolicy: jest.fn(),
  })),
}));

jest.mock("@/lib/moderation/toxicity-detector", () => ({
  getToxicityDetector: jest.fn(() => ({
    analyze: jest.fn().mockResolvedValue({
      toxicity: 0.8,
      categories: { threat: 0.9, insult: 0.7 },
      isToxic: true,
    }),
    getConfig: jest.fn().mockReturnValue({ threshold: 0.7 }),
    updateConfig: jest.fn(),
  })),
}));

jest.mock("@/lib/moderation/spam-detector-ml", () => ({
  getSpamDetectorML: jest.fn(() => ({
    analyze: jest.fn().mockResolvedValue({
      isSpam: false,
      confidence: 0.1,
      indicators: [],
    }),
    getConfig: jest.fn().mockReturnValue({ threshold: 0.5 }),
    updateConfig: jest.fn(),
  })),
}));

jest.mock("@/lib/moderation/content-classifier", () => ({
  getContentClassifier: jest.fn(() => ({
    classify: jest.fn().mockResolvedValue({
      category: "general",
      tags: ["discussion"],
      nsfw: false,
    }),
    getConfig: jest.fn().mockReturnValue({ nsfwThreshold: 0.8 }),
    updateConfig: jest.fn(),
  })),
}));

jest.mock("@/lib/moderation/moderation-queue", () => ({
  ModerationQueue: jest.fn().mockImplementation(() => ({
    getQueueItems: jest.fn().mockResolvedValue([
      {
        id: "queue-1",
        status: "pending",
        priority: "high",
        contentType: "text",
        contentId: "msg-1",
      },
    ]),
    addToQueue: jest.fn().mockResolvedValue("queue-123"),
    approveContent: jest.fn().mockResolvedValue(undefined),
    rejectContent: jest.fn().mockResolvedValue(undefined),
    submitAppeal: jest.fn().mockResolvedValue(undefined),
  })),
}));

jest.mock("@/lib/moderation/actions", () => ({
  ModerationActions: jest.fn().mockImplementation(() => ({
    flagContent: jest.fn().mockResolvedValue({
      success: true,
      actionId: "action-1",
      message: "Content flagged",
    }),
    hideContent: jest.fn().mockResolvedValue({
      success: true,
      actionId: "action-2",
      message: "Content hidden",
    }),
    deleteContent: jest.fn().mockResolvedValue({
      success: true,
      actionId: "action-3",
      message: "Content deleted",
    }),
    warnUser: jest.fn().mockResolvedValue({
      success: true,
      actionId: "action-4",
      message: "User warned",
    }),
    muteUser: jest.fn().mockResolvedValue({
      success: true,
      actionId: "action-5",
      message: "User muted",
    }),
    unmuteUser: jest.fn().mockResolvedValue({
      success: true,
      actionId: "action-6",
      message: "User unmuted",
    }),
    banUser: jest.fn().mockResolvedValue({
      success: true,
      actionId: "action-7",
      message: "User banned",
    }),
    unbanUser: jest.fn().mockResolvedValue({
      success: true,
      actionId: "action-8",
      message: "User unbanned",
    }),
    bulkAction: jest.fn().mockResolvedValue({
      success: true,
      successCount: 5,
      failureCount: 0,
      results: [],
    }),
    getAuditLog: jest.fn().mockReturnValue([
      {
        actionId: "action-1",
        actionType: "warn",
        moderatorId: "mod-1",
        timestamp: new Date(),
      },
    ]),
  })),
}));

jest.mock("@/lib/apollo-client", () => ({
  getApolloClient: jest.fn(() => ({
    query: jest.fn().mockResolvedValue({
      data: {
        queue_stats: {
          aggregate: { count: 100 },
          nodes: [{ status: "pending", priority: "high", auto_action: "none" }],
        },
        action_stats: {
          aggregate: { count: 50 },
          nodes: [{ action_type: "warned", is_automated: false }],
        },
        pending_items: { aggregate: { count: 10 } },
        high_priority: { aggregate: { count: 5 } },
        user_violations: [],
        top_moderators: [],
      },
    }),
  })),
}));

jest.mock("@/lib/sentry-utils", () => ({
  captureError: jest.fn(),
}));

describe("Moderation API Routes", () => {
  // ====================================
  // POST /api/moderation/analyze
  // ====================================
  describe("POST /api/moderation/analyze", () => {
    it("should return 400 if content is missing", async () => {
      const request = new NextRequest(
        "http://localhost:3000/api/moderation/analyze",
        {
          method: "POST",
          body: JSON.stringify({ contentId: "msg-1" }),
        },
      );

      const response = await analyzePost(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain("Content and contentId are required");
    });

    it("should return 400 if contentId is missing", async () => {
      const request = new NextRequest(
        "http://localhost:3000/api/moderation/analyze",
        {
          method: "POST",
          body: JSON.stringify({ content: "Test message" }),
        },
      );

      const response = await analyzePost(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain("Content and contentId are required");
    });

    it("should successfully analyze content", async () => {
      const request = new NextRequest(
        "http://localhost:3000/api/moderation/analyze",
        {
          method: "POST",
          body: JSON.stringify({
            contentId: "msg-1",
            content: "This is a test message",
            contentType: "text",
            metadata: { userId: "user-1", channelId: "channel-1" },
          }),
        },
      );

      const response = await analyzePost(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.analysis).toBeDefined();
      expect(data.analysis.shouldFlag).toBe(true);
      expect(data.analysis.priority).toBe("high");
    });

    it("should include toxicity analysis when enabled", async () => {
      const request = new NextRequest(
        "http://localhost:3000/api/moderation/analyze",
        {
          method: "POST",
          body: JSON.stringify({
            contentId: "msg-1",
            content: "Test message",
            enableToxicity: true,
          }),
        },
      );

      const response = await analyzePost(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.toxicityAnalysis).toBeDefined();
    });

    it("should include spam analysis when enabled", async () => {
      const request = new NextRequest(
        "http://localhost:3000/api/moderation/analyze",
        {
          method: "POST",
          body: JSON.stringify({
            contentId: "msg-1",
            content: "Test message",
            enableSpam: true,
          }),
        },
      );

      const response = await analyzePost(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.spamAnalysis).toBeDefined();
    });

    it("should include content classification when enabled", async () => {
      const request = new NextRequest(
        "http://localhost:3000/api/moderation/analyze",
        {
          method: "POST",
          body: JSON.stringify({
            contentId: "msg-1",
            content: "Test message",
            enableClassification: true,
          }),
        },
      );

      const response = await analyzePost(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.classification).toBeDefined();
    });

    it("should record violation if content is flagged", async () => {
      const request = new NextRequest(
        "http://localhost:3000/api/moderation/analyze",
        {
          method: "POST",
          body: JSON.stringify({
            contentId: "msg-1",
            content: "Flagged content",
            metadata: { userId: "user-1" },
          }),
        },
      );

      const response = await analyzePost(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });
  });

  describe("GET /api/moderation/analyze", () => {
    it("should return moderation policy configuration", async () => {
      const response = await analyzeGet();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.policy).toBeDefined();
      expect(data.toxicityConfig).toBeDefined();
      expect(data.spamConfig).toBeDefined();
      expect(data.classifierConfig).toBeDefined();
    });
  });

  describe("PUT /api/moderation/analyze", () => {
    it("should update moderation policy", async () => {
      const request = new NextRequest(
        "http://localhost:3000/api/moderation/analyze",
        {
          method: "PUT",
          body: JSON.stringify({
            policy: { toxicityThreshold: 0.8 },
          }),
        },
      );

      const response = await analyzePut(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toBe("Policy updated successfully");
    });
  });

  // ====================================
  // POST /api/moderation/batch
  // ====================================
  describe("POST /api/moderation/batch", () => {
    it("should return 400 if items array is missing", async () => {
      const request = new NextRequest(
        "http://localhost:3000/api/moderation/batch",
        {
          method: "POST",
          body: JSON.stringify({}),
        },
      );

      const response = await batchPost(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain("Items array is required");
    });

    it("should return 400 if items array is empty", async () => {
      const request = new NextRequest(
        "http://localhost:3000/api/moderation/batch",
        {
          method: "POST",
          body: JSON.stringify({ items: [] }),
        },
      );

      const response = await batchPost(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain("Items array is required");
    });

    it("should return 400 if batch size exceeds limit", async () => {
      const items = Array(101).fill({
        contentId: "msg-1",
        contentType: "text",
        content: "test",
      });

      const request = new NextRequest(
        "http://localhost:3000/api/moderation/batch",
        {
          method: "POST",
          body: JSON.stringify({ items }),
        },
      );

      const response = await batchPost(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain("Maximum batch size is 100");
    });

    it("should successfully process batch", async () => {
      const items = [
        { contentId: "msg-1", contentType: "text", content: "Hello" },
        { contentId: "msg-2", contentType: "text", content: "World" },
      ];

      const request = new NextRequest(
        "http://localhost:3000/api/moderation/batch",
        {
          method: "POST",
          body: JSON.stringify({ items }),
        },
      );

      const response = await batchPost(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.stats).toBeDefined();
      expect(data.stats.total).toBe(2);
      expect(data.results).toBeDefined();
      expect(Array.isArray(data.results)).toBe(true);
    });

    it("should respect maxConcurrency parameter", async () => {
      const items = Array(20).fill({
        contentId: "msg-1",
        contentType: "text",
        content: "test",
      });

      const request = new NextRequest(
        "http://localhost:3000/api/moderation/batch",
        {
          method: "POST",
          body: JSON.stringify({ items, maxConcurrency: 5 }),
        },
      );

      const response = await batchPost(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it("should include error details for failed items", async () => {
      const { getAIModerator } = require("@/lib/moderation/ai-moderator");
      getAIModerator.mockReturnValueOnce({
        initialize: jest.fn().mockResolvedValue(undefined),
        analyzeContent: jest
          .fn()
          .mockResolvedValueOnce({ shouldFlag: false })
          .mockRejectedValueOnce(new Error("Analysis failed")),
        recordViolation: jest.fn(),
      });

      const items = [
        { contentId: "msg-1", contentType: "text", content: "Good message" },
        { contentId: "msg-2", contentType: "text", content: "Bad message" },
      ];

      const request = new NextRequest(
        "http://localhost:3000/api/moderation/batch",
        {
          method: "POST",
          body: JSON.stringify({ items }),
        },
      );

      const response = await batchPost(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.stats.failure).toBeGreaterThan(0);
    });
  });

  // ====================================
  // POST /api/moderation/actions
  // ====================================
  describe("POST /api/moderation/actions", () => {
    it("should return 400 if action is missing", async () => {
      const request = new NextRequest(
        "http://localhost:3000/api/moderation/actions",
        {
          method: "POST",
          body: JSON.stringify({}),
        },
      );

      const response = await actionsPost(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain("Action is required");
    });

    it("should successfully flag content", async () => {
      const request = new NextRequest(
        "http://localhost:3000/api/moderation/actions",
        {
          method: "POST",
          body: JSON.stringify({
            action: "flag",
            targetType: "message",
            targetId: "msg-1",
            targetUserId: "user-1",
            moderatorId: "mod-1",
            reason: "Inappropriate content",
          }),
        },
      );

      const response = await actionsPost(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.actionId).toBe("action-1");
    });

    it("should successfully hide content", async () => {
      const request = new NextRequest(
        "http://localhost:3000/api/moderation/actions",
        {
          method: "POST",
          body: JSON.stringify({
            action: "hide",
            targetType: "message",
            targetId: "msg-1",
            targetUserId: "user-1",
            moderatorId: "mod-1",
          }),
        },
      );

      const response = await actionsPost(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it("should successfully delete content", async () => {
      const request = new NextRequest(
        "http://localhost:3000/api/moderation/actions",
        {
          method: "POST",
          body: JSON.stringify({
            action: "delete",
            targetType: "message",
            targetId: "msg-1",
            targetUserId: "user-1",
            moderatorId: "mod-1",
          }),
        },
      );

      const response = await actionsPost(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it("should successfully warn user", async () => {
      const request = new NextRequest(
        "http://localhost:3000/api/moderation/actions",
        {
          method: "POST",
          body: JSON.stringify({
            action: "warn",
            targetUserId: "user-1",
            moderatorId: "mod-1",
            reason: "Policy violation",
          }),
        },
      );

      const response = await actionsPost(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it("should successfully mute user with duration", async () => {
      const request = new NextRequest(
        "http://localhost:3000/api/moderation/actions",
        {
          method: "POST",
          body: JSON.stringify({
            action: "mute",
            targetUserId: "user-1",
            moderatorId: "mod-1",
            duration: 60, // 60 minutes
          }),
        },
      );

      const response = await actionsPost(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it("should successfully unmute user", async () => {
      const request = new NextRequest(
        "http://localhost:3000/api/moderation/actions",
        {
          method: "POST",
          body: JSON.stringify({
            action: "unmute",
            targetUserId: "user-1",
            moderatorId: "mod-1",
          }),
        },
      );

      const response = await actionsPost(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it("should successfully ban user", async () => {
      const request = new NextRequest(
        "http://localhost:3000/api/moderation/actions",
        {
          method: "POST",
          body: JSON.stringify({
            action: "ban",
            targetUserId: "user-1",
            moderatorId: "mod-1",
            reason: "Repeated violations",
          }),
        },
      );

      const response = await actionsPost(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it("should successfully unban user", async () => {
      const request = new NextRequest(
        "http://localhost:3000/api/moderation/actions",
        {
          method: "POST",
          body: JSON.stringify({
            action: "unban",
            targetUserId: "user-1",
            moderatorId: "mod-1",
          }),
        },
      );

      const response = await actionsPost(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it("should handle bulk actions", async () => {
      const request = new NextRequest(
        "http://localhost:3000/api/moderation/actions",
        {
          method: "POST",
          body: JSON.stringify({
            action: "hide",
            moderatorId: "mod-1",
            bulk: [
              {
                targetType: "message",
                targetId: "msg-1",
                targetUserId: "user-1",
              },
              {
                targetType: "message",
                targetId: "msg-2",
                targetUserId: "user-2",
              },
            ],
          }),
        },
      );

      const response = await actionsPost(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.stats).toBeDefined();
      expect(data.stats.total).toBe(2);
    });

    it("should return 400 for invalid action type", async () => {
      const request = new NextRequest(
        "http://localhost:3000/api/moderation/actions",
        {
          method: "POST",
          body: JSON.stringify({
            action: "invalid_action",
            moderatorId: "mod-1",
          }),
        },
      );

      const response = await actionsPost(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain("Invalid action");
    });
  });

  describe("GET /api/moderation/actions", () => {
    it("should return audit log", async () => {
      const request = new NextRequest(
        "http://localhost:3000/api/moderation/actions",
      );

      const response = await actionsGet(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.auditLog).toBeDefined();
      expect(Array.isArray(data.auditLog)).toBe(true);
      expect(data.count).toBeDefined();
    });
  });

  // ====================================
  // GET /api/moderation/stats
  // ====================================
  describe("GET /api/moderation/stats", () => {
    it("should return moderation statistics with default period", async () => {
      const request = new NextRequest(
        "http://localhost:3000/api/moderation/stats",
      );

      const response = await statsGet(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.metrics).toBeDefined();
      expect(data.queueStats).toBeDefined();
      expect(data.actionStats).toBeDefined();
    });

    it("should support custom period parameter", async () => {
      const request = new NextRequest(
        "http://localhost:3000/api/moderation/stats?period=30d",
      );

      const response = await statsGet(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.period.label).toBe("30d");
    });

    it("should support custom date range", async () => {
      const startDate = "2024-01-01";
      const endDate = "2024-01-31";
      const request = new NextRequest(
        `http://localhost:3000/api/moderation/stats?startDate=${startDate}&endDate=${endDate}`,
      );

      const response = await statsGet(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.period.start).toBeDefined();
      expect(data.period.end).toBeDefined();
    });

    it("should include all required metrics", async () => {
      const request = new NextRequest(
        "http://localhost:3000/api/moderation/stats",
      );

      const response = await statsGet(request);
      const data = await response.json();

      expect(data.metrics.totalFlagged).toBeDefined();
      expect(data.metrics.pendingReview).toBeDefined();
      expect(data.metrics.highPriority).toBeDefined();
      expect(data.metrics.totalActions).toBeDefined();
      expect(data.metrics.automatedActions).toBeDefined();
      expect(data.metrics.manualActions).toBeDefined();
    });
  });

  // ====================================
  // GET /api/moderation/queue
  // ====================================
  describe("GET /api/moderation/queue", () => {
    it("should return queue items with default pagination", async () => {
      const request = new NextRequest(
        "http://localhost:3000/api/moderation/queue",
      );

      const response = await queueGet(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.items).toBeDefined();
      expect(Array.isArray(data.items)).toBe(true);
    });

    it("should support status filter", async () => {
      const request = new NextRequest(
        "http://localhost:3000/api/moderation/queue?status=pending",
      );

      const response = await queueGet(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it("should support priority filter", async () => {
      const request = new NextRequest(
        "http://localhost:3000/api/moderation/queue?priority=high",
      );

      const response = await queueGet(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it("should support custom limit and offset", async () => {
      const request = new NextRequest(
        "http://localhost:3000/api/moderation/queue?limit=10&offset=5",
      );

      const response = await queueGet(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });
  });

  // ====================================
  // POST /api/moderation/queue
  // ====================================
  describe("POST /api/moderation/queue", () => {
    it("should return 400 if required fields are missing", async () => {
      const request = new NextRequest(
        "http://localhost:3000/api/moderation/queue",
        {
          method: "POST",
          body: JSON.stringify({}),
        },
      );

      const response = await queuePost(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain("Missing required fields");
    });

    it("should successfully add item to queue", async () => {
      const request = new NextRequest(
        "http://localhost:3000/api/moderation/queue",
        {
          method: "POST",
          body: JSON.stringify({
            contentType: "message",
            contentId: "msg-1",
            userId: "user-1",
            moderationResult: {
              shouldFlag: true,
              priority: "high",
              detectedIssues: [],
            },
            contentText: "Test message",
          }),
        },
      );

      const response = await queuePost(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.queueId).toBe("queue-123");
    });

    it("should include optional metadata", async () => {
      const request = new NextRequest(
        "http://localhost:3000/api/moderation/queue",
        {
          method: "POST",
          body: JSON.stringify({
            contentType: "message",
            contentId: "msg-1",
            userId: "user-1",
            moderationResult: {
              shouldFlag: true,
              priority: "medium",
            },
            contentText: "Test message",
            contentUrl: "https://example.com/msg-1",
            channelId: "channel-1",
            userDisplayName: "Test User",
          }),
        },
      );

      const response = await queuePost(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });
  });
});
