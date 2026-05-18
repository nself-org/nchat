/**
 * Integration Catalog Module
 *
 * Exports the catalog types, base connector, connectors, registry, and sync engine.
 */

// Types
export type {
  IntegrationCatalogCategory,
  ConnectorCapability,
  SyncDirection,
  ConnectorStatus,
  ConnectorErrorCategory,
  CalendarProvider,
  TicketingProvider,
  CICDProvider,
  DocsProvider,
  CRMProvider,
  ConnectorConfig,
  ConnectorCredentials,
  ConnectorRateLimit,
  RetryConfig,
  IntegrationEvent,
  IntegrationAction,
  ActionParameter,
  CatalogEntry,
  HealthCheckResult,
  IntegrationMetrics,
  ConnectorRequestLog,
  CalendarEvent,
  CalendarAttendee,
  CalendarRecurrence,
  CalendarReminder,
  CalendarAvailability,
  Ticket,
  TicketComment,
  TicketCreateParams,
  TicketUpdateParams,
  Pipeline,
  PipelineStatus,
  PipelineStage,
  DeployApproval,
  PipelineTrigger,
  Document,
  DocumentPermission,
  DocumentCreateParams,
  DocumentSearchResult,
  CRMContact,
  CRMDeal,
  CRMActivity,
  CRMContactSearchParams,
  CRMLeadCreateParams,
  ConflictResolutionStrategy,
  SyncItemStatus,
  SyncQueueItem,
  SyncState,
  SyncConflict,
  SyncResult,
  InstalledIntegration,
} from "./types";

export { ConnectorError } from "./types";

// Base Connector
export { BaseConnector } from "./base-connector";
export type {
  ConnectorEventType,
  ConnectorEventListener,
} from "./base-connector";

// Connectors
export { CalendarConnector } from "../connectors/calendar";
export { TicketingConnector } from "../connectors/ticketing";
export { CICDConnector } from "../connectors/ci-cd";
export { DocsConnector } from "../connectors/docs";
export { CRMConnector } from "../connectors/crm";

// Registry
export {
  IntegrationRegistry,
  CredentialVault,
  HealthMonitor,
} from "./registry";

// Sync Engine
export { SyncEngine } from "./sync-engine";
