"use client";

/**
 * React Hooks for Feature Flags
 *
 * This module provides React hooks for checking feature flag states
 * in components. All hooks are memoized for performance.
 *
 * @example
 * ```tsx
 * import { useFeature, useFeatures, FEATURES } from '@/lib/features'
 *
 * function ThreadButton() {
 *   const { enabled } = useFeature(FEATURES.MESSAGES_THREADS)
 *
 *   if (!enabled) return null
 *   return <button>Start Thread</button>
 * }
 *
 * function ChatFeatures() {
 *   const { isEnabled, isAnyEnabled } = useFeatures()
 *
 *   return (
 *     <div>
 *       {isEnabled(FEATURES.MESSAGES_REACTIONS) && <ReactionPicker />}
 *       {isAnyEnabled([FEATURES.FILES_IMAGES, FEATURES.FILES_DOCUMENTS]) && <AttachButton />}
 *     </div>
 *   )
 * }
 * ```
 */

import { useState, useEffect, useMemo, useCallback } from "react";
import type { FeatureFlag, FeatureCategory } from "../types";
import {
  isFeatureEnabled,
  areAllFeaturesEnabled,
  isAnyFeatureEnabled,
  getFeatureState,
  getAllFeatureStates,
  getFeatureEnabledMap,
  clearFeatureCache,
} from "../feature-config";
import { getFeaturesByCategory } from "../feature-flags";
import type {
  UseFeatureResult,
  UseFeaturesResult,
  FeatureSource,
  FeatureEnabledMap,
} from "../types";

// ============================================================================
// SINGLE FEATURE HOOK
// ============================================================================

/**
 * Hook to check if a single feature is enabled
 *
 * @param feature - The feature flag to check
 * @returns Object containing enabled state, loading state, and source
 *
 * @example
 * ```tsx
 * function EditButton() {
 *   const { enabled, loading } = useFeature(FEATURES.MESSAGES_EDIT)
 *
 *   if (loading) return <Spinner />
 *   if (!enabled) return null
 *
 *   return <button>Edit</button>
 * }
 * ```
 */
export function useFeature(feature: FeatureFlag): UseFeatureResult {
  const [state, setState] = useState<{
    enabled: boolean;
    source: FeatureSource;
    loading: boolean;
  }>(() => {
    // Initialize with server-side value
    const featureState = getFeatureState(feature);
    return {
      enabled: featureState.enabled,
      source: featureState.source,
      loading: false,
    };
  });

  useEffect(() => {
    // Re-check on mount in case of hydration mismatch
    const featureState = getFeatureState(feature);
    setState({
      enabled: featureState.enabled,
      source: featureState.source,
      loading: false,
    });
  }, [feature]);

  return state;
}

/**
 * Hook to check if a feature is enabled (simple boolean version)
 *
 * @param feature - The feature flag to check
 * @returns boolean indicating if feature is enabled
 *
 * @example
 * ```tsx
 * function Component() {
 *   const canEdit = useFeatureEnabled(FEATURES.MESSAGES_EDIT)
 *   // ...
 * }
 * ```
 */
export function useFeatureEnabled(feature: FeatureFlag): boolean {
  const { enabled } = useFeature(feature);
  return enabled;
}

// ============================================================================
// MULTIPLE FEATURES HOOK
// ============================================================================

/**
 * Hook to access all feature states and utility functions
 *
 * @returns Object with all feature states and helper functions
 *
 * @example
 * ```tsx
 * function FeaturePanel() {
 *   const {
 *     features,
 *     isEnabled,
 *     areAllEnabled,
 *     isAnyEnabled,
 *     getEnabledInCategory
 *   } = useFeatures()
 *
 *   const hasAdvancedFeatures = isAnyEnabled([
 *     FEATURES.CUSTOM_EMOJI,
 *     FEATURES.GIF_PICKER,
 *     FEATURES.POLLS
 *   ])
 *
 *   const messageFeatures = getEnabledInCategory('messages')
 *
 *   return (
 *     <div>
 *       {hasAdvancedFeatures && <AdvancedPanel />}
 *       <p>Enabled message features: {messageFeatures.length}</p>
 *     </div>
 *   )
 * }
 * ```
 */
export function useFeatures(): UseFeaturesResult {
  const [features, setFeatures] = useState<FeatureEnabledMap>(() =>
    getFeatureEnabledMap(),
  );
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Re-sync on mount
    setFeatures(getFeatureEnabledMap());
  }, []);

  const isEnabled = useCallback(
    (feature: FeatureFlag): boolean => {
      return features[feature] ?? false;
    },
    [features],
  );

  const areAllEnabled = useCallback(
    (featureList: FeatureFlag[]): boolean => {
      return featureList.every((f) => features[f] ?? false);
    },
    [features],
  );

  const isAnyEnabled = useCallback(
    (featureList: FeatureFlag[]): boolean => {
      return featureList.some((f) => features[f] ?? false);
    },
    [features],
  );

  const getEnabledInCategory = useCallback(
    (category: FeatureCategory): FeatureFlag[] => {
      const categoryFeatures = getFeaturesByCategory(category);
      return categoryFeatures.filter((f) => features[f] ?? false);
    },
    [features],
  );

  return {
    features,
    loading,
    isEnabled,
    areAllEnabled,
    isAnyEnabled,
    getEnabledInCategory,
  };
}

// ============================================================================
// CONDITIONAL HOOKS
// ============================================================================

/**
 * Hook to check if ALL specified features are enabled
 *
 * @param features - Array of feature flags to check
 * @returns boolean indicating if all features are enabled
 *
 * @example
 * ```tsx
 * function AdvancedSearch() {
 *   const canUseAdvancedSearch = useAllFeaturesEnabled([
 *     FEATURES.SEARCH_GLOBAL,
 *     FEATURES.SEARCH_FILTERS,
 *     FEATURES.SEARCH_HIGHLIGHTING
 *   ])
 *
 *   if (!canUseAdvancedSearch) return <BasicSearch />
 *   return <AdvancedSearchUI />
 * }
 * ```
 */
export function useAllFeaturesEnabled(features: FeatureFlag[]): boolean {
  return useMemo(() => areAllFeaturesEnabled(features), [features]);
}

/**
 * Hook to check if ANY of the specified features are enabled
 *
 * @param features - Array of feature flags to check
 * @returns boolean indicating if any feature is enabled
 *
 * @example
 * ```tsx
 * function AttachButton() {
 *   const canAttach = useAnyFeatureEnabled([
 *     FEATURES.FILES_IMAGES,
 *     FEATURES.FILES_DOCUMENTS,
 *     FEATURES.FILES_VIDEO
 *   ])
 *
 *   if (!canAttach) return null
 *   return <button>Attach</button>
 * }
 * ```
 */
export function useAnyFeatureEnabled(features: FeatureFlag[]): boolean {
  return useMemo(() => isAnyFeatureEnabled(features), [features]);
}

// ============================================================================
// CATEGORY HOOKS
// ============================================================================

/**
 * Hook to get all enabled features in a category
 *
 * @param category - The feature category to check
 * @returns Array of enabled features in the category
 *
 * @example
 * ```tsx
 * function MessageToolbar() {
 *   const enabledFeatures = useFeaturesInCategory('messages')
 *
 *   return (
 *     <div>
 *       {enabledFeatures.map(feature => (
 *         <FeatureButton key={feature} feature={feature} />
 *       ))}
 *     </div>
 *   )
 * }
 * ```
 */
export function useFeaturesInCategory(
  category: FeatureCategory,
): FeatureFlag[] {
  return useMemo(() => {
    const categoryFeatures = getFeaturesByCategory(category);
    return categoryFeatures.filter(isFeatureEnabled);
  }, [category]);
}

/**
 * Hook to check if a category has any enabled features
 *
 * @param category - The feature category to check
 * @returns boolean indicating if category has enabled features
 */
export function useCategoryHasFeatures(category: FeatureCategory): boolean {
  const features = useFeaturesInCategory(category);
  return features.length > 0;
}

// ============================================================================
// FEATURE STATE MANAGEMENT HOOKS
// ============================================================================

/**
 * Hook to manage feature state with updates
 * This is useful for admin panels where features can be toggled
 *
 * @returns Object with feature state and management functions
 *
 * @example
 * ```tsx
 * function FeatureAdmin() {
 *   const { features, toggleFeature, refreshFeatures } = useFeatureManager()
 *
 *   return (
 *     <div>
 *       {Object.entries(features).map(([flag, enabled]) => (
 *         <label key={flag}>
 *           <input
 *             type="checkbox"
 *             checked={enabled}
 *             onChange={() => toggleFeature(flag)}
 *           />
 *           {flag}
 *         </label>
 *       ))}
 *       <button onClick={refreshFeatures}>Refresh</button>
 *     </div>
 *   )
 * }
 * ```
 */
export function useFeatureManager() {
  const [features, setFeatures] = useState<FeatureEnabledMap>(() =>
    getFeatureEnabledMap(),
  );
  const [loading, setLoading] = useState(false);

  const refreshFeatures = useCallback(() => {
    clearFeatureCache();
    setFeatures(getFeatureEnabledMap());
  }, []);

  const toggleFeature = useCallback((feature: FeatureFlag) => {
    setFeatures((prev) => ({
      ...prev,
      [feature]: !prev[feature],
    }));
  }, []);

  const setFeatureEnabled = useCallback(
    (feature: FeatureFlag, enabled: boolean) => {
      setFeatures((prev) => ({
        ...prev,
        [feature]: enabled,
      }));
    },
    [],
  );

  const enableFeatures = useCallback((featuresToEnable: FeatureFlag[]) => {
    setFeatures((prev) => {
      const updated = { ...prev };
      for (const f of featuresToEnable) {
        updated[f] = true;
      }
      return updated;
    });
  }, []);

  const disableFeatures = useCallback((featuresToDisable: FeatureFlag[]) => {
    setFeatures((prev) => {
      const updated = { ...prev };
      for (const f of featuresToDisable) {
        updated[f] = false;
      }
      return updated;
    });
  }, []);

  return {
    features,
    loading,
    refreshFeatures,
    toggleFeature,
    setFeatureEnabled,
    enableFeatures,
    disableFeatures,
  };
}

// ============================================================================
// COMPUTED HOOKS
// ============================================================================

/**
 * Hook to get the count of enabled features
 *
 * @param category - Optional category to filter by
 * @returns Number of enabled features
 */
export function useEnabledFeatureCount(category?: FeatureCategory): number {
  const { features } = useFeatures();

  return useMemo(() => {
    if (category) {
      const categoryFeatures = getFeaturesByCategory(category);
      return categoryFeatures.filter((f) => features[f]).length;
    }
    return Object.values(features).filter(Boolean).length;
  }, [features, category]);
}

/**
 * Hook to check if features are in a specific state pattern
 *
 * @param requiredEnabled - Features that must be enabled
 * @param requiredDisabled - Features that must be disabled
 * @returns boolean indicating if pattern matches
 *
 * @example
 * ```tsx
 * function Component() {
 *   // True only if DMs are enabled but read receipts are disabled
 *   const isPrivateMode = useFeaturePattern(
 *     [FEATURES.CHANNELS_DIRECT],
 *     [FEATURES.REALTIME_READ_RECEIPTS]
 *   )
 * }
 * ```
 */
export function useFeaturePattern(
  requiredEnabled: FeatureFlag[],
  requiredDisabled: FeatureFlag[],
): boolean {
  const { features } = useFeatures();

  return useMemo(() => {
    const allRequiredEnabled = requiredEnabled.every((f) => features[f]);
    const allRequiredDisabled = requiredDisabled.every((f) => !features[f]);
    return allRequiredEnabled && allRequiredDisabled;
  }, [features, requiredEnabled, requiredDisabled]);
}
