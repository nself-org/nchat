/**
 * Transport Security Module
 *
 * Provides TLS configuration, HSTS implementation, and transport layer
 * security utilities for the nself-chat platform.
 *
 * Features:
 * - TLS 1.2/1.3 enforcement
 * - HSTS header generation with preload support
 * - Secure cookie configuration
 * - Transport security audit logging
 *
 * @module lib/security/transport-security
 */

import { createHash, randomBytes } from "crypto";

import { logger } from "@/lib/logger";

/**
 * Cookie serialization options (compatible with cookie package)
 */
export interface CookieSerializeOptions {
  /** Cookie domain */
  domain?: string;
  /** Cookie expiration date */
  expires?: Date;
  /** Cookie is only sent to the server on HTTPS */
  httpOnly?: boolean;
  /** Cookie max age in seconds */
  maxAge?: number;
  /** Cookie path */
  path?: string;
  /** Priority of the cookie */
  priority?: "low" | "medium" | "high";
  /** SameSite cookie attribute */
  sameSite?: boolean | "lax" | "strict" | "none";
  /** Cookie is only sent over HTTPS */
  secure?: boolean;
}

// ============================================================================
// Types
// ============================================================================

/**
 * TLS version enum
 */
export enum TLSVersion {
  TLS_1_0 = "TLSv1",
  TLS_1_1 = "TLSv1.1",
  TLS_1_2 = "TLSv1.2",
  TLS_1_3 = "TLSv1.3",
}

/**
 * TLS configuration options
 */
export interface TLSConfig {
  /** Minimum TLS version allowed */
  minVersion: TLSVersion;
  /** Preferred TLS version */
  preferredVersion: TLSVersion;
  /** Allowed cipher suites (empty = use defaults) */
  cipherSuites: string[];
  /** Enable OCSP stapling */
  ocspStapling: boolean;
  /** Enable session resumption */
  sessionResumption: boolean;
  /** Session ticket lifetime in seconds */
  sessionTicketLifetime: number;
  /** Enable 0-RTT (TLS 1.3 early data) */
  zeroRtt: boolean;
}

/**
 * HSTS configuration options
 */
export interface HSTSConfig {
  /** Max age in seconds */
  maxAge: number;
  /** Include subdomains */
  includeSubDomains: boolean;
  /** HSTS preload flag */
  preload: boolean;
  /** Enable HSTS (disabled in development by default) */
  enabled: boolean;
}

/**
 * Secure cookie configuration
 */
export interface SecureCookieConfig {
  /** Cookie is only sent over HTTPS */
  secure: boolean;
  /** Cookie cannot be accessed by JavaScript */
  httpOnly: boolean;
  /** SameSite policy */
  sameSite: "strict" | "lax" | "none";
  /** Cookie domain */
  domain?: string;
  /** Cookie path */
  path: string;
  /** Max age in seconds */
  maxAge?: number;
  /** Absolute expiry date */
  expires?: Date;
  /** Cookie prefix (__Secure- or __Host-) */
  prefix?: "Secure" | "Host";
}

/**
 * Transport security event for audit logging
 */
export interface TransportSecurityEvent {
  /** Event type */
  type:
    | "tls_downgrade_attempt"
    | "hsts_bypass_attempt"
    | "insecure_cookie_blocked"
    | "certificate_error"
    | "mixed_content_blocked"
    | "csp_violation"
    | "transport_audit";
  /** Event timestamp */
  timestamp: Date;
  /** Source IP address */
  sourceIp?: string;
  /** User agent string */
  userAgent?: string;
  /** Request URL */
  url?: string;
  /** Additional event details */
  details: Record<string, unknown>;
  /** Severity level */
  severity: "info" | "warning" | "error" | "critical";
}

/**
 * Transport security audit result
 */
export interface TransportSecurityAudit {
  /** Audit timestamp */
  timestamp: Date;
  /** TLS configuration score (0-100) */
  tlsScore: number;
  /** HSTS configuration score (0-100) */
  hstsScore: number;
  /** Cookie security score (0-100) */
  cookieScore: number;
  /** Overall security score (0-100) */
  overallScore: number;
  /** List of findings */
  findings: TransportSecurityFinding[];
  /** Pass/fail status */
  passed: boolean;
}

/**
 * Transport security finding
 */
export interface TransportSecurityFinding {
  /** Finding ID */
  id: string;
  /** Finding category */
  category: "tls" | "hsts" | "cookie" | "csp" | "mixed_content";
  /** Severity */
  severity: "info" | "warning" | "error" | "critical";
  /** Finding title */
  title: string;
  /** Detailed description */
  description: string;
  /** Remediation steps */
  remediation: string;
  /** Reference links */
  references: string[];
}

// ============================================================================
// Constants
// ============================================================================

/**
 * Default TLS configuration (production-grade)
 */
export const DEFAULT_TLS_CONFIG: TLSConfig = {
  minVersion: TLSVersion.TLS_1_2,
  preferredVersion: TLSVersion.TLS_1_3,
  cipherSuites: [
    // TLS 1.3 cipher suites (automatically negotiated)
    "TLS_AES_256_GCM_SHA384",
    "TLS_CHACHA20_POLY1305_SHA256",
    "TLS_AES_128_GCM_SHA256",
    // TLS 1.2 cipher suites (ECDHE preferred for forward secrecy)
    "ECDHE-ECDSA-AES256-GCM-SHA384",
    "ECDHE-RSA-AES256-GCM-SHA384",
    "ECDHE-ECDSA-CHACHA20-POLY1305",
    "ECDHE-RSA-CHACHA20-POLY1305",
    "ECDHE-ECDSA-AES128-GCM-SHA256",
    "ECDHE-RSA-AES128-GCM-SHA256",
  ],
  ocspStapling: true,
  sessionResumption: true,
  sessionTicketLifetime: 86400, // 24 hours
  zeroRtt: false, // Disabled by default due to replay attack risk
};

/**
 * Weak cipher suites that should be rejected
 */
export const WEAK_CIPHER_SUITES = [
  // RC4 (deprecated)
  "RC4-MD5",
  "RC4-SHA",
  "ECDHE-RSA-RC4-SHA",
  "ECDHE-ECDSA-RC4-SHA",
  // DES/3DES (weak)
  "DES-CBC-SHA",
  "DES-CBC3-SHA",
  "ECDHE-RSA-DES-CBC3-SHA",
  // Export ciphers
  "EXP-RC4-MD5",
  "EXP-DES-CBC-SHA",
  // NULL ciphers
  "NULL-MD5",
  "NULL-SHA",
  "NULL-SHA256",
  // Anonymous ciphers
  "ADH-AES128-SHA",
  "ADH-AES256-SHA",
  "AECDH-AES128-SHA",
  "AECDH-AES256-SHA",
  // MD5 HMAC
  "ECDHE-RSA-AES128-SHA",
  // CBC mode with SHA-1 (vulnerable to BEAST)
  "AES128-SHA",
  "AES256-SHA",
];

/**
 * Default HSTS configuration
 */
export const DEFAULT_HSTS_CONFIG: HSTSConfig = {
  maxAge: 63072000, // 2 years (required for HSTS preload)
  includeSubDomains: true,
  preload: true,
  enabled: process.env.NODE_ENV === "production",
};

/**
 * Minimum HSTS max-age for preload eligibility
 */
export const HSTS_PRELOAD_MIN_AGE = 31536000; // 1 year

/**
 * Default secure cookie configuration
 */
export const DEFAULT_SECURE_COOKIE_CONFIG: SecureCookieConfig = {
  secure: process.env.NODE_ENV === "production",
  httpOnly: true,
  sameSite: "lax",
  path: "/",
};

/**
 * Session cookie configuration
 */
export const SESSION_COOKIE_CONFIG: SecureCookieConfig = {
  secure: process.env.NODE_ENV === "production",
  httpOnly: true,
  sameSite: "strict",
  path: "/",
  maxAge: 86400 * 7, // 7 days
  prefix: "Host",
};

/**
 * CSRF cookie configuration
 */
export const CSRF_COOKIE_CONFIG: SecureCookieConfig = {
  secure: process.env.NODE_ENV === "production",
  httpOnly: true,
  sameSite: "strict",
  path: "/",
  maxAge: 86400, // 24 hours
  prefix: "Host",
};

// ============================================================================
// TLS Functions
// ============================================================================

/**
 * Get TLS configuration for server
 *
 * @param customConfig - Custom TLS configuration options
 * @returns Complete TLS configuration
 */
export function getTLSConfig(customConfig?: Partial<TLSConfig>): TLSConfig {
  return {
    ...DEFAULT_TLS_CONFIG,
    ...customConfig,
  };
}

/**
 * Validate TLS version meets minimum requirements
 *
 * @param version - TLS version to validate
 * @param minVersion - Minimum allowed version
 * @returns True if version meets requirements
 */
export function validateTLSVersion(
  version: string | TLSVersion,
  minVersion: TLSVersion = TLSVersion.TLS_1_2,
): boolean {
  const versionOrder = [
    TLSVersion.TLS_1_0,
    TLSVersion.TLS_1_1,
    TLSVersion.TLS_1_2,
    TLSVersion.TLS_1_3,
  ];

  const versionIndex = versionOrder.indexOf(version as TLSVersion);
  const minVersionIndex = versionOrder.indexOf(minVersion);

  if (versionIndex === -1 || minVersionIndex === -1) {
    return false;
  }

  return versionIndex >= minVersionIndex;
}

/**
 * Check if cipher suite is secure
 *
 * @param cipher - Cipher suite to check
 * @returns True if cipher is secure
 */
export function isSecureCipher(cipher: string): boolean {
  const normalizedCipher = cipher.toUpperCase();

  // Check against weak cipher list
  if (
    WEAK_CIPHER_SUITES.some((weak) =>
      normalizedCipher.includes(weak.toUpperCase()),
    )
  ) {
    return false;
  }

  // Check for known weak patterns
  const weakPatterns = [
    /^RC4/i,
    /^DES/i,
    /^EXP/i,
    /NULL/i,
    /^ADH/i,
    /^AECDH/i,
    /MD5$/i,
    /EXPORT/i,
    /ANON/i,
    /^PSK-/i,
  ];

  return !weakPatterns.some((pattern) => pattern.test(normalizedCipher));
}

/**
 * Filter cipher suites to only include secure options
 *
 * @param ciphers - List of cipher suites
 * @returns Filtered list of secure ciphers
 */
export function filterSecureCiphers(ciphers: string[]): string[] {
  return ciphers.filter(isSecureCipher);
}

/**
 * Get recommended cipher suite string for TLS configuration
 *
 * @param preferECDHE - Prefer ECDHE key exchange
 * @returns Cipher suite string
 */
export function getRecommendedCipherString(
  preferECDHE: boolean = true,
): string {
  const ciphers = [...DEFAULT_TLS_CONFIG.cipherSuites];

  if (preferECDHE) {
    // Sort to prioritize ECDHE ciphers
    ciphers.sort((a, b) => {
      const aECDHE = a.startsWith("ECDHE");
      const bECDHE = b.startsWith("ECDHE");
      if (aECDHE && !bECDHE) return -1;
      if (!aECDHE && bECDHE) return 1;
      return 0;
    });
  }

  return ciphers.join(":");
}

// ============================================================================
// HSTS Functions
// ============================================================================

/**
 * Generate HSTS header value
 *
 * @param config - HSTS configuration
 * @returns HSTS header value
 */
export function generateHSTSHeader(config: Partial<HSTSConfig> = {}): string {
  const finalConfig = { ...DEFAULT_HSTS_CONFIG, ...config };

  if (!finalConfig.enabled) {
    return "";
  }

  const parts: string[] = [`max-age=${finalConfig.maxAge}`];

  if (finalConfig.includeSubDomains) {
    parts.push("includeSubDomains");
  }

  if (finalConfig.preload) {
    parts.push("preload");
  }

  return parts.join("; ");
}

/**
 * Validate HSTS configuration for preload eligibility
 *
 * @param config - HSTS configuration to validate
 * @returns Validation result with any issues
 */
export function validateHSTSPreload(config: HSTSConfig): {
  eligible: boolean;
  issues: string[];
} {
  const issues: string[] = [];

  if (!config.enabled) {
    issues.push("HSTS must be enabled");
  }

  if (config.maxAge < HSTS_PRELOAD_MIN_AGE) {
    issues.push(
      `max-age must be at least ${HSTS_PRELOAD_MIN_AGE} seconds (1 year)`,
    );
  }

  if (!config.includeSubDomains) {
    issues.push("includeSubDomains directive is required for preload");
  }

  if (!config.preload) {
    issues.push("preload directive must be present");
  }

  return {
    eligible: issues.length === 0,
    issues,
  };
}

/**
 * Parse HSTS header value into configuration object
 *
 * @param headerValue - HSTS header value to parse
 * @returns Parsed HSTS configuration
 */
export function parseHSTSHeader(headerValue: string): HSTSConfig {
  const config: HSTSConfig = {
    maxAge: 0,
    includeSubDomains: false,
    preload: false,
    enabled: true,
  };

  const parts = headerValue.split(";").map((p) => p.trim().toLowerCase());

  for (const part of parts) {
    if (part.startsWith("max-age=")) {
      const value = parseInt(part.substring(8), 10);
      if (!isNaN(value)) {
        config.maxAge = value;
      }
    } else if (part === "includesubdomains") {
      config.includeSubDomains = true;
    } else if (part === "preload") {
      config.preload = true;
    }
  }

  return config;
}

// ============================================================================
// Cookie Functions
// ============================================================================

/**
 * Get secure cookie options
 *
 * @param config - Cookie configuration
 * @returns Cookie serialize options
 */
export function getSecureCookieOptions(
  config: Partial<SecureCookieConfig> = {},
): CookieSerializeOptions {
  const finalConfig = { ...DEFAULT_SECURE_COOKIE_CONFIG, ...config };

  const options: CookieSerializeOptions = {
    secure: finalConfig.secure,
    httpOnly: finalConfig.httpOnly,
    sameSite: finalConfig.sameSite,
    path: finalConfig.path,
  };

  if (finalConfig.domain) {
    options.domain = finalConfig.domain;
  }

  if (finalConfig.maxAge !== undefined) {
    options.maxAge = finalConfig.maxAge;
  }

  if (finalConfig.expires) {
    options.expires = finalConfig.expires;
  }

  return options;
}

/**
 * Get prefixed cookie name for enhanced security
 *
 * Cookie prefixes provide additional security guarantees:
 * - __Secure-: Cookie must be set with Secure flag
 * - __Host-: Cookie must be set with Secure flag, no Domain, Path must be /
 *
 * @param name - Base cookie name
 * @param prefix - Cookie prefix type
 * @returns Prefixed cookie name
 */
export function getPrefixedCookieName(
  name: string,
  prefix?: "Secure" | "Host",
): string {
  if (!prefix) {
    return name;
  }

  if (prefix === "Host") {
    return `__Host-${name}`;
  }

  return `__Secure-${name}`;
}

/**
 * Validate cookie configuration for security
 *
 * @param name - Cookie name
 * @param config - Cookie configuration
 * @returns Validation result
 */
export function validateCookieSecurity(
  name: string,
  config: SecureCookieConfig,
): {
  secure: boolean;
  issues: string[];
} {
  const issues: string[] = [];

  // Check for __Host- prefix requirements
  if (name.startsWith("__Host-")) {
    if (!config.secure) {
      issues.push("__Host- prefixed cookies must have Secure flag");
    }
    if (config.domain) {
      issues.push("__Host- prefixed cookies must not have Domain attribute");
    }
    if (config.path !== "/") {
      issues.push("__Host- prefixed cookies must have Path=/");
    }
  }

  // Check for __Secure- prefix requirements
  if (name.startsWith("__Secure-")) {
    if (!config.secure) {
      issues.push("__Secure- prefixed cookies must have Secure flag");
    }
  }

  // General security checks (production)
  if (process.env.NODE_ENV === "production") {
    if (!config.secure) {
      issues.push("Cookies should have Secure flag in production");
    }

    if (!config.httpOnly && !name.includes("csrf-token")) {
      issues.push(
        "Cookies should have HttpOnly flag unless needed client-side",
      );
    }

    if (config.sameSite === "none" && !config.secure) {
      issues.push("SameSite=None requires Secure flag");
    }
  }

  return {
    secure: issues.length === 0,
    issues,
  };
}

/**
 * Create session cookie with secure defaults
 *
 * @param sessionId - Session identifier
 * @param options - Additional options
 * @returns Cookie configuration
 */
export function createSecureSessionCookie(
  sessionId: string,
  options: Partial<SecureCookieConfig> = {},
): {
  name: string;
  value: string;
  options: CookieSerializeOptions;
} {
  const config = { ...SESSION_COOKIE_CONFIG, ...options };
  const name = getPrefixedCookieName("nchat-session", config.prefix);

  return {
    name,
    value: sessionId,
    options: getSecureCookieOptions(config),
  };
}

// ============================================================================
// Transport Security Audit
// ============================================================================

/**
 * Generate a unique audit ID
 */
export function generateAuditId(): string {
  return `TSA-${Date.now()}-${randomBytes(4).toString("hex")}`;
}

/**
 * Audit transport security configuration
 *
 * @param options - Audit options
 * @returns Transport security audit result
 */
export function auditTransportSecurity(options: {
  tlsConfig?: TLSConfig;
  hstsConfig?: HSTSConfig;
  cookies?: Array<{ name: string; config: SecureCookieConfig }>;
}): TransportSecurityAudit {
  const findings: TransportSecurityFinding[] = [];
  let tlsScore = 100;
  let hstsScore = 100;
  let cookieScore = 100;

  const tlsConfig = options.tlsConfig || DEFAULT_TLS_CONFIG;
  const hstsConfig = options.hstsConfig || DEFAULT_HSTS_CONFIG;

  // TLS Audit
  if (tlsConfig.minVersion === TLSVersion.TLS_1_0) {
    findings.push({
      id: "TLS-001",
      category: "tls",
      severity: "critical",
      title: "TLS 1.0 is enabled",
      description: "TLS 1.0 has known vulnerabilities and should not be used.",
      remediation: "Set minimum TLS version to TLS 1.2 or higher.",
      references: ["https://www.rfc-editor.org/rfc/rfc8996"],
    });
    tlsScore -= 40;
  } else if (tlsConfig.minVersion === TLSVersion.TLS_1_1) {
    findings.push({
      id: "TLS-002",
      category: "tls",
      severity: "error",
      title: "TLS 1.1 is enabled",
      description: "TLS 1.1 is deprecated and should not be used.",
      remediation: "Set minimum TLS version to TLS 1.2 or higher.",
      references: ["https://www.rfc-editor.org/rfc/rfc8996"],
    });
    tlsScore -= 25;
  }

  if (tlsConfig.preferredVersion !== TLSVersion.TLS_1_3) {
    findings.push({
      id: "TLS-003",
      category: "tls",
      severity: "warning",
      title: "TLS 1.3 is not preferred",
      description: "TLS 1.3 provides improved security and performance.",
      remediation: "Configure TLS 1.3 as the preferred version.",
      references: ["https://www.rfc-editor.org/rfc/rfc8446"],
    });
    tlsScore -= 10;
  }

  if (tlsConfig.zeroRtt) {
    findings.push({
      id: "TLS-004",
      category: "tls",
      severity: "warning",
      title: "0-RTT is enabled",
      description: "0-RTT (early data) is vulnerable to replay attacks.",
      remediation:
        "Disable 0-RTT or implement replay protection for sensitive operations.",
      references: ["https://blog.cloudflare.com/0-rtt-and-replay-attacks/"],
    });
    tlsScore -= 15;
  }

  if (!tlsConfig.ocspStapling) {
    findings.push({
      id: "TLS-005",
      category: "tls",
      severity: "info",
      title: "OCSP stapling is disabled",
      description:
        "OCSP stapling improves TLS handshake performance and privacy.",
      remediation: "Enable OCSP stapling in TLS configuration.",
      references: ["https://www.rfc-editor.org/rfc/rfc6066#section-8"],
    });
    tlsScore -= 5;
  }

  // Check for weak ciphers
  const weakCiphers = tlsConfig.cipherSuites.filter((c) => !isSecureCipher(c));
  if (weakCiphers.length > 0) {
    findings.push({
      id: "TLS-006",
      category: "tls",
      severity: "error",
      title: "Weak cipher suites are enabled",
      description: `The following weak ciphers are enabled: ${weakCiphers.join(", ")}`,
      remediation: "Remove weak cipher suites from configuration.",
      references: ["https://ciphersuite.info/"],
    });
    tlsScore -= 20;
  }

  // HSTS Audit
  if (!hstsConfig.enabled) {
    findings.push({
      id: "HSTS-001",
      category: "hsts",
      severity: "error",
      title: "HSTS is disabled",
      description: "HSTS protects against protocol downgrade attacks.",
      remediation: "Enable HSTS with appropriate max-age.",
      references: [
        "https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Strict-Transport-Security",
      ],
    });
    hstsScore -= 40;
  } else {
    const preloadValidation = validateHSTSPreload(hstsConfig);
    if (!preloadValidation.eligible) {
      if (!hstsConfig.includeSubDomains) {
        findings.push({
          id: "HSTS-002",
          category: "hsts",
          severity: "warning",
          title: "HSTS does not include subdomains",
          description:
            "Including subdomains provides complete HSTS protection.",
          remediation: "Add includeSubDomains directive to HSTS header.",
          references: ["https://hstspreload.org/"],
        });
        hstsScore -= 15;
      }

      if (hstsConfig.maxAge < HSTS_PRELOAD_MIN_AGE) {
        findings.push({
          id: "HSTS-003",
          category: "hsts",
          severity: "warning",
          title: "HSTS max-age is too short",
          description: `max-age of ${hstsConfig.maxAge} is below the recommended minimum of ${HSTS_PRELOAD_MIN_AGE}.`,
          remediation:
            "Increase max-age to at least 1 year (31536000 seconds).",
          references: ["https://hstspreload.org/"],
        });
        hstsScore -= 10;
      }

      if (!hstsConfig.preload) {
        findings.push({
          id: "HSTS-004",
          category: "hsts",
          severity: "info",
          title: "HSTS preload is not enabled",
          description:
            "HSTS preload provides protection from the first request.",
          remediation: "Add preload directive and submit to HSTS preload list.",
          references: ["https://hstspreload.org/"],
        });
        hstsScore -= 5;
      }
    }
  }

  // Cookie Audit
  if (options.cookies) {
    for (const { name, config } of options.cookies) {
      const validation = validateCookieSecurity(name, config);
      if (!validation.secure) {
        for (const issue of validation.issues) {
          findings.push({
            id: `COOKIE-${findings.filter((f) => f.category === "cookie").length + 1}`,
            category: "cookie",
            severity: "warning",
            title: `Cookie security issue: ${name}`,
            description: issue,
            remediation:
              "Update cookie configuration to address the security issue.",
            references: [
              "https://developer.mozilla.org/en-US/docs/Web/HTTP/Cookies",
            ],
          });
          cookieScore -= 10;
        }
      }
    }
  }

  // Ensure scores don't go below 0
  tlsScore = Math.max(0, tlsScore);
  hstsScore = Math.max(0, hstsScore);
  cookieScore = Math.max(0, cookieScore);

  // Calculate overall score (weighted average)
  const overallScore = Math.round(
    tlsScore * 0.4 + hstsScore * 0.3 + cookieScore * 0.3,
  );

  // Determine pass/fail (minimum 70 overall, no critical findings)
  const hasCritical = findings.some((f) => f.severity === "critical");
  const passed = overallScore >= 70 && !hasCritical;

  return {
    timestamp: new Date(),
    tlsScore,
    hstsScore,
    cookieScore,
    overallScore,
    findings,
    passed,
  };
}

// ============================================================================
// Transport Security Event Logging
// ============================================================================

/**
 * Log transport security event
 *
 * @param event - Security event to log
 */
export function logTransportSecurityEvent(event: TransportSecurityEvent): void {
  const logEntry = {
    ...event,
    timestamp: event.timestamp.toISOString(),
  };

  switch (event.severity) {
    case "critical":
    case "error":
      logger.error(`[TRANSPORT-SECURITY] ${event.type}`, undefined, logEntry);
      break;
    case "warning":
      logger.warn(`[TRANSPORT-SECURITY] ${event.type}`, logEntry);
      break;
    case "info":
    default:
      logger.info(`[TRANSPORT-SECURITY] ${event.type}`, logEntry);
  }
}

/**
 * Create a transport security event
 *
 * @param type - Event type
 * @param severity - Event severity
 * @param details - Event details
 * @param request - Optional request info
 * @returns Transport security event
 */
export function createTransportSecurityEvent(
  type: TransportSecurityEvent["type"],
  severity: TransportSecurityEvent["severity"],
  details: Record<string, unknown>,
  request?: {
    ip?: string;
    userAgent?: string;
    url?: string;
  },
): TransportSecurityEvent {
  return {
    type,
    timestamp: new Date(),
    sourceIp: request?.ip,
    userAgent: request?.userAgent,
    url: request?.url,
    details,
    severity,
  };
}

// ============================================================================
// Fingerprinting Protection
// ============================================================================

/**
 * Generate a hash of TLS configuration for fingerprint tracking
 *
 * @param config - TLS configuration
 * @returns Configuration hash
 */
export function generateTLSConfigHash(config: TLSConfig): string {
  const configString = JSON.stringify({
    minVersion: config.minVersion,
    preferredVersion: config.preferredVersion,
    cipherSuites: [...config.cipherSuites].sort(),
  });

  return createHash("sha256")
    .update(configString)
    .digest("hex")
    .substring(0, 16);
}

/**
 * Detect potential TLS fingerprint mismatch (bot detection)
 *
 * Compares JA3 fingerprint patterns to detect automated clients
 * pretending to be browsers.
 *
 * @param expectedPattern - Expected JA3 pattern
 * @param actualPattern - Actual JA3 pattern from client
 * @returns True if mismatch detected
 */
export function detectJA3Mismatch(
  expectedPattern: string,
  actualPattern: string,
): boolean {
  // Exact match is not required, but significant deviation is suspicious
  if (!expectedPattern || !actualPattern) {
    return false;
  }

  // Compare cipher suite order (first 10 ciphers)
  const expectedCiphers = expectedPattern.split(",").slice(0, 10);
  const actualCiphers = actualPattern.split(",").slice(0, 10);

  // Calculate similarity
  let matches = 0;
  for (const cipher of actualCiphers) {
    if (expectedCiphers.includes(cipher)) {
      matches++;
    }
  }

  const similarity =
    matches / Math.max(expectedCiphers.length, actualCiphers.length);

  // Less than 50% similarity indicates potential mismatch
  return similarity < 0.5;
}

// ============================================================================
// Export Security Constants
// ============================================================================

export const TRANSPORT_SECURITY_CONSTANTS = {
  /** Minimum TLS version for production */
  MIN_TLS_VERSION: TLSVersion.TLS_1_2,
  /** Recommended TLS version */
  RECOMMENDED_TLS_VERSION: TLSVersion.TLS_1_3,
  /** HSTS minimum max-age for preload */
  HSTS_PRELOAD_MIN_AGE,
  /** Session cookie max-age */
  SESSION_COOKIE_MAX_AGE: 86400 * 7,
  /** CSRF cookie max-age */
  CSRF_COOKIE_MAX_AGE: 86400,
  /** Default HSTS max-age */
  DEFAULT_HSTS_MAX_AGE: 63072000,
} as const;
