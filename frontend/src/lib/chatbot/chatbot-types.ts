/**
 * Chatbot Types and Interfaces
 *
 * Type definitions for the chatbot integration and handoff system.
 * Supports automated responses, intent detection, and bot-to-human handoff.
 *
 * @module lib/chatbot/chatbot-types
 * @version 1.0.0
 */

import type { FAQEntry } from "@/lib/knowledge/knowledge-types";
import type {
  Conversation,
  LivechatMessage,
  Visitor,
  Agent,
} from "@/services/livechat/types";

// ============================================================================
// BOT CONFIGURATION TYPES
// ============================================================================

/**
 * Chatbot status
 */
export type BotStatus = "online" | "offline" | "maintenance";

/**
 * Bot response mode
 */
export type BotResponseMode = "auto" | "suggest" | "disabled";

/**
 * Chatbot configuration
 */
export interface ChatbotConfig {
  id: string;
  name: string;
  description?: string;
  avatarUrl?: string;
  status: BotStatus;
  responseMode: BotResponseMode;
  /** Welcome message for new conversations */
  welcomeMessage: string;
  /** Fallback message when bot cannot help */
  fallbackMessage: string;
  /** Message before handoff to human */
  handoffMessage: string;
  /** Message when no agents available */
  noAgentsMessage: string;
  /** Confidence threshold for automatic responses (0-1) */
  confidenceThreshold: number;
  /** Maximum bot turns before suggesting handoff */
  maxBotTurns: number;
  /** Keywords that trigger immediate handoff */
  handoffKeywords: string[];
  /** Business hours for bot operation */
  businessHours?: {
    enabled: boolean;
    timezone: string;
    schedule: Array<{
      day: string;
      start: string;
      end: string;
    }>;
  };
  /** Enabled features */
  features: {
    autoGreet: boolean;
    suggestArticles: boolean;
    collectFeedback: boolean;
    detectSentiment: boolean;
    escalateNegative: boolean;
  };
  /** Custom fields collected from visitor */
  collectFields?: Array<{
    name: string;
    label: string;
    type: "text" | "email" | "phone" | "select";
    required: boolean;
    options?: string[];
  }>;
  /** Departments the bot handles */
  departments?: string[];
  /** Languages supported */
  languages: string[];
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================================
// INTENT TYPES
// ============================================================================

/**
 * Intent categories
 */
export type IntentCategory =
  | "greeting"
  | "farewell"
  | "thanks"
  | "help"
  | "faq"
  | "complaint"
  | "feedback"
  | "human"
  | "cancel"
  | "confirm"
  | "unknown";

/**
 * Detected intent
 */
export interface DetectedIntent {
  /** Primary intent */
  intent: IntentCategory;
  /** Confidence score (0-1) */
  confidence: number;
  /** Alternative intents */
  alternatives?: Array<{
    intent: IntentCategory;
    confidence: number;
  }>;
  /** Extracted entities */
  entities?: Record<string, string | string[]>;
  /** Matched keywords */
  matchedKeywords?: string[];
  /** Is this a request for human agent */
  requestsHuman: boolean;
  /** Sentiment score (-1 to 1, negative to positive) */
  sentiment?: number;
}

/**
 * Intent pattern for matching
 */
export interface IntentPattern {
  id: string;
  intent: IntentCategory;
  patterns: string[];
  keywords: string[];
  examples: string[];
  priority: number;
  isActive: boolean;
}

// ============================================================================
// RESPONSE TYPES
// ============================================================================

/**
 * Bot response type
 */
export type BotResponseType =
  | "text"
  | "quick_replies"
  | "article"
  | "articles"
  | "form"
  | "handoff"
  | "typing"
  | "custom";

/**
 * Quick reply button
 */
export interface QuickReply {
  id: string;
  label: string;
  value: string;
  action?: "send" | "handoff" | "article" | "url";
  url?: string;
  articleId?: string;
}

/**
 * Bot response
 */
export interface BotResponse {
  id: string;
  type: BotResponseType;
  content: string;
  /** Rich content (HTML) */
  contentHtml?: string;
  /** Quick reply buttons */
  quickReplies?: QuickReply[];
  /** Article suggestions */
  articles?: Array<{
    id: string;
    title: string;
    excerpt: string;
    url: string;
  }>;
  /** Form to collect data */
  form?: {
    fields: Array<{
      name: string;
      label: string;
      type: "text" | "email" | "phone" | "select" | "textarea";
      required: boolean;
      options?: string[];
      placeholder?: string;
    }>;
    submitLabel: string;
  };
  /** Matched FAQ */
  matchedFAQ?: FAQEntry;
  /** Confidence score */
  confidence: number;
  /** Intent that triggered this response */
  intent?: IntentCategory;
  /** Should trigger handoff */
  triggerHandoff: boolean;
  /** Reason for handoff */
  handoffReason?: string;
  /** Metadata */
  metadata?: Record<string, unknown>;
  /** Created timestamp */
  createdAt: Date;
}

/**
 * Bot response template
 */
export interface BotResponseTemplate {
  id: string;
  name: string;
  description?: string;
  intent: IntentCategory;
  responses: Array<{
    content: string;
    contentHtml?: string;
    quickReplies?: QuickReply[];
    weight: number;
  }>;
  conditions?: Array<{
    field: string;
    operator: "equals" | "contains" | "exists";
    value: string;
  }>;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================================
// CONVERSATION CONTEXT TYPES
// ============================================================================

/**
 * Bot conversation context
 */
export interface BotConversationContext {
  /** Conversation ID */
  conversationId: string;
  /** Visitor info */
  visitor: Visitor;
  /** Current session state */
  state: BotSessionState;
  /** Number of bot turns */
  botTurns: number;
  /** Number of consecutive unknown intents */
  unknownCount: number;
  /** Collected form data */
  collectedData: Record<string, string>;
  /** Last detected intent */
  lastIntent?: DetectedIntent;
  /** Message history for context */
  messageHistory: Array<{
    role: "user" | "bot";
    content: string;
    timestamp: Date;
  }>;
  /** Topics discussed */
  topics: string[];
  /** Sentiment trend */
  sentimentHistory: number[];
  /** FAQ IDs already suggested */
  suggestedFAQs: string[];
  /** Articles already suggested */
  suggestedArticles: string[];
  /** Created timestamp */
  createdAt: Date;
  /** Last activity timestamp */
  lastActivityAt: Date;
}

/**
 * Bot session state
 */
export type BotSessionState =
  | "greeting"
  | "collecting_info"
  | "answering"
  | "suggesting"
  | "confirming"
  | "handoff_pending"
  | "handed_off"
  | "ended";

// ============================================================================
// HANDOFF TYPES
// ============================================================================

/**
 * Handoff status
 */
export type HandoffStatus =
  | "pending"
  | "waiting_for_agent"
  | "agent_assigned"
  | "in_progress"
  | "completed"
  | "cancelled"
  | "failed";

/**
 * Handoff trigger reason
 */
export type HandoffTrigger =
  | "user_request"
  | "low_confidence"
  | "max_turns_reached"
  | "negative_sentiment"
  | "keyword_match"
  | "bot_failure"
  | "escalation"
  | "after_hours"
  | "manual";

/**
 * Handoff request
 */
export interface HandoffRequest {
  id: string;
  conversationId: string;
  visitor: Visitor;
  trigger: HandoffTrigger;
  reason?: string;
  status: HandoffStatus;
  priority: "low" | "medium" | "high" | "urgent";
  /** Department to route to */
  department?: string;
  /** Preferred agent if any */
  preferredAgentId?: string;
  /** Assigned agent */
  assignedAgent?: Agent;
  /** Bot conversation summary */
  summary: HandoffSummary;
  /** Position in queue */
  queuePosition?: number;
  /** Estimated wait time (seconds) */
  estimatedWait?: number;
  /** Created timestamp */
  createdAt: Date;
  /** Agent accepted timestamp */
  acceptedAt?: Date;
  /** Completed timestamp */
  completedAt?: Date;
  /** Updated timestamp */
  updatedAt: Date;
}

/**
 * Handoff summary (context for agent)
 */
export interface HandoffSummary {
  /** Conversation duration with bot */
  botDuration: number;
  /** Number of messages exchanged */
  messageCount: number;
  /** Topics/intents detected */
  topics: string[];
  /** Main issue/question */
  mainIssue?: string;
  /** Collected visitor data */
  visitorData: Record<string, string>;
  /** Key messages from conversation */
  keyMessages: Array<{
    role: "user" | "bot";
    content: string;
    timestamp: Date;
  }>;
  /** Suggested articles that didn't help */
  failedSuggestions: string[];
  /** Sentiment score */
  sentiment: number;
  /** Special notes for agent */
  notes?: string;
}

/**
 * Handoff configuration
 */
export interface HandoffConfig {
  /** Enable automatic handoff */
  autoHandoff: boolean;
  /** Confidence threshold below which to handoff */
  confidenceThreshold: number;
  /** Max bot turns before offering handoff */
  maxBotTurns: number;
  /** Max unknown intents before handoff */
  maxUnknownIntents: number;
  /** Sentiment threshold for escalation (-1 to 1) */
  sentimentThreshold: number;
  /** Keywords that trigger immediate handoff */
  handoffKeywords: string[];
  /** Message to send when handoff starts */
  handoffMessage: string;
  /** Message when agent accepts */
  agentJoinedMessage: string;
  /** Message when no agents available */
  noAgentsMessage: string;
  /** Whether to show queue position */
  showQueuePosition: boolean;
  /** Whether to allow cancellation */
  allowCancel: boolean;
  /** Offline behavior: 'ticket' | 'email' | 'message' */
  offlineBehavior: "ticket" | "email" | "message";
  /** Offline message */
  offlineMessage: string;
}

// ============================================================================
// EVENT TYPES
// ============================================================================

/**
 * Chatbot event types
 */
export type ChatbotEventType =
  | "bot.message_received"
  | "bot.response_sent"
  | "bot.intent_detected"
  | "bot.faq_matched"
  | "bot.handoff_requested"
  | "bot.handoff_accepted"
  | "bot.handoff_completed"
  | "bot.handoff_cancelled"
  | "bot.session_started"
  | "bot.session_ended"
  | "bot.fallback_triggered";

/**
 * Chatbot event
 */
export interface ChatbotEvent<T = unknown> {
  type: ChatbotEventType;
  conversationId: string;
  visitorId: string;
  data: T;
  timestamp: Date;
}

// ============================================================================
// ANALYTICS TYPES
// ============================================================================

/**
 * Chatbot analytics
 */
export interface ChatbotAnalytics {
  period: {
    start: Date;
    end: Date;
  };
  conversations: {
    total: number;
    resolved: number;
    handedOff: number;
    abandoned: number;
    averageDuration: number;
    averageMessages: number;
  };
  intents: {
    total: number;
    byCategory: Record<IntentCategory, number>;
    averageConfidence: number;
    lowConfidenceRate: number;
  };
  handoffs: {
    total: number;
    byTrigger: Record<HandoffTrigger, number>;
    averageWaitTime: number;
    acceptanceRate: number;
  };
  faqs: {
    totalMatches: number;
    topFAQs: Array<{
      faqId: string;
      question: string;
      matchCount: number;
      helpfulRate: number;
    }>;
    unmatchedQueries: Array<{
      query: string;
      count: number;
    }>;
  };
  sentiment: {
    average: number;
    positive: number;
    neutral: number;
    negative: number;
  };
  responseTime: {
    average: number;
    p50: number;
    p90: number;
    p95: number;
  };
}

// ============================================================================
// INPUT TYPES
// ============================================================================

/**
 * Input for creating a handoff request
 */
export interface CreateHandoffInput {
  conversationId: string;
  trigger: HandoffTrigger;
  reason?: string;
  priority?: "low" | "medium" | "high" | "urgent";
  department?: string;
  preferredAgentId?: string;
  notes?: string;
}

/**
 * Input for updating chatbot config
 */
export interface UpdateChatbotConfigInput {
  name?: string;
  description?: string;
  avatarUrl?: string;
  status?: BotStatus;
  responseMode?: BotResponseMode;
  welcomeMessage?: string;
  fallbackMessage?: string;
  handoffMessage?: string;
  noAgentsMessage?: string;
  confidenceThreshold?: number;
  maxBotTurns?: number;
  handoffKeywords?: string[];
  features?: Partial<ChatbotConfig["features"]>;
  departments?: string[];
  languages?: string[];
}

/**
 * Input for creating a response template
 */
export interface CreateResponseTemplateInput {
  name: string;
  description?: string;
  intent: IntentCategory;
  responses: Array<{
    content: string;
    contentHtml?: string;
    quickReplies?: QuickReply[];
    weight?: number;
  }>;
  conditions?: Array<{
    field: string;
    operator: "equals" | "contains" | "exists";
    value: string;
  }>;
}

/**
 * Input for processing a visitor message
 */
export interface ProcessMessageInput {
  conversationId: string;
  visitorId: string;
  message: string;
  metadata?: Record<string, unknown>;
}

/**
 * Result of processing a message
 */
export interface ProcessMessageResult {
  response: BotResponse;
  context: BotConversationContext;
  shouldHandoff: boolean;
  handoffReason?: string;
}
