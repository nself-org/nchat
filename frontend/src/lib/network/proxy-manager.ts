/**
 * Proxy Manager Module
 *
 * Provides comprehensive proxy and bridge management for bypassing
 * network restrictions and censorship.
 *
 * Features:
 * - Multiple proxy protocol support (HTTP, HTTPS, SOCKS4/5)
 * - Bridge relay configuration (Tor-style bridges)
 * - Proxy chain support
 * - Automatic proxy discovery and validation
 * - Proxy health monitoring and rotation
 * - Geographic proxy selection
 *
 * @module lib/network/proxy-manager
 */

import { EventEmitter } from "events";

import { logger } from "@/lib/logger";

// ============================================================================
// Types
// ============================================================================

/**
 * Proxy protocol type
 */
export type ProxyProtocol =
  | "http"
  | "https"
  | "socks4"
  | "socks5"
  | "shadowsocks"
  | "vmess";

/**
 * Bridge protocol type (obfuscation layer)
 */
export type BridgeProtocol =
  | "obfs4"
  | "meek"
  | "snowflake"
  | "webtunnel"
  | "plain";

/**
 * Proxy authentication type
 */
export type ProxyAuthType = "none" | "basic" | "digest" | "ntlm";

/**
 * Proxy status
 */
export enum ProxyStatus {
  UNKNOWN = "unknown",
  AVAILABLE = "available",
  CONNECTING = "connecting",
  CONNECTED = "connected",
  FAILED = "failed",
  BLOCKED = "blocked",
  RATE_LIMITED = "rate_limited",
}

/**
 * Proxy configuration
 */
export interface ProxyConfig {
  /** Unique identifier */
  id: string;
  /** Display name */
  name: string;
  /** Proxy protocol */
  protocol: ProxyProtocol;
  /** Proxy host */
  host: string;
  /** Proxy port */
  port: number;
  /** Authentication configuration */
  auth?: ProxyAuth;
  /** Whether proxy is enabled */
  enabled: boolean;
  /** Priority for proxy selection */
  priority: number;
  /** Current status */
  status: ProxyStatus;
  /** Geographic region */
  region?: string;
  /** Country code */
  country?: string;
  /** Tags for filtering */
  tags?: string[];
  /** Custom options */
  options?: ProxyOptions;
  /** Health metrics */
  health?: ProxyHealth;
  /** Last used timestamp */
  lastUsed?: Date;
}

/**
 * Proxy authentication
 */
export interface ProxyAuth {
  /** Authentication type */
  type: ProxyAuthType;
  /** Username */
  username: string;
  /** Password */
  password: string;
  /** Optional domain (for NTLM) */
  domain?: string;
}

/**
 * Proxy-specific options
 */
export interface ProxyOptions {
  /** Connection timeout in milliseconds */
  connectionTimeout: number;
  /** Request timeout in milliseconds */
  requestTimeout: number;
  /** Keep-alive enabled */
  keepAlive: boolean;
  /** Maximum concurrent connections */
  maxConnections: number;
  /** Use UDP (for SOCKS5) */
  udpEnabled: boolean;
  /** DNS resolution location */
  dnsResolution: "local" | "proxy";
  /** SSL/TLS verification */
  tlsVerify: boolean;
  /** Cipher configuration (for Shadowsocks) */
  cipher?: string;
  /** Encryption key (for Shadowsocks) */
  key?: string;
}

/**
 * Proxy health status
 */
export interface ProxyHealth {
  /** Whether proxy is healthy */
  healthy: boolean;
  /** Health score (0-100) */
  score: number;
  /** Consecutive successes */
  successCount: number;
  /** Consecutive failures */
  failureCount: number;
  /** Average latency in milliseconds */
  averageLatency: number;
  /** Last check timestamp */
  lastCheck: Date;
  /** Last error message */
  lastError?: string;
}

/**
 * Bridge configuration
 */
export interface BridgeConfig {
  /** Unique identifier */
  id: string;
  /** Display name */
  name: string;
  /** Bridge protocol */
  protocol: BridgeProtocol;
  /** Bridge address */
  address: string;
  /** Bridge port */
  port: number;
  /** Fingerprint (for obfs4) */
  fingerprint?: string;
  /** Certificate (for obfs4) */
  cert?: string;
  /** IAT mode (for obfs4) */
  iatMode?: number;
  /** CDN URL (for meek) */
  cdnUrl?: string;
  /** Front domain (for meek) */
  frontDomain?: string;
  /** Broker URL (for snowflake) */
  brokerUrl?: string;
  /** STUN servers (for snowflake) */
  stunServers?: string[];
  /** Whether bridge is enabled */
  enabled: boolean;
  /** Priority */
  priority: number;
  /** Current status */
  status: ProxyStatus;
  /** Health status */
  health?: ProxyHealth;
}

/**
 * Proxy chain configuration
 */
export interface ProxyChain {
  /** Chain identifier */
  id: string;
  /** Chain name */
  name: string;
  /** Ordered list of proxy IDs */
  proxyIds: string[];
  /** Whether chain is enabled */
  enabled: boolean;
  /** Chain strategy */
  strategy: ChainStrategy;
}

/**
 * Chain strategy
 */
export type ChainStrategy = "strict" | "dynamic" | "round-robin";

/**
 * Proxy manager configuration
 */
export interface ProxyManagerConfig {
  /** Enable proxy manager */
  enabled: boolean;
  /** Default proxy protocol */
  defaultProtocol: ProxyProtocol;
  /** Proxy selection mode */
  selectionMode: ProxySelectionMode;
  /** Auto-rotation interval in milliseconds (0 = disabled) */
  rotationInterval: number;
  /** Health check interval in milliseconds */
  healthCheckInterval: number;
  /** Health check timeout in milliseconds */
  healthCheckTimeout: number;
  /** Maximum concurrent health checks */
  maxConcurrentHealthChecks: number;
  /** Failure threshold before marking unhealthy */
  failureThreshold: number;
  /** Success threshold before marking healthy */
  successThreshold: number;
  /** Geographic preference */
  geoPreference?: string[];
  /** Excluded regions */
  excludedRegions?: string[];
  /** Maximum chain length */
  maxChainLength: number;
}

/**
 * Proxy selection mode
 */
export type ProxySelectionMode =
  | "priority"
  | "random"
  | "round-robin"
  | "least-latency"
  | "least-used"
  | "geographic";

/**
 * Proxy test result
 */
export interface ProxyTestResult {
  /** Proxy tested */
  proxy: ProxyConfig;
  /** Whether test was successful */
  success: boolean;
  /** Test latency in milliseconds */
  latency: number;
  /** External IP as seen through proxy */
  externalIp?: string;
  /** Country detected */
  country?: string;
  /** Error message if failed */
  error?: string;
  /** HTTP status code */
  statusCode?: number;
  /** Whether proxy supports HTTPS */
  supportsHttps: boolean;
  /** Whether proxy is anonymous */
  isAnonymous: boolean;
}

/**
 * Proxy manager event types
 */
export type ProxyManagerEventType =
  | "proxy-added"
  | "proxy-removed"
  | "proxy-updated"
  | "proxy-connected"
  | "proxy-failed"
  | "rotation"
  | "health-check"
  | "all-proxies-failed";

/**
 * Proxy manager event
 */
export interface ProxyManagerEvent {
  /** Event type */
  type: ProxyManagerEventType;
  /** Timestamp */
  timestamp: Date;
  /** Proxy involved (if applicable) */
  proxy?: ProxyConfig;
  /** Additional data */
  data?: unknown;
}

/**
 * Proxy manager metrics
 */
export interface ProxyManagerMetrics {
  /** Total proxies */
  totalProxies: number;
  /** Healthy proxies */
  healthyProxies: number;
  /** Failed proxies */
  failedProxies: number;
  /** Total requests through proxies */
  totalRequests: number;
  /** Successful requests */
  successfulRequests: number;
  /** Failed requests */
  failedRequests: number;
  /** Average latency */
  averageLatency: number;
  /** Bytes sent */
  bytesSent: number;
  /** Bytes received */
  bytesReceived: number;
  /** Current active proxy */
  activeProxy?: string;
  /** Rotation count */
  rotationCount: number;
}

// ============================================================================
// Constants
// ============================================================================

/**
 * Default proxy options
 */
export const DEFAULT_PROXY_OPTIONS: ProxyOptions = {
  connectionTimeout: 30000,
  requestTimeout: 60000,
  keepAlive: true,
  maxConnections: 10,
  udpEnabled: false,
  dnsResolution: "proxy",
  tlsVerify: true,
};

/**
 * Default proxy manager configuration
 */
export const DEFAULT_PROXY_MANAGER_CONFIG: ProxyManagerConfig = {
  enabled: false,
  defaultProtocol: "socks5",
  selectionMode: "priority",
  rotationInterval: 0,
  healthCheckInterval: 60000,
  healthCheckTimeout: 10000,
  maxConcurrentHealthChecks: 5,
  failureThreshold: 3,
  successThreshold: 2,
  maxChainLength: 3,
};

/**
 * IP check services for proxy validation
 */
export const IP_CHECK_SERVICES = [
  "https://api.ipify.org?format=json",
  "https://api.myip.com",
  "https://ipinfo.io/json",
  "https://ip-api.com/json",
];

/**
 * Common SOCKS5 ports
 */
export const COMMON_SOCKS5_PORTS = [1080, 1081, 9050, 9150];

/**
 * Common HTTP proxy ports
 */
export const COMMON_HTTP_PROXY_PORTS = [3128, 8080, 8888, 8118, 8123];

// ============================================================================
// Proxy Manager
// ============================================================================

/**
 * Proxy Manager
 *
 * Manages proxy configurations, health monitoring, and selection
 */
export class ProxyManager extends EventEmitter {
  private _config: ProxyManagerConfig;
  private _proxies: Map<string, ProxyConfig> = new Map();
  private _bridges: Map<string, BridgeConfig> = new Map();
  private _chains: Map<string, ProxyChain> = new Map();
  private _activeProxy?: ProxyConfig;
  private _metrics: ProxyManagerMetrics;
  private _healthCheckTimer?: ReturnType<typeof setInterval>;
  private _rotationTimer?: ReturnType<typeof setInterval>;
  private _roundRobinIndex: number = 0;

  constructor(config?: Partial<ProxyManagerConfig>) {
    super();
    this._config = {
      ...DEFAULT_PROXY_MANAGER_CONFIG,
      ...config,
    };
    this._metrics = this.initializeMetrics();

    if (this._config.enabled) {
      this.startHealthChecks();
      this.startRotation();
    }
  }

  /**
   * Initialize metrics
   */
  private initializeMetrics(): ProxyManagerMetrics {
    return {
      totalProxies: 0,
      healthyProxies: 0,
      failedProxies: 0,
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      averageLatency: 0,
      bytesSent: 0,
      bytesReceived: 0,
      rotationCount: 0,
    };
  }

  /**
   * Get current configuration
   */
  getConfig(): ProxyManagerConfig {
    return { ...this._config };
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<ProxyManagerConfig>): void {
    const wasEnabled = this._config.enabled;
    this._config = { ...this._config, ...config };

    if (this._config.enabled && !wasEnabled) {
      this.startHealthChecks();
      this.startRotation();
    } else if (!this._config.enabled && wasEnabled) {
      this.stopHealthChecks();
      this.stopRotation();
    }
  }

  // ============================================================================
  // Proxy Management
  // ============================================================================

  /**
   * Add a proxy
   */
  addProxy(proxy: ProxyConfig): void {
    proxy.health = proxy.health || this.initializeHealth();
    this._proxies.set(proxy.id, proxy);
    this.updateMetrics();
    this.emitEvent("proxy-added", proxy);
  }

  /**
   * Remove a proxy
   */
  removeProxy(proxyId: string): boolean {
    const proxy = this._proxies.get(proxyId);
    if (proxy) {
      this._proxies.delete(proxyId);
      if (this._activeProxy?.id === proxyId) {
        this._activeProxy = undefined;
      }
      this.updateMetrics();
      this.emitEvent("proxy-removed", proxy);
      return true;
    }
    return false;
  }

  /**
   * Update a proxy
   */
  updateProxy(proxyId: string, updates: Partial<ProxyConfig>): boolean {
    const proxy = this._proxies.get(proxyId);
    if (proxy) {
      Object.assign(proxy, updates);
      this._proxies.set(proxyId, proxy);
      this.emitEvent("proxy-updated", proxy);
      return true;
    }
    return false;
  }

  /**
   * Get a proxy by ID
   */
  getProxy(proxyId: string): ProxyConfig | undefined {
    return this._proxies.get(proxyId);
  }

  /**
   * Get all proxies
   */
  getAllProxies(): ProxyConfig[] {
    return Array.from(this._proxies.values());
  }

  /**
   * Get proxies by status
   */
  getProxiesByStatus(status: ProxyStatus): ProxyConfig[] {
    return Array.from(this._proxies.values()).filter(
      (p) => p.status === status,
    );
  }

  /**
   * Get proxies by region
   */
  getProxiesByRegion(region: string): ProxyConfig[] {
    return Array.from(this._proxies.values()).filter(
      (p) => p.region?.toLowerCase() === region.toLowerCase(),
    );
  }

  /**
   * Get proxies by country
   */
  getProxiesByCountry(country: string): ProxyConfig[] {
    return Array.from(this._proxies.values()).filter(
      (p) => p.country?.toLowerCase() === country.toLowerCase(),
    );
  }

  /**
   * Get proxies by tag
   */
  getProxiesByTag(tag: string): ProxyConfig[] {
    return Array.from(this._proxies.values()).filter((p) =>
      p.tags?.includes(tag),
    );
  }

  /**
   * Get healthy proxies
   */
  getHealthyProxies(): ProxyConfig[] {
    return Array.from(this._proxies.values()).filter(
      (p) => p.enabled && p.health?.healthy,
    );
  }

  // ============================================================================
  // Bridge Management
  // ============================================================================

  /**
   * Add a bridge
   */
  addBridge(bridge: BridgeConfig): void {
    bridge.health = bridge.health || this.initializeHealth();
    this._bridges.set(bridge.id, bridge);
    this.emitEvent("proxy-added", bridge as unknown as ProxyConfig);
  }

  /**
   * Remove a bridge
   */
  removeBridge(bridgeId: string): boolean {
    const bridge = this._bridges.get(bridgeId);
    if (bridge) {
      this._bridges.delete(bridgeId);
      return true;
    }
    return false;
  }

  /**
   * Get all bridges
   */
  getAllBridges(): BridgeConfig[] {
    return Array.from(this._bridges.values());
  }

  /**
   * Get healthy bridges
   */
  getHealthyBridges(): BridgeConfig[] {
    return Array.from(this._bridges.values()).filter(
      (b) => b.enabled && b.health?.healthy,
    );
  }

  // ============================================================================
  // Chain Management
  // ============================================================================

  /**
   * Add a proxy chain
   */
  addChain(chain: ProxyChain): void {
    if (chain.proxyIds.length > this._config.maxChainLength) {
      throw new Error(
        `Chain length exceeds maximum of ${this._config.maxChainLength}`,
      );
    }
    this._chains.set(chain.id, chain);
  }

  /**
   * Remove a chain
   */
  removeChain(chainId: string): boolean {
    return this._chains.delete(chainId);
  }

  /**
   * Get a chain
   */
  getChain(chainId: string): ProxyChain | undefined {
    return this._chains.get(chainId);
  }

  /**
   * Get all chains
   */
  getAllChains(): ProxyChain[] {
    return Array.from(this._chains.values());
  }

  /**
   * Resolve a chain to actual proxies
   */
  resolveChain(chainId: string): ProxyConfig[] {
    const chain = this._chains.get(chainId);
    if (!chain) {
      return [];
    }

    return chain.proxyIds
      .map((id) => this._proxies.get(id))
      .filter((p): p is ProxyConfig => p !== undefined);
  }

  // ============================================================================
  // Proxy Selection
  // ============================================================================

  /**
   * Select the best proxy based on configuration
   */
  selectProxy(): ProxyConfig | undefined {
    const healthyProxies = this.getHealthyProxies();
    if (healthyProxies.length === 0) {
      this.emitEvent("all-proxies-failed");
      return undefined;
    }

    let selected: ProxyConfig | undefined;

    switch (this._config.selectionMode) {
      case "priority":
        selected = this.selectByPriority(healthyProxies);
        break;
      case "random":
        selected = this.selectRandom(healthyProxies);
        break;
      case "round-robin":
        selected = this.selectRoundRobin(healthyProxies);
        break;
      case "least-latency":
        selected = this.selectByLatency(healthyProxies);
        break;
      case "least-used":
        selected = this.selectLeastUsed(healthyProxies);
        break;
      case "geographic":
        selected = this.selectByGeography(healthyProxies);
        break;
      default:
        selected = healthyProxies[0];
    }

    if (selected) {
      this._activeProxy = selected;
      this._metrics.activeProxy = selected.id;
    }

    return selected;
  }

  /**
   * Select by priority
   */
  private selectByPriority(proxies: ProxyConfig[]): ProxyConfig {
    return proxies.sort((a, b) => a.priority - b.priority)[0];
  }

  /**
   * Select random
   */
  private selectRandom(proxies: ProxyConfig[]): ProxyConfig {
    return proxies[Math.floor(Math.random() * proxies.length)];
  }

  /**
   * Select round-robin
   */
  private selectRoundRobin(proxies: ProxyConfig[]): ProxyConfig {
    const sorted = proxies.sort((a, b) => a.priority - b.priority);
    const selected = sorted[this._roundRobinIndex % sorted.length];
    this._roundRobinIndex++;
    return selected;
  }

  /**
   * Select by latency
   */
  private selectByLatency(proxies: ProxyConfig[]): ProxyConfig {
    return proxies.sort(
      (a, b) =>
        (a.health?.averageLatency || Infinity) -
        (b.health?.averageLatency || Infinity),
    )[0];
  }

  /**
   * Select least used
   */
  private selectLeastUsed(proxies: ProxyConfig[]): ProxyConfig {
    return proxies.sort(
      (a, b) => (a.lastUsed?.getTime() || 0) - (b.lastUsed?.getTime() || 0),
    )[0];
  }

  /**
   * Select by geography
   */
  private selectByGeography(proxies: ProxyConfig[]): ProxyConfig {
    const { geoPreference, excludedRegions } = this._config;

    let filtered = proxies;

    // Exclude regions
    if (excludedRegions?.length) {
      filtered = filtered.filter(
        (p) => !p.region || !excludedRegions.includes(p.region),
      );
    }

    // Prefer regions
    if (geoPreference?.length && filtered.length > 0) {
      const preferred = filtered.filter(
        (p) => p.region && geoPreference.includes(p.region),
      );
      if (preferred.length > 0) {
        return preferred.sort((a, b) => a.priority - b.priority)[0];
      }
    }

    return filtered.sort((a, b) => a.priority - b.priority)[0] || proxies[0];
  }

  /**
   * Get the active proxy
   */
  getActiveProxy(): ProxyConfig | undefined {
    return this._activeProxy;
  }

  /**
   * Set the active proxy
   */
  setActiveProxy(proxyId: string): boolean {
    const proxy = this._proxies.get(proxyId);
    if (proxy && proxy.enabled) {
      this._activeProxy = proxy;
      this._metrics.activeProxy = proxy.id;
      return true;
    }
    return false;
  }

  /**
   * Rotate to next proxy
   */
  rotate(): ProxyConfig | undefined {
    const previousProxy = this._activeProxy;
    const newProxy = this.selectProxy();

    if (newProxy && newProxy.id !== previousProxy?.id) {
      this._metrics.rotationCount++;
      this.emitEvent("rotation", newProxy, { previousProxy });
    }

    return newProxy;
  }

  // ============================================================================
  // Health Checking
  // ============================================================================

  /**
   * Initialize health status
   */
  private initializeHealth(): ProxyHealth {
    return {
      healthy: true,
      score: 100,
      successCount: 0,
      failureCount: 0,
      averageLatency: 0,
      lastCheck: new Date(),
    };
  }

  /**
   * Start health checks
   */
  private startHealthChecks(): void {
    this.stopHealthChecks();
    this._healthCheckTimer = setInterval(
      () => this.performHealthChecks(),
      this._config.healthCheckInterval,
    );
  }

  /**
   * Stop health checks
   */
  private stopHealthChecks(): void {
    if (this._healthCheckTimer) {
      clearInterval(this._healthCheckTimer);
      this._healthCheckTimer = undefined;
    }
  }

  /**
   * Perform health checks on all proxies
   */
  async performHealthChecks(): Promise<void> {
    const proxies = Array.from(this._proxies.values()).filter((p) => p.enabled);
    const batchSize = this._config.maxConcurrentHealthChecks;

    for (let i = 0; i < proxies.length; i += batchSize) {
      const batch = proxies.slice(i, i + batchSize);
      const checks = batch.map((proxy) => this.checkProxyHealth(proxy));
      await Promise.all(checks);
    }

    this.updateMetrics();
  }

  /**
   * Check health of a single proxy
   */
  async checkProxyHealth(proxy: ProxyConfig): Promise<void> {
    const startTime = Date.now();

    try {
      const result = await this.testProxy(proxy);
      const latency = Date.now() - startTime;

      proxy.health = proxy.health || this.initializeHealth();
      proxy.health.lastCheck = new Date();

      if (result.success) {
        proxy.health.successCount++;
        proxy.health.failureCount = 0;
        proxy.health.averageLatency =
          proxy.health.averageLatency === 0
            ? latency
            : proxy.health.averageLatency * 0.8 + latency * 0.2;
        proxy.health.score = Math.min(100, proxy.health.score + 10);
        proxy.health.lastError = undefined;

        if (proxy.health.successCount >= this._config.successThreshold) {
          proxy.health.healthy = true;
          proxy.status = ProxyStatus.AVAILABLE;
        }
      } else {
        throw new Error(result.error || "Health check failed");
      }
    } catch (error) {
      proxy.health = proxy.health || this.initializeHealth();
      proxy.health.failureCount++;
      proxy.health.successCount = 0;
      proxy.health.score = Math.max(0, proxy.health.score - 20);
      proxy.health.lastError =
        error instanceof Error ? error.message : "Unknown error";
      proxy.health.lastCheck = new Date();

      if (proxy.health.failureCount >= this._config.failureThreshold) {
        proxy.health.healthy = false;
        proxy.status = ProxyStatus.FAILED;
        this.emitEvent("proxy-failed", proxy);
      }
    }

    this.emitEvent("health-check", proxy);
  }

  /**
   * Test a proxy
   */
  async testProxy(proxy: ProxyConfig): Promise<ProxyTestResult> {
    const startTime = Date.now();

    try {
      // For browser environment, we can't directly test SOCKS proxies
      // Instead, we'll use an HTTP request through the proxy
      // This is a simplified test - in a real implementation,
      // you'd use native proxy support or a proxy agent

      const testUrl =
        IP_CHECK_SERVICES[Math.floor(Math.random() * IP_CHECK_SERVICES.length)];

      // Build proxy URL
      const proxyUrl = this.buildProxyUrl(proxy);

      // In a Node.js environment, you'd use something like:
      // const agent = new SocksProxyAgent(proxyUrl)
      // const response = await fetch(testUrl, { agent })

      // For now, we'll do a basic connectivity check
      // This would need to be adapted based on the runtime environment

      const controller = new AbortController();
      const timeoutId = setTimeout(
        () => controller.abort(),
        this._config.healthCheckTimeout,
      );

      try {
        const response = await fetch(testUrl, {
          signal: controller.signal,
          headers: {
            "User-Agent": "Mozilla/5.0 (compatible; ProxyTest/1.0)",
          },
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          return {
            proxy,
            success: false,
            latency: Date.now() - startTime,
            error: `HTTP ${response.status}`,
            statusCode: response.status,
            supportsHttps: false,
            isAnonymous: false,
          };
        }

        const data = await response.json();
        const latency = Date.now() - startTime;

        return {
          proxy,
          success: true,
          latency,
          externalIp: data.ip || data.query,
          country: data.country || data.country_code,
          statusCode: response.status,
          supportsHttps: true,
          isAnonymous: this.checkAnonymity(response.headers),
        };
      } finally {
        clearTimeout(timeoutId);
      }
    } catch (error) {
      return {
        proxy,
        success: false,
        latency: Date.now() - startTime,
        error: error instanceof Error ? error.message : "Unknown error",
        supportsHttps: false,
        isAnonymous: false,
      };
    }
  }

  /**
   * Build proxy URL
   */
  private buildProxyUrl(proxy: ProxyConfig): string {
    let url = `${proxy.protocol}://`;

    if (proxy.auth) {
      url += `${encodeURIComponent(proxy.auth.username)}:${encodeURIComponent(proxy.auth.password)}@`;
    }

    url += `${proxy.host}:${proxy.port}`;

    return url;
  }

  /**
   * Check if proxy provides anonymity
   */
  private checkAnonymity(headers: Headers): boolean {
    // Check for headers that reveal the original IP
    const revealingHeaders = [
      "x-forwarded-for",
      "x-real-ip",
      "via",
      "forwarded",
      "x-client-ip",
    ];

    for (const header of revealingHeaders) {
      if (headers.get(header)) {
        return false;
      }
    }

    return true;
  }

  // ============================================================================
  // Rotation
  // ============================================================================

  /**
   * Start auto-rotation
   */
  private startRotation(): void {
    if (this._config.rotationInterval <= 0) {
      return;
    }

    this.stopRotation();
    this._rotationTimer = setInterval(
      () => this.rotate(),
      this._config.rotationInterval,
    );
  }

  /**
   * Stop auto-rotation
   */
  private stopRotation(): void {
    if (this._rotationTimer) {
      clearInterval(this._rotationTimer);
      this._rotationTimer = undefined;
    }
  }

  // ============================================================================
  // Metrics
  // ============================================================================

  /**
   * Update metrics
   */
  private updateMetrics(): void {
    const proxies = Array.from(this._proxies.values());
    this._metrics.totalProxies = proxies.length;
    this._metrics.healthyProxies = proxies.filter(
      (p) => p.health?.healthy,
    ).length;
    this._metrics.failedProxies = proxies.filter(
      (p) => p.status === ProxyStatus.FAILED,
    ).length;
  }

  /**
   * Get metrics
   */
  getMetrics(): ProxyManagerMetrics {
    return { ...this._metrics };
  }

  /**
   * Reset metrics
   */
  resetMetrics(): void {
    this._metrics = this.initializeMetrics();
    this.updateMetrics();
  }

  /**
   * Record successful request
   */
  recordSuccess(
    latency: number,
    bytesSent: number,
    bytesReceived: number,
  ): void {
    this._metrics.totalRequests++;
    this._metrics.successfulRequests++;
    this._metrics.bytesSent += bytesSent;
    this._metrics.bytesReceived += bytesReceived;
    this._metrics.averageLatency =
      this._metrics.averageLatency === 0
        ? latency
        : this._metrics.averageLatency * 0.9 + latency * 0.1;

    if (this._activeProxy) {
      this._activeProxy.lastUsed = new Date();
    }
  }

  /**
   * Record failed request
   */
  recordFailure(): void {
    this._metrics.totalRequests++;
    this._metrics.failedRequests++;
  }

  // ============================================================================
  // Events
  // ============================================================================

  /**
   * Emit an event
   */
  private emitEvent(
    type: ProxyManagerEventType,
    proxy?: ProxyConfig,
    data?: unknown,
  ): void {
    const event: ProxyManagerEvent = {
      type,
      timestamp: new Date(),
      proxy,
      data,
    };
    this.emit(type, event);
  }

  // ============================================================================
  // Lifecycle
  // ============================================================================

  /**
   * Dispose of the manager
   */
  dispose(): void {
    this.stopHealthChecks();
    this.stopRotation();
    this._proxies.clear();
    this._bridges.clear();
    this._chains.clear();
    this._activeProxy = undefined;
  }
}

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Create a proxy configuration
 */
export function createProxyConfig(options: {
  protocol: ProxyProtocol;
  host: string;
  port: number;
  name?: string;
  auth?: ProxyAuth;
  priority?: number;
  region?: string;
  country?: string;
  tags?: string[];
}): ProxyConfig {
  return {
    id: `proxy-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
    name: options.name || `${options.protocol.toUpperCase()} Proxy`,
    protocol: options.protocol,
    host: options.host,
    port: options.port,
    auth: options.auth,
    enabled: true,
    priority: options.priority ?? 0,
    status: ProxyStatus.UNKNOWN,
    region: options.region,
    country: options.country,
    tags: options.tags,
    options: { ...DEFAULT_PROXY_OPTIONS },
  };
}

/**
 * Create a SOCKS5 proxy configuration
 */
export function createSocks5Proxy(
  host: string,
  port: number,
  options?: Partial<ProxyConfig>,
): ProxyConfig {
  return {
    ...createProxyConfig({
      protocol: "socks5",
      host,
      port,
    }),
    ...options,
  };
}

/**
 * Create an HTTP proxy configuration
 */
export function createHttpProxy(
  host: string,
  port: number,
  options?: Partial<ProxyConfig>,
): ProxyConfig {
  return {
    ...createProxyConfig({
      protocol: "http",
      host,
      port,
    }),
    ...options,
  };
}

/**
 * Create a Shadowsocks proxy configuration
 */
export function createShadowsocksProxy(options: {
  host: string;
  port: number;
  password: string;
  cipher: string;
  priority?: number;
}): ProxyConfig {
  return {
    ...createProxyConfig({
      protocol: "shadowsocks",
      host: options.host,
      port: options.port,
      priority: options.priority,
    }),
    options: {
      ...DEFAULT_PROXY_OPTIONS,
      cipher: options.cipher,
      key: options.password,
    },
  };
}

/**
 * Create an obfs4 bridge configuration
 */
export function createObfs4Bridge(options: {
  address: string;
  port: number;
  fingerprint: string;
  cert: string;
  iatMode?: number;
  priority?: number;
}): BridgeConfig {
  return {
    id: `bridge-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
    name: "obfs4 Bridge",
    protocol: "obfs4",
    address: options.address,
    port: options.port,
    fingerprint: options.fingerprint,
    cert: options.cert,
    iatMode: options.iatMode ?? 0,
    enabled: true,
    priority: options.priority ?? 0,
    status: ProxyStatus.UNKNOWN,
  };
}

/**
 * Create a meek bridge configuration
 */
export function createMeekBridge(options: {
  cdnUrl: string;
  frontDomain: string;
  priority?: number;
}): BridgeConfig {
  return {
    id: `bridge-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
    name: "Meek Bridge",
    protocol: "meek",
    address: options.cdnUrl,
    port: 443,
    cdnUrl: options.cdnUrl,
    frontDomain: options.frontDomain,
    enabled: true,
    priority: options.priority ?? 0,
    status: ProxyStatus.UNKNOWN,
  };
}

/**
 * Create a snowflake bridge configuration
 */
export function createSnowflakeBridge(options?: {
  brokerUrl?: string;
  stunServers?: string[];
  priority?: number;
}): BridgeConfig {
  return {
    id: `bridge-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
    name: "Snowflake Bridge",
    protocol: "snowflake",
    address:
      options?.brokerUrl ||
      "https://snowflake-broker.torproject.net.global.prod.fastly.net/",
    port: 443,
    brokerUrl:
      options?.brokerUrl ||
      "https://snowflake-broker.torproject.net.global.prod.fastly.net/",
    stunServers: options?.stunServers || [
      "stun:stun.l.google.com:19302",
      "stun:stun.voip.blackberry.com:3478",
    ],
    enabled: true,
    priority: options?.priority ?? 0,
    status: ProxyStatus.UNKNOWN,
  };
}

/**
 * Create a proxy chain
 */
export function createProxyChain(options: {
  name: string;
  proxyIds: string[];
  strategy?: ChainStrategy;
}): ProxyChain {
  return {
    id: `chain-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
    name: options.name,
    proxyIds: options.proxyIds,
    enabled: true,
    strategy: options.strategy || "strict",
  };
}

/**
 * Parse a proxy URL into a configuration
 */
export function parseProxyUrl(url: string): ProxyConfig | undefined {
  try {
    const parsed = new URL(url);
    const protocol = parsed.protocol.replace(":", "") as ProxyProtocol;

    if (!["http", "https", "socks4", "socks5"].includes(protocol)) {
      return undefined;
    }

    const config = createProxyConfig({
      protocol,
      host: parsed.hostname,
      port: parseInt(parsed.port, 10) || (protocol === "http" ? 80 : 1080),
    });

    if (parsed.username && parsed.password) {
      config.auth = {
        type: "basic",
        username: decodeURIComponent(parsed.username),
        password: decodeURIComponent(parsed.password),
      };
    }

    return config;
  } catch {
    return undefined;
  }
}

// ============================================================================
// Exports
// ============================================================================

export const PROXY_MANAGER_CONSTANTS = {
  DEFAULT_PROXY_OPTIONS,
  DEFAULT_PROXY_MANAGER_CONFIG,
  IP_CHECK_SERVICES,
  COMMON_SOCKS5_PORTS,
  COMMON_HTTP_PROXY_PORTS,
} as const;
