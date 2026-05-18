/**
 * Integration Catalog Types
 *
 * Type definitions for the external integration catalog system.
 * Covers connectors for calendar, ticketing, CI/CD, docs, CRM, and more.
 */

// ============================================================================
// Core Enums & Literals
// ============================================================================

/**
 * Categories of integrations available in the catalog.
 */
export type IntegrationCatalogCategory =
  | "calendar"
  | "ticketing"
  | "ci_cd"
  | "docs"
  | "crm"
  | "monitoring"
  | "communication"
  | "storage";

/**
 * Capabilities that a connector can support.
 */
export type ConnectorCapability = "read" | "write" | "subscribe" | "search";

/**
 * Direction of data synchronization.
 */
export type SyncDirection = "incoming" | "outgoing" | "bidirectional";

/**
 * Status of a connector instance.
 */
export type ConnectorStatus =
  | "disconnected"
  | "connecting"
  | "connected"
  | "error"
  | "rate_limited"
  | "disabled";

/**
 * Categorized error types for connectors.
 */
export type ConnectorErrorCategory =
  | "auth"
  | "rate_limit"
  | "network"
  | "data"
  | "config"
  | "unknown";

/**
 * Supported calendar providers.
 */
export type CalendarProvider = "google_calendar" | "outlook_calendar";

/**
 * Supported ticketing providers.
 */
export type TicketingProvider = "jira" | "linear" | "github_issues";

/**
 * Supported CI/CD providers.
 */
export type CICDProvider = "github_actions" | "gitlab_ci" | "jenkins";

/**
 * Supported docs providers.
 */
export type DocsProvider = "google_docs" | "notion" | "confluence";

/**
 * Supported CRM providers.
 */
export type CRMProvider = "salesforce" | "hubspot";

// ============================================================================
// Configuration & Credentials
// ============================================================================

/**
 * Configuration for an integration connector.
 */
export interface ConnectorConfig {
  /** Unique ID of this installation */
  id: string;
  /** Provider identifier (e.g., 'google_calendar', 'jira') */
  provider: string;
  /** Category of the integration */
  category: IntegrationCatalogCategory;
  /** Human-readable display name */
  displayName: string;
  /** Workspace ID this is installed in */
  workspaceId: string;
  /** Channel ID for notifications (optional) */
  notificationChannelId?: string;
  /** Provider-specific configuration */
  providerConfig: Record<string, unknown>;
  /** Sync direction */
  syncDirection: SyncDirection;
  /** Whether this installation is enabled */
  enabled: boolean;
  /** When the integration was installed */
  installedAt: string;
  /** Who installed it */
  installedBy: string;
  /** Last updated timestamp */
  updatedAt: string;
}

/**
 * Encrypted credentials for a connector.
 */
export interface ConnectorCredentials {
  /** OAuth access token */
  accessToken: string;
  /** OAuth refresh token */
  refreshToken?: string;
  /** Token expiry time (ISO string) */
  expiresAt?: string;
  /** API key (for non-OAuth services) */
  apiKey?: string;
  /** Additional credentials (e.g., project IDs, site URLs) */
  metadata: Record<string, string>;
  /** Whether credentials are encrypted at rest */
  encrypted: boolean;
  /** Encryption key ID (for key rotation) */
  encryptionKeyId?: string;
}

/**
 * Rate limit configuration for a connector.
 */
export interface ConnectorRateLimit {
  /** Maximum requests per window */
  maxRequests: number;
  /** Window duration in milliseconds */
  windowMs: number;
  /** Current request count in the window */
  currentCount: number;
  /** When the current window started */
  windowStart: number;
  /** Queue of pending requests */
  queueSize: number;
}

/**
 * Retry configuration for a connector.
 */
export interface RetryConfig {
  /** Maximum number of retry attempts */
  maxAttempts: number;
  /** Initial delay in milliseconds */
  initialDelayMs: number;
  /** Maximum delay in milliseconds */
  maxDelayMs: number;
  /** Backoff multiplier */
  backoffMultiplier: number;
  /** Jitter factor (0-1, adds randomness to delay) */
  jitterFactor: number;
}

// ============================================================================
// Events & Actions
// ============================================================================

/**
 * An event emitted by or to an integration.
 */
export interface IntegrationEvent {
  /** Unique event ID */
  id: string;
  /** Integration installation ID */
  integrationId: string;
  /** Event type (e.g., 'calendar.event_created', 'ticket.status_changed') */
  type: string;
  /** Event payload */
  payload: Record<string, unknown>;
  /** When the event occurred */
  timestamp: string;
  /** Source of the event (external service or nchat) */
  source: "external" | "nchat";
  /** Whether this event has been processed */
  processed: boolean;
  /** Processing error if any */
  error?: string;
}

/**
 * An action that can be performed on an integration.
 */
export interface IntegrationAction {
  /** Action identifier */
  id: string;
  /** Human-readable label */
  label: string;
  /** Description of what this action does */
  description: string;
  /** Required capabilities */
  requiredCapabilities: ConnectorCapability[];
  /** Parameters schema */
  parameters: ActionParameter[];
}

/**
 * A parameter for an integration action.
 */
export interface ActionParameter {
  /** Parameter name */
  name: string;
  /** Parameter type */
  type: "string" | "number" | "boolean" | "date" | "select";
  /** Whether this parameter is required */
  required: boolean;
  /** Description */
  description: string;
  /** Default value */
  defaultValue?: unknown;
  /** Options for select type */
  options?: Array<{ label: string; value: string }>;
}

// ============================================================================
// Catalog Entry
// ============================================================================

/**
 * An entry in the integration catalog describing an available connector.
 */
export interface CatalogEntry {
  /** Unique connector identifier (e.g., 'google_calendar') */
  id: string;
  /** Display name */
  name: string;
  /** Short description */
  description: string;
  /** Icon identifier or URL */
  icon: string;
  /** Category */
  category: IntegrationCatalogCategory;
  /** Capabilities this connector supports */
  capabilities: ConnectorCapability[];
  /** Supported sync directions */
  syncDirections: SyncDirection[];
  /** Available actions */
  actions: IntegrationAction[];
  /** Required configuration fields */
  requiredConfig: string[];
  /** Whether OAuth is required */
  requiresOAuth: boolean;
  /** OAuth scopes needed */
  oauthScopes?: string[];
  /** Documentation URL */
  docsUrl?: string;
  /** Whether this connector is in beta */
  beta: boolean;
  /** Version of this connector */
  version: string;
}

// ============================================================================
// Connector Error
// ============================================================================

/**
 * Structured error from a connector operation.
 */
export class ConnectorError extends Error {
  public readonly category: ConnectorErrorCategory;
  public readonly retryable: boolean;
  public readonly statusCode?: number;
  public readonly provider: string;
  public readonly details?: Record<string, unknown>;

  constructor(
    message: string,
    category: ConnectorErrorCategory,
    provider: string,
    options?: {
      retryable?: boolean;
      statusCode?: number;
      details?: Record<string, unknown>;
      cause?: Error;
    },
  ) {
    super(message);
    this.name = "ConnectorError";
    this.category = category;
    this.provider = provider;
    this.retryable =
      options?.retryable ??
      (category === "network" || category === "rate_limit");
    this.statusCode = options?.statusCode;
    this.details = options?.details;
    if (options?.cause) {
      this.cause = options.cause;
    }
  }
}

// ============================================================================
// Health & Metrics
// ============================================================================

/**
 * Health check result for a connector.
 */
export interface HealthCheckResult {
  /** Whether the connector is healthy */
  healthy: boolean;
  /** Response time in milliseconds */
  responseTimeMs: number;
  /** Human-readable status message */
  message: string;
  /** When this check was performed */
  checkedAt: string;
  /** Consecutive failure count */
  consecutiveFailures: number;
}

/**
 * Usage metrics for an integration.
 */
export interface IntegrationMetrics {
  /** Integration installation ID */
  integrationId: string;
  /** Total API calls made */
  totalApiCalls: number;
  /** Successful API calls */
  successfulCalls: number;
  /** Failed API calls */
  failedCalls: number;
  /** Total events processed */
  eventsProcessed: number;
  /** Total syncs performed */
  syncsPerformed: number;
  /** Average response time in ms */
  avgResponseTimeMs: number;
  /** Last activity timestamp */
  lastActivityAt: string;
  /** Data synced (bytes) */
  dataSyncedBytes: number;
}

// ============================================================================
// Request/Response Logging
// ============================================================================

/**
 * Log entry for a connector request/response cycle.
 */
export interface ConnectorRequestLog {
  /** Unique log ID */
  id: string;
  /** Integration ID */
  integrationId: string;
  /** HTTP method */
  method: string;
  /** Request URL (sanitized) */
  url: string;
  /** Request timestamp */
  timestamp: string;
  /** Response status code */
  statusCode?: number;
  /** Duration in milliseconds */
  durationMs: number;
  /** Whether the request succeeded */
  success: boolean;
  /** Error message if failed */
  error?: string;
  /** Request size in bytes */
  requestSizeBytes?: number;
  /** Response size in bytes */
  responseSizeBytes?: number;
}

// ============================================================================
// Calendar Types
// ============================================================================

export interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  startTime: string;
  endTime: string;
  location?: string;
  meetingLink?: string;
  organizer: { name: string; email: string };
  attendees: CalendarAttendee[];
  recurrence?: CalendarRecurrence;
  reminders?: CalendarReminder[];
  status: "confirmed" | "tentative" | "cancelled";
  visibility: "public" | "private" | "default";
  calendarId: string;
  provider: CalendarProvider;
  externalId: string;
  lastModified: string;
}

export interface CalendarAttendee {
  name: string;
  email: string;
  status: "accepted" | "declined" | "tentative" | "needs_action";
  optional: boolean;
}

export interface CalendarRecurrence {
  frequency: "daily" | "weekly" | "monthly" | "yearly";
  interval: number;
  daysOfWeek?: number[];
  until?: string;
  count?: number;
}

export interface CalendarReminder {
  type: "email" | "popup" | "channel_message";
  minutesBefore: number;
}

export interface CalendarAvailability {
  email: string;
  slots: Array<{
    start: string;
    end: string;
    status: "free" | "busy" | "tentative";
  }>;
}

// ============================================================================
// Ticketing Types
// ============================================================================

export interface Ticket {
  id: string;
  key: string;
  title: string;
  description?: string;
  status: string;
  priority: "critical" | "high" | "medium" | "low" | "none";
  assignee?: { name: string; email: string; avatarUrl?: string };
  reporter: { name: string; email: string; avatarUrl?: string };
  labels: string[];
  type: string;
  projectKey: string;
  projectName: string;
  url: string;
  createdAt: string;
  updatedAt: string;
  provider: TicketingProvider;
  externalId: string;
  comments: TicketComment[];
}

export interface TicketComment {
  id: string;
  body: string;
  author: { name: string; email: string; avatarUrl?: string };
  createdAt: string;
  updatedAt?: string;
}

export interface TicketCreateParams {
  title: string;
  description?: string;
  projectKey: string;
  type?: string;
  priority?: "critical" | "high" | "medium" | "low" | "none";
  assigneeEmail?: string;
  labels?: string[];
}

export interface TicketUpdateParams {
  title?: string;
  description?: string;
  status?: string;
  priority?: "critical" | "high" | "medium" | "low" | "none";
  assigneeEmail?: string;
  labels?: string[];
}

// ============================================================================
// CI/CD Types
// ============================================================================

export interface Pipeline {
  id: string;
  name: string;
  status: PipelineStatus;
  branch: string;
  commit: string;
  commitMessage: string;
  author: { name: string; email: string; avatarUrl?: string };
  url: string;
  startedAt: string;
  finishedAt?: string;
  durationMs?: number;
  stages: PipelineStage[];
  provider: CICDProvider;
  externalId: string;
  repository: string;
}

export type PipelineStatus =
  | "pending"
  | "running"
  | "success"
  | "failed"
  | "cancelled"
  | "waiting_approval";

export interface PipelineStage {
  name: string;
  status: PipelineStatus;
  startedAt?: string;
  finishedAt?: string;
  durationMs?: number;
  logs?: string;
}

export interface DeployApproval {
  pipelineId: string;
  stage: string;
  approvedBy: string;
  approvedAt: string;
  comment?: string;
}

export interface PipelineTrigger {
  repository: string;
  branch: string;
  workflow?: string;
  parameters?: Record<string, string>;
}

// ============================================================================
// Docs Types
// ============================================================================

export interface Document {
  id: string;
  title: string;
  content?: string;
  url: string;
  thumbnailUrl?: string;
  lastModifiedBy: { name: string; email: string };
  createdAt: string;
  updatedAt: string;
  mimeType: string;
  size?: number;
  parentId?: string;
  provider: DocsProvider;
  externalId: string;
  permissions: DocumentPermission[];
}

export interface DocumentPermission {
  type: "user" | "group" | "anyone";
  role: "owner" | "editor" | "commenter" | "viewer";
  email?: string;
}

export interface DocumentCreateParams {
  title: string;
  content?: string;
  parentId?: string;
  templateId?: string;
}

export interface DocumentSearchResult {
  document: Document;
  snippet: string;
  matchScore: number;
}

// ============================================================================
// CRM Types
// ============================================================================

export interface CRMContact {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  company?: string;
  title?: string;
  avatarUrl?: string;
  owner?: { name: string; email: string };
  tags: string[];
  customFields: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  provider: CRMProvider;
  externalId: string;
  url: string;
}

export interface CRMDeal {
  id: string;
  name: string;
  amount: number;
  currency: string;
  stage: string;
  probability: number;
  closeDate?: string;
  contact: { id: string; name: string; email: string };
  owner: { name: string; email: string };
  createdAt: string;
  updatedAt: string;
  provider: CRMProvider;
  externalId: string;
  url: string;
}

export interface CRMActivity {
  id: string;
  type: "call" | "email" | "meeting" | "note" | "task";
  subject: string;
  description?: string;
  contactId: string;
  dealId?: string;
  createdBy: { name: string; email: string };
  createdAt: string;
  provider: CRMProvider;
  externalId: string;
}

export interface CRMContactSearchParams {
  query?: string;
  email?: string;
  company?: string;
  tags?: string[];
  limit?: number;
  offset?: number;
}

export interface CRMLeadCreateParams {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  company?: string;
  title?: string;
  source?: string;
  notes?: string;
}

// ============================================================================
// Sync Types
// ============================================================================

export type ConflictResolutionStrategy =
  | "latest_wins"
  | "source_wins"
  | "target_wins"
  | "manual";

export type SyncItemStatus =
  | "pending"
  | "syncing"
  | "synced"
  | "conflict"
  | "error";

export interface SyncQueueItem {
  id: string;
  integrationId: string;
  direction: SyncDirection;
  entityType: string;
  entityId: string;
  operation: "create" | "update" | "delete";
  payload: Record<string, unknown>;
  priority: number;
  status: SyncItemStatus;
  retryCount: number;
  maxRetries: number;
  createdAt: string;
  processedAt?: string;
  error?: string;
  checksum?: string;
}

export interface SyncState {
  integrationId: string;
  entityType: string;
  lastSyncAt?: string;
  lastSyncCursor?: string;
  syncedCount: number;
  pendingCount: number;
  errorCount: number;
  status: "idle" | "syncing" | "error" | "paused";
  conflictResolution: ConflictResolutionStrategy;
}

export interface SyncConflict {
  id: string;
  integrationId: string;
  entityType: string;
  entityId: string;
  sourceData: Record<string, unknown>;
  targetData: Record<string, unknown>;
  detectedAt: string;
  resolvedAt?: string;
  resolution?: ConflictResolutionStrategy;
  resolvedBy?: string;
}

export interface SyncResult {
  integrationId: string;
  entityType: string;
  direction: SyncDirection;
  created: number;
  updated: number;
  deleted: number;
  conflicts: number;
  errors: number;
  duration: number;
  timestamp: string;
}

// ============================================================================
// Installation Types
// ============================================================================

export interface InstalledIntegration {
  /** Installation ID */
  id: string;
  /** Catalog entry ID */
  catalogId: string;
  /** Connector configuration */
  config: ConnectorConfig;
  /** Current connector status */
  status: ConnectorStatus;
  /** Health check result */
  health?: HealthCheckResult;
  /** Usage metrics */
  metrics: IntegrationMetrics;
  /** Whether the integration is enabled */
  enabled: boolean;
}
