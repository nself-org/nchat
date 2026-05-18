/**
 * Livechat Services Index
 *
 * Central export for the omnichannel live support system.
 * Provides Rocket.Chat-style live help functionality.
 *
 * @module services/livechat
 * @version 1.0.0
 */

// Types
export * from "./types";

// Core Livechat Service
export {
  LivechatService,
  getLivechatService,
  createLivechatService,
  resetLivechatService,
} from "./livechat.service";

// Routing Service
export {
  RoutingService,
  getRoutingService,
  createRoutingService,
  resetRoutingService,
  type RoutingRule,
  type RoutingCondition,
  type RoutingAction,
  type RoutingHistoryEntry,
} from "./routing.service";

// Canned Responses Service
export {
  CannedResponsesService,
  getCannedResponsesService,
  createCannedResponsesService,
  resetCannedResponsesService,
  type VariableContext,
  type CannedResponseSearchOptions,
  type CannedResponseAnalytics,
  type RenderedCannedResponse,
} from "./canned-responses.service";

// SLA Service
export {
  SLAService,
  getSLAService,
  createSLAService,
  resetSLAService,
  type SLACheckResult,
  type EscalationRule,
  type EscalationAction,
} from "./sla.service";
