"use client";

/**
 * React Hook for Feature Flags
 *
 * This hook provides a React-friendly way to check feature flag states,
 * with automatic synchronization from AppConfig.
 *
 * @example
 * ```tsx
 * import { useFeature } from '@/hooks/use-feature'
 *
 * function MessagingFeatures() {
 *   const { isEnabled, flags } = useFeature()
 *
 *   return (
 *     <div>
 *       {isEnabled('messaging', 'threads') && <ThreadPanel />}
 *       {isEnabled('voice') && <VoiceControls />}
 *       <p>Max file size: {flags.media.maxFileSize}MB</p>
 *     </div>
 *   )
 * }
 * ```
 */

import { useMemo } from "react";
import { useAppConfig } from "@/contexts/app-config-context";
import { featureService } from "@/lib/features/feature-service";
import type { FeatureFlags, FeatureCategory } from "@/config/feature-flags";

/**
 * Return type for the useFeature hook
 */
export interface UseFeatureReturn {
  /**
   * Check if a feature or category is enabled
   *
   * @param category - The feature category to check
   * @param feature - Optional specific feature within the category
   * @returns boolean indicating if the feature/category is enabled
   */
  isEnabled: <C extends FeatureCategory>(
    category: C,
    feature?: keyof FeatureFlags[C],
  ) => boolean;

  /**
   * The complete feature flags object
   */
  flags: FeatureFlags;
}

/**
 * React hook for checking feature flags.
 *
 * This hook automatically syncs feature flags from the AppConfig context,
 * making it easy to use feature flags in React components.
 *
 * @returns Object containing isEnabled function and flags object
 *
 * @example
 * ```tsx
 * function ChatInput() {
 *   const { isEnabled } = useFeature()
 *
 *   return (
 *     <div>
 *       <textarea />
 *       {isEnabled('messaging', 'reactions') && <EmojiPicker />}
 *       {isEnabled('media', 'fileUploads') && <AttachButton />}
 *       {isEnabled('voice', 'voiceMessages') && <VoiceRecorder />}
 *     </div>
 *   )
 * }
 * ```
 */
export function useFeature(): UseFeatureReturn {
  const { config } = useAppConfig();

  // Sync feature flags from config if available
  useMemo(() => {
    if (config?.features) {
      featureService.setFlags(config.features as Partial<FeatureFlags>);
    }
  }, [config?.features]);

  return {
    isEnabled: <C extends FeatureCategory>(
      category: C,
      feature?: keyof FeatureFlags[C],
    ) => featureService.isEnabled(category, feature),
    flags: featureService.getFlags(),
  };
}

/**
 * Hook to check if a specific feature is enabled
 *
 * @param category - The feature category
 * @param feature - Optional specific feature within the category
 * @returns boolean indicating if the feature is enabled
 *
 * @example
 * ```tsx
 * function ThreadButton() {
 *   const threadsEnabled = useFeatureEnabled('messaging', 'threads')
 *
 *   if (!threadsEnabled) return null
 *   return <button>Start Thread</button>
 * }
 * ```
 */
export function useFeatureEnabled<C extends FeatureCategory>(
  category: C,
  feature?: keyof FeatureFlags[C],
): boolean {
  const { isEnabled } = useFeature();
  return isEnabled(category, feature);
}

/**
 * Hook to get flags for a specific category
 *
 * @param category - The feature category
 * @returns The flags for the specified category
 *
 * @example
 * ```tsx
 * function MediaSettings() {
 *   const mediaFlags = useCategoryFlags('media')
 *
 *   return (
 *     <div>
 *       <p>Max file size: {mediaFlags.maxFileSize}MB</p>
 *       <p>Allowed types: {mediaFlags.allowedTypes.join(', ')}</p>
 *     </div>
 *   )
 * }
 * ```
 */
export function useCategoryFlags<C extends FeatureCategory>(
  category: C,
): FeatureFlags[C] {
  const { flags } = useFeature();
  return flags[category];
}

/**
 * Hook to check if all specified features are enabled
 *
 * @param features - Array of [category, feature] tuples to check
 * @returns boolean indicating if all features are enabled
 *
 * @example
 * ```tsx
 * function VideoCallButton() {
 *   const canVideoCall = useAllFeaturesEnabled([
 *     ['video', 'enabled'],
 *     ['video', 'calls'],
 *   ])
 *
 *   if (!canVideoCall) return null
 *   return <button>Start Video Call</button>
 * }
 * ```
 */
export function useAllFeaturesEnabled(
  features: Array<[FeatureCategory, string | undefined]>,
): boolean {
  const { isEnabled } = useFeature();
  return features.every(([category, feature]) =>
    isEnabled(category, feature as keyof FeatureFlags[typeof category]),
  );
}

/**
 * Hook to check if any of the specified features are enabled
 *
 * @param features - Array of [category, feature] tuples to check
 * @returns boolean indicating if any feature is enabled
 *
 * @example
 * ```tsx
 * function MediaButton() {
 *   const canUpload = useAnyFeatureEnabled([
 *     ['media', 'fileUploads'],
 *     ['media', 'imageUploads'],
 *     ['media', 'videoUploads'],
 *   ])
 *
 *   if (!canUpload) return null
 *   return <button>Upload</button>
 * }
 * ```
 */
export function useAnyFeatureEnabled(
  features: Array<[FeatureCategory, string | undefined]>,
): boolean {
  const { isEnabled } = useFeature();
  return features.some(([category, feature]) =>
    isEnabled(category, feature as keyof FeatureFlags[typeof category]),
  );
}
