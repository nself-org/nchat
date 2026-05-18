/**
 * Chatbot Services Index
 *
 * Central export for chatbot and handoff management.
 *
 * @module services/chatbot
 * @version 1.0.0
 */

// Chatbot Service
export {
  ChatbotService,
  getChatbotService,
  createChatbotService,
  resetChatbotService,
} from "./chatbot.service";

// Handoff Service
export {
  HandoffService,
  getHandoffService,
  createHandoffService,
  resetHandoffService,
} from "./handoff.service";

// Re-export types from lib
export type {
  // Bot types
  BotStatus,
  BotResponseMode,
  ChatbotConfig,
  BotResponse,
  BotResponseType,
  BotResponseTemplate,
  BotConversationContext,
  BotSessionState,
  QuickReply,
  // Intent types
  IntentCategory,
  DetectedIntent,
  IntentPattern,
  // Handoff types
  HandoffStatus,
  HandoffTrigger,
  HandoffRequest,
  HandoffSummary,
  HandoffConfig,
  // Input types
  ProcessMessageInput,
  ProcessMessageResult,
  CreateHandoffInput,
  UpdateChatbotConfigInput,
  CreateResponseTemplateInput,
  // Event types
  ChatbotEventType,
  ChatbotEvent,
  // Analytics types
  ChatbotAnalytics,
} from "@/lib/chatbot/chatbot-types";

// Re-export intent matcher
export {
  IntentMatcher,
  getIntentMatcher,
  createIntentMatcher,
  resetIntentMatcher,
  DEFAULT_INTENT_PATTERNS,
} from "@/lib/chatbot/intent-matcher";
