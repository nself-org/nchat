/**
 * Network Module
 *
 * Provides comprehensive network management for anti-censorship resilience
 * including pluggable transports, domain fronting, proxy management,
 * and censorship detection.
 *
 * @module lib/network
 */

// ============================================================================
// Pluggable Transport
// ============================================================================

export {
  // Types
  TransportState,
  TransportPriority,
  type TransportType,
  type TransportConfig,
  type TransportEndpoint,
  type TransportOptions,
  type ObfuscationOptions,
  type ProxyOptions,
  type RetryConfig,
  type HealthCheckConfig,
  type TransportMetrics,
  type TransportEventType,
  type TransportEvent,
  type ITransport,
  type TransportHealth,
  type TransportNegotiationResult,
  // Classes
  BaseTransport,
  WebSocketTransport,
  HTTPPollingTransport,
  TransportManager,
  // Factory Functions
  createWebSocketConfig,
  createHTTPPollingConfig,
  createTransportManager,
  // Constants
  DEFAULT_TRANSPORT_OPTIONS,
  DEFAULT_RETRY_CONFIG,
  DEFAULT_HEALTH_CHECK_CONFIG,
  PLUGGABLE_TRANSPORT_CONSTANTS,
} from "./pluggable-transport";

// ============================================================================
// Domain Fronting
// ============================================================================

export {
  // Types
  type CDNProvider,
  type FrontingStrategy,
  type CDNEndpoint,
  type DomainFrontingConfig,
  type ReflectorConfig,
  type FrontingObfuscation,
  type FrontingHealthCheck,
  type FrontingFallback,
  type FrontedRequest,
  type FrontedResponse,
  type EndpointTestResult,
  type DomainFrontingMetrics,
  // Classes
  DomainFrontingClient,
  // Factory Functions
  createCDNEndpoint,
  createCloudflareEndpoint,
  createCloudFrontEndpoint,
  createReflectorConfig,
  createDomainFrontingClient,
  // Validation
  validateDomainFrontingConfig,
  validateEndpoint,
  // Constants
  DEFAULT_DOMAIN_FRONTING_CONFIG,
  KNOWN_CDN_DOMAINS,
  DISGUISE_USER_AGENTS,
  DOMAIN_FRONTING_CONSTANTS,
} from "./domain-fronting";

// ============================================================================
// Proxy Manager
// ============================================================================

export {
  // Types
  type ProxyProtocol,
  type BridgeProtocol,
  type ProxyAuthType,
  ProxyStatus,
  type ProxyConfig,
  type ProxyAuth,
  type ProxyOptions as ProxyManagerProxyOptions,
  type ProxyHealth,
  type BridgeConfig,
  type ProxyChain,
  type ChainStrategy,
  type ProxyManagerConfig,
  type ProxySelectionMode,
  type ProxyTestResult,
  type ProxyManagerEventType,
  type ProxyManagerEvent,
  type ProxyManagerMetrics,
  // Classes
  ProxyManager,
  // Factory Functions
  createProxyConfig,
  createSocks5Proxy,
  createHttpProxy,
  createShadowsocksProxy,
  createObfs4Bridge,
  createMeekBridge,
  createSnowflakeBridge,
  createProxyChain,
  parseProxyUrl,
  // Constants
  DEFAULT_PROXY_OPTIONS,
  DEFAULT_PROXY_MANAGER_CONFIG,
  IP_CHECK_SERVICES,
  COMMON_SOCKS5_PORTS,
  COMMON_HTTP_PROXY_PORTS,
  PROXY_MANAGER_CONSTANTS,
} from "./proxy-manager";

// ============================================================================
// Censorship Detector
// ============================================================================

export {
  // Types
  type CensorshipType,
  type ConfidenceLevel,
  NetworkStatus,
  type ProbeResult,
  type ProbeType,
  type CensorshipIndicator,
  type DetectionResult,
  type CircumventionRecommendation,
  type CircumventionMethod,
  type GeoContext,
  type CensorshipDetectorConfig,
  type CustomProbe,
  type DetectorEventType,
  type DetectorEvent,
  // Classes
  CensorshipDetector,
  // Factory Functions
  createCensorshipDetector,
  createQuickDetector,
  createComprehensiveDetector,
  // Constants
  DEFAULT_DETECTOR_CONFIG,
  BLOCK_PAGE_SIGNATURES,
  CENSORSHIP_DNS_RESPONSES,
  TIMEOUT_PATTERNS,
  SNI_FILTER_PATTERNS,
  CENSORSHIP_DETECTOR_CONSTANTS,
} from "./censorship-detector";

// ============================================================================
// Unified Network Client
// ============================================================================

import {
  TransportManager,
  createWebSocketConfig,
  createHTTPPollingConfig,
  type TransportConfig,
} from "./pluggable-transport";
import {
  DomainFrontingClient,
  type DomainFrontingConfig,
  type CDNEndpoint,
} from "./domain-fronting";
import {
  ProxyManager,
  type ProxyManagerConfig,
  type ProxyConfig,
} from "./proxy-manager";
import {
  CensorshipDetector,
  type CensorshipDetectorConfig,
  type DetectionResult,
  NetworkStatus,
} from "./censorship-detector";

/**
 * Unified network configuration
 */
export interface UnifiedNetworkConfig {
  /** Primary endpoint URL */
  primaryEndpoint: string;
  /** Fallback endpoint URL */
  fallbackEndpoint?: string;
  /** Transport configurations */
  transports?: Partial<TransportConfig>[];
  /** Domain fronting configuration */
  domainFronting?: Partial<DomainFrontingConfig>;
  /** Proxy manager configuration */
  proxyManager?: Partial<ProxyManagerConfig>;
  /** Censorship detector configuration */
  censorshipDetector?: Partial<CensorshipDetectorConfig>;
  /** Enable automatic circumvention */
  autoCircumvent: boolean;
  /** Enable automatic detection */
  autoDetect: boolean;
}

/**
 * Default unified network configuration
 */
export const DEFAULT_UNIFIED_NETWORK_CONFIG: UnifiedNetworkConfig = {
  primaryEndpoint: "",
  autoCircumvent: true,
  autoDetect: true,
};

/**
 * Unified Network Client
 *
 * Provides a single entry point for managing network connections
 * with automatic censorship detection and circumvention.
 */
export class UnifiedNetworkClient {
  private _config: UnifiedNetworkConfig;
  private _transportManager: TransportManager;
  private _domainFrontingClient?: DomainFrontingClient;
  private _proxyManager?: ProxyManager;
  private _censorshipDetector?: CensorshipDetector;
  private _lastDetectionResult?: DetectionResult;

  constructor(config: Partial<UnifiedNetworkConfig>) {
    this._config = {
      ...DEFAULT_UNIFIED_NETWORK_CONFIG,
      ...config,
    };

    // Initialize transport manager
    this._transportManager = new TransportManager();
    this.setupTransports();

    // Initialize censorship detector if enabled
    if (this._config.autoDetect) {
      this._censorshipDetector = new CensorshipDetector({
        primaryEndpoint: this._config.primaryEndpoint,
        ...this._config.censorshipDetector,
      });
    }

    // Initialize proxy manager if configured
    if (this._config.proxyManager?.enabled) {
      this._proxyManager = new ProxyManager(this._config.proxyManager);
    }

    // Initialize domain fronting if configured
    if (this._config.domainFronting?.enabled) {
      this._domainFrontingClient = new DomainFrontingClient(
        this._config.domainFronting,
      );
    }
  }

  /**
   * Setup transport configurations
   */
  private setupTransports(): void {
    // Add WebSocket transport
    this._transportManager.registerTransport(
      createWebSocketConfig(this._config.primaryEndpoint),
    );

    // Add HTTP polling fallback
    if (this._config.fallbackEndpoint) {
      this._transportManager.registerTransport(
        createHTTPPollingConfig(this._config.fallbackEndpoint),
      );
    }

    // Add custom transports
    if (this._config.transports) {
      for (const transport of this._config.transports) {
        if (transport.type && transport.endpoint?.url) {
          this._transportManager.registerTransport(
            transport as TransportConfig,
          );
        }
      }
    }
  }

  /**
   * Connect to the network
   */
  async connect(): Promise<void> {
    // Run censorship detection first if enabled
    if (this._config.autoDetect && this._censorshipDetector) {
      this._lastDetectionResult = await this._censorshipDetector.detect();

      // If censored, attempt circumvention
      if (this._lastDetectionResult.censored && this._config.autoCircumvent) {
        await this.applyCircumvention(this._lastDetectionResult);
      }
    }

    // Negotiate and connect
    await this._transportManager.negotiate();
  }

  /**
   * Apply circumvention based on detection results
   */
  private async applyCircumvention(result: DetectionResult): Promise<void> {
    for (const recommendation of result.recommendations) {
      switch (recommendation.method) {
        case "domain-fronting":
          if (this._domainFrontingClient) {
            // Domain fronting is already configured
            return;
          }
          break;
        case "socks-proxy":
        case "http-proxy":
          if (this._proxyManager) {
            const proxy = this._proxyManager.selectProxy();
            if (proxy) {
              // Proxy is available
              return;
            }
          }
          break;
        // Other circumvention methods would be handled here
      }
    }
  }

  /**
   * Send data through the network
   */
  async send(data: ArrayBuffer | string): Promise<void> {
    const transport = this._transportManager.getActiveTransport();
    if (!transport) {
      throw new Error("No active transport");
    }
    await transport.send(data);
  }

  /**
   * Disconnect from the network
   */
  async disconnect(): Promise<void> {
    await this._transportManager.disconnectAll();
  }

  /**
   * Get network status
   */
  getNetworkStatus(): NetworkStatus {
    return (
      this._censorshipDetector?.getNetworkStatus() ?? NetworkStatus.UNKNOWN
    );
  }

  /**
   * Get last detection result
   */
  getLastDetectionResult(): DetectionResult | undefined {
    return this._lastDetectionResult;
  }

  /**
   * Run manual detection
   */
  async runDetection(): Promise<DetectionResult | undefined> {
    if (this._censorshipDetector) {
      this._lastDetectionResult = await this._censorshipDetector.detect();
      return this._lastDetectionResult;
    }
    return undefined;
  }

  /**
   * Add a proxy
   */
  addProxy(proxy: ProxyConfig): void {
    if (!this._proxyManager) {
      this._proxyManager = new ProxyManager();
    }
    this._proxyManager.addProxy(proxy);
  }

  /**
   * Add a CDN endpoint
   */
  addCDNEndpoint(endpoint: CDNEndpoint): void {
    if (!this._domainFrontingClient) {
      this._domainFrontingClient = new DomainFrontingClient({ enabled: true });
    }
    this._domainFrontingClient.addEndpoint(endpoint);
  }

  /**
   * Get transport manager
   */
  getTransportManager(): TransportManager {
    return this._transportManager;
  }

  /**
   * Get proxy manager
   */
  getProxyManager(): ProxyManager | undefined {
    return this._proxyManager;
  }

  /**
   * Get domain fronting client
   */
  getDomainFrontingClient(): DomainFrontingClient | undefined {
    return this._domainFrontingClient;
  }

  /**
   * Get censorship detector
   */
  getCensorshipDetector(): CensorshipDetector | undefined {
    return this._censorshipDetector;
  }

  /**
   * Dispose of the client
   */
  dispose(): void {
    this._transportManager.disconnectAll();
    this._domainFrontingClient?.dispose();
    this._proxyManager?.dispose();
    this._censorshipDetector?.dispose();
  }
}

/**
 * Create a unified network client
 */
export function createUnifiedNetworkClient(
  primaryEndpoint: string,
  options?: Partial<UnifiedNetworkConfig>,
): UnifiedNetworkClient {
  return new UnifiedNetworkClient({
    primaryEndpoint,
    ...options,
  });
}
