/**
 * Livechat Service Tests
 *
 * Comprehensive tests for the core livechat functionality.
 */

import {
  LivechatService,
  createLivechatService,
  resetLivechatService,
} from "../livechat.service";
import type {
  CreateVisitorInput,
  CreateAgentInput,
  CreateConversationInput,
  SendMessageInput,
} from "../types";

describe("LivechatService", () => {
  let service: LivechatService;

  beforeEach(() => {
    resetLivechatService();
    service = createLivechatService();
  });

  afterEach(() => {
    service.clearAll();
  });

  // ==========================================================================
  // VISITOR TESTS
  // ==========================================================================

  describe("Visitors", () => {
    const defaultVisitorInput: CreateVisitorInput = {
      name: "John Doe",
      email: "john@example.com",
      channel: "web_widget",
    };

    describe("createVisitor", () => {
      it("should create a visitor with all provided fields", async () => {
        const input: CreateVisitorInput = {
          ...defaultVisitorInput,
          phone: "+1234567890",
          department: "sales",
          customFields: { source: "google" },
          metadata: { page: "/pricing" },
        };

        const result = await service.createVisitor(input);

        expect(result.success).toBe(true);
        expect(result.data).toBeDefined();
        expect(result.data?.name).toBe(input.name);
        expect(result.data?.email).toBe(input.email);
        expect(result.data?.phone).toBe(input.phone);
        expect(result.data?.channel).toBe(input.channel);
        expect(result.data?.department).toBe(input.department);
        expect(result.data?.customFields).toEqual(input.customFields);
        expect(result.data?.status).toBe("online");
        expect(result.data?.token).toBeDefined();
      });

      it("should generate a unique token for each visitor", async () => {
        const result1 = await service.createVisitor(defaultVisitorInput);
        const result2 = await service.createVisitor(defaultVisitorInput);

        expect(result1.data?.token).not.toBe(result2.data?.token);
      });

      it("should use provided token if specified", async () => {
        const customToken = "v_custom_token_123";
        const result = await service.createVisitor({
          ...defaultVisitorInput,
          token: customToken,
        });

        expect(result.data?.token).toBe(customToken);
      });

      it("should initialize visitor stats correctly", async () => {
        const result = await service.createVisitor(defaultVisitorInput);

        expect(result.data?.visitsCount).toBe(1);
        expect(result.data?.totalChats).toBe(0);
        expect(result.data?.tags).toEqual([]);
      });
    });

    describe("getVisitor", () => {
      it("should retrieve a visitor by ID", async () => {
        const createResult = await service.createVisitor(defaultVisitorInput);
        const visitorId = createResult.data!.id;

        const result = await service.getVisitor(visitorId);

        expect(result.success).toBe(true);
        expect(result.data?.id).toBe(visitorId);
      });

      it("should return null for non-existent visitor", async () => {
        const result = await service.getVisitor("non-existent-id");

        expect(result.success).toBe(true);
        expect(result.data).toBeNull();
      });
    });

    describe("getVisitorByToken", () => {
      it("should retrieve a visitor by token", async () => {
        const createResult = await service.createVisitor(defaultVisitorInput);
        const token = createResult.data!.token;

        const result = await service.getVisitorByToken(token);

        expect(result.success).toBe(true);
        expect(result.data?.token).toBe(token);
      });

      it("should return null for non-existent token", async () => {
        const result = await service.getVisitorByToken("invalid-token");

        expect(result.success).toBe(true);
        expect(result.data).toBeNull();
      });
    });

    describe("updateVisitor", () => {
      it("should update visitor fields", async () => {
        const createResult = await service.createVisitor(defaultVisitorInput);
        const visitorId = createResult.data!.id;

        const result = await service.updateVisitor(visitorId, {
          name: "Jane Doe",
          phone: "+9876543210",
          tags: ["vip", "returning"],
        });

        expect(result.success).toBe(true);
        expect(result.data?.name).toBe("Jane Doe");
        expect(result.data?.phone).toBe("+9876543210");
        expect(result.data?.tags).toEqual(["vip", "returning"]);
      });

      it("should merge custom fields", async () => {
        const createResult = await service.createVisitor({
          ...defaultVisitorInput,
          customFields: { field1: "value1" },
        });
        const visitorId = createResult.data!.id;

        const result = await service.updateVisitor(visitorId, {
          customFields: { field2: "value2" },
        });

        expect(result.data?.customFields).toEqual({
          field1: "value1",
          field2: "value2",
        });
      });

      it("should return error for non-existent visitor", async () => {
        const result = await service.updateVisitor("non-existent-id", {
          name: "Test",
        });

        expect(result.success).toBe(false);
        expect(result.error?.code).toBe("NOT_FOUND");
      });
    });

    describe("updateVisitorStatus", () => {
      it("should update visitor online status", async () => {
        const createResult = await service.createVisitor(defaultVisitorInput);
        const visitorId = createResult.data!.id;

        const result = await service.updateVisitorStatus(visitorId, "offline");

        expect(result.success).toBe(true);
        expect(result.data?.status).toBe("offline");
        expect(result.data?.lastSeenAt).toBeDefined();
      });
    });

    describe("listVisitors", () => {
      it("should list all visitors with pagination", async () => {
        // Create multiple visitors
        await service.createVisitor({
          ...defaultVisitorInput,
          name: "Visitor 1",
        });
        await service.createVisitor({
          ...defaultVisitorInput,
          name: "Visitor 2",
        });
        await service.createVisitor({
          ...defaultVisitorInput,
          name: "Visitor 3",
        });

        const result = await service.listVisitors({ limit: 2, offset: 0 });

        expect(result.success).toBe(true);
        expect(result.data?.items.length).toBe(2);
        expect(result.data?.totalCount).toBe(3);
        expect(result.data?.hasMore).toBe(true);
      });

      it("should filter visitors by status", async () => {
        const createResult = await service.createVisitor(defaultVisitorInput);
        await service.updateVisitorStatus(createResult.data!.id, "offline");
        await service.createVisitor(defaultVisitorInput); // This one stays online

        const result = await service.listVisitors({ status: "online" });

        expect(result.success).toBe(true);
        expect(result.data?.items.length).toBe(1);
      });
    });
  });

  // ==========================================================================
  // AGENT TESTS
  // ==========================================================================

  describe("Agents", () => {
    const defaultAgentInput: CreateAgentInput = {
      userId: "user-123",
      departments: ["support"],
      maxConcurrentChats: 5,
      skills: ["billing", "technical"],
      languages: ["en", "es"],
    };

    describe("createAgent", () => {
      it("should create an agent with all provided fields", async () => {
        const result = await service.createAgent(defaultAgentInput);

        expect(result.success).toBe(true);
        expect(result.data).toBeDefined();
        expect(result.data?.userId).toBe(defaultAgentInput.userId);
        expect(result.data?.departments).toEqual(defaultAgentInput.departments);
        expect(result.data?.maxConcurrentChats).toBe(
          defaultAgentInput.maxConcurrentChats,
        );
        expect(result.data?.skills).toEqual(defaultAgentInput.skills);
        expect(result.data?.languages).toEqual(defaultAgentInput.languages);
        expect(result.data?.status).toBe("offline");
        expect(result.data?.activeChats).toBe(0);
      });

      it("should not allow duplicate agents for same user", async () => {
        await service.createAgent(defaultAgentInput);
        const result = await service.createAgent(defaultAgentInput);

        expect(result.success).toBe(false);
        expect(result.error?.code).toBe("CONFLICT");
      });

      it("should use default values for optional fields", async () => {
        const result = await service.createAgent({ userId: "user-456" });

        expect(result.data?.maxConcurrentChats).toBe(5);
        expect(result.data?.departments).toEqual([]);
        expect(result.data?.skills).toEqual([]);
        expect(result.data?.languages).toEqual(["en"]);
        expect(result.data?.priority).toBe(1);
      });
    });

    describe("getAgent", () => {
      it("should retrieve an agent by ID", async () => {
        const createResult = await service.createAgent(defaultAgentInput);
        const agentId = createResult.data!.id;

        const result = await service.getAgent(agentId);

        expect(result.success).toBe(true);
        expect(result.data?.id).toBe(agentId);
      });
    });

    describe("getAgentByUserId", () => {
      it("should retrieve an agent by user ID", async () => {
        await service.createAgent(defaultAgentInput);

        const result = await service.getAgentByUserId(defaultAgentInput.userId);

        expect(result.success).toBe(true);
        expect(result.data?.userId).toBe(defaultAgentInput.userId);
      });
    });

    describe("updateAgent", () => {
      it("should update agent fields", async () => {
        const createResult = await service.createAgent(defaultAgentInput);
        const agentId = createResult.data!.id;

        const result = await service.updateAgent(agentId, {
          departments: ["sales", "support"],
          maxConcurrentChats: 10,
        });

        expect(result.success).toBe(true);
        expect(result.data?.departments).toEqual(["sales", "support"]);
        expect(result.data?.maxConcurrentChats).toBe(10);
      });
    });

    describe("updateAgentStatus", () => {
      it("should update agent status", async () => {
        const createResult = await service.createAgent(defaultAgentInput);
        const agentId = createResult.data!.id;

        const result = await service.updateAgentStatus(
          agentId,
          "available",
          "Ready to help!",
        );

        expect(result.success).toBe(true);
        expect(result.data?.status).toBe("available");
        expect(result.data?.statusMessage).toBe("Ready to help!");
      });
    });

    describe("listAvailableAgents", () => {
      it("should list only available agents", async () => {
        const agent1 = await service.createAgent({
          userId: "user-1",
          departments: ["support"],
        });
        const agent2 = await service.createAgent({
          userId: "user-2",
          departments: ["support"],
        });

        await service.updateAgentStatus(agent1.data!.id, "available");
        await service.updateAgentStatus(agent2.data!.id, "offline");

        const result = await service.listAvailableAgents("support");

        expect(result.success).toBe(true);
        expect(result.data?.length).toBe(1);
        expect(result.data?.[0].id).toBe(agent1.data!.id);
      });

      it("should filter by department", async () => {
        const agent1 = await service.createAgent({
          userId: "user-1",
          departments: ["support"],
        });
        const agent2 = await service.createAgent({
          userId: "user-2",
          departments: ["sales"],
        });

        await service.updateAgentStatus(agent1.data!.id, "available");
        await service.updateAgentStatus(agent2.data!.id, "available");

        const result = await service.listAvailableAgents("support");

        expect(result.data?.length).toBe(1);
        expect(result.data?.[0].departments).toContain("support");
      });

      it("should exclude agents at max capacity", async () => {
        const agentResult = await service.createAgent({
          userId: "user-1",
          maxConcurrentChats: 1,
        });

        await service.updateAgentStatus(agentResult.data!.id, "available");

        // Create a visitor and conversation to occupy the agent
        const visitorResult = await service.createVisitor({
          name: "Visitor",
          channel: "web_widget",
        });

        const conversationResult = await service.createConversation({
          visitorId: visitorResult.data!.id,
          channel: "web_widget",
        });

        await service.assignAgent(
          conversationResult.data!.id,
          agentResult.data!.id,
        );

        const result = await service.listAvailableAgents();

        expect(result.data?.length).toBe(0);
      });
    });
  });

  // ==========================================================================
  // CONVERSATION TESTS
  // ==========================================================================

  describe("Conversations", () => {
    let visitorId: string;

    beforeEach(async () => {
      const visitorResult = await service.createVisitor({
        name: "Test Visitor",
        email: "visitor@test.com",
        channel: "web_widget",
      });
      visitorId = visitorResult.data!.id;
    });

    describe("createConversation", () => {
      it("should create a conversation", async () => {
        const result = await service.createConversation({
          visitorId,
          channel: "web_widget",
          priority: "high",
          department: "support",
        });

        expect(result.success).toBe(true);
        expect(result.data).toBeDefined();
        expect(result.data?.visitor.id).toBe(visitorId);
        expect(result.data?.channel).toBe("web_widget");
        expect(result.data?.priority).toBe("high");
        expect(result.data?.department).toBe("support");
        expect(result.data?.status).toBe("queued");
        expect(result.data?.queuedAt).toBeDefined();
      });

      it("should fail for non-existent visitor", async () => {
        const result = await service.createConversation({
          visitorId: "non-existent",
          channel: "web_widget",
        });

        expect(result.success).toBe(false);
        expect(result.error?.code).toBe("NOT_FOUND");
      });

      it("should add conversation to queue", async () => {
        await service.createConversation({ visitorId, channel: "web_widget" });

        const queueResult = await service.getQueue();

        expect(queueResult.data?.length).toBe(1);
      });

      it("should send initial message if provided", async () => {
        const result = await service.createConversation({
          visitorId,
          channel: "web_widget",
          message: "Hello, I need help!",
        });

        const messagesResult = await service.getMessages(result.data!.id, {});

        expect(messagesResult.data?.items.length).toBe(1);
        expect(messagesResult.data?.items[0].content).toBe(
          "Hello, I need help!",
        );
      });

      it("should update visitor status to waiting", async () => {
        await service.createConversation({ visitorId, channel: "web_widget" });

        const visitorResult = await service.getVisitor(visitorId);

        expect(visitorResult.data?.status).toBe("waiting");
      });

      it("should increment visitor totalChats", async () => {
        await service.createConversation({ visitorId, channel: "web_widget" });

        const visitorResult = await service.getVisitor(visitorId);

        expect(visitorResult.data?.totalChats).toBe(1);
      });
    });

    describe("assignAgent", () => {
      let agentId: string;
      let conversationId: string;

      beforeEach(async () => {
        const agentResult = await service.createAgent({ userId: "agent-user" });
        agentId = agentResult.data!.id;
        await service.updateAgentStatus(agentId, "available");

        const conversationResult = await service.createConversation({
          visitorId,
          channel: "web_widget",
        });
        conversationId = conversationResult.data!.id;
      });

      it("should assign an agent to a conversation", async () => {
        const result = await service.assignAgent(conversationId, agentId);

        expect(result.success).toBe(true);
        expect(result.data?.agent?.id).toBe(agentId);
        expect(result.data?.status).toBe("open");
        expect(result.data?.assignedAt).toBeDefined();
      });

      it("should remove conversation from queue", async () => {
        await service.assignAgent(conversationId, agentId);

        const queueResult = await service.getQueue();

        expect(queueResult.data?.length).toBe(0);
      });

      it("should increment agent activeChats", async () => {
        await service.assignAgent(conversationId, agentId);

        const agentResult = await service.getAgent(agentId);

        expect(agentResult.data?.activeChats).toBe(1);
      });

      it("should update visitor status to chatting", async () => {
        await service.assignAgent(conversationId, agentId);

        const visitorResult = await service.getVisitor(visitorId);

        expect(visitorResult.data?.status).toBe("chatting");
      });

      it("should fail for unavailable agent", async () => {
        await service.updateAgentStatus(agentId, "offline");

        const result = await service.assignAgent(conversationId, agentId);

        expect(result.success).toBe(false);
        expect(result.error?.code).toBe("CONFLICT");
      });

      it("should fail for agent at max capacity", async () => {
        // Create and assign first conversation
        const visitor2 = await service.createVisitor({
          name: "Visitor 2",
          channel: "web_widget",
        });
        const conv2 = await service.createConversation({
          visitorId: visitor2.data!.id,
          channel: "web_widget",
        });

        // Set max to 1 and assign first conversation
        await service.updateAgent(agentId, { maxConcurrentChats: 1 });
        await service.assignAgent(conv2.data!.id, agentId);

        // Try to assign second conversation
        const result = await service.assignAgent(conversationId, agentId);

        expect(result.success).toBe(false);
        expect(result.error?.code).toBe("CONFLICT");
      });
    });

    describe("transferConversation", () => {
      let agentId: string;
      let conversationId: string;

      beforeEach(async () => {
        const agentResult = await service.createAgent({ userId: "agent-user" });
        agentId = agentResult.data!.id;
        await service.updateAgentStatus(agentId, "available");

        const conversationResult = await service.createConversation({
          visitorId,
          channel: "web_widget",
        });
        conversationId = conversationResult.data!.id;
        await service.assignAgent(conversationId, agentId);
      });

      it("should transfer to another agent", async () => {
        const agent2Result = await service.createAgent({ userId: "agent-2" });
        await service.updateAgentStatus(agent2Result.data!.id, "available");

        const result = await service.transferConversation(
          conversationId,
          { toAgentId: agent2Result.data!.id, reason: "Specialist needed" },
          agentId,
        );

        expect(result.success).toBe(true);
        expect(result.data?.agent?.id).toBe(agent2Result.data!.id);
        expect(result.data?.transferHistory.length).toBe(1);
        expect(result.data?.transferHistory[0].reason).toBe(
          "Specialist needed",
        );
      });

      it("should transfer to queue if no agent specified", async () => {
        const result = await service.transferConversation(
          conversationId,
          { reason: "Re-queue" },
          agentId,
        );

        expect(result.success).toBe(true);
        expect(result.data?.agent).toBeUndefined();
        expect(result.data?.status).toBe("queued");

        const queueResult = await service.getQueue();
        expect(queueResult.data?.length).toBe(1);
      });

      it("should update department when transferring", async () => {
        const result = await service.transferConversation(
          conversationId,
          { toDepartment: "sales" },
          agentId,
        );

        expect(result.data?.department).toBe("sales");
      });

      it("should decrement previous agent activeChats", async () => {
        await service.transferConversation(
          conversationId,
          { reason: "Re-queue" },
          agentId,
        );

        const agentResult = await service.getAgent(agentId);

        expect(agentResult.data?.activeChats).toBe(0);
      });
    });

    describe("resolveConversation", () => {
      let agentId: string;
      let conversationId: string;

      beforeEach(async () => {
        const agentResult = await service.createAgent({ userId: "agent-user" });
        agentId = agentResult.data!.id;
        await service.updateAgentStatus(agentId, "available");

        const conversationResult = await service.createConversation({
          visitorId,
          channel: "web_widget",
        });
        conversationId = conversationResult.data!.id;
        await service.assignAgent(conversationId, agentId);
      });

      it("should resolve a conversation", async () => {
        const result = await service.resolveConversation(
          conversationId,
          agentId,
        );

        expect(result.success).toBe(true);
        expect(result.data?.status).toBe("resolved");
        expect(result.data?.resolvedAt).toBeDefined();
      });

      it("should decrement agent activeChats", async () => {
        await service.resolveConversation(conversationId, agentId);

        const agentResult = await service.getAgent(agentId);

        expect(agentResult.data?.activeChats).toBe(0);
      });

      it("should increment agent totalChatsHandled", async () => {
        await service.resolveConversation(conversationId, agentId);

        const agentResult = await service.getAgent(agentId);

        expect(agentResult.data?.totalChatsHandled).toBe(1);
      });

      it("should fail for already resolved conversation", async () => {
        await service.resolveConversation(conversationId, agentId);

        const result = await service.resolveConversation(
          conversationId,
          agentId,
        );

        expect(result.success).toBe(false);
        expect(result.error?.code).toBe("CONFLICT");
      });
    });

    describe("closeConversation", () => {
      it("should close a conversation", async () => {
        const conversationResult = await service.createConversation({
          visitorId,
          channel: "web_widget",
        });

        const result = await service.closeConversation(
          conversationResult.data!.id,
        );

        expect(result.success).toBe(true);
        expect(result.data?.status).toBe("closed");
        expect(result.data?.closedAt).toBeDefined();
      });
    });

    describe("listConversations", () => {
      it("should filter conversations by status", async () => {
        await service.createConversation({ visitorId, channel: "web_widget" });

        const visitor2 = await service.createVisitor({
          name: "Visitor 2",
          channel: "web_widget",
        });
        const conv2 = await service.createConversation({
          visitorId: visitor2.data!.id,
          channel: "web_widget",
        });
        await service.closeConversation(conv2.data!.id);

        const result = await service.listConversations({ status: "queued" });

        expect(result.data?.items.length).toBe(1);
        expect(result.data?.items[0].status).toBe("queued");
      });

      it("should filter conversations by channel", async () => {
        await service.createConversation({ visitorId, channel: "web_widget" });

        const visitor2 = await service.createVisitor({
          name: "Visitor 2",
          channel: "email",
        });
        await service.createConversation({
          visitorId: visitor2.data!.id,
          channel: "email",
        });

        const result = await service.listConversations({ channel: "email" });

        expect(result.data?.items.length).toBe(1);
        expect(result.data?.items[0].channel).toBe("email");
      });
    });
  });

  // ==========================================================================
  // MESSAGE TESTS
  // ==========================================================================

  describe("Messages", () => {
    let conversationId: string;

    beforeEach(async () => {
      const visitorResult = await service.createVisitor({
        name: "Test Visitor",
        channel: "web_widget",
      });
      const conversationResult = await service.createConversation({
        visitorId: visitorResult.data!.id,
        channel: "web_widget",
      });
      conversationId = conversationResult.data!.id;
    });

    describe("sendMessage", () => {
      it("should send a text message", async () => {
        const result = await service.sendMessage({
          conversationId,
          senderId: "visitor-123",
          senderType: "visitor",
          content: "Hello, I need help!",
        });

        expect(result.success).toBe(true);
        expect(result.data?.content).toBe("Hello, I need help!");
        expect(result.data?.type).toBe("text");
        expect(result.data?.senderType).toBe("visitor");
      });

      it("should track message metrics", async () => {
        await service.sendMessage({
          conversationId,
          senderId: "visitor-123",
          senderType: "visitor",
          content: "Message 1",
        });

        await service.sendMessage({
          conversationId,
          senderId: "agent-123",
          senderType: "agent",
          content: "Message 2",
        });

        const conversationResult =
          await service.getConversation(conversationId);

        expect(conversationResult.data?.metrics.messagesCount).toBe(2);
        expect(conversationResult.data?.metrics.visitorMessages).toBe(1);
        expect(conversationResult.data?.metrics.agentMessages).toBe(1);
      });

      it("should handle attachments", async () => {
        const result = await service.sendMessage({
          conversationId,
          senderId: "visitor-123",
          senderType: "visitor",
          content: "See attached",
          type: "file",
          attachments: [
            {
              type: "image",
              name: "screenshot.png",
              url: "https://example.com/image.png",
              size: 12345,
              mimeType: "image/png",
            },
          ],
        });

        expect(result.data?.attachments?.length).toBe(1);
        expect(result.data?.attachments?.[0].name).toBe("screenshot.png");
      });

      it("should mark internal notes", async () => {
        const result = await service.sendMessage({
          conversationId,
          senderId: "agent-123",
          senderType: "agent",
          content: "Internal note for team",
          isInternal: true,
        });

        expect(result.data?.isInternal).toBe(true);
      });

      it("should fail for non-existent conversation", async () => {
        const result = await service.sendMessage({
          conversationId: "non-existent",
          senderId: "visitor-123",
          senderType: "visitor",
          content: "Hello",
        });

        expect(result.success).toBe(false);
        expect(result.error?.code).toBe("NOT_FOUND");
      });
    });

    describe("getMessages", () => {
      beforeEach(async () => {
        // Add some messages
        for (let i = 0; i < 5; i++) {
          await service.sendMessage({
            conversationId,
            senderId: "visitor",
            senderType: "visitor",
            content: `Message ${i + 1}`,
          });
        }

        // Add internal note
        await service.sendMessage({
          conversationId,
          senderId: "agent",
          senderType: "agent",
          content: "Internal note",
          isInternal: true,
        });
      });

      it("should paginate messages", async () => {
        const result = await service.getMessages(conversationId, { limit: 3 });

        expect(result.data?.items.length).toBe(3);
        expect(result.data?.totalCount).toBe(5); // Excludes internal by default
        expect(result.data?.hasMore).toBe(true);
      });

      it("should exclude internal messages by default", async () => {
        const result = await service.getMessages(conversationId, {});

        const internalMessages = result.data?.items.filter((m) => m.isInternal);

        expect(internalMessages?.length).toBe(0);
      });

      it("should include internal messages when specified", async () => {
        const result = await service.getMessages(conversationId, {
          includeInternal: true,
        });

        expect(result.data?.totalCount).toBe(6);
      });
    });

    describe("markMessagesRead", () => {
      it("should mark messages as read", async () => {
        await service.sendMessage({
          conversationId,
          senderId: "visitor",
          senderType: "visitor",
          content: "Hello",
        });

        const result = await service.markMessagesRead(
          conversationId,
          "agent",
          "agent",
        );

        expect(result.success).toBe(true);
        expect(result.data).toBe(1);
      });
    });
  });

  // ==========================================================================
  // QUEUE TESTS
  // ==========================================================================

  describe("Queue", () => {
    describe("getQueue", () => {
      it("should return empty queue initially", async () => {
        const result = await service.getQueue();

        expect(result.success).toBe(true);
        expect(result.data?.length).toBe(0);
      });

      it("should include queued conversations", async () => {
        const visitorResult = await service.createVisitor({
          name: "Visitor",
          channel: "web_widget",
        });
        await service.createConversation({
          visitorId: visitorResult.data!.id,
          channel: "web_widget",
          priority: "high",
        });

        const result = await service.getQueue();

        expect(result.data?.length).toBe(1);
        expect(result.data?.[0].priority).toBe("high");
      });

      it("should filter by department", async () => {
        const v1 = await service.createVisitor({
          name: "V1",
          channel: "web_widget",
        });
        const v2 = await service.createVisitor({
          name: "V2",
          channel: "web_widget",
        });

        await service.createConversation({
          visitorId: v1.data!.id,
          channel: "web_widget",
          department: "support",
        });
        await service.createConversation({
          visitorId: v2.data!.id,
          channel: "web_widget",
          department: "sales",
        });

        const result = await service.getQueue("support");

        expect(result.data?.length).toBe(1);
        expect(result.data?.[0].department).toBe("support");
      });
    });

    describe("getQueueStats", () => {
      it("should return queue statistics", async () => {
        const v1 = await service.createVisitor({
          name: "V1",
          channel: "web_widget",
        });
        await service.createConversation({
          visitorId: v1.data!.id,
          channel: "web_widget",
        });

        const agentResult = await service.createAgent({ userId: "agent-1" });
        await service.updateAgentStatus(agentResult.data!.id, "available");

        const result = await service.getQueueStats();

        expect(result.success).toBe(true);
        expect(result.data?.totalQueued).toBe(1);
        expect(result.data?.availableAgents).toBe(1);
      });
    });

    describe("getQueuePosition", () => {
      it("should return queue position", async () => {
        const v1 = await service.createVisitor({
          name: "V1",
          channel: "web_widget",
        });
        const conv1 = await service.createConversation({
          visitorId: v1.data!.id,
          channel: "web_widget",
          priority: "low",
        });

        const v2 = await service.createVisitor({
          name: "V2",
          channel: "web_widget",
        });
        const conv2 = await service.createConversation({
          visitorId: v2.data!.id,
          channel: "web_widget",
          priority: "high",
        });

        // High priority should be first
        const result1 = await service.getQueuePosition(conv2.data!.id);
        const result2 = await service.getQueuePosition(conv1.data!.id);

        expect(result1.data?.position).toBe(1);
        expect(result2.data?.position).toBe(2);
      });

      it("should return null for assigned conversation", async () => {
        const v1 = await service.createVisitor({
          name: "V1",
          channel: "web_widget",
        });
        const conv = await service.createConversation({
          visitorId: v1.data!.id,
          channel: "web_widget",
        });

        const agentResult = await service.createAgent({ userId: "agent-1" });
        await service.updateAgentStatus(agentResult.data!.id, "available");
        await service.assignAgent(conv.data!.id, agentResult.data!.id);

        const result = await service.getQueuePosition(conv.data!.id);

        expect(result.data).toBeNull();
      });
    });
  });

  // ==========================================================================
  // DEPARTMENT TESTS
  // ==========================================================================

  describe("Departments", () => {
    describe("createDepartment", () => {
      it("should create a department", async () => {
        const result = await service.createDepartment({
          name: "Technical Support",
          description: "Technical assistance",
          email: "support@example.com",
          enabled: true,
          showOnRegistration: true,
          showOnOfflineForm: true,
          requestTagBeforeClosingChat: false,
        });

        expect(result.success).toBe(true);
        expect(result.data?.name).toBe("Technical Support");
        expect(result.data?.enabled).toBe(true);
      });
    });

    describe("listDepartments", () => {
      it("should list all departments", async () => {
        await service.createDepartment({
          name: "Sales",
          enabled: true,
          showOnRegistration: true,
          showOnOfflineForm: true,
          requestTagBeforeClosingChat: false,
        });
        await service.createDepartment({
          name: "Support",
          enabled: false,
          showOnRegistration: true,
          showOnOfflineForm: true,
          requestTagBeforeClosingChat: false,
        });

        const result = await service.listDepartments();

        expect(result.data?.length).toBe(2);
      });

      it("should filter by enabled status", async () => {
        await service.createDepartment({
          name: "Sales",
          enabled: true,
          showOnRegistration: true,
          showOnOfflineForm: true,
          requestTagBeforeClosingChat: false,
        });
        await service.createDepartment({
          name: "Support",
          enabled: false,
          showOnRegistration: true,
          showOnOfflineForm: true,
          requestTagBeforeClosingChat: false,
        });

        const result = await service.listDepartments({ enabled: true });

        expect(result.data?.length).toBe(1);
        expect(result.data?.[0].name).toBe("Sales");
      });
    });
  });

  // ==========================================================================
  // EVENT SUBSCRIPTION TESTS
  // ==========================================================================

  describe("Events", () => {
    it("should notify subscribers of visitor events", async () => {
      const events: any[] = [];
      const unsubscribe = service.subscribe((event) => events.push(event));

      await service.createVisitor({ name: "Test", channel: "web_widget" });

      expect(events.length).toBe(1);
      expect(events[0].type).toBe("visitor.created");

      unsubscribe();
    });

    it("should notify subscribers of conversation events", async () => {
      const events: any[] = [];
      const unsubscribe = service.subscribe((event) => events.push(event));

      const visitorResult = await service.createVisitor({
        name: "Test",
        channel: "web_widget",
      });
      await service.createConversation({
        visitorId: visitorResult.data!.id,
        channel: "web_widget",
      });

      const conversationEvents = events.filter(
        (e) => e.type === "conversation.created",
      );
      expect(conversationEvents.length).toBe(1);

      unsubscribe();
    });

    it("should allow unsubscribing", async () => {
      const events: any[] = [];
      const unsubscribe = service.subscribe((event) => events.push(event));

      await service.createVisitor({ name: "Test 1", channel: "web_widget" });

      unsubscribe();

      await service.createVisitor({ name: "Test 2", channel: "web_widget" });

      // Should only have events from before unsubscribe
      const visitorEvents = events.filter((e) => e.type === "visitor.created");
      expect(visitorEvents.length).toBe(1);
    });
  });
});
