"use client";

/**
 * FeatureGateAny and FeatureGateAll Components
 *
 * Components for conditional rendering based on multiple feature flags.
 *
 * - FeatureGateAny: Renders if ANY of the specified features are enabled
 * - FeatureGateAll: Renders if ALL of the specified features are enabled
 *
 * @example
 * ```tsx
 * import { FeatureGateAny, FeatureGateAll, FEATURES } from '@/lib/features'
 *
 * // Show attach button if any file feature is enabled
 * <FeatureGateAny features={[FEATURES.FILES_IMAGES, FEATURES.FILES_DOCUMENTS]}>
 *   <AttachButton />
 * </FeatureGateAny>
 *
 * // Show advanced search only if all search features are enabled
 * <FeatureGateAll features={[FEATURES.SEARCH_GLOBAL, FEATURES.SEARCH_FILTERS]}>
 *   <AdvancedSearch />
 * </FeatureGateAll>
 * ```
 */

import { useEffect, useMemo } from "react";
import type { ReactNode } from "react";
import type { FeatureFlag } from "../types";
import { useFeatures } from "../hooks/use-feature";

// ============================================================================
// FEATURE GATE ANY
// ============================================================================

export interface FeatureGateAnyProps {
  /**
   * Array of feature flags to check (renders if ANY are enabled)
   */
  features: FeatureFlag[];

  /**
   * Content to render when any feature is enabled
   */
  children: ReactNode;

  /**
   * Content to render when all features are disabled
   * @default null
   */
  fallback?: ReactNode;

  /**
   * Callback fired after the feature check completes
   * Receives array of enabled features from the provided list
   */
  onCheck?: (enabledFeatures: FeatureFlag[]) => void;

  /**
   * If true, requires at least this many features to be enabled
   * @default 1
   */
  minRequired?: number;
}

/**
 * Conditionally renders children if ANY of the specified features are enabled.
 *
 * This is useful when you want to show UI if at least one of several
 * related features is available.
 *
 * @example Basic usage - show if any file type is supported
 * ```tsx
 * <FeatureGateAny features={[
 *   FEATURES.FILES_IMAGES,
 *   FEATURES.FILES_DOCUMENTS,
 *   FEATURES.FILES_VIDEO
 * ]}>
 *   <AttachButton />
 * </FeatureGateAny>
 * ```
 *
 * @example With fallback
 * ```tsx
 * <FeatureGateAny
 *   features={[FEATURES.NOTIFICATIONS_DESKTOP, FEATURES.NOTIFICATIONS_MOBILE]}
 *   fallback={<p>No notification methods available</p>}
 * >
 *   <NotificationSettings />
 * </FeatureGateAny>
 * ```
 *
 * @example Require minimum features
 * ```tsx
 * <FeatureGateAny
 *   features={[FEATURES.SEARCH_MESSAGES, FEATURES.SEARCH_FILES, FEATURES.SEARCH_USERS]}
 *   minRequired={2}
 * >
 *   <GlobalSearchBar />
 * </FeatureGateAny>
 * ```
 */
export function FeatureGateAny({
  features,
  children,
  fallback = null,
  onCheck,
  minRequired = 1,
}: FeatureGateAnyProps): ReactNode {
  const { isEnabled, loading } = useFeatures();

  const enabledFeatures = useMemo(
    () => features.filter((f) => isEnabled(f)),
    [features, isEnabled],
  );

  const shouldRender = enabledFeatures.length >= minRequired;

  useEffect(() => {
    if (!loading && onCheck) {
      onCheck(enabledFeatures);
    }
  }, [enabledFeatures, loading, onCheck]);

  return shouldRender ? children : fallback;
}

// ============================================================================
// FEATURE GATE ALL
// ============================================================================

export interface FeatureGateAllProps {
  /**
   * Array of feature flags to check (renders only if ALL are enabled)
   */
  features: FeatureFlag[];

  /**
   * Content to render when all features are enabled
   */
  children: ReactNode;

  /**
   * Content to render when any feature is disabled
   * @default null
   */
  fallback?: ReactNode;

  /**
   * Callback fired after the feature check completes
   * Receives boolean indicating if all enabled, and array of missing features
   */
  onCheck?: (allEnabled: boolean, missingFeatures: FeatureFlag[]) => void;
}

/**
 * Conditionally renders children only if ALL specified features are enabled.
 *
 * This is useful when a UI component requires multiple features to work
 * together properly.
 *
 * @example Basic usage - require all search features for advanced search
 * ```tsx
 * <FeatureGateAll features={[
 *   FEATURES.SEARCH_GLOBAL,
 *   FEATURES.SEARCH_FILTERS,
 *   FEATURES.SEARCH_HIGHLIGHTING
 * ]}>
 *   <AdvancedSearchPanel />
 * </FeatureGateAll>
 * ```
 *
 * @example With fallback showing missing features
 * ```tsx
 * <FeatureGateAll
 *   features={[FEATURES.VIDEO_CALLS, FEATURES.SCREEN_SHARE]}
 *   fallback={<p>Video conferencing requires all features enabled</p>}
 *   onCheck={(allEnabled, missing) => {
 *     if (!allEnabled) // console.log('Missing:', missing)
 *   }}
 * >
 *   <VideoConference />
 * </FeatureGateAll>
 * ```
 */
export function FeatureGateAll({
  features,
  children,
  fallback = null,
  onCheck,
}: FeatureGateAllProps): ReactNode {
  const { isEnabled, loading } = useFeatures();

  const { allEnabled, missingFeatures } = useMemo(() => {
    const missing = features.filter((f) => !isEnabled(f));
    return {
      allEnabled: missing.length === 0,
      missingFeatures: missing,
    };
  }, [features, isEnabled]);

  useEffect(() => {
    if (!loading && onCheck) {
      onCheck(allEnabled, missingFeatures);
    }
  }, [allEnabled, missingFeatures, loading, onCheck]);

  return allEnabled ? children : fallback;
}

// ============================================================================
// FEATURE GATE NONE
// ============================================================================

export interface FeatureGateNoneProps {
  /**
   * Array of feature flags to check (renders if NONE are enabled)
   */
  features: FeatureFlag[];

  /**
   * Content to render when no features are enabled
   */
  children: ReactNode;

  /**
   * Content to render when any feature is enabled
   * @default null
   */
  fallback?: ReactNode;

  /**
   * Callback fired after the feature check completes
   */
  onCheck?: (noneEnabled: boolean) => void;
}

/**
 * Conditionally renders children only if NONE of the specified features are enabled.
 *
 * Useful for showing fallback UI or upgrade prompts when a set of features
 * are all disabled.
 *
 * @example Show basic mode when no advanced features are enabled
 * ```tsx
 * <FeatureGateNone features={[
 *   FEATURES.CUSTOM_EMOJI,
 *   FEATURES.GIF_PICKER,
 *   FEATURES.STICKERS
 * ]}>
 *   <BasicEmojiPicker />
 * </FeatureGateNone>
 * ```
 */
export function FeatureGateNone({
  features,
  children,
  fallback = null,
  onCheck,
}: FeatureGateNoneProps): ReactNode {
  const { isEnabled, loading } = useFeatures();

  const noneEnabled = useMemo(
    () => !features.some((f) => isEnabled(f)),
    [features, isEnabled],
  );

  useEffect(() => {
    if (!loading && onCheck) {
      onCheck(noneEnabled);
    }
  }, [noneEnabled, loading, onCheck]);

  return noneEnabled ? children : fallback;
}

// ============================================================================
// FEATURE SWITCH
// ============================================================================

export interface FeatureSwitchProps {
  /**
   * Feature flag to check
   */
  feature: FeatureFlag;

  /**
   * Content to render when feature is enabled
   */
  enabled: ReactNode;

  /**
   * Content to render when feature is disabled
   */
  disabled: ReactNode;
}

/**
 * Switch component that renders different content based on feature state.
 *
 * A more explicit alternative to FeatureGate when both enabled and disabled
 * states need specific content.
 *
 * @example
 * ```tsx
 * <FeatureSwitch
 *   feature={FEATURES.MESSAGES_THREADS}
 *   enabled={<ThreadButton onClick={startThread} />}
 *   disabled={<ReplyButton onClick={reply} />}
 * />
 * ```
 */
export function FeatureSwitch({
  feature,
  enabled,
  disabled,
}: FeatureSwitchProps): ReactNode {
  const { isEnabled } = useFeatures();
  return isEnabled(feature) ? enabled : disabled;
}

// ============================================================================
// FEATURE CASES
// ============================================================================

export interface FeatureCasesProps {
  /**
   * Array of feature/content pairs to check in order
   * First enabled feature's content will be rendered
   */
  cases: Array<{
    feature: FeatureFlag;
    render: ReactNode;
  }>;

  /**
   * Content to render if no features are enabled
   * @default null
   */
  default?: ReactNode;
}

/**
 * Renders the first matching enabled feature's content.
 *
 * Similar to a switch statement - checks features in order and renders
 * the content for the first one that's enabled.
 *
 * @example
 * ```tsx
 * <FeatureCases
 *   cases={[
 *     { feature: FEATURES.CUSTOM_EMOJI, render: <CustomEmojiPicker /> },
 *     { feature: FEATURES.GIF_PICKER, render: <GifPicker /> },
 *     { feature: FEATURES.STICKERS, render: <StickerPicker /> },
 *   ]}
 *   default={<BasicEmojiPicker />}
 * />
 * ```
 */
export function FeatureCases({
  cases,
  default: defaultContent = null,
}: FeatureCasesProps): ReactNode {
  const { isEnabled } = useFeatures();

  for (const { feature, render } of cases) {
    if (isEnabled(feature)) {
      return render;
    }
  }

  return defaultContent;
}

// ============================================================================
// HIGHER-ORDER COMPONENTS
// ============================================================================

/**
 * HOC that renders component if ANY features are enabled
 */
export function withFeatureGateAny<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  features: FeatureFlag[],
  FallbackComponent?: React.ComponentType<P>,
): React.FC<P> {
  const displayName =
    WrappedComponent.displayName || WrappedComponent.name || "Component";

  const FeatureGatedComponent: React.FC<P> = (props) => {
    const { isAnyEnabled } = useFeatures();

    if (!isAnyEnabled(features)) {
      return FallbackComponent ? <FallbackComponent {...props} /> : null;
    }

    return <WrappedComponent {...props} />;
  };

  FeatureGatedComponent.displayName = `FeatureGatedAny(${displayName})`;

  return FeatureGatedComponent;
}

/**
 * HOC that renders component only if ALL features are enabled
 */
export function withFeatureGateAll<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  features: FeatureFlag[],
  FallbackComponent?: React.ComponentType<P>,
): React.FC<P> {
  const displayName =
    WrappedComponent.displayName || WrappedComponent.name || "Component";

  const FeatureGatedComponent: React.FC<P> = (props) => {
    const { areAllEnabled } = useFeatures();

    if (!areAllEnabled(features)) {
      return FallbackComponent ? <FallbackComponent {...props} /> : null;
    }

    return <WrappedComponent {...props} />;
  };

  FeatureGatedComponent.displayName = `FeatureGatedAll(${displayName})`;

  return FeatureGatedComponent;
}

// ============================================================================
// RENDER PROP COMPONENTS
// ============================================================================

export interface FeatureGateAnyRenderProps {
  features: FeatureFlag[];
  children: (state: {
    anyEnabled: boolean;
    enabledFeatures: FeatureFlag[];
    disabledFeatures: FeatureFlag[];
  }) => ReactNode;
}

/**
 * Render prop version of FeatureGateAny
 */
export function FeatureGateAnyRender({
  features,
  children,
}: FeatureGateAnyRenderProps): ReactNode {
  const { isEnabled } = useFeatures();

  const state = useMemo(() => {
    const enabledFeatures = features.filter((f) => isEnabled(f));
    const disabledFeatures = features.filter((f) => !isEnabled(f));
    return {
      anyEnabled: enabledFeatures.length > 0,
      enabledFeatures,
      disabledFeatures,
    };
  }, [features, isEnabled]);

  return children(state);
}

export interface FeatureGateAllRenderProps {
  features: FeatureFlag[];
  children: (state: {
    allEnabled: boolean;
    enabledFeatures: FeatureFlag[];
    missingFeatures: FeatureFlag[];
  }) => ReactNode;
}

/**
 * Render prop version of FeatureGateAll
 */
export function FeatureGateAllRender({
  features,
  children,
}: FeatureGateAllRenderProps): ReactNode {
  const { isEnabled } = useFeatures();

  const state = useMemo(() => {
    const enabledFeatures = features.filter((f) => isEnabled(f));
    const missingFeatures = features.filter((f) => !isEnabled(f));
    return {
      allEnabled: missingFeatures.length === 0,
      enabledFeatures,
      missingFeatures,
    };
  }, [features, isEnabled]);

  return children(state);
}

// ============================================================================
// DEFAULT EXPORTS
// ============================================================================

export default FeatureGateAny;
