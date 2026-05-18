/**
 * Entitlement System
 *
 * Unified entitlement model for managing access to plans, channels, features, and seats.
 * Provides inheritance, caching, and custom gate support.
 *
 * @module @/lib/entitlements
 * @version 1.0.0
 */

// Types
export {
  // Core types
  type EntitlementValueType,
  type EntitlementScope,
  type EntitlementSource,
  type EntitlementCategory,

  // Definition types
  type EntitlementDefinitionBase,
  type BooleanEntitlementDefinition,
  type NumericEntitlementDefinition,
  type TierEntitlementDefinition,
  type CustomEntitlementDefinition,
  type EntitlementDefinition,

  // Value types
  type EntitlementValue,
  type EntitlementGrant,
  type CreateEntitlementGrantInput,
  type UpdateEntitlementGrantInput,

  // Evaluation types
  type EntitlementContext,
  type EntitlementEvaluationResult,
  type EntitlementResolutionStep,
  type BatchEvaluationRequest,
  type BatchEvaluationResponse,

  // Gate types
  type GateFn,
  type GateResult,
  type GateRegistration,

  // Inheritance types
  type InheritanceRule,
  type InheritanceCombineStrategy,
  type InheritanceChain,

  // Cache types
  type EntitlementCacheKey,
  type CachedEntitlement,
  type EntitlementCacheConfig,

  // Event types
  type EntitlementEventType,
  type EntitlementEvent,

  // Utility types
  type ExtractEntitlementValue,
  type EntitlementMap,
  type PartialEntitlementContext,
  type SerializedEntitlement,

  // Error
  EntitlementError,
  EntitlementErrorCode,

  // Constants
  SCOPE_HIERARCHY,
  PLAN_TIER_HIERARCHY,
  DEFAULT_CACHE_CONFIG,
  DEFAULT_INHERITANCE_RULES,
} from "./entitlement-types";

// Graph
export {
  EntitlementGraph,
  getEntitlementGraph,
  createEntitlementGraph,
  resetEntitlementGraph,
  type EntitlementGraphNode,
  type GraphResolutionOptions,
  type GraphResolvedValue,
} from "./entitlement-graph";

// Gates
export {
  GateRegistry,
  getGateRegistry,
  createGateRegistry,
  resetGateRegistry,
  BUILT_IN_GATES,

  // Built-in gate functions
  timeBasedGate,
  roleBasedGate,
  tierComparisonGate,
  featureFlagGate,
  betaAccessGate,
  compositeGate,
  rateLimitGate,
  geographicGate,
  workspaceSizeGate,
  trialGate,
  channelTypeGate,
} from "./gates";
