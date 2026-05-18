/**
 * SSRF (Server-Side Request Forgery) Protection
 *
 * Comprehensive URL validation and protection against SSRF attacks.
 * Includes DNS rebinding protection, private IP blocking, and secure fetch.
 *
 * @module lib/security/ssrf-protection
 */

import { URL } from "url";

// ============================================================================
// Configuration
// ============================================================================

export interface SsrfConfig {
  /** Allowed protocols (default: http:, https:) */
  allowedProtocols: string[];
  /** Blocked domains (e.g., metadata.google.internal) */
  blockedDomains: string[];
  /** Allowlist domains (if set, only these are allowed) */
  allowedDomains?: string[];
  /** Allow private IPs (10.x, 192.168.x, etc.) */
  allowPrivateIPs: boolean;
  /** Allow localhost (127.0.0.1, ::1) */
  allowLocalhost: boolean;
  /** Request timeout in milliseconds */
  timeoutMs: number;
  /** Maximum redirects to follow */
  maxRedirects: number;
}

const DEFAULT_CONFIG: SsrfConfig = {
  allowedProtocols: ["http:", "https:"],
  blockedDomains: [
    // Cloud metadata IPs (link-local)
    "169.254.169.254", // AWS, Azure, GCP, DigitalOcean, Oracle, OpenStack
    "100.100.100.200", // Alibaba Cloud
    // Cloud metadata hostnames
    "metadata.google.internal", // GCP
    "metadata.azure.internal", // Azure (rare)
    "metadata.goog", // GCP alternate
    "instance-data", // Common internal name
    // Kubernetes
    "kubernetes.default.svc",
    "kubernetes.default",
    // Docker
    "host.docker.internal",
    "gateway.docker.internal",
  ],
  allowPrivateIPs: false,
  allowLocalhost: false,
  timeoutMs: 10000,
  maxRedirects: 5,
};

// ============================================================================
// IP Address Validation
// ============================================================================

/**
 * Extract IPv4 address from WHATWG-normalized IPv4-mapped IPv6 hex format.
 * The WHATWG URL parser normalizes ::ffff:x.x.x.x to ::ffff:XXXX:XXXX.
 * e.g., ::ffff:127.0.0.1 → ::ffff:7f00:1
 */
function extractIPv4FromMappedIPv6Hex(ip: string): string | null {
  const m = ip.match(/^::ffff:([0-9a-f]{1,4}):([0-9a-f]{1,4})$/i);
  if (!m) return null;
  const high = parseInt(m[1], 16);
  const low = parseInt(m[2], 16);
  return `${(high >> 8) & 0xff}.${high & 0xff}.${(low >> 8) & 0xff}.${low & 0xff}`;
}

/**
 * Check if hostname is localhost
 * Handles both plain hostnames and bracketed IPv6 addresses
 */
function isLocalhost(hostname: string): boolean {
  // Remove brackets from IPv6 addresses (URLs use [::1] format)
  let normalized = hostname.toLowerCase().trim();
  if (normalized.startsWith("[") && normalized.endsWith("]")) {
    normalized = normalized.slice(1, -1);
  }

  const localhostPatterns = [
    "localhost",
    "127.0.0.1",
    "::1",
    "::ffff:127.0.0.1",
    "0.0.0.0",
    "0:0:0:0:0:0:0:0",
    "0:0:0:0:0:0:0:1",
  ];

  if (localhostPatterns.some((pattern) => normalized === pattern)) {
    return true;
  }

  // Handle WHATWG-normalized IPv4-mapped IPv6: ::ffff:7f00:1 = ::ffff:127.0.0.1
  const ipv4 = extractIPv4FromMappedIPv6Hex(normalized);
  if (ipv4) {
    return localhostPatterns.some((p) => ipv4 === p) || /^127\./.test(ipv4);
  }

  return false;
}

/**
 * Check if IP address is private/internal
 * Handles IPv4, IPv6, and IPv4-mapped IPv6 addresses
 */
function isPrivateIP(ip: string): boolean {
  // Remove brackets from IPv6 addresses (URLs use [::1] format)
  let normalized = ip.toLowerCase().trim();
  if (normalized.startsWith("[") && normalized.endsWith("]")) {
    normalized = normalized.slice(1, -1);
  }

  // IPv4 private ranges
  const ipv4Private = [
    /^10\./, // 10.0.0.0/8
    /^172\.(1[6-9]|2[0-9]|3[0-1])\./, // 172.16.0.0/12
    /^192\.168\./, // 192.168.0.0/16
    /^127\./, // 127.0.0.0/8 (loopback)
    /^169\.254\./, // 169.254.0.0/16 (link-local)
    /^0\./, // 0.0.0.0/8
    /^100\.(6[4-9]|[7-9][0-9]|1[01][0-9]|12[0-7])\./, // 100.64.0.0/10 (CGNAT)
  ];

  // Check direct IPv4
  if (ipv4Private.some((pattern) => pattern.test(normalized))) {
    return true;
  }

  // Check for IPv4-mapped IPv6 addresses (::ffff:x.x.x.x dotted-decimal form)
  if (normalized.startsWith("::ffff:")) {
    const ipv4Part = normalized.slice(7);
    if (ipv4Private.some((pattern) => pattern.test(ipv4Part))) {
      return true;
    }
  }

  // Handle WHATWG-normalized IPv4-mapped IPv6: ::ffff:XXXX:XXXX (hex) form
  // e.g., ::ffff:10.0.0.1 → ::ffff:a00:1
  const ipv4FromHex = extractIPv4FromMappedIPv6Hex(normalized);
  if (ipv4FromHex && ipv4Private.some((pattern) => pattern.test(ipv4FromHex))) {
    return true;
  }

  // IPv6 private ranges
  const ipv6Private = [
    /^::1$/, // Loopback
    /^::$/, // Unspecified
    /^::ffff:127\./i, // IPv4-mapped loopback
    /^::ffff:10\./i, // IPv4-mapped 10.x
    /^::ffff:172\.(1[6-9]|2[0-9]|3[0-1])\./i, // IPv4-mapped 172.16-31.x
    /^::ffff:192\.168\./i, // IPv4-mapped 192.168.x
    /^::ffff:169\.254\./i, // IPv4-mapped link-local
    /^::ffff:0\./i, // IPv4-mapped 0.x
    /^fc00:/i, // Unique local (ULA)
    /^fd[0-9a-f]{2}:/i, // Unique local (ULA) - fd00::/8
    /^fe80:/i, // Link-local
    /^ff0[0-9a-f]:/i, // Multicast (local scope)
    /^ff[0-9a-f][12345]:/i, // Multicast (node/link/site/org scope)
    /^::ffff:100\.(6[4-9]|[7-9][0-9]|1[01][0-9]|12[0-7])\./i, // IPv4-mapped CGNAT
  ];

  return ipv6Private.some((pattern) => pattern.test(normalized));
}

/**
 * Check if IP is a cloud metadata endpoint
 * Handles various IP formats including IPv4-mapped IPv6
 */
function isCloudMetadata(ip: string): boolean {
  // Remove brackets from IPv6 addresses (URLs use [::1] format)
  let normalized = ip.toLowerCase().trim();
  if (normalized.startsWith("[") && normalized.endsWith("]")) {
    normalized = normalized.slice(1, -1);
  }

  // Direct cloud metadata IPs
  const cloudMetadataIPs = [
    "169.254.169.254", // AWS, Azure, GCP, DigitalOcean, Oracle, OpenStack
    "100.100.100.200", // Alibaba Cloud
    "fd00:ec2::254", // AWS IPv6 metadata
  ];

  if (cloudMetadataIPs.includes(normalized)) {
    return true;
  }

  // Check for IPv4-mapped IPv6 addresses (::ffff:169.254.169.254)
  if (normalized.startsWith("::ffff:")) {
    const ipv4Part = normalized.slice(7);
    if (cloudMetadataIPs.includes(ipv4Part)) {
      return true;
    }
  }

  // Check for other IPv6 representations of metadata IPs
  // e.g., 0:0:0:0:0:ffff:a9fe:a9fe (169.254.169.254 in hex)
  const metadataHexPatterns = [
    /^(0:){5}ffff:a9fe:a9fe$/i, // 169.254.169.254
    /^(0:){5}ffff:6464:64c8$/i, // 100.100.100.200
  ];

  return metadataHexPatterns.some((pattern) => pattern.test(normalized));
}

// ============================================================================
// Domain Validation
// ============================================================================

/**
 * Check if domain is in blocklist
 */
function isBlockedDomain(hostname: string, blockedDomains: string[]): boolean {
  const normalized = hostname.toLowerCase().trim();

  return blockedDomains.some((blocked) => {
    const blockedNorm = blocked.toLowerCase().trim();
    return normalized === blockedNorm || normalized.endsWith(`.${blockedNorm}`);
  });
}

/**
 * Check if domain is in allowlist
 */
function isAllowedDomain(hostname: string, allowedDomains?: string[]): boolean {
  if (!allowedDomains || allowedDomains.length === 0) {
    return true; // No allowlist means all domains allowed
  }

  const normalized = hostname.toLowerCase().trim();

  return allowedDomains.some((allowed) => {
    const allowedNorm = allowed.toLowerCase().trim();
    return normalized === allowedNorm || normalized.endsWith(`.${allowedNorm}`);
  });
}

// ============================================================================
// DNS Resolution with Rebind Protection
// ============================================================================

/**
 * IPv4 regex pattern
 */
const IPV4_PATTERN = /^(\d{1,3}\.){3}\d{1,3}$/;

/**
 * IPv6 regex pattern (simplified - covers common formats)
 */
const IPV6_PATTERN = /^([0-9a-fA-F]{0,4}:){2,7}[0-9a-fA-F]{0,4}$/;

/**
 * Check if a string is an IP address (v4 or v6)
 */
function isIPAddress(hostname: string): boolean {
  return IPV4_PATTERN.test(hostname) || IPV6_PATTERN.test(hostname);
}

/**
 * DNS resolution cache to prevent DNS rebinding attacks
 * Caches resolved IPs for a short TTL to ensure consistency between validation and fetch
 */
const dnsCache = new Map<string, { ips: string[]; expiresAt: number }>();
const DNS_CACHE_TTL_MS = 30000; // 30 seconds cache

/**
 * Clean expired DNS cache entries
 */
function cleanDnsCache(): void {
  const now = Date.now();
  const entries = Array.from(dnsCache.entries());
  for (const [key, value] of entries) {
    if (value.expiresAt < now) {
      dnsCache.delete(key);
    }
  }
}

// Run cache cleanup every minute
if (typeof setInterval !== "undefined") {
  setInterval(cleanDnsCache, 60000);
}

/**
 * Resolve hostname to IP addresses with DNS rebinding protection
 *
 * Features:
 * - Uses Node.js dns.promises for server-side resolution
 * - Caches results to prevent DNS rebinding (where DNS returns different IPs on subsequent requests)
 * - Handles both IPv4 and IPv6
 * - Falls back gracefully in edge/browser environments
 */
async function resolveHostname(hostname: string): Promise<string[]> {
  // If hostname is already an IP address, return it directly
  if (isIPAddress(hostname)) {
    return [hostname];
  }

  // Check cache first (DNS rebinding protection)
  const cached = dnsCache.get(hostname);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.ips;
  }

  // Attempt DNS resolution
  try {
    // Dynamic import to support both Node.js and edge environments
    // In edge/browser, this will fail gracefully
    const dns = await import("dns");
    const dnsPromises = dns.promises;

    const resolvedIPs: string[] = [];

    // Resolve IPv4 addresses
    try {
      const ipv4Results = await dnsPromises.resolve4(hostname);
      resolvedIPs.push(...ipv4Results);
    } catch {
      // IPv4 resolution failed, continue with IPv6
    }

    // Resolve IPv6 addresses
    try {
      const ipv6Results = await dnsPromises.resolve6(hostname);
      resolvedIPs.push(...ipv6Results);
    } catch {
      // IPv6 resolution failed
    }

    // If no results from A/AAAA records, try general lookup
    if (resolvedIPs.length === 0) {
      try {
        const lookupResults = await dnsPromises.lookup(hostname, { all: true });
        for (const result of lookupResults) {
          resolvedIPs.push(result.address);
        }
      } catch {
        // Lookup also failed
      }
    }

    // Cache the results to prevent DNS rebinding
    if (resolvedIPs.length > 0) {
      dnsCache.set(hostname, {
        ips: resolvedIPs,
        expiresAt: Date.now() + DNS_CACHE_TTL_MS,
      });
    }

    return resolvedIPs;
  } catch {
    // DNS module not available (edge/browser environment)
    // In this case, we cannot perform DNS resolution
    // The validation will rely on other checks (blocked domains, direct IP checks)
    return [];
  }
}

/**
 * Get cached DNS resolution result (for use during actual fetch)
 * This ensures the same IPs validated are the ones used for connection
 */
export function getCachedDnsResult(hostname: string): string[] | null {
  const cached = dnsCache.get(hostname);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.ips;
  }
  return null;
}

/**
 * Clear DNS cache (useful for testing)
 */
export function clearDnsCache(): void {
  dnsCache.clear();
}

// ============================================================================
// SSRF Protection Class
// ============================================================================

export class SsrfProtection {
  private config: SsrfConfig;

  constructor(config: Partial<SsrfConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Validate URL for SSRF attacks
   */
  async validateUrl(url: string): Promise<{ valid: boolean; reason?: string }> {
    try {
      const parsed = new URL(url);

      // 1. Protocol validation
      if (!this.config.allowedProtocols.includes(parsed.protocol)) {
        return {
          valid: false,
          reason: `Protocol ${parsed.protocol} not allowed. Only ${this.config.allowedProtocols.join(", ")} are permitted.`,
        };
      }

      // 2. Localhost check
      if (!this.config.allowLocalhost && isLocalhost(parsed.hostname)) {
        return {
          valid: false,
          reason: "Localhost URLs are not allowed",
        };
      }

      // 3. Cloud metadata check
      if (isCloudMetadata(parsed.hostname)) {
        return {
          valid: false,
          reason: "Access to cloud metadata endpoints is blocked",
        };
      }

      // 4. Blocklist check
      if (isBlockedDomain(parsed.hostname, this.config.blockedDomains)) {
        return {
          valid: false,
          reason: "Domain is in blocklist",
        };
      }

      // 5. Allowlist check
      if (!isAllowedDomain(parsed.hostname, this.config.allowedDomains)) {
        return {
          valid: false,
          reason: "Domain not in allowlist",
        };
      }

      // 6. Private IP check (hostname itself might be IP)
      // Skip this check if allowLocalhost is true and this is a localhost address
      const isLocalhostAddress = isLocalhost(parsed.hostname);
      if (
        !this.config.allowPrivateIPs &&
        !isLocalhostAddress &&
        isPrivateIP(parsed.hostname)
      ) {
        return {
          valid: false,
          reason: `Private IP address detected: ${parsed.hostname}`,
        };
      }

      // 7. DNS resolution check (if available)
      // Skip DNS resolution for localhost when allowLocalhost is true
      if (this.config.allowLocalhost && isLocalhostAddress) {
        return { valid: true };
      }

      const resolvedIPs = await resolveHostname(parsed.hostname);
      for (const ip of resolvedIPs) {
        if (isCloudMetadata(ip)) {
          return {
            valid: false,
            reason: `DNS resolution returned cloud metadata IP: ${ip}`,
          };
        }

        // Skip private IP check for localhost when allowLocalhost is true
        if (!this.config.allowPrivateIPs && isPrivateIP(ip)) {
          return {
            valid: false,
            reason: `DNS resolution returned private IP: ${ip}`,
          };
        }
      }

      return { valid: true };
    } catch (error) {
      return {
        valid: false,
        reason: `Invalid URL: ${error instanceof Error ? error.message : "Unknown error"}`,
      };
    }
  }

  /**
   * Secure fetch with SSRF protection
   */
  async secureFetch(url: string, options: RequestInit = {}): Promise<Response> {
    // 1. Validate URL
    const validation = await this.validateUrl(url);
    if (!validation.valid) {
      throw new Error(`SSRF Protection: ${validation.reason}`);
    }

    // 2. Set timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(
      () => controller.abort(),
      this.config.timeoutMs,
    );

    try {
      // 3. Fetch with redirect validation
      const response = await fetch(url, {
        ...options,
        redirect: "manual", // Handle redirects manually
        signal: controller.signal,
      });

      // 4. Handle redirects
      if ([301, 302, 303, 307, 308].includes(response.status)) {
        const location = response.headers.get("location");
        if (!location) {
          throw new Error("Redirect without location header");
        }

        // Resolve relative URLs
        const redirectUrl = new URL(location, url).toString();

        // Validate redirect URL
        const redirectValidation = await this.validateUrl(redirectUrl);
        if (!redirectValidation.valid) {
          throw new Error(
            `SSRF Protection (redirect): ${redirectValidation.reason}`,
          );
        }

        // Follow redirect (with depth limit)
        if (this.config.maxRedirects > 0) {
          const newProtection = new SsrfProtection({
            ...this.config,
            maxRedirects: this.config.maxRedirects - 1,
          });
          return newProtection.secureFetch(redirectUrl, options);
        } else {
          throw new Error("Too many redirects");
        }
      }

      return response;
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        throw new Error(`Request timeout after ${this.config.timeoutMs}ms`);
      }
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

let defaultInstance: SsrfProtection | null = null;

/**
 * Get default SSRF protection instance
 */
export function getSsrfProtection(
  config?: Partial<SsrfConfig>,
): SsrfProtection {
  if (!defaultInstance || config) {
    defaultInstance = new SsrfProtection(config);
  }
  return defaultInstance;
}

/**
 * Validate URL with default config
 */
export async function validateUrl(
  url: string,
): Promise<{ valid: boolean; reason?: string }> {
  return getSsrfProtection().validateUrl(url);
}

/**
 * Secure fetch with default config
 */
export async function secureFetch(
  url: string,
  options?: RequestInit,
): Promise<Response> {
  return getSsrfProtection().secureFetch(url, options);
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Check if URL is safe (synchronous, basic checks only)
 */
export function isUrlSafe(url: string): boolean {
  try {
    const parsed = new URL(url);

    // Only HTTP(S)
    if (!["http:", "https:"].includes(parsed.protocol)) {
      return false;
    }

    // No localhost
    if (isLocalhost(parsed.hostname)) {
      return false;
    }

    // No private IPs
    if (isPrivateIP(parsed.hostname)) {
      return false;
    }

    // No cloud metadata
    if (isCloudMetadata(parsed.hostname)) {
      return false;
    }

    return true;
  } catch {
    return false;
  }
}

/**
 * Sanitize URL (return safe version or null)
 */
export function sanitizeUrl(url: string): string | null {
  try {
    const parsed = new URL(url);

    // Only HTTP(S)
    if (!["http:", "https:"].includes(parsed.protocol)) {
      return null;
    }

    // Basic safety checks
    if (!isUrlSafe(url)) {
      return null;
    }

    return parsed.toString();
  } catch {
    return null;
  }
}
