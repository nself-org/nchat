/**
 * Handoff Service Tests
 *
 * Comprehensive tests for bot-to-human handoff functionality including
 * handoff initiation, queue management, agent assignment, and context preservation.
 *
 * @module services/chatbot/__tests__/handoff.service.test
 */

import {
  HandoffService,
  getHandoffService,
  createHandoffService,
  resetHandoffService,
} from "../handoff.service";
import { getChatbotService, resetChatbotService } from "../chatbot.service";
import { resetIntentMatcher } from "@/lib/chatbot/intent-matcher";
import { getLivechatService, resetLivechatService } from "@/services/livechat";
import type { Visitor, Agent } from "@/services/livechat/types";
import type { BotConversationContext } from "@/lib/chatbot/chatbot-types";

// Mock dependencies
jest.mock("@/lib/logger", () => ({
  createLogger: () => ({
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  }),
}));

// Mock uuid with more predictable IDs
let uuidCounter = 0;
jest.mock("uuid", () => ({
  v4: () => `test-uuid-${++uuidCounter}`,
}));

describe("HandoffService", () => {
  let service: HandoffService;
  let chatbotService: ReturnType<typeof getChatbotService>;
  let livechatService: ReturnType<typeof getLivechatService>;

  const testVisitor: Visitor = {
    id: "visitor-1",
    token: "token-1",
    name: "Test Visitor",
    email: "visitor@example.com",
    channel: "web_widget",
    status: "online",
    customFields: {},
    tags: [],
    metadata: {},
    visitsCount: 1,
    totalChats: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  let createdAgentId: string;

  // Helper to create a conversation with context
  async function setupConversation(conversationId: string): Promise<void> {
    await chatbotService.processMessage({
      conversationId,
      visitorId: testVisitor.id,
      message: "Hello, I need help",
    });

    await chatbotService.processMessage({
      conversationId,
      visitorId: testVisitor.id,
      message: "I have a question about billing",
    });
  }

  beforeEach(async () => {
    uuidCounter = 0; // Reset counter for predictable IDs
    resetHandoffService();
    resetChatbotService();
    resetIntentMatcher();
    resetLivechatService();

    service = getHandoffService();
    chatbotService = getChatbotService();
    livechatService = getLivechatService();

    // Create test agent and store the ID
    const agentResult = await livechatService.createAgent({
      name: "Test Agent",
      email: "agent@example.com",
      role: "agent",
      departments: ["support"],
      maxChats: 5,
    });
    createdAgentId = agentResult.data?.id || "agent-fallback";
  });

  // ==========================================================================
  // SINGLETON TESTS
  // ==========================================================================

  describe("Singleton Pattern", () => {
    it("should return the same instance from getHandoffService", () => {
      const instance1 = getHandoffService();
      const instance2 = getHandoffService();
      expect(instance1).toBe(instance2);
    });

    it("should return a new instance from createHandoffService", () => {
      const instance1 = createHandoffService();
      const instance2 = createHandoffService();
      expect(instance1).not.toBe(instance2);
    });

    it("should reset the singleton with resetHandoffService", () => {
      const instance1 = getHandoffService();
      resetHandoffService();
      const instance2 = getHandoffService();
      expect(instance1).not.toBe(instance2);
    });
  });

  // ==========================================================================
  // CONFIGURATION TESTS
  // ==========================================================================

  describe("Configuration", () => {
    it("should return default configuration", async () => {
      const result = await service.getConfig();

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data?.autoHandoff).toBe(true);
      expect(result.data?.maxBotTurns).toBe(5);
    });

    it("should update configuration", async () => {
      const result = await service.updateConfig({
        maxBotTurns: 10,
        sentimentThreshold: -0.7,
      });

      expect(result.success).toBe(true);
      expect(result.data?.maxBotTurns).toBe(10);
      expect(result.data?.sentimentThreshold).toBe(-0.7);
    });

    it("should update handoff keywords", async () => {
      const result = await service.updateConfig({
        handoffKeywords: ["help", "agent", "support"],
      });

      expect(result.data?.handoffKeywords).toContain("help");
      expect(result.data?.handoffKeywords).toContain("agent");
    });

    it("should update messages", async () => {
      await service.updateConfig({
        handoffMessage: "Custom handoff message",
        noAgentsMessage: "Custom no agents message",
      });

      const config = await service.getConfig();
      expect(config.data?.handoffMessage).toBe("Custom handoff message");
      expect(config.data?.noAgentsMessage).toBe("Custom no agents message");
    });
  });

  // ==========================================================================
  // HANDOFF INITIATION TESTS
  // ==========================================================================

  describe("Handoff Initiation", () => {
    it("should initiate a handoff", async () => {
      await setupConversation("conv-1");

      const result = await service.initiateHandoff({
        conversationId: "conv-1",
        trigger: "user_request",
        reason: "User requested human agent",
      });

      expect(result.success).toBe(true);
      expect(result.data?.id).toBeDefined();
      expect(result.data?.conversationId).toBe("conv-1");
      expect(result.data?.trigger).toBe("user_request");
    });

    it("should set correct priority", async () => {
      await setupConversation("conv-1");

      const result = await service.initiateHandoff({
        conversationId: "conv-1",
        trigger: "low_confidence",
        priority: "high",
      });

      expect(result.data?.priority).toBe("high");
    });

    it("should set default priority to medium", async () => {
      await setupConversation("conv-1");

      const result = await service.initiateHandoff({
        conversationId: "conv-1",
        trigger: "user_request",
      });

      expect(result.data?.priority).toBe("medium");
    });

    it("should fail for missing context", async () => {
      const result = await service.initiateHandoff({
        conversationId: "non-existent",
        trigger: "user_request",
      });

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe("NOT_FOUND");
    });

    it("should prevent duplicate handoffs", async () => {
      await setupConversation("conv-1");

      await service.initiateHandoff({
        conversationId: "conv-1",
        trigger: "user_request",
      });

      const result = await service.initiateHandoff({
        conversationId: "conv-1",
        trigger: "user_request",
      });

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe("CONFLICT");
    });

    it("should allow new handoff after completion", async () => {
      await setupConversation("conv-1");

      const first = await service.initiateHandoff({
        conversationId: "conv-1",
        trigger: "user_request",
      });

      await service.completeHandoff(first.data!.id);

      // Need to re-setup conversation context
      await chatbotService.processMessage({
        conversationId: "conv-1",
        visitorId: testVisitor.id,
        message: "I need more help",
      });

      const second = await service.initiateHandoff({
        conversationId: "conv-1",
        trigger: "user_request",
      });

      expect(second.success).toBe(true);
    });

    it("should generate handoff summary", async () => {
      await setupConversation("conv-1");

      const result = await service.initiateHandoff({
        conversationId: "conv-1",
        trigger: "user_request",
        notes: "User is frustrated",
      });

      expect(result.data?.summary).toBeDefined();
      expect(result.data?.summary.messageCount).toBeGreaterThan(0);
      expect(result.data?.summary.notes).toBe("User is frustrated");
    });

    it("should set department", async () => {
      await setupConversation("conv-1");

      const result = await service.initiateHandoff({
        conversationId: "conv-1",
        trigger: "user_request",
        department: "billing",
      });

      expect(result.data?.department).toBe("billing");
    });

    it("should set preferred agent", async () => {
      await setupConversation("conv-1");

      const result = await service.initiateHandoff({
        conversationId: "conv-1",
        trigger: "user_request",
        preferredAgentId: "agent-1",
      });

      expect(result.data?.preferredAgentId).toBe("agent-1");
    });
  });

  // ==========================================================================
  // HANDOFF ACCEPTANCE TESTS
  // ==========================================================================

  describe("Handoff Acceptance", () => {
    let handoffId: string;

    beforeEach(async () => {
      await setupConversation("conv-1");
      const result = await service.initiateHandoff({
        conversationId: "conv-1",
        trigger: "user_request",
      });
      handoffId = result.data!.id;
    });

    it("should accept a handoff", async () => {
      const result = await service.acceptHandoff(handoffId, createdAgentId);

      expect(result.success).toBe(true);
      expect(result.data?.status).toBe("in_progress");
      expect(result.data?.assignedAgent?.id).toBe(createdAgentId);
      expect(result.data?.acceptedAt).toBeDefined();
    });

    it("should clear queue position on acceptance", async () => {
      // Put handoff in waiting state
      const handoff = await service.getHandoff(handoffId);
      if (handoff.data) {
        handoff.data.status = "waiting_for_agent";
        handoff.data.queuePosition = 1;
      }

      const result = await service.acceptHandoff(handoffId, createdAgentId);

      expect(result.data?.queuePosition).toBeUndefined();
      expect(result.data?.estimatedWait).toBeUndefined();
    });

    it("should fail for non-existent handoff", async () => {
      const result = await service.acceptHandoff(
        "non-existent",
        createdAgentId,
      );

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe("NOT_FOUND");
    });

    it("should fail for non-existent agent", async () => {
      const result = await service.acceptHandoff(
        handoffId,
        "non-existent-agent",
      );

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe("NOT_FOUND");
    });

    it("should prevent double acceptance", async () => {
      await service.acceptHandoff(handoffId, createdAgentId);

      const result = await service.acceptHandoff(handoffId, createdAgentId);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe("CONFLICT");
    });

    it("should update bot context state", async () => {
      await service.acceptHandoff(handoffId, createdAgentId);

      const contextResult = await chatbotService.getContext("conv-1");
      expect(contextResult.data?.state).toBe("handed_off");
    });
  });

  // ==========================================================================
  // HANDOFF COMPLETION TESTS
  // ==========================================================================

  describe("Handoff Completion", () => {
    let handoffId: string;

    beforeEach(async () => {
      await setupConversation("conv-1");
      const result = await service.initiateHandoff({
        conversationId: "conv-1",
        trigger: "user_request",
      });
      handoffId = result.data!.id;
      await service.acceptHandoff(handoffId, createdAgentId);
    });

    it("should complete a handoff", async () => {
      const result = await service.completeHandoff(handoffId);

      expect(result.success).toBe(true);
      expect(result.data?.status).toBe("completed");
      expect(result.data?.completedAt).toBeDefined();
    });

    it("should end bot session on completion", async () => {
      await service.completeHandoff(handoffId);

      const contextResult = await chatbotService.getContext("conv-1");
      expect(contextResult.data).toBeNull();
    });

    it("should fail for non-existent handoff", async () => {
      const result = await service.completeHandoff("non-existent");

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe("NOT_FOUND");
    });

    it("should be idempotent for already completed", async () => {
      await service.completeHandoff(handoffId);

      const result = await service.completeHandoff(handoffId);

      expect(result.success).toBe(true);
      expect(result.data?.status).toBe("completed");
    });
  });

  // ==========================================================================
  // HANDOFF CANCELLATION TESTS
  // ==========================================================================

  describe("Handoff Cancellation", () => {
    let handoffId: string;

    beforeEach(async () => {
      await setupConversation("conv-1");
      const result = await service.initiateHandoff({
        conversationId: "conv-1",
        trigger: "user_request",
      });
      handoffId = result.data!.id;
    });

    it("should cancel a pending handoff", async () => {
      const result = await service.cancelHandoff(
        handoffId,
        "User changed mind",
      );

      expect(result.success).toBe(true);
      expect(result.data?.status).toBe("cancelled");
      expect(result.data?.reason).toBe("User changed mind");
    });

    it("should set default cancellation reason", async () => {
      const result = await service.cancelHandoff(handoffId);

      expect(result.data?.reason).toBe("Cancelled by user");
    });

    it("should return to bot conversation", async () => {
      await service.cancelHandoff(handoffId);

      const contextResult = await chatbotService.getContext("conv-1");
      expect(contextResult.data?.state).toBe("answering");
    });

    it("should fail for non-existent handoff", async () => {
      const result = await service.cancelHandoff("non-existent");

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe("NOT_FOUND");
    });

    it("should be idempotent for already cancelled", async () => {
      await service.cancelHandoff(handoffId);

      const result = await service.cancelHandoff(handoffId);

      expect(result.success).toBe(true);
      expect(result.data?.status).toBe("cancelled");
    });

    it("should prevent cancellation when not allowed", async () => {
      await service.updateConfig({ allowCancel: false });
      await service.acceptHandoff(handoffId, createdAgentId);

      const result = await service.cancelHandoff(handoffId);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe("FORBIDDEN");
    });
  });

  // ==========================================================================
  // HANDOFF RETRIEVAL TESTS
  // ==========================================================================

  describe("Handoff Retrieval", () => {
    let handoffId: string;

    beforeEach(async () => {
      await setupConversation("conv-1");
      const result = await service.initiateHandoff({
        conversationId: "conv-1",
        trigger: "user_request",
      });
      handoffId = result.data!.id;
    });

    it("should get handoff by ID", async () => {
      const result = await service.getHandoff(handoffId);

      expect(result.success).toBe(true);
      expect(result.data?.id).toBe(handoffId);
    });

    it("should return null for non-existent ID", async () => {
      const result = await service.getHandoff("non-existent");

      expect(result.success).toBe(true);
      expect(result.data).toBeNull();
    });

    it("should get handoff by conversation ID", async () => {
      const result = await service.getHandoffByConversation("conv-1");

      expect(result.success).toBe(true);
      expect(result.data?.id).toBe(handoffId);
    });

    it("should return null for non-existent conversation", async () => {
      const result = await service.getHandoffByConversation("non-existent");

      expect(result.success).toBe(true);
      expect(result.data).toBeNull();
    });

    it("should get handoff summary", async () => {
      const result = await service.getHandoffSummary(handoffId);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data?.messageCount).toBeGreaterThan(0);
    });

    it("should return null summary for non-existent handoff", async () => {
      const result = await service.getHandoffSummary("non-existent");

      expect(result.success).toBe(true);
      expect(result.data).toBeNull();
    });
  });

  // ==========================================================================
  // HANDOFF LISTING TESTS
  // ==========================================================================

  describe("Handoff Listing", () => {
    beforeEach(async () => {
      // Create multiple handoffs
      await setupConversation("conv-1");
      await service.initiateHandoff({
        conversationId: "conv-1",
        trigger: "user_request",
        priority: "high",
        department: "billing",
      });

      await chatbotService.processMessage({
        conversationId: "conv-2",
        visitorId: "visitor-2",
        message: "Hello",
      });
      await service.initiateHandoff({
        conversationId: "conv-2",
        trigger: "low_confidence",
        priority: "medium",
        department: "support",
      });

      await chatbotService.processMessage({
        conversationId: "conv-3",
        visitorId: "visitor-3",
        message: "Hello",
      });
      const third = await service.initiateHandoff({
        conversationId: "conv-3",
        trigger: "negative_sentiment",
        priority: "urgent",
      });
      await service.acceptHandoff(third.data!.id, createdAgentId);
    });

    it("should list all handoffs", async () => {
      const result = await service.listHandoffs();

      expect(result.success).toBe(true);
      expect(result.data?.length).toBe(3);
    });

    it("should filter by status", async () => {
      const result = await service.listHandoffs({ status: "in_progress" });

      expect(result.data?.length).toBe(1);
    });

    it("should filter by multiple statuses", async () => {
      const result = await service.listHandoffs({
        status: ["pending", "waiting_for_agent"],
      });

      expect(result.data?.length).toBe(2);
    });

    it("should filter by department", async () => {
      const result = await service.listHandoffs({ department: "billing" });

      expect(result.data?.length).toBe(1);
    });

    it("should filter by agent ID", async () => {
      const result = await service.listHandoffs({ agentId: createdAgentId });

      expect(result.data?.length).toBe(1);
    });

    it("should sort by priority and time", async () => {
      const result = await service.listHandoffs();

      // Urgent should be first
      expect(result.data?.[0].priority).toBe("urgent");
    });

    it("should apply pagination", async () => {
      const result = await service.listHandoffs({ limit: 2, offset: 0 });

      expect(result.data?.length).toBe(2);
    });

    it("should apply offset", async () => {
      const result = await service.listHandoffs({ limit: 2, offset: 2 });

      expect(result.data?.length).toBe(1);
    });
  });

  // ==========================================================================
  // QUEUE MANAGEMENT TESTS
  // ==========================================================================

  describe("Queue Management", () => {
    it("should get pending queue", async () => {
      await setupConversation("conv-1");
      await service.initiateHandoff({
        conversationId: "conv-1",
        trigger: "user_request",
      });

      await chatbotService.processMessage({
        conversationId: "conv-2",
        visitorId: "visitor-2",
        message: "Hello",
      });
      await service.initiateHandoff({
        conversationId: "conv-2",
        trigger: "user_request",
      });

      const result = await service.getPendingQueue();

      expect(result.success).toBe(true);
      expect(result.data?.length).toBe(2);
    });

    it("should filter pending queue by department", async () => {
      await setupConversation("conv-1");
      await service.initiateHandoff({
        conversationId: "conv-1",
        trigger: "user_request",
        department: "billing",
      });

      await chatbotService.processMessage({
        conversationId: "conv-2",
        visitorId: "visitor-2",
        message: "Hello",
      });
      await service.initiateHandoff({
        conversationId: "conv-2",
        trigger: "user_request",
        department: "support",
      });

      const result = await service.getPendingQueue({ department: "billing" });

      expect(result.data?.length).toBe(1);
    });
  });

  // ==========================================================================
  // CONVERSATION HISTORY TESTS
  // ==========================================================================

  describe("Conversation History", () => {
    let handoffId: string;

    beforeEach(async () => {
      await setupConversation("conv-1");
      const result = await service.initiateHandoff({
        conversationId: "conv-1",
        trigger: "user_request",
      });
      handoffId = result.data!.id;
    });

    it("should get conversation history", async () => {
      const result = await service.getConversationHistory(handoffId);

      expect(result.success).toBe(true);
      expect(result.data?.botMessages).toBeDefined();
      expect(result.data?.botMessages.length).toBeGreaterThan(0);
    });

    it("should return null for non-existent handoff", async () => {
      const result = await service.getConversationHistory("non-existent");

      expect(result.success).toBe(true);
      expect(result.data).toBeNull();
    });

    it("should include livechat messages if available", async () => {
      const result = await service.getConversationHistory(handoffId);

      expect(result.data?.livechatMessages).toBeDefined();
    });
  });

  // ==========================================================================
  // HANDOFF TRIGGER DETECTION TESTS
  // ==========================================================================

  describe("Handoff Trigger Detection", () => {
    function createMockContext(
      overrides: Partial<BotConversationContext> = {},
    ): BotConversationContext {
      return {
        conversationId: "conv-1",
        visitor: testVisitor,
        state: "answering",
        botTurns: 1,
        unknownCount: 0,
        collectedData: {},
        messageHistory: [],
        topics: [],
        sentimentHistory: [],
        suggestedFAQs: [],
        suggestedArticles: [],
        createdAt: new Date(),
        lastActivityAt: new Date(),
        ...overrides,
      };
    }

    it("should trigger on max unknown intents", () => {
      const context = createMockContext({ unknownCount: 3 });

      const result = service.shouldTriggerHandoff(context);

      expect(result.shouldHandoff).toBe(true);
      expect(result.trigger).toBe("low_confidence");
    });

    it("should trigger on max bot turns", () => {
      const context = createMockContext({ botTurns: 6 });

      const result = service.shouldTriggerHandoff(context);

      expect(result.shouldHandoff).toBe(true);
      expect(result.trigger).toBe("max_turns_reached");
    });

    it("should trigger on negative sentiment", () => {
      const context = createMockContext({
        sentimentHistory: [-0.8, -0.7, -0.9],
      });

      const result = service.shouldTriggerHandoff(context);

      expect(result.shouldHandoff).toBe(true);
      expect(result.trigger).toBe("negative_sentiment");
    });

    it("should trigger on user request intent", () => {
      const context = createMockContext({
        lastIntent: {
          intent: "human",
          confidence: 0.9,
          requestsHuman: true,
        },
      });

      const result = service.shouldTriggerHandoff(context);

      expect(result.shouldHandoff).toBe(true);
      expect(result.trigger).toBe("user_request");
    });

    it("should not trigger for normal conversation", () => {
      const context = createMockContext({
        botTurns: 2,
        unknownCount: 0,
        sentimentHistory: [0.2, 0.1, 0.3],
      });

      const result = service.shouldTriggerHandoff(context);

      expect(result.shouldHandoff).toBe(false);
    });

    it("should not trigger with insufficient sentiment history", () => {
      const context = createMockContext({
        sentimentHistory: [-0.8], // Only 1 sample
      });

      const result = service.shouldTriggerHandoff(context);

      expect(result.shouldHandoff).toBe(false);
    });
  });

  // ==========================================================================
  // EVENT SUBSCRIPTION TESTS
  // ==========================================================================

  describe("Event Subscription", () => {
    it("should subscribe to events", async () => {
      const events: any[] = [];
      const unsubscribe = service.subscribe((event) => {
        events.push(event);
      });

      await setupConversation("conv-1");
      await service.initiateHandoff({
        conversationId: "conv-1",
        trigger: "user_request",
      });

      expect(events.some((e) => e.type === "bot.handoff_requested")).toBe(true);

      unsubscribe();
    });

    it("should unsubscribe from events", async () => {
      const events: any[] = [];
      const unsubscribe = service.subscribe((event) => {
        events.push(event);
      });

      unsubscribe();

      await setupConversation("conv-1");
      await service.initiateHandoff({
        conversationId: "conv-1",
        trigger: "user_request",
      });

      expect(events.length).toBe(0);
    });

    it("should emit accept event", async () => {
      const events: any[] = [];
      service.subscribe((event) => {
        events.push(event);
      });

      await setupConversation("conv-1");
      const handoff = await service.initiateHandoff({
        conversationId: "conv-1",
        trigger: "user_request",
      });

      await service.acceptHandoff(handoff.data!.id, createdAgentId);

      expect(events.some((e) => e.type === "bot.handoff_accepted")).toBe(true);
    });

    it("should emit complete event", async () => {
      const events: any[] = [];
      service.subscribe((event) => {
        events.push(event);
      });

      await setupConversation("conv-1");
      const handoff = await service.initiateHandoff({
        conversationId: "conv-1",
        trigger: "user_request",
      });
      await service.acceptHandoff(handoff.data!.id, createdAgentId);
      await service.completeHandoff(handoff.data!.id);

      expect(events.some((e) => e.type === "bot.handoff_completed")).toBe(true);
    });

    it("should emit cancel event", async () => {
      const events: any[] = [];
      service.subscribe((event) => {
        events.push(event);
      });

      await setupConversation("conv-1");
      const handoff = await service.initiateHandoff({
        conversationId: "conv-1",
        trigger: "user_request",
      });
      await service.cancelHandoff(handoff.data!.id);

      expect(events.some((e) => e.type === "bot.handoff_cancelled")).toBe(true);
    });
  });

  // ==========================================================================
  // STORE MANAGEMENT TESTS
  // ==========================================================================

  describe("Store Management", () => {
    it("should clear all data", async () => {
      await setupConversation("conv-1");
      await service.initiateHandoff({
        conversationId: "conv-1",
        trigger: "user_request",
      });

      service.clearAll();

      const sizes = service.getStoreSizes();
      expect(sizes.handoffRequests).toBe(0);
      expect(sizes.handoffsByConversation).toBe(0);
    });

    it("should return store sizes", async () => {
      await setupConversation("conv-1");
      await service.initiateHandoff({
        conversationId: "conv-1",
        trigger: "user_request",
      });

      await chatbotService.processMessage({
        conversationId: "conv-2",
        visitorId: "visitor-2",
        message: "Hello",
      });
      await service.initiateHandoff({
        conversationId: "conv-2",
        trigger: "user_request",
      });

      const sizes = service.getStoreSizes();
      expect(sizes.handoffRequests).toBe(2);
      expect(sizes.handoffsByConversation).toBe(2);
    });
  });

  // ==========================================================================
  // PRIORITY ORDERING TESTS
  // ==========================================================================

  describe("Priority Ordering", () => {
    it("should order handoffs by priority", async () => {
      // Create handoffs with different priorities
      await chatbotService.processMessage({
        conversationId: "conv-low",
        visitorId: "visitor-1",
        message: "Hello",
      });
      await service.initiateHandoff({
        conversationId: "conv-low",
        trigger: "user_request",
        priority: "low",
      });

      await chatbotService.processMessage({
        conversationId: "conv-urgent",
        visitorId: "visitor-2",
        message: "Hello",
      });
      await service.initiateHandoff({
        conversationId: "conv-urgent",
        trigger: "user_request",
        priority: "urgent",
      });

      await chatbotService.processMessage({
        conversationId: "conv-medium",
        visitorId: "visitor-3",
        message: "Hello",
      });
      await service.initiateHandoff({
        conversationId: "conv-medium",
        trigger: "user_request",
        priority: "medium",
      });

      const result = await service.listHandoffs();

      expect(result.data?.[0].priority).toBe("urgent");
      expect(result.data?.[1].priority).toBe("medium");
      expect(result.data?.[2].priority).toBe("low");
    });
  });

  // ==========================================================================
  // SUMMARY GENERATION TESTS
  // ==========================================================================

  describe("Summary Generation", () => {
    it("should extract main issue from first message", async () => {
      await chatbotService.processMessage({
        conversationId: "conv-1",
        visitorId: testVisitor.id,
        message: "I have a billing problem with my account",
      });

      const handoff = await service.initiateHandoff({
        conversationId: "conv-1",
        trigger: "user_request",
      });

      expect(handoff.data?.summary.mainIssue).toContain("billing");
    });

    it("should calculate sentiment average", async () => {
      await chatbotService.processMessage({
        conversationId: "conv-1",
        visitorId: testVisitor.id,
        message: "This is great!",
      });

      await chatbotService.processMessage({
        conversationId: "conv-1",
        visitorId: testVisitor.id,
        message: "This is terrible!",
      });

      const handoff = await service.initiateHandoff({
        conversationId: "conv-1",
        trigger: "user_request",
      });

      expect(handoff.data?.summary.sentiment).toBeDefined();
    });

    it("should track suggested FAQs in summary", async () => {
      await chatbotService.processMessage({
        conversationId: "conv-1",
        visitorId: testVisitor.id,
        message: "How do I reset password?",
      });

      const handoff = await service.initiateHandoff({
        conversationId: "conv-1",
        trigger: "user_request",
      });

      expect(handoff.data?.summary.failedSuggestions).toBeDefined();
    });
  });
});
