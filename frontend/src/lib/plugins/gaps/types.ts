/**
 * Plugin Gap Types
 *
 * Type definitions for the backend plugin gap analysis system.
 * Defines the schema for identifying, tracking, and resolving gaps
 * between services that need backend capabilities and available plugins.
 */

// ============================================================================
// GAP SEVERITY
// ============================================================================

/**
 * Severity level of a plugin gap.
 * Determines priority for resolution.
 */
export type GapSeverity = "critical" | "high" | "medium" | "low" | "info";

/**
 * Numeric weights for severity sorting.
 */
export const GAP_SEVERITY_WEIGHTS: Record<GapSeverity, number> = {
  critical: 5,
  high: 4,
  medium: 3,
  low: 2,
  info: 1,
};

// ============================================================================
// GAP STATUS
// ============================================================================

/**
 * Current status of a plugin gap.
 */
export type GapStatus =
  | "uncovered" // No plugin coverage exists
  | "partial" // Some coverage, but incomplete
  | "workaround" // Covered via ad-hoc workaround (not a proper plugin)
  | "covered" // Fully covered by a plugin
  | "deprecated"; // Gap is no longer relevant

// ============================================================================
// PLUGIN CAPABILITY
// ============================================================================

/**
 * A capability that a plugin can provide.
 */
export interface PluginCapability {
  /** Unique capability identifier (e.g., 'storage:upload', 'search:index') */
  id: string;
  /** Human-readable name */
  name: string;
  /** Description of what this capability provides */
  description: string;
  /** The domain this capability belongs to */
  domain: PluginDomain;
  /** Required backend service (e.g., 'minio', 'meilisearch', 'redis') */
  requiredBackendService?: string;
  /** Whether this capability is optional for the domain to function */
  optional: boolean;
}

/**
 * Domains that plugins operate in.
 */
export type PluginDomain =
  | "storage"
  | "search"
  | "notification"
  | "auth"
  | "billing"
  | "moderation"
  | "analytics"
  | "realtime"
  | "media"
  | "e2ee"
  | "calls"
  | "compliance";

/**
 * All valid plugin domains.
 */
export const ALL_PLUGIN_DOMAINS: readonly PluginDomain[] = [
  "storage",
  "search",
  "notification",
  "auth",
  "billing",
  "moderation",
  "analytics",
  "realtime",
  "media",
  "e2ee",
  "calls",
  "compliance",
] as const;

// ============================================================================
// PLUGIN GAP
// ============================================================================

/**
 * Represents a gap between a service's backend needs and available plugin coverage.
 */
export interface PluginGap {
  /** Unique gap identifier */
  id: string;
  /** Human-readable title */
  title: string;
  /** Detailed description of the gap */
  description: string;
  /** Severity of the gap */
  severity: GapSeverity;
  /** Current status */
  status: GapStatus;
  /** Domain this gap belongs to */
  domain: PluginDomain;
  /** Service file(s) that expose this gap */
  affectedServices: string[];
  /** Capabilities needed to close this gap */
  requiredCapabilities: string[];
  /** Plugin that resolves this gap (if any) */
  resolvedByPlugin?: string;
  /** Workaround description (if status is 'workaround') */
  workaroundDescription?: string;
  /** When the gap was identified */
  identifiedAt: string;
  /** When the gap was last updated */
  updatedAt: string;
  /** When the gap was resolved (if applicable) */
  resolvedAt?: string;
  /** Tags for filtering */
  tags: string[];
}

// ============================================================================
// GAP RESOLUTION
// ============================================================================

/**
 * A resolution for a plugin gap.
 */
export interface GapResolution {
  /** Gap ID being resolved */
  gapId: string;
  /** Plugin or adapter that provides the resolution */
  pluginId: string;
  /** How the resolution was achieved */
  resolutionType: "plugin" | "adapter" | "built-in" | "external";
  /** Description of how the gap is resolved */
  description: string;
  /** Capabilities covered by this resolution */
  coveredCapabilities: string[];
  /** When the resolution was registered */
  resolvedAt: string;
  /** Who resolved it */
  resolvedBy: string;
}

// ============================================================================
// GAP ANALYSIS RESULT
// ============================================================================

/**
 * Result of a gap analysis scan.
 */
export interface GapAnalysisResult {
  /** When the analysis was performed */
  analyzedAt: string;
  /** Total number of gaps identified */
  totalGaps: number;
  /** Breakdown by status */
  byStatus: Record<GapStatus, number>;
  /** Breakdown by severity */
  bySeverity: Record<GapSeverity, number>;
  /** Breakdown by domain */
  byDomain: Record<PluginDomain, number>;
  /** Coverage percentage (covered / total) */
  coveragePercent: number;
  /** All identified gaps */
  gaps: PluginGap[];
  /** Recommendations for gap closure */
  recommendations: GapRecommendation[];
}

/**
 * Recommendation for closing a gap.
 */
export interface GapRecommendation {
  /** Gap ID this recommendation addresses */
  gapId: string;
  /** Priority score (higher = more urgent) */
  priority: number;
  /** Recommended action */
  action: string;
  /** Estimated effort in hours */
  estimatedHours: number;
  /** Dependencies that must be resolved first */
  dependencies: string[];
}

// ============================================================================
// SERVICE DESCRIPTOR
// ============================================================================

/**
 * Describes a service and its backend requirements.
 */
export interface ServiceDescriptor {
  /** Service file path (relative to src/) */
  path: string;
  /** Service name */
  name: string;
  /** Domain the service belongs to */
  domain: PluginDomain;
  /** Backend capabilities this service requires */
  requiredCapabilities: string[];
  /** Whether this service directly accesses backend (bypasses plugin) */
  directBackendAccess: boolean;
  /** Description of what the service does */
  description: string;
}

// ============================================================================
// PLUGIN DESCRIPTOR
// ============================================================================

/**
 * Describes an available plugin and its capabilities.
 */
export interface PluginDescriptor {
  /** Plugin identifier */
  id: string;
  /** Plugin name */
  name: string;
  /** Plugin version */
  version: string;
  /** Domain the plugin covers */
  domain: PluginDomain;
  /** Capabilities this plugin provides */
  capabilities: string[];
  /** Whether the plugin is currently enabled */
  enabled: boolean;
  /** Plugin health status */
  healthy: boolean;
  /** Description */
  description: string;
}

// ============================================================================
// ADAPTER CONFIGURATION
// ============================================================================

/**
 * Configuration for creating a plugin adapter.
 */
export interface PluginAdapterConfig {
  /** Adapter identifier */
  id: string;
  /** Name of the adapter */
  name: string;
  /** Domain this adapter operates in */
  domain: PluginDomain;
  /** Service being adapted */
  serviceId: string;
  /** Capabilities the adapter exposes */
  capabilities: string[];
  /** Whether to enable health checking */
  healthCheck: boolean;
  /** Whether to enable metrics collection */
  metrics: boolean;
  /** Timeout for adapter operations in ms */
  timeoutMs: number;
}

/**
 * Default adapter configuration values.
 */
export const DEFAULT_ADAPTER_CONFIG: Partial<PluginAdapterConfig> = {
  healthCheck: true,
  metrics: true,
  timeoutMs: 30000,
};

// ============================================================================
// ADAPTER OPERATION
// ============================================================================

/**
 * An operation that a plugin adapter can perform.
 */
export interface AdapterOperation {
  /** Operation name */
  name: string;
  /** Operation description */
  description: string;
  /** Input parameters */
  params: AdapterOperationParam[];
  /** Return type description */
  returns: string;
  /** Whether this operation is async */
  async: boolean;
}

/**
 * Parameter for an adapter operation.
 */
export interface AdapterOperationParam {
  /** Parameter name */
  name: string;
  /** Parameter type */
  type: string;
  /** Whether the parameter is required */
  required: boolean;
  /** Description */
  description: string;
}

// ============================================================================
// ADAPTER RESULT
// ============================================================================

/**
 * Result of an adapter operation execution.
 */
export interface AdapterOperationResult<T = unknown> {
  /** Whether the operation succeeded */
  success: boolean;
  /** Operation result data */
  data?: T;
  /** Error message if failed */
  error?: string;
  /** Error code if failed */
  errorCode?: string;
  /** Duration in ms */
  durationMs: number;
  /** Adapter that performed the operation */
  adapterId: string;
  /** Operation that was performed */
  operation: string;
  /** Timestamp */
  timestamp: string;
}

// ============================================================================
// HEALTH STATUS
// ============================================================================

/**
 * Health status for a plugin or adapter.
 */
export interface PluginHealthStatus {
  /** Plugin/adapter ID */
  id: string;
  /** Whether it's healthy */
  healthy: boolean;
  /** Status message */
  message: string;
  /** Last check timestamp */
  lastChecked: string;
  /** Response time in ms */
  responseTimeMs: number;
  /** Additional details */
  details?: Record<string, unknown>;
}

// ============================================================================
// VALIDATION
// ============================================================================

/**
 * Validate a plugin domain string.
 */
export function isValidDomain(domain: string): domain is PluginDomain {
  return (ALL_PLUGIN_DOMAINS as readonly string[]).includes(domain);
}

/**
 * Validate a gap severity string.
 */
export function isValidSeverity(severity: string): severity is GapSeverity {
  return severity in GAP_SEVERITY_WEIGHTS;
}

/**
 * Validate a gap status string.
 */
export function isValidStatus(status: string): status is GapStatus {
  return [
    "uncovered",
    "partial",
    "workaround",
    "covered",
    "deprecated",
  ].includes(status);
}

/**
 * Compare gaps by severity (higher severity first).
 */
export function compareGapsBySeverity(a: PluginGap, b: PluginGap): number {
  return GAP_SEVERITY_WEIGHTS[b.severity] - GAP_SEVERITY_WEIGHTS[a.severity];
}
