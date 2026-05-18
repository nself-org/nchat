/**
 * Domain Fronting Module
 *
 * Provides domain fronting capabilities for bypassing network restrictions
 * by using CDN infrastructure to mask the true destination of requests.
 *
 * Features:
 * - CDN provider configurations (CloudFlare, Fastly, Amazon CloudFront)
 * - SNI/Host header manipulation
 * - Reflector endpoint management
 * - Domain fronting validation and testing
 * - Automatic CDN discovery
 *
 * Security Note: Domain fronting should only be used for legitimate
 * anti-censorship purposes and in compliance with local laws.
 *
 * @module lib/network/domain-fronting
 */

import { logger } from "@/lib/logger";

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Create an AbortSignal that times out after the specified duration.
 * Provides compatibility for environments where createTimeoutSignal is not available.
 */
function createTimeoutSignal(ms: number): AbortSignal {
  if (typeof AbortSignal !== "undefined" && "timeout" in AbortSignal) {
    return createTimeoutSignal(ms);
  }
  // Fallback for environments without createTimeoutSignal
  const controller = new AbortController();
  setTimeout(() => controller.abort(), ms);
  return controller.signal;
}

// ============================================================================
// Types
// ============================================================================

/**
 * CDN provider identifier
 */
export type CDNProvider =
  | "cloudflare"
  | "fastly"
  | "cloudfront"
  | "akamai"
  | "azure-cdn"
  | "google-cloud-cdn"
  | "custom";

/**
 * Domain fronting strategy
 */
export type FrontingStrategy =
  | "sni-host-split"
  | "host-header-only"
  | "reflector"
  | "meek"
  | "custom";

/**
 * CDN endpoint configuration
 */
export interface CDNEndpoint {
  /** Unique identifier */
  id: string;
  /** CDN provider */
  provider: CDNProvider;
  /** Front domain (the domain visible in SNI) */
  frontDomain: string;
  /** Host header value (the actual destination) */
  hostHeader: string;
  /** Path prefix for requests */
  pathPrefix: string;
  /** Whether endpoint is currently enabled */
  enabled: boolean;
  /** Priority for endpoint selection */
  priority: number;
  /** Endpoint health status */
  healthy: boolean;
  /** Last health check time */
  lastHealthCheck?: Date;
  /** Average latency in milliseconds */
  averageLatency?: number;
  /** Custom headers to include */
  customHeaders?: Record<string, string>;
  /** Geographic region (for geo-aware routing) */
  region?: string;
}

/**
 * Domain fronting configuration
 */
export interface DomainFrontingConfig {
  /** Whether domain fronting is enabled */
  enabled: boolean;
  /** Default fronting strategy */
  strategy: FrontingStrategy;
  /** List of CDN endpoints */
  endpoints: CDNEndpoint[];
  /** Reflector configuration */
  reflector?: ReflectorConfig;
  /** Request obfuscation options */
  obfuscation: FrontingObfuscation;
  /** Health check configuration */
  healthCheck: FrontingHealthCheck;
  /** Fallback behavior */
  fallback: FrontingFallback;
}

/**
 * Reflector endpoint configuration
 */
export interface ReflectorConfig {
  /** Reflector URL */
  url: string;
  /** Shared secret for reflector authentication */
  secret: string;
  /** Maximum request size in bytes */
  maxRequestSize: number;
  /** Request timeout in milliseconds */
  timeout: number;
  /** Whether to use padding */
  usePadding: boolean;
}

/**
 * Request obfuscation options
 */
export interface FrontingObfuscation {
  /** Add random URL path segments */
  randomPath: boolean;
  /** Add random query parameters */
  randomQuery: boolean;
  /** Minimum padding size in bytes */
  minPadding: number;
  /** Maximum padding size in bytes */
  maxPadding: number;
  /** Disguise content type */
  contentTypeDisguise?: "image/jpeg" | "text/html" | "application/javascript";
  /** Add timing jitter to requests */
  timingJitter: boolean;
  /** Maximum jitter in milliseconds */
  maxJitterMs: number;
}

/**
 * Health check configuration
 */
export interface FrontingHealthCheck {
  /** Enable health checks */
  enabled: boolean;
  /** Health check interval in milliseconds */
  interval: number;
  /** Health check timeout in milliseconds */
  timeout: number;
  /** Number of failures before marking endpoint unhealthy */
  failureThreshold: number;
  /** Number of successes before marking endpoint healthy */
  successThreshold: number;
}

/**
 * Fallback behavior configuration
 */
export interface FrontingFallback {
  /** Enable automatic fallback to direct connection */
  enableDirectFallback: boolean;
  /** Maximum time to wait before fallback in milliseconds */
  fallbackTimeout: number;
  /** Endpoints to try before giving up */
  maxEndpointAttempts: number;
  /** Whether to cache successful endpoints */
  cacheSuccessfulEndpoint: boolean;
}

/**
 * Fronted request configuration
 */
export interface FrontedRequest {
  /** HTTP method */
  method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
  /** Request path */
  path: string;
  /** Request body */
  body?: ArrayBuffer | string;
  /** Additional headers */
  headers?: Record<string, string>;
  /** Request timeout in milliseconds */
  timeout?: number;
}

/**
 * Fronted response
 */
export interface FrontedResponse {
  /** HTTP status code */
  status: number;
  /** Response headers */
  headers: Record<string, string>;
  /** Response body */
  body: ArrayBuffer | string;
  /** Endpoint used for the request */
  endpoint: CDNEndpoint;
  /** Request latency in milliseconds */
  latency: number;
  /** Whether this was a fallback request */
  wasFallback: boolean;
}

/**
 * Endpoint test result
 */
export interface EndpointTestResult {
  /** Endpoint tested */
  endpoint: CDNEndpoint;
  /** Whether test was successful */
  success: boolean;
  /** Test latency in milliseconds */
  latency: number;
  /** Error message if failed */
  error?: string;
  /** Response status code */
  statusCode?: number;
  /** Headers received */
  headers?: Record<string, string>;
}

/**
 * Domain fronting metrics
 */
export interface DomainFrontingMetrics {
  /** Total requests made */
  totalRequests: number;
  /** Successful requests */
  successfulRequests: number;
  /** Failed requests */
  failedRequests: number;
  /** Fallback requests */
  fallbackRequests: number;
  /** Average latency in milliseconds */
  averageLatency: number;
  /** Bytes sent through fronting */
  bytesSent: number;
  /** Bytes received through fronting */
  bytesReceived: number;
  /** Endpoint usage counts */
  endpointUsage: Map<string, number>;
  /** Last request timestamp */
  lastRequestTime?: Date;
}

// ============================================================================
// Constants
// ============================================================================

/**
 * Default domain fronting configuration
 */
export const DEFAULT_DOMAIN_FRONTING_CONFIG: DomainFrontingConfig = {
  enabled: false,
  strategy: "sni-host-split",
  endpoints: [],
  obfuscation: {
    randomPath: true,
    randomQuery: true,
    minPadding: 0,
    maxPadding: 256,
    timingJitter: true,
    maxJitterMs: 500,
  },
  healthCheck: {
    enabled: true,
    interval: 60000,
    timeout: 10000,
    failureThreshold: 3,
    successThreshold: 2,
  },
  fallback: {
    enableDirectFallback: false,
    fallbackTimeout: 30000,
    maxEndpointAttempts: 3,
    cacheSuccessfulEndpoint: true,
  },
};

/**
 * Known CDN domains that can be used for fronting
 */
export const KNOWN_CDN_DOMAINS: Record<CDNProvider, string[]> = {
  cloudflare: [
    "cdnjs.cloudflare.com",
    "ajax.cloudflare.com",
    "cdn.jsdelivr.net", // Uses Cloudflare
  ],
  fastly: ["global.fastly.net", "dualstack.github.map.fastly.net"],
  cloudfront: [
    "d111111abcdef8.cloudfront.net",
    "d1234567890abc.cloudfront.net",
  ],
  akamai: ["a248.e.akamai.net", "e673.dscb.akamaiedge.net"],
  "azure-cdn": ["azureedge.net"],
  "google-cloud-cdn": ["storage.googleapis.com"],
  custom: [],
};

/**
 * User agents for request disguise
 */
export const DISGUISE_USER_AGENTS = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:122.0) Gecko/20100101 Firefox/122.0",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15",
];

// ============================================================================
// Domain Fronting Client
// ============================================================================

/**
 * Domain Fronting Client
 *
 * Handles domain-fronted requests through CDN infrastructure
 */
export class DomainFrontingClient {
  private _config: DomainFrontingConfig;
  private _metrics: DomainFrontingMetrics;
  private _healthCheckTimer?: ReturnType<typeof setInterval>;
  private _cachedEndpoint?: CDNEndpoint;
  private _endpointFailures: Map<string, number> = new Map();

  constructor(config?: Partial<DomainFrontingConfig>) {
    this._config = {
      ...DEFAULT_DOMAIN_FRONTING_CONFIG,
      ...config,
      obfuscation: {
        ...DEFAULT_DOMAIN_FRONTING_CONFIG.obfuscation,
        ...config?.obfuscation,
      },
      healthCheck: {
        ...DEFAULT_DOMAIN_FRONTING_CONFIG.healthCheck,
        ...config?.healthCheck,
      },
      fallback: {
        ...DEFAULT_DOMAIN_FRONTING_CONFIG.fallback,
        ...config?.fallback,
      },
    };

    this._metrics = this.initializeMetrics();

    if (this._config.healthCheck.enabled) {
      this.startHealthChecks();
    }
  }

  /**
   * Initialize metrics
   */
  private initializeMetrics(): DomainFrontingMetrics {
    return {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      fallbackRequests: 0,
      averageLatency: 0,
      bytesSent: 0,
      bytesReceived: 0,
      endpointUsage: new Map(),
    };
  }

  /**
   * Get current configuration
   */
  getConfig(): DomainFrontingConfig {
    return { ...this._config };
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<DomainFrontingConfig>): void {
    this._config = {
      ...this._config,
      ...config,
    };
  }

  /**
   * Add an endpoint
   */
  addEndpoint(endpoint: CDNEndpoint): void {
    this._config.endpoints.push(endpoint);
    this._config.endpoints.sort((a, b) => a.priority - b.priority);
  }

  /**
   * Remove an endpoint
   */
  removeEndpoint(endpointId: string): void {
    this._config.endpoints = this._config.endpoints.filter(
      (e) => e.id !== endpointId,
    );
  }

  /**
   * Get healthy endpoints sorted by priority
   */
  getHealthyEndpoints(): CDNEndpoint[] {
    return this._config.endpoints
      .filter((e) => e.enabled && e.healthy)
      .sort((a, b) => {
        // Sort by priority first, then by average latency
        if (a.priority !== b.priority) {
          return a.priority - b.priority;
        }
        return (a.averageLatency || Infinity) - (b.averageLatency || Infinity);
      });
  }

  /**
   * Select the best endpoint for a request
   */
  selectEndpoint(): CDNEndpoint | undefined {
    // Use cached endpoint if available and still healthy
    if (this._cachedEndpoint && this._cachedEndpoint.healthy) {
      return this._cachedEndpoint;
    }

    const healthyEndpoints = this.getHealthyEndpoints();
    if (healthyEndpoints.length === 0) {
      return undefined;
    }

    // Select the first (best) endpoint
    const selected = healthyEndpoints[0];

    // Cache if enabled
    if (this._config.fallback.cacheSuccessfulEndpoint) {
      this._cachedEndpoint = selected;
    }

    return selected;
  }

  /**
   * Make a fronted request
   */
  async request(request: FrontedRequest): Promise<FrontedResponse> {
    if (!this._config.enabled) {
      throw new Error("Domain fronting is not enabled");
    }

    this._metrics.totalRequests++;
    this._metrics.lastRequestTime = new Date();

    let lastError: Error | undefined;
    let attemptCount = 0;
    const maxAttempts = this._config.fallback.maxEndpointAttempts;

    while (attemptCount < maxAttempts) {
      const endpoint = this.selectEndpoint();
      if (!endpoint) {
        throw new Error("No healthy endpoints available");
      }

      try {
        const response = await this.executeRequest(request, endpoint);

        // Update metrics
        this._metrics.successfulRequests++;
        this.updateEndpointUsage(endpoint.id);

        // Clear failure count on success
        this._endpointFailures.delete(endpoint.id);

        return response;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error("Unknown error");

        // Track failures
        const failures = (this._endpointFailures.get(endpoint.id) || 0) + 1;
        this._endpointFailures.set(endpoint.id, failures);

        // Mark endpoint as unhealthy if too many failures
        if (failures >= this._config.healthCheck.failureThreshold) {
          endpoint.healthy = false;
        }

        attemptCount++;
      }
    }

    this._metrics.failedRequests++;

    throw new Error(
      `All endpoints failed after ${attemptCount} attempts: ${lastError?.message}`,
    );
  }

  /**
   * Execute a fronted request through an endpoint
   */
  private async executeRequest(
    request: FrontedRequest,
    endpoint: CDNEndpoint,
  ): Promise<FrontedResponse> {
    const startTime = Date.now();

    // Apply timing jitter
    if (this._config.obfuscation.timingJitter) {
      const jitter = Math.random() * this._config.obfuscation.maxJitterMs;
      await new Promise((resolve) => setTimeout(resolve, jitter));
    }

    // Build the fronted URL
    const url = this.buildFrontedUrl(request, endpoint);

    // Build headers
    const headers = this.buildFrontedHeaders(request, endpoint);

    // Prepare body with optional padding
    const body = this.prepareBody(request.body);

    // Execute request
    const response = await fetch(url, {
      method: request.method,
      headers,
      body: request.method !== "GET" ? body : undefined,
      signal: createTimeoutSignal(request.timeout || 30000),
    });

    const latency = Date.now() - startTime;

    // Update endpoint latency
    this.updateEndpointLatency(endpoint, latency);

    // Parse response
    const responseBody = await response.arrayBuffer();

    // Update metrics
    this._metrics.bytesReceived += responseBody.byteLength;
    if (body) {
      const bodySize = typeof body === "string" ? body.length : body.byteLength;
      this._metrics.bytesSent += bodySize;
    }

    // Extract response headers
    const responseHeaders: Record<string, string> = {};
    response.headers.forEach((value, key) => {
      responseHeaders[key] = value;
    });

    return {
      status: response.status,
      headers: responseHeaders,
      body: responseBody,
      endpoint,
      latency,
      wasFallback: false,
    };
  }

  /**
   * Build the fronted URL
   */
  private buildFrontedUrl(
    request: FrontedRequest,
    endpoint: CDNEndpoint,
  ): string {
    let path = endpoint.pathPrefix + request.path;

    // Add random path segments if enabled
    if (this._config.obfuscation.randomPath) {
      const randomSegment = this.generateRandomString(8);
      path = `/${randomSegment}${path}`;
    }

    // Add random query parameters if enabled
    if (this._config.obfuscation.randomQuery) {
      const separator = path.includes("?") ? "&" : "?";
      const randomParam = `_=${this.generateRandomString(12)}`;
      path += `${separator}${randomParam}`;
    }

    // Use HTTPS for the front domain
    return `https://${endpoint.frontDomain}${path}`;
  }

  /**
   * Build fronted request headers
   */
  private buildFrontedHeaders(
    request: FrontedRequest,
    endpoint: CDNEndpoint,
  ): Record<string, string> {
    const headers: Record<string, string> = {
      Host: endpoint.hostHeader,
      "User-Agent": this.getRandomUserAgent(),
      Accept: "*/*",
      "Accept-Language": "en-US,en;q=0.9",
      "Cache-Control": "no-cache",
      ...endpoint.customHeaders,
      ...request.headers,
    };

    // Apply content type disguise if configured
    if (this._config.obfuscation.contentTypeDisguise) {
      headers["Content-Type"] = this._config.obfuscation.contentTypeDisguise;
    }

    return headers;
  }

  /**
   * Prepare request body with optional padding
   */
  private prepareBody(
    body?: ArrayBuffer | string,
  ): ArrayBuffer | string | undefined {
    if (!body) return undefined;

    const { minPadding, maxPadding } = this._config.obfuscation;
    if (minPadding === 0 && maxPadding === 0) {
      return body;
    }

    const paddingSize =
      minPadding + Math.floor(Math.random() * (maxPadding - minPadding));
    const padding = new Uint8Array(paddingSize);
    crypto.getRandomValues(padding);

    if (typeof body === "string") {
      const encoder = new TextEncoder();
      const bodyBytes = encoder.encode(body);
      const combined = new Uint8Array(4 + bodyBytes.length + paddingSize);
      const view = new DataView(combined.buffer);
      view.setUint32(0, bodyBytes.length, false);
      combined.set(bodyBytes, 4);
      combined.set(padding, 4 + bodyBytes.length);
      return combined.buffer;
    }

    const bodyBytes = new Uint8Array(body);
    const combined = new Uint8Array(4 + bodyBytes.length + paddingSize);
    const view = new DataView(combined.buffer);
    view.setUint32(0, bodyBytes.length, false);
    combined.set(bodyBytes, 4);
    combined.set(padding, 4 + bodyBytes.length);
    return combined.buffer;
  }

  /**
   * Get a random user agent
   */
  private getRandomUserAgent(): string {
    return DISGUISE_USER_AGENTS[
      Math.floor(Math.random() * DISGUISE_USER_AGENTS.length)
    ];
  }

  /**
   * Generate a random string
   */
  private generateRandomString(length: number): string {
    const chars =
      "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    const array = new Uint8Array(length);
    crypto.getRandomValues(array);
    return Array.from(array, (x) => chars[x % chars.length]).join("");
  }

  /**
   * Update endpoint usage metrics
   */
  private updateEndpointUsage(endpointId: string): void {
    const current = this._metrics.endpointUsage.get(endpointId) || 0;
    this._metrics.endpointUsage.set(endpointId, current + 1);
  }

  /**
   * Update endpoint latency
   */
  private updateEndpointLatency(endpoint: CDNEndpoint, latency: number): void {
    if (endpoint.averageLatency === undefined) {
      endpoint.averageLatency = latency;
    } else {
      // Exponential moving average
      endpoint.averageLatency = endpoint.averageLatency * 0.8 + latency * 0.2;
    }

    // Update overall average
    this._metrics.averageLatency =
      this._metrics.averageLatency === 0
        ? latency
        : this._metrics.averageLatency * 0.9 + latency * 0.1;
  }

  /**
   * Start health checks
   */
  private startHealthChecks(): void {
    this.stopHealthChecks();
    this._healthCheckTimer = setInterval(
      () => this.performHealthChecks(),
      this._config.healthCheck.interval,
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
   * Perform health checks on all endpoints
   */
  async performHealthChecks(): Promise<void> {
    const checks = this._config.endpoints.map((endpoint) =>
      this.checkEndpointHealth(endpoint),
    );
    await Promise.all(checks);
  }

  /**
   * Check health of a single endpoint
   */
  private async checkEndpointHealth(endpoint: CDNEndpoint): Promise<void> {
    try {
      const startTime = Date.now();
      const url = `https://${endpoint.frontDomain}${endpoint.pathPrefix}/health`;

      const response = await fetch(url, {
        method: "HEAD",
        headers: {
          Host: endpoint.hostHeader,
          "User-Agent": this.getRandomUserAgent(),
        },
        signal: createTimeoutSignal(this._config.healthCheck.timeout),
      });

      const latency = Date.now() - startTime;
      endpoint.lastHealthCheck = new Date();

      if (response.ok || response.status === 404) {
        // 404 is acceptable - we just care that the CDN responds
        endpoint.healthy = true;
        this.updateEndpointLatency(endpoint, latency);
      } else {
        endpoint.healthy = false;
      }
    } catch {
      endpoint.healthy = false;
      endpoint.lastHealthCheck = new Date();
    }
  }

  /**
   * Test an endpoint
   */
  async testEndpoint(endpoint: CDNEndpoint): Promise<EndpointTestResult> {
    const startTime = Date.now();

    try {
      const url = `https://${endpoint.frontDomain}${endpoint.pathPrefix}/`;

      const response = await fetch(url, {
        method: "GET",
        headers: {
          Host: endpoint.hostHeader,
          "User-Agent": this.getRandomUserAgent(),
        },
        signal: createTimeoutSignal(10000),
      });

      const latency = Date.now() - startTime;
      const headers: Record<string, string> = {};
      response.headers.forEach((value, key) => {
        headers[key] = value;
      });

      return {
        endpoint,
        success: response.ok,
        latency,
        statusCode: response.status,
        headers,
      };
    } catch (error) {
      return {
        endpoint,
        success: false,
        latency: Date.now() - startTime,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Test all endpoints
   */
  async testAllEndpoints(): Promise<EndpointTestResult[]> {
    const tests = this._config.endpoints.map((endpoint) =>
      this.testEndpoint(endpoint),
    );
    return Promise.all(tests);
  }

  /**
   * Get metrics
   */
  getMetrics(): DomainFrontingMetrics {
    return { ...this._metrics };
  }

  /**
   * Reset metrics
   */
  resetMetrics(): void {
    this._metrics = this.initializeMetrics();
  }

  /**
   * Dispose of the client
   */
  dispose(): void {
    this.stopHealthChecks();
    this._cachedEndpoint = undefined;
    this._endpointFailures.clear();
  }
}

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Create a CDN endpoint configuration
 */
export function createCDNEndpoint(options: {
  provider: CDNProvider;
  frontDomain: string;
  hostHeader: string;
  pathPrefix?: string;
  priority?: number;
  region?: string;
  customHeaders?: Record<string, string>;
}): CDNEndpoint {
  return {
    id: `endpoint-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
    provider: options.provider,
    frontDomain: options.frontDomain,
    hostHeader: options.hostHeader,
    pathPrefix: options.pathPrefix || "",
    enabled: true,
    priority: options.priority ?? 0,
    healthy: true,
    region: options.region,
    customHeaders: options.customHeaders,
  };
}

/**
 * Create a Cloudflare endpoint
 */
export function createCloudflareEndpoint(
  frontDomain: string,
  hostHeader: string,
  options?: Partial<CDNEndpoint>,
): CDNEndpoint {
  return {
    ...createCDNEndpoint({
      provider: "cloudflare",
      frontDomain,
      hostHeader,
    }),
    ...options,
  };
}

/**
 * Create a CloudFront endpoint
 */
export function createCloudFrontEndpoint(
  distributionId: string,
  hostHeader: string,
  options?: Partial<CDNEndpoint>,
): CDNEndpoint {
  return {
    ...createCDNEndpoint({
      provider: "cloudfront",
      frontDomain: `${distributionId}.cloudfront.net`,
      hostHeader,
    }),
    ...options,
  };
}

/**
 * Create a reflector configuration
 */
export function createReflectorConfig(options: {
  url: string;
  secret: string;
  maxRequestSize?: number;
  timeout?: number;
  usePadding?: boolean;
}): ReflectorConfig {
  return {
    url: options.url,
    secret: options.secret,
    maxRequestSize: options.maxRequestSize ?? 1024 * 1024, // 1MB default
    timeout: options.timeout ?? 30000,
    usePadding: options.usePadding ?? true,
  };
}

/**
 * Create a domain fronting client with default configuration
 */
export function createDomainFrontingClient(
  endpoints: CDNEndpoint[],
  options?: Partial<DomainFrontingConfig>,
): DomainFrontingClient {
  return new DomainFrontingClient({
    enabled: true,
    endpoints,
    ...options,
  });
}

// ============================================================================
// Validation Functions
// ============================================================================

/**
 * Validate a domain fronting configuration
 */
export function validateDomainFrontingConfig(config: DomainFrontingConfig): {
  valid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (config.enabled && config.endpoints.length === 0) {
    errors.push("Domain fronting is enabled but no endpoints are configured");
  }

  const enabledEndpoints = config.endpoints.filter((e) => e.enabled);
  if (config.enabled && enabledEndpoints.length === 0) {
    errors.push("No enabled endpoints available");
  }

  if (enabledEndpoints.length === 1) {
    warnings.push(
      "Only one endpoint configured. Consider adding backup endpoints.",
    );
  }

  for (const endpoint of config.endpoints) {
    if (!endpoint.frontDomain) {
      errors.push(`Endpoint ${endpoint.id} is missing front domain`);
    }
    if (!endpoint.hostHeader) {
      errors.push(`Endpoint ${endpoint.id} is missing host header`);
    }
  }

  if (config.obfuscation.maxPadding > 4096) {
    warnings.push("Large padding size may impact performance");
  }

  if (config.healthCheck.interval < 10000) {
    warnings.push(
      "Health check interval is very short. This may generate excessive traffic.",
    );
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validate an endpoint configuration
 */
export function validateEndpoint(endpoint: CDNEndpoint): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!endpoint.frontDomain) {
    errors.push("Front domain is required");
  }

  if (!endpoint.hostHeader) {
    errors.push("Host header is required");
  }

  if (endpoint.frontDomain && !isValidDomain(endpoint.frontDomain)) {
    errors.push("Front domain is not a valid domain");
  }

  if (endpoint.hostHeader && !isValidDomain(endpoint.hostHeader)) {
    errors.push("Host header is not a valid domain");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Check if a string is a valid domain
 */
function isValidDomain(domain: string): boolean {
  const domainRegex =
    /^(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/;
  return domainRegex.test(domain);
}

// ============================================================================
// Exports
// ============================================================================

export const DOMAIN_FRONTING_CONSTANTS = {
  KNOWN_CDN_DOMAINS,
  DISGUISE_USER_AGENTS,
  DEFAULT_MAX_PADDING: 256,
  DEFAULT_HEALTH_CHECK_INTERVAL: 60000,
  DEFAULT_HEALTH_CHECK_TIMEOUT: 10000,
  DEFAULT_FALLBACK_TIMEOUT: 30000,
} as const;
