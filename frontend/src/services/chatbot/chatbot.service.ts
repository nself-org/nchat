/**
 * Chatbot Service
 *
 * Core service for chatbot functionality including automated responses,
 * FAQ matching, and conversation context management.
 *
 * Features:
 * - Message processing with intent detection
 * - FAQ and knowledge base integration
 * - Conversation context tracking
 * - Response template management
 * - Handoff detection and triggering
 *
 * @module services/chatbot/chatbot.service
 * @version 1.0.0
 */

import { createLogger } from "@/lib/logger";
import { v4 as uuidv4 } from "uuid";
import type { APIResponse } from "@/types/api";
import type {
  ChatbotConfig,
  BotStatus,
  BotResponseMode,
  BotResponse,
  BotResponseType,
  BotResponseTemplate,
  BotConversationContext,
  BotSessionState,
  QuickReply,
  IntentCategory,
  DetectedIntent,
  ProcessMessageInput,
  ProcessMessageResult,
  CreateResponseTemplateInput,
  UpdateChatbotConfigInput,
  ChatbotEvent,
  ChatbotEventType,
} from "@/lib/chatbot/chatbot-types";
import { IntentMatcher, getIntentMatcher } from "@/lib/chatbot/intent-matcher";
import { getKnowledgeBaseService } from "@/services/knowledge";
import type { Visitor } from "@/services/livechat/types";

const log = createLogger("ChatbotService");

// ============================================================================
// IN-MEMORY STORES
// ============================================================================

const configs = new Map<string, ChatbotConfig>();
const contexts = new Map<string, BotConversationContext>();
const templates = new Map<string, BotResponseTemplate>();

// Event listeners
type EventListener = (event: ChatbotEvent) => void;
const eventListeners: EventListener[] = [];

// Default config ID
const DEFAULT_CONFIG_ID = "default";

// ============================================================================
// DEFAULT CONFIGURATION
// ============================================================================

function createDefaultConfig(): ChatbotConfig {
  const now = new Date();
  return {
    id: DEFAULT_CONFIG_ID,
    name: "Support Bot",
    description: "Automated support chatbot",
    status: "online",
    responseMode: "auto",
    welcomeMessage:
      "Hello! I'm here to help. What can I assist you with today?",
    fallbackMessage:
      "I'm not quite sure I understand. Could you rephrase that, or would you like to speak with a human agent?",
    handoffMessage:
      "I'll connect you with a human agent who can better assist you. Please hold on a moment.",
    noAgentsMessage:
      "All our agents are currently busy. Your message has been recorded and someone will get back to you soon.",
    confidenceThreshold: 0.5,
    maxBotTurns: 5,
    handoffKeywords: [
      "human",
      "agent",
      "person",
      "representative",
      "operator",
      "transfer",
    ],
    features: {
      autoGreet: true,
      suggestArticles: true,
      collectFeedback: true,
      detectSentiment: true,
      escalateNegative: true,
    },
    languages: ["en"],
    createdAt: now,
    updatedAt: now,
  };
}

// Initialize default config
configs.set(DEFAULT_CONFIG_ID, createDefaultConfig());

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Emit a chatbot event
 */
function emitEvent<T>(
  type: ChatbotEventType,
  conversationId: string,
  visitorId: string,
  data: T,
): void {
  const event: ChatbotEvent<T> = {
    type,
    conversationId,
    visitorId,
    data,
    timestamp: new Date(),
  };

  log.debug("Emitting chatbot event", { type, conversationId });

  for (const listener of eventListeners) {
    try {
      listener(event);
    } catch (error) {
      log.error("Error in chatbot event listener", error);
    }
  }
}

/**
 * Create initial conversation context
 */
function createContext(
  conversationId: string,
  visitor: Visitor,
): BotConversationContext {
  const now = new Date();
  return {
    conversationId,
    visitor,
    state: "greeting",
    botTurns: 0,
    unknownCount: 0,
    collectedData: {},
    messageHistory: [],
    topics: [],
    sentimentHistory: [],
    suggestedFAQs: [],
    suggestedArticles: [],
    createdAt: now,
    lastActivityAt: now,
  };
}

/**
 * Create standard quick replies
 */
function createStandardQuickReplies(
  type: "help" | "end" | "handoff",
): QuickReply[] {
  switch (type) {
    case "help":
      return [
        {
          id: "help-faq",
          label: "Browse FAQs",
          value: "show faqs",
          action: "send",
        },
        {
          id: "help-human",
          label: "Talk to Agent",
          value: "talk to human",
          action: "handoff",
        },
      ];
    case "end":
      return [
        {
          id: "end-helpful",
          label: "Yes, thanks!",
          value: "yes helpful",
          action: "send",
        },
        {
          id: "end-more",
          label: "I have more questions",
          value: "more questions",
          action: "send",
        },
        {
          id: "end-human",
          label: "Talk to Agent",
          value: "talk to human",
          action: "handoff",
        },
      ];
    case "handoff":
      return [
        {
          id: "handoff-yes",
          label: "Yes, connect me",
          value: "yes connect",
          action: "handoff",
        },
        {
          id: "handoff-no",
          label: "No, continue with bot",
          value: "no continue",
          action: "send",
        },
      ];
    default:
      return [];
  }
}

// ============================================================================
// CHATBOT SERVICE CLASS
// ============================================================================

export class ChatbotService {
  private intentMatcher: IntentMatcher;
  private kbService = getKnowledgeBaseService();

  constructor() {
    this.intentMatcher = getIntentMatcher();
  }

  // ==========================================================================
  // CONFIGURATION OPERATIONS
  // ==========================================================================

  /**
   * Get the chatbot configuration
   */
  async getConfig(
    configId: string = DEFAULT_CONFIG_ID,
  ): Promise<APIResponse<ChatbotConfig | null>> {
    try {
      const config = configs.get(configId);
      return {
        success: true,
        data: config || null,
      };
    } catch (error) {
      log.error("Failed to get config", error);
      return {
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          status: 500,
          message: (error as Error).message,
        },
      };
    }
  }

  /**
   * Update the chatbot configuration
   */
  async updateConfig(
    input: UpdateChatbotConfigInput,
    configId: string = DEFAULT_CONFIG_ID,
  ): Promise<APIResponse<ChatbotConfig>> {
    try {
      let config = configs.get(configId);
      if (!config) {
        config = createDefaultConfig();
        config.id = configId;
      }

      const updated: ChatbotConfig = {
        ...config,
        name: input.name ?? config.name,
        description: input.description ?? config.description,
        avatarUrl: input.avatarUrl ?? config.avatarUrl,
        status: input.status ?? config.status,
        responseMode: input.responseMode ?? config.responseMode,
        welcomeMessage: input.welcomeMessage ?? config.welcomeMessage,
        fallbackMessage: input.fallbackMessage ?? config.fallbackMessage,
        handoffMessage: input.handoffMessage ?? config.handoffMessage,
        noAgentsMessage: input.noAgentsMessage ?? config.noAgentsMessage,
        confidenceThreshold:
          input.confidenceThreshold ?? config.confidenceThreshold,
        maxBotTurns: input.maxBotTurns ?? config.maxBotTurns,
        handoffKeywords: input.handoffKeywords ?? config.handoffKeywords,
        features: { ...config.features, ...input.features },
        departments: input.departments ?? config.departments,
        languages: input.languages ?? config.languages,
        updatedAt: new Date(),
      };

      configs.set(configId, updated);

      log.info("Chatbot config updated", { configId });

      return {
        success: true,
        data: updated,
      };
    } catch (error) {
      log.error("Failed to update config", error);
      return {
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          status: 500,
          message: (error as Error).message,
        },
      };
    }
  }

  /**
   * Set bot status
   */
  async setStatus(
    status: BotStatus,
    configId: string = DEFAULT_CONFIG_ID,
  ): Promise<APIResponse<ChatbotConfig>> {
    return this.updateConfig({ status }, configId);
  }

  // ==========================================================================
  // MESSAGE PROCESSING
  // ==========================================================================

  /**
   * Process an incoming visitor message
   */
  async processMessage(
    input: ProcessMessageInput,
  ): Promise<APIResponse<ProcessMessageResult>> {
    try {
      log.debug("Processing message", { conversationId: input.conversationId });

      const config = configs.get(DEFAULT_CONFIG_ID) || createDefaultConfig();

      // Get or create context
      let context = contexts.get(input.conversationId);
      if (!context) {
        // Create minimal visitor for context
        const visitor: Visitor = {
          id: input.visitorId,
          token: input.visitorId,
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
        context = createContext(input.conversationId, visitor);
        contexts.set(input.conversationId, context);

        emitEvent(
          "bot.session_started",
          input.conversationId,
          input.visitorId,
          { context },
        );
      }

      // Update context
      context.lastActivityAt = new Date();
      context.messageHistory.push({
        role: "user",
        content: input.message,
        timestamp: new Date(),
      });

      // Detect intent
      const detectedIntent = this.intentMatcher.detectIntent(input.message);
      context.lastIntent = detectedIntent;
      context.sentimentHistory.push(detectedIntent.sentiment || 0);

      emitEvent("bot.intent_detected", input.conversationId, input.visitorId, {
        intent: detectedIntent,
      });

      // Check for handoff triggers
      let shouldHandoff = false;
      let handoffReason: string | undefined;

      // 1. User explicitly requests human
      if (detectedIntent.requestsHuman) {
        shouldHandoff = true;
        handoffReason = "User requested human agent";
      }

      // 2. Keyword match
      if (
        !shouldHandoff &&
        config.handoffKeywords.some((kw) =>
          input.message.toLowerCase().includes(kw.toLowerCase()),
        )
      ) {
        shouldHandoff = true;
        handoffReason = "Handoff keyword detected";
      }

      // 3. Low confidence after multiple attempts
      if (
        !shouldHandoff &&
        detectedIntent.confidence < config.confidenceThreshold
      ) {
        context.unknownCount++;
        if (context.unknownCount >= 2) {
          shouldHandoff = true;
          handoffReason = "Multiple low confidence responses";
        }
      } else {
        context.unknownCount = 0;
      }

      // 4. Max bot turns reached
      context.botTurns++;
      if (!shouldHandoff && context.botTurns >= config.maxBotTurns) {
        shouldHandoff = true;
        handoffReason = "Maximum bot turns reached";
      }

      // 5. Negative sentiment escalation
      if (!shouldHandoff && config.features.escalateNegative) {
        const recentSentiment = context.sentimentHistory.slice(-3);
        const avgSentiment =
          recentSentiment.reduce((a, b) => a + b, 0) / recentSentiment.length;
        if (avgSentiment < -0.5) {
          shouldHandoff = true;
          handoffReason = "Negative sentiment detected";
        }
      }

      // Generate response
      const response = await this.generateResponse(
        input.message,
        detectedIntent,
        context,
        config,
        shouldHandoff,
      );

      // Add bot response to history
      context.messageHistory.push({
        role: "bot",
        content: response.content,
        timestamp: new Date(),
      });

      // Update state
      if (shouldHandoff) {
        context.state = "handoff_pending";
      } else if (detectedIntent.intent === "faq" && response.matchedFAQ) {
        context.state = "answering";
      } else if (
        detectedIntent.intent === "thanks" ||
        detectedIntent.intent === "farewell"
      ) {
        context.state = "ended";
      }

      // Save context
      contexts.set(input.conversationId, context);

      emitEvent("bot.response_sent", input.conversationId, input.visitorId, {
        response,
      });

      return {
        success: true,
        data: {
          response,
          context,
          shouldHandoff,
          handoffReason,
        },
      };
    } catch (error) {
      log.error("Failed to process message", error);
      return {
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          status: 500,
          message: (error as Error).message,
        },
      };
    }
  }

  /**
   * Generate a response for a message
   */
  private async generateResponse(
    message: string,
    intent: DetectedIntent,
    context: BotConversationContext,
    config: ChatbotConfig,
    triggerHandoff: boolean,
  ): Promise<BotResponse> {
    const now = new Date();

    // If handoff is triggered
    if (triggerHandoff) {
      return {
        id: uuidv4(),
        type: "handoff",
        content: config.handoffMessage,
        quickReplies: createStandardQuickReplies("handoff"),
        confidence: 1,
        intent: intent.intent,
        triggerHandoff: true,
        handoffReason: "User requested or system triggered handoff",
        createdAt: now,
      };
    }

    // Handle by intent
    switch (intent.intent) {
      case "greeting":
        return this.createGreetingResponse(context, config, now);

      case "farewell":
        return this.createFarewellResponse(context, config, now);

      case "thanks":
        return this.createThanksResponse(context, config, now);

      case "human":
        return {
          id: uuidv4(),
          type: "handoff",
          content: config.handoffMessage,
          quickReplies: createStandardQuickReplies("handoff"),
          confidence: 1,
          intent: "human",
          triggerHandoff: true,
          handoffReason: "User requested human agent",
          createdAt: now,
        };

      case "confirm":
        return this.createConfirmResponse(context, config, now);

      case "cancel":
        return this.createCancelResponse(context, config, now);

      case "complaint":
        return this.createComplaintResponse(context, config, now);

      case "feedback":
        return this.createFeedbackResponse(context, config, now);

      case "faq":
      case "help":
        return this.createFAQResponse(message, intent, context, config, now);

      default:
        return this.createFallbackResponse(intent, context, config, now);
    }
  }

  /**
   * Create greeting response
   */
  private createGreetingResponse(
    context: BotConversationContext,
    config: ChatbotConfig,
    now: Date,
  ): BotResponse {
    const isReturning = context.botTurns > 1;

    let content = isReturning
      ? "Welcome back! How can I help you?"
      : config.welcomeMessage;

    return {
      id: uuidv4(),
      type: "quick_replies",
      content,
      quickReplies: createStandardQuickReplies("help"),
      confidence: 1,
      intent: "greeting",
      triggerHandoff: false,
      createdAt: now,
    };
  }

  /**
   * Create farewell response
   */
  private createFarewellResponse(
    context: BotConversationContext,
    config: ChatbotConfig,
    now: Date,
  ): BotResponse {
    return {
      id: uuidv4(),
      type: "text",
      content: "Goodbye! Thank you for chatting with us. Have a great day!",
      confidence: 1,
      intent: "farewell",
      triggerHandoff: false,
      createdAt: now,
    };
  }

  /**
   * Create thanks response
   */
  private createThanksResponse(
    context: BotConversationContext,
    config: ChatbotConfig,
    now: Date,
  ): BotResponse {
    return {
      id: uuidv4(),
      type: "quick_replies",
      content: "You're welcome! Is there anything else I can help you with?",
      quickReplies: createStandardQuickReplies("end"),
      confidence: 1,
      intent: "thanks",
      triggerHandoff: false,
      createdAt: now,
    };
  }

  /**
   * Create confirm response
   */
  private createConfirmResponse(
    context: BotConversationContext,
    config: ChatbotConfig,
    now: Date,
  ): BotResponse {
    // Handle based on current state
    if (context.state === "handoff_pending") {
      return {
        id: uuidv4(),
        type: "handoff",
        content: "I'll connect you with an agent right away.",
        confidence: 1,
        intent: "confirm",
        triggerHandoff: true,
        handoffReason: "User confirmed handoff",
        createdAt: now,
      };
    }

    return {
      id: uuidv4(),
      type: "quick_replies",
      content: "Great! Is there anything else you need help with?",
      quickReplies: createStandardQuickReplies("end"),
      confidence: 1,
      intent: "confirm",
      triggerHandoff: false,
      createdAt: now,
    };
  }

  /**
   * Create cancel response
   */
  private createCancelResponse(
    context: BotConversationContext,
    config: ChatbotConfig,
    now: Date,
  ): BotResponse {
    // Reset state if pending handoff was cancelled
    if (context.state === "handoff_pending") {
      context.state = "answering";
    }

    return {
      id: uuidv4(),
      type: "quick_replies",
      content: "No problem. What else can I help you with?",
      quickReplies: createStandardQuickReplies("help"),
      confidence: 1,
      intent: "cancel",
      triggerHandoff: false,
      createdAt: now,
    };
  }

  /**
   * Create complaint response
   */
  private createComplaintResponse(
    context: BotConversationContext,
    config: ChatbotConfig,
    now: Date,
  ): BotResponse {
    // Complaints should be escalated
    return {
      id: uuidv4(),
      type: "handoff",
      content:
        "I'm sorry to hear you're having a frustrating experience. Let me connect you with a team member who can help resolve this for you.",
      quickReplies: [
        {
          id: "complaint-connect",
          label: "Connect me now",
          value: "connect",
          action: "handoff",
        },
        {
          id: "complaint-details",
          label: "Let me explain more",
          value: "explain more",
          action: "send",
        },
      ],
      confidence: 1,
      intent: "complaint",
      triggerHandoff: true,
      handoffReason: "Complaint detected - escalating to human",
      createdAt: now,
    };
  }

  /**
   * Create feedback response
   */
  private createFeedbackResponse(
    context: BotConversationContext,
    config: ChatbotConfig,
    now: Date,
  ): BotResponse {
    return {
      id: uuidv4(),
      type: "text",
      content:
        "Thank you for your feedback! We really appreciate you taking the time to share your thoughts. Is there anything else I can help you with?",
      quickReplies: createStandardQuickReplies("end"),
      confidence: 1,
      intent: "feedback",
      triggerHandoff: false,
      createdAt: now,
    };
  }

  /**
   * Create FAQ/help response by searching knowledge base
   */
  private async createFAQResponse(
    message: string,
    intent: DetectedIntent,
    context: BotConversationContext,
    config: ChatbotConfig,
    now: Date,
  ): Promise<BotResponse> {
    // Search FAQs
    const faqResult = await this.kbService.searchFAQs(message, { limit: 3 });

    if (faqResult.success && faqResult.data && faqResult.data.length > 0) {
      const topFaq = faqResult.data[0];

      // Check if we've already suggested this
      if (context.suggestedFAQs.includes(topFaq.id)) {
        // Try second result
        const secondFaq = faqResult.data[1];
        if (secondFaq && !context.suggestedFAQs.includes(secondFaq.id)) {
          context.suggestedFAQs.push(secondFaq.id);

          emitEvent(
            "bot.faq_matched",
            context.conversationId,
            context.visitor.id,
            { faq: secondFaq },
          );

          return {
            id: uuidv4(),
            type: "article",
            content: secondFaq.answer,
            matchedFAQ: secondFaq,
            quickReplies: createStandardQuickReplies("end"),
            confidence: 0.8,
            intent: "faq",
            triggerHandoff: false,
            createdAt: now,
          };
        }
      } else {
        context.suggestedFAQs.push(topFaq.id);

        emitEvent(
          "bot.faq_matched",
          context.conversationId,
          context.visitor.id,
          { faq: topFaq },
        );

        return {
          id: uuidv4(),
          type: "article",
          content: topFaq.answer,
          matchedFAQ: topFaq,
          quickReplies: createStandardQuickReplies("end"),
          confidence: 0.9,
          intent: "faq",
          triggerHandoff: false,
          createdAt: now,
        };
      }
    }

    // Search articles if no FAQ match
    if (config.features.suggestArticles) {
      const articleResult = await this.kbService.searchArticles(message, {
        limit: 3,
        status: "published",
        visibility: "public",
      });

      if (
        articleResult.success &&
        articleResult.data &&
        articleResult.data.length > 0
      ) {
        const articles = articleResult.data
          .filter((r) => !context.suggestedArticles.includes(r.article.id))
          .slice(0, 3)
          .map((r) => ({
            id: r.article.id,
            title: r.article.title,
            excerpt: r.article.excerpt,
            url: `/help/${r.article.slug}`,
          }));

        if (articles.length > 0) {
          articles.forEach((a) => context.suggestedArticles.push(a.id));

          return {
            id: uuidv4(),
            type: "articles",
            content: "I found some articles that might help:",
            articles,
            quickReplies: createStandardQuickReplies("end"),
            confidence: 0.7,
            intent: "faq",
            triggerHandoff: false,
            createdAt: now,
          };
        }
      }
    }

    // No matches - fallback
    return this.createFallbackResponse(intent, context, config, now);
  }

  /**
   * Create fallback response
   */
  private createFallbackResponse(
    intent: DetectedIntent,
    context: BotConversationContext,
    config: ChatbotConfig,
    now: Date,
  ): BotResponse {
    emitEvent(
      "bot.fallback_triggered",
      context.conversationId,
      context.visitor.id,
      { intent },
    );

    const shouldOfferHandoff =
      context.unknownCount >= 1 || intent.confidence < 0.3;

    return {
      id: uuidv4(),
      type: "quick_replies",
      content: config.fallbackMessage,
      quickReplies: shouldOfferHandoff
        ? createStandardQuickReplies("handoff")
        : createStandardQuickReplies("help"),
      confidence: intent.confidence,
      intent: "unknown",
      triggerHandoff: false,
      createdAt: now,
    };
  }

  /**
   * Generate welcome message for new conversation
   */
  async generateWelcome(
    conversationId: string,
    visitor: Visitor,
  ): Promise<APIResponse<BotResponse>> {
    try {
      const config = configs.get(DEFAULT_CONFIG_ID) || createDefaultConfig();
      const now = new Date();

      // Create context
      const context = createContext(conversationId, visitor);
      contexts.set(conversationId, context);

      emitEvent("bot.session_started", conversationId, visitor.id, { context });

      const response: BotResponse = {
        id: uuidv4(),
        type: "quick_replies",
        content: config.welcomeMessage,
        quickReplies: createStandardQuickReplies("help"),
        confidence: 1,
        triggerHandoff: false,
        createdAt: now,
      };

      context.messageHistory.push({
        role: "bot",
        content: response.content,
        timestamp: now,
      });

      return {
        success: true,
        data: response,
      };
    } catch (error) {
      log.error("Failed to generate welcome", error);
      return {
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          status: 500,
          message: (error as Error).message,
        },
      };
    }
  }

  // ==========================================================================
  // CONTEXT OPERATIONS
  // ==========================================================================

  /**
   * Get conversation context
   */
  async getContext(
    conversationId: string,
  ): Promise<APIResponse<BotConversationContext | null>> {
    try {
      const context = contexts.get(conversationId);
      return {
        success: true,
        data: context || null,
      };
    } catch (error) {
      log.error("Failed to get context", error);
      return {
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          status: 500,
          message: (error as Error).message,
        },
      };
    }
  }

  /**
   * Update conversation context
   */
  async updateContext(
    conversationId: string,
    updates: Partial<BotConversationContext>,
  ): Promise<APIResponse<BotConversationContext>> {
    try {
      const context = contexts.get(conversationId);
      if (!context) {
        return {
          success: false,
          error: {
            code: "NOT_FOUND",
            status: 404,
            message: "Context not found",
          },
        };
      }

      const updated: BotConversationContext = {
        ...context,
        ...updates,
        lastActivityAt: new Date(),
      };

      contexts.set(conversationId, updated);

      return {
        success: true,
        data: updated,
      };
    } catch (error) {
      log.error("Failed to update context", error);
      return {
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          status: 500,
          message: (error as Error).message,
        },
      };
    }
  }

  /**
   * End bot session
   */
  async endSession(conversationId: string): Promise<APIResponse<void>> {
    try {
      const context = contexts.get(conversationId);
      if (context) {
        context.state = "ended";
        emitEvent("bot.session_ended", conversationId, context.visitor.id, {
          context,
        });
        contexts.delete(conversationId);
      }

      return { success: true, data: undefined };
    } catch (error) {
      log.error("Failed to end session", error);
      return {
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          status: 500,
          message: (error as Error).message,
        },
      };
    }
  }

  // ==========================================================================
  // TEMPLATE OPERATIONS
  // ==========================================================================

  /**
   * Create a response template
   */
  async createTemplate(
    input: CreateResponseTemplateInput,
    createdBy: string,
  ): Promise<APIResponse<BotResponseTemplate>> {
    try {
      const id = uuidv4();
      const now = new Date();

      const template: BotResponseTemplate = {
        id,
        name: input.name,
        description: input.description,
        intent: input.intent,
        responses: input.responses.map((r) => ({
          ...r,
          weight: r.weight ?? 1,
        })),
        conditions: input.conditions,
        isActive: true,
        createdAt: now,
        updatedAt: now,
      };

      templates.set(id, template);

      log.info("Template created", { id, name: input.name });

      return {
        success: true,
        data: template,
      };
    } catch (error) {
      log.error("Failed to create template", error);
      return {
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          status: 500,
          message: (error as Error).message,
        },
      };
    }
  }

  /**
   * Get a template by ID
   */
  async getTemplate(
    id: string,
  ): Promise<APIResponse<BotResponseTemplate | null>> {
    try {
      const template = templates.get(id);
      return {
        success: true,
        data: template || null,
      };
    } catch (error) {
      log.error("Failed to get template", error);
      return {
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          status: 500,
          message: (error as Error).message,
        },
      };
    }
  }

  /**
   * List templates
   */
  async listTemplates(options?: {
    intent?: IntentCategory;
    isActive?: boolean;
  }): Promise<APIResponse<BotResponseTemplate[]>> {
    try {
      let results = Array.from(templates.values());

      if (options?.intent) {
        results = results.filter((t) => t.intent === options.intent);
      }

      if (options?.isActive !== undefined) {
        results = results.filter((t) => t.isActive === options.isActive);
      }

      return {
        success: true,
        data: results,
      };
    } catch (error) {
      log.error("Failed to list templates", error);
      return {
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          status: 500,
          message: (error as Error).message,
        },
      };
    }
  }

  /**
   * Delete a template
   */
  async deleteTemplate(id: string): Promise<APIResponse<{ deleted: boolean }>> {
    try {
      if (!templates.has(id)) {
        return {
          success: false,
          error: {
            code: "NOT_FOUND",
            status: 404,
            message: "Template not found",
          },
        };
      }

      templates.delete(id);

      log.info("Template deleted", { id });

      return {
        success: true,
        data: { deleted: true },
      };
    } catch (error) {
      log.error("Failed to delete template", error);
      return {
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          status: 500,
          message: (error as Error).message,
        },
      };
    }
  }

  // ==========================================================================
  // EVENT SUBSCRIPTION
  // ==========================================================================

  /**
   * Subscribe to chatbot events
   */
  subscribe(listener: EventListener): () => void {
    eventListeners.push(listener);
    return () => {
      const index = eventListeners.indexOf(listener);
      if (index >= 0) {
        eventListeners.splice(index, 1);
      }
    };
  }

  // ==========================================================================
  // STORE MANAGEMENT
  // ==========================================================================

  /**
   * Clear all data (for testing)
   */
  clearAll(): void {
    contexts.clear();
    templates.clear();
    // Reset to default config
    configs.clear();
    configs.set(DEFAULT_CONFIG_ID, createDefaultConfig());
    log.debug("All chatbot data cleared");
  }

  /**
   * Get store sizes (for debugging)
   */
  getStoreSizes(): Record<string, number> {
    return {
      configs: configs.size,
      contexts: contexts.size,
      templates: templates.size,
    };
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

let chatbotServiceInstance: ChatbotService | null = null;

/**
 * Get or create the chatbot service singleton
 */
export function getChatbotService(): ChatbotService {
  if (!chatbotServiceInstance) {
    chatbotServiceInstance = new ChatbotService();
  }
  return chatbotServiceInstance;
}

/**
 * Create a new chatbot service instance (for testing)
 */
export function createChatbotService(): ChatbotService {
  return new ChatbotService();
}

/**
 * Reset the singleton instance (for testing)
 */
export function resetChatbotService(): void {
  if (chatbotServiceInstance) {
    chatbotServiceInstance.clearAll();
  }
  chatbotServiceInstance = null;
}

export default ChatbotService;
