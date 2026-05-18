/**
 * Censorship Detector Module
 *
 * Provides detection of network restrictions, censorship, and blocking
 * to enable automatic fallback to appropriate circumvention methods.
 *
 * Features:
 * - Multiple detection strategies
 * - DNS-based detection
 * - TCP/IP-based detection
 * - HTTP/HTTPS-based detection
 * - SNI/TLS-based detection
 * - Deep packet inspection detection
 * - Fingerprinting of censorship systems
 *
 * @module lib/network/censorship-detector
 */

import { EventEmitter } from "events";

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
 * Censorship type classification
 */
export type CensorshipType =
  | "dns-poisoning"
  | "dns-blocking"
  | "tcp-rst"
  | "tcp-blocking"
  | "http-blocking"
  | "https-blocking"
  | "sni-filtering"
  | "dpi"
  | "ip-blocking"
  | "throttling"
  | "captive-portal"
  | "unknown";

/**
 * Detection confidence level
 */
export type ConfidenceLevel = "low" | "medium" | "high" | "certain";

/**
 * Network connectivity status
 */
export enum NetworkStatus {
  UNKNOWN = "unknown",
  CONNECTED = "connected",
  LIMITED = "limited",
  CENSORED = "censored",
  OFFLINE = "offline",
}

/**
 * Detection probe result
 */
export interface ProbeResult {
  /** Probe identifier */
  id: string;
  /** Probe type */
  type: ProbeType;
  /** Target tested */
  target: string;
  /** Whether probe succeeded */
  success: boolean;
  /** Response time in milliseconds */
  latency: number;
  /** Error if failed */
  error?: string;
  /** HTTP status code (if applicable) */
  statusCode?: number;
  /** Response headers (if applicable) */
  headers?: Record<string, string>;
  /** Detected censorship indicators */
  indicators: CensorshipIndicator[];
  /** Timestamp */
  timestamp: Date;
}

/**
 * Probe type
 */
export type ProbeType =
  | "dns-resolution"
  | "dns-over-https"
  | "tcp-connect"
  | "http-get"
  | "https-get"
  | "tls-handshake"
  | "websocket"
  | "ooni";

/**
 * Censorship indicator
 */
export interface CensorshipIndicator {
  /** Indicator type */
  type: CensorshipType;
  /** Confidence level */
  confidence: ConfidenceLevel;
  /** Description */
  description: string;
  /** Evidence data */
  evidence?: unknown;
}

/**
 * Detection result
 */
export interface DetectionResult {
  /** Overall network status */
  status: NetworkStatus;
  /** Whether censorship is detected */
  censored: boolean;
  /** Types of censorship detected */
  censorshipTypes: CensorshipType[];
  /** Overall confidence level */
  confidence: ConfidenceLevel;
  /** Detailed probe results */
  probes: ProbeResult[];
  /** Recommended circumvention methods */
  recommendations: CircumventionRecommendation[];
  /** Detection timestamp */
  timestamp: Date;
  /** Detection duration in milliseconds */
  duration: number;
  /** Geographic context */
  geoContext?: GeoContext;
}

/**
 * Circumvention recommendation
 */
export interface CircumventionRecommendation {
  /** Recommended method */
  method: CircumventionMethod;
  /** Priority (lower is better) */
  priority: number;
  /** Effectiveness rating (0-100) */
  effectiveness: number;
  /** Description */
  description: string;
  /** Configuration hints */
  configHints?: Record<string, unknown>;
}

/**
 * Circumvention method
 */
export type CircumventionMethod =
  | "domain-fronting"
  | "obfs4"
  | "meek"
  | "snowflake"
  | "socks-proxy"
  | "http-proxy"
  | "vpn"
  | "dns-over-https"
  | "dns-over-tls"
  | "direct";

/**
 * Geographic context
 */
export interface GeoContext {
  /** Country code */
  countryCode?: string;
  /** Country name */
  countryName?: string;
  /** Region/state */
  region?: string;
  /** City */
  city?: string;
  /** ASN */
  asn?: string;
  /** ISP name */
  isp?: string;
  /** Known censorship level for this region */
  knownCensorshipLevel?: "low" | "medium" | "high" | "severe";
}

/**
 * Detector configuration
 */
export interface CensorshipDetectorConfig {
  /** Enable detection */
  enabled: boolean;
  /** Probe timeout in milliseconds */
  probeTimeout: number;
  /** Maximum concurrent probes */
  maxConcurrentProbes: number;
  /** Detection interval in milliseconds (0 = manual only) */
  detectionInterval: number;
  /** Primary endpoint to test */
  primaryEndpoint: string;
  /** Alternative endpoints to test */
  alternativeEndpoints: string[];
  /** DNS servers for testing */
  dnsServers: string[];
  /** DoH servers for comparison */
  dohServers: string[];
  /** Known good IPs for primary endpoint */
  knownGoodIps?: string[];
  /** Enable OONI probe integration */
  ooniEnabled: boolean;
  /** Custom probes */
  customProbes?: CustomProbe[];
}

/**
 * Custom probe configuration
 */
export interface CustomProbe {
  /** Probe identifier */
  id: string;
  /** Probe name */
  name: string;
  /** Probe type */
  type: ProbeType;
  /** Target URL or address */
  target: string;
  /** Expected response pattern (regex) */
  expectedPattern?: string;
  /** Expected status codes */
  expectedStatusCodes?: number[];
  /** Timeout override */
  timeout?: number;
}

/**
 * Detector event types
 */
export type DetectorEventType =
  | "detection-started"
  | "detection-completed"
  | "probe-completed"
  | "censorship-detected"
  | "network-status-changed"
  | "recommendation-updated";

/**
 * Detector event
 */
export interface DetectorEvent {
  /** Event type */
  type: DetectorEventType;
  /** Timestamp */
  timestamp: Date;
  /** Event data */
  data?: unknown;
}

// ============================================================================
// Constants
// ============================================================================

/**
 * Default detector configuration
 */
export const DEFAULT_DETECTOR_CONFIG: CensorshipDetectorConfig = {
  enabled: true,
  probeTimeout: 10000,
  maxConcurrentProbes: 5,
  detectionInterval: 0,
  primaryEndpoint: "",
  alternativeEndpoints: [],
  dnsServers: ["8.8.8.8", "1.1.1.1", "9.9.9.9"],
  dohServers: [
    "https://dns.google/dns-query",
    "https://cloudflare-dns.com/dns-query",
    "https://dns.quad9.net/dns-query",
  ],
  ooniEnabled: false,
};

/**
 * Known block page signatures
 */
export const BLOCK_PAGE_SIGNATURES = [
  // ISP block pages
  {
    pattern: /blocked|forbidden|censored|restricted/i,
    type: "http-blocking" as CensorshipType,
  },
  { pattern: /access.{0,20}denied/i, type: "http-blocking" as CensorshipType },
  {
    pattern: /this.{0,20}(site|page).{0,20}(blocked|restricted)/i,
    type: "http-blocking" as CensorshipType,
  },
  // Government block pages
  {
    pattern: /government|ministry|authority/i,
    type: "http-blocking" as CensorshipType,
  },
  {
    pattern: /illegal.{0,20}content/i,
    type: "http-blocking" as CensorshipType,
  },
  // Parental control/filtering
  {
    pattern: /parental.{0,20}control/i,
    type: "http-blocking" as CensorshipType,
  },
  { pattern: /content.{0,20}filter/i, type: "http-blocking" as CensorshipType },
];

/**
 * Known censorship DNS responses
 */
export const CENSORSHIP_DNS_RESPONSES = [
  "127.0.0.1",
  "0.0.0.0",
  "10.10.10.10",
  "10.10.34.34",
  "10.10.35.35",
  "192.168.1.1",
  "127.0.0.2",
  "1.1.1.1", // Sometimes used as a block redirect
];

/**
 * Timeout error patterns
 */
export const TIMEOUT_PATTERNS = [
  /timeout/i,
  /timed.out/i,
  /connection.reset/i,
  /ECONNRESET/,
  /ETIMEDOUT/,
  /ECONNREFUSED/,
];

/**
 * TLS error patterns indicating SNI filtering
 */
export const SNI_FILTER_PATTERNS = [
  /certificate/i,
  /ssl/i,
  /tls/i,
  /handshake/i,
  /ERR_SSL/,
  /ERR_CERT/,
];

// ============================================================================
// Censorship Detector
// ============================================================================

/**
 * Censorship Detector
 *
 * Detects network censorship and recommends circumvention methods
 */
export class CensorshipDetector extends EventEmitter {
  private _config: CensorshipDetectorConfig;
  private _lastResult?: DetectionResult;
  private _networkStatus: NetworkStatus = NetworkStatus.UNKNOWN;
  private _detectionTimer?: ReturnType<typeof setInterval>;
  private _isDetecting: boolean = false;

  constructor(config?: Partial<CensorshipDetectorConfig>) {
    super();
    this._config = {
      ...DEFAULT_DETECTOR_CONFIG,
      ...config,
    };

    if (this._config.detectionInterval > 0) {
      this.startPeriodicDetection();
    }
  }

  /**
   * Get current configuration
   */
  getConfig(): CensorshipDetectorConfig {
    return { ...this._config };
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<CensorshipDetectorConfig>): void {
    this._config = { ...this._config, ...config };

    if (this._config.detectionInterval > 0) {
      this.startPeriodicDetection();
    } else {
      this.stopPeriodicDetection();
    }
  }

  /**
   * Get current network status
   */
  getNetworkStatus(): NetworkStatus {
    return this._networkStatus;
  }

  /**
   * Get last detection result
   */
  getLastResult(): DetectionResult | undefined {
    return this._lastResult;
  }

  /**
   * Run full censorship detection
   */
  async detect(): Promise<DetectionResult> {
    if (this._isDetecting) {
      throw new Error("Detection already in progress");
    }

    this._isDetecting = true;
    const startTime = Date.now();
    this.emitEvent("detection-started");

    try {
      const probes: ProbeResult[] = [];

      // Run all probes
      const probeResults = await this.runAllProbes();
      probes.push(...probeResults);

      // Analyze results
      const analysis = this.analyzeProbes(probes);

      // Get geographic context
      const geoContext = await this.getGeoContext();

      // Generate recommendations
      const recommendations = this.generateRecommendations(
        analysis,
        geoContext,
      );

      // Build result
      const result: DetectionResult = {
        status: analysis.status,
        censored: analysis.censored,
        censorshipTypes: analysis.censorshipTypes,
        confidence: analysis.confidence,
        probes,
        recommendations,
        timestamp: new Date(),
        duration: Date.now() - startTime,
        geoContext,
      };

      this._lastResult = result;
      this.updateNetworkStatus(result.status);
      this.emitEvent("detection-completed", result);

      if (result.censored) {
        this.emitEvent("censorship-detected", result);
      }

      return result;
    } finally {
      this._isDetecting = false;
    }
  }

  /**
   * Quick check for basic connectivity
   */
  async quickCheck(): Promise<boolean> {
    try {
      const probe = await this.runHttpProbe(
        this._config.primaryEndpoint || "https://www.google.com",
      );
      return probe.success && probe.indicators.length === 0;
    } catch {
      return false;
    }
  }

  /**
   * Check if a specific domain is blocked
   */
  async isDomainBlocked(domain: string): Promise<{
    blocked: boolean;
    indicators: CensorshipIndicator[];
  }> {
    const probes: ProbeResult[] = [];

    // DNS probe
    const dnsProbe = await this.runDnsProbe(domain);
    probes.push(dnsProbe);

    // HTTP probe
    try {
      const httpProbe = await this.runHttpProbe(`https://${domain}`);
      probes.push(httpProbe);
    } catch {
      // HTTP probe failed, which is expected for blocked domains
    }

    const indicators = probes.flatMap((p) => p.indicators);
    const blocked = indicators.length > 0 || probes.every((p) => !p.success);

    return { blocked, indicators };
  }

  // ============================================================================
  // Probe Execution
  // ============================================================================

  /**
   * Run all configured probes
   */
  private async runAllProbes(): Promise<ProbeResult[]> {
    const probes: Promise<ProbeResult>[] = [];

    // Primary endpoint probe
    if (this._config.primaryEndpoint) {
      probes.push(this.runHttpProbe(this._config.primaryEndpoint));
    }

    // Alternative endpoint probes
    for (const endpoint of this._config.alternativeEndpoints.slice(0, 3)) {
      probes.push(this.runHttpProbe(endpoint));
    }

    // DNS probes
    if (this._config.primaryEndpoint) {
      try {
        const url = new URL(this._config.primaryEndpoint);
        probes.push(this.runDnsProbe(url.hostname));
        probes.push(this.runDohProbe(url.hostname));
      } catch {
        // Invalid URL, skip DNS probes
      }
    }

    // WebSocket probe if primary endpoint is a WebSocket
    if (this._config.primaryEndpoint?.startsWith("ws")) {
      probes.push(this.runWebSocketProbe(this._config.primaryEndpoint));
    }

    // Custom probes
    if (this._config.customProbes) {
      for (const customProbe of this._config.customProbes) {
        probes.push(this.runCustomProbe(customProbe));
      }
    }

    // Execute all probes with concurrency limit
    const results: ProbeResult[] = [];
    const batches = this.batchArray(probes, this._config.maxConcurrentProbes);

    for (const batch of batches) {
      const batchResults = await Promise.all(
        batch.map((p) =>
          p.catch((error) => this.createErrorProbeResult(error)),
        ),
      );
      results.push(...batchResults);
    }

    return results;
  }

  /**
   * Run HTTP/HTTPS probe
   */
  private async runHttpProbe(url: string): Promise<ProbeResult> {
    const startTime = Date.now();
    const indicators: CensorshipIndicator[] = [];
    const probeId = `http-${Date.now()}`;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(
        () => controller.abort(),
        this._config.probeTimeout,
      );

      try {
        const response = await fetch(url, {
          method: "GET",
          signal: controller.signal,
          headers: {
            "User-Agent": "Mozilla/5.0 (compatible; CensorshipDetector/1.0)",
          },
        });

        clearTimeout(timeoutId);

        const latency = Date.now() - startTime;
        const headers: Record<string, string> = {};
        response.headers.forEach((value, key) => {
          headers[key] = value;
        });

        // Check for censorship indicators
        const responseText = await response.text();

        // Check for block page signatures
        for (const signature of BLOCK_PAGE_SIGNATURES) {
          if (signature.pattern.test(responseText)) {
            indicators.push({
              type: signature.type,
              confidence: "high",
              description: `Block page detected: ${signature.pattern.source}`,
              evidence: { pattern: signature.pattern.source },
            });
          }
        }

        // Check for unexpected redirects
        if (response.redirected) {
          const redirectUrl = response.url;
          if (!redirectUrl.includes(new URL(url).hostname)) {
            indicators.push({
              type: "http-blocking",
              confidence: "medium",
              description: "Unexpected redirect detected",
              evidence: { originalUrl: url, redirectUrl },
            });
          }
        }

        // Check for suspicious status codes
        if (response.status === 451) {
          indicators.push({
            type: "http-blocking",
            confidence: "certain",
            description: "HTTP 451 Unavailable For Legal Reasons",
          });
        } else if (response.status === 403 || response.status === 410) {
          // Could be censorship or legitimate
          indicators.push({
            type: "http-blocking",
            confidence: "low",
            description: `HTTP ${response.status} response`,
          });
        }

        this.emitEvent("probe-completed", {
          id: probeId,
          success: true,
          latency,
        });

        return {
          id: probeId,
          type: url.startsWith("https") ? "https-get" : "http-get",
          target: url,
          success: response.ok && indicators.length === 0,
          latency,
          statusCode: response.status,
          headers,
          indicators,
          timestamp: new Date(),
        };
      } finally {
        clearTimeout(timeoutId);
      }
    } catch (error) {
      const latency = Date.now() - startTime;
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";

      // Analyze error for censorship indicators
      if (TIMEOUT_PATTERNS.some((p) => p.test(errorMessage))) {
        indicators.push({
          type: "tcp-blocking",
          confidence: "medium",
          description: "Connection timeout - possible TCP blocking",
        });
      }

      if (SNI_FILTER_PATTERNS.some((p) => p.test(errorMessage))) {
        indicators.push({
          type: "sni-filtering",
          confidence: "medium",
          description: "TLS error - possible SNI filtering",
        });
      }

      if (errorMessage.includes("ECONNRESET")) {
        indicators.push({
          type: "tcp-rst",
          confidence: "high",
          description: "Connection reset - likely active censorship",
        });
      }

      this.emitEvent("probe-completed", {
        id: probeId,
        success: false,
        error: errorMessage,
      });

      return {
        id: probeId,
        type: url.startsWith("https") ? "https-get" : "http-get",
        target: url,
        success: false,
        latency,
        error: errorMessage,
        indicators,
        timestamp: new Date(),
      };
    }
  }

  /**
   * Run DNS probe (simulated in browser environment)
   */
  private async runDnsProbe(domain: string): Promise<ProbeResult> {
    const startTime = Date.now();
    const indicators: CensorshipIndicator[] = [];
    const probeId = `dns-${Date.now()}`;

    // In browser environment, we can't do direct DNS queries
    // We'll use a DNS-over-HTTPS service to check DNS resolution
    try {
      const dohUrl = `https://dns.google/resolve?name=${domain}&type=A`;

      const controller = new AbortController();
      const timeoutId = setTimeout(
        () => controller.abort(),
        this._config.probeTimeout,
      );

      try {
        const response = await fetch(dohUrl, {
          signal: controller.signal,
          headers: {
            Accept: "application/dns-json",
          },
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(`DoH request failed: ${response.status}`);
        }

        const data = await response.json();
        const latency = Date.now() - startTime;

        // Check for NXDOMAIN
        if (data.Status === 3) {
          indicators.push({
            type: "dns-blocking",
            confidence: "medium",
            description: "NXDOMAIN response - domain may be blocked",
          });
        }

        // Check for poisoned responses
        if (data.Answer) {
          for (const answer of data.Answer) {
            if (
              answer.type === 1 &&
              CENSORSHIP_DNS_RESPONSES.includes(answer.data)
            ) {
              indicators.push({
                type: "dns-poisoning",
                confidence: "high",
                description: `Suspicious DNS response: ${answer.data}`,
                evidence: { ip: answer.data },
              });
            }
          }
        }

        return {
          id: probeId,
          type: "dns-resolution",
          target: domain,
          success: data.Status === 0 && indicators.length === 0,
          latency,
          indicators,
          timestamp: new Date(),
        };
      } finally {
        clearTimeout(timeoutId);
      }
    } catch (error) {
      return {
        id: probeId,
        type: "dns-resolution",
        target: domain,
        success: false,
        latency: Date.now() - startTime,
        error: error instanceof Error ? error.message : "Unknown error",
        indicators,
        timestamp: new Date(),
      };
    }
  }

  /**
   * Run DNS-over-HTTPS probe for comparison
   */
  private async runDohProbe(domain: string): Promise<ProbeResult> {
    const startTime = Date.now();
    const indicators: CensorshipIndicator[] = [];
    const probeId = `doh-${Date.now()}`;

    const dohServer = this._config.dohServers[0];

    try {
      const dohUrl = `${dohServer}?name=${domain}&type=A`;

      const controller = new AbortController();
      const timeoutId = setTimeout(
        () => controller.abort(),
        this._config.probeTimeout,
      );

      try {
        const response = await fetch(dohUrl, {
          signal: controller.signal,
          headers: {
            Accept: "application/dns-json",
          },
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(`DoH request failed: ${response.status}`);
        }

        const data = await response.json();
        const latency = Date.now() - startTime;

        // Compare with known good IPs if available
        if (this._config.knownGoodIps && data.Answer) {
          const resolvedIps = data.Answer.filter(
            (a: { type: number }) => a.type === 1,
          ).map((a: { data: string }) => a.data);

          const hasGoodIp = resolvedIps.some((ip: string) =>
            this._config.knownGoodIps!.includes(ip),
          );

          if (!hasGoodIp && resolvedIps.length > 0) {
            indicators.push({
              type: "dns-poisoning",
              confidence: "medium",
              description: "DoH resolved to different IPs than expected",
              evidence: {
                expected: this._config.knownGoodIps,
                actual: resolvedIps,
              },
            });
          }
        }

        return {
          id: probeId,
          type: "dns-over-https",
          target: domain,
          success: true,
          latency,
          indicators,
          timestamp: new Date(),
        };
      } finally {
        clearTimeout(timeoutId);
      }
    } catch (error) {
      // DoH failure might indicate DoH itself is blocked
      if (
        error instanceof Error &&
        TIMEOUT_PATTERNS.some((p) => p.test(error.message))
      ) {
        indicators.push({
          type: "dpi",
          confidence: "low",
          description: "DoH request failed - possible DPI blocking",
        });
      }

      return {
        id: probeId,
        type: "dns-over-https",
        target: domain,
        success: false,
        latency: Date.now() - startTime,
        error: error instanceof Error ? error.message : "Unknown error",
        indicators,
        timestamp: new Date(),
      };
    }
  }

  /**
   * Run WebSocket probe
   */
  private async runWebSocketProbe(url: string): Promise<ProbeResult> {
    const startTime = Date.now();
    const indicators: CensorshipIndicator[] = [];
    const probeId = `ws-${Date.now()}`;

    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        indicators.push({
          type: "tcp-blocking",
          confidence: "medium",
          description: "WebSocket connection timeout",
        });
        resolve({
          id: probeId,
          type: "websocket",
          target: url,
          success: false,
          latency: Date.now() - startTime,
          error: "Connection timeout",
          indicators,
          timestamp: new Date(),
        });
      }, this._config.probeTimeout);

      try {
        const ws = new WebSocket(url);

        ws.onopen = () => {
          clearTimeout(timeout);
          ws.close();
          resolve({
            id: probeId,
            type: "websocket",
            target: url,
            success: true,
            latency: Date.now() - startTime,
            indicators,
            timestamp: new Date(),
          });
        };

        ws.onerror = () => {
          clearTimeout(timeout);
          indicators.push({
            type: "tcp-blocking",
            confidence: "medium",
            description: "WebSocket connection failed",
          });
          resolve({
            id: probeId,
            type: "websocket",
            target: url,
            success: false,
            latency: Date.now() - startTime,
            error: "WebSocket error",
            indicators,
            timestamp: new Date(),
          });
        };
      } catch (error) {
        clearTimeout(timeout);
        resolve({
          id: probeId,
          type: "websocket",
          target: url,
          success: false,
          latency: Date.now() - startTime,
          error: error instanceof Error ? error.message : "Unknown error",
          indicators,
          timestamp: new Date(),
        });
      }
    });
  }

  /**
   * Run custom probe
   */
  private async runCustomProbe(probe: CustomProbe): Promise<ProbeResult> {
    switch (probe.type) {
      case "http-get":
      case "https-get":
        return this.runHttpProbe(probe.target);
      case "dns-resolution":
        return this.runDnsProbe(probe.target);
      case "dns-over-https":
        return this.runDohProbe(probe.target);
      case "websocket":
        return this.runWebSocketProbe(probe.target);
      default:
        return {
          id: probe.id,
          type: probe.type,
          target: probe.target,
          success: false,
          latency: 0,
          error: "Unsupported probe type",
          indicators: [],
          timestamp: new Date(),
        };
    }
  }

  /**
   * Create error probe result
   */
  private createErrorProbeResult(error: unknown): ProbeResult {
    return {
      id: `error-${Date.now()}`,
      type: "http-get",
      target: "unknown",
      success: false,
      latency: 0,
      error: error instanceof Error ? error.message : "Unknown error",
      indicators: [],
      timestamp: new Date(),
    };
  }

  // ============================================================================
  // Analysis
  // ============================================================================

  /**
   * Analyze probe results
   */
  private analyzeProbes(probes: ProbeResult[]): {
    status: NetworkStatus;
    censored: boolean;
    censorshipTypes: CensorshipType[];
    confidence: ConfidenceLevel;
  } {
    if (probes.length === 0) {
      return {
        status: NetworkStatus.UNKNOWN,
        censored: false,
        censorshipTypes: [],
        confidence: "low",
      };
    }

    const allIndicators = probes.flatMap((p) => p.indicators);
    const successfulProbes = probes.filter((p) => p.success);
    const failedProbes = probes.filter((p) => !p.success);

    // Determine network status
    let status: NetworkStatus;
    if (successfulProbes.length === 0) {
      status =
        allIndicators.length > 0
          ? NetworkStatus.CENSORED
          : NetworkStatus.OFFLINE;
    } else if (allIndicators.length > 0) {
      status = NetworkStatus.CENSORED;
    } else if (failedProbes.length > successfulProbes.length) {
      status = NetworkStatus.LIMITED;
    } else {
      status = NetworkStatus.CONNECTED;
    }

    // Collect unique censorship types
    const censorshipTypes = [...new Set(allIndicators.map((i) => i.type))];

    // Determine overall confidence
    let confidence: ConfidenceLevel = "low";
    if (allIndicators.some((i) => i.confidence === "certain")) {
      confidence = "certain";
    } else if (
      allIndicators.filter((i) => i.confidence === "high").length >= 2
    ) {
      confidence = "high";
    } else if (allIndicators.some((i) => i.confidence === "high")) {
      confidence = "medium";
    } else if (allIndicators.length > 0) {
      confidence = "low";
    }

    return {
      status,
      censored: censorshipTypes.length > 0,
      censorshipTypes,
      confidence,
    };
  }

  /**
   * Generate circumvention recommendations
   */
  private generateRecommendations(
    analysis: {
      censorshipTypes: CensorshipType[];
      confidence: ConfidenceLevel;
    },
    geoContext?: GeoContext,
  ): CircumventionRecommendation[] {
    const recommendations: CircumventionRecommendation[] = [];

    if (analysis.censorshipTypes.length === 0) {
      // No censorship detected
      recommendations.push({
        method: "direct",
        priority: 0,
        effectiveness: 100,
        description: "No circumvention needed - direct connection recommended",
      });
      return recommendations;
    }

    // SNI filtering detected - recommend domain fronting
    if (
      analysis.censorshipTypes.includes("sni-filtering") ||
      analysis.censorshipTypes.includes("https-blocking")
    ) {
      recommendations.push({
        method: "domain-fronting",
        priority: 1,
        effectiveness: 85,
        description: "Use domain fronting to bypass SNI-based filtering",
        configHints: { preferCDN: "cloudflare" },
      });

      recommendations.push({
        method: "meek",
        priority: 2,
        effectiveness: 80,
        description: "Use meek transport for high-censorship environments",
      });
    }

    // TCP/IP blocking detected - recommend obfs4 or snowflake
    if (
      analysis.censorshipTypes.includes("tcp-blocking") ||
      analysis.censorshipTypes.includes("tcp-rst") ||
      analysis.censorshipTypes.includes("ip-blocking")
    ) {
      recommendations.push({
        method: "obfs4",
        priority: 1,
        effectiveness: 90,
        description: "Use obfs4 bridges to bypass IP/TCP blocking",
      });

      recommendations.push({
        method: "snowflake",
        priority: 2,
        effectiveness: 75,
        description: "Use Snowflake for WebRTC-based circumvention",
      });
    }

    // DNS blocking detected - recommend DoH/DoT
    if (
      analysis.censorshipTypes.includes("dns-blocking") ||
      analysis.censorshipTypes.includes("dns-poisoning")
    ) {
      recommendations.push({
        method: "dns-over-https",
        priority: 1,
        effectiveness: 95,
        description: "Use DNS-over-HTTPS to bypass DNS manipulation",
        configHints: { servers: this._config.dohServers },
      });

      recommendations.push({
        method: "dns-over-tls",
        priority: 2,
        effectiveness: 90,
        description: "Use DNS-over-TLS as an alternative to DoH",
      });
    }

    // DPI detected - recommend traffic obfuscation
    if (analysis.censorshipTypes.includes("dpi")) {
      recommendations.push({
        method: "obfs4",
        priority: 1,
        effectiveness: 85,
        description: "Use obfs4 to evade deep packet inspection",
      });

      recommendations.push({
        method: "meek",
        priority: 2,
        effectiveness: 80,
        description: "Use meek transport to disguise traffic as CDN requests",
      });
    }

    // Generic fallbacks
    if (recommendations.length === 0 || analysis.confidence === "low") {
      recommendations.push({
        method: "socks-proxy",
        priority: 5,
        effectiveness: 60,
        description: "Use a SOCKS5 proxy as a general fallback",
      });

      recommendations.push({
        method: "vpn",
        priority: 6,
        effectiveness: 70,
        description: "Use a VPN for encrypted tunnel",
      });
    }

    // Adjust based on geographic context
    if (geoContext?.knownCensorshipLevel === "severe") {
      // Prioritize more robust methods
      recommendations.sort((a, b) => {
        const severeMethods: CircumventionMethod[] = [
          "obfs4",
          "meek",
          "snowflake",
        ];
        const aIsSevere = severeMethods.includes(a.method);
        const bIsSevere = severeMethods.includes(b.method);
        if (aIsSevere && !bIsSevere) return -1;
        if (!aIsSevere && bIsSevere) return 1;
        return a.priority - b.priority;
      });
    }

    return recommendations.sort((a, b) => a.priority - b.priority);
  }

  /**
   * Get geographic context
   */
  private async getGeoContext(): Promise<GeoContext | undefined> {
    try {
      const response = await fetch("https://ipinfo.io/json", {
        signal: createTimeoutSignal(5000),
      });

      if (!response.ok) {
        return undefined;
      }

      const data = await response.json();

      return {
        countryCode: data.country,
        countryName: data.country,
        region: data.region,
        city: data.city,
        asn: data.org?.split(" ")[0],
        isp: data.org,
        knownCensorshipLevel: this.getCensorshipLevel(data.country),
      };
    } catch {
      return undefined;
    }
  }

  /**
   * Get known censorship level for a country
   */
  private getCensorshipLevel(
    countryCode?: string,
  ): "low" | "medium" | "high" | "severe" {
    if (!countryCode) return "low";

    const severeCensorship = ["CN", "KP", "IR", "TM", "ER"];
    const highCensorship = ["RU", "SA", "AE", "BY", "CU", "SY", "VN"];
    const mediumCensorship = ["TR", "EG", "PK", "TH", "ID", "MY"];

    if (severeCensorship.includes(countryCode)) return "severe";
    if (highCensorship.includes(countryCode)) return "high";
    if (mediumCensorship.includes(countryCode)) return "medium";
    return "low";
  }

  // ============================================================================
  // Utilities
  // ============================================================================

  /**
   * Batch array into chunks
   */
  private batchArray<T>(array: T[], batchSize: number): T[][] {
    const batches: T[][] = [];
    for (let i = 0; i < array.length; i += batchSize) {
      batches.push(array.slice(i, i + batchSize));
    }
    return batches;
  }

  /**
   * Update network status
   */
  private updateNetworkStatus(status: NetworkStatus): void {
    if (status !== this._networkStatus) {
      const previousStatus = this._networkStatus;
      this._networkStatus = status;
      this.emitEvent("network-status-changed", {
        previousStatus,
        currentStatus: status,
      });
    }
  }

  /**
   * Emit event
   */
  private emitEvent(type: DetectorEventType, data?: unknown): void {
    const event: DetectorEvent = {
      type,
      timestamp: new Date(),
      data,
    };
    this.emit(type, event);
  }

  // ============================================================================
  // Lifecycle
  // ============================================================================

  /**
   * Start periodic detection
   */
  private startPeriodicDetection(): void {
    this.stopPeriodicDetection();
    this._detectionTimer = setInterval(
      () => this.detect().catch(() => {}),
      this._config.detectionInterval,
    );
  }

  /**
   * Stop periodic detection
   */
  private stopPeriodicDetection(): void {
    if (this._detectionTimer) {
      clearInterval(this._detectionTimer);
      this._detectionTimer = undefined;
    }
  }

  /**
   * Dispose of the detector
   */
  dispose(): void {
    this.stopPeriodicDetection();
  }
}

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Create a censorship detector with default configuration
 */
export function createCensorshipDetector(
  primaryEndpoint: string,
  options?: Partial<CensorshipDetectorConfig>,
): CensorshipDetector {
  return new CensorshipDetector({
    primaryEndpoint,
    ...options,
  });
}

/**
 * Create a minimal censorship detector for quick checks
 */
export function createQuickDetector(endpoint: string): CensorshipDetector {
  return new CensorshipDetector({
    primaryEndpoint: endpoint,
    probeTimeout: 5000,
    maxConcurrentProbes: 3,
    detectionInterval: 0,
    ooniEnabled: false,
  });
}

/**
 * Create a comprehensive censorship detector
 */
export function createComprehensiveDetector(
  primaryEndpoint: string,
  alternativeEndpoints: string[],
): CensorshipDetector {
  return new CensorshipDetector({
    primaryEndpoint,
    alternativeEndpoints,
    probeTimeout: 15000,
    maxConcurrentProbes: 10,
    detectionInterval: 300000, // 5 minutes
    ooniEnabled: false,
  });
}

// ============================================================================
// Exports
// ============================================================================

export const CENSORSHIP_DETECTOR_CONSTANTS = {
  BLOCK_PAGE_SIGNATURES,
  CENSORSHIP_DNS_RESPONSES,
  TIMEOUT_PATTERNS,
  SNI_FILTER_PATTERNS,
} as const;
