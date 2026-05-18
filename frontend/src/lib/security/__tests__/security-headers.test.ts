/**
 * Security Headers Tests
 *
 * Comprehensive test suite for security headers including CSP,
 * Permissions Policy, CORS, and header validation.
 */

import {
  // CSP
  DEFAULT_CSP_CONFIG,
  DEVELOPMENT_CSP_CONFIG,
  generateNonce,
  createNonceSource,
  buildCSPHeader,
  mergeCSPConfig,
  addCSPSources,
  validateCSPHeader,
  // Permissions Policy
  DEFAULT_PERMISSIONS_POLICY,
  CALLING_PERMISSIONS_POLICY,
  buildPermissionsPolicyHeader,
  mergePermissionsPolicyConfig,
  // CORS
  DEFAULT_CORS_CONFIG,
  buildCORSHeaders,
  // Report-To
  buildReportToHeader,
  // Complete Header Generation
  DEFAULT_SECURITY_HEADERS_CONFIG,
  generateSecurityHeaders,
  getStaticAssetHeaders,
  getAPISecurityHeaders,
  // Validation
  validateSecurityHeaders,
  // Configuration Helpers
  createSecurityHeadersConfig,
  createCallingSecurityConfig,
  // Constants
  SECURITY_HEADERS_CONSTANTS,
  type CSPConfig,
  type PermissionsPolicyConfig,
  type CORSConfig,
  type SecurityHeadersConfig,
  type ReportToConfig,
} from "../security-headers";

// ============================================================================
// CSP Tests
// ============================================================================

describe("Content Security Policy", () => {
  describe("generateNonce", () => {
    it("should generate a non-empty string", () => {
      const nonce = generateNonce();
      expect(nonce.length).toBeGreaterThan(0);
    });

    it("should generate unique nonces", () => {
      const nonce1 = generateNonce();
      const nonce2 = generateNonce();
      expect(nonce1).not.toBe(nonce2);
    });

    it("should generate base64-encoded string", () => {
      const nonce = generateNonce();
      expect(() => Buffer.from(nonce, "base64")).not.toThrow();
    });
  });

  describe("createNonceSource", () => {
    it("should create valid nonce source", () => {
      const source = createNonceSource("test123");
      expect(source).toBe("'nonce-test123'");
    });
  });

  describe("DEFAULT_CSP_CONFIG", () => {
    it("should have default-src set to self", () => {
      expect(DEFAULT_CSP_CONFIG.directives["default-src"]).toContain("'self'");
    });

    it("should have object-src set to none", () => {
      expect(DEFAULT_CSP_CONFIG.directives["object-src"]).toContain("'none'");
    });

    it("should have frame-ancestors set to none", () => {
      expect(DEFAULT_CSP_CONFIG.directives["frame-ancestors"]).toContain(
        "'none'",
      );
    });

    it("should use nonces by default", () => {
      expect(DEFAULT_CSP_CONFIG.useNonces).toBe(true);
    });

    it("should not be report-only", () => {
      expect(DEFAULT_CSP_CONFIG.reportOnly).toBe(false);
    });
  });

  describe("DEVELOPMENT_CSP_CONFIG", () => {
    it("should allow unsafe-eval for HMR", () => {
      expect(DEVELOPMENT_CSP_CONFIG.directives["script-src"]).toContain(
        "'unsafe-eval'",
      );
    });

    it("should allow unsafe-inline for development", () => {
      expect(DEVELOPMENT_CSP_CONFIG.directives["script-src"]).toContain(
        "'unsafe-inline'",
      );
    });

    it("should be report-only in development", () => {
      expect(DEVELOPMENT_CSP_CONFIG.reportOnly).toBe(true);
    });

    it("should allow localhost connections", () => {
      expect(
        DEVELOPMENT_CSP_CONFIG.directives["connect-src"]?.some((s) =>
          s.includes("localhost"),
        ),
      ).toBe(true);
    });
  });

  describe("buildCSPHeader", () => {
    it("should build header from config", () => {
      const header = buildCSPHeader(DEFAULT_CSP_CONFIG);
      expect(header.length).toBeGreaterThan(0);
    });

    it("should include default-src", () => {
      const header = buildCSPHeader(DEFAULT_CSP_CONFIG);
      expect(header).toContain("default-src 'self'");
    });

    it("should include object-src none", () => {
      const header = buildCSPHeader(DEFAULT_CSP_CONFIG);
      expect(header).toContain("object-src 'none'");
    });

    it("should add nonce when provided", () => {
      const header = buildCSPHeader(DEFAULT_CSP_CONFIG, "testnonce");
      expect(header).toContain("'nonce-testnonce'");
    });

    it("should remove unsafe-inline when nonce is used", () => {
      const config: CSPConfig = {
        ...DEFAULT_CSP_CONFIG,
        directives: {
          ...DEFAULT_CSP_CONFIG.directives,
          "script-src": ["'self'", "'unsafe-inline'"],
        },
      };

      const header = buildCSPHeader(config, "testnonce");
      expect(header).not.toContain("script-src 'self' 'unsafe-inline'");
    });

    it("should include report-uri when configured", () => {
      const header = buildCSPHeader(DEFAULT_CSP_CONFIG);
      expect(header).toContain("report-uri /api/security/csp-report");
    });

    it("should include boolean directives without values", () => {
      const config: CSPConfig = {
        ...DEFAULT_CSP_CONFIG,
        directives: {
          ...DEFAULT_CSP_CONFIG.directives,
          "upgrade-insecure-requests": [],
        },
      };

      const header = buildCSPHeader(config);
      expect(header).toContain("upgrade-insecure-requests");
    });
  });

  describe("mergeCSPConfig", () => {
    it("should merge directives", () => {
      const merged = mergeCSPConfig(DEFAULT_CSP_CONFIG, {
        directives: {
          "img-src": ["'self'", "https://cdn.example.com"],
        },
      });

      expect(merged.directives["img-src"]).toContain("https://cdn.example.com");
    });

    it("should preserve base directives not overridden", () => {
      const merged = mergeCSPConfig(DEFAULT_CSP_CONFIG, {
        directives: {
          "img-src": ["'self'"],
        },
      });

      expect(merged.directives["default-src"]).toEqual(
        DEFAULT_CSP_CONFIG.directives["default-src"],
      );
    });

    it("should merge non-directive options", () => {
      const merged = mergeCSPConfig(DEFAULT_CSP_CONFIG, {
        reportOnly: true,
      });

      expect(merged.reportOnly).toBe(true);
    });
  });

  describe("addCSPSources", () => {
    it("should add sources to existing directive", () => {
      const updated = addCSPSources(DEFAULT_CSP_CONFIG, "img-src", [
        "https://new.example.com",
      ]);
      expect(updated.directives["img-src"]).toContain(
        "https://new.example.com",
      );
    });

    it("should create directive if not exists", () => {
      const config: CSPConfig = {
        ...DEFAULT_CSP_CONFIG,
        directives: {},
      };

      const updated = addCSPSources(config, "img-src", ["'self'"]);
      expect(updated.directives["img-src"]).toContain("'self'");
    });
  });

  describe("validateCSPHeader", () => {
    it("should validate correct CSP", () => {
      // Build a minimal valid CSP
      const validCSP =
        "default-src 'self'; script-src 'self' 'strict-dynamic'; object-src 'none'; frame-ancestors 'none'";
      const result = validateCSPHeader(validCSP);
      expect(result.valid).toBe(true);
      expect(result.errors.length).toBe(0);
    });

    it("should warn about unsafe-eval", () => {
      const header = "default-src 'self'; script-src 'self' 'unsafe-eval'";
      const result = validateCSPHeader(header);
      expect(result.warnings.some((w) => w.includes("unsafe-eval"))).toBe(true);
    });

    it("should warn about unsafe-inline without nonce", () => {
      const header = "default-src 'self'; script-src 'self' 'unsafe-inline'";
      const result = validateCSPHeader(header);
      expect(result.warnings.some((w) => w.includes("unsafe-inline"))).toBe(
        true,
      );
    });

    it("should error on missing default-src", () => {
      const header = "script-src 'self'; object-src 'none'";
      const result = validateCSPHeader(header);
      expect(result.errors.some((e) => e.includes("default-src"))).toBe(true);
    });

    it("should warn about missing object-src", () => {
      const header = "default-src 'self'; script-src 'self'";
      const result = validateCSPHeader(header);
      expect(result.warnings.some((w) => w.includes("object-src"))).toBe(true);
    });

    it("should error on data: in script-src", () => {
      const header = "default-src 'self'; script-src 'self' data:";
      const result = validateCSPHeader(header);
      expect(result.errors.some((e) => e.includes("data:"))).toBe(true);
    });
  });
});

// ============================================================================
// Permissions Policy Tests
// ============================================================================

describe("Permissions Policy", () => {
  describe("DEFAULT_PERMISSIONS_POLICY", () => {
    it("should disable geolocation", () => {
      expect(DEFAULT_PERMISSIONS_POLICY.features.geolocation).toBe("none");
    });

    it("should disable camera by default", () => {
      expect(DEFAULT_PERMISSIONS_POLICY.features.camera).toBe("none");
    });

    it("should disable microphone by default", () => {
      expect(DEFAULT_PERMISSIONS_POLICY.features.microphone).toBe("none");
    });

    it("should allow fullscreen for self", () => {
      expect(DEFAULT_PERMISSIONS_POLICY.features.fullscreen).toBe("self");
    });

    it("should allow publickey-credentials", () => {
      expect(
        DEFAULT_PERMISSIONS_POLICY.features["publickey-credentials-get"],
      ).toBe("self");
    });
  });

  describe("CALLING_PERMISSIONS_POLICY", () => {
    it("should allow camera for self", () => {
      expect(CALLING_PERMISSIONS_POLICY.camera).toBe("self");
    });

    it("should allow microphone for self", () => {
      expect(CALLING_PERMISSIONS_POLICY.microphone).toBe("self");
    });

    it("should allow display-capture for self", () => {
      expect(CALLING_PERMISSIONS_POLICY["display-capture"]).toBe("self");
    });
  });

  describe("buildPermissionsPolicyHeader", () => {
    it("should build header from config", () => {
      const header = buildPermissionsPolicyHeader(DEFAULT_PERMISSIONS_POLICY);
      expect(header.length).toBeGreaterThan(0);
    });

    it("should format none as ()", () => {
      const header = buildPermissionsPolicyHeader({
        features: { geolocation: "none" },
      });
      expect(header).toContain("geolocation=()");
    });

    it("should format self correctly", () => {
      const header = buildPermissionsPolicyHeader({
        features: { fullscreen: "self" },
      });
      expect(header).toContain("fullscreen=self");
    });

    it("should format array of origins", () => {
      const header = buildPermissionsPolicyHeader({
        features: { camera: ["self", "https://example.com"] },
      });
      expect(header).toContain('camera=(self "https://example.com")');
    });

    it("should format wildcard correctly", () => {
      const header = buildPermissionsPolicyHeader({
        features: { autoplay: "*" },
      });
      expect(header).toContain("autoplay=*");
    });
  });

  describe("mergePermissionsPolicyConfig", () => {
    it("should merge features", () => {
      const merged = mergePermissionsPolicyConfig(DEFAULT_PERMISSIONS_POLICY, {
        features: { camera: "self" },
      });

      expect(merged.features.camera).toBe("self");
    });

    it("should preserve unmerged features", () => {
      const merged = mergePermissionsPolicyConfig(DEFAULT_PERMISSIONS_POLICY, {
        features: { camera: "self" },
      });

      expect(merged.features.geolocation).toBe(
        DEFAULT_PERMISSIONS_POLICY.features.geolocation,
      );
    });
  });
});

// ============================================================================
// CORS Tests
// ============================================================================

describe("CORS Configuration", () => {
  describe("DEFAULT_CORS_CONFIG", () => {
    it("should include standard methods", () => {
      expect(DEFAULT_CORS_CONFIG.allowedMethods).toContain("GET");
      expect(DEFAULT_CORS_CONFIG.allowedMethods).toContain("POST");
      expect(DEFAULT_CORS_CONFIG.allowedMethods).toContain("PUT");
      expect(DEFAULT_CORS_CONFIG.allowedMethods).toContain("DELETE");
    });

    it("should allow credentials", () => {
      expect(DEFAULT_CORS_CONFIG.allowCredentials).toBe(true);
    });

    it("should have 24-hour max age", () => {
      expect(DEFAULT_CORS_CONFIG.maxAge).toBe(86400);
    });
  });

  describe("buildCORSHeaders", () => {
    it("should include allowed methods", () => {
      const headers = buildCORSHeaders(
        DEFAULT_CORS_CONFIG,
        "https://example.com",
      );
      expect(headers["Access-Control-Allow-Methods"]).toBeDefined();
    });

    it("should include allowed headers", () => {
      const headers = buildCORSHeaders(
        DEFAULT_CORS_CONFIG,
        "https://example.com",
      );
      expect(headers["Access-Control-Allow-Headers"]).toBeDefined();
    });

    it("should include max age", () => {
      const headers = buildCORSHeaders(
        DEFAULT_CORS_CONFIG,
        "https://example.com",
      );
      expect(headers["Access-Control-Max-Age"]).toBe("86400");
    });

    it("should set origin when allowed", () => {
      const config: CORSConfig = {
        ...DEFAULT_CORS_CONFIG,
        allowedOrigins: ["https://example.com"],
      };

      const headers = buildCORSHeaders(config, "https://example.com");
      expect(headers["Access-Control-Allow-Origin"]).toBe(
        "https://example.com",
      );
    });

    it("should not set origin when not allowed", () => {
      const config: CORSConfig = {
        ...DEFAULT_CORS_CONFIG,
        allowedOrigins: ["https://other.com"],
      };

      const headers = buildCORSHeaders(config, "https://example.com");
      expect(headers["Access-Control-Allow-Origin"]).toBeUndefined();
    });

    it("should support wildcard origin", () => {
      const config: CORSConfig = {
        ...DEFAULT_CORS_CONFIG,
        allowedOrigins: ["*"],
      };

      const headers = buildCORSHeaders(config);
      expect(headers["Access-Control-Allow-Origin"]).toBe("*");
    });

    it("should include credentials when allowed", () => {
      const config: CORSConfig = {
        ...DEFAULT_CORS_CONFIG,
        allowedOrigins: ["https://example.com"],
      };

      const headers = buildCORSHeaders(config, "https://example.com");
      expect(headers["Access-Control-Allow-Credentials"]).toBe("true");
    });

    it("should include exposed headers", () => {
      const headers = buildCORSHeaders(
        DEFAULT_CORS_CONFIG,
        "https://example.com",
      );
      expect(headers["Access-Control-Expose-Headers"]).toBeDefined();
    });
  });
});

// ============================================================================
// Report-To Tests
// ============================================================================

describe("Report-To Header", () => {
  describe("buildReportToHeader", () => {
    it("should build valid JSON", () => {
      const config: ReportToConfig = {
        group: "default",
        maxAge: 86400,
        endpoints: [{ url: "https://example.com/report" }],
      };

      const header = buildReportToHeader(config);
      expect(() => JSON.parse(header)).not.toThrow();
    });

    it("should include group name", () => {
      const config: ReportToConfig = {
        group: "csp-endpoint",
        maxAge: 86400,
        endpoints: [{ url: "https://example.com/report" }],
      };

      const header = buildReportToHeader(config);
      const parsed = JSON.parse(header);
      expect(parsed.group).toBe("csp-endpoint");
    });

    it("should include max_age", () => {
      const config: ReportToConfig = {
        group: "default",
        maxAge: 86400,
        endpoints: [{ url: "https://example.com/report" }],
      };

      const header = buildReportToHeader(config);
      const parsed = JSON.parse(header);
      expect(parsed.max_age).toBe(86400);
    });

    it("should include endpoints", () => {
      const config: ReportToConfig = {
        group: "default",
        maxAge: 86400,
        endpoints: [
          { url: "https://example.com/report", priority: 1 },
          { url: "https://backup.example.com/report", priority: 2 },
        ],
      };

      const header = buildReportToHeader(config);
      const parsed = JSON.parse(header);
      expect(parsed.endpoints.length).toBe(2);
    });
  });
});

// ============================================================================
// Complete Header Generation Tests
// ============================================================================

describe("Complete Security Headers", () => {
  describe("DEFAULT_SECURITY_HEADERS_CONFIG", () => {
    it("should have CSP configured", () => {
      expect(DEFAULT_SECURITY_HEADERS_CONFIG.csp).toBeDefined();
    });

    it("should have HSTS configured", () => {
      expect(DEFAULT_SECURITY_HEADERS_CONFIG.hsts).toBeDefined();
    });

    it("should have X-Frame-Options as DENY", () => {
      expect(DEFAULT_SECURITY_HEADERS_CONFIG.frameOptions).toBe("DENY");
    });

    it("should have nosniff content type options", () => {
      expect(DEFAULT_SECURITY_HEADERS_CONFIG.contentTypeOptions).toBe(
        "nosniff",
      );
    });

    it("should have strict referrer policy", () => {
      expect(DEFAULT_SECURITY_HEADERS_CONFIG.referrerPolicy).toBe(
        "strict-origin-when-cross-origin",
      );
    });
  });

  describe("generateSecurityHeaders", () => {
    it("should generate all required headers", () => {
      const { headers } = generateSecurityHeaders();

      expect(headers["Content-Security-Policy"]).toBeDefined();
      expect(headers["X-Frame-Options"]).toBeDefined();
      expect(headers["X-Content-Type-Options"]).toBeDefined();
      expect(headers["Referrer-Policy"]).toBeDefined();
      expect(headers["Permissions-Policy"]).toBeDefined();
    });

    it("should generate nonce when enabled", () => {
      const { nonce } = generateSecurityHeaders(
        DEFAULT_SECURITY_HEADERS_CONFIG,
        {
          generateNonce: true,
        },
      );

      expect(nonce).toBeDefined();
      expect(nonce!.length).toBeGreaterThan(0);
    });

    it("should include nonce in header", () => {
      const { headers, nonce } = generateSecurityHeaders(
        DEFAULT_SECURITY_HEADERS_CONFIG,
        {
          generateNonce: true,
        },
      );

      expect(headers["X-Nonce"]).toBe(nonce);
    });

    it("should use development CSP in development mode", () => {
      const { headers } = generateSecurityHeaders(
        DEFAULT_SECURITY_HEADERS_CONFIG,
        {
          isDevelopment: true,
        },
      );

      // Development CSP is report-only
      expect(headers["Content-Security-Policy-Report-Only"]).toBeDefined();
    });

    it("should not include HSTS in development", () => {
      const { headers } = generateSecurityHeaders(
        DEFAULT_SECURITY_HEADERS_CONFIG,
        {
          isDevelopment: true,
        },
      );

      expect(headers["Strict-Transport-Security"]).toBeUndefined();
    });

    it("should include HSTS in production", () => {
      // Force HSTS enabled for testing
      const configWithHSTS: SecurityHeadersConfig = {
        ...DEFAULT_SECURITY_HEADERS_CONFIG,
        hsts: { ...DEFAULT_SECURITY_HEADERS_CONFIG.hsts, enabled: true },
      };

      const { headers } = generateSecurityHeaders(configWithHSTS, {
        isDevelopment: false,
      });

      expect(headers["Strict-Transport-Security"]).toBeDefined();
    });

    it("should include CORS headers when configured", () => {
      const config: SecurityHeadersConfig = {
        ...DEFAULT_SECURITY_HEADERS_CONFIG,
        cors: {
          ...DEFAULT_CORS_CONFIG,
          allowedOrigins: ["https://example.com"],
        },
      };

      const { headers } = generateSecurityHeaders(config, {
        requestOrigin: "https://example.com",
      });

      expect(headers["Access-Control-Allow-Origin"]).toBe(
        "https://example.com",
      );
    });

    it("should include XSS protection header", () => {
      const { headers } = generateSecurityHeaders();
      expect(headers["X-XSS-Protection"]).toBe("1; mode=block");
    });

    it("should include cross-origin policies", () => {
      const { headers } = generateSecurityHeaders();
      expect(headers["Cross-Origin-Opener-Policy"]).toBeDefined();
      expect(headers["Cross-Origin-Embedder-Policy"]).toBeDefined();
      expect(headers["Cross-Origin-Resource-Policy"]).toBeDefined();
    });
  });

  describe("getStaticAssetHeaders", () => {
    it("should include cache control", () => {
      const headers = getStaticAssetHeaders();
      expect(headers["Cache-Control"]).toContain("max-age=31536000");
    });

    it("should include nosniff", () => {
      const headers = getStaticAssetHeaders();
      expect(headers["X-Content-Type-Options"]).toBe("nosniff");
    });

    it("should allow cross-origin resource policy", () => {
      const headers = getStaticAssetHeaders();
      expect(headers["Cross-Origin-Resource-Policy"]).toBe("cross-origin");
    });
  });

  describe("getAPISecurityHeaders", () => {
    it("should not include CSP", () => {
      const headers = getAPISecurityHeaders();
      expect(headers["Content-Security-Policy"]).toBeUndefined();
    });

    it("should include X-Frame-Options", () => {
      const headers = getAPISecurityHeaders();
      expect(headers["X-Frame-Options"]).toBe("DENY");
    });

    it("should include X-Content-Type-Options", () => {
      const headers = getAPISecurityHeaders();
      expect(headers["X-Content-Type-Options"]).toBe("nosniff");
    });
  });
});

// ============================================================================
// Header Validation Tests
// ============================================================================

describe("Security Header Validation", () => {
  describe("validateSecurityHeaders", () => {
    it("should pass for complete headers", () => {
      const { headers } = generateSecurityHeaders(
        DEFAULT_SECURITY_HEADERS_CONFIG,
        {
          isDevelopment: false,
        },
      );

      const result = validateSecurityHeaders(headers);
      expect(result.passed).toBe(true);
    });

    it("should calculate score", () => {
      const { headers } = generateSecurityHeaders();
      const result = validateSecurityHeaders(headers);
      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(100);
    });

    it("should check X-Frame-Options", () => {
      const result = validateSecurityHeaders({
        "X-Frame-Options": "DENY",
      });

      const frameCheck = result.checks.find(
        (c) => c.name === "X-Frame-Options",
      );
      expect(frameCheck?.passed).toBe(true);
    });

    it("should check X-Content-Type-Options", () => {
      const result = validateSecurityHeaders({
        "X-Content-Type-Options": "nosniff",
      });

      const contentCheck = result.checks.find(
        (c) => c.name === "X-Content-Type-Options",
      );
      expect(contentCheck?.passed).toBe(true);
    });

    it("should check HSTS", () => {
      const result = validateSecurityHeaders({
        "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
      });

      const hstsCheck = result.checks.find(
        (c) => c.name === "Strict-Transport-Security",
      );
      expect(hstsCheck?.passed).toBe(true);
    });

    it("should fail HSTS with short max-age", () => {
      const result = validateSecurityHeaders({
        "Strict-Transport-Security": "max-age=86400",
      });

      const hstsCheck = result.checks.find(
        (c) => c.name === "Strict-Transport-Security",
      );
      expect(hstsCheck?.passed).toBe(false);
    });

    it("should check CSP presence", () => {
      const result = validateSecurityHeaders({
        "Content-Security-Policy": "default-src 'self'",
      });

      const cspCheck = result.checks.find(
        (c) => c.name === "Content-Security-Policy",
      );
      expect(cspCheck?.passed).toBe(true);
    });

    it("should check Referrer-Policy", () => {
      const result = validateSecurityHeaders({
        "Referrer-Policy": "strict-origin-when-cross-origin",
      });

      const referrerCheck = result.checks.find(
        (c) => c.name === "Referrer-Policy",
      );
      expect(referrerCheck?.passed).toBe(true);
    });
  });
});

// ============================================================================
// Configuration Helpers Tests
// ============================================================================

describe("Configuration Helpers", () => {
  describe("createSecurityHeadersConfig", () => {
    it("should merge with defaults", () => {
      const config = createSecurityHeadersConfig({
        frameOptions: "SAMEORIGIN",
      });

      expect(config.frameOptions).toBe("SAMEORIGIN");
      expect(config.contentTypeOptions).toBe("nosniff");
    });

    it("should merge CSP config", () => {
      const config = createSecurityHeadersConfig({
        csp: {
          reportOnly: true,
        },
      });

      expect(config.csp.reportOnly).toBe(true);
      expect(config.csp.directives["default-src"]).toBeDefined();
    });

    it("should merge permissions policy", () => {
      const config = createSecurityHeadersConfig({
        permissionsPolicy: {
          features: { camera: "self" },
        },
      });

      expect(config.permissionsPolicy.features.camera).toBe("self");
      expect(config.permissionsPolicy.features.geolocation).toBeDefined();
    });
  });

  describe("createCallingSecurityConfig", () => {
    it("should enable camera for self", () => {
      const config = createCallingSecurityConfig();
      expect(config.permissionsPolicy.features.camera).toBe("self");
    });

    it("should enable microphone for self", () => {
      const config = createCallingSecurityConfig();
      expect(config.permissionsPolicy.features.microphone).toBe("self");
    });

    it("should enable display-capture for self", () => {
      const config = createCallingSecurityConfig();
      expect(config.permissionsPolicy.features["display-capture"]).toBe("self");
    });

    it("should preserve other config", () => {
      const config = createCallingSecurityConfig(
        DEFAULT_SECURITY_HEADERS_CONFIG,
      );
      expect(config.frameOptions).toBe(
        DEFAULT_SECURITY_HEADERS_CONFIG.frameOptions,
      );
    });
  });
});

// ============================================================================
// Constants Tests
// ============================================================================

describe("Security Headers Constants", () => {
  it("should have minimum HSTS max-age", () => {
    expect(SECURITY_HEADERS_CONSTANTS.MIN_HSTS_MAX_AGE).toBe(31536000);
  });

  it("should have recommended HSTS max-age", () => {
    expect(SECURITY_HEADERS_CONSTANTS.RECOMMENDED_HSTS_MAX_AGE).toBe(63072000);
  });

  it("should have default CORS max-age", () => {
    expect(SECURITY_HEADERS_CONSTANTS.DEFAULT_CORS_MAX_AGE).toBe(86400);
  });

  it("should have validation threshold", () => {
    expect(SECURITY_HEADERS_CONSTANTS.VALIDATION_THRESHOLD).toBe(80);
  });
});
