/**
 * Feature Dependencies System
 *
 * This module manages feature dependencies, ensuring that when a feature is enabled,
 * all its required dependencies are also enabled. It also handles feature conflicts
 * and provides validation utilities.
 *
 * @example
 * ```typescript
 * import { validateFeatureDependencies, autoEnableDependencies } from '@/lib/features'
 *
 * // Check if a feature can be enabled
 * const validation = validateFeatureDependencies(FEATURES.SCREEN_SHARE, enabledFeatures)
 *
 * if (!validation.valid) {
 *   // console.log('Missing dependencies:', validation.missingDependencies)
 * }
 *
 * // Auto-enable dependencies when enabling a feature
 * const updated = autoEnableDependencies(FEATURES.SCREEN_SHARE, enabledFeatures)
 * ```
 */

import { FEATURES, type FeatureFlag, ALL_FEATURES } from "./feature-flags";
import type {
  FeatureDependency,
  FeatureDependencyMap,
  DependencyValidationResult,
  FeatureEnabledMap,
} from "./types";
import { isFeatureEnabled } from "./feature-config";

// ============================================================================
// DEPENDENCY DEFINITIONS
// ============================================================================

/**
 * Complete map of feature dependencies.
 *
 * - `requires`: Features that MUST be enabled for this feature to work
 * - `enhancedBy`: Features that improve this feature but aren't required
 * - `autoEnables`: Features that should be automatically enabled when this feature is enabled
 * - `conflictsWith`: Features that cannot be enabled simultaneously
 */
export const FEATURE_DEPENDENCIES: Partial<
  Record<FeatureFlag, FeatureDependency>
> = {
  // ============================================================================
  // MESSAGING DEPENDENCIES
  // ============================================================================

  [FEATURES.MESSAGES_THREADS]: {
    feature: FEATURES.MESSAGES_THREADS,
    requires: [],
    enhancedBy: [FEATURES.MESSAGES_REACTIONS, FEATURES.MESSAGES_MENTIONS],
  },

  [FEATURES.MESSAGES_REACTIONS]: {
    feature: FEATURES.MESSAGES_REACTIONS,
    requires: [],
    enhancedBy: [FEATURES.CUSTOM_EMOJI],
  },

  [FEATURES.MESSAGES_PINS]: {
    feature: FEATURES.MESSAGES_PINS,
    requires: [],
  },

  [FEATURES.MESSAGES_FORWARD]: {
    feature: FEATURES.MESSAGES_FORWARD,
    requires: [FEATURES.CHANNELS_DIRECT], // Need somewhere to forward to
  },

  [FEATURES.MESSAGES_SCHEDULE]: {
    feature: FEATURES.MESSAGES_SCHEDULE,
    requires: [],
  },

  [FEATURES.MESSAGES_VOICE]: {
    feature: FEATURES.MESSAGES_VOICE,
    requires: [FEATURES.FILES_UPLOAD, FEATURES.FILES_AUDIO],
  },

  [FEATURES.MESSAGES_CODE_BLOCKS]: {
    feature: FEATURES.MESSAGES_CODE_BLOCKS,
    requires: [FEATURES.MESSAGES_MARKDOWN],
  },

  [FEATURES.MESSAGES_LINK_PREVIEWS]: {
    feature: FEATURES.MESSAGES_LINK_PREVIEWS,
    requires: [],
    enhancedBy: [FEATURES.FILES_IMAGES],
  },

  [FEATURES.MESSAGES_MENTIONS]: {
    feature: FEATURES.MESSAGES_MENTIONS,
    requires: [],
    enhancedBy: [FEATURES.NOTIFICATIONS_DESKTOP],
  },

  [FEATURES.MESSAGES_QUOTES]: {
    feature: FEATURES.MESSAGES_QUOTES,
    requires: [],
  },

  // ============================================================================
  // CHANNEL DEPENDENCIES
  // ============================================================================

  [FEATURES.CHANNELS_PRIVATE]: {
    feature: FEATURES.CHANNELS_PRIVATE,
    requires: [FEATURES.USERS_ROLES], // Need RBAC for private channels
  },

  [FEATURES.CHANNELS_GROUP_DM]: {
    feature: FEATURES.CHANNELS_GROUP_DM,
    requires: [FEATURES.CHANNELS_DIRECT],
  },

  [FEATURES.CHANNELS_CATEGORIES]: {
    feature: FEATURES.CHANNELS_CATEGORIES,
    requires: [FEATURES.CHANNELS_PUBLIC],
  },

  [FEATURES.CHANNELS_ARCHIVE]: {
    feature: FEATURES.CHANNELS_ARCHIVE,
    requires: [],
    enhancedBy: [FEATURES.ADMIN_DASHBOARD],
  },

  [FEATURES.CHANNELS_MUTE]: {
    feature: FEATURES.CHANNELS_MUTE,
    requires: [FEATURES.NOTIFICATIONS_DESKTOP],
  },

  // ============================================================================
  // FILE DEPENDENCIES
  // ============================================================================

  [FEATURES.FILES_IMAGES]: {
    feature: FEATURES.FILES_IMAGES,
    requires: [FEATURES.FILES_UPLOAD],
    autoEnables: [FEATURES.FILES_UPLOAD],
  },

  [FEATURES.FILES_DOCUMENTS]: {
    feature: FEATURES.FILES_DOCUMENTS,
    requires: [FEATURES.FILES_UPLOAD],
    autoEnables: [FEATURES.FILES_UPLOAD],
  },

  [FEATURES.FILES_AUDIO]: {
    feature: FEATURES.FILES_AUDIO,
    requires: [FEATURES.FILES_UPLOAD],
    autoEnables: [FEATURES.FILES_UPLOAD],
  },

  [FEATURES.FILES_VIDEO]: {
    feature: FEATURES.FILES_VIDEO,
    requires: [FEATURES.FILES_UPLOAD],
    autoEnables: [FEATURES.FILES_UPLOAD],
  },

  [FEATURES.FILES_PREVIEW]: {
    feature: FEATURES.FILES_PREVIEW,
    requires: [FEATURES.FILES_UPLOAD],
    enhancedBy: [FEATURES.FILES_IMAGES, FEATURES.FILES_DOCUMENTS],
  },

  [FEATURES.FILES_DRAG_DROP]: {
    feature: FEATURES.FILES_DRAG_DROP,
    requires: [FEATURES.FILES_UPLOAD],
  },

  [FEATURES.FILES_CLIPBOARD]: {
    feature: FEATURES.FILES_CLIPBOARD,
    requires: [FEATURES.FILES_UPLOAD, FEATURES.FILES_IMAGES],
    autoEnables: [FEATURES.FILES_UPLOAD, FEATURES.FILES_IMAGES],
  },

  // ============================================================================
  // USER DEPENDENCIES
  // ============================================================================

  [FEATURES.USERS_CUSTOM_STATUS]: {
    feature: FEATURES.USERS_CUSTOM_STATUS,
    requires: [FEATURES.USERS_PRESENCE],
  },

  [FEATURES.USERS_AVATARS]: {
    feature: FEATURES.USERS_AVATARS,
    requires: [FEATURES.FILES_UPLOAD, FEATURES.FILES_IMAGES],
    autoEnables: [FEATURES.FILES_UPLOAD, FEATURES.FILES_IMAGES],
  },

  [FEATURES.USERS_BLOCKING]: {
    feature: FEATURES.USERS_BLOCKING,
    requires: [FEATURES.CHANNELS_DIRECT], // Mainly useful for DMs
  },

  // ============================================================================
  // REAL-TIME DEPENDENCIES
  // ============================================================================

  [FEATURES.REALTIME_TYPING]: {
    feature: FEATURES.REALTIME_TYPING,
    requires: [FEATURES.REALTIME_MESSAGES],
  },

  [FEATURES.REALTIME_READ_RECEIPTS]: {
    feature: FEATURES.REALTIME_READ_RECEIPTS,
    requires: [FEATURES.REALTIME_MESSAGES],
  },

  [FEATURES.REALTIME_PRESENCE]: {
    feature: FEATURES.REALTIME_PRESENCE,
    requires: [FEATURES.USERS_PRESENCE],
    autoEnables: [FEATURES.USERS_PRESENCE],
  },

  [FEATURES.REALTIME_NOTIFICATIONS]: {
    feature: FEATURES.REALTIME_NOTIFICATIONS,
    requires: [FEATURES.REALTIME_MESSAGES],
    enhancedBy: [FEATURES.NOTIFICATIONS_DESKTOP, FEATURES.NOTIFICATIONS_SOUND],
  },

  // ============================================================================
  // SEARCH DEPENDENCIES
  // ============================================================================

  [FEATURES.SEARCH_FILES]: {
    feature: FEATURES.SEARCH_FILES,
    requires: [FEATURES.FILES_UPLOAD, FEATURES.SEARCH_MESSAGES],
  },

  [FEATURES.SEARCH_GLOBAL]: {
    feature: FEATURES.SEARCH_GLOBAL,
    requires: [FEATURES.SEARCH_MESSAGES],
    enhancedBy: [FEATURES.SEARCH_FILES, FEATURES.SEARCH_USERS],
  },

  [FEATURES.SEARCH_FILTERS]: {
    feature: FEATURES.SEARCH_FILTERS,
    requires: [FEATURES.SEARCH_MESSAGES],
  },

  [FEATURES.SEARCH_HIGHLIGHTING]: {
    feature: FEATURES.SEARCH_HIGHLIGHTING,
    requires: [FEATURES.SEARCH_MESSAGES],
  },

  // ============================================================================
  // NOTIFICATION DEPENDENCIES
  // ============================================================================

  [FEATURES.NOTIFICATIONS_EMAIL]: {
    feature: FEATURES.NOTIFICATIONS_EMAIL,
    requires: [], // Email service configured separately
  },

  [FEATURES.NOTIFICATIONS_MOBILE]: {
    feature: FEATURES.NOTIFICATIONS_MOBILE,
    requires: [], // Mobile app configured separately
  },

  [FEATURES.NOTIFICATIONS_DND]: {
    feature: FEATURES.NOTIFICATIONS_DND,
    requires: [FEATURES.NOTIFICATIONS_DESKTOP],
  },

  [FEATURES.NOTIFICATIONS_SCHEDULE]: {
    feature: FEATURES.NOTIFICATIONS_SCHEDULE,
    requires: [FEATURES.NOTIFICATIONS_DND],
  },

  // ============================================================================
  // ADVANCED FEATURE DEPENDENCIES
  // ============================================================================

  [FEATURES.CUSTOM_EMOJI]: {
    feature: FEATURES.CUSTOM_EMOJI,
    requires: [FEATURES.FILES_UPLOAD, FEATURES.FILES_IMAGES],
    autoEnables: [FEATURES.FILES_UPLOAD, FEATURES.FILES_IMAGES],
  },

  [FEATURES.GIF_PICKER]: {
    feature: FEATURES.GIF_PICKER,
    requires: [FEATURES.FILES_IMAGES],
  },

  [FEATURES.STICKERS]: {
    feature: FEATURES.STICKERS,
    requires: [FEATURES.FILES_IMAGES],
    enhancedBy: [FEATURES.CUSTOM_EMOJI],
  },

  [FEATURES.POLLS]: {
    feature: FEATURES.POLLS,
    requires: [], // Standalone feature
    enhancedBy: [FEATURES.MESSAGES_REACTIONS],
  },

  [FEATURES.WEBHOOKS]: {
    feature: FEATURES.WEBHOOKS,
    requires: [FEATURES.ADMIN_DASHBOARD],
  },

  [FEATURES.BOTS]: {
    feature: FEATURES.BOTS,
    requires: [FEATURES.ADMIN_DASHBOARD, FEATURES.USERS_ROLES],
    enhancedBy: [FEATURES.SLASH_COMMANDS, FEATURES.WEBHOOKS],
  },

  [FEATURES.SLASH_COMMANDS]: {
    feature: FEATURES.SLASH_COMMANDS,
    requires: [],
    enhancedBy: [FEATURES.BOTS],
  },

  [FEATURES.INTEGRATIONS]: {
    feature: FEATURES.INTEGRATIONS,
    requires: [FEATURES.ADMIN_DASHBOARD],
    enhancedBy: [FEATURES.WEBHOOKS],
  },

  [FEATURES.REMINDERS]: {
    feature: FEATURES.REMINDERS,
    requires: [FEATURES.NOTIFICATIONS_DESKTOP],
  },

  [FEATURES.WORKFLOWS]: {
    feature: FEATURES.WORKFLOWS,
    requires: [FEATURES.ADMIN_DASHBOARD, FEATURES.BOTS],
    enhancedBy: [FEATURES.WEBHOOKS, FEATURES.INTEGRATIONS],
  },

  [FEATURES.VIDEO_CALLS]: {
    feature: FEATURES.VIDEO_CALLS,
    requires: [],
    enhancedBy: [FEATURES.CHANNELS_DIRECT, FEATURES.CHANNELS_GROUP_DM],
  },

  [FEATURES.SCREEN_SHARE]: {
    feature: FEATURES.SCREEN_SHARE,
    requires: [FEATURES.VIDEO_CALLS],
    autoEnables: [FEATURES.VIDEO_CALLS],
  },

  // ============================================================================
  // ADMIN DEPENDENCIES
  // ============================================================================

  [FEATURES.ADMIN_USER_MANAGEMENT]: {
    feature: FEATURES.ADMIN_USER_MANAGEMENT,
    requires: [FEATURES.ADMIN_DASHBOARD, FEATURES.USERS_ROLES],
  },

  [FEATURES.ADMIN_ANALYTICS]: {
    feature: FEATURES.ADMIN_ANALYTICS,
    requires: [FEATURES.ADMIN_DASHBOARD],
  },

  [FEATURES.ADMIN_AUDIT_LOGS]: {
    feature: FEATURES.ADMIN_AUDIT_LOGS,
    requires: [FEATURES.ADMIN_DASHBOARD],
  },

  [FEATURES.ADMIN_BULK_OPERATIONS]: {
    feature: FEATURES.ADMIN_BULK_OPERATIONS,
    requires: [FEATURES.ADMIN_DASHBOARD, FEATURES.ADMIN_USER_MANAGEMENT],
  },

  [FEATURES.ADMIN_EXPORT]: {
    feature: FEATURES.ADMIN_EXPORT,
    requires: [FEATURES.ADMIN_DASHBOARD],
  },

  // ============================================================================
  // MODERATION DEPENDENCIES
  // ============================================================================

  [FEATURES.MODERATION_TOOLS]: {
    feature: FEATURES.MODERATION_TOOLS,
    requires: [FEATURES.USERS_ROLES],
  },

  [FEATURES.MODERATION_REPORTING]: {
    feature: FEATURES.MODERATION_REPORTING,
    requires: [FEATURES.MODERATION_TOOLS],
  },

  [FEATURES.MODERATION_AUTO_FILTER]: {
    feature: FEATURES.MODERATION_AUTO_FILTER,
    requires: [FEATURES.MODERATION_TOOLS],
  },

  [FEATURES.MODERATION_WARNINGS]: {
    feature: FEATURES.MODERATION_WARNINGS,
    requires: [FEATURES.MODERATION_TOOLS, FEATURES.ADMIN_USER_MANAGEMENT],
  },

  [FEATURES.MODERATION_BANS]: {
    feature: FEATURES.MODERATION_BANS,
    requires: [FEATURES.MODERATION_TOOLS, FEATURES.ADMIN_USER_MANAGEMENT],
  },

  [FEATURES.MODERATION_SLOW_MODE]: {
    feature: FEATURES.MODERATION_SLOW_MODE,
    requires: [FEATURES.MODERATION_TOOLS],
  },
};

// ============================================================================
// CONFLICT DEFINITIONS
// ============================================================================

/**
 * Features that cannot be enabled together.
 * This is typically for mutually exclusive features.
 */
export const FEATURE_CONFLICTS: Array<[FeatureFlag, FeatureFlag]> = [
  // Example: If you had conflicting features, define them here
  // [FEATURES.SIMPLE_MODE, FEATURES.ADVANCED_MODE],
];

// ============================================================================
// DEPENDENCY FUNCTIONS
// ============================================================================

/**
 * Get the dependency definition for a feature
 */
export function getFeatureDependency(
  feature: FeatureFlag,
): FeatureDependency | null {
  return FEATURE_DEPENDENCIES[feature] || null;
}

/**
 * Get all features that a feature requires (direct dependencies)
 */
export function getRequiredFeatures(feature: FeatureFlag): FeatureFlag[] {
  const dep = FEATURE_DEPENDENCIES[feature];
  return dep?.requires || [];
}

/**
 * Get all features that enhance a feature (optional dependencies)
 */
export function getEnhancingFeatures(feature: FeatureFlag): FeatureFlag[] {
  const dep = FEATURE_DEPENDENCIES[feature];
  return dep?.enhancedBy || [];
}

/**
 * Get all features that should be auto-enabled with a feature
 */
export function getAutoEnabledFeatures(feature: FeatureFlag): FeatureFlag[] {
  const dep = FEATURE_DEPENDENCIES[feature];
  return dep?.autoEnables || [];
}

/**
 * Get all features that depend on a specific feature
 */
export function getDependentFeatures(feature: FeatureFlag): FeatureFlag[] {
  const dependents: FeatureFlag[] = [];

  for (const [flag, dep] of Object.entries(FEATURE_DEPENDENCIES)) {
    if (dep?.requires?.includes(feature)) {
      dependents.push(flag as FeatureFlag);
    }
  }

  return dependents;
}

/**
 * Get all transitive dependencies for a feature (recursive)
 */
export function getAllRequiredFeatures(
  feature: FeatureFlag,
  visited: Set<FeatureFlag> = new Set(),
): FeatureFlag[] {
  if (visited.has(feature)) return [];
  visited.add(feature);

  const directDeps = getRequiredFeatures(feature);
  const allDeps = [...directDeps];

  for (const dep of directDeps) {
    const transitiveDeps = getAllRequiredFeatures(dep, visited);
    allDeps.push(...transitiveDeps);
  }

  return [...new Set(allDeps)];
}

/**
 * Get features that conflict with a specific feature
 */
export function getConflictingFeatures(feature: FeatureFlag): FeatureFlag[] {
  const conflicts: FeatureFlag[] = [];

  for (const [a, b] of FEATURE_CONFLICTS) {
    if (a === feature) conflicts.push(b);
    if (b === feature) conflicts.push(a);
  }

  return conflicts;
}

// ============================================================================
// VALIDATION FUNCTIONS
// ============================================================================

/**
 * Validate if a feature can be enabled given current feature states
 */
export function validateFeatureDependencies(
  feature: FeatureFlag,
  enabledFeatures: FeatureFlag[] | FeatureEnabledMap,
): DependencyValidationResult {
  // Normalize input to array
  const enabled = Array.isArray(enabledFeatures)
    ? enabledFeatures
    : Object.entries(enabledFeatures)
        .filter(([_, v]) => v)
        .map(([k]) => k as FeatureFlag);

  const enabledSet = new Set(enabled);
  const missingDependencies: FeatureFlag[] = [];
  const conflicts: FeatureFlag[] = [];
  const shouldAutoEnable: FeatureFlag[] = [];
  const warnings: string[] = [];

  // Check required dependencies
  const required = getAllRequiredFeatures(feature);
  for (const dep of required) {
    if (!enabledSet.has(dep)) {
      missingDependencies.push(dep);
    }
  }

  // Check conflicts
  const conflicting = getConflictingFeatures(feature);
  for (const conflict of conflicting) {
    if (enabledSet.has(conflict)) {
      conflicts.push(conflict);
    }
  }

  // Check auto-enabled features
  const autoEnabled = getAutoEnabledFeatures(feature);
  for (const auto of autoEnabled) {
    if (!enabledSet.has(auto)) {
      shouldAutoEnable.push(auto);
    }
  }

  // Check for enhancing features that could be enabled
  const enhancing = getEnhancingFeatures(feature);
  const missingEnhancements = enhancing.filter((f) => !enabledSet.has(f));
  if (missingEnhancements.length > 0) {
    warnings.push(
      `Consider enabling these features for better experience: ${missingEnhancements.join(", ")}`,
    );
  }

  return {
    valid: missingDependencies.length === 0 && conflicts.length === 0,
    missingDependencies,
    conflicts,
    shouldAutoEnable,
    warnings,
  };
}

/**
 * Validate entire feature configuration
 */
export function validateAllFeatures(
  enabledFeatures: FeatureFlag[] | FeatureEnabledMap,
): Record<FeatureFlag, DependencyValidationResult> {
  const enabled = Array.isArray(enabledFeatures)
    ? enabledFeatures
    : Object.entries(enabledFeatures)
        .filter(([_, v]) => v)
        .map(([k]) => k as FeatureFlag);

  const results: Partial<Record<FeatureFlag, DependencyValidationResult>> = {};

  for (const feature of enabled) {
    results[feature] = validateFeatureDependencies(feature, enabled);
  }

  return results as Record<FeatureFlag, DependencyValidationResult>;
}

/**
 * Check if any feature has unmet dependencies
 */
export function hasUnmetDependencies(
  enabledFeatures: FeatureFlag[] | FeatureEnabledMap,
): boolean {
  const validations = validateAllFeatures(enabledFeatures);
  return Object.values(validations).some((v) => !v.valid);
}

/**
 * Get all unmet dependencies across all enabled features
 */
export function getAllUnmetDependencies(
  enabledFeatures: FeatureFlag[] | FeatureEnabledMap,
): FeatureFlag[] {
  const validations = validateAllFeatures(enabledFeatures);
  const unmet = new Set<FeatureFlag>();

  for (const validation of Object.values(validations)) {
    for (const dep of validation.missingDependencies) {
      unmet.add(dep);
    }
  }

  return Array.from(unmet);
}

// ============================================================================
// AUTO-ENABLE FUNCTIONS
// ============================================================================

/**
 * Get the full set of features that should be enabled when enabling a feature,
 * including all transitive dependencies and auto-enabled features
 */
export function getFeaturesToEnable(feature: FeatureFlag): FeatureFlag[] {
  const toEnable = new Set<FeatureFlag>([feature]);

  // Add all required dependencies (transitive)
  const required = getAllRequiredFeatures(feature);
  for (const dep of required) {
    toEnable.add(dep);
    // Also add dependencies of dependencies
    const depDeps = getAllRequiredFeatures(dep);
    for (const dd of depDeps) {
      toEnable.add(dd);
    }
  }

  // Add auto-enabled features
  const autoEnabled = getAutoEnabledFeatures(feature);
  for (const auto of autoEnabled) {
    toEnable.add(auto);
    // Also add dependencies of auto-enabled features
    const autoDeps = getAllRequiredFeatures(auto);
    for (const ad of autoDeps) {
      toEnable.add(ad);
    }
  }

  return Array.from(toEnable);
}

/**
 * Enable a feature and all its dependencies
 * Returns a new enabled features list
 */
export function autoEnableDependencies(
  feature: FeatureFlag,
  currentEnabled: FeatureFlag[],
): FeatureFlag[] {
  const toEnable = getFeaturesToEnable(feature);
  const newEnabled = new Set([...currentEnabled, ...toEnable]);
  return Array.from(newEnabled);
}

/**
 * Get features that will be affected when disabling a feature
 * (features that depend on the disabled feature)
 */
export function getFeaturesToDisable(
  feature: FeatureFlag,
  currentEnabled: FeatureFlag[],
): FeatureFlag[] {
  const toDisable = new Set<FeatureFlag>([feature]);
  const enabledSet = new Set(currentEnabled);

  // Find all features that depend on this feature
  const dependents = getDependentFeatures(feature);
  for (const dep of dependents) {
    if (enabledSet.has(dep)) {
      toDisable.add(dep);
      // Recursively find features depending on this dependent
      const nestedDeps = getFeaturesToDisable(dep, currentEnabled);
      for (const nd of nestedDeps) {
        toDisable.add(nd);
      }
    }
  }

  return Array.from(toDisable);
}

/**
 * Disable a feature and cascade disable dependent features
 * Returns a new enabled features list
 */
export function cascadeDisable(
  feature: FeatureFlag,
  currentEnabled: FeatureFlag[],
): FeatureFlag[] {
  const toDisable = new Set(getFeaturesToDisable(feature, currentEnabled));
  return currentEnabled.filter((f) => !toDisable.has(f));
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Check if a feature is safe to disable (no enabled features depend on it)
 */
export function canSafelyDisable(
  feature: FeatureFlag,
  currentEnabled: FeatureFlag[],
): { safe: boolean; willDisable: FeatureFlag[] } {
  const willDisable = getFeaturesToDisable(feature, currentEnabled).filter(
    (f) => f !== feature,
  );
  return {
    safe: willDisable.length === 0,
    willDisable,
  };
}

/**
 * Get a dependency graph for visualization
 */
export function getDependencyGraph(): {
  nodes: FeatureFlag[];
  edges: Array<{
    from: FeatureFlag;
    to: FeatureFlag;
    type: "requires" | "enhances" | "autoEnables";
  }>;
} {
  const nodes = [...ALL_FEATURES];
  const edges: Array<{
    from: FeatureFlag;
    to: FeatureFlag;
    type: "requires" | "enhances" | "autoEnables";
  }> = [];

  for (const [feature, dep] of Object.entries(FEATURE_DEPENDENCIES)) {
    const from = feature as FeatureFlag;

    for (const req of dep?.requires || []) {
      edges.push({ from, to: req, type: "requires" });
    }

    for (const enh of dep?.enhancedBy || []) {
      edges.push({ from, to: enh, type: "enhances" });
    }

    for (const auto of dep?.autoEnables || []) {
      edges.push({ from, to: auto, type: "autoEnables" });
    }
  }

  return { nodes, edges };
}

/**
 * Sort features by dependency order (dependencies first)
 */
export function sortByDependencyOrder(features: FeatureFlag[]): FeatureFlag[] {
  const sorted: FeatureFlag[] = [];
  const visited = new Set<FeatureFlag>();

  function visit(feature: FeatureFlag) {
    if (visited.has(feature)) return;
    visited.add(feature);

    const deps = getRequiredFeatures(feature);
    for (const dep of deps) {
      if (features.includes(dep)) {
        visit(dep);
      }
    }

    sorted.push(feature);
  }

  for (const feature of features) {
    visit(feature);
  }

  return sorted;
}
