/**
 * Plugin Gap Closure System
 *
 * Barrel export for the gap analysis, registry, and adapter modules.
 * This system identifies and tracks backend capability gaps,
 * provides a registry for gap management, and offers adapter patterns
 * for wrapping services as proper plugins.
 */

// Types
export type {
  GapSeverity,
  GapStatus,
  PluginCapability,
  PluginDomain,
  PluginGap,
  GapResolution,
  GapAnalysisResult,
  GapRecommendation,
  ServiceDescriptor,
  PluginDescriptor,
  PluginAdapterConfig,
  AdapterOperation,
  AdapterOperationParam,
  AdapterOperationResult,
  PluginHealthStatus,
} from "./types";

export {
  ALL_PLUGIN_DOMAINS,
  GAP_SEVERITY_WEIGHTS,
  DEFAULT_ADAPTER_CONFIG,
  isValidDomain,
  isValidSeverity,
  isValidStatus,
  compareGapsBySeverity,
} from "./types";

// Gap Analyzer
export {
  PluginGapAnalyzer,
  KNOWN_SERVICE_DESCRIPTORS,
  KNOWN_CAPABILITIES,
  resetGapIdCounter,
} from "./gap-analyzer";

// Gap Registry
export { GapRegistry, GapRegistryError } from "./gap-registry";
export type {
  GapRegistryEventType,
  GapRegistryEvent,
  GapRegistryEventListener,
  GapQueryFilter,
  GapRegistryStats,
} from "./gap-registry";

// Plugin Adapter
export {
  PluginAdapter,
  PluginAdapterError,
  PluginAdapterRegistry,
  createDomainAdapter,
  createAdapterWithOperations,
} from "./plugin-adapter";
export type {
  AdapterHandler,
  AdapterContext,
  AdapterMetrics,
} from "./plugin-adapter";
