/**
 * Ticket Services Index
 *
 * Central export for the ticket/escalation workflow system.
 * Provides complete ticket lifecycle management.
 *
 * @module services/tickets
 * @version 1.0.0
 */

// Ticket Service
export {
  TicketService,
  getTicketService,
  createTicketService,
  resetTicketService,
} from "./ticket.service";

// Escalation Service
export {
  EscalationService,
  getEscalationService,
  createEscalationService,
  resetEscalationService,
} from "./escalation.service";

// Ticket History Service
export {
  TicketHistoryService,
  getTicketHistoryService,
  createTicketHistoryService,
  resetTicketHistoryService,
} from "./ticket-history.service";

// Re-export types from lib
export type {
  // Status and priority types
  TicketStatus,
  TicketPriority,
  TicketSource,
  TicketCategory,
  // Main ticket types
  Ticket,
  TicketRequester,
  TicketAssignee,
  TicketAssignment,
  TicketNote,
  TicketMessage,
  TicketAttachment,
  TicketSLA,
  TicketSLABreach,
  TicketEscalation,
  TicketMetrics,
  // Input types
  CreateTicketInput,
  CreateTicketFromConversationInput,
  UpdateTicketInput,
  AddTicketMessageInput,
  AddTicketNoteInput,
  EscalateTicketInput,
  MergeTicketsInput,
  SplitTicketInput,
  // Escalation types
  EscalationTriggerType,
  EscalationActionType,
  EscalationRule,
  EscalationCondition,
  EscalationAction,
  EscalationExecution,
  EscalationActionResult,
  EscalationHistoryEntry,
  // History types
  TicketHistoryEventType,
  TicketHistoryEntry,
  TicketFieldChange,
  // Queue types
  TicketQueueEntry,
  TicketQueueStats,
  // Search types
  TicketSearchOptions,
  TicketListOptions,
  TicketListResult,
  // Event types
  TicketEventType,
  TicketEvent,
  // Analytics types
  TicketAnalytics,
} from "@/lib/tickets/ticket-types";
