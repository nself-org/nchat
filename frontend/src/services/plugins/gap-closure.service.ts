/**
 * Gap Closure Service
 *
 * Service that manages the lifecycle of plugin gaps from identification
 * through resolution. Orchestrates the gap analyzer, registry, and
 * adapter system to provide a unified API for gap management.
 */

import {
  PluginGapAnalyzer,
  KNOWN_SERVICE_DESCRIPTORS,
  KNOWN_CAPABILITIES,
} from "@/lib/plugins/gaps/gap-analyzer";
import { GapRegistry } from "@/lib/plugins/gaps/gap-registry";
import {
  PluginAdapterRegistry,
  PluginAdapter,
  createDomainAdapter,
} from "@/lib/plugins/gaps/plugin-adapter";
import type {
  PluginGap,
  GapResolution,
  GapAnalysisResult,
  PluginDescriptor,
  PluginDomain,
  GapStatus,
  GapSeverity,
  ServiceDescriptor,
  PluginHealthStatus,
} from "@/lib/plugins/gaps/types";
import type {
  GapQueryFilter,
  GapRegistryStats,
} from "@/lib/plugins/gaps/gap-registry";
import type { AdapterMetrics } from "@/lib/plugins/gaps/plugin-adapter";

// ============================================================================
// SERVICE CONFIGURATION
// ============================================================================

export interface GapClosureServiceConfig {
  /** Auto-run analysis on initialization */
  autoAnalyze: boolean;
  /** Auto-register adapters for covered domains */
  autoRegisterAdapters: boolean;
  /** Enable health monitoring */
  healthMonitoring: boolean;
  /** Health check interval in ms */
  healthCheckIntervalMs: number;
}

const DEFAULT_CONFIG: GapClosureServiceConfig = {
  autoAnalyze: true,
  autoRegisterAdapters: false,
  healthMonitoring: false,
  healthCheckIntervalMs: 60000,
};

// ============================================================================
// GAP CLOSURE SERVICE
// ============================================================================

export class GapClosureService {
  private analyzer: PluginGapAnalyzer;
  private registry: GapRegistry;
  private adapterRegistry: PluginAdapterRegistry;
  private config: GapClosureServiceConfig;
  private healthCheckInterval: ReturnType<typeof setInterval> | null = null;
  private lastAnalysis: GapAnalysisResult | null = null;
  private initialized = false;
  private registeredPlugins: PluginDescriptor[] = [];

  constructor(config?: Partial<GapClosureServiceConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.analyzer = new PluginGapAnalyzer(
      KNOWN_SERVICE_DESCRIPTORS,
      [],
      KNOWN_CAPABILITIES,
    );
    this.registry = new GapRegistry();
    this.adapterRegistry = new PluginAdapterRegistry();
  }

  // ==========================================================================
  // INITIALIZATION
  // ==========================================================================

  /**
   * Initialize the service.
   */
  initialize(): void {
    if (this.initialized) return;

    if (this.config.autoAnalyze) {
      this.runAnalysis();
    }

    if (this.config.healthMonitoring) {
      this.startHealthMonitoring();
    }

    this.initialized = true;
  }

  /**
   * Check if the service is initialized.
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  // ==========================================================================
  // GAP ANALYSIS
  // ==========================================================================

  /**
   * Run a full gap analysis and update the registry.
   */
  runAnalysis(): GapAnalysisResult {
    // Merge adapter-based descriptors with explicitly registered plugins
    const adapterDescriptors = this.adapterRegistry.toPluginDescriptors();
    const allPluginDescriptors = [
      ...adapterDescriptors,
      ...this.registeredPlugins,
    ];
    this.analyzer = new PluginGapAnalyzer(
      KNOWN_SERVICE_DESCRIPTORS,
      allPluginDescriptors,
      KNOWN_CAPABILITIES,
    );

    const result = this.analyzer.analyze();
    this.lastAnalysis = result;

    // Import gaps into registry (skip duplicates)
    this.registry.importFromAnalysis(result.gaps);

    return result;
  }

  /**
   * Get the last analysis result (without re-running).
   */
  getLastAnalysis(): GapAnalysisResult | null {
    return this.lastAnalysis;
  }

  /**
   * Analyze a specific domain.
   */
  analyzeDomain(domain: PluginDomain): PluginGap[] {
    return this.analyzer.analyzeDomain(domain);
  }

  // ==========================================================================
  // GAP MANAGEMENT
  // ==========================================================================

  /**
   * Get a gap by ID.
   */
  getGap(gapId: string): PluginGap | undefined {
    return this.registry.getGap(gapId);
  }

  /**
   * Query gaps with filters.
   */
  queryGaps(filter?: GapQueryFilter): PluginGap[] {
    return this.registry.queryGaps(filter);
  }

  /**
   * Get all uncovered gaps.
   */
  getUncoveredGaps(): PluginGap[] {
    return this.registry.getUncoveredGaps();
  }

  /**
   * Get critical gaps that need immediate attention.
   */
  getCriticalGaps(): PluginGap[] {
    return this.registry.getCriticalGaps();
  }

  /**
   * Get gaps by domain.
   */
  getGapsByDomain(domain: PluginDomain): PluginGap[] {
    return this.registry.getGapsByDomain(domain);
  }

  /**
   * Get registry statistics.
   */
  getStats(): GapRegistryStats {
    return this.registry.getStats();
  }

  /**
   * Mark a gap as having a workaround.
   */
  markWorkaround(gapId: string, description: string): PluginGap {
    return this.registry.markWorkaround(gapId, description);
  }

  /**
   * Deprecate a gap.
   */
  deprecateGap(gapId: string): PluginGap {
    return this.registry.deprecateGap(gapId);
  }

  // ==========================================================================
  // GAP RESOLUTION
  // ==========================================================================

  /**
   * Register a resolution for a gap.
   */
  resolveGap(
    gapId: string,
    pluginId: string,
    coveredCapabilities: string[],
    resolvedBy: string,
    description?: string,
  ): GapResolution {
    const gap = this.registry.getGap(gapId);
    if (!gap) {
      throw new Error(`Gap not found: ${gapId}`);
    }

    const resolution: GapResolution = {
      gapId,
      pluginId,
      resolutionType: "plugin",
      description: description || `Resolved by plugin ${pluginId}`,
      coveredCapabilities,
      resolvedAt: new Date().toISOString(),
      resolvedBy,
    };

    return this.registry.registerResolution(resolution);
  }

  /**
   * Resolve a gap using an adapter.
   */
  resolveGapWithAdapter(
    gapId: string,
    adapter: PluginAdapter,
    resolvedBy: string,
  ): GapResolution {
    const gap = this.registry.getGap(gapId);
    if (!gap) {
      throw new Error(`Gap not found: ${gapId}`);
    }

    // Register the adapter
    this.adapterRegistry.register(adapter);

    // Register the adapter as a plugin in the analyzer
    this.analyzer.registerPlugin(adapter.toPluginDescriptor());

    const resolution: GapResolution = {
      gapId,
      pluginId: adapter.getId(),
      resolutionType: "adapter",
      description: `Resolved via adapter: ${adapter.getName()}`,
      coveredCapabilities: adapter.getCapabilities(),
      resolvedAt: new Date().toISOString(),
      resolvedBy,
    };

    return this.registry.registerResolution(resolution);
  }

  /**
   * Revoke a resolution.
   */
  revokeResolution(gapId: string, pluginId: string): boolean {
    return this.registry.revokeResolution(gapId, pluginId);
  }

  /**
   * Get resolutions for a gap.
   */
  getResolutions(gapId: string): GapResolution[] {
    return this.registry.getResolutions(gapId);
  }

  // ==========================================================================
  // ADAPTER MANAGEMENT
  // ==========================================================================

  /**
   * Register a plugin adapter.
   */
  registerAdapter(adapter: PluginAdapter): void {
    this.adapterRegistry.register(adapter);
    this.analyzer.registerPlugin(adapter.toPluginDescriptor());
  }

  /**
   * Unregister a plugin adapter.
   */
  unregisterAdapter(adapterId: string): boolean {
    this.analyzer.unregisterPlugin(adapterId);
    return this.adapterRegistry.unregister(adapterId);
  }

  /**
   * Get an adapter by ID.
   */
  getAdapter(adapterId: string): PluginAdapter | undefined {
    return this.adapterRegistry.get(adapterId);
  }

  /**
   * Get all adapters.
   */
  getAdapters(): PluginAdapter[] {
    return this.adapterRegistry.getAll();
  }

  /**
   * Get adapters by domain.
   */
  getAdaptersByDomain(domain: PluginDomain): PluginAdapter[] {
    return this.adapterRegistry.getByDomain(domain);
  }

  /**
   * Get adapter metrics.
   */
  getAdapterMetrics(): Record<string, AdapterMetrics> {
    return this.adapterRegistry.getAllMetrics();
  }

  /**
   * Create and register a domain adapter.
   */
  createDomainAdapter(
    domain: PluginDomain,
    serviceId: string,
    capabilities: string[],
    name?: string,
  ): PluginAdapter {
    const adapter = createDomainAdapter(domain, serviceId, capabilities, name);
    this.registerAdapter(adapter);
    return adapter;
  }

  // ==========================================================================
  // PLUGIN REGISTRATION
  // ==========================================================================

  /**
   * Register a plugin descriptor (from external plugins).
   */
  registerPlugin(plugin: PluginDescriptor): void {
    const existing = this.registeredPlugins.findIndex(
      (p) => p.id === plugin.id,
    );
    if (existing >= 0) {
      this.registeredPlugins[existing] = plugin;
    } else {
      this.registeredPlugins.push(plugin);
    }
    this.analyzer.registerPlugin(plugin);
  }

  /**
   * Unregister a plugin.
   */
  unregisterPlugin(pluginId: string): boolean {
    const index = this.registeredPlugins.findIndex((p) => p.id === pluginId);
    if (index >= 0) {
      this.registeredPlugins.splice(index, 1);
    }
    return this.analyzer.unregisterPlugin(pluginId);
  }

  /**
   * Get all registered plugins.
   */
  getPlugins(): PluginDescriptor[] {
    return this.analyzer.getPlugins();
  }

  // ==========================================================================
  // COVERAGE
  // ==========================================================================

  /**
   * Get coverage statistics.
   */
  getCoverageStats(): {
    total: number;
    covered: number;
    uncovered: number;
    percent: number;
  } {
    return this.analyzer.getCoverageStats();
  }

  /**
   * Get uncovered capabilities.
   */
  getUncoveredCapabilities(): string[] {
    return this.analyzer.getUncoveredCapabilities();
  }

  /**
   * Get services that directly access the backend.
   */
  getDirectAccessServices(): ServiceDescriptor[] {
    return this.analyzer.getDirectAccessServices();
  }

  // ==========================================================================
  // HEALTH MONITORING
  // ==========================================================================

  /**
   * Check health of all adapters.
   */
  async checkHealth(): Promise<PluginHealthStatus[]> {
    return this.adapterRegistry.checkAllHealth();
  }

  /**
   * Start health monitoring.
   */
  startHealthMonitoring(): void {
    if (this.healthCheckInterval) return;

    this.healthCheckInterval = setInterval(async () => {
      await this.checkHealth();
    }, this.config.healthCheckIntervalMs);
  }

  /**
   * Stop health monitoring.
   */
  stopHealthMonitoring(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }
  }

  // ==========================================================================
  // SERIALIZATION
  // ==========================================================================

  /**
   * Export the current state as a JSON-serializable object.
   */
  exportState(): {
    gaps: PluginGap[];
    stats: GapRegistryStats;
    plugins: PluginDescriptor[];
    coverage: {
      total: number;
      covered: number;
      uncovered: number;
      percent: number;
    };
  } {
    return {
      gaps: this.registry.getAllGaps(),
      stats: this.registry.getStats(),
      plugins: this.analyzer.getPlugins(),
      coverage: this.analyzer.getCoverageStats(),
    };
  }

  // ==========================================================================
  // CLEANUP
  // ==========================================================================

  /**
   * Destroy the service and clean up resources.
   */
  destroy(): void {
    this.stopHealthMonitoring();
    this.registry.clear();
    this.adapterRegistry.clear();
    this.registeredPlugins = [];
    this.lastAnalysis = null;
    this.initialized = false;
  }
}

/**
 * Create a new GapClosureService instance.
 */
export function createGapClosureService(
  config?: Partial<GapClosureServiceConfig>,
): GapClosureService {
  return new GapClosureService(config);
}
