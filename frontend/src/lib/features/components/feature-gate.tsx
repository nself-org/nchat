"use client";

/**
 * FeatureGate Component
 *
 * A component for conditional rendering based on a single feature flag.
 * Only renders children when the specified feature is enabled.
 *
 * @example
 * ```tsx
 * import { FeatureGate, FEATURES } from '@/lib/features'
 *
 * function MessageActions() {
 *   return (
 *     <div>
 *       <FeatureGate feature={FEATURES.MESSAGES_EDIT}>
 *         <EditButton />
 *       </FeatureGate>
 *
 *       <FeatureGate
 *         feature={FEATURES.MESSAGES_THREADS}
 *         fallback={<span>Threads disabled</span>}
 *       >
 *         <ThreadButton />
 *       </FeatureGate>
 *     </div>
 *   )
 * }
 * ```
 */

import { useEffect } from "react";
import type { ReactNode } from "react";
import type { FeatureFlag } from "../types";
import { useFeature } from "../hooks/use-feature";

// ============================================================================
// TYPES
// ============================================================================

export interface FeatureGateProps {
  /**
   * The feature flag to check
   */
  feature: FeatureFlag;

  /**
   * Content to render when the feature is enabled
   */
  children: ReactNode;

  /**
   * Content to render when the feature is disabled
   * @default null
   */
  fallback?: ReactNode;

  /**
   * Callback fired after the feature check completes
   */
  onCheck?: (enabled: boolean) => void;

  /**
   * If true, renders nothing while loading (SSR safety)
   * @default false
   */
  suspenseOnLoad?: boolean;

  /**
   * Content to render while loading
   * Only used if suspenseOnLoad is true
   */
  loadingFallback?: ReactNode;
}

// ============================================================================
// COMPONENT
// ============================================================================

/**
 * Conditionally renders children based on whether a feature is enabled.
 *
 * This component checks if a single feature flag is enabled and renders
 * either the children or an optional fallback.
 *
 * @example Basic usage
 * ```tsx
 * <FeatureGate feature={FEATURES.MESSAGES_REACTIONS}>
 *   <ReactionPicker />
 * </FeatureGate>
 * ```
 *
 * @example With fallback
 * ```tsx
 * <FeatureGate
 *   feature={FEATURES.MESSAGES_THREADS}
 *   fallback={<p>Threads are not available</p>}
 * >
 *   <ThreadPanel />
 * </FeatureGate>
 * ```
 *
 * @example With callback
 * ```tsx
 * <FeatureGate
 *   feature={FEATURES.VIDEO_CALLS}
 *   onCheck={(enabled) => analytics.track('video_calls_check', { enabled })}
 * >
 *   <VideoCallButton />
 * </FeatureGate>
 * ```
 */
export function FeatureGate({
  feature,
  children,
  fallback = null,
  onCheck,
  suspenseOnLoad = false,
  loadingFallback = null,
}: FeatureGateProps): ReactNode {
  const { enabled, loading } = useFeature(feature);

  // Fire callback when check completes
  useEffect(() => {
    if (!loading && onCheck) {
      onCheck(enabled);
    }
  }, [enabled, loading, onCheck]);

  // Handle loading state if requested
  if (suspenseOnLoad && loading) {
    return loadingFallback;
  }

  // Render based on feature state
  return enabled ? children : fallback;
}

// ============================================================================
// INVERTED COMPONENT
// ============================================================================

export interface FeatureGateDisabledProps {
  /**
   * The feature flag to check
   */
  feature: FeatureFlag;

  /**
   * Content to render when the feature is DISABLED
   */
  children: ReactNode;

  /**
   * Content to render when the feature is ENABLED
   * @default null
   */
  fallback?: ReactNode;

  /**
   * Callback fired after the feature check completes
   */
  onCheck?: (disabled: boolean) => void;
}

/**
 * Inverted FeatureGate - renders children when feature is DISABLED.
 *
 * Useful for showing upgrade prompts, alternative UI, or deprecation notices.
 *
 * @example
 * ```tsx
 * <FeatureGateDisabled feature={FEATURES.VIDEO_CALLS}>
 *   <UpgradePrompt feature="video calls" />
 * </FeatureGateDisabled>
 * ```
 */
export function FeatureGateDisabled({
  feature,
  children,
  fallback = null,
  onCheck,
}: FeatureGateDisabledProps): ReactNode {
  const { enabled, loading } = useFeature(feature);

  useEffect(() => {
    if (!loading && onCheck) {
      onCheck(!enabled);
    }
  }, [enabled, loading, onCheck]);

  return enabled ? fallback : children;
}

// ============================================================================
// DEBUG COMPONENT
// ============================================================================

export interface FeatureGateDebugProps {
  /**
   * The feature flag to display info for
   */
  feature: FeatureFlag;
}

/**
 * Debug component that displays feature flag state.
 * Only renders in development mode.
 *
 * @example
 * ```tsx
 * {process.env.NODE_ENV === 'development' && (
 *   <FeatureGateDebug feature={FEATURES.MESSAGES_THREADS} />
 * )}
 * ```
 */
export function FeatureGateDebug({
  feature,
}: FeatureGateDebugProps): ReactNode {
  const { enabled, loading, source } = useFeature(feature);

  // Only render in development
  if (process.env.NODE_ENV === "production") {
    return null;
  }

  return (
    <div
      style={{
        padding: "4px 8px",
        fontSize: "10px",
        fontFamily: "monospace",
        backgroundColor: enabled ? "#d4edda" : "#f8d7da",
        color: enabled ? "#155724" : "#721c24",
        borderRadius: "4px",
        display: "inline-block",
      }}
    >
      {loading ? (
        <span>Loading...</span>
      ) : (
        <span>
          {feature}: {enabled ? "ON" : "OFF"} ({source})
        </span>
      )}
    </div>
  );
}

// ============================================================================
// HIGHER-ORDER COMPONENT
// ============================================================================

/**
 * Higher-order component for feature-gating components.
 *
 * @example
 * ```tsx
 * const ProtectedThreadButton = withFeatureGate(
 *   ThreadButton,
 *   FEATURES.MESSAGES_THREADS
 * )
 *
 * // Or with fallback
 * const ProtectedVideoCall = withFeatureGate(
 *   VideoCallButton,
 *   FEATURES.VIDEO_CALLS,
 *   UpgradePrompt
 * )
 * ```
 */
export function withFeatureGate<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  feature: FeatureFlag,
  FallbackComponent?: React.ComponentType<P>,
): React.FC<P> {
  const displayName =
    WrappedComponent.displayName || WrappedComponent.name || "Component";

  const FeatureGatedComponent: React.FC<P> = (props) => {
    const { enabled } = useFeature(feature);

    if (!enabled) {
      return FallbackComponent ? <FallbackComponent {...props} /> : null;
    }

    return <WrappedComponent {...props} />;
  };

  FeatureGatedComponent.displayName = `FeatureGated(${displayName})`;

  return FeatureGatedComponent;
}

// ============================================================================
// RENDER PROP COMPONENT
// ============================================================================

export interface FeatureGateRenderProps {
  /**
   * The feature flag to check
   */
  feature: FeatureFlag;

  /**
   * Render function that receives feature state
   */
  children: (state: {
    enabled: boolean;
    loading: boolean;
    source: string;
  }) => ReactNode;
}

/**
 * Render prop version of FeatureGate for more control.
 *
 * @example
 * ```tsx
 * <FeatureGateRender feature={FEATURES.MESSAGES_THREADS}>
 *   {({ enabled, loading }) => (
 *     <button disabled={!enabled || loading}>
 *       {loading ? 'Loading...' : enabled ? 'Start Thread' : 'Threads Disabled'}
 *     </button>
 *   )}
 * </FeatureGateRender>
 * ```
 */
export function FeatureGateRender({
  feature,
  children,
}: FeatureGateRenderProps): ReactNode {
  const state = useFeature(feature);
  return children(state);
}

// ============================================================================
// DEFAULT EXPORT
// ============================================================================

export default FeatureGate;
