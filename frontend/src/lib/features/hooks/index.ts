/**
 * Feature Flags React Hooks
 *
 * This module exports all React hooks for the feature flags system.
 */

export {
  // Single feature hooks
  useFeature,
  useFeatureEnabled,
  // Multiple features hooks
  useFeatures,
  useAllFeaturesEnabled,
  useAnyFeatureEnabled,
  // Category hooks
  useFeaturesInCategory,
  useCategoryHasFeatures,
  // Management hooks
  useFeatureManager,
  // Computed hooks
  useEnabledFeatureCount,
  useFeaturePattern,
} from "./use-feature";
