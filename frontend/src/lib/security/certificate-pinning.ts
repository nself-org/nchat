/**
 * Certificate Pinning Module
 *
 * Provides certificate pinning functionality for mobile and desktop applications
 * to prevent man-in-the-middle attacks.
 *
 * Features:
 * - SPKI (Subject Public Key Info) pin generation and validation
 * - Pin backup and rotation support
 * - Platform-specific pinning configurations
 * - Certificate chain validation
 *
 * @module lib/security/certificate-pinning
 */

import { createHash, X509Certificate } from "crypto";

import { logger } from "@/lib/logger";

// ============================================================================
// Types
// ============================================================================

/**
 * Certificate pin format
 */
export type PinFormat = "sha256" | "sha384" | "sha512";

/**
 * Platform type for pinning configuration
 */
export type PlatformType =
  | "ios"
  | "android"
  | "electron"
  | "tauri"
  | "web"
  | "react-native";

/**
 * Certificate pin entry
 */
export interface CertificatePin {
  /** Pin identifier (for debugging) */
  id: string;
  /** Domain pattern (supports wildcards) */
  domain: string;
  /** Pin hash algorithm */
  algorithm: PinFormat;
  /** Base64-encoded SPKI hash */
  hash: string;
  /** Pin expiration date */
  expiresAt: Date;
  /** Whether this is a backup pin */
  isBackup: boolean;
  /** Optional description */
  description?: string;
}

/**
 * Certificate pinning configuration
 */
export interface CertificatePinningConfig {
  /** Enable certificate pinning */
  enabled: boolean;
  /** List of certificate pins */
  pins: CertificatePin[];
  /** Include subdomains in pinning */
  includeSubdomains: boolean;
  /** Report URI for pin violations */
  reportUri?: string;
  /** Report-Only mode (log but don't block) */
  reportOnly: boolean;
  /** Maximum pin age in seconds */
  maxAge: number;
  /** Enforce expect-ct header */
  expectCT: boolean;
  /** Expect-CT max-age */
  expectCTMaxAge: number;
}

/**
 * Pin validation result
 */
export interface PinValidationResult {
  /** Whether the certificate is pinned correctly */
  valid: boolean;
  /** Matched pin (if any) */
  matchedPin?: CertificatePin;
  /** Certificate chain hashes */
  chainHashes: string[];
  /** Validation errors */
  errors: string[];
  /** Certificate details */
  certificateInfo?: {
    subject: string;
    issuer: string;
    validFrom: Date;
    validTo: Date;
    serialNumber: string;
  };
}

/**
 * Platform-specific pinning configuration
 */
export interface PlatformPinConfig {
  /** Platform type */
  platform: PlatformType;
  /** Configuration format (native format for each platform) */
  config: Record<string, unknown>;
  /** Raw configuration string (if applicable) */
  rawConfig?: string;
}

/**
 * Pin report for violations
 */
export interface PinViolationReport {
  /** Report timestamp */
  timestamp: Date;
  /** Hostname that failed pinning */
  hostname: string;
  /** Port number */
  port: number;
  /** Expected pins */
  expectedPins: string[];
  /** Actual certificate hash */
  actualHash: string;
  /** Certificate chain */
  certificateChain: string[];
  /** User agent (if available) */
  userAgent?: string;
  /** Application version */
  appVersion?: string;
  /** Platform */
  platform: PlatformType;
  /** Whether connection was blocked */
  blocked: boolean;
}

// ============================================================================
// Constants
// ============================================================================

/**
 * Default certificate pinning configuration
 */
export const DEFAULT_PINNING_CONFIG: CertificatePinningConfig = {
  enabled: process.env.NODE_ENV === "production",
  pins: [],
  includeSubdomains: true,
  reportUri: "/api/security/pin-report",
  reportOnly: false,
  maxAge: 2592000, // 30 days
  expectCT: true,
  expectCTMaxAge: 86400, // 1 day
};

/**
 * Pin header name (HTTP Public Key Pinning - deprecated but still useful)
 */
export const HPKP_HEADER = "Public-Key-Pins";
export const HPKP_REPORT_ONLY_HEADER = "Public-Key-Pins-Report-Only";
export const EXPECT_CT_HEADER = "Expect-CT";

/**
 * Minimum recommended pins (1 primary + 1 backup)
 */
export const MIN_RECOMMENDED_PINS = 2;

/**
 * Maximum pin age (1 year)
 */
export const MAX_PIN_AGE = 31536000;

/**
 * Common CA SPKI hashes for backup pins
 */
export const COMMON_CA_PINS: Record<string, string> = {
  // Let's Encrypt
  "LetsEncrypt-ISRG-Root-X1": "C5+lpZ7tcVwmwQIMcRtPbsQtWLABXhQzejna0wHFr8M=",
  "LetsEncrypt-ISRG-Root-X2": "diGVwiVYbubAI3RW4hB9xU8e/CH2GnkuvVFZE8zmgzI=",
  "LetsEncrypt-R3": "jQJTbIh0grw0/1TkHSumWb+Fs0Ggogr621gT3PvPKG0=",
  "LetsEncrypt-E1": "J2/oqMTsdhFWW/n85tys6b4yDBtb6idZayIEBx7QTxA=",

  // DigiCert
  "DigiCert-Global-Root-CA": "r/mIkG3eEpVdm+u/ko/cwxzOMo1bk4TyHIlByibiA5E=",
  "DigiCert-Global-Root-G2": "i7WTqTvh0OioIruIfFR4kMPnBqrS2rdiVPl/s2uC/CY=",
  "DigiCert-Global-Root-G3": "uUwZgwDOxcBXrQcntwu+kYFpkiVkOaezL0WYEZ3anJc=",

  // Cloudflare
  "Cloudflare-Origin-CA": "FZxnPq1qxCZ8CIZdxTRbQAD/mAKjO9gAAD3vVvXj6I4=",

  // Amazon
  "Amazon-Root-CA-1": "++MBgDH5WGvL9Bcn5Be30cRcL0f5O+NyoXuWtQdX1aI=",
  "Amazon-Root-CA-2": "f0KW/FtqTjs108NpYj42SrGvOB2PpxIVM8nWxjPqJGE=",

  // Google Trust Services
  "GTS-Root-R1": "hxqRlPTu1bMS/0DITB1SSu0vd4u/8l8TjPgfaAp63Gc=",
  "GTS-Root-R2": "Vfd95BwDeSQo+NUYxVEEIlvkOlWY2SalKK1lPhzOx78=",
};

// ============================================================================
// SPKI Hash Generation
// ============================================================================

/**
 * Generate SPKI hash from a certificate
 *
 * @param certificate - PEM-encoded certificate or X509Certificate object
 * @param algorithm - Hash algorithm to use
 * @returns Base64-encoded SPKI hash
 */
export function generateSPKIHash(
  certificate: string | X509Certificate,
  algorithm: PinFormat = "sha256",
): string {
  try {
    const cert =
      typeof certificate === "string"
        ? new X509Certificate(certificate)
        : certificate;

    // Get the public key in SPKI format
    const publicKey = cert.publicKey;

    // Export the public key to DER format (SPKI)
    const spkiBuffer = publicKey.export({ type: "spki", format: "der" });

    // Hash the SPKI
    const hash = createHash(algorithm).update(spkiBuffer).digest("base64");

    return hash;
  } catch (error) {
    throw new Error(
      `Failed to generate SPKI hash: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
}

/**
 * Generate SPKI hash from a public key
 *
 * @param publicKey - PEM-encoded public key
 * @param algorithm - Hash algorithm to use
 * @returns Base64-encoded SPKI hash
 */
export function generateSPKIHashFromPublicKey(
  publicKey: string,
  algorithm: PinFormat = "sha256",
): string {
  try {
    const { createPublicKey } = require("crypto");
    const key = createPublicKey(publicKey);

    // Export the public key to DER format (SPKI)
    const spkiBuffer = key.export({ type: "spki", format: "der" });

    // Hash the SPKI
    const hash = createHash(algorithm).update(spkiBuffer).digest("base64");

    return hash;
  } catch (error) {
    throw new Error(
      `Failed to generate SPKI hash from public key: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
}

/**
 * Generate multiple SPKI hashes from a certificate chain
 *
 * @param chain - Array of PEM-encoded certificates (leaf first)
 * @param algorithm - Hash algorithm to use
 * @returns Array of base64-encoded SPKI hashes
 */
export function generateChainSPKIHashes(
  chain: string[],
  algorithm: PinFormat = "sha256",
): string[] {
  return chain.map((cert) => generateSPKIHash(cert, algorithm));
}

// ============================================================================
// Pin Management
// ============================================================================

/**
 * Create a certificate pin entry
 *
 * @param options - Pin options
 * @returns Certificate pin entry
 */
export function createCertificatePin(options: {
  domain: string;
  hash: string;
  algorithm?: PinFormat;
  expiresAt?: Date;
  isBackup?: boolean;
  description?: string;
}): CertificatePin {
  const id = `pin-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;

  return {
    id,
    domain: options.domain,
    algorithm: options.algorithm || "sha256",
    hash: options.hash,
    expiresAt: options.expiresAt || new Date(Date.now() + MAX_PIN_AGE * 1000),
    isBackup: options.isBackup || false,
    description: options.description,
  };
}

/**
 * Check if a pin has expired
 *
 * @param pin - Certificate pin to check
 * @returns True if pin has expired
 */
export function isPinExpired(pin: CertificatePin): boolean {
  return new Date() > pin.expiresAt;
}

/**
 * Get valid pins for a domain
 *
 * @param pins - All configured pins
 * @param domain - Domain to match
 * @returns Valid pins for the domain
 */
export function getValidPinsForDomain(
  pins: CertificatePin[],
  domain: string,
): CertificatePin[] {
  return pins.filter((pin) => {
    // Check expiration
    if (isPinExpired(pin)) {
      return false;
    }

    // Check domain match
    return matchDomain(pin.domain, domain);
  });
}

/**
 * Match a domain against a pattern (supports wildcards)
 *
 * @param pattern - Domain pattern (e.g., *.example.com)
 * @param domain - Domain to match
 * @returns True if domain matches pattern
 */
export function matchDomain(pattern: string, domain: string): boolean {
  const patternLower = pattern.toLowerCase();
  const domainLower = domain.toLowerCase();

  // Exact match
  if (patternLower === domainLower) {
    return true;
  }

  // Wildcard match
  if (patternLower.startsWith("*.")) {
    const suffix = patternLower.substring(2); // e.g., "example.com" from "*.example.com"

    // Domain must be a subdomain, not the root domain itself
    // e.g., "sub.example.com" matches "*.example.com", but "example.com" does not
    if (domainLower === suffix) {
      return false; // Root domain doesn't match wildcard
    }

    // Check if domain ends with ".suffix" (including the dot)
    if (domainLower.endsWith(`.${suffix}`)) {
      // Ensure the wildcard matches exactly one level (no nested subdomains)
      const prefix = domainLower.substring(
        0,
        domainLower.length - suffix.length - 1,
      );
      return !prefix.includes(".");
    }
  }

  return false;
}

/**
 * Validate a pin set configuration
 *
 * @param pins - Pins to validate
 * @returns Validation result
 */
export function validatePinSet(pins: CertificatePin[]): {
  valid: boolean;
  warnings: string[];
  errors: string[];
} {
  const warnings: string[] = [];
  const errors: string[] = [];

  // Check for minimum pins
  if (pins.length < MIN_RECOMMENDED_PINS) {
    warnings.push(
      `Recommended minimum of ${MIN_RECOMMENDED_PINS} pins not met (have ${pins.length})`,
    );
  }

  // Check for backup pins
  const backupPins = pins.filter((p) => p.isBackup);
  if (backupPins.length === 0) {
    warnings.push(
      "No backup pins configured. Include backup pins for key rotation.",
    );
  }

  // Check for expiring pins
  const thirtyDaysFromNow = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  const expiringPins = pins.filter((p) => p.expiresAt < thirtyDaysFromNow);
  if (expiringPins.length > 0) {
    warnings.push(`${expiringPins.length} pin(s) expiring within 30 days`);
  }

  // Check for already expired pins
  const expiredPins = pins.filter(isPinExpired);
  if (expiredPins.length > 0) {
    errors.push(`${expiredPins.length} pin(s) have already expired`);
  }

  // Check for duplicate hashes
  const hashSet = new Set<string>();
  for (const pin of pins) {
    if (hashSet.has(pin.hash)) {
      warnings.push(
        `Duplicate pin hash found: ${pin.hash.substring(0, 20)}...`,
      );
    }
    hashSet.add(pin.hash);
  }

  // Check hash format
  for (const pin of pins) {
    try {
      const decoded = Buffer.from(pin.hash, "base64");
      const expectedLength =
        pin.algorithm === "sha256" ? 32 : pin.algorithm === "sha384" ? 48 : 64;

      if (decoded.length !== expectedLength) {
        errors.push(
          `Invalid hash length for pin ${pin.id}: expected ${expectedLength} bytes`,
        );
      }
    } catch {
      errors.push(`Invalid base64 encoding for pin ${pin.id}`);
    }
  }

  return {
    valid: errors.length === 0,
    warnings,
    errors,
  };
}

// ============================================================================
// Pin Validation
// ============================================================================

/**
 * Validate a certificate against configured pins
 *
 * @param certificate - PEM-encoded certificate
 * @param pins - Configured pins
 * @param domain - Domain being validated
 * @returns Validation result
 */
export function validateCertificatePin(
  certificate: string,
  pins: CertificatePin[],
  domain: string,
): PinValidationResult {
  const errors: string[] = [];
  let matchedPin: CertificatePin | undefined;

  try {
    const cert = new X509Certificate(certificate);

    // Generate hash for the certificate
    const validPins = getValidPinsForDomain(pins, domain);

    if (validPins.length === 0) {
      errors.push(`No valid pins configured for domain: ${domain}`);
      return {
        valid: false,
        chainHashes: [],
        errors,
      };
    }

    // Check each valid pin
    for (const pin of validPins) {
      const hash = generateSPKIHash(cert, pin.algorithm);

      if (hash === pin.hash) {
        matchedPin = pin;

        return {
          valid: true,
          matchedPin,
          chainHashes: [hash],
          errors: [],
          certificateInfo: {
            subject: cert.subject,
            issuer: cert.issuer,
            validFrom: new Date(cert.validFrom),
            validTo: new Date(cert.validTo),
            serialNumber: cert.serialNumber,
          },
        };
      }
    }

    // No match found
    const actualHash = generateSPKIHash(cert, "sha256");
    errors.push(
      `Certificate hash ${actualHash} does not match any configured pins`,
    );

    return {
      valid: false,
      chainHashes: [actualHash],
      errors,
      certificateInfo: {
        subject: cert.subject,
        issuer: cert.issuer,
        validFrom: new Date(cert.validFrom),
        validTo: new Date(cert.validTo),
        serialNumber: cert.serialNumber,
      },
    };
  } catch (error) {
    errors.push(
      `Certificate parsing failed: ${error instanceof Error ? error.message : "Unknown error"}`,
    );

    return {
      valid: false,
      chainHashes: [],
      errors,
    };
  }
}

/**
 * Validate a certificate chain against configured pins
 *
 * @param chain - Array of PEM-encoded certificates (leaf first)
 * @param pins - Configured pins
 * @param domain - Domain being validated
 * @returns Validation result
 */
export function validateCertificateChain(
  chain: string[],
  pins: CertificatePin[],
  domain: string,
): PinValidationResult {
  const chainHashes: string[] = [];
  const errors: string[] = [];

  if (chain.length === 0) {
    errors.push("Empty certificate chain");
    return { valid: false, chainHashes, errors };
  }

  const validPins = getValidPinsForDomain(pins, domain);

  if (validPins.length === 0) {
    errors.push(`No valid pins configured for domain: ${domain}`);
    return { valid: false, chainHashes, errors };
  }

  // Check each certificate in the chain
  for (const certPem of chain) {
    try {
      const cert = new X509Certificate(certPem);

      // Generate hashes for all algorithms in use
      const algorithms = [...new Set(validPins.map((p) => p.algorithm))];

      for (const algorithm of algorithms) {
        const hash = generateSPKIHash(cert, algorithm);
        chainHashes.push(`${algorithm}:${hash}`);

        // Check against pins
        const matchedPin = validPins.find(
          (pin) => pin.algorithm === algorithm && pin.hash === hash,
        );

        if (matchedPin) {
          return {
            valid: true,
            matchedPin,
            chainHashes,
            errors: [],
            certificateInfo: {
              subject: cert.subject,
              issuer: cert.issuer,
              validFrom: new Date(cert.validFrom),
              validTo: new Date(cert.validTo),
              serialNumber: cert.serialNumber,
            },
          };
        }
      }
    } catch (error) {
      errors.push(
        `Failed to parse certificate in chain: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  errors.push("No certificate in chain matches configured pins");

  return { valid: false, chainHashes, errors };
}

// ============================================================================
// Platform-Specific Configurations
// ============================================================================

/**
 * Generate iOS/macOS Network Security Configuration
 *
 * @param config - Certificate pinning configuration
 * @returns iOS NSAppTransportSecurity dictionary
 */
export function generateIOSPinConfig(
  config: CertificatePinningConfig,
): PlatformPinConfig {
  const domains: Record<string, unknown> = {};

  // Group pins by domain
  const pinsByDomain = new Map<string, CertificatePin[]>();
  for (const pin of config.pins) {
    const existing = pinsByDomain.get(pin.domain) || [];
    existing.push(pin);
    pinsByDomain.set(pin.domain, existing);
  }

  for (const [domain, pins] of pinsByDomain) {
    const validPins = pins.filter((p) => !isPinExpired(p));
    if (validPins.length === 0) continue;

    const spkiHashes = validPins.map((p) => `${p.algorithm}/${p.hash}`);

    domains[domain] = {
      NSIncludesSubdomains: config.includeSubdomains,
      NSPinnedLeafIdentities: spkiHashes.map((hash) => ({
        "SPKI-SHA256-BASE64": hash,
      })),
      NSRequiresCertificateTransparency: config.expectCT,
    };
  }

  return {
    platform: "ios",
    config: {
      NSAppTransportSecurity: {
        NSPinnedDomains: domains,
      },
    },
  };
}

/**
 * Generate Android Network Security Configuration
 *
 * @param config - Certificate pinning configuration
 * @returns Android network security config XML
 */
export function generateAndroidPinConfig(
  config: CertificatePinningConfig,
): PlatformPinConfig {
  // Group pins by domain
  const pinsByDomain = new Map<string, CertificatePin[]>();
  for (const pin of config.pins) {
    const existing = pinsByDomain.get(pin.domain) || [];
    existing.push(pin);
    pinsByDomain.set(pin.domain, existing);
  }

  let xml = `<?xml version="1.0" encoding="utf-8"?>
<network-security-config>
    <base-config cleartextTrafficPermitted="false">
        <trust-anchors>
            <certificates src="system" />
        </trust-anchors>
    </base-config>
`;

  for (const [domain, pins] of pinsByDomain) {
    const validPins = pins.filter((p) => !isPinExpired(p));
    if (validPins.length === 0) continue;

    const expirationDate = new Date(
      Math.max(...validPins.map((p) => p.expiresAt.getTime())),
    );
    const expiration = expirationDate.toISOString().split("T")[0];

    xml += `    <domain-config>
        <domain includeSubdomains="${config.includeSubdomains}">${domain.replace(/^\*\./, "")}</domain>
        <pin-set expiration="${expiration}">
`;

    for (const pin of validPins) {
      xml += `            <pin digest="SHA-256">${pin.hash}</pin>
`;
    }

    xml += `        </pin-set>
    </domain-config>
`;
  }

  xml += `</network-security-config>`;

  return {
    platform: "android",
    config: {},
    rawConfig: xml,
  };
}

/**
 * Generate Electron/Node.js pinning configuration
 *
 * @param config - Certificate pinning configuration
 * @returns Electron session configuration
 */
export function generateElectronPinConfig(
  config: CertificatePinningConfig,
): PlatformPinConfig {
  const pinsByDomain = new Map<string, string[]>();

  for (const pin of config.pins) {
    if (isPinExpired(pin)) continue;

    const existing = pinsByDomain.get(pin.domain) || [];
    existing.push(pin.hash);
    pinsByDomain.set(pin.domain, existing);
  }

  return {
    platform: "electron",
    config: {
      certificatePins: Object.fromEntries(pinsByDomain),
      validateCertificate: true,
      onCertificateError: config.reportOnly ? "report" : "block",
      reportUri: config.reportUri,
    },
  };
}

/**
 * Generate Tauri pinning configuration
 *
 * @param config - Certificate pinning configuration
 * @returns Tauri security configuration
 */
export function generateTauriPinConfig(
  config: CertificatePinningConfig,
): PlatformPinConfig {
  const allowedDomains: string[] = [];
  const pinnedCerts: Record<string, string[]> = {};

  for (const pin of config.pins) {
    if (isPinExpired(pin)) continue;

    const domain = pin.domain.replace(/^\*\./, "");
    if (!allowedDomains.includes(domain)) {
      allowedDomains.push(domain);
    }

    pinnedCerts[domain] = pinnedCerts[domain] || [];
    pinnedCerts[domain].push(pin.hash);
  }

  return {
    platform: "tauri",
    config: {
      security: {
        csp: null,
        devCsp: null,
        freezePrototype: true,
        dangerousDisableAssetCspModification: false,
      },
      allowlist: {
        http: {
          all: false,
          request: true,
          scope: allowedDomains.map((d) => `https://${d}/*`),
        },
      },
      pinnedCertificates: pinnedCerts,
    },
  };
}

/**
 * Generate React Native pinning configuration
 *
 * @param config - Certificate pinning configuration
 * @returns React Native TrustKit configuration
 */
export function generateReactNativePinConfig(
  config: CertificatePinningConfig,
): PlatformPinConfig {
  const pinnedDomains: Record<string, unknown> = {};

  // Group pins by domain
  const pinsByDomain = new Map<string, CertificatePin[]>();
  for (const pin of config.pins) {
    const existing = pinsByDomain.get(pin.domain) || [];
    existing.push(pin);
    pinsByDomain.set(pin.domain, existing);
  }

  for (const [domain, pins] of pinsByDomain) {
    const validPins = pins.filter((p) => !isPinExpired(p));
    if (validPins.length === 0) continue;

    const cleanDomain = domain.replace(/^\*\./, "");
    const expirationDate = new Date(
      Math.max(...validPins.map((p) => p.expiresAt.getTime())),
    );

    pinnedDomains[cleanDomain] = {
      kTSKIncludeSubdomains: config.includeSubdomains,
      kTSKPublicKeyHashes: validPins.map((p) => p.hash),
      kTSKEnforcePinning: !config.reportOnly,
      kTSKExpirationDate: expirationDate.toISOString().split("T")[0],
      kTSKReportUris: config.reportUri ? [config.reportUri] : [],
    };
  }

  return {
    platform: "react-native",
    config: {
      kTSKSwizzleNetworkDelegates: true,
      kTSKPinnedDomains: pinnedDomains,
    },
  };
}

/**
 * Generate pinning configuration for all platforms
 *
 * @param config - Certificate pinning configuration
 * @returns Platform configurations
 */
export function generateAllPlatformConfigs(
  config: CertificatePinningConfig,
): PlatformPinConfig[] {
  return [
    generateIOSPinConfig(config),
    generateAndroidPinConfig(config),
    generateElectronPinConfig(config),
    generateTauriPinConfig(config),
    generateReactNativePinConfig(config),
  ];
}

// ============================================================================
// HTTP Headers
// ============================================================================

/**
 * Generate Expect-CT header
 *
 * @param config - Pinning configuration
 * @returns Expect-CT header value
 */
export function generateExpectCTHeader(
  config: CertificatePinningConfig,
): string {
  if (!config.expectCT) {
    return "";
  }

  const parts: string[] = [`max-age=${config.expectCTMaxAge}`];

  if (!config.reportOnly) {
    parts.push("enforce");
  }

  if (config.reportUri) {
    parts.push(`report-uri="${config.reportUri}"`);
  }

  return parts.join(", ");
}

/**
 * Generate Public-Key-Pins header (deprecated but still useful)
 *
 * @param config - Pinning configuration
 * @param domain - Domain for the pins
 * @returns HPKP header value
 */
export function generateHPKPHeader(
  config: CertificatePinningConfig,
  domain: string,
): string {
  if (!config.enabled) {
    return "";
  }

  const validPins = getValidPinsForDomain(config.pins, domain);
  if (validPins.length === 0) {
    return "";
  }

  const parts: string[] = validPins.map(
    (pin) => `pin-${pin.algorithm}="${pin.hash}"`,
  );

  parts.push(`max-age=${config.maxAge}`);

  if (config.includeSubdomains) {
    parts.push("includeSubDomains");
  }

  if (config.reportUri) {
    parts.push(`report-uri="${config.reportUri}"`);
  }

  return parts.join("; ");
}

// ============================================================================
// Violation Reporting
// ============================================================================

/**
 * Create a pin violation report
 *
 * @param options - Report options
 * @returns Pin violation report
 */
export function createPinViolationReport(options: {
  hostname: string;
  port: number;
  expectedPins: CertificatePin[];
  actualHash: string;
  certificateChain: string[];
  userAgent?: string;
  appVersion?: string;
  platform: PlatformType;
  blocked: boolean;
}): PinViolationReport {
  return {
    timestamp: new Date(),
    hostname: options.hostname,
    port: options.port,
    expectedPins: options.expectedPins.map((p) => `${p.algorithm}:${p.hash}`),
    actualHash: options.actualHash,
    certificateChain: options.certificateChain,
    userAgent: options.userAgent,
    appVersion: options.appVersion,
    platform: options.platform,
    blocked: options.blocked,
  };
}

/**
 * Log a pin violation
 *
 * @param report - Pin violation report
 */
export function logPinViolation(report: PinViolationReport): void {
  logger.error("[CERTIFICATE-PINNING] Pin violation detected", undefined, {
    hostname: report.hostname,
    port: report.port,
    platform: report.platform,
    blocked: report.blocked,
    expectedPins: report.expectedPins,
    actualHash: report.actualHash,
    timestamp: report.timestamp.toISOString(),
  });
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Extract certificates from a PEM bundle
 *
 * @param pemBundle - PEM bundle string
 * @returns Array of individual PEM certificates
 */
export function extractCertificatesFromPEM(pemBundle: string): string[] {
  const certificates: string[] = [];
  const regex = /-----BEGIN CERTIFICATE-----[\s\S]*?-----END CERTIFICATE-----/g;

  let match;
  while ((match = regex.exec(pemBundle)) !== null) {
    certificates.push(match[0]);
  }

  return certificates;
}

/**
 * Get certificate info from PEM
 *
 * @param pem - PEM-encoded certificate
 * @returns Certificate information
 */
export function getCertificateInfo(pem: string): {
  subject: string;
  issuer: string;
  validFrom: Date;
  validTo: Date;
  serialNumber: string;
  fingerprint: string;
} {
  const cert = new X509Certificate(pem);

  return {
    subject: cert.subject,
    issuer: cert.issuer,
    validFrom: new Date(cert.validFrom),
    validTo: new Date(cert.validTo),
    serialNumber: cert.serialNumber,
    fingerprint: cert.fingerprint256,
  };
}

/**
 * Check if a certificate is about to expire
 *
 * @param pem - PEM-encoded certificate
 * @param daysThreshold - Days before expiration to consider "expiring soon"
 * @returns True if certificate is expiring soon
 */
export function isCertificateExpiringSoon(
  pem: string,
  daysThreshold: number = 30,
): boolean {
  try {
    const cert = new X509Certificate(pem);
    const validTo = new Date(cert.validTo);
    const threshold = new Date(
      Date.now() + daysThreshold * 24 * 60 * 60 * 1000,
    );

    return validTo < threshold;
  } catch {
    return false;
  }
}

// ============================================================================
// Exports
// ============================================================================

export const CERTIFICATE_PINNING_CONSTANTS = {
  MIN_RECOMMENDED_PINS,
  MAX_PIN_AGE,
  HPKP_HEADER,
  HPKP_REPORT_ONLY_HEADER,
  EXPECT_CT_HEADER,
  COMMON_CA_PINS,
} as const;
