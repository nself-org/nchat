/**
 * TypeScript Type Definitions for Feature Flags System
 *
 * This file contains all type definitions used throughout the feature flags system.
 * It provides strong typing for feature configurations, states, and utilities.
 */

import type { FEATURES, FEATURE_CATEGORIES } from "./feature-flags";

// ============================================================================
// CORE TYPES
// ============================================================================

/**
 * Type representing all feature flag keys (e.g., 'MESSAGES_EDIT')
 */
export type FeatureKey = keyof typeof FEATURES;

/**
 * Type representing all feature flag values (e.g., 'messages.edit')
 */
export type FeatureFlag = (typeof FEATURES)[FeatureKey];

/**
 * Type representing feature categories
 */
export type FeatureCategory = keyof typeof FEATURE_CATEGORIES;

/**
 * Type representing category display names
 */
export type FeatureCategoryLabel = (typeof FEATURE_CATEGORIES)[FeatureCategory];

// ============================================================================
// FEATURE STATE TYPES
// ============================================================================

/**
 * State of a single feature flag
 */
export interface FeatureState {
  /** The feature flag identifier */
  flag: FeatureFlag;
  /** Whether the feature is enabled */
  enabled: boolean;
  /** Source of the feature state (env, config, default, override) */
  source: FeatureSource;
  /** Timestamp when the feature state was last updated */
  updatedAt?: number;
}

/**
 * Source of a feature flag's state
 */
export type FeatureSource =
  | "default" // Built-in default value
  | "env" // Environment variable
  | "config" // AppConfig/database
  | "override" // Runtime override
  | "dependency"; // Auto-enabled due to dependency

/**
 * Map of all feature states
 */
export type FeatureStateMap = Record<FeatureFlag, FeatureState>;

/**
 * Simple map of feature flags to their enabled state
 */
export type FeatureEnabledMap = Record<FeatureFlag, boolean>;

// ============================================================================
// CONFIGURATION TYPES
// ============================================================================

/**
 * Feature configuration from environment variables
 */
export interface FeatureEnvConfig {
  /** Feature flag identifier */
  flag: FeatureFlag;
  /** Environment variable name */
  envVar: string;
  /** Default value if env var not set */
  defaultValue: boolean;
}

/**
 * Complete feature configuration
 */
export interface FeatureConfig {
  /** Feature flag identifier */
  flag: FeatureFlag;
  /** Human-readable name */
  name: string;
  /** Description of what the feature does */
  description: string;
  /** Category for organization */
  category: FeatureCategory;
  /** Default enabled state */
  defaultEnabled: boolean;
  /** Whether the feature can be toggled by users */
  userConfigurable: boolean;
  /** Required plan level (if applicable) */
  requiredPlan?: "free" | "pro" | "enterprise";
  /** Features this depends on */
  dependencies?: FeatureFlag[];
  /** Features that cannot be enabled with this */
  conflictsWith?: FeatureFlag[];
  /** Experimental feature flag */
  experimental?: boolean;
  /** Deprecated feature flag */
  deprecated?: boolean;
  /** Beta feature flag */
  beta?: boolean;
}

/**
 * Full feature configuration map
 */
export type FeatureConfigMap = Record<FeatureFlag, FeatureConfig>;

// ============================================================================
// DEPENDENCY TYPES
// ============================================================================

/**
 * Feature dependency definition
 */
export interface FeatureDependency {
  /** The feature that has dependencies */
  feature: FeatureFlag;
  /** Features that must be enabled for this feature to work */
  requires: FeatureFlag[];
  /** Optional features that enhance this feature */
  enhancedBy?: FeatureFlag[];
  /** Features that are automatically enabled when this feature is enabled */
  autoEnables?: FeatureFlag[];
}

/**
 * Map of feature dependencies
 */
export type FeatureDependencyMap = Record<FeatureFlag, FeatureDependency>;

/**
 * Result of dependency validation
 */
export interface DependencyValidationResult {
  /** Whether all dependencies are satisfied */
  valid: boolean;
  /** Missing required dependencies */
  missingDependencies: FeatureFlag[];
  /** Conflicting features that are enabled */
  conflicts: FeatureFlag[];
  /** Features that should be auto-enabled */
  shouldAutoEnable: FeatureFlag[];
  /** Warning messages */
  warnings: string[];
}

// ============================================================================
// LIMIT TYPES
// ============================================================================

/**
 * Configurable limit definition
 */
export interface LimitConfig {
  /** Limit identifier */
  key: string;
  /** Current value */
  value: number;
  /** Minimum allowed value */
  min: number;
  /** Maximum allowed value */
  max: number;
  /** Default value */
  defaultValue: number;
  /** Human-readable name */
  name: string;
  /** Description */
  description: string;
  /** Unit of measurement */
  unit?: "bytes" | "ms" | "seconds" | "minutes" | "count" | "characters";
}

/**
 * All configurable limits
 */
export type LimitsConfig = Record<string, LimitConfig>;

// ============================================================================
// HOOK TYPES
// ============================================================================

/**
 * Return type for useFeature hook
 */
export interface UseFeatureResult {
  /** Whether the feature is enabled */
  enabled: boolean;
  /** Loading state while checking feature status */
  loading: boolean;
  /** Source of the feature state */
  source: FeatureSource;
}

/**
 * Return type for useFeatures hook
 */
export interface UseFeaturesResult {
  /** Map of all feature states */
  features: FeatureEnabledMap;
  /** Loading state */
  loading: boolean;
  /** Check if a specific feature is enabled */
  isEnabled: (feature: FeatureFlag) => boolean;
  /** Check if all specified features are enabled */
  areAllEnabled: (features: FeatureFlag[]) => boolean;
  /** Check if any of the specified features are enabled */
  isAnyEnabled: (features: FeatureFlag[]) => boolean;
  /** Get all enabled features in a category */
  getEnabledInCategory: (category: FeatureCategory) => FeatureFlag[];
}

// ============================================================================
// COMPONENT PROP TYPES
// ============================================================================

/**
 * Props for FeatureGate component
 */
export interface FeatureGateProps {
  /** Feature flag to check */
  feature: FeatureFlag;
  /** Content to render when feature is enabled */
  children: React.ReactNode;
  /** Content to render when feature is disabled */
  fallback?: React.ReactNode;
  /** Callback when feature check completes */
  onCheck?: (enabled: boolean) => void;
}

/**
 * Props for FeatureGateAny component
 */
export interface FeatureGateAnyProps {
  /** Feature flags to check (renders if ANY are enabled) */
  features: FeatureFlag[];
  /** Content to render when any feature is enabled */
  children: React.ReactNode;
  /** Content to render when all features are disabled */
  fallback?: React.ReactNode;
  /** Callback when feature check completes */
  onCheck?: (enabledFeatures: FeatureFlag[]) => void;
}

/**
 * Props for FeatureGateAll component
 */
export interface FeatureGateAllProps {
  /** Feature flags to check (renders only if ALL are enabled) */
  features: FeatureFlag[];
  /** Content to render when all features are enabled */
  children: React.ReactNode;
  /** Content to render when any feature is disabled */
  fallback?: React.ReactNode;
  /** Callback when feature check completes */
  onCheck?: (allEnabled: boolean, missingFeatures: FeatureFlag[]) => void;
}

// ============================================================================
// EVENT TYPES
// ============================================================================

/**
 * Feature toggle event
 */
export interface FeatureToggleEvent {
  /** Feature that was toggled */
  feature: FeatureFlag;
  /** New enabled state */
  enabled: boolean;
  /** Previous enabled state */
  previousState: boolean;
  /** Source of the toggle */
  source: FeatureSource;
  /** Timestamp of the toggle */
  timestamp: number;
  /** User who triggered the toggle (if applicable) */
  userId?: string;
}

/**
 * Feature error event
 */
export interface FeatureErrorEvent {
  /** Feature related to the error */
  feature: FeatureFlag;
  /** Error type */
  type: "dependency_missing" | "conflict" | "validation" | "unknown";
  /** Error message */
  message: string;
  /** Related features */
  relatedFeatures?: FeatureFlag[];
  /** Timestamp */
  timestamp: number;
}

// ============================================================================
// UTILITY TYPES
// ============================================================================

/**
 * Type guard for feature flags
 */
export function isFeatureFlag(value: unknown): value is FeatureFlag {
  return (
    typeof value === "string" &&
    value.includes(".") &&
    value.split(".").length === 2
  );
}

/**
 * Type guard for feature keys
 */
export function isFeatureKey(value: unknown): value is FeatureKey {
  return typeof value === "string" && value.toUpperCase() === value;
}

/**
 * Extract category from feature flag
 */
export type ExtractCategory<T extends FeatureFlag> =
  T extends `${infer C}.${string}` ? C : never;

/**
 * Extract feature name from feature flag
 */
export type ExtractFeatureName<T extends FeatureFlag> =
  T extends `${string}.${infer N}` ? N : never;

/**
 * Filter features by category
 */
export type FeaturesInCategory<C extends string> = {
  [K in FeatureKey]: (typeof FEATURES)[K] extends `${C}.${string}`
    ? (typeof FEATURES)[K]
    : never;
}[FeatureKey];

/**
 * Partial feature state for updates
 */
export type PartialFeatureState = Partial<FeatureState> & { flag: FeatureFlag };

/**
 * Feature preset (predefined set of features)
 */
export interface FeaturePreset {
  /** Preset identifier */
  id: string;
  /** Human-readable name */
  name: string;
  /** Description */
  description: string;
  /** Features enabled in this preset */
  enabledFeatures: FeatureFlag[];
  /** Features explicitly disabled in this preset */
  disabledFeatures?: FeatureFlag[];
}

/**
 * Feature audit log entry
 */
export interface FeatureAuditEntry {
  /** Unique entry ID */
  id: string;
  /** Feature that was changed */
  feature: FeatureFlag;
  /** Action taken */
  action: "enable" | "disable" | "override" | "reset";
  /** Previous state */
  previousState: boolean;
  /** New state */
  newState: boolean;
  /** User who made the change */
  userId?: string;
  /** Reason for the change */
  reason?: string;
  /** Timestamp */
  timestamp: number;
  /** IP address (if applicable) */
  ipAddress?: string;
}
