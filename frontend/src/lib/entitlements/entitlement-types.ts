/**
 * Entitlement Model Types
 *
 * Unified entitlement system for managing access to plans, channels, features, and seats.
 * Supports boolean, numeric, and tier-based entitlements with inheritance.
 *
 * @module @/lib/entitlements/entitlement-types
 * @version 1.0.0
 */

import type { PlanTier } from "@/types/subscription.types";

// ============================================================================
// Core Entitlement Types
// ============================================================================

/**
 * Type of entitlement value.
 *
 * - boolean: Simple on/off feature flag
 * - numeric: Quantitative limits (e.g., max members, storage bytes)
 * - tier: Plan tier requirement (e.g., requires 'professional' or higher)
 * - custom: Complex entitlement evaluated by custom gate
 */
export type EntitlementValueType = "boolean" | "numeric" | "tier" | "custom";

/**
 * Scope level for entitlement inheritance.
 * Inheritance flows: organization -> workspace -> channel -> user
 */
export type EntitlementScope =
  | "organization"
  | "workspace"
  | "channel"
  | "user";

/**
 * Source of an entitlement.
 */
export type EntitlementSource =
  | "plan" // From subscription plan
  | "addon" // From purchased add-on
  | "grant" // Manually granted (override)
  | "trial" // Trial period
  | "promotion" // Promotional offer
  | "inherited" // Inherited from parent scope
  | "default"; // Default value

/**
 * Category of entitlement for organization.
 */
export type EntitlementCategory =
  | "messaging" // Message-related features
  | "channels" // Channel-related features
  | "calls" // Voice/video call features
  | "storage" // File storage features
  | "integrations" // Third-party integrations
  | "security" // Security features
  | "admin" // Admin/management features
  | "api" // API access features
  | "support" // Support features
  | "branding" // Branding/customization features
  | "analytics" // Analytics features
  | "compliance"; // Compliance features

// ============================================================================
// Entitlement Definition Types
// ============================================================================

/**
 * Base entitlement definition.
 */
export interface EntitlementDefinitionBase {
  /** Unique entitlement key (e.g., 'feature.video_calls') */
  key: string;
  /** Human-readable name */
  name: string;
  /** Description */
  description: string;
  /** Category for grouping */
  category: EntitlementCategory;
  /** Value type */
  valueType: EntitlementValueType;
  /** Whether this can be overridden at lower scopes */
  inheritable: boolean;
  /** Whether this can be explicitly granted/revoked */
  grantable: boolean;
  /** Custom gate function name (for valueType === 'custom') */
  gateFn?: string;
  /** Metadata for UI rendering */
  metadata?: {
    icon?: string;
    sortOrder?: number;
    planBadge?: boolean;
    upgradePrompt?: string;
  };
}

/**
 * Boolean entitlement definition.
 */
export interface BooleanEntitlementDefinition extends EntitlementDefinitionBase {
  valueType: "boolean";
  defaultValue: boolean;
}

/**
 * Numeric entitlement definition.
 */
export interface NumericEntitlementDefinition extends EntitlementDefinitionBase {
  valueType: "numeric";
  defaultValue: number;
  /** null means unlimited */
  maxValue: number | null;
  /** Unit for display (e.g., 'members', 'GB', 'minutes') */
  unit: string;
  /** Whether null means unlimited */
  unlimitedValue?: number | null;
}

/**
 * Tier-based entitlement definition.
 */
export interface TierEntitlementDefinition extends EntitlementDefinitionBase {
  valueType: "tier";
  /** Minimum tier required */
  minimumTier: PlanTier;
  /** Tier hierarchy for comparison */
  tierOrder: readonly PlanTier[];
}

/**
 * Custom entitlement definition.
 */
export interface CustomEntitlementDefinition extends EntitlementDefinitionBase {
  valueType: "custom";
  /** Gate function name for evaluation */
  gateFn: string;
  /** Additional gate parameters */
  gateParams?: Record<string, unknown>;
}

/**
 * Union of all entitlement definitions.
 */
export type EntitlementDefinition =
  | BooleanEntitlementDefinition
  | NumericEntitlementDefinition
  | TierEntitlementDefinition
  | CustomEntitlementDefinition;

// ============================================================================
// Entitlement Value Types
// ============================================================================

/**
 * Resolved entitlement value.
 */
export interface EntitlementValue {
  /** Entitlement key */
  key: string;
  /** Value type */
  valueType: EntitlementValueType;
  /** Resolved value */
  value: boolean | number | PlanTier | unknown;
  /** Whether access is granted */
  granted: boolean;
  /** Source of this value */
  source: EntitlementSource;
  /** Scope where this was resolved */
  scope: EntitlementScope;
  /** Entity ID at this scope */
  entityId: string;
  /** Parent entity ID (if inherited) */
  inheritedFrom?: string;
  /** Expiration timestamp (if temporary) */
  expiresAt?: Date;
  /** Usage tracking (for numeric entitlements) */
  usage?: {
    current: number;
    limit: number | null;
    remaining: number | null;
    percentage: number | null;
  };
}

/**
 * Entitlement grant record.
 */
export interface EntitlementGrant {
  /** Unique grant ID */
  id: string;
  /** Entitlement key */
  entitlementKey: string;
  /** Target scope */
  scope: EntitlementScope;
  /** Target entity ID */
  entityId: string;
  /** Grant source */
  source: EntitlementSource;
  /** Grant value (depends on valueType) */
  value: boolean | number | PlanTier | unknown;
  /** Override priority (higher wins) */
  priority: number;
  /** Created timestamp */
  createdAt: Date;
  /** Updated timestamp */
  updatedAt: Date;
  /** Expiration timestamp */
  expiresAt?: Date;
  /** Who granted this */
  grantedBy?: string;
  /** Reason for grant */
  reason?: string;
  /** Whether this grant is active */
  active: boolean;
}

/**
 * Input for creating an entitlement grant.
 */
export interface CreateEntitlementGrantInput {
  entitlementKey: string;
  scope: EntitlementScope;
  entityId: string;
  source?: EntitlementSource;
  value: boolean | number | PlanTier | unknown;
  priority?: number;
  expiresAt?: Date;
  grantedBy?: string;
  reason?: string;
}

/**
 * Input for updating an entitlement grant.
 */
export interface UpdateEntitlementGrantInput {
  value?: boolean | number | PlanTier | unknown;
  priority?: number;
  expiresAt?: Date | null;
  active?: boolean;
  reason?: string;
}

// ============================================================================
// Evaluation Types
// ============================================================================

/**
 * Context for entitlement evaluation.
 */
export interface EntitlementContext {
  /** User ID */
  userId: string;
  /** User's role in current scope */
  userRole?: string;
  /** Organization ID */
  organizationId?: string;
  /** Workspace ID */
  workspaceId?: string;
  /** Channel ID */
  channelId?: string;
  /** Current plan tier */
  planTier: PlanTier;
  /** Additional context data */
  metadata?: Record<string, unknown>;
}

/**
 * Result of entitlement evaluation.
 */
export interface EntitlementEvaluationResult {
  /** Entitlement key */
  key: string;
  /** Whether access is granted */
  granted: boolean;
  /** Resolved value */
  value: boolean | number | PlanTier | unknown;
  /** Value type */
  valueType: EntitlementValueType;
  /** Source of the final value */
  source: EntitlementSource;
  /** Scope where resolved */
  scope: EntitlementScope;
  /** Entity ID at scope */
  entityId: string;
  /** Resolution chain (for debugging) */
  resolutionChain?: EntitlementResolutionStep[];
  /** Reason for denial (if !granted) */
  denialReason?: string;
  /** Suggested upgrade tier (if applicable) */
  upgradeRequired?: PlanTier;
  /** Usage information (for numeric) */
  usage?: {
    current: number;
    limit: number | null;
    remaining: number | null;
    percentage: number | null;
    warning: "none" | "approaching" | "critical" | "exceeded";
  };
}

/**
 * Step in entitlement resolution chain.
 */
export interface EntitlementResolutionStep {
  scope: EntitlementScope;
  entityId: string;
  source: EntitlementSource;
  value: boolean | number | PlanTier | unknown;
  applied: boolean;
  reason: string;
}

/**
 * Batch evaluation request.
 */
export interface BatchEvaluationRequest {
  context: EntitlementContext;
  entitlementKeys: string[];
  /** Include resolution chain for debugging */
  includeResolutionChain?: boolean;
}

/**
 * Batch evaluation response.
 */
export interface BatchEvaluationResponse {
  results: Record<string, EntitlementEvaluationResult>;
  /** Any errors during evaluation */
  errors?: Record<string, string>;
  /** Evaluation timestamp */
  evaluatedAt: Date;
  /** Cache TTL in seconds */
  cacheTtl: number;
}

// ============================================================================
// Gate Types
// ============================================================================

/**
 * Gate function signature.
 */
export type GateFn = (
  context: EntitlementContext,
  definition: CustomEntitlementDefinition,
  currentValue: unknown,
) => Promise<GateResult>;

/**
 * Result from a custom gate.
 */
export interface GateResult {
  /** Whether the gate allows access */
  allowed: boolean;
  /** Resolved value */
  value?: unknown;
  /** Reason for decision */
  reason?: string;
  /** Additional data */
  metadata?: Record<string, unknown>;
}

/**
 * Gate registration.
 */
export interface GateRegistration {
  name: string;
  fn: GateFn;
  description: string;
  requiredParams?: string[];
}

// ============================================================================
// Inheritance Types
// ============================================================================

/**
 * Inheritance rule for entitlement propagation.
 */
export interface InheritanceRule {
  /** Source scope */
  from: EntitlementScope;
  /** Target scope */
  to: EntitlementScope;
  /** How to combine values when inheriting */
  combineStrategy: InheritanceCombineStrategy;
  /** Whether child can override */
  allowOverride: boolean;
  /** Filter entitlements by category */
  categoryFilter?: EntitlementCategory[];
}

/**
 * Strategy for combining inherited values.
 */
export type InheritanceCombineStrategy =
  | "replace" // Child value replaces parent
  | "merge" // Merge values (for objects)
  | "most_permissive" // Take most permissive value
  | "least_permissive" // Take least permissive value
  | "sum" // Sum numeric values
  | "min" // Take minimum numeric value
  | "max"; // Take maximum numeric value

/**
 * Inheritance chain for an entity.
 */
export interface InheritanceChain {
  /** Target scope */
  scope: EntitlementScope;
  /** Target entity ID */
  entityId: string;
  /** Chain of parent entities */
  chain: Array<{
    scope: EntitlementScope;
    entityId: string;
    planTier?: PlanTier;
  }>;
}

// ============================================================================
// Cache Types
// ============================================================================

/**
 * Cache key for entitlement lookups.
 */
export interface EntitlementCacheKey {
  entitlementKey: string;
  scope: EntitlementScope;
  entityId: string;
}

/**
 * Cached entitlement value.
 */
export interface CachedEntitlement {
  key: EntitlementCacheKey;
  result: EntitlementEvaluationResult;
  cachedAt: Date;
  expiresAt: Date;
  hitCount: number;
}

/**
 * Cache configuration.
 */
export interface EntitlementCacheConfig {
  /** TTL in seconds */
  ttl: number;
  /** Maximum cache size */
  maxSize: number;
  /** Enable cache */
  enabled: boolean;
  /** Warm cache on startup */
  warmOnStartup: boolean;
  /** Cache namespace prefix */
  namespace: string;
}

// ============================================================================
// Event Types
// ============================================================================

/**
 * Entitlement event types.
 */
export type EntitlementEventType =
  | "entitlement.evaluated"
  | "entitlement.granted"
  | "entitlement.revoked"
  | "entitlement.expired"
  | "entitlement.limit_approaching"
  | "entitlement.limit_exceeded"
  | "entitlement.cache_hit"
  | "entitlement.cache_miss"
  | "entitlement.inheritance_resolved";

/**
 * Entitlement event.
 */
export interface EntitlementEvent {
  type: EntitlementEventType;
  entitlementKey: string;
  scope: EntitlementScope;
  entityId: string;
  userId?: string;
  value?: unknown;
  previousValue?: unknown;
  timestamp: Date;
  metadata?: Record<string, unknown>;
}

// ============================================================================
// Error Types
// ============================================================================

/**
 * Entitlement error codes.
 */
export enum EntitlementErrorCode {
  NOT_FOUND = "ENTITLEMENT_NOT_FOUND",
  INVALID_VALUE = "INVALID_ENTITLEMENT_VALUE",
  PERMISSION_DENIED = "ENTITLEMENT_PERMISSION_DENIED",
  LIMIT_EXCEEDED = "ENTITLEMENT_LIMIT_EXCEEDED",
  INVALID_GRANT = "INVALID_GRANT",
  GRANT_EXPIRED = "GRANT_EXPIRED",
  GATE_ERROR = "GATE_EVALUATION_ERROR",
  INHERITANCE_ERROR = "INHERITANCE_RESOLUTION_ERROR",
  CACHE_ERROR = "CACHE_ERROR",
  INVALID_CONTEXT = "INVALID_CONTEXT",
  UNKNOWN_ERROR = "UNKNOWN_ENTITLEMENT_ERROR",
}

/**
 * Entitlement error.
 */
export class EntitlementError extends Error {
  constructor(
    public readonly code: EntitlementErrorCode,
    message: string,
    public readonly entitlementKey?: string,
    public readonly metadata?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "EntitlementError";
  }
}

// ============================================================================
// Constants
// ============================================================================

/**
 * Scope hierarchy from highest to lowest.
 */
export const SCOPE_HIERARCHY: readonly EntitlementScope[] = [
  "organization",
  "workspace",
  "channel",
  "user",
] as const;

/**
 * Plan tier hierarchy from lowest to highest.
 */
export const PLAN_TIER_HIERARCHY: readonly PlanTier[] = [
  "free",
  "starter",
  "professional",
  "enterprise",
  "custom",
] as const;

/**
 * Default cache configuration.
 */
export const DEFAULT_CACHE_CONFIG: EntitlementCacheConfig = {
  ttl: 300, // 5 minutes
  maxSize: 10000,
  enabled: true,
  warmOnStartup: false,
  namespace: "entitlements",
};

/**
 * Default inheritance rules.
 */
export const DEFAULT_INHERITANCE_RULES: readonly InheritanceRule[] = [
  {
    from: "organization",
    to: "workspace",
    combineStrategy: "least_permissive",
    allowOverride: true,
  },
  {
    from: "workspace",
    to: "channel",
    combineStrategy: "least_permissive",
    allowOverride: true,
  },
  {
    from: "workspace",
    to: "user",
    combineStrategy: "most_permissive",
    allowOverride: true,
  },
  {
    from: "channel",
    to: "user",
    combineStrategy: "least_permissive",
    allowOverride: false,
    categoryFilter: ["messaging", "channels"],
  },
] as const;

// ============================================================================
// Utility Types
// ============================================================================

/**
 * Extract value type from entitlement definition.
 */
export type ExtractEntitlementValue<T extends EntitlementDefinition> =
  T extends BooleanEntitlementDefinition
    ? boolean
    : T extends NumericEntitlementDefinition
      ? number
      : T extends TierEntitlementDefinition
        ? PlanTier
        : unknown;

/**
 * Map of entitlement keys to their values.
 */
export type EntitlementMap = Record<string, EntitlementValue>;

/**
 * Partial entitlement context for client-side use.
 */
export type PartialEntitlementContext = Partial<EntitlementContext> &
  Pick<EntitlementContext, "userId" | "planTier">;

/**
 * Serialized entitlement for transport.
 */
export interface SerializedEntitlement {
  key: string;
  granted: boolean;
  value: unknown;
  source: EntitlementSource;
  expiresAt?: string;
}
