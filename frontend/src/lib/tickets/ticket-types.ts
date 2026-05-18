/**
 * Ticket Types and Interfaces
 *
 * Type definitions for the ticket/escalation workflow system.
 * Provides complete lifecycle management for support tickets.
 *
 * @module lib/tickets/ticket-types
 * @version 1.0.0
 */

import type {
  LivechatChannel,
  ConversationPriority,
  Conversation,
  Agent,
  Visitor,
} from "@/services/livechat/types";

// ============================================================================
// TICKET STATUS TYPES
// ============================================================================

/**
 * Ticket status in the support workflow
 */
export type TicketStatus =
  | "open" // Newly created, awaiting assignment
  | "pending" // Waiting for customer response
  | "in_progress" // Being actively worked on
  | "on_hold" // Temporarily paused
  | "resolved" // Issue resolved, awaiting confirmation
  | "closed"; // Ticket closed and archived

/**
 * Ticket priority levels
 */
export type TicketPriority = ConversationPriority;

/**
 * Ticket source/origin
 */
export type TicketSource =
  | "livechat" // Created from live chat conversation
  | "email" // Created from email
  | "phone" // Created from phone call
  | "web_form" // Created from web form
  | "api" // Created via API
  | "internal" // Created internally by agent
  | "social"; // Created from social media

/**
 * Ticket category for classification
 */
export type TicketCategory =
  | "general"
  | "technical"
  | "billing"
  | "account"
  | "feature_request"
  | "bug_report"
  | "complaint"
  | "feedback"
  | "other";

// ============================================================================
// TICKET TYPES
// ============================================================================

/**
 * Main ticket entity
 */
export interface Ticket {
  id: string;
  /** Unique ticket reference number (e.g., TKT-2024-00001) */
  ticketNumber: string;
  /** Ticket title/subject */
  subject: string;
  /** Detailed description */
  description: string;
  /** Current status */
  status: TicketStatus;
  /** Priority level */
  priority: TicketPriority;
  /** Ticket category */
  category: TicketCategory;
  /** Source of the ticket */
  source: TicketSource;
  /** Communication channel */
  channel?: LivechatChannel;
  /** Associated department */
  department?: string;
  /** Tags for categorization */
  tags: string[];
  /** Customer/requester information */
  requester: TicketRequester;
  /** Currently assigned agent */
  assignee?: TicketAssignee;
  /** Previous assignees history */
  assigneeHistory: TicketAssignment[];
  /** Source conversation if created from livechat */
  sourceConversationId?: string;
  /** Related tickets */
  relatedTicketIds: string[];
  /** Parent ticket for sub-tickets */
  parentTicketId?: string;
  /** Child ticket IDs */
  childTicketIds: string[];
  /** Custom fields */
  customFields: Record<string, unknown>;
  /** Internal notes (not visible to customer) */
  internalNotes: TicketNote[];
  /** Public messages */
  messages: TicketMessage[];
  /** Attachments */
  attachments: TicketAttachment[];
  /** SLA information */
  sla?: TicketSLA;
  /** Escalation information */
  escalation?: TicketEscalation;
  /** Metrics */
  metrics: TicketMetrics;
  /** First response timestamp */
  firstResponseAt?: Date;
  /** Last customer contact */
  lastCustomerContactAt?: Date;
  /** Last agent response */
  lastAgentResponseAt?: Date;
  /** Resolution timestamp */
  resolvedAt?: Date;
  /** Closed timestamp */
  closedAt?: Date;
  /** Due date */
  dueAt?: Date;
  /** Created timestamp */
  createdAt: Date;
  /** Last updated timestamp */
  updatedAt: Date;
  /** Created by (agent/system) */
  createdBy: string;
  /** Last updated by */
  updatedBy: string;
}

/**
 * Ticket requester (customer) information
 */
export interface TicketRequester {
  id: string;
  name?: string;
  email?: string;
  phone?: string;
  avatarUrl?: string;
  customerId?: string;
  organization?: string;
  metadata: Record<string, unknown>;
}

/**
 * Ticket assignee (agent) information
 */
export interface TicketAssignee {
  id: string;
  agentId: string;
  name: string;
  email: string;
  avatarUrl?: string;
  department?: string;
}

/**
 * Ticket assignment record
 */
export interface TicketAssignment {
  id: string;
  agentId: string;
  agentName: string;
  assignedAt: Date;
  unassignedAt?: Date;
  assignedBy: string;
  reason?: string;
}

/**
 * Ticket note (internal)
 */
export interface TicketNote {
  id: string;
  content: string;
  createdBy: string;
  createdByName: string;
  createdAt: Date;
  updatedAt?: Date;
  mentions: string[];
}

/**
 * Ticket message (public communication)
 */
export interface TicketMessage {
  id: string;
  content: string;
  contentHtml?: string;
  senderType: "customer" | "agent" | "system" | "bot";
  senderId: string;
  senderName: string;
  attachments: TicketAttachment[];
  metadata?: Record<string, unknown>;
  isInternal: boolean;
  readAt?: Date;
  createdAt: Date;
  updatedAt?: Date;
}

/**
 * Ticket attachment
 */
export interface TicketAttachment {
  id: string;
  name: string;
  url: string;
  size: number;
  mimeType: string;
  thumbnailUrl?: string;
  uploadedBy: string;
  uploadedAt: Date;
}

/**
 * Ticket SLA information
 */
export interface TicketSLA {
  policyId: string;
  policyName: string;
  firstResponseDue?: Date;
  nextResponseDue?: Date;
  resolutionDue?: Date;
  firstResponseMet?: boolean;
  resolutionMet?: boolean;
  breaches: TicketSLABreach[];
}

/**
 * SLA breach record
 */
export interface TicketSLABreach {
  id: string;
  type: "first_response" | "next_response" | "resolution";
  targetTime: Date;
  actualTime?: Date;
  exceededBy: number; // seconds
  createdAt: Date;
}

/**
 * Ticket escalation information
 */
export interface TicketEscalation {
  level: number;
  escalatedAt: Date;
  escalatedBy: string;
  reason: string;
  targetAgentId?: string;
  targetDepartment?: string;
  autoEscalated: boolean;
  escalationHistory: EscalationHistoryEntry[];
}

/**
 * Escalation history entry
 */
export interface EscalationHistoryEntry {
  id: string;
  fromLevel: number;
  toLevel: number;
  fromAgentId?: string;
  toAgentId?: string;
  fromDepartment?: string;
  toDepartment?: string;
  reason: string;
  escalatedBy: string;
  autoEscalated: boolean;
  escalatedAt: Date;
}

/**
 * Ticket metrics
 */
export interface TicketMetrics {
  messagesCount: number;
  agentMessagesCount: number;
  customerMessagesCount: number;
  notesCount: number;
  attachmentsCount: number;
  reopenCount: number;
  transferCount: number;
  escalationCount: number;
  firstResponseTime?: number; // seconds
  averageResponseTime?: number; // seconds
  resolutionTime?: number; // seconds
  handleTime?: number; // seconds agent spent
  waitTime?: number; // seconds customer waited
}

// ============================================================================
// INPUT TYPES
// ============================================================================

/**
 * Input for creating a ticket
 */
export interface CreateTicketInput {
  subject: string;
  description: string;
  priority?: TicketPriority;
  category?: TicketCategory;
  source?: TicketSource;
  channel?: LivechatChannel;
  department?: string;
  tags?: string[];
  requester: {
    id?: string;
    name?: string;
    email?: string;
    phone?: string;
    customerId?: string;
    organization?: string;
    metadata?: Record<string, unknown>;
  };
  assigneeId?: string;
  sourceConversationId?: string;
  parentTicketId?: string;
  customFields?: Record<string, unknown>;
  dueAt?: Date;
}

/**
 * Input for creating a ticket from a conversation
 */
export interface CreateTicketFromConversationInput {
  conversationId: string;
  subject?: string;
  description?: string;
  priority?: TicketPriority;
  category?: TicketCategory;
  department?: string;
  tags?: string[];
  assigneeId?: string;
  customFields?: Record<string, unknown>;
}

/**
 * Input for updating a ticket
 */
export interface UpdateTicketInput {
  subject?: string;
  description?: string;
  status?: TicketStatus;
  priority?: TicketPriority;
  category?: TicketCategory;
  department?: string;
  tags?: string[];
  assigneeId?: string;
  customFields?: Record<string, unknown>;
  dueAt?: Date | null;
}

/**
 * Input for adding a message to a ticket
 */
export interface AddTicketMessageInput {
  content: string;
  senderType: "customer" | "agent" | "system";
  senderId: string;
  senderName: string;
  attachments?: Omit<TicketAttachment, "id" | "uploadedAt">[];
  isInternal?: boolean;
  metadata?: Record<string, unknown>;
}

/**
 * Input for adding a note to a ticket
 */
export interface AddTicketNoteInput {
  content: string;
  createdBy: string;
  createdByName: string;
  mentions?: string[];
}

/**
 * Input for escalating a ticket
 */
export interface EscalateTicketInput {
  reason: string;
  targetAgentId?: string;
  targetDepartment?: string;
  priority?: TicketPriority;
  escalatedBy: string;
}

// ============================================================================
// ESCALATION TYPES
// ============================================================================

/**
 * Escalation trigger types
 */
export type EscalationTriggerType =
  | "sla_warning" // SLA approaching breach
  | "sla_breach" // SLA breached
  | "no_response" // No agent response for duration
  | "customer_request" // Customer requested escalation
  | "agent_request" // Agent requested escalation
  | "priority_change" // Priority increased
  | "reopen" // Ticket reopened
  | "manual" // Manual escalation
  | "scheduled"; // Scheduled escalation

/**
 * Escalation action types
 */
export type EscalationActionType =
  | "assign_agent" // Assign to specific agent
  | "assign_department" // Assign to department
  | "notify_agent" // Notify assigned agent
  | "notify_manager" // Notify manager
  | "notify_team" // Notify team
  | "change_priority" // Change priority
  | "add_tag" // Add tag
  | "send_email" // Send email notification
  | "webhook" // Call webhook
  | "create_subtask"; // Create subtask

/**
 * Escalation rule definition
 */
export interface EscalationRule {
  id: string;
  name: string;
  description?: string;
  enabled: boolean;
  order: number;
  conditions: EscalationCondition[];
  actions: EscalationAction[];
  cooldownMinutes?: number; // Prevent re-triggering
  maxExecutions?: number; // Max times to execute
  executionCount: number;
  lastExecutedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Escalation condition
 */
export interface EscalationCondition {
  type: EscalationTriggerType;
  field?: string;
  operator:
    | "equals"
    | "not_equals"
    | "greater_than"
    | "less_than"
    | "contains"
    | "in";
  value: unknown;
}

/**
 * Escalation action configuration
 */
export interface EscalationAction {
  type: EscalationActionType;
  target?: string;
  targetType?: "agent" | "department" | "email" | "webhook";
  priority?: TicketPriority;
  message?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Escalation execution record
 */
export interface EscalationExecution {
  id: string;
  ticketId: string;
  ruleId: string;
  ruleName: string;
  trigger: EscalationTriggerType;
  actionsExecuted: EscalationActionResult[];
  success: boolean;
  error?: string;
  executedAt: Date;
}

/**
 * Result of executing an escalation action
 */
export interface EscalationActionResult {
  action: EscalationAction;
  success: boolean;
  error?: string;
  result?: unknown;
}

// ============================================================================
// HISTORY/AUDIT TYPES
// ============================================================================

/**
 * Ticket history event types
 */
export type TicketHistoryEventType =
  | "created"
  | "updated"
  | "status_changed"
  | "priority_changed"
  | "assigned"
  | "unassigned"
  | "transferred"
  | "escalated"
  | "message_added"
  | "note_added"
  | "attachment_added"
  | "tag_added"
  | "tag_removed"
  | "sla_warning"
  | "sla_breach"
  | "merged"
  | "split"
  | "linked"
  | "unlinked";

/**
 * Ticket history entry
 */
export interface TicketHistoryEntry {
  id: string;
  ticketId: string;
  eventType: TicketHistoryEventType;
  description: string;
  changes?: TicketFieldChange[];
  previousValue?: unknown;
  newValue?: unknown;
  actorId: string;
  actorName: string;
  actorType: "agent" | "customer" | "system" | "bot";
  metadata?: Record<string, unknown>;
  createdAt: Date;
}

/**
 * Field change record
 */
export interface TicketFieldChange {
  field: string;
  fieldLabel: string;
  previousValue: unknown;
  newValue: unknown;
}

// ============================================================================
// QUEUE TYPES
// ============================================================================

/**
 * Ticket queue entry
 */
export interface TicketQueueEntry {
  id: string;
  ticketId: string;
  ticketNumber: string;
  subject: string;
  priority: TicketPriority;
  status: TicketStatus;
  department?: string;
  requesterName?: string;
  assigneeName?: string;
  slaStatus?: "ok" | "warning" | "breached";
  waitingSince: Date;
  position: number;
  estimatedWaitTime?: number;
}

/**
 * Ticket queue statistics
 */
export interface TicketQueueStats {
  department?: string;
  totalOpen: number;
  totalPending: number;
  totalInProgress: number;
  totalOnHold: number;
  totalUnassigned: number;
  averageWaitTime: number;
  averageResolutionTime: number;
  slaCompliance: number;
  byPriority: Record<TicketPriority, number>;
  byCategory: Record<TicketCategory, number>;
}

// ============================================================================
// SEARCH/FILTER TYPES
// ============================================================================

/**
 * Ticket search options
 */
export interface TicketSearchOptions {
  query?: string;
  status?: TicketStatus | TicketStatus[];
  priority?: TicketPriority | TicketPriority[];
  category?: TicketCategory | TicketCategory[];
  source?: TicketSource | TicketSource[];
  department?: string;
  assigneeId?: string;
  requesterId?: string;
  tags?: string[];
  createdAfter?: Date;
  createdBefore?: Date;
  updatedAfter?: Date;
  updatedBefore?: Date;
  dueAfter?: Date;
  dueBefore?: Date;
  slaBreached?: boolean;
  escalated?: boolean;
  unassigned?: boolean;
}

/**
 * Ticket list options
 */
export interface TicketListOptions {
  limit?: number;
  offset?: number;
  sortBy?: "createdAt" | "updatedAt" | "priority" | "status" | "dueAt";
  sortOrder?: "asc" | "desc";
}

/**
 * Ticket list result
 */
export interface TicketListResult<T> {
  items: T[];
  totalCount: number;
  hasMore: boolean;
  offset: number;
  limit: number;
}

// ============================================================================
// EVENT TYPES
// ============================================================================

/**
 * Ticket event types for real-time updates
 */
export type TicketEventType =
  | "ticket.created"
  | "ticket.updated"
  | "ticket.assigned"
  | "ticket.escalated"
  | "ticket.resolved"
  | "ticket.closed"
  | "ticket.reopened"
  | "ticket.message_added"
  | "ticket.note_added"
  | "ticket.sla_warning"
  | "ticket.sla_breach";

/**
 * Ticket event
 */
export interface TicketEvent<T = unknown> {
  type: TicketEventType;
  ticketId: string;
  ticketNumber: string;
  data: T;
  timestamp: Date;
}

// ============================================================================
// MERGE/SPLIT TYPES
// ============================================================================

/**
 * Input for merging tickets
 */
export interface MergeTicketsInput {
  targetTicketId: string;
  sourceTicketIds: string[];
  mergedBy: string;
  reason?: string;
}

/**
 * Input for splitting a ticket
 */
export interface SplitTicketInput {
  ticketId: string;
  newTickets: {
    subject: string;
    description: string;
    priority?: TicketPriority;
    category?: TicketCategory;
    assigneeId?: string;
  }[];
  splitBy: string;
  reason?: string;
}

// ============================================================================
// ANALYTICS TYPES
// ============================================================================

/**
 * Ticket analytics data
 */
export interface TicketAnalytics {
  period: {
    start: Date;
    end: Date;
  };
  summary: {
    totalCreated: number;
    totalResolved: number;
    totalClosed: number;
    totalEscalated: number;
    averageResolutionTime: number;
    averageFirstResponseTime: number;
    slaComplianceRate: number;
  };
  byStatus: Record<TicketStatus, number>;
  byPriority: Record<TicketPriority, number>;
  byCategory: Record<TicketCategory, number>;
  bySource: Record<TicketSource, number>;
  byDepartment: Record<string, number>;
  byAgent: Array<{
    agentId: string;
    agentName: string;
    resolved: number;
    averageResolutionTime: number;
    satisfaction: number;
  }>;
  trends: {
    date: string;
    created: number;
    resolved: number;
    closed: number;
  }[];
}
