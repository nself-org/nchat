/**
 * Livechat Types and Interfaces
 *
 * Type definitions for the omnichannel live support system.
 * Provides Rocket.Chat-style live help functionality.
 *
 * @module services/livechat/types
 * @version 1.0.0
 */

// ============================================================================
// CHANNEL TYPES
// ============================================================================

/**
 * Supported communication channels for omnichannel support
 */
export type LivechatChannel =
  | "web_widget"
  | "email"
  | "facebook"
  | "twitter"
  | "whatsapp"
  | "telegram"
  | "sms"
  | "api";

/**
 * Channel-specific configuration
 */
export interface ChannelConfig {
  channel: LivechatChannel;
  enabled: boolean;
  apiKey?: string;
  webhookUrl?: string;
  settings: Record<string, unknown>;
}

// ============================================================================
// VISITOR TYPES
// ============================================================================

/**
 * Visitor status in the live chat system
 */
export type VisitorStatus =
  | "online"
  | "offline"
  | "away"
  | "waiting"
  | "chatting";

/**
 * Visitor information
 */
export interface Visitor {
  id: string;
  token: string;
  name?: string;
  email?: string;
  phone?: string;
  username?: string;
  department?: string;
  channel: LivechatChannel;
  status: VisitorStatus;
  ip?: string;
  userAgent?: string;
  country?: string;
  city?: string;
  timezone?: string;
  language?: string;
  customFields: Record<string, unknown>;
  tags: string[];
  metadata: Record<string, unknown>;
  lastMessageAt?: Date;
  lastSeenAt?: Date;
  visitsCount: number;
  totalChats: number;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Input for creating a new visitor
 */
export interface CreateVisitorInput {
  token?: string;
  name?: string;
  email?: string;
  phone?: string;
  department?: string;
  channel: LivechatChannel;
  customFields?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

/**
 * Input for updating a visitor
 */
export interface UpdateVisitorInput {
  name?: string;
  email?: string;
  phone?: string;
  department?: string;
  customFields?: Record<string, unknown>;
  tags?: string[];
  metadata?: Record<string, unknown>;
}

// ============================================================================
// AGENT TYPES
// ============================================================================

/**
 * Agent status in the live chat system
 */
export type AgentStatus = "available" | "busy" | "away" | "offline";

/**
 * Agent information
 */
export interface Agent {
  id: string;
  userId: string;
  username: string;
  displayName: string;
  email: string;
  avatarUrl?: string;
  departments: string[];
  status: AgentStatus;
  statusMessage?: string;
  maxConcurrentChats: number;
  activeChats: number;
  totalChatsHandled: number;
  averageResponseTime: number;
  averageResolutionTime: number;
  rating: number;
  ratingCount: number;
  skills: string[];
  languages: string[];
  priority: number;
  lastRoutedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Input for creating an agent
 */
export interface CreateAgentInput {
  userId: string;
  departments?: string[];
  maxConcurrentChats?: number;
  skills?: string[];
  languages?: string[];
  priority?: number;
}

/**
 * Input for updating an agent
 */
export interface UpdateAgentInput {
  departments?: string[];
  status?: AgentStatus;
  statusMessage?: string;
  maxConcurrentChats?: number;
  skills?: string[];
  languages?: string[];
  priority?: number;
}

// ============================================================================
// CONVERSATION/ROOM TYPES
// ============================================================================

/**
 * Conversation status
 */
export type ConversationStatus =
  | "queued" // Waiting for agent assignment
  | "open" // Active conversation with agent
  | "on_hold" // Temporarily on hold
  | "waiting" // Waiting for visitor response
  | "resolved" // Resolved by agent
  | "closed"; // Closed (archived)

/**
 * Conversation priority levels
 */
export type ConversationPriority = "low" | "medium" | "high" | "urgent";

/**
 * Conversation/Room information
 */
export interface Conversation {
  id: string;
  token: string;
  visitor: Visitor;
  agent?: Agent;
  department?: string;
  channel: LivechatChannel;
  status: ConversationStatus;
  priority: ConversationPriority;
  source: {
    type: "widget" | "email" | "api" | "social";
    page?: string;
    referrer?: string;
  };
  tags: string[];
  customFields: Record<string, unknown>;
  sla?: {
    policyId: string;
    policyName: string;
    firstResponseDue?: Date;
    nextResponseDue?: Date;
    resolutionDue?: Date;
    firstResponseMet?: boolean;
    resolutionMet?: boolean;
  };
  metrics: {
    firstResponseTime?: number; // seconds
    responseTime?: number; // average seconds
    waitingTime?: number; // seconds in queue
    chatDuration?: number; // seconds
    messagesCount: number;
    agentMessages: number;
    visitorMessages: number;
  };
  transferHistory: TransferRecord[];
  queuedAt?: Date;
  assignedAt?: Date;
  firstResponseAt?: Date;
  lastMessageAt?: Date;
  resolvedAt?: Date;
  closedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Transfer record for conversation handoffs
 */
export interface TransferRecord {
  id: string;
  fromAgentId?: string;
  toAgentId?: string;
  fromDepartment?: string;
  toDepartment?: string;
  reason?: string;
  comment?: string;
  transferredAt: Date;
  transferredBy: string;
}

/**
 * Input for creating a conversation
 */
export interface CreateConversationInput {
  visitorId: string;
  department?: string;
  channel: LivechatChannel;
  priority?: ConversationPriority;
  customFields?: Record<string, unknown>;
  source?: {
    type: "widget" | "email" | "api" | "social";
    page?: string;
    referrer?: string;
  };
  message?: string;
}

/**
 * Input for updating a conversation
 */
export interface UpdateConversationInput {
  status?: ConversationStatus;
  priority?: ConversationPriority;
  department?: string;
  tags?: string[];
  customFields?: Record<string, unknown>;
}

// ============================================================================
// MESSAGE TYPES
// ============================================================================

/**
 * Livechat message types
 */
export type LivechatMessageType =
  | "text"
  | "file"
  | "image"
  | "audio"
  | "video"
  | "location"
  | "system"
  | "bot"
  | "canned_response";

/**
 * Livechat message
 */
export interface LivechatMessage {
  id: string;
  conversationId: string;
  senderId: string;
  senderType: "visitor" | "agent" | "bot" | "system";
  type: LivechatMessageType;
  content: string;
  contentHtml?: string;
  attachments?: LivechatAttachment[];
  metadata?: Record<string, unknown>;
  isInternal: boolean; // Agent internal notes
  readAt?: Date;
  deliveredAt?: Date;
  createdAt: Date;
  updatedAt?: Date;
}

/**
 * Livechat message attachment
 */
export interface LivechatAttachment {
  id: string;
  type: "file" | "image" | "audio" | "video";
  name: string;
  url: string;
  size: number;
  mimeType: string;
  thumbnailUrl?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Input for sending a message
 */
export interface SendMessageInput {
  conversationId: string;
  senderId: string;
  senderType: "visitor" | "agent" | "bot";
  content: string;
  type?: LivechatMessageType;
  attachments?: Omit<LivechatAttachment, "id">[];
  isInternal?: boolean;
  metadata?: Record<string, unknown>;
}

// ============================================================================
// DEPARTMENT TYPES
// ============================================================================

/**
 * Department information
 */
export interface Department {
  id: string;
  name: string;
  description?: string;
  email?: string;
  enabled: boolean;
  showOnRegistration: boolean;
  showOnOfflineForm: boolean;
  requestTagBeforeClosingChat: boolean;
  offlineMessageChannelName?: string;
  abandonedRoomsCloseCustomMessage?: string;
  waitingQueueMessage?: string;
  departmentUnit?: string;
  numAgents: number;
  maxNumberSimultaneousChats?: number;
  businessHours?: BusinessHours;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Business hours configuration
 */
export interface BusinessHours {
  enabled: boolean;
  timezone: string;
  schedule: BusinessHoursSchedule[];
  holidays: BusinessHoliday[];
}

/**
 * Business hours schedule for a day
 */
export interface BusinessHoursSchedule {
  day:
    | "monday"
    | "tuesday"
    | "wednesday"
    | "thursday"
    | "friday"
    | "saturday"
    | "sunday";
  enabled: boolean;
  openTime?: string; // HH:MM format
  closeTime?: string; // HH:MM format
}

/**
 * Business holiday definition
 */
export interface BusinessHoliday {
  name: string;
  date: string; // YYYY-MM-DD format
  recurring: boolean;
}

// ============================================================================
// QUEUE TYPES
// ============================================================================

/**
 * Queue entry for waiting conversations
 */
export interface QueueEntry {
  id: string;
  conversationId: string;
  visitor: Visitor;
  department?: string;
  priority: ConversationPriority;
  position: number;
  estimatedWaitTime: number; // seconds
  queuedAt: Date;
}

/**
 * Queue statistics
 */
export interface QueueStats {
  department?: string;
  totalQueued: number;
  averageWaitTime: number;
  longestWaitTime: number;
  availableAgents: number;
  busyAgents: number;
  offlineAgents: number;
}

// ============================================================================
// CANNED RESPONSE TYPES
// ============================================================================

/**
 * Canned response for quick replies
 */
export interface CannedResponse {
  id: string;
  shortcut: string;
  title: string;
  text: string;
  scope: "global" | "department" | "personal";
  departmentId?: string;
  agentId?: string;
  tags: string[];
  usageCount: number;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Input for creating a canned response
 */
export interface CreateCannedResponseInput {
  shortcut: string;
  title: string;
  text: string;
  scope?: "global" | "department" | "personal";
  departmentId?: string;
  tags?: string[];
}

/**
 * Input for updating a canned response
 */
export interface UpdateCannedResponseInput {
  shortcut?: string;
  title?: string;
  text?: string;
  tags?: string[];
}

// ============================================================================
// SLA TYPES
// ============================================================================

/**
 * SLA Policy for conversation handling
 */
export interface SLAPolicy {
  id: string;
  name: string;
  description?: string;
  priority: ConversationPriority;
  firstResponseTime: number; // seconds
  nextResponseTime: number; // seconds
  resolutionTime: number; // seconds
  operationalHoursOnly: boolean;
  departments?: string[];
  channels?: LivechatChannel[];
  enabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Input for creating an SLA policy
 */
export interface CreateSLAPolicyInput {
  name: string;
  description?: string;
  priority: ConversationPriority;
  firstResponseTime: number;
  nextResponseTime: number;
  resolutionTime: number;
  operationalHoursOnly?: boolean;
  departments?: string[];
  channels?: LivechatChannel[];
}

/**
 * SLA violation event
 */
export interface SLAViolation {
  id: string;
  conversationId: string;
  policyId: string;
  policyName: string;
  type: "first_response" | "next_response" | "resolution";
  targetTime: Date;
  actualTime?: Date;
  exceeded: boolean;
  exceedDuration?: number; // seconds
  escalatedTo?: string;
  escalatedAt?: Date;
  createdAt: Date;
}

/**
 * SLA metrics for reporting
 */
export interface SLAMetrics {
  policyId: string;
  policyName: string;
  period: {
    start: Date;
    end: Date;
  };
  totalConversations: number;
  firstResponseMet: number;
  firstResponseBreached: number;
  resolutionMet: number;
  resolutionBreached: number;
  averageFirstResponseTime: number;
  averageResolutionTime: number;
  complianceRate: number; // percentage
}

// ============================================================================
// ROUTING TYPES
// ============================================================================

/**
 * Routing method for conversation assignment
 */
export type RoutingMethod =
  | "auto_selection" // Automatic round-robin
  | "manual_selection" // Agent picks from queue
  | "load_balancing" // Based on current load
  | "skill_based" // Based on skills match
  | "priority_based"; // Based on conversation priority

/**
 * Routing configuration
 */
export interface RoutingConfig {
  method: RoutingMethod;
  enabled: boolean;
  showQueue: boolean;
  showQueuePositionToVisitor: boolean;
  maxQueueSize?: number;
  maxWaitTime?: number; // seconds
  assignTimeout: number; // seconds before re-routing
  skillsMatchRequired: boolean;
  languageMatchRequired: boolean;
  departmentFallback?: string;
  offlineAction: "queue" | "email" | "message";
  offlineMessage?: string;
}

/**
 * Routing decision for a conversation
 */
export interface RoutingDecision {
  conversationId: string;
  selectedAgentId?: string;
  reason: string;
  alternativeAgents: string[];
  routedAt: Date;
  metadata: Record<string, unknown>;
}

// ============================================================================
// TRIGGER TYPES
// ============================================================================

/**
 * Trigger event types
 */
export type TriggerEvent =
  | "visitor_page_load"
  | "visitor_time_on_page"
  | "visitor_scroll_depth"
  | "visitor_returning"
  | "visitor_idle"
  | "chat_start"
  | "chat_end"
  | "agent_away";

/**
 * Trigger action types
 */
export type TriggerAction =
  | "send_message"
  | "open_widget"
  | "request_feedback"
  | "assign_department"
  | "set_priority"
  | "add_tag";

/**
 * Trigger definition
 */
export interface Trigger {
  id: string;
  name: string;
  description?: string;
  enabled: boolean;
  event: TriggerEvent;
  conditions: TriggerCondition[];
  actions: TriggerActionConfig[];
  runOnce: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Trigger condition
 */
export interface TriggerCondition {
  field: string;
  operator:
    | "equals"
    | "not_equals"
    | "contains"
    | "greater_than"
    | "less_than"
    | "regex";
  value: string | number | boolean;
}

/**
 * Trigger action configuration
 */
export interface TriggerActionConfig {
  type: TriggerAction;
  params: Record<string, unknown>;
}

// ============================================================================
// ANALYTICS TYPES
// ============================================================================

/**
 * Livechat analytics snapshot
 */
export interface LivechatAnalytics {
  period: {
    start: Date;
    end: Date;
  };
  conversations: {
    total: number;
    open: number;
    resolved: number;
    closed: number;
    abandoned: number;
  };
  responseTime: {
    firstResponse: {
      average: number;
      median: number;
      p90: number;
      p95: number;
    };
    overall: {
      average: number;
      median: number;
      p90: number;
      p95: number;
    };
  };
  resolutionTime: {
    average: number;
    median: number;
    p90: number;
    p95: number;
  };
  satisfaction: {
    average: number;
    total: number;
    positive: number;
    negative: number;
    neutral: number;
  };
  volume: {
    byChannel: Record<LivechatChannel, number>;
    byDepartment: Record<string, number>;
    byHour: Record<number, number>;
    byDay: Record<string, number>;
  };
  agents: {
    active: number;
    available: number;
    topPerformers: Array<{
      agentId: string;
      name: string;
      chatsHandled: number;
      avgResponseTime: number;
      satisfaction: number;
    }>;
  };
}

// ============================================================================
// EVENT TYPES
// ============================================================================

/**
 * Livechat event types for real-time updates
 */
export type LivechatEventType =
  | "visitor.created"
  | "visitor.updated"
  | "visitor.online"
  | "visitor.offline"
  | "conversation.created"
  | "conversation.assigned"
  | "conversation.transferred"
  | "conversation.resolved"
  | "conversation.closed"
  | "message.created"
  | "message.updated"
  | "message.read"
  | "agent.status_changed"
  | "queue.updated"
  | "sla.warning"
  | "sla.violated"
  | "typing.start"
  | "typing.stop";

/**
 * Livechat event
 */
export interface LivechatEvent<T = unknown> {
  type: LivechatEventType;
  conversationId?: string;
  visitorId?: string;
  agentId?: string;
  data: T;
  timestamp: Date;
}

// ============================================================================
// RESULT TYPES
// ============================================================================

/**
 * Paginated list result
 */
export interface LivechatListResult<T> {
  items: T[];
  totalCount: number;
  hasMore: boolean;
  offset: number;
  limit: number;
}

/**
 * List options for queries
 */
export interface LivechatListOptions {
  limit?: number;
  offset?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}
