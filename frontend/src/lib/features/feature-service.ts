/**
 * Feature Checking Service
 *
 * A singleton service for checking feature flag states. This service provides
 * a centralized way to check if features are enabled, with support for
 * runtime overrides and category-level enable switches.
 *
 * @example
 * ```typescript
 * import { featureService } from '@/lib/features/feature-service'
 *
 * // Check if a specific feature is enabled
 * if (featureService.isEnabled('messaging', 'threads')) {
 *   // Show thread UI
 * }
 *
 * // Check if entire category is enabled
 * if (featureService.isEnabled('voice')) {
 *   // Show voice features
 * }
 *
 * // Apply overrides
 * featureService.setFlags({
 *   messaging: { ...FEATURE_FLAGS.messaging, scheduling: true }
 * })
 * ```
 */

import {
  FEATURE_FLAGS,
  type FeatureFlags,
  type FeatureCategory,
} from "@/config/feature-flags";

/**
 * Deep merge utility for feature flags
 */
function deepMerge<T extends Record<string, unknown>>(
  target: T,
  source: Partial<T>,
): T {
  const result = { ...target };

  for (const key of Object.keys(source) as (keyof T)[]) {
    const sourceValue = source[key];
    const targetValue = target[key];

    if (
      sourceValue !== undefined &&
      typeof sourceValue === "object" &&
      sourceValue !== null &&
      !Array.isArray(sourceValue) &&
      typeof targetValue === "object" &&
      targetValue !== null &&
      !Array.isArray(targetValue)
    ) {
      // Recursively merge nested objects
      result[key] = deepMerge(
        targetValue as Record<string, unknown>,
        sourceValue as Partial<Record<string, unknown>>,
      ) as T[keyof T];
    } else if (sourceValue !== undefined) {
      result[key] = sourceValue as T[keyof T];
    }
  }

  return result;
}

/**
 * Feature Service Class
 *
 * Provides methods for checking and managing feature flag states.
 */
class FeatureService {
  private flags: FeatureFlags = FEATURE_FLAGS;

  /**
   * Set feature flag overrides.
   * Merges the provided overrides with the default flags.
   *
   * @param overrides - Partial feature flags to override
   */
  setFlags(overrides: Partial<FeatureFlags>): void {
    this.flags = deepMerge(FEATURE_FLAGS, overrides) as FeatureFlags;
  }

  /**
   * Reset flags to defaults
   */
  resetFlags(): void {
    this.flags = FEATURE_FLAGS;
  }

  /**
   * Check if a feature or category is enabled.
   *
   * When called with just a category:
   * - If the category has an 'enabled' property, returns its value
   * - Otherwise returns true (category is implicitly enabled)
   *
   * When called with a category and feature:
   * - First checks if the category is enabled (if it has an 'enabled' switch)
   * - Then checks the specific feature's value
   *
   * @param category - The feature category to check
   * @param feature - Optional specific feature within the category
   * @returns boolean indicating if the feature/category is enabled
   *
   * @example
   * ```typescript
   * // Check if messaging category is enabled
   * featureService.isEnabled('messaging') // true
   *
   * // Check if threads feature is enabled
   * featureService.isEnabled('messaging', 'threads') // true
   *
   * // Check voice (disabled by default)
   * featureService.isEnabled('voice') // false
   * featureService.isEnabled('voice', 'calls') // false (category disabled)
   * ```
   */
  isEnabled<C extends FeatureCategory>(
    category: C,
    feature?: keyof FeatureFlags[C],
  ): boolean {
    const categoryFlags = this.flags[category];

    if (!categoryFlags) return false;

    // Check if category has an 'enabled' master switch
    if ("enabled" in categoryFlags && !categoryFlags.enabled) {
      return false;
    }

    // If no specific feature requested, check category enabled state
    if (!feature) {
      return "enabled" in categoryFlags ? Boolean(categoryFlags.enabled) : true;
    }

    // Check specific feature
    const featureValue = categoryFlags[feature as keyof typeof categoryFlags];

    // Handle non-boolean values (like arrays or numbers)
    if (typeof featureValue === "boolean") {
      return featureValue;
    }

    // For non-boolean values, check if they are truthy
    return featureValue !== undefined && featureValue !== null;
  }

  /**
   * Get all current feature flags
   *
   * @returns The complete feature flags object
   */
  getFlags(): FeatureFlags {
    return this.flags;
  }

  /**
   * Get flags for a specific category
   *
   * @param category - The category to get flags for
   * @returns The flags for the specified category
   */
  getCategoryFlags<C extends FeatureCategory>(category: C): FeatureFlags[C] {
    return this.flags[category];
  }

  /**
   * Get a specific flag value
   *
   * @param category - The feature category
   * @param feature - The specific feature
   * @returns The feature value
   */
  getFlag<C extends FeatureCategory>(
    category: C,
    feature: keyof FeatureFlags[C],
  ): FeatureFlags[C][typeof feature] {
    return this.flags[category][feature];
  }

  /**
   * Check if all specified features are enabled
   *
   * @param features - Array of [category, feature] tuples to check
   * @returns boolean indicating if all features are enabled
   */
  areAllEnabled(
    features: Array<[FeatureCategory, string | undefined]>,
  ): boolean {
    return features.every(([category, feature]) =>
      this.isEnabled(category, feature as keyof FeatureFlags[typeof category]),
    );
  }

  /**
   * Check if any of the specified features are enabled
   *
   * @param features - Array of [category, feature] tuples to check
   * @returns boolean indicating if any feature is enabled
   */
  isAnyEnabled(
    features: Array<[FeatureCategory, string | undefined]>,
  ): boolean {
    return features.some(([category, feature]) =>
      this.isEnabled(category, feature as keyof FeatureFlags[typeof category]),
    );
  }

  /**
   * Get all enabled features in a category
   *
   * @param category - The category to check
   * @returns Array of enabled feature names
   */
  getEnabledInCategory<C extends FeatureCategory>(
    category: C,
  ): (keyof FeatureFlags[C])[] {
    const categoryFlags = this.flags[category];
    const enabled: (keyof FeatureFlags[C])[] = [];

    // If category has master switch and it's off, nothing is enabled
    if ("enabled" in categoryFlags && !categoryFlags.enabled) {
      return enabled;
    }

    for (const [key, value] of Object.entries(categoryFlags)) {
      if (key === "enabled") continue;
      if (typeof value === "boolean" && value) {
        enabled.push(key as keyof FeatureFlags[C]);
      }
    }

    return enabled;
  }

  /**
   * Get all disabled features in a category
   *
   * @param category - The category to check
   * @returns Array of disabled feature names
   */
  getDisabledInCategory<C extends FeatureCategory>(
    category: C,
  ): (keyof FeatureFlags[C])[] {
    const categoryFlags = this.flags[category];
    const disabled: (keyof FeatureFlags[C])[] = [];

    // If category has master switch and it's off, everything is disabled
    if ("enabled" in categoryFlags && !categoryFlags.enabled) {
      return Object.keys(categoryFlags).filter(
        (k) => k !== "enabled",
      ) as (keyof FeatureFlags[C])[];
    }

    for (const [key, value] of Object.entries(categoryFlags)) {
      if (key === "enabled") continue;
      if (typeof value === "boolean" && !value) {
        disabled.push(key as keyof FeatureFlags[C]);
      }
    }

    return disabled;
  }
}

/**
 * Singleton instance of the FeatureService
 */
export const featureService = new FeatureService();

/**
 * Export the class for testing or custom instances
 */
export { FeatureService };
