/**
 * Security Headers Module
 *
 * Comprehensive security headers configuration for the nself-chat platform.
 * Implements best practices for HTTP security headers including CSP, HSTS,
 * and various protection mechanisms.
 *
 * Features:
 * - Content Security Policy (CSP) with nonce support
 * - HTTP Strict Transport Security (HSTS)
 * - X-Frame-Options, X-Content-Type-Options, etc.
 * - Permissions Policy
 * - CORS configuration
 * - Reporting endpoints
 *
 * @module lib/security/security-headers
 */

import { randomBytes } from "crypto";

import {
  generateHSTSHeader,
  DEFAULT_HSTS_CONFIG,
  type HSTSConfig,
} from "./transport-security";

// ============================================================================
// Types
// ============================================================================

/**
 * CSP directive name
 */
export type CSPDirective =
  | "default-src"
  | "script-src"
  | "script-src-elem"
  | "script-src-attr"
  | "style-src"
  | "style-src-elem"
  | "style-src-attr"
  | "img-src"
  | "font-src"
  | "connect-src"
  | "media-src"
  | "object-src"
  | "prefetch-src"
  | "child-src"
  | "frame-src"
  | "worker-src"
  | "frame-ancestors"
  | "form-action"
  | "base-uri"
  | "manifest-src"
  | "navigate-to"
  | "report-uri"
  | "report-to"
  | "require-trusted-types-for"
  | "trusted-types"
  | "upgrade-insecure-requests"
  | "block-all-mixed-content"
  | "sandbox";

/**
 * CSP source value
 */
export type CSPSource =
  | "'self'"
  | "'unsafe-inline'"
  | "'unsafe-eval'"
  | "'strict-dynamic'"
  | "'unsafe-hashes'"
  | "'none'"
  | "'wasm-unsafe-eval'"
  | "'report-sample'"
  | `'nonce-${string}'`
  | `'sha256-${string}'`
  | `'sha384-${string}'`
  | `'sha512-${string}'`
  | string;

/**
 * Content Security Policy configuration
 */
export interface CSPConfig {
  /** CSP directives */
  directives: Partial<Record<CSPDirective, CSPSource[]>>;
  /** Report-only mode */
  reportOnly: boolean;
  /** Reporting endpoint */
  reportUri?: string;
  /** Use nonces for scripts */
  useNonces: boolean;
  /** Additional script hashes */
  scriptHashes?: string[];
  /** Additional style hashes */
  styleHashes?: string[];
}

/**
 * Permissions Policy feature
 */
export type PermissionsPolicyFeature =
  | "accelerometer"
  | "ambient-light-sensor"
  | "autoplay"
  | "battery"
  | "bluetooth"
  | "browsing-topics"
  | "camera"
  | "display-capture"
  | "document-domain"
  | "encrypted-media"
  | "execution-while-not-rendered"
  | "execution-while-out-of-viewport"
  | "fullscreen"
  | "geolocation"
  | "gyroscope"
  | "hid"
  | "identity-credentials-get"
  | "idle-detection"
  | "local-fonts"
  | "magnetometer"
  | "microphone"
  | "midi"
  | "otp-credentials"
  | "payment"
  | "picture-in-picture"
  | "publickey-credentials-create"
  | "publickey-credentials-get"
  | "screen-wake-lock"
  | "serial"
  | "speaker-selection"
  | "storage-access"
  | "usb"
  | "web-share"
  | "window-management"
  | "xr-spatial-tracking";

/**
 * Permissions Policy allowlist
 */
export type PermissionsPolicyAllowlist =
  | "*"
  | "self"
  | "src"
  | "none"
  | string[];

/**
 * Permissions Policy configuration
 */
export interface PermissionsPolicyConfig {
  /** Feature policies */
  features: Partial<
    Record<PermissionsPolicyFeature, PermissionsPolicyAllowlist>
  >;
}

/**
 * CORS configuration
 */
export interface CORSConfig {
  /** Allowed origins */
  allowedOrigins: string[];
  /** Allowed methods */
  allowedMethods: string[];
  /** Allowed headers */
  allowedHeaders: string[];
  /** Exposed headers */
  exposedHeaders: string[];
  /** Allow credentials */
  allowCredentials: boolean;
  /** Max age for preflight cache */
  maxAge: number;
}

/**
 * Complete security headers configuration
 */
export interface SecurityHeadersConfig {
  /** Content Security Policy */
  csp: CSPConfig;
  /** HTTP Strict Transport Security */
  hsts: HSTSConfig;
  /** Permissions Policy */
  permissionsPolicy: PermissionsPolicyConfig;
  /** CORS configuration */
  cors?: CORSConfig;
  /** X-Frame-Options value */
  frameOptions: "DENY" | "SAMEORIGIN" | `ALLOW-FROM ${string}`;
  /** X-Content-Type-Options */
  contentTypeOptions: "nosniff";
  /** Referrer-Policy */
  referrerPolicy:
    | "no-referrer"
    | "no-referrer-when-downgrade"
    | "origin"
    | "origin-when-cross-origin"
    | "same-origin"
    | "strict-origin"
    | "strict-origin-when-cross-origin"
    | "unsafe-url";
  /** X-DNS-Prefetch-Control */
  dnsPrefetch: "on" | "off";
  /** X-Permitted-Cross-Domain-Policies */
  crossDomainPolicy: "none" | "master-only" | "by-content-type" | "all";
  /** Cross-Origin-Opener-Policy */
  coopPolicy: "unsafe-none" | "same-origin-allow-popups" | "same-origin";
  /** Cross-Origin-Embedder-Policy */
  coepPolicy: "unsafe-none" | "require-corp" | "credentialless";
  /** Cross-Origin-Resource-Policy */
  corpPolicy: "same-site" | "same-origin" | "cross-origin";
  /** Enable XSS protection header (legacy) */
  xssProtection: boolean;
  /** Report-To header configuration */
  reportTo?: ReportToConfig;
}

/**
 * Report-To endpoint configuration
 */
export interface ReportToConfig {
  /** Group name */
  group: string;
  /** Max age for the endpoint */
  maxAge: number;
  /** Reporting endpoints */
  endpoints: Array<{
    url: string;
    priority?: number;
    weight?: number;
  }>;
  /** Include subdomains */
  includeSubdomains?: boolean;
}

/**
 * Generated security headers
 */
export interface GeneratedSecurityHeaders {
  /** Header name to value mapping */
  headers: Record<string, string>;
  /** CSP nonce (if generated) */
  nonce?: string;
}

// ============================================================================
// Constants
// ============================================================================

/**
 * Default Content Security Policy for the application
 */
export const DEFAULT_CSP_CONFIG: CSPConfig = {
  directives: {
    "default-src": ["'self'"],
    "script-src": ["'self'", "'strict-dynamic'"],
    "style-src": ["'self'", "'unsafe-inline'"], // Required for Tailwind
    "img-src": ["'self'", "data:", "blob:", "https:"],
    "font-src": ["'self'", "data:", "https://fonts.gstatic.com"],
    "connect-src": [
      "'self'",
      "https://api.localhost",
      "https://auth.localhost",
      "https://storage.localhost",
      "wss:",
    ],
    "media-src": ["'self'", "blob:", "data:"],
    "object-src": ["'none'"],
    "frame-src": ["'self'"],
    "frame-ancestors": ["'none'"],
    "form-action": ["'self'"],
    "base-uri": ["'self'"],
    "worker-src": ["'self'", "blob:"],
    "manifest-src": ["'self'"],
    "upgrade-insecure-requests": [],
  },
  reportOnly: false,
  reportUri: "/api/security/csp-report",
  useNonces: true,
};

/**
 * Development CSP configuration (more permissive)
 */
export const DEVELOPMENT_CSP_CONFIG: CSPConfig = {
  directives: {
    "default-src": ["'self'"],
    "script-src": ["'self'", "'unsafe-eval'", "'unsafe-inline'"],
    "style-src": ["'self'", "'unsafe-inline'"],
    "img-src": ["'self'", "data:", "blob:", "https:", "http://localhost:*"],
    "font-src": ["'self'", "data:", "https://fonts.gstatic.com"],
    "connect-src": [
      "'self'",
      "http://localhost:*",
      "http://api.localhost",
      "http://auth.localhost",
      "http://storage.localhost",
      "ws://localhost:*",
      "wss://localhost:*",
    ],
    "media-src": ["'self'", "blob:", "data:"],
    "object-src": ["'none'"],
    "frame-src": ["'self'", "https:"],
    "frame-ancestors": ["'self'"],
    "form-action": ["'self'"],
    "base-uri": ["'self'"],
    "worker-src": ["'self'", "blob:"],
  },
  reportOnly: true,
  useNonces: false,
};

/**
 * Default Permissions Policy
 */
export const DEFAULT_PERMISSIONS_POLICY: PermissionsPolicyConfig = {
  features: {
    // Disabled by default
    accelerometer: "none",
    "ambient-light-sensor": "none",
    autoplay: "self",
    battery: "none",
    bluetooth: "none",
    "browsing-topics": "none",
    camera: "none", // Enable when needed for video calls
    "display-capture": "none",
    "document-domain": "none",
    "encrypted-media": "self",
    fullscreen: "self",
    geolocation: "none",
    gyroscope: "none",
    hid: "none",
    "idle-detection": "none",
    "local-fonts": "self",
    magnetometer: "none",
    microphone: "none", // Enable when needed for voice calls
    midi: "none",
    payment: "none",
    "picture-in-picture": "self",
    "publickey-credentials-create": "self",
    "publickey-credentials-get": "self",
    "screen-wake-lock": "self",
    serial: "none",
    "speaker-selection": "self",
    "storage-access": "self",
    usb: "none",
    "web-share": "self",
    "xr-spatial-tracking": "none",
  },
};

/**
 * Permissions Policy for video/voice calling features
 */
export const CALLING_PERMISSIONS_POLICY: Partial<
  Record<PermissionsPolicyFeature, PermissionsPolicyAllowlist>
> = {
  camera: "self",
  microphone: "self",
  "display-capture": "self",
  "speaker-selection": "self",
};

/**
 * Default CORS configuration
 */
export const DEFAULT_CORS_CONFIG: CORSConfig = {
  allowedOrigins: [],
  allowedMethods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: [
    "Content-Type",
    "Authorization",
    "X-CSRF-Token",
    "X-Requested-With",
  ],
  exposedHeaders: [
    "X-Request-Id",
    "X-RateLimit-Limit",
    "X-RateLimit-Remaining",
  ],
  allowCredentials: true,
  maxAge: 86400, // 24 hours
};

/**
 * Default complete security headers configuration
 */
export const DEFAULT_SECURITY_HEADERS_CONFIG: SecurityHeadersConfig = {
  csp: DEFAULT_CSP_CONFIG,
  hsts: DEFAULT_HSTS_CONFIG,
  permissionsPolicy: DEFAULT_PERMISSIONS_POLICY,
  frameOptions: "DENY",
  contentTypeOptions: "nosniff",
  referrerPolicy: "strict-origin-when-cross-origin",
  dnsPrefetch: "on",
  crossDomainPolicy: "none",
  coopPolicy: "same-origin",
  coepPolicy: "credentialless",
  corpPolicy: "same-origin",
  xssProtection: true,
};

// ============================================================================
// Nonce Generation
// ============================================================================

/**
 * Generate a cryptographically secure nonce
 *
 * @returns Base64-encoded nonce
 */
export function generateNonce(): string {
  return randomBytes(16).toString("base64");
}

/**
 * Create a nonce source value for CSP
 *
 * @param nonce - The nonce value
 * @returns CSP nonce source
 */
export function createNonceSource(nonce: string): CSPSource {
  return `'nonce-${nonce}'`;
}

// ============================================================================
// CSP Generation
// ============================================================================

/**
 * Build CSP header value from configuration
 *
 * @param config - CSP configuration
 * @param nonce - Optional nonce for script-src
 * @returns CSP header value
 */
export function buildCSPHeader(config: CSPConfig, nonce?: string): string {
  const directives: string[] = [];

  for (const [directive, sources] of Object.entries(config.directives)) {
    if (sources === undefined) continue;

    let sourceList = [...sources];

    // Add nonce to script-src if enabled
    if (config.useNonces && nonce && directive === "script-src") {
      sourceList = sourceList.filter((s) => s !== "'unsafe-inline'");
      sourceList.push(createNonceSource(nonce));
    }

    // Add script hashes
    if (directive === "script-src" && config.scriptHashes) {
      sourceList.push(...config.scriptHashes.map((h) => `'sha256-${h}'`));
    }

    // Add style hashes
    if (directive === "style-src" && config.styleHashes) {
      sourceList.push(...config.styleHashes.map((h) => `'sha256-${h}'`));
    }

    // Format directive
    if (sourceList.length === 0) {
      // Boolean directive (e.g., upgrade-insecure-requests)
      directives.push(directive);
    } else {
      directives.push(`${directive} ${sourceList.join(" ")}`);
    }
  }

  // Add report-uri if configured
  if (config.reportUri) {
    directives.push(`report-uri ${config.reportUri}`);
  }

  return directives.join("; ");
}

/**
 * Merge CSP configurations
 *
 * @param base - Base CSP configuration
 * @param overrides - Override values
 * @returns Merged CSP configuration
 */
export function mergeCSPConfig(
  base: CSPConfig,
  overrides: Partial<CSPConfig>,
): CSPConfig {
  const mergedDirectives = { ...base.directives };

  if (overrides.directives) {
    for (const [directive, sources] of Object.entries(overrides.directives)) {
      if (sources !== undefined) {
        mergedDirectives[directive as CSPDirective] = sources;
      }
    }
  }

  return {
    ...base,
    ...overrides,
    directives: mergedDirectives,
  };
}

/**
 * Add sources to a CSP directive
 *
 * @param config - Current CSP configuration
 * @param directive - Directive to modify
 * @param sources - Sources to add
 * @returns Updated CSP configuration
 */
export function addCSPSources(
  config: CSPConfig,
  directive: CSPDirective,
  sources: CSPSource[],
): CSPConfig {
  const currentSources = config.directives[directive] || [];

  return {
    ...config,
    directives: {
      ...config.directives,
      [directive]: [...currentSources, ...sources],
    },
  };
}

// ============================================================================
// Permissions Policy Generation
// ============================================================================

/**
 * Build Permissions-Policy header value
 *
 * @param config - Permissions Policy configuration
 * @returns Permissions-Policy header value
 */
export function buildPermissionsPolicyHeader(
  config: PermissionsPolicyConfig,
): string {
  const policies: string[] = [];

  for (const [feature, allowlist] of Object.entries(config.features)) {
    let value: string;

    if (allowlist === "*") {
      value = "*";
    } else if (allowlist === "self") {
      value = "self";
    } else if (allowlist === "src") {
      value = "src";
    } else if (allowlist === "none") {
      value = "()";
    } else if (Array.isArray(allowlist)) {
      value = `(${allowlist.map((o) => (o === "self" ? "self" : `"${o}"`)).join(" ")})`;
    } else {
      continue;
    }

    policies.push(`${feature}=${value}`);
  }

  return policies.join(", ");
}

/**
 * Merge Permissions Policy configurations
 *
 * @param base - Base configuration
 * @param overrides - Override values
 * @returns Merged configuration
 */
export function mergePermissionsPolicyConfig(
  base: PermissionsPolicyConfig,
  overrides: Partial<PermissionsPolicyConfig>,
): PermissionsPolicyConfig {
  return {
    features: {
      ...base.features,
      ...overrides.features,
    },
  };
}

// ============================================================================
// CORS Headers
// ============================================================================

/**
 * Build CORS headers for a request
 *
 * @param config - CORS configuration
 * @param origin - Request origin
 * @returns CORS headers
 */
export function buildCORSHeaders(
  config: CORSConfig,
  origin?: string,
): Record<string, string> {
  const headers: Record<string, string> = {};

  // Check if origin is allowed
  const isAllowed =
    origin &&
    (config.allowedOrigins.includes("*") ||
      config.allowedOrigins.includes(origin) ||
      config.allowedOrigins.some((allowed) => {
        if (allowed.startsWith("*.")) {
          const suffix = allowed.substring(1);
          return origin.endsWith(suffix);
        }
        return false;
      }));

  if (isAllowed && origin) {
    headers["Access-Control-Allow-Origin"] = origin;
  } else if (config.allowedOrigins.includes("*")) {
    headers["Access-Control-Allow-Origin"] = "*";
  }

  if (config.allowCredentials && origin && isAllowed) {
    headers["Access-Control-Allow-Credentials"] = "true";
  }

  headers["Access-Control-Allow-Methods"] = config.allowedMethods.join(", ");
  headers["Access-Control-Allow-Headers"] = config.allowedHeaders.join(", ");

  if (config.exposedHeaders.length > 0) {
    headers["Access-Control-Expose-Headers"] = config.exposedHeaders.join(", ");
  }

  headers["Access-Control-Max-Age"] = config.maxAge.toString();

  return headers;
}

// ============================================================================
// Report-To Header
// ============================================================================

/**
 * Build Report-To header value
 *
 * @param config - Report-To configuration
 * @returns Report-To header value (JSON)
 */
export function buildReportToHeader(config: ReportToConfig): string {
  const reportTo = {
    group: config.group,
    max_age: config.maxAge,
    endpoints: config.endpoints,
    include_subdomains: config.includeSubdomains,
  };

  return JSON.stringify(reportTo);
}

// ============================================================================
// Complete Header Generation
// ============================================================================

/**
 * Generate all security headers
 *
 * @param config - Security headers configuration
 * @param options - Generation options
 * @returns Generated headers with optional nonce
 */
export function generateSecurityHeaders(
  config: SecurityHeadersConfig = DEFAULT_SECURITY_HEADERS_CONFIG,
  options: {
    isDevelopment?: boolean;
    requestOrigin?: string;
    generateNonce?: boolean;
  } = {},
): GeneratedSecurityHeaders {
  const headers: Record<string, string> = {};
  const {
    isDevelopment = process.env.NODE_ENV === "development",
    requestOrigin,
    generateNonce: shouldGenerateNonce = true,
  } = options;

  // Generate nonce if needed
  const nonce =
    shouldGenerateNonce && config.csp.useNonces ? generateNonce() : undefined;

  // Use development CSP in development mode
  const cspConfig = isDevelopment ? DEVELOPMENT_CSP_CONFIG : config.csp;

  // Content-Security-Policy
  const cspHeader = buildCSPHeader(cspConfig, nonce);
  if (cspConfig.reportOnly) {
    headers["Content-Security-Policy-Report-Only"] = cspHeader;
  } else {
    headers["Content-Security-Policy"] = cspHeader;
  }

  // Strict-Transport-Security (only in production)
  if (!isDevelopment) {
    const hstsHeader = generateHSTSHeader(config.hsts);
    if (hstsHeader) {
      headers["Strict-Transport-Security"] = hstsHeader;
    }
  }

  // Permissions-Policy
  headers["Permissions-Policy"] = buildPermissionsPolicyHeader(
    config.permissionsPolicy,
  );

  // X-Frame-Options
  headers["X-Frame-Options"] = config.frameOptions;

  // X-Content-Type-Options
  headers["X-Content-Type-Options"] = config.contentTypeOptions;

  // Referrer-Policy
  headers["Referrer-Policy"] = config.referrerPolicy;

  // X-DNS-Prefetch-Control
  headers["X-DNS-Prefetch-Control"] = config.dnsPrefetch;

  // X-Permitted-Cross-Domain-Policies
  headers["X-Permitted-Cross-Domain-Policies"] = config.crossDomainPolicy;

  // Cross-Origin-Opener-Policy
  headers["Cross-Origin-Opener-Policy"] = config.coopPolicy;

  // Cross-Origin-Embedder-Policy
  headers["Cross-Origin-Embedder-Policy"] = config.coepPolicy;

  // Cross-Origin-Resource-Policy
  headers["Cross-Origin-Resource-Policy"] = config.corpPolicy;

  // X-XSS-Protection (legacy, but still useful for older browsers)
  if (config.xssProtection) {
    headers["X-XSS-Protection"] = "1; mode=block";
  }

  // Report-To
  if (config.reportTo) {
    headers["Report-To"] = buildReportToHeader(config.reportTo);
  }

  // CORS headers
  if (config.cors) {
    const corsHeaders = buildCORSHeaders(config.cors, requestOrigin);
    Object.assign(headers, corsHeaders);
  }

  // Store nonce in a non-standard header for use by the application
  if (nonce) {
    headers["X-Nonce"] = nonce;
  }

  return { headers, nonce };
}

/**
 * Get security headers for static assets
 *
 * @returns Security headers for static files
 */
export function getStaticAssetHeaders(): Record<string, string> {
  return {
    "X-Content-Type-Options": "nosniff",
    "Cache-Control": "public, max-age=31536000, immutable",
    "Cross-Origin-Resource-Policy": "cross-origin",
  };
}

/**
 * Get security headers for API responses
 *
 * @param config - Optional configuration overrides
 * @returns Security headers for API responses
 */
export function getAPISecurityHeaders(
  config?: Partial<SecurityHeadersConfig>,
): Record<string, string> {
  const baseConfig: SecurityHeadersConfig = {
    ...DEFAULT_SECURITY_HEADERS_CONFIG,
    csp: {
      ...DEFAULT_CSP_CONFIG,
      directives: {
        "default-src": ["'none'"],
        "frame-ancestors": ["'none'"],
      },
      useNonces: false,
    },
    ...config,
  };

  const { headers } = generateSecurityHeaders(baseConfig, {
    generateNonce: false,
  });

  // Remove CSP for JSON APIs (not needed)
  delete headers["Content-Security-Policy"];

  return headers;
}

// ============================================================================
// Header Validation
// ============================================================================

/**
 * Validate CSP header for common issues
 *
 * @param cspHeader - CSP header value
 * @returns Validation result
 */
export function validateCSPHeader(cspHeader: string): {
  valid: boolean;
  warnings: string[];
  errors: string[];
} {
  const warnings: string[] = [];
  const errors: string[] = [];

  // Check for unsafe-inline in script-src
  if (
    cspHeader.includes("script-src") &&
    cspHeader.includes("'unsafe-inline'")
  ) {
    if (
      !cspHeader.includes("'strict-dynamic'") &&
      !cspHeader.includes("'nonce-")
    ) {
      warnings.push(
        "'unsafe-inline' in script-src weakens CSP without nonce or strict-dynamic",
      );
    }
  }

  // Check for unsafe-eval
  if (cspHeader.includes("'unsafe-eval'")) {
    warnings.push(
      // sast-ignore: EVAL_USAGE -- this string is a CSP policy check description, not an eval() call
      "'unsafe-eval' allows potentially dangerous eval() and related functions",
    );
  }

  // Check for wildcard in connect-src
  if (cspHeader.includes("connect-src") && cspHeader.includes("*")) {
    warnings.push("Wildcard in connect-src allows connections to any origin");
  }

  // Check for missing default-src
  if (!cspHeader.includes("default-src")) {
    errors.push(
      "Missing default-src directive (should specify fallback policy)",
    );
  }

  // Check for missing object-src
  if (!cspHeader.includes("object-src")) {
    warnings.push(
      "Missing object-src directive (consider adding object-src 'none')",
    );
  }

  // Check for missing frame-ancestors
  if (!cspHeader.includes("frame-ancestors")) {
    warnings.push(
      "Missing frame-ancestors directive (consider adding for clickjacking protection)",
    );
  }

  // Check for data: in script-src
  if (cspHeader.includes("script-src") && cspHeader.includes("data:")) {
    errors.push("data: in script-src allows inline script injection");
  }

  return {
    valid: errors.length === 0,
    warnings,
    errors,
  };
}

/**
 * Check if security headers meet minimum requirements
 *
 * @param headers - Headers to check
 * @returns Validation result
 */
export function validateSecurityHeaders(headers: Record<string, string>): {
  score: number;
  passed: boolean;
  checks: Array<{
    name: string;
    passed: boolean;
    message: string;
  }>;
} {
  const checks: Array<{ name: string; passed: boolean; message: string }> = [];

  // Check X-Frame-Options
  const frameOptions = headers["X-Frame-Options"];
  checks.push({
    name: "X-Frame-Options",
    passed: frameOptions === "DENY" || frameOptions === "SAMEORIGIN",
    message: frameOptions ? `Set to: ${frameOptions}` : "Missing header",
  });

  // Check X-Content-Type-Options
  const contentType = headers["X-Content-Type-Options"];
  checks.push({
    name: "X-Content-Type-Options",
    passed: contentType === "nosniff",
    message: contentType ? `Set to: ${contentType}` : "Missing header",
  });

  // Check Strict-Transport-Security
  const hsts = headers["Strict-Transport-Security"];
  const hstsValid =
    hsts &&
    hsts.includes("max-age=") &&
    parseInt(hsts.split("max-age=")[1]) >= 31536000;
  checks.push({
    name: "Strict-Transport-Security",
    passed: Boolean(hstsValid),
    message: hsts
      ? `Set to: ${hsts}`
      : "Missing header (required for production)",
  });

  // Check Content-Security-Policy
  const csp =
    headers["Content-Security-Policy"] ||
    headers["Content-Security-Policy-Report-Only"];
  checks.push({
    name: "Content-Security-Policy",
    passed: Boolean(csp),
    message: csp ? "CSP is configured" : "Missing CSP header",
  });

  // Check Referrer-Policy
  const referrer = headers["Referrer-Policy"];
  const validReferrer = [
    "no-referrer",
    "strict-origin",
    "strict-origin-when-cross-origin",
    "same-origin",
  ];
  checks.push({
    name: "Referrer-Policy",
    passed: validReferrer.includes(referrer),
    message: referrer ? `Set to: ${referrer}` : "Missing header",
  });

  // Check Permissions-Policy
  const permissions = headers["Permissions-Policy"];
  checks.push({
    name: "Permissions-Policy",
    passed: Boolean(permissions),
    message: permissions
      ? "Permissions-Policy is configured"
      : "Missing header",
  });

  // Check Cross-Origin-Opener-Policy
  const coop = headers["Cross-Origin-Opener-Policy"];
  checks.push({
    name: "Cross-Origin-Opener-Policy",
    passed: coop === "same-origin" || coop === "same-origin-allow-popups",
    message: coop ? `Set to: ${coop}` : "Missing header",
  });

  // Calculate score
  const passedCount = checks.filter((c) => c.passed).length;
  const score = Math.round((passedCount / checks.length) * 100);

  return {
    score,
    passed: score >= 80, // 80% threshold
    checks,
  };
}

// ============================================================================
// Export Configuration Helpers
// ============================================================================

/**
 * Create a custom security headers configuration
 *
 * @param overrides - Configuration overrides
 * @returns Complete security headers configuration
 */
export function createSecurityHeadersConfig(
  overrides: Partial<SecurityHeadersConfig>,
): SecurityHeadersConfig {
  return {
    ...DEFAULT_SECURITY_HEADERS_CONFIG,
    ...overrides,
    csp: overrides.csp
      ? mergeCSPConfig(DEFAULT_CSP_CONFIG, overrides.csp)
      : DEFAULT_SECURITY_HEADERS_CONFIG.csp,
    permissionsPolicy: overrides.permissionsPolicy
      ? mergePermissionsPolicyConfig(
          DEFAULT_PERMISSIONS_POLICY,
          overrides.permissionsPolicy,
        )
      : DEFAULT_SECURITY_HEADERS_CONFIG.permissionsPolicy,
    hsts: overrides.hsts
      ? { ...DEFAULT_HSTS_CONFIG, ...overrides.hsts }
      : DEFAULT_SECURITY_HEADERS_CONFIG.hsts,
  };
}

/**
 * Create security headers configuration for video/voice calling
 *
 * @param baseConfig - Base configuration
 * @returns Configuration with calling permissions enabled
 */
export function createCallingSecurityConfig(
  baseConfig: SecurityHeadersConfig = DEFAULT_SECURITY_HEADERS_CONFIG,
): SecurityHeadersConfig {
  return {
    ...baseConfig,
    permissionsPolicy: mergePermissionsPolicyConfig(
      baseConfig.permissionsPolicy,
      {
        features: CALLING_PERMISSIONS_POLICY,
      },
    ),
  };
}

// ============================================================================
// Constants Export
// ============================================================================

export const SECURITY_HEADERS_CONSTANTS = {
  /** Minimum HSTS max-age for production */
  MIN_HSTS_MAX_AGE: 31536000,
  /** Recommended HSTS max-age (2 years) */
  RECOMMENDED_HSTS_MAX_AGE: 63072000,
  /** Default CORS max-age */
  DEFAULT_CORS_MAX_AGE: 86400,
  /** Security headers validation threshold */
  VALIDATION_THRESHOLD: 80,
} as const;
