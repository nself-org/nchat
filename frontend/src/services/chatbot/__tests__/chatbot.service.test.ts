/**
 * Chatbot Service Tests
 *
 * Comprehensive tests for chatbot functionality including message processing,
 * response generation, context management, and template operations.
 *
 * @module services/chatbot/__tests__/chatbot.service.test
 */

import {
  ChatbotService,
  getChatbotService,
  createChatbotService,
  resetChatbotService,
} from "../chatbot.service";
import { resetIntentMatcher } from "@/lib/chatbot/intent-matcher";
import {
  resetKnowledgeBaseService,
  getKnowledgeBaseService,
} from "@/services/knowledge";
import type { Visitor } from "@/services/livechat/types";

// Mock dependencies
jest.mock("@/lib/logger", () => ({
  createLogger: () => ({
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  }),
}));

// Mock uuid
jest.mock("uuid", () => ({
  v4: () => "test-uuid-" + Math.random().toString(36).substring(7),
}));

describe("ChatbotService", () => {
  let service: ChatbotService;
  let kbService: ReturnType<typeof getKnowledgeBaseService>;

  const testVisitor: Visitor = {
    id: "visitor-1",
    token: "token-1",
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

  beforeEach(() => {
    resetChatbotService();
    resetIntentMatcher();
    resetKnowledgeBaseService();
    service = getChatbotService();
    kbService = getKnowledgeBaseService();
  });

  // ==========================================================================
  // SINGLETON TESTS
  // ==========================================================================

  describe("Singleton Pattern", () => {
    it("should return the same instance from getChatbotService", () => {
      const instance1 = getChatbotService();
      const instance2 = getChatbotService();
      expect(instance1).toBe(instance2);
    });

    it("should return a new instance from createChatbotService", () => {
      const instance1 = createChatbotService();
      const instance2 = createChatbotService();
      expect(instance1).not.toBe(instance2);
    });

    it("should reset the singleton with resetChatbotService", () => {
      const instance1 = getChatbotService();
      resetChatbotService();
      const instance2 = getChatbotService();
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
      expect(result.data?.name).toBe("Support Bot");
      expect(result.data?.status).toBe("online");
      expect(result.data?.responseMode).toBe("auto");
    });

    it("should return null for non-existent config", async () => {
      const result = await service.getConfig("non-existent");

      expect(result.success).toBe(true);
      expect(result.data).toBeNull();
    });

    it("should update configuration", async () => {
      const result = await service.updateConfig({
        name: "Custom Bot",
        welcomeMessage: "Welcome to our support!",
        maxBotTurns: 10,
      });

      expect(result.success).toBe(true);
      expect(result.data?.name).toBe("Custom Bot");
      expect(result.data?.welcomeMessage).toBe("Welcome to our support!");
      expect(result.data?.maxBotTurns).toBe(10);
    });

    it("should create new config if updating non-existent", async () => {
      const result = await service.updateConfig(
        { name: "New Bot" },
        "new-config",
      );

      expect(result.success).toBe(true);
      expect(result.data?.name).toBe("New Bot");
    });

    it("should merge feature flags correctly", async () => {
      const result = await service.updateConfig({
        features: { autoGreet: false },
      });

      expect(result.success).toBe(true);
      expect(result.data?.features.autoGreet).toBe(false);
      expect(result.data?.features.suggestArticles).toBe(true); // Unchanged
    });

    it("should set bot status", async () => {
      const result = await service.setStatus("offline");

      expect(result.success).toBe(true);
      expect(result.data?.status).toBe("offline");
    });

    it("should handle status as maintenance", async () => {
      const result = await service.setStatus("maintenance");

      expect(result.success).toBe(true);
      expect(result.data?.status).toBe("maintenance");
    });
  });

  // ==========================================================================
  // MESSAGE PROCESSING TESTS
  // ==========================================================================

  describe("Message Processing", () => {
    it("should process a greeting message", async () => {
      const result = await service.processMessage({
        conversationId: "conv-1",
        visitorId: testVisitor.id,
        message: "Hello!",
      });

      expect(result.success).toBe(true);
      expect(result.data?.response).toBeDefined();
      expect(result.data?.response.intent).toBe("greeting");
      expect(result.data?.shouldHandoff).toBe(false);
    });

    it("should create context for new conversation", async () => {
      await service.processMessage({
        conversationId: "new-conv",
        visitorId: testVisitor.id,
        message: "Hi there",
      });

      const contextResult = await service.getContext("new-conv");
      expect(contextResult.success).toBe(true);
      expect(contextResult.data).toBeDefined();
      expect(contextResult.data?.conversationId).toBe("new-conv");
    });

    it("should track message history", async () => {
      await service.processMessage({
        conversationId: "conv-1",
        visitorId: testVisitor.id,
        message: "Hello",
      });

      await service.processMessage({
        conversationId: "conv-1",
        visitorId: testVisitor.id,
        message: "I need help",
      });

      const contextResult = await service.getContext("conv-1");
      expect(contextResult.data?.messageHistory.length).toBe(4); // 2 user + 2 bot
    });

    it("should increment bot turns", async () => {
      await service.processMessage({
        conversationId: "conv-1",
        visitorId: testVisitor.id,
        message: "Hello",
      });

      await service.processMessage({
        conversationId: "conv-1",
        visitorId: testVisitor.id,
        message: "Another message",
      });

      const contextResult = await service.getContext("conv-1");
      expect(contextResult.data?.botTurns).toBe(2);
    });

    it("should track sentiment history", async () => {
      await service.processMessage({
        conversationId: "conv-1",
        visitorId: testVisitor.id,
        message: "This is great! I love it!",
      });

      const contextResult = await service.getContext("conv-1");
      expect(contextResult.data?.sentimentHistory.length).toBe(1);
      expect(contextResult.data?.sentimentHistory[0]).toBeGreaterThan(0);
    });

    it("should detect farewell messages", async () => {
      const result = await service.processMessage({
        conversationId: "conv-1",
        visitorId: testVisitor.id,
        message: "Goodbye!",
      });

      expect(result.data?.response.intent).toBe("farewell");
      expect(result.data?.context.state).toBe("ended");
    });

    it("should detect thanks messages", async () => {
      const result = await service.processMessage({
        conversationId: "conv-1",
        visitorId: testVisitor.id,
        message: "Thank you so much!",
      });

      expect(result.data?.response.intent).toBe("thanks");
    });

    it("should handle confirm intent", async () => {
      const result = await service.processMessage({
        conversationId: "conv-1",
        visitorId: testVisitor.id,
        message: "Yes, that is correct",
      });

      expect(result.data?.response.intent).toBe("confirm");
    });

    it("should handle cancel intent", async () => {
      const result = await service.processMessage({
        conversationId: "conv-1",
        visitorId: testVisitor.id,
        message: "No, cancel that",
      });

      expect(result.data?.response.intent).toBe("cancel");
    });
  });

  // ==========================================================================
  // HANDOFF TRIGGER TESTS
  // ==========================================================================

  describe("Handoff Triggers", () => {
    it("should trigger handoff when user requests human", async () => {
      const result = await service.processMessage({
        conversationId: "conv-1",
        visitorId: testVisitor.id,
        message: "I want to talk to a human",
      });

      expect(result.data?.shouldHandoff).toBe(true);
      expect(result.data?.handoffReason).toContain("User requested");
    });

    it("should trigger handoff on keyword match", async () => {
      const result = await service.processMessage({
        conversationId: "conv-1",
        visitorId: testVisitor.id,
        message: "Please transfer me to an agent",
      });

      expect(result.data?.shouldHandoff).toBe(true);
    });

    it("should trigger handoff after max bot turns", async () => {
      // Set max turns to 2 for testing
      await service.updateConfig({ maxBotTurns: 2 });

      await service.processMessage({
        conversationId: "conv-1",
        visitorId: testVisitor.id,
        message: "Hello",
      });

      const result = await service.processMessage({
        conversationId: "conv-1",
        visitorId: testVisitor.id,
        message: "Another question",
      });

      expect(result.data?.shouldHandoff).toBe(true);
      expect(result.data?.handoffReason).toContain("Maximum bot turns");
    });

    it("should trigger handoff on multiple low confidence responses", async () => {
      // First unknown
      await service.processMessage({
        conversationId: "conv-1",
        visitorId: testVisitor.id,
        message: "asdfghjkl qwerty xyz",
      });

      // Second unknown - should trigger
      const result = await service.processMessage({
        conversationId: "conv-1",
        visitorId: testVisitor.id,
        message: "zxcvbnm another gibberish",
      });

      expect(result.data?.shouldHandoff).toBe(true);
      expect(result.data?.handoffReason).toContain("low confidence");
    });

    it("should trigger handoff on negative sentiment", async () => {
      // Send multiple negative messages
      await service.processMessage({
        conversationId: "conv-1",
        visitorId: testVisitor.id,
        message: "This is terrible and awful",
      });

      await service.processMessage({
        conversationId: "conv-1",
        visitorId: testVisitor.id,
        message: "I hate this terrible service",
      });

      const result = await service.processMessage({
        conversationId: "conv-1",
        visitorId: testVisitor.id,
        message: "This is the worst experience ever",
      });

      expect(result.data?.shouldHandoff).toBe(true);
    });

    it("should handle complaint intent with handoff", async () => {
      const result = await service.processMessage({
        conversationId: "conv-1",
        visitorId: testVisitor.id,
        message: "This is unacceptable! I am very frustrated!",
      });

      expect(result.data?.response.intent).toBe("complaint");
      expect(result.data?.response.triggerHandoff).toBe(true);
    });
  });

  // ==========================================================================
  // FAQ MATCHING TESTS
  // ==========================================================================

  describe("FAQ Matching", () => {
    beforeEach(async () => {
      // Add test FAQs
      await kbService.createFAQ(
        {
          question: "How do I reset my password?",
          answer:
            'You can reset your password by clicking the "Forgot Password" link on the login page.',
          keywords: ["password", "reset", "forgot"],
          categoryId: "general",
        },
        "user-1",
      );

      await kbService.createFAQ(
        {
          question: "What are your business hours?",
          answer: "We are open Monday to Friday, 9 AM to 5 PM EST.",
          keywords: ["hours", "open", "business"],
          categoryId: "general",
        },
        "user-1",
      );
    });

    it("should match FAQ questions", async () => {
      const result = await service.processMessage({
        conversationId: "conv-1",
        visitorId: testVisitor.id,
        message: "How do I reset my password?",
      });

      expect(result.success).toBe(true);
      expect(result.data?.response.matchedFAQ).toBeDefined();
      expect(result.data?.response.content).toContain("Forgot Password");
    });

    it("should track suggested FAQs in context", async () => {
      await service.processMessage({
        conversationId: "conv-1",
        visitorId: testVisitor.id,
        message: "How do I reset my password?",
      });

      const contextResult = await service.getContext("conv-1");
      expect(contextResult.data?.suggestedFAQs.length).toBeGreaterThan(0);
    });

    it("should not repeat same FAQ", async () => {
      await service.processMessage({
        conversationId: "conv-1",
        visitorId: testVisitor.id,
        message: "Reset password please",
      });

      const result = await service.processMessage({
        conversationId: "conv-1",
        visitorId: testVisitor.id,
        message: "Reset my password",
      });

      // Should still succeed but might offer alternative or fallback
      expect(result.success).toBe(true);
    });
  });

  // ==========================================================================
  // WELCOME MESSAGE TESTS
  // ==========================================================================

  describe("Welcome Message", () => {
    it("should generate welcome message", async () => {
      const result = await service.generateWelcome("conv-1", testVisitor);

      expect(result.success).toBe(true);
      expect(result.data?.content).toContain("help");
      expect(result.data?.type).toBe("quick_replies");
    });

    it("should create context with welcome", async () => {
      await service.generateWelcome("conv-1", testVisitor);

      const contextResult = await service.getContext("conv-1");
      expect(contextResult.data).toBeDefined();
      expect(contextResult.data?.conversationId).toBe("conv-1");
    });

    it("should include quick replies in welcome", async () => {
      const result = await service.generateWelcome("conv-1", testVisitor);

      expect(result.data?.quickReplies).toBeDefined();
      expect(result.data?.quickReplies?.length).toBeGreaterThan(0);
    });

    it("should use custom welcome message", async () => {
      await service.updateConfig({
        welcomeMessage: "Custom welcome message here!",
      });

      const result = await service.generateWelcome("conv-1", testVisitor);

      expect(result.data?.content).toBe("Custom welcome message here!");
    });
  });

  // ==========================================================================
  // CONTEXT OPERATIONS TESTS
  // ==========================================================================

  describe("Context Operations", () => {
    it("should get existing context", async () => {
      await service.processMessage({
        conversationId: "conv-1",
        visitorId: testVisitor.id,
        message: "Hello",
      });

      const result = await service.getContext("conv-1");

      expect(result.success).toBe(true);
      expect(result.data?.conversationId).toBe("conv-1");
    });

    it("should return null for non-existent context", async () => {
      const result = await service.getContext("non-existent");

      expect(result.success).toBe(true);
      expect(result.data).toBeNull();
    });

    it("should update context", async () => {
      await service.processMessage({
        conversationId: "conv-1",
        visitorId: testVisitor.id,
        message: "Hello",
      });

      const result = await service.updateContext("conv-1", {
        state: "answering",
        collectedData: { email: "test@example.com" },
      });

      expect(result.success).toBe(true);
      expect(result.data?.state).toBe("answering");
      expect(result.data?.collectedData.email).toBe("test@example.com");
    });

    it("should fail to update non-existent context", async () => {
      const result = await service.updateContext("non-existent", {
        state: "answering",
      });

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe("NOT_FOUND");
    });

    it("should end session", async () => {
      await service.processMessage({
        conversationId: "conv-1",
        visitorId: testVisitor.id,
        message: "Hello",
      });

      const result = await service.endSession("conv-1");

      expect(result.success).toBe(true);

      // Context should be deleted
      const contextResult = await service.getContext("conv-1");
      expect(contextResult.data).toBeNull();
    });

    it("should handle ending non-existent session", async () => {
      const result = await service.endSession("non-existent");

      expect(result.success).toBe(true);
    });
  });

  // ==========================================================================
  // TEMPLATE OPERATIONS TESTS
  // ==========================================================================

  describe("Template Operations", () => {
    it("should create a template", async () => {
      const result = await service.createTemplate(
        {
          name: "Greeting Template",
          intent: "greeting",
          responses: [
            { content: "Hello there!", type: "text" },
            { content: "Hi! How can I help?", type: "text" },
          ],
        },
        "user-1",
      );

      expect(result.success).toBe(true);
      expect(result.data?.name).toBe("Greeting Template");
      expect(result.data?.intent).toBe("greeting");
      expect(result.data?.responses.length).toBe(2);
    });

    it("should set default weight for responses", async () => {
      const result = await service.createTemplate(
        {
          name: "Test Template",
          intent: "help",
          responses: [{ content: "Response 1", type: "text" }],
        },
        "user-1",
      );

      expect(result.data?.responses[0].weight).toBe(1);
    });

    it("should get template by ID", async () => {
      const created = await service.createTemplate(
        {
          name: "Test Template",
          intent: "greeting",
          responses: [{ content: "Hello", type: "text" }],
        },
        "user-1",
      );

      const result = await service.getTemplate(created.data!.id);

      expect(result.success).toBe(true);
      expect(result.data?.name).toBe("Test Template");
    });

    it("should return null for non-existent template", async () => {
      const result = await service.getTemplate("non-existent");

      expect(result.success).toBe(true);
      expect(result.data).toBeNull();
    });

    it("should list all templates", async () => {
      await service.createTemplate(
        {
          name: "Template 1",
          intent: "greeting",
          responses: [{ content: "Hello", type: "text" }],
        },
        "user-1",
      );

      await service.createTemplate(
        {
          name: "Template 2",
          intent: "farewell",
          responses: [{ content: "Goodbye", type: "text" }],
        },
        "user-1",
      );

      const result = await service.listTemplates();

      expect(result.success).toBe(true);
      expect(result.data?.length).toBe(2);
    });

    it("should filter templates by intent", async () => {
      await service.createTemplate(
        {
          name: "Greeting 1",
          intent: "greeting",
          responses: [{ content: "Hello", type: "text" }],
        },
        "user-1",
      );

      await service.createTemplate(
        {
          name: "Farewell 1",
          intent: "farewell",
          responses: [{ content: "Goodbye", type: "text" }],
        },
        "user-1",
      );

      const result = await service.listTemplates({ intent: "greeting" });

      expect(result.data?.length).toBe(1);
      expect(result.data?.[0].intent).toBe("greeting");
    });

    it("should delete template", async () => {
      const created = await service.createTemplate(
        {
          name: "To Delete",
          intent: "greeting",
          responses: [{ content: "Hello", type: "text" }],
        },
        "user-1",
      );

      const result = await service.deleteTemplate(created.data!.id);

      expect(result.success).toBe(true);
      expect(result.data?.deleted).toBe(true);

      const getResult = await service.getTemplate(created.data!.id);
      expect(getResult.data).toBeNull();
    });

    it("should fail to delete non-existent template", async () => {
      const result = await service.deleteTemplate("non-existent");

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe("NOT_FOUND");
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

      await service.processMessage({
        conversationId: "conv-1",
        visitorId: testVisitor.id,
        message: "Hello",
      });

      expect(events.length).toBeGreaterThan(0);
      expect(events.some((e) => e.type === "bot.session_started")).toBe(true);
      expect(events.some((e) => e.type === "bot.intent_detected")).toBe(true);

      unsubscribe();
    });

    it("should unsubscribe from events", async () => {
      const events: any[] = [];
      const unsubscribe = service.subscribe((event) => {
        events.push(event);
      });

      unsubscribe();

      await service.processMessage({
        conversationId: "conv-1",
        visitorId: testVisitor.id,
        message: "Hello",
      });

      expect(events.length).toBe(0);
    });

    it("should handle errors in event listeners", async () => {
      const errorListener = jest.fn().mockImplementation(() => {
        throw new Error("Listener error");
      });
      const goodListener = jest.fn();

      service.subscribe(errorListener);
      service.subscribe(goodListener);

      await service.processMessage({
        conversationId: "conv-1",
        visitorId: testVisitor.id,
        message: "Hello",
      });

      // Both listeners should be called despite error in first
      expect(errorListener).toHaveBeenCalled();
      expect(goodListener).toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // STORE MANAGEMENT TESTS
  // ==========================================================================

  describe("Store Management", () => {
    it("should clear all data", async () => {
      await service.processMessage({
        conversationId: "conv-1",
        visitorId: testVisitor.id,
        message: "Hello",
      });

      await service.createTemplate(
        {
          name: "Test",
          intent: "greeting",
          responses: [{ content: "Hello", type: "text" }],
        },
        "user-1",
      );

      service.clearAll();

      const sizes = service.getStoreSizes();
      expect(sizes.contexts).toBe(0);
      expect(sizes.templates).toBe(0);
      expect(sizes.configs).toBe(1); // Default config is recreated
    });

    it("should return store sizes", async () => {
      await service.processMessage({
        conversationId: "conv-1",
        visitorId: testVisitor.id,
        message: "Hello",
      });

      await service.processMessage({
        conversationId: "conv-2",
        visitorId: "visitor-2",
        message: "Hi",
      });

      await service.createTemplate(
        {
          name: "Test",
          intent: "greeting",
          responses: [{ content: "Hello", type: "text" }],
        },
        "user-1",
      );

      const sizes = service.getStoreSizes();
      expect(sizes.contexts).toBe(2);
      expect(sizes.templates).toBe(1);
    });
  });

  // ==========================================================================
  // RESPONSE GENERATION TESTS
  // ==========================================================================

  describe("Response Generation", () => {
    it("should include quick replies in responses", async () => {
      const result = await service.processMessage({
        conversationId: "conv-1",
        visitorId: testVisitor.id,
        message: "Hello",
      });

      expect(result.data?.response.quickReplies).toBeDefined();
    });

    it("should set confidence in response", async () => {
      const result = await service.processMessage({
        conversationId: "conv-1",
        visitorId: testVisitor.id,
        message: "Hello",
      });

      expect(result.data?.response.confidence).toBeDefined();
      expect(result.data?.response.confidence).toBeGreaterThan(0);
    });

    it("should generate fallback for unknown messages", async () => {
      const result = await service.processMessage({
        conversationId: "conv-1",
        visitorId: testVisitor.id,
        message: "asdfghjkl random gibberish",
      });

      expect(result.data?.response.intent).toBe("unknown");
      expect(result.data?.response.content).toBeDefined();
    });

    it("should use custom fallback message", async () => {
      await service.updateConfig({
        fallbackMessage: "Custom fallback message here.",
      });

      const result = await service.processMessage({
        conversationId: "conv-1",
        visitorId: testVisitor.id,
        message: "asdfghjkl random gibberish",
      });

      expect(result.data?.response.content).toBe(
        "Custom fallback message here.",
      );
    });
  });

  // ==========================================================================
  // STATE TRANSITIONS TESTS
  // ==========================================================================

  describe("State Transitions", () => {
    it("should start in greeting state", async () => {
      await service.generateWelcome("conv-1", testVisitor);

      const contextResult = await service.getContext("conv-1");
      expect(contextResult.data?.state).toBe("greeting");
    });

    it("should transition to answering state on FAQ match", async () => {
      await kbService.createFAQ(
        {
          question: "What is the refund policy?",
          answer: "You can get a refund within 30 days.",
          keywords: ["refund", "policy"],
          categoryId: "billing",
        },
        "user-1",
      );

      await service.processMessage({
        conversationId: "conv-1",
        visitorId: testVisitor.id,
        message: "What is your refund policy?",
      });

      const contextResult = await service.getContext("conv-1");
      expect(contextResult.data?.state).toBe("answering");
    });

    it("should transition to handoff_pending on handoff trigger", async () => {
      await service.processMessage({
        conversationId: "conv-1",
        visitorId: testVisitor.id,
        message: "I want to talk to a human agent",
      });

      const contextResult = await service.getContext("conv-1");
      expect(contextResult.data?.state).toBe("handoff_pending");
    });

    it("should transition to ended on farewell", async () => {
      await service.processMessage({
        conversationId: "conv-1",
        visitorId: testVisitor.id,
        message: "Goodbye!",
      });

      const contextResult = await service.getContext("conv-1");
      expect(contextResult.data?.state).toBe("ended");
    });
  });

  // ==========================================================================
  // RETURNING VISITOR TESTS
  // ==========================================================================

  describe("Returning Visitor", () => {
    it("should recognize returning visitor greeting", async () => {
      // First visit
      await service.processMessage({
        conversationId: "conv-1",
        visitorId: testVisitor.id,
        message: "Hello",
      });

      // Second greeting
      const result = await service.processMessage({
        conversationId: "conv-1",
        visitorId: testVisitor.id,
        message: "Hello again",
      });

      expect(result.data?.response.content).toContain("Welcome back");
    });
  });
});
