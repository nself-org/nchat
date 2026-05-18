/**
 * Entitlement Service
 *
 * Core service for entitlement management, evaluation, and enforcement.
 * Handles CRUD operations for grants and runtime entitlement checks.
 *
 * @module @/services/entitlements/entitlement.service
 * @version 1.0.0
 */

import { v4 as uuidv4 } from "uuid";
import type { PlanTier, PlanFeatures } from "@/types/subscription.types";
import {
  PLAN_FEATURES,
  PLAN_LIMITS,
  type PlanLimits,
} from "@/lib/billing/plan-config";
import {
  EntitlementGraph,
  getEntitlementGraph,
  createEntitlementGraph,
} from "@/lib/entitlements/entitlement-graph";
import {
  EntitlementScope,
  EntitlementSource,
  EntitlementValueType,
  EntitlementCategory,
  EntitlementDefinition,
  BooleanEntitlementDefinition,
  NumericEntitlementDefinition,
  TierEntitlementDefinition,
  CustomEntitlementDefinition,
  EntitlementGrant,
  CreateEntitlementGrantInput,
  UpdateEntitlementGrantInput,
  EntitlementContext,
  EntitlementEvaluationResult,
  BatchEvaluationRequest,
  BatchEvaluationResponse,
  EntitlementValue,
  CachedEntitlement,
  EntitlementCacheConfig,
  EntitlementEvent,
  EntitlementEventType,
  EntitlementError,
  EntitlementErrorCode,
  PLAN_TIER_HIERARCHY,
  DEFAULT_CACHE_CONFIG,
} from "@/lib/entitlements/entitlement-types";
import { GateRegistry, getGateRegistry } from "@/lib/entitlements/gates";

// ============================================================================
// Entitlement Definitions Registry
// ============================================================================

/**
 * Built-in entitlement definitions derived from plan features and limits.
 */
export const ENTITLEMENT_DEFINITIONS: Record<string, EntitlementDefinition> = {
  // Boolean Features (from PlanFeatures)
  "feature.public_channels": {
    key: "feature.public_channels",
    name: "Public Channels",
    description: "Create and access public channels",
    category: "channels",
    valueType: "boolean",
    inheritable: true,
    grantable: true,
    defaultValue: true,
  } as BooleanEntitlementDefinition,

  "feature.private_channels": {
    key: "feature.private_channels",
    name: "Private Channels",
    description: "Create and access private channels",
    category: "channels",
    valueType: "boolean",
    inheritable: true,
    grantable: true,
    defaultValue: true,
  } as BooleanEntitlementDefinition,

  "feature.direct_messages": {
    key: "feature.direct_messages",
    name: "Direct Messages",
    description: "Send direct messages to users",
    category: "messaging",
    valueType: "boolean",
    inheritable: true,
    grantable: true,
    defaultValue: true,
  } as BooleanEntitlementDefinition,

  "feature.group_dms": {
    key: "feature.group_dms",
    name: "Group DMs",
    description: "Create group direct message conversations",
    category: "messaging",
    valueType: "boolean",
    inheritable: true,
    grantable: true,
    defaultValue: true,
  } as BooleanEntitlementDefinition,

  "feature.threads": {
    key: "feature.threads",
    name: "Threads",
    description: "Reply in threads",
    category: "messaging",
    valueType: "boolean",
    inheritable: true,
    grantable: true,
    defaultValue: true,
  } as BooleanEntitlementDefinition,

  "feature.file_uploads": {
    key: "feature.file_uploads",
    name: "File Uploads",
    description: "Upload files and attachments",
    category: "storage",
    valueType: "boolean",
    inheritable: true,
    grantable: true,
    defaultValue: true,
  } as BooleanEntitlementDefinition,

  "feature.voice_messages": {
    key: "feature.voice_messages",
    name: "Voice Messages",
    description: "Send voice messages",
    category: "messaging",
    valueType: "boolean",
    inheritable: true,
    grantable: true,
    defaultValue: false,
  } as BooleanEntitlementDefinition,

  "feature.video_calls": {
    key: "feature.video_calls",
    name: "Video Calls",
    description: "Start and join video calls",
    category: "calls",
    valueType: "boolean",
    inheritable: true,
    grantable: true,
    defaultValue: false,
  } as BooleanEntitlementDefinition,

  "feature.screen_sharing": {
    key: "feature.screen_sharing",
    name: "Screen Sharing",
    description: "Share screen during calls",
    category: "calls",
    valueType: "boolean",
    inheritable: true,
    grantable: true,
    defaultValue: false,
  } as BooleanEntitlementDefinition,

  "feature.custom_emoji": {
    key: "feature.custom_emoji",
    name: "Custom Emoji",
    description: "Upload and use custom emoji",
    category: "messaging",
    valueType: "boolean",
    inheritable: true,
    grantable: true,
    defaultValue: false,
  } as BooleanEntitlementDefinition,

  "feature.webhooks": {
    key: "feature.webhooks",
    name: "Webhooks",
    description: "Configure webhooks for integrations",
    category: "integrations",
    valueType: "boolean",
    inheritable: true,
    grantable: true,
    defaultValue: false,
  } as BooleanEntitlementDefinition,

  "feature.integrations": {
    key: "feature.integrations",
    name: "Integrations",
    description: "Connect third-party integrations",
    category: "integrations",
    valueType: "boolean",
    inheritable: true,
    grantable: true,
    defaultValue: false,
  } as BooleanEntitlementDefinition,

  "feature.api_access": {
    key: "feature.api_access",
    name: "API Access",
    description: "Access the REST and GraphQL API",
    category: "api",
    valueType: "boolean",
    inheritable: true,
    grantable: true,
    defaultValue: false,
  } as BooleanEntitlementDefinition,

  "feature.sso": {
    key: "feature.sso",
    name: "SSO / SAML",
    description: "Single sign-on authentication",
    category: "security",
    valueType: "boolean",
    inheritable: true,
    grantable: true,
    defaultValue: false,
  } as BooleanEntitlementDefinition,

  "feature.audit_logs": {
    key: "feature.audit_logs",
    name: "Audit Logs",
    description: "View audit logs",
    category: "security",
    valueType: "boolean",
    inheritable: true,
    grantable: true,
    defaultValue: false,
  } as BooleanEntitlementDefinition,

  "feature.admin_dashboard": {
    key: "feature.admin_dashboard",
    name: "Admin Dashboard",
    description: "Access admin dashboard",
    category: "admin",
    valueType: "boolean",
    inheritable: true,
    grantable: true,
    defaultValue: false,
  } as BooleanEntitlementDefinition,

  "feature.priority_support": {
    key: "feature.priority_support",
    name: "Priority Support",
    description: "Get priority customer support",
    category: "support",
    valueType: "boolean",
    inheritable: true,
    grantable: true,
    defaultValue: false,
  } as BooleanEntitlementDefinition,

  "feature.custom_branding": {
    key: "feature.custom_branding",
    name: "Custom Branding",
    description: "Customize workspace branding",
    category: "branding",
    valueType: "boolean",
    inheritable: true,
    grantable: true,
    defaultValue: false,
  } as BooleanEntitlementDefinition,

  "feature.data_export": {
    key: "feature.data_export",
    name: "Data Export",
    description: "Export workspace data",
    category: "compliance",
    valueType: "boolean",
    inheritable: true,
    grantable: true,
    defaultValue: false,
  } as BooleanEntitlementDefinition,

  // Numeric Limits (from PlanLimits)
  "limit.max_members": {
    key: "limit.max_members",
    name: "Maximum Members",
    description: "Maximum number of workspace members",
    category: "admin",
    valueType: "numeric",
    inheritable: true,
    grantable: true,
    defaultValue: 10,
    maxValue: null,
    unit: "members",
    unlimitedValue: null,
  } as NumericEntitlementDefinition,

  "limit.max_channels": {
    key: "limit.max_channels",
    name: "Maximum Channels",
    description: "Maximum number of channels",
    category: "channels",
    valueType: "numeric",
    inheritable: true,
    grantable: true,
    defaultValue: 5,
    maxValue: null,
    unit: "channels",
    unlimitedValue: null,
  } as NumericEntitlementDefinition,

  "limit.max_storage_bytes": {
    key: "limit.max_storage_bytes",
    name: "Storage Limit",
    description: "Maximum storage in bytes",
    category: "storage",
    valueType: "numeric",
    inheritable: true,
    grantable: true,
    defaultValue: 1024 * 1024 * 1024, // 1 GB
    maxValue: null,
    unit: "bytes",
    unlimitedValue: null,
  } as NumericEntitlementDefinition,

  "limit.max_file_size_bytes": {
    key: "limit.max_file_size_bytes",
    name: "Max File Size",
    description: "Maximum file upload size in bytes",
    category: "storage",
    valueType: "numeric",
    inheritable: true,
    grantable: true,
    defaultValue: 10 * 1024 * 1024, // 10 MB
    maxValue: 1024 * 1024 * 1024, // 1 GB
    unit: "bytes",
    unlimitedValue: null,
  } as NumericEntitlementDefinition,

  "limit.max_api_calls_per_month": {
    key: "limit.max_api_calls_per_month",
    name: "API Call Limit",
    description: "Maximum API calls per month",
    category: "api",
    valueType: "numeric",
    inheritable: true,
    grantable: true,
    defaultValue: 1000,
    maxValue: null,
    unit: "calls/month",
    unlimitedValue: null,
  } as NumericEntitlementDefinition,

  "limit.max_call_participants": {
    key: "limit.max_call_participants",
    name: "Call Participants",
    description: "Maximum participants in a call",
    category: "calls",
    valueType: "numeric",
    inheritable: true,
    grantable: true,
    defaultValue: 4,
    maxValue: 500,
    unit: "participants",
    unlimitedValue: null,
  } as NumericEntitlementDefinition,

  "limit.max_stream_duration_minutes": {
    key: "limit.max_stream_duration_minutes",
    name: "Stream Duration",
    description: "Maximum stream duration in minutes",
    category: "calls",
    valueType: "numeric",
    inheritable: true,
    grantable: true,
    defaultValue: 60,
    maxValue: null,
    unit: "minutes",
    unlimitedValue: null,
  } as NumericEntitlementDefinition,

  "limit.message_retention_days": {
    key: "limit.message_retention_days",
    name: "Message Retention",
    description: "Message history retention in days (-1 = unlimited)",
    category: "messaging",
    valueType: "numeric",
    inheritable: true,
    grantable: true,
    defaultValue: 90,
    maxValue: null,
    unit: "days",
    unlimitedValue: -1,
  } as NumericEntitlementDefinition,

  "limit.search_history_days": {
    key: "limit.search_history_days",
    name: "Search History",
    description: "Search history in days (-1 = unlimited)",
    category: "messaging",
    valueType: "numeric",
    inheritable: true,
    grantable: true,
    defaultValue: 90,
    maxValue: null,
    unit: "days",
    unlimitedValue: -1,
  } as NumericEntitlementDefinition,
};

// ============================================================================
// Feature Key Mapping
// ============================================================================

/**
 * Map PlanFeatures keys to entitlement keys.
 */
const FEATURE_KEY_MAP: Record<keyof PlanFeatures, string> = {
  publicChannels: "feature.public_channels",
  privateChannels: "feature.private_channels",
  directMessages: "feature.direct_messages",
  groupDMs: "feature.group_dms",
  threads: "feature.threads",
  fileUploads: "feature.file_uploads",
  voiceMessages: "feature.voice_messages",
  videoCalls: "feature.video_calls",
  screenSharing: "feature.screen_sharing",
  customEmoji: "feature.custom_emoji",
  webhooks: "feature.webhooks",
  integrations: "feature.integrations",
  apiAccess: "feature.api_access",
  sso: "feature.sso",
  auditLogs: "feature.audit_logs",
  adminDashboard: "feature.admin_dashboard",
  prioritySupport: "feature.priority_support",
  customBranding: "feature.custom_branding",
  dataExport: "feature.data_export",
  messageRetentionDays: "limit.message_retention_days",
  searchHistoryDays: "limit.search_history_days",
};

/**
 * Map PlanLimits keys to entitlement keys.
 */
const LIMIT_KEY_MAP: Record<keyof PlanLimits, string> = {
  maxMembers: "limit.max_members",
  maxChannels: "limit.max_channels",
  maxStorageBytes: "limit.max_storage_bytes",
  maxFileSizeBytes: "limit.max_file_size_bytes",
  maxApiCallsPerMonth: "limit.max_api_calls_per_month",
  maxCallParticipants: "limit.max_call_participants",
  maxStreamDurationMinutes: "limit.max_stream_duration_minutes",
};

// ============================================================================
// Entitlement Service
// ============================================================================

export class EntitlementService {
  private graph: EntitlementGraph;
  private gateRegistry: GateRegistry;
  private cache: Map<string, CachedEntitlement>;
  private cacheConfig: EntitlementCacheConfig;
  private eventListeners: Map<
    EntitlementEventType,
    Set<(event: EntitlementEvent) => void>
  >;

  constructor(options?: {
    graph?: EntitlementGraph;
    gateRegistry?: GateRegistry;
    cacheConfig?: Partial<EntitlementCacheConfig>;
  }) {
    this.graph = options?.graph ?? getEntitlementGraph();
    this.gateRegistry = options?.gateRegistry ?? getGateRegistry();
    this.cache = new Map();
    this.cacheConfig = { ...DEFAULT_CACHE_CONFIG, ...options?.cacheConfig };
    this.eventListeners = new Map();
  }

  // ==========================================================================
  // Definition Management
  // ==========================================================================

  /**
   * Get an entitlement definition by key.
   */
  getDefinition(key: string): EntitlementDefinition | undefined {
    return ENTITLEMENT_DEFINITIONS[key];
  }

  /**
   * Get all entitlement definitions.
   */
  getAllDefinitions(): EntitlementDefinition[] {
    return Object.values(ENTITLEMENT_DEFINITIONS);
  }

  /**
   * Get definitions by category.
   */
  getDefinitionsByCategory(
    category: EntitlementCategory,
  ): EntitlementDefinition[] {
    return this.getAllDefinitions().filter((d) => d.category === category);
  }

  /**
   * Register a custom entitlement definition.
   */
  registerDefinition(definition: EntitlementDefinition): void {
    if (ENTITLEMENT_DEFINITIONS[definition.key]) {
      throw new EntitlementError(
        EntitlementErrorCode.INVALID_VALUE,
        `Definition already exists: ${definition.key}`,
        definition.key,
      );
    }
    ENTITLEMENT_DEFINITIONS[definition.key] = definition;
  }

  // ==========================================================================
  // Plan-Based Entitlements
  // ==========================================================================

  /**
   * Get entitlement value from plan.
   */
  getPlanEntitlementValue(key: string, planTier: PlanTier): unknown {
    const definition = this.getDefinition(key);
    if (!definition) {
      return undefined;
    }

    // Check if it's a feature
    for (const [featureKey, entitlementKey] of Object.entries(
      FEATURE_KEY_MAP,
    )) {
      if (entitlementKey === key) {
        const features = PLAN_FEATURES[planTier];
        return features[featureKey as keyof PlanFeatures];
      }
    }

    // Check if it's a limit
    for (const [limitKey, entitlementKey] of Object.entries(LIMIT_KEY_MAP)) {
      if (entitlementKey === key) {
        const limits = PLAN_LIMITS[planTier];
        return limits[limitKey as keyof PlanLimits];
      }
    }

    return undefined;
  }

  /**
   * Get all entitlements for a plan.
   */
  getPlanEntitlements(planTier: PlanTier): Map<string, unknown> {
    const entitlements = new Map<string, unknown>();

    // Add features
    const features = PLAN_FEATURES[planTier];
    for (const [featureKey, value] of Object.entries(features)) {
      const entitlementKey = FEATURE_KEY_MAP[featureKey as keyof PlanFeatures];
      if (entitlementKey) {
        entitlements.set(entitlementKey, value);
      }
    }

    // Add limits
    const limits = PLAN_LIMITS[planTier];
    for (const [limitKey, value] of Object.entries(limits)) {
      const entitlementKey = LIMIT_KEY_MAP[limitKey as keyof PlanLimits];
      if (entitlementKey) {
        entitlements.set(entitlementKey, value);
      }
    }

    return entitlements;
  }

  // ==========================================================================
  // Grant Management
  // ==========================================================================

  /**
   * Create an entitlement grant.
   */
  async createGrant(
    input: CreateEntitlementGrantInput,
  ): Promise<EntitlementGrant> {
    const definition = this.getDefinition(input.entitlementKey);
    if (!definition) {
      throw new EntitlementError(
        EntitlementErrorCode.NOT_FOUND,
        `Unknown entitlement: ${input.entitlementKey}`,
        input.entitlementKey,
      );
    }

    if (!definition.grantable) {
      throw new EntitlementError(
        EntitlementErrorCode.PERMISSION_DENIED,
        `Entitlement is not grantable: ${input.entitlementKey}`,
        input.entitlementKey,
      );
    }

    // Validate value type
    this.validateValue(input.value, definition);

    const grant: EntitlementGrant = {
      id: uuidv4(),
      entitlementKey: input.entitlementKey,
      scope: input.scope,
      entityId: input.entityId,
      source: input.source ?? "grant",
      value: input.value,
      priority: input.priority ?? 100,
      createdAt: new Date(),
      updatedAt: new Date(),
      expiresAt: input.expiresAt,
      grantedBy: input.grantedBy,
      reason: input.reason,
      active: true,
    };

    this.graph.addGrant(input.scope, input.entityId, grant);
    this.invalidateCache(input.scope, input.entityId);

    this.emitEvent({
      type: "entitlement.granted",
      entitlementKey: input.entitlementKey,
      scope: input.scope,
      entityId: input.entityId,
      userId: input.grantedBy,
      value: input.value,
      timestamp: new Date(),
    });

    return grant;
  }

  /**
   * Update an entitlement grant.
   */
  async updateGrant(
    scope: EntitlementScope,
    entityId: string,
    entitlementKey: string,
    updates: UpdateEntitlementGrantInput,
  ): Promise<EntitlementGrant | null> {
    const grant = this.graph.getGrant(scope, entityId, entitlementKey);
    if (!grant) {
      return null;
    }

    const definition = this.getDefinition(entitlementKey);
    if (definition && updates.value !== undefined) {
      this.validateValue(updates.value, definition);
    }

    const previousValue = grant.value;

    // Handle expiresAt specially - convert null to undefined
    const { expiresAt, ...restUpdates } = updates;
    const updatedGrant: EntitlementGrant = {
      ...grant,
      ...restUpdates,
      // Convert null to undefined for expiresAt
      expiresAt:
        expiresAt === null ? undefined : (expiresAt ?? grant.expiresAt),
      updatedAt: new Date(),
    };

    this.graph.addGrant(scope, entityId, updatedGrant);
    this.invalidateCache(scope, entityId);

    if (updates.active === false) {
      this.emitEvent({
        type: "entitlement.revoked",
        entitlementKey,
        scope,
        entityId,
        previousValue,
        timestamp: new Date(),
      });
    }

    return updatedGrant;
  }

  /**
   * Delete an entitlement grant.
   */
  async deleteGrant(
    scope: EntitlementScope,
    entityId: string,
    entitlementKey: string,
  ): Promise<boolean> {
    const grant = this.graph.getGrant(scope, entityId, entitlementKey);
    if (!grant) {
      return false;
    }

    const result = this.graph.removeGrant(scope, entityId, entitlementKey);
    if (result) {
      this.invalidateCache(scope, entityId);
      this.emitEvent({
        type: "entitlement.revoked",
        entitlementKey,
        scope,
        entityId,
        previousValue: grant.value,
        timestamp: new Date(),
      });
    }

    return result;
  }

  /**
   * Get all grants for an entity.
   */
  async getGrants(
    scope: EntitlementScope,
    entityId: string,
  ): Promise<EntitlementGrant[]> {
    return this.graph.getGrants(scope, entityId);
  }

  /**
   * Get a specific grant.
   */
  async getGrant(
    scope: EntitlementScope,
    entityId: string,
    entitlementKey: string,
  ): Promise<EntitlementGrant | undefined> {
    return this.graph.getGrant(scope, entityId, entitlementKey);
  }

  // ==========================================================================
  // Evaluation
  // ==========================================================================

  /**
   * Evaluate a single entitlement.
   */
  async evaluate(
    entitlementKey: string,
    context: EntitlementContext,
    options: { includeChain?: boolean; bypassCache?: boolean } = {},
  ): Promise<EntitlementEvaluationResult> {
    const { includeChain = false, bypassCache = false } = options;

    // Check cache first
    if (this.cacheConfig.enabled && !bypassCache) {
      const cached = this.getCached(entitlementKey, context);
      if (cached) {
        this.emitEvent({
          type: "entitlement.cache_hit",
          entitlementKey,
          scope: "user",
          entityId: context.userId,
          timestamp: new Date(),
        });
        return cached.result;
      }
    }

    this.emitEvent({
      type: "entitlement.cache_miss",
      entitlementKey,
      scope: "user",
      entityId: context.userId,
      timestamp: new Date(),
    });

    const definition = this.getDefinition(entitlementKey);
    if (!definition) {
      return {
        key: entitlementKey,
        granted: false,
        value: false,
        valueType: "boolean",
        source: "default",
        scope: "user",
        entityId: context.userId,
        denialReason: `Unknown entitlement: ${entitlementKey}`,
      };
    }

    // Handle custom gates
    if (definition.valueType === "custom" && definition.gateFn) {
      return this.evaluateCustomGate(
        entitlementKey,
        definition as CustomEntitlementDefinition,
        context,
      );
    }

    // Get plan-based value
    const planValue = this.getPlanEntitlementValue(
      entitlementKey,
      context.planTier,
    );

    // Resolve through graph
    const resolved = this.graph.resolve(entitlementKey, definition, context, {
      includeChain,
    });

    // Merge plan value with resolved value
    let finalValue = resolved.value;
    let finalSource = resolved.source;

    if (planValue !== undefined && resolved.source === "default") {
      finalValue = planValue;
      finalSource = "plan";
    }

    // Evaluate granted status
    const granted = this.evaluateGranted(
      finalValue,
      definition,
      context.planTier,
    );

    // Calculate usage for numeric entitlements
    let usage: EntitlementEvaluationResult["usage"];
    if (definition.valueType === "numeric") {
      const limit = finalValue as number | null;
      // Current usage would be fetched from external service
      // For now, we just include the limit
      usage = {
        current: 0,
        limit,
        remaining: limit,
        percentage: 0,
        warning: "none",
      };
    }

    const result: EntitlementEvaluationResult = {
      key: entitlementKey,
      granted,
      value: finalValue,
      valueType: definition.valueType,
      source: finalSource,
      scope: resolved.scope,
      entityId: resolved.entityId,
      resolutionChain: resolved.resolutionChain,
      usage,
    };

    if (!granted) {
      result.denialReason = this.getDenialReason(definition, context.planTier);
      result.upgradeRequired = this.getUpgradeRequired(
        definition,
        context.planTier,
      );
    }

    // Cache result
    if (this.cacheConfig.enabled) {
      this.setCached(entitlementKey, context, result);
    }

    this.emitEvent({
      type: "entitlement.evaluated",
      entitlementKey,
      scope: result.scope,
      entityId: result.entityId,
      userId: context.userId,
      value: result.value,
      timestamp: new Date(),
    });

    return result;
  }

  /**
   * Evaluate multiple entitlements.
   */
  async evaluateBatch(
    request: BatchEvaluationRequest,
  ): Promise<BatchEvaluationResponse> {
    const results: Record<string, EntitlementEvaluationResult> = {};
    const errors: Record<string, string> = {};

    for (const key of request.entitlementKeys) {
      try {
        results[key] = await this.evaluate(key, request.context, {
          includeChain: request.includeResolutionChain,
        });
      } catch (error) {
        errors[key] = error instanceof Error ? error.message : "Unknown error";
      }
    }

    return {
      results,
      errors: Object.keys(errors).length > 0 ? errors : undefined,
      evaluatedAt: new Date(),
      cacheTtl: this.cacheConfig.ttl,
    };
  }

  /**
   * Check if an entitlement is granted.
   */
  async hasEntitlement(
    entitlementKey: string,
    context: EntitlementContext,
  ): Promise<boolean> {
    const result = await this.evaluate(entitlementKey, context);
    return result.granted;
  }

  /**
   * Check if all entitlements are granted.
   */
  async hasAllEntitlements(
    entitlementKeys: string[],
    context: EntitlementContext,
  ): Promise<boolean> {
    for (const key of entitlementKeys) {
      const result = await this.evaluate(key, context);
      if (!result.granted) {
        return false;
      }
    }
    return true;
  }

  /**
   * Check if any entitlement is granted.
   */
  async hasAnyEntitlement(
    entitlementKeys: string[],
    context: EntitlementContext,
  ): Promise<boolean> {
    for (const key of entitlementKeys) {
      const result = await this.evaluate(key, context);
      if (result.granted) {
        return true;
      }
    }
    return false;
  }

  // ==========================================================================
  // Limit Checking
  // ==========================================================================

  /**
   * Check if within a numeric limit.
   */
  async checkLimit(
    entitlementKey: string,
    context: EntitlementContext,
    currentUsage: number,
    increment: number = 1,
  ): Promise<{
    withinLimit: boolean;
    limit: number | null;
    remaining: number | null;
    warning: "none" | "approaching" | "critical" | "exceeded";
  }> {
    const result = await this.evaluate(entitlementKey, context);

    if (result.valueType !== "numeric") {
      return {
        withinLimit: result.granted,
        limit: null,
        remaining: null,
        warning: "none",
      };
    }

    const limit = result.value as number | null;
    if (limit === null) {
      // Unlimited
      return {
        withinLimit: true,
        limit: null,
        remaining: null,
        warning: "none",
      };
    }

    const newUsage = currentUsage + increment;
    const withinLimit = newUsage <= limit;
    const remaining = Math.max(0, limit - newUsage);
    const percentage = (newUsage / limit) * 100;

    let warning: "none" | "approaching" | "critical" | "exceeded" = "none";
    if (percentage >= 100) {
      warning = "exceeded";
    } else if (percentage >= 90) {
      warning = "critical";
    } else if (percentage >= 75) {
      warning = "approaching";
    }

    if (warning === "approaching" || warning === "critical") {
      this.emitEvent({
        type: "entitlement.limit_approaching",
        entitlementKey,
        scope: result.scope,
        entityId: result.entityId,
        userId: context.userId,
        value: { current: newUsage, limit, percentage },
        timestamp: new Date(),
      });
    }

    if (warning === "exceeded") {
      this.emitEvent({
        type: "entitlement.limit_exceeded",
        entitlementKey,
        scope: result.scope,
        entityId: result.entityId,
        userId: context.userId,
        value: { current: newUsage, limit, percentage },
        timestamp: new Date(),
      });
    }

    return {
      withinLimit,
      limit,
      remaining,
      warning,
    };
  }

  // ==========================================================================
  // Custom Gate Evaluation
  // ==========================================================================

  /**
   * Evaluate a custom gate.
   */
  private async evaluateCustomGate(
    entitlementKey: string,
    definition: CustomEntitlementDefinition,
    context: EntitlementContext,
  ): Promise<EntitlementEvaluationResult> {
    const gate = this.gateRegistry.get(definition.gateFn);
    if (!gate) {
      return {
        key: entitlementKey,
        granted: false,
        value: false,
        valueType: "custom",
        source: "default",
        scope: "user",
        entityId: context.userId,
        denialReason: `Gate not found: ${definition.gateFn}`,
      };
    }

    try {
      const gateResult = await gate.fn(context, definition, undefined);

      return {
        key: entitlementKey,
        granted: gateResult.allowed,
        value: gateResult.value ?? gateResult.allowed,
        valueType: "custom",
        source: "default",
        scope: "user",
        entityId: context.userId,
        denialReason: gateResult.allowed ? undefined : gateResult.reason,
      };
    } catch (error) {
      return {
        key: entitlementKey,
        granted: false,
        value: false,
        valueType: "custom",
        source: "default",
        scope: "user",
        entityId: context.userId,
        denialReason: `Gate error: ${error instanceof Error ? error.message : "Unknown error"}`,
      };
    }
  }

  // ==========================================================================
  // Helpers
  // ==========================================================================

  /**
   * Validate value matches definition type.
   */
  private validateValue(
    value: unknown,
    definition: EntitlementDefinition,
  ): void {
    switch (definition.valueType) {
      case "boolean":
        if (typeof value !== "boolean") {
          throw new EntitlementError(
            EntitlementErrorCode.INVALID_VALUE,
            `Expected boolean value for ${definition.key}`,
            definition.key,
          );
        }
        break;

      case "numeric":
        if (typeof value !== "number" && value !== null) {
          throw new EntitlementError(
            EntitlementErrorCode.INVALID_VALUE,
            `Expected numeric value for ${definition.key}`,
            definition.key,
          );
        }
        break;

      case "tier":
        if (!PLAN_TIER_HIERARCHY.includes(value as PlanTier)) {
          throw new EntitlementError(
            EntitlementErrorCode.INVALID_VALUE,
            `Expected plan tier value for ${definition.key}`,
            definition.key,
          );
        }
        break;
    }
  }

  /**
   * Evaluate granted status based on value and type.
   */
  private evaluateGranted(
    value: unknown,
    definition: EntitlementDefinition,
    currentTier: PlanTier,
  ): boolean {
    switch (definition.valueType) {
      case "boolean":
        return value === true;

      case "numeric": {
        const numValue = value as number | null;
        if (numValue === null) return true; // unlimited
        return numValue > 0;
      }

      case "tier": {
        const requiredTier = (definition as TierEntitlementDefinition)
          .minimumTier;
        const currentIndex = PLAN_TIER_HIERARCHY.indexOf(currentTier);
        const requiredIndex = PLAN_TIER_HIERARCHY.indexOf(requiredTier);
        return currentIndex >= requiredIndex;
      }

      case "custom":
        return value === true;

      default:
        return false;
    }
  }

  /**
   * Get denial reason for an entitlement.
   */
  private getDenialReason(
    definition: EntitlementDefinition,
    currentTier: PlanTier,
  ): string {
    if (definition.valueType === "tier") {
      const requiredTier = (definition as TierEntitlementDefinition)
        .minimumTier;
      return `This feature requires the ${requiredTier} plan or higher. You are on the ${currentTier} plan.`;
    }

    return `Access to ${definition.name} is not included in your current plan.`;
  }

  /**
   * Get upgrade required tier for an entitlement.
   */
  private getUpgradeRequired(
    definition: EntitlementDefinition,
    currentTier: PlanTier,
  ): PlanTier | undefined {
    // Find the first tier that has this feature enabled
    for (const tier of PLAN_TIER_HIERARCHY) {
      const tierIndex = PLAN_TIER_HIERARCHY.indexOf(tier);
      const currentIndex = PLAN_TIER_HIERARCHY.indexOf(currentTier);

      if (tierIndex > currentIndex) {
        const planValue = this.getPlanEntitlementValue(definition.key, tier);
        if (
          planValue === true ||
          (typeof planValue === "number" && planValue > 0)
        ) {
          return tier;
        }
      }
    }

    return "enterprise";
  }

  // ==========================================================================
  // Cache Management
  // ==========================================================================

  /**
   * Get cached entitlement result.
   */
  private getCached(
    entitlementKey: string,
    context: EntitlementContext,
  ): CachedEntitlement | undefined {
    const cacheKey = this.makeCacheKey(entitlementKey, context);
    const cached = this.cache.get(cacheKey);

    if (!cached) {
      return undefined;
    }

    if (cached.expiresAt < new Date()) {
      this.cache.delete(cacheKey);
      return undefined;
    }

    cached.hitCount++;
    return cached;
  }

  /**
   * Set cached entitlement result.
   */
  private setCached(
    entitlementKey: string,
    context: EntitlementContext,
    result: EntitlementEvaluationResult,
  ): void {
    if (this.cache.size >= this.cacheConfig.maxSize) {
      // Evict oldest entries
      const entries = Array.from(this.cache.entries());
      entries.sort((a, b) => a[1].cachedAt.getTime() - b[1].cachedAt.getTime());
      const toEvict = entries.slice(
        0,
        Math.floor(this.cacheConfig.maxSize * 0.1),
      );
      for (const [key] of toEvict) {
        this.cache.delete(key);
      }
    }

    const cacheKey = this.makeCacheKey(entitlementKey, context);
    const now = new Date();

    this.cache.set(cacheKey, {
      key: {
        entitlementKey,
        scope: result.scope,
        entityId: result.entityId,
      },
      result,
      cachedAt: now,
      expiresAt: new Date(now.getTime() + this.cacheConfig.ttl * 1000),
      hitCount: 0,
    });
  }

  /**
   * Create cache key.
   */
  private makeCacheKey(
    entitlementKey: string,
    context: EntitlementContext,
  ): string {
    return `${this.cacheConfig.namespace}:${entitlementKey}:${context.organizationId ?? ""}:${context.workspaceId ?? ""}:${context.channelId ?? ""}:${context.userId}:${context.planTier}`;
  }

  /**
   * Invalidate cache for an entity.
   */
  private invalidateCache(scope: EntitlementScope, entityId: string): void {
    const prefix = `${this.cacheConfig.namespace}:`;
    const scopePatterns: Record<EntitlementScope, number> = {
      organization: 1,
      workspace: 2,
      channel: 3,
      user: 4,
    };

    for (const [key] of this.cache) {
      const parts = key.slice(prefix.length).split(":");
      const scopeIndex = scopePatterns[scope];
      if (parts[scopeIndex] === entityId) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Clear all cache.
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics.
   */
  getCacheStats(): {
    size: number;
    maxSize: number;
    enabled: boolean;
    ttl: number;
  } {
    return {
      size: this.cache.size,
      maxSize: this.cacheConfig.maxSize,
      enabled: this.cacheConfig.enabled,
      ttl: this.cacheConfig.ttl,
    };
  }

  // ==========================================================================
  // Event Handling
  // ==========================================================================

  /**
   * Add event listener.
   */
  on(
    type: EntitlementEventType,
    listener: (event: EntitlementEvent) => void,
  ): void {
    if (!this.eventListeners.has(type)) {
      this.eventListeners.set(type, new Set());
    }
    this.eventListeners.get(type)!.add(listener);
  }

  /**
   * Remove event listener.
   */
  off(
    type: EntitlementEventType,
    listener: (event: EntitlementEvent) => void,
  ): void {
    this.eventListeners.get(type)?.delete(listener);
  }

  /**
   * Emit event.
   */
  private emitEvent(event: EntitlementEvent): void {
    const listeners = this.eventListeners.get(event.type);
    if (listeners) {
      for (const listener of listeners) {
        try {
          listener(event);
        } catch (error) {
          console.error("Error in entitlement event listener:", error);
        }
      }
    }
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

let entitlementServiceInstance: EntitlementService | null = null;

/**
 * Get the singleton entitlement service instance.
 */
export function getEntitlementService(): EntitlementService {
  if (!entitlementServiceInstance) {
    entitlementServiceInstance = new EntitlementService();
  }
  return entitlementServiceInstance;
}

/**
 * Create a new entitlement service instance.
 */
export function createEntitlementService(options?: {
  graph?: EntitlementGraph;
  gateRegistry?: GateRegistry;
  cacheConfig?: Partial<EntitlementCacheConfig>;
}): EntitlementService {
  return new EntitlementService(options);
}

/**
 * Reset the singleton instance (for testing).
 */
export function resetEntitlementService(): void {
  entitlementServiceInstance = null;
}
