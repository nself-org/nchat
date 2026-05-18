"use client";

/**
 * FeatureGate Component
 *
 * A component for conditional rendering based on feature flags.
 * Only renders children when the specified feature/category is enabled.
 *
 * @example
 * ```tsx
 * import { FeatureGate } from '@/components/features/feature-gate'
 *
 * function ChatActions() {
 *   return (
 *     <div>
 *       <FeatureGate category="messaging" feature="reactions">
 *         <ReactionPicker />
 *       </FeatureGate>
 *
 *       <FeatureGate
 *         category="voice"
 *         fallback={<UpgradePrompt />}
 *       >
 *         <VoiceControls />
 *       </FeatureGate>
 *     </div>
 *   )
 * }
 * ```
 */

import { type ReactNode } from "react";
import { useFeature } from "@/hooks/use-feature";
import type { FeatureCategory, FeatureFlags } from "@/config/feature-flags";

/**
 * Props for the FeatureGate component
 */
export interface FeatureGateProps<C extends FeatureCategory> {
  /**
   * Content to render when the feature is enabled
   */
  children: ReactNode;

  /**
   * The feature category to check
   */
  category: C;

  /**
   * Optional specific feature within the category.
   * If not provided, checks if the category itself is enabled.
   */
  feature?: keyof FeatureFlags[C];

  /**
   * Content to render when the feature is disabled
   * @default null
   */
  fallback?: ReactNode;
}

/**
 * Conditionally renders children based on whether a feature is enabled.
 *
 * This component checks if a feature flag is enabled and renders either
 * the children or an optional fallback.
 *
 * @example Basic usage - check a specific feature
 * ```tsx
 * <FeatureGate category="messaging" feature="threads">
 *   <ThreadPanel />
 * </FeatureGate>
 * ```
 *
 * @example Check entire category
 * ```tsx
 * <FeatureGate category="voice">
 *   <VoiceChannels />
 * </FeatureGate>
 * ```
 *
 * @example With fallback
 * ```tsx
 * <FeatureGate
 *   category="video"
 *   feature="calls"
 *   fallback={<p>Video calls are not available</p>}
 * >
 *   <VideoCallButton />
 * </FeatureGate>
 * ```
 *
 * @example Upgrade prompt pattern
 * ```tsx
 * <FeatureGate
 *   category="payments"
 *   fallback={<UpgradeToProButton />}
 * >
 *   <PremiumFeatures />
 * </FeatureGate>
 * ```
 */
export function FeatureGate<C extends FeatureCategory>({
  children,
  category,
  feature,
  fallback = null,
}: FeatureGateProps<C>): ReactNode {
  const { isEnabled } = useFeature();

  if (!isEnabled(category, feature)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}

/**
 * Props for FeatureGateInverted component
 */
export interface FeatureGateInvertedProps<C extends FeatureCategory> {
  /**
   * Content to render when the feature is DISABLED
   */
  children: ReactNode;

  /**
   * The feature category to check
   */
  category: C;

  /**
   * Optional specific feature within the category
   */
  feature?: keyof FeatureFlags[C];

  /**
   * Content to render when the feature is ENABLED
   * @default null
   */
  fallback?: ReactNode;
}

/**
 * Inverted FeatureGate - renders children when feature is DISABLED.
 *
 * Useful for showing upgrade prompts, alternative UI, or deprecation notices.
 *
 * @example
 * ```tsx
 * <FeatureGateInverted category="payments">
 *   <UpgradePrompt feature="payments" />
 * </FeatureGateInverted>
 * ```
 */
export function FeatureGateInverted<C extends FeatureCategory>({
  children,
  category,
  feature,
  fallback = null,
}: FeatureGateInvertedProps<C>): ReactNode {
  const { isEnabled } = useFeature();

  if (isEnabled(category, feature)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}

/**
 * Props for FeatureGateAny component
 */
export interface FeatureGateAnyProps {
  /**
   * Content to render when ANY of the features are enabled
   */
  children: ReactNode;

  /**
   * Array of [category, feature?] tuples to check
   */
  features: Array<[FeatureCategory, string | undefined]>;

  /**
   * Content to render when ALL features are disabled
   * @default null
   */
  fallback?: ReactNode;
}

/**
 * Renders children if ANY of the specified features are enabled.
 *
 * @example
 * ```tsx
 * <FeatureGateAny
 *   features={[
 *     ['media', 'fileUploads'],
 *     ['media', 'imageUploads'],
 *     ['media', 'videoUploads'],
 *   ]}
 * >
 *   <AttachButton />
 * </FeatureGateAny>
 * ```
 */
export function FeatureGateAny({
  children,
  features,
  fallback = null,
}: FeatureGateAnyProps): ReactNode {
  const { isEnabled } = useFeature();

  const anyEnabled = features.some(([category, feature]) =>
    isEnabled(category, feature as keyof FeatureFlags[typeof category]),
  );

  if (!anyEnabled) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}

/**
 * Props for FeatureGateAll component
 */
export interface FeatureGateAllProps {
  /**
   * Content to render when ALL features are enabled
   */
  children: ReactNode;

  /**
   * Array of [category, feature?] tuples to check
   */
  features: Array<[FeatureCategory, string | undefined]>;

  /**
   * Content to render when ANY feature is disabled
   * @default null
   */
  fallback?: ReactNode;
}

/**
 * Renders children only if ALL of the specified features are enabled.
 *
 * @example
 * ```tsx
 * <FeatureGateAll
 *   features={[
 *     ['video', 'enabled'],
 *     ['video', 'calls'],
 *     ['video', 'screenShare'],
 *   ]}
 * >
 *   <ScreenShareButton />
 * </FeatureGateAll>
 * ```
 */
export function FeatureGateAll({
  children,
  features,
  fallback = null,
}: FeatureGateAllProps): ReactNode {
  const { isEnabled } = useFeature();

  const allEnabled = features.every(([category, feature]) =>
    isEnabled(category, feature as keyof FeatureFlags[typeof category]),
  );

  if (!allEnabled) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}

/**
 * Higher-order component for feature-gating components.
 *
 * @example
 * ```tsx
 * const ProtectedThreadButton = withFeatureGate(
 *   ThreadButton,
 *   'messaging',
 *   'threads'
 * )
 *
 * // Or with fallback
 * const ProtectedVideoCall = withFeatureGate(
 *   VideoCallButton,
 *   'video',
 *   'calls',
 *   UpgradePrompt
 * )
 * ```
 */
export function withFeatureGate<P extends object, C extends FeatureCategory>(
  WrappedComponent: React.ComponentType<P>,
  category: C,
  feature?: keyof FeatureFlags[C],
  FallbackComponent?: React.ComponentType<P>,
): React.FC<P> {
  const displayName =
    WrappedComponent.displayName || WrappedComponent.name || "Component";

  const FeatureGatedComponent: React.FC<P> = (props) => {
    const { isEnabled } = useFeature();

    if (!isEnabled(category, feature)) {
      return FallbackComponent ? <FallbackComponent {...props} /> : null;
    }

    return <WrappedComponent {...props} />;
  };

  FeatureGatedComponent.displayName = `FeatureGated(${displayName})`;

  return FeatureGatedComponent;
}

export default FeatureGate;
