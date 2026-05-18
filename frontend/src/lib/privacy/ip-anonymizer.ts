/**
 * IP Address Anonymizer
 *
 * Provides comprehensive IP address anonymization for privacy protection.
 * Supports multiple anonymization strategies:
 * - Truncation (zero out last octets)
 * - Hashing (one-way transformation)
 * - Geohashing (approximate location)
 * - Complete removal
 *
 * Compliant with GDPR, CCPA, and other privacy regulations.
 *
 * @module lib/privacy/ip-anonymizer
 * @version 1.0.0
 */

import { createLogger } from "@/lib/logger";
import { hashValueSync } from "./metadata-minimizer";

const log = createLogger("IPAnonymizer");

// ============================================================================
// TYPES
// ============================================================================

/**
 * IP address version
 */
export type IPVersion = "ipv4" | "ipv6" | "unknown";

/**
 * Anonymization strategy
 */
export type AnonymizationStrategy =
  | "truncate"
  | "hash"
  | "geohash"
  | "country_only"
  | "remove"
  | "none";

/**
 * Truncation level for IP addresses
 */
export type TruncationLevel = "minimal" | "moderate" | "aggressive" | "maximum";

/**
 * Parsed IP address structure
 */
export interface ParsedIPAddress {
  version: IPVersion;
  original: string;
  normalized: string;
  octets: number[];
  isPrivate: boolean;
  isLoopback: boolean;
  isLinkLocal: boolean;
  isValid: boolean;
}

/**
 * Anonymization result
 */
export interface AnonymizationResult {
  original: string;
  anonymized: string;
  strategy: AnonymizationStrategy;
  version: IPVersion;
  isValid: boolean;
  preservedPrefix?: string;
  hashSuffix?: string;
}

/**
 * Geolocation approximation
 */
export interface GeoApproximation {
  countryCode?: string;
  region?: string;
  precision: "country" | "region" | "city" | "unknown";
}

/**
 * IP anonymizer configuration
 */
export interface IPAnonymizerConfig {
  enabled: boolean;
  defaultStrategy: AnonymizationStrategy;
  truncationLevel: TruncationLevel;
  hashSalt: string;
  preservePrivateIPs: boolean;
  logAnonymization: boolean;
  geoLookupEnabled: boolean;
  countryDatabase?: Map<string, string>; // IP prefix to country code
}

/**
 * Batch anonymization options
 */
export interface BatchAnonymizationOptions {
  strategy?: AnonymizationStrategy;
  skipInvalid?: boolean;
  returnOriginalOnError?: boolean;
}

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * IPv4 patterns
 */
export const IPV4_PATTERN = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;

/**
 * IPv6 full pattern (simplified)
 */
export const IPV6_PATTERN = /^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/;

/**
 * IPv6 compressed pattern
 */
export const IPV6_COMPRESSED_PATTERN =
  /^(([0-9a-fA-F]{1,4}:)*)?::([0-9a-fA-F]{1,4}:)*[0-9a-fA-F]{1,4}$|^::$/;

/**
 * Private IP ranges (IPv4)
 */
export const PRIVATE_IPV4_RANGES: readonly {
  start: number[];
  end: number[];
}[] = [
  { start: [10, 0, 0, 0], end: [10, 255, 255, 255] },
  { start: [172, 16, 0, 0], end: [172, 31, 255, 255] },
  { start: [192, 168, 0, 0], end: [192, 168, 255, 255] },
] as const;

/**
 * Loopback ranges
 */
export const LOOPBACK_IPV4 = {
  start: [127, 0, 0, 0],
  end: [127, 255, 255, 255],
};

/**
 * Link-local ranges
 */
export const LINK_LOCAL_IPV4 = {
  start: [169, 254, 0, 0],
  end: [169, 254, 255, 255],
};

/**
 * Truncation configuration by level
 */
export const TRUNCATION_CONFIG: Record<
  TruncationLevel,
  { ipv4Mask: number; ipv6Mask: number }
> = {
  minimal: { ipv4Mask: 24, ipv6Mask: 48 }, // Preserve 3 octets (IPv4) / 3 hextets (IPv6)
  moderate: { ipv4Mask: 16, ipv6Mask: 32 }, // Preserve 2 octets / 2 hextets
  aggressive: { ipv4Mask: 8, ipv6Mask: 24 }, // Preserve 1 octet / 1.5 hextets
  maximum: { ipv4Mask: 0, ipv6Mask: 0 }, // Remove all specific info
};

/**
 * Default configuration
 */
export const DEFAULT_IP_ANONYMIZER_CONFIG: IPAnonymizerConfig = {
  enabled: true,
  defaultStrategy: "truncate",
  truncationLevel: "moderate",
  hashSalt: "",
  preservePrivateIPs: true,
  logAnonymization: false,
  geoLookupEnabled: false,
};

/**
 * Anonymized placeholder values
 */
export const ANONYMIZED_IPV4 = "0.0.0.0";
export const ANONYMIZED_IPV6 = "::";
export const ANONYMIZED_PLACEHOLDER = "[ANONYMIZED]";

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Detect IP version
 */
export function detectIPVersion(ip: string): IPVersion {
  if (!ip || typeof ip !== "string") {
    return "unknown";
  }

  const trimmed = ip.trim();

  if (IPV4_PATTERN.test(trimmed)) {
    return "ipv4";
  }

  if (
    IPV6_PATTERN.test(trimmed) ||
    IPV6_COMPRESSED_PATTERN.test(trimmed) ||
    trimmed.includes(":")
  ) {
    return "ipv6";
  }

  return "unknown";
}

/**
 * Parse an IPv4 address into octets
 */
export function parseIPv4(ip: string): number[] | null {
  const match = ip.match(IPV4_PATTERN);
  if (!match) {
    return null;
  }

  const octets = [
    parseInt(match[1], 10),
    parseInt(match[2], 10),
    parseInt(match[3], 10),
    parseInt(match[4], 10),
  ];

  // Validate each octet
  if (octets.some((o) => o < 0 || o > 255)) {
    return null;
  }

  return octets;
}

/**
 * Parse an IPv6 address into hextets
 */
export function parseIPv6(ip: string): number[] | null {
  const trimmed = ip.trim().toLowerCase();

  // Handle :: expansion
  let expanded = trimmed;
  if (trimmed.includes("::")) {
    const [before, after] = trimmed.split("::");
    const beforeParts = before ? before.split(":").filter((p) => p) : [];
    const afterParts = after ? after.split(":").filter((p) => p) : [];
    const missingCount = 8 - beforeParts.length - afterParts.length;
    const zeros = Array(missingCount).fill("0");
    expanded = [...beforeParts, ...zeros, ...afterParts].join(":");
  }

  const parts = expanded.split(":");
  if (parts.length !== 8) {
    return null;
  }

  const hextets: number[] = [];
  for (const part of parts) {
    const value = parseInt(part, 16);
    if (isNaN(value) || value < 0 || value > 0xffff) {
      return null;
    }
    hextets.push(value);
  }

  return hextets;
}

/**
 * Check if octets are in a range
 */
function isInRange(octets: number[], start: number[], end: number[]): boolean {
  for (let i = 0; i < 4; i++) {
    if (octets[i] < start[i]) return false;
    if (octets[i] > end[i]) return false;
    if (octets[i] > start[i] && octets[i] < end[i]) return true;
  }
  return true;
}

/**
 * Check if an IPv4 address is private
 */
export function isPrivateIPv4(octets: number[]): boolean {
  return PRIVATE_IPV4_RANGES.some((range) =>
    isInRange(octets, range.start, range.end),
  );
}

/**
 * Check if an IPv4 address is loopback
 */
export function isLoopbackIPv4(octets: number[]): boolean {
  return isInRange(octets, LOOPBACK_IPV4.start, LOOPBACK_IPV4.end);
}

/**
 * Check if an IPv4 address is link-local
 */
export function isLinkLocalIPv4(octets: number[]): boolean {
  return isInRange(octets, LINK_LOCAL_IPV4.start, LINK_LOCAL_IPV4.end);
}

/**
 * Parse and validate an IP address
 */
export function parseIPAddress(ip: string): ParsedIPAddress {
  const version = detectIPVersion(ip);
  const result: ParsedIPAddress = {
    version,
    original: ip,
    normalized: ip.trim().toLowerCase(),
    octets: [],
    isPrivate: false,
    isLoopback: false,
    isLinkLocal: false,
    isValid: false,
  };

  if (version === "ipv4") {
    const octets = parseIPv4(ip);
    if (octets) {
      result.octets = octets;
      result.isValid = true;
      result.isPrivate = isPrivateIPv4(octets);
      result.isLoopback = isLoopbackIPv4(octets);
      result.isLinkLocal = isLinkLocalIPv4(octets);
      result.normalized = octets.join(".");
    }
  } else if (version === "ipv6") {
    const hextets = parseIPv6(ip);
    if (hextets) {
      result.octets = hextets;
      result.isValid = true;
      result.isLoopback =
        hextets.slice(0, 7).every((h) => h === 0) && hextets[7] === 1;
      result.isLinkLocal = hextets[0] === 0xfe80;
      result.normalized = hextets.map((h) => h.toString(16)).join(":");
    }
  }

  return result;
}

/**
 * Truncate an IPv4 address
 */
export function truncateIPv4(octets: number[], maskBits: number): string {
  if (maskBits >= 32) return octets.join(".");
  if (maskBits <= 0) return "0.0.0.0";

  const fullOctets = Math.floor(maskBits / 8);
  const remainingBits = maskBits % 8;

  const result: number[] = [];

  for (let i = 0; i < 4; i++) {
    if (i < fullOctets) {
      result.push(octets[i]);
    } else if (i === fullOctets && remainingBits > 0) {
      const mask = (0xff << (8 - remainingBits)) & 0xff;
      result.push(octets[i] & mask);
    } else {
      result.push(0);
    }
  }

  return result.join(".");
}

/**
 * Truncate an IPv6 address
 */
export function truncateIPv6(hextets: number[], maskBits: number): string {
  if (maskBits >= 128) return hextets.map((h) => h.toString(16)).join(":");
  if (maskBits <= 0) return "::";

  const fullHextets = Math.floor(maskBits / 16);
  const remainingBits = maskBits % 16;

  const result: number[] = [];

  for (let i = 0; i < 8; i++) {
    if (i < fullHextets) {
      result.push(hextets[i]);
    } else if (i === fullHextets && remainingBits > 0) {
      const mask = (0xffff << (16 - remainingBits)) & 0xffff;
      result.push(hextets[i] & mask);
    } else {
      result.push(0);
    }
  }

  // Compress the result
  return compressIPv6(result);
}

/**
 * Compress an IPv6 address to shortest form
 */
export function compressIPv6(hextets: number[]): string {
  // Find the longest run of zeros
  let longestStart = -1;
  let longestLength = 0;
  let currentStart = -1;
  let currentLength = 0;

  for (let i = 0; i < 8; i++) {
    if (hextets[i] === 0) {
      if (currentStart === -1) {
        currentStart = i;
        currentLength = 1;
      } else {
        currentLength++;
      }
    } else {
      if (currentLength > longestLength) {
        longestStart = currentStart;
        longestLength = currentLength;
      }
      currentStart = -1;
      currentLength = 0;
    }
  }

  if (currentLength > longestLength) {
    longestStart = currentStart;
    longestLength = currentLength;
  }

  // Build the compressed string
  if (longestLength >= 2) {
    const before = hextets.slice(0, longestStart).map((h) => h.toString(16));
    const after = hextets
      .slice(longestStart + longestLength)
      .map((h) => h.toString(16));

    if (before.length === 0 && after.length === 0) {
      return "::";
    } else if (before.length === 0) {
      return "::" + after.join(":");
    } else if (after.length === 0) {
      return before.join(":") + "::";
    } else {
      return before.join(":") + "::" + after.join(":");
    }
  }

  return hextets.map((h) => h.toString(16)).join(":");
}

/**
 * Hash an IP address
 */
export function hashIPAddress(ip: string, salt: string = ""): string {
  return hashValueSync(ip, salt);
}

// ============================================================================
// IP ANONYMIZER CLASS
// ============================================================================

/**
 * IP address anonymizer
 */
export class IPAnonymizer {
  private config: IPAnonymizerConfig;
  private anonymizationCount = 0;

  constructor(config: Partial<IPAnonymizerConfig> = {}) {
    this.config = { ...DEFAULT_IP_ANONYMIZER_CONFIG, ...config };
    log.info("IPAnonymizer initialized", {
      strategy: this.config.defaultStrategy,
    });
  }

  /**
   * Anonymize an IP address
   */
  anonymize(ip: string, strategy?: AnonymizationStrategy): AnonymizationResult {
    const useStrategy = strategy ?? this.config.defaultStrategy;
    const parsed = parseIPAddress(ip);

    const result: AnonymizationResult = {
      original: ip,
      anonymized: ip,
      strategy: useStrategy,
      version: parsed.version,
      isValid: parsed.isValid,
    };

    if (!this.config.enabled) {
      return result;
    }

    if (!parsed.isValid) {
      result.anonymized = ANONYMIZED_PLACEHOLDER;
      return result;
    }

    // Optionally preserve private/loopback IPs
    if (
      this.config.preservePrivateIPs &&
      (parsed.isPrivate || parsed.isLoopback || parsed.isLinkLocal)
    ) {
      result.strategy = "none";
      return result;
    }

    switch (useStrategy) {
      case "truncate":
        result.anonymized = this.truncate(parsed);
        break;

      case "hash":
        result.anonymized = this.hash(parsed);
        result.hashSuffix = result.anonymized.substring(0, 8);
        break;

      case "geohash":
        result.anonymized = this.geohash(parsed);
        break;

      case "country_only":
        result.anonymized = this.countryOnly(parsed);
        break;

      case "remove":
        result.anonymized =
          parsed.version === "ipv4" ? ANONYMIZED_IPV4 : ANONYMIZED_IPV6;
        break;

      case "none":
      default:
        // Keep original
        break;
    }

    this.anonymizationCount++;

    if (this.config.logAnonymization) {
      log.debug("IP anonymized", {
        version: parsed.version,
        strategy: useStrategy,
        preserved: result.anonymized === ip,
      });
    }

    return result;
  }

  /**
   * Truncate IP address (mask last bits)
   */
  private truncate(parsed: ParsedIPAddress): string {
    const config = TRUNCATION_CONFIG[this.config.truncationLevel];

    if (parsed.version === "ipv4") {
      return truncateIPv4(parsed.octets, config.ipv4Mask);
    } else if (parsed.version === "ipv6") {
      return truncateIPv6(parsed.octets, config.ipv6Mask);
    }

    return parsed.original;
  }

  /**
   * Hash IP address
   */
  private hash(parsed: ParsedIPAddress): string {
    const hash = hashIPAddress(parsed.normalized, this.config.hashSalt);
    return `ip_${hash}`;
  }

  /**
   * Geohash approximation (placeholder - would use GeoIP lookup)
   */
  private geohash(parsed: ParsedIPAddress): string {
    // In a real implementation, this would use a GeoIP database
    // For now, return truncated IP as approximation
    const config = TRUNCATION_CONFIG.aggressive;
    if (parsed.version === "ipv4") {
      return truncateIPv4(parsed.octets, config.ipv4Mask);
    }
    return truncateIPv6(parsed.octets, config.ipv6Mask);
  }

  /**
   * Return only country information (placeholder)
   */
  private countryOnly(parsed: ParsedIPAddress): string {
    // In a real implementation, this would look up the country
    // For now, return a generic country placeholder
    if (this.config.countryDatabase && parsed.version === "ipv4") {
      const prefix = parsed.octets.slice(0, 2).join(".");
      const country = this.config.countryDatabase.get(prefix);
      if (country) {
        return `country:${country}`;
      }
    }
    return "country:unknown";
  }

  /**
   * Anonymize multiple IP addresses
   */
  anonymizeBatch(
    ips: string[],
    options?: BatchAnonymizationOptions,
  ): AnonymizationResult[] {
    return ips.map((ip) => {
      try {
        return this.anonymize(ip, options?.strategy);
      } catch (error) {
        if (options?.skipInvalid) {
          return {
            original: ip,
            anonymized: options.returnOriginalOnError
              ? ip
              : ANONYMIZED_PLACEHOLDER,
            strategy: this.config.defaultStrategy,
            version: "unknown" as IPVersion,
            isValid: false,
          };
        }
        throw error;
      }
    });
  }

  /**
   * Check if an IP should be anonymized
   */
  shouldAnonymize(ip: string): boolean {
    if (!this.config.enabled) {
      return false;
    }

    const parsed = parseIPAddress(ip);

    if (!parsed.isValid) {
      return true; // Invalid IPs should be anonymized
    }

    if (
      this.config.preservePrivateIPs &&
      (parsed.isPrivate || parsed.isLoopback || parsed.isLinkLocal)
    ) {
      return false;
    }

    return true;
  }

  /**
   * Get anonymization statistics
   */
  getStats(): {
    enabled: boolean;
    strategy: AnonymizationStrategy;
    truncationLevel: TruncationLevel;
    anonymizationCount: number;
    preservePrivateIPs: boolean;
  } {
    return {
      enabled: this.config.enabled,
      strategy: this.config.defaultStrategy,
      truncationLevel: this.config.truncationLevel,
      anonymizationCount: this.anonymizationCount,
      preservePrivateIPs: this.config.preservePrivateIPs,
    };
  }

  /**
   * Reset statistics
   */
  resetStats(): void {
    this.anonymizationCount = 0;
  }

  // ============================================================================
  // CONFIGURATION
  // ============================================================================

  /**
   * Get configuration
   */
  getConfig(): IPAnonymizerConfig {
    return { ...this.config };
  }

  /**
   * Update configuration
   */
  updateConfig(updates: Partial<IPAnonymizerConfig>): void {
    this.config = { ...this.config, ...updates };
    log.info("IPAnonymizer configuration updated");
  }

  /**
   * Set enabled state
   */
  setEnabled(enabled: boolean): void {
    this.config.enabled = enabled;
    log.info("IPAnonymizer enabled state changed", { enabled });
  }

  /**
   * Set anonymization strategy
   */
  setStrategy(strategy: AnonymizationStrategy): void {
    this.config.defaultStrategy = strategy;
    log.info("IPAnonymizer strategy changed", { strategy });
  }

  /**
   * Set truncation level
   */
  setTruncationLevel(level: TruncationLevel): void {
    this.config.truncationLevel = level;
    log.info("IPAnonymizer truncation level changed", { level });
  }

  /**
   * Set hash salt
   */
  setHashSalt(salt: string): void {
    this.config.hashSalt = salt;
  }

  /**
   * Check if anonymization is enabled
   */
  isEnabled(): boolean {
    return this.config.enabled;
  }
}

// ============================================================================
// SINGLETON
// ============================================================================

let anonymizerInstance: IPAnonymizer | null = null;

/**
 * Get or create the IP anonymizer singleton
 */
export function getIPAnonymizer(
  config?: Partial<IPAnonymizerConfig>,
): IPAnonymizer {
  if (!anonymizerInstance) {
    anonymizerInstance = new IPAnonymizer(config);
  } else if (config) {
    anonymizerInstance.updateConfig(config);
  }
  return anonymizerInstance;
}

/**
 * Create a new IP anonymizer instance
 */
export function createIPAnonymizer(
  config?: Partial<IPAnonymizerConfig>,
): IPAnonymizer {
  return new IPAnonymizer(config);
}

/**
 * Reset the singleton (for testing)
 */
export function resetIPAnonymizer(): void {
  anonymizerInstance = null;
}

/**
 * Quick anonymize function using default settings
 */
export function anonymizeIP(
  ip: string,
  strategy?: AnonymizationStrategy,
): string {
  return getIPAnonymizer().anonymize(ip, strategy).anonymized;
}

export default IPAnonymizer;
