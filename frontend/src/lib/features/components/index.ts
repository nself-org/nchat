/**
 * Feature Flags React Components
 *
 * This module exports all React components for the feature flags system.
 */

// Single feature gate
export {
  FeatureGate,
  FeatureGateDisabled,
  FeatureGateDebug,
  FeatureGateRender,
  withFeatureGate,
  type FeatureGateProps,
  type FeatureGateDisabledProps,
  type FeatureGateDebugProps,
  type FeatureGateRenderProps,
} from "./feature-gate";

// Multiple feature gates
export {
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
  type FeatureGateAnyProps,
  type FeatureGateAllProps,
  type FeatureGateNoneProps,
  type FeatureSwitchProps,
  type FeatureCasesProps,
  type FeatureGateAnyRenderProps,
  type FeatureGateAllRenderProps,
} from "./feature-gate-any";
