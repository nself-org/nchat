/**
 * Feature Flags and Configuration System
 *
 * This module provides a comprehensive feature flag system for the nself-chat application,
 * allowing granular control over every feature for white-label customization.
 *
 * @packageDocumentation
 *
 * ## Quick Start
 *
 * ```tsx
 * import { FEATURES, useFeature, FeatureGate, LIMITS } from '@/lib/features'
 *
 * // Check feature in a hook
 * function MyComponent() {
 *   const { enabled } = useFeature(FEATURES.MESSAGES_THREADS)
 *   if (!enabled) return null
 *   return <ThreadUI />
 * }
 *
 * // Check feature with a gate component
 * function ChatActions() {
 *   return (
 *     <FeatureGate feature={FEATURES.MESSAGES_REACTIONS}>
 *       <ReactionPicker />
 *     </FeatureGate>
 *   )
 * }
 *
 * // Check limits
 * if (message.length > LIMITS.MAX_MESSAGE_LENGTH) {
 *   showError('Message too long')
 * }
 * ```
 *
 * ## Category-Based Feature Flags (White-Label)
 *
 * For white-label configuration, use the category-based system:
 *
 * ```tsx
 * import { FEATURE_FLAGS } from '@/config/feature-flags'
 * import { featureService } from '@/lib/features/feature-service'
 * import { useFeature } from '@/hooks/use-feature'
 * import { FeatureGate } from '@/components/features/feature-gate'
 *
 * // Check via service
 * if (featureService.isEnabled('messaging', 'threads')) {
 *   // Show threads
 * }
 *
 * // Check via hook
 * function Component() {
 *   const { isEnabled, flags } = useFeature()
 *   if (isEnabled('voice', 'calls')) {
 *     // Show voice calls
 *   }
 * }
 *
 * // Check via component
 * <FeatureGate category="video" feature="screenShare">
 *   <ScreenShareButton />
 * </FeatureGate>
 * ```
 *
 * ## Environment Variables
 *
 * Features can be controlled via environment variables:
 * - `NEXT_PUBLIC_FEATURE_MESSAGES_EDIT=true` - Enable/disable message editing
 * - `NEXT_PUBLIC_FEATURE_CHANNELS_PRIVATE=false` - Disable private channels
 *
 * Limits can also be customized:
 * - `NEXT_PUBLIC_MAX_MESSAGE_LENGTH=4000` - Maximum message length
 * - `NEXT_PUBLIC_MAX_FILE_SIZE=104857600` - Maximum file size (100MB)
 *
 * ## Feature Categories
 *
 * - **messages** - Messaging features (edit, delete, reactions, threads, etc.)
 * - **channels** - Channel features (public, private, DMs, categories, etc.)
 * - **files** - File features (upload, images, documents, preview, etc.)
 * - **users** - User features (presence, status, profiles, roles, etc.)
 * - **realtime** - Real-time features (typing, read receipts, presence, etc.)
 * - **search** - Search features (messages, files, users, filters, etc.)
 * - **notifications** - Notification features (desktop, sound, email, etc.)
 * - **advanced** - Advanced features (emoji, GIFs, polls, bots, etc.)
 * - **admin** - Admin features (dashboard, user management, analytics, etc.)
 * - **moderation** - Moderation features (tools, reporting, bans, etc.)
 */

// ============================================================================
// FEATURE FLAGS
// ============================================================================

export {
  FEATURES,
  ALL_FEATURES,
  ALL_FEATURE_KEYS,
  FEATURE_CATEGORIES,
  getFeatureCategory,
  getFeaturesByCategory,
  type FeatureKey,
  type FeatureFlag,
  type FeatureCategory,
} from './feature-flags'

// ============================================================================
// TYPES
// ============================================================================

export type {
  FeatureState,
  FeatureSource,
  FeatureStateMap,
  FeatureEnabledMap,
  FeatureEnvConfig,
  FeatureConfig,
  FeatureConfigMap,
  FeatureDependency,
  FeatureDependencyMap,
  DependencyValidationResult,
  LimitConfig,
  LimitsConfig,
  UseFeatureResult,
  UseFeaturesResult,
  FeatureGateProps,
  FeatureGateAnyProps,
  FeatureGateAllProps,
  FeatureToggleEvent,
  FeatureErrorEvent,
  PartialFeatureState,
  FeaturePreset,
  FeatureAuditEntry,
} from './types'

export { isFeatureFlag, isFeatureKey } from './types'

// ============================================================================
// FEATURE CONFIGURATION
// ============================================================================

export {
  // Default states
  DEFAULT_FEATURE_STATES,
  // Environment mapping
  featureFlagToEnvVar,
  envVarToFeatureFlag,
  // State management
  getFeatureState,
  getAllFeatureStates,
  getEnabledFeatures,
  getDisabledFeatures,
  // Feature checking
  isFeatureEnabled,
  areAllFeaturesEnabled,
  isAnyFeatureEnabled,
  getFeatureEnabledMap,
  // Runtime overrides
  setFeatureOverride,
  clearFeatureOverride,
  clearAllFeatureOverrides,
  getFeatureOverrides,
  clearFeatureCache,
  // Presets
  PRESET_MINIMAL,
  PRESET_STANDARD,
  PRESET_FULL,
  applyFeaturePreset,
  // Metadata
  FEATURE_CONFIGS,
  getFeatureConfig,
} from './feature-config'

// ============================================================================
// LIMITS
// ============================================================================

export {
  LIMITS,
  LIMIT_METADATA,
  getLimit,
  getLimitMetadata,
  validateLimitValue,
  formatLimitValue,
  getLimitsByCategory,
  getLimitCategories,
  type LimitKey,
  type LimitValue,
} from './limits'

// ============================================================================
// DEPENDENCIES
// ============================================================================

export {
  // Dependency definitions
  FEATURE_DEPENDENCIES,
  FEATURE_CONFLICTS,
  // Dependency getters
  getFeatureDependency,
  getRequiredFeatures,
  getEnhancingFeatures,
  getAutoEnabledFeatures,
  getDependentFeatures,
  getAllRequiredFeatures,
  getConflictingFeatures,
  // Validation
  validateFeatureDependencies,
  validateAllFeatures,
  hasUnmetDependencies,
  getAllUnmetDependencies,
  // Auto-enable/disable
  getFeaturesToEnable,
  autoEnableDependencies,
  getFeaturesToDisable,
  cascadeDisable,
  // Utilities
  canSafelyDisable,
  getDependencyGraph,
  sortByDependencyOrder,
} from './dependencies'

// ============================================================================
// HOOKS
// ============================================================================

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
} from './hooks/use-feature'

// ============================================================================
// COMPONENTS
// ============================================================================

export {
  // Single feature gate
  FeatureGate,
  FeatureGateDisabled,
  FeatureGateDebug,
  FeatureGateRender,
  withFeatureGate,
  type FeatureGateProps as FeatureGateComponentProps,
  type FeatureGateDisabledProps,
  type FeatureGateDebugProps,
  type FeatureGateRenderProps,
} from './components/feature-gate'

export {
  // Multiple feature gates
  FeatureGateAny,
  FeatureGateAll,
  FeatureGateNone,
  FeatureSwitch,
  FeatureCases,
  // HOCs
  withFeatureGateAny,
  withFeatureGateAll,
  // Render props
  FeatureGateAnyRender,
  FeatureGateAllRender,
  type FeatureGateAnyProps as FeatureGateAnyComponentProps,
  type FeatureGateAllProps as FeatureGateAllComponentProps,
  type FeatureGateNoneProps,
  type FeatureSwitchProps,
  type FeatureCasesProps,
  type FeatureGateAnyRenderProps,
  type FeatureGateAllRenderProps,
} from './components/feature-gate-any'

// ============================================================================
// nCHAT BUNDLE DETECTION
// ============================================================================

export {
  NCHAT_BUNDLE_PLUGINS,
  nchatBundle,
  isPluginInstalled,
  installedPlugins,
  isFullBundleInstalled,
  missingPlugins,
  type NChatPlugin,
} from './bundle-detect'

// ============================================================================
// CONVENIENCE RE-EXPORTS
// ============================================================================

/**
 * Check if a feature is enabled (convenience export)
 * @alias isFeatureEnabled
 */
export { isFeatureEnabled as checkFeature } from './feature-config'

// ============================================================================
// CATEGORY-BASED FEATURE SERVICE (White-Label)
// ============================================================================

export { featureService, FeatureService } from './feature-service'

// Re-export from config for convenience
export {
  FEATURE_FLAGS,
  DEFAULT_FEATURE_FLAGS,
  getFeatureCategories,
  getFeaturesInCategory,
  categoryHasEnabledSwitch,
  type FeatureFlags as WhiteLabelFeatureFlags,
  type FeatureCategory as WhiteLabelFeatureCategory,
  type FeaturesInCategory,
  type FeaturePath,
} from '@/config/feature-flags'

/**
 * Default export with commonly used items
 */
export default {
  FEATURES: {} as typeof import('./feature-flags').FEATURES,
  LIMITS: {} as typeof import('./limits').LIMITS,
  isFeatureEnabled: {} as typeof import('./feature-config').isFeatureEnabled,
  useFeature: {} as typeof import('./hooks/use-feature').useFeature,
  FeatureGate: {} as typeof import('./components/feature-gate').FeatureGate,
}
