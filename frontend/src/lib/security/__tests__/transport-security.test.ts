/**
 * Transport Security Tests
 *
 * Comprehensive test suite for transport security utilities including
 * TLS configuration, HSTS, and secure cookie management.
 */

import {
  TLSVersion,
  DEFAULT_TLS_CONFIG,
  WEAK_CIPHER_SUITES,
  getTLSConfig,
  validateTLSVersion,
  isSecureCipher,
  filterSecureCiphers,
  getRecommendedCipherString,
  DEFAULT_HSTS_CONFIG,
  HSTS_PRELOAD_MIN_AGE,
  generateHSTSHeader,
  validateHSTSPreload,
  parseHSTSHeader,
  DEFAULT_SECURE_COOKIE_CONFIG,
  SESSION_COOKIE_CONFIG,
  CSRF_COOKIE_CONFIG,
  getSecureCookieOptions,
  getPrefixedCookieName,
  validateCookieSecurity,
  createSecureSessionCookie,
  generateAuditId,
  auditTransportSecurity,
  logTransportSecurityEvent,
  createTransportSecurityEvent,
  generateTLSConfigHash,
  detectJA3Mismatch,
  TRANSPORT_SECURITY_CONSTANTS,
  type TLSConfig,
  type HSTSConfig,
  type SecureCookieConfig,
  type TransportSecurityEvent,
} from "../transport-security";

// ============================================================================
// TLS Configuration Tests
// ============================================================================

describe("TLS Configuration", () => {
  describe("TLSVersion enum", () => {
    it("should have correct version values", () => {
      expect(TLSVersion.TLS_1_0).toBe("TLSv1");
      expect(TLSVersion.TLS_1_1).toBe("TLSv1.1");
      expect(TLSVersion.TLS_1_2).toBe("TLSv1.2");
      expect(TLSVersion.TLS_1_3).toBe("TLSv1.3");
    });
  });

  describe("DEFAULT_TLS_CONFIG", () => {
    it("should have TLS 1.2 as minimum version", () => {
      expect(DEFAULT_TLS_CONFIG.minVersion).toBe(TLSVersion.TLS_1_2);
    });

    it("should prefer TLS 1.3", () => {
      expect(DEFAULT_TLS_CONFIG.preferredVersion).toBe(TLSVersion.TLS_1_3);
    });

    it("should have secure cipher suites", () => {
      expect(DEFAULT_TLS_CONFIG.cipherSuites.length).toBeGreaterThan(0);
      DEFAULT_TLS_CONFIG.cipherSuites.forEach((cipher) => {
        expect(isSecureCipher(cipher)).toBe(true);
      });
    });

    it("should enable OCSP stapling", () => {
      expect(DEFAULT_TLS_CONFIG.ocspStapling).toBe(true);
    });

    it("should disable 0-RTT by default", () => {
      expect(DEFAULT_TLS_CONFIG.zeroRtt).toBe(false);
    });
  });

  describe("getTLSConfig", () => {
    it("should return default config when no options provided", () => {
      const config = getTLSConfig();
      expect(config).toEqual(DEFAULT_TLS_CONFIG);
    });

    it("should merge custom options with defaults", () => {
      const config = getTLSConfig({ zeroRtt: true });
      expect(config.zeroRtt).toBe(true);
      expect(config.minVersion).toBe(DEFAULT_TLS_CONFIG.minVersion);
    });

    it("should allow overriding minimum version", () => {
      const config = getTLSConfig({ minVersion: TLSVersion.TLS_1_3 });
      expect(config.minVersion).toBe(TLSVersion.TLS_1_3);
    });
  });

  describe("validateTLSVersion", () => {
    it("should accept TLS 1.2 when minimum is TLS 1.2", () => {
      expect(validateTLSVersion(TLSVersion.TLS_1_2, TLSVersion.TLS_1_2)).toBe(
        true,
      );
    });

    it("should accept TLS 1.3 when minimum is TLS 1.2", () => {
      expect(validateTLSVersion(TLSVersion.TLS_1_3, TLSVersion.TLS_1_2)).toBe(
        true,
      );
    });

    it("should reject TLS 1.1 when minimum is TLS 1.2", () => {
      expect(validateTLSVersion(TLSVersion.TLS_1_1, TLSVersion.TLS_1_2)).toBe(
        false,
      );
    });

    it("should reject TLS 1.0 when minimum is TLS 1.2", () => {
      expect(validateTLSVersion(TLSVersion.TLS_1_0, TLSVersion.TLS_1_2)).toBe(
        false,
      );
    });

    it("should accept string version values", () => {
      expect(validateTLSVersion("TLSv1.3", TLSVersion.TLS_1_2)).toBe(true);
    });

    it("should reject invalid version strings", () => {
      expect(validateTLSVersion("invalid", TLSVersion.TLS_1_2)).toBe(false);
    });
  });

  describe("isSecureCipher", () => {
    it("should accept TLS 1.3 cipher suites", () => {
      expect(isSecureCipher("TLS_AES_256_GCM_SHA384")).toBe(true);
      expect(isSecureCipher("TLS_CHACHA20_POLY1305_SHA256")).toBe(true);
      expect(isSecureCipher("TLS_AES_128_GCM_SHA256")).toBe(true);
    });

    it("should accept ECDHE cipher suites", () => {
      expect(isSecureCipher("ECDHE-ECDSA-AES256-GCM-SHA384")).toBe(true);
      expect(isSecureCipher("ECDHE-RSA-AES256-GCM-SHA384")).toBe(true);
    });

    it("should reject RC4 ciphers", () => {
      expect(isSecureCipher("RC4-MD5")).toBe(false);
      expect(isSecureCipher("RC4-SHA")).toBe(false);
    });

    it("should reject DES ciphers", () => {
      expect(isSecureCipher("DES-CBC-SHA")).toBe(false);
      expect(isSecureCipher("DES-CBC3-SHA")).toBe(false);
    });

    it("should reject NULL ciphers", () => {
      expect(isSecureCipher("NULL-MD5")).toBe(false);
      expect(isSecureCipher("NULL-SHA")).toBe(false);
    });

    it("should reject export ciphers", () => {
      expect(isSecureCipher("EXP-RC4-MD5")).toBe(false);
      expect(isSecureCipher("EXP-DES-CBC-SHA")).toBe(false);
    });

    it("should reject anonymous ciphers", () => {
      expect(isSecureCipher("ADH-AES128-SHA")).toBe(false);
      expect(isSecureCipher("AECDH-AES256-SHA")).toBe(false);
    });
  });

  describe("filterSecureCiphers", () => {
    it("should filter out weak ciphers", () => {
      const ciphers = [
        "TLS_AES_256_GCM_SHA384",
        "RC4-MD5",
        "ECDHE-RSA-AES256-GCM-SHA384",
        "DES-CBC-SHA",
      ];
      const secure = filterSecureCiphers(ciphers);

      expect(secure).toContain("TLS_AES_256_GCM_SHA384");
      expect(secure).toContain("ECDHE-RSA-AES256-GCM-SHA384");
      expect(secure).not.toContain("RC4-MD5");
      expect(secure).not.toContain("DES-CBC-SHA");
    });

    it("should return empty array for all weak ciphers", () => {
      const ciphers = ["RC4-MD5", "DES-CBC-SHA", "NULL-SHA"];
      const secure = filterSecureCiphers(ciphers);

      expect(secure).toEqual([]);
    });
  });

  describe("getRecommendedCipherString", () => {
    it("should return a non-empty cipher string", () => {
      const cipherString = getRecommendedCipherString();
      expect(cipherString.length).toBeGreaterThan(0);
    });

    it("should prefer ECDHE ciphers when requested", () => {
      const cipherString = getRecommendedCipherString(true);
      const ciphers = cipherString.split(":");

      // First ECDHE cipher should come before non-ECDHE
      const firstECDHE = ciphers.findIndex((c) => c.startsWith("ECDHE"));
      const firstNonECDHE = ciphers.findIndex(
        (c) => !c.startsWith("ECDHE") && !c.startsWith("TLS_"),
      );

      if (firstECDHE !== -1 && firstNonECDHE !== -1) {
        expect(firstECDHE).toBeLessThan(firstNonECDHE);
      }
    });
  });

  describe("WEAK_CIPHER_SUITES", () => {
    it("should include known weak ciphers", () => {
      expect(WEAK_CIPHER_SUITES).toContain("RC4-MD5");
      expect(WEAK_CIPHER_SUITES).toContain("DES-CBC-SHA");
      expect(WEAK_CIPHER_SUITES).toContain("NULL-MD5");
    });
  });
});

// ============================================================================
// HSTS Tests
// ============================================================================

describe("HSTS Configuration", () => {
  describe("DEFAULT_HSTS_CONFIG", () => {
    it("should have max-age of 2 years", () => {
      expect(DEFAULT_HSTS_CONFIG.maxAge).toBe(63072000);
    });

    it("should include subdomains", () => {
      expect(DEFAULT_HSTS_CONFIG.includeSubDomains).toBe(true);
    });

    it("should enable preload", () => {
      expect(DEFAULT_HSTS_CONFIG.preload).toBe(true);
    });
  });

  describe("generateHSTSHeader", () => {
    it("should generate header with max-age", () => {
      const header = generateHSTSHeader({
        enabled: true,
        maxAge: 31536000,
        includeSubDomains: false,
        preload: false,
      });
      expect(header).toContain("max-age=31536000");
    });

    it("should include includeSubDomains directive", () => {
      const header = generateHSTSHeader({
        enabled: true,
        maxAge: 31536000,
        includeSubDomains: true,
        preload: false,
      });
      expect(header).toContain("includeSubDomains");
    });

    it("should include preload directive", () => {
      const header = generateHSTSHeader({
        enabled: true,
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true,
      });
      expect(header).toContain("preload");
    });

    it("should return empty string when disabled", () => {
      const header = generateHSTSHeader({
        enabled: false,
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true,
      });
      expect(header).toBe("");
    });

    it("should generate complete header for preload", () => {
      // Force enabled to true for testing
      const header = generateHSTSHeader({
        ...DEFAULT_HSTS_CONFIG,
        enabled: true,
      });
      expect(header).toBe("max-age=63072000; includeSubDomains; preload");
    });
  });

  describe("validateHSTSPreload", () => {
    it("should validate compliant configuration", () => {
      // Force enabled to true for testing
      const result = validateHSTSPreload({
        ...DEFAULT_HSTS_CONFIG,
        enabled: true,
      });
      expect(result.eligible).toBe(true);
      expect(result.issues).toEqual([]);
    });

    it("should reject disabled HSTS", () => {
      const result = validateHSTSPreload({
        ...DEFAULT_HSTS_CONFIG,
        enabled: false,
      });
      expect(result.eligible).toBe(false);
      expect(result.issues).toContain("HSTS must be enabled");
    });

    it("should reject short max-age", () => {
      const result = validateHSTSPreload({
        ...DEFAULT_HSTS_CONFIG,
        maxAge: 86400,
      });
      expect(result.eligible).toBe(false);
      expect(result.issues.some((i) => i.includes("max-age"))).toBe(true);
    });

    it("should reject missing includeSubDomains", () => {
      const result = validateHSTSPreload({
        ...DEFAULT_HSTS_CONFIG,
        includeSubDomains: false,
      });
      expect(result.eligible).toBe(false);
      expect(result.issues).toContain(
        "includeSubDomains directive is required for preload",
      );
    });

    it("should reject missing preload", () => {
      const result = validateHSTSPreload({
        ...DEFAULT_HSTS_CONFIG,
        preload: false,
      });
      expect(result.eligible).toBe(false);
      expect(result.issues).toContain("preload directive must be present");
    });
  });

  describe("parseHSTSHeader", () => {
    it("should parse max-age", () => {
      const config = parseHSTSHeader("max-age=31536000");
      expect(config.maxAge).toBe(31536000);
    });

    it("should parse includeSubDomains", () => {
      const config = parseHSTSHeader("max-age=31536000; includeSubDomains");
      expect(config.includeSubDomains).toBe(true);
    });

    it("should parse preload", () => {
      const config = parseHSTSHeader("max-age=31536000; preload");
      expect(config.preload).toBe(true);
    });

    it("should parse complete header", () => {
      const config = parseHSTSHeader(
        "max-age=63072000; includeSubDomains; preload",
      );
      expect(config.maxAge).toBe(63072000);
      expect(config.includeSubDomains).toBe(true);
      expect(config.preload).toBe(true);
    });

    it("should handle case-insensitive directives", () => {
      const config = parseHSTSHeader(
        "max-age=31536000; INCLUDESUBDOMAINS; PRELOAD",
      );
      expect(config.includeSubDomains).toBe(true);
      expect(config.preload).toBe(true);
    });
  });

  describe("HSTS_PRELOAD_MIN_AGE", () => {
    it("should be at least 1 year", () => {
      expect(HSTS_PRELOAD_MIN_AGE).toBeGreaterThanOrEqual(31536000);
    });
  });
});

// ============================================================================
// Cookie Security Tests
// ============================================================================

describe("Cookie Security", () => {
  describe("DEFAULT_SECURE_COOKIE_CONFIG", () => {
    it("should have httpOnly enabled", () => {
      expect(DEFAULT_SECURE_COOKIE_CONFIG.httpOnly).toBe(true);
    });

    it("should use lax sameSite", () => {
      expect(DEFAULT_SECURE_COOKIE_CONFIG.sameSite).toBe("lax");
    });

    it("should have path set to root", () => {
      expect(DEFAULT_SECURE_COOKIE_CONFIG.path).toBe("/");
    });
  });

  describe("SESSION_COOKIE_CONFIG", () => {
    it("should use strict sameSite", () => {
      expect(SESSION_COOKIE_CONFIG.sameSite).toBe("strict");
    });

    it("should have httpOnly enabled", () => {
      expect(SESSION_COOKIE_CONFIG.httpOnly).toBe(true);
    });

    it("should have max-age of 7 days", () => {
      expect(SESSION_COOKIE_CONFIG.maxAge).toBe(86400 * 7);
    });

    it("should use __Host- prefix", () => {
      expect(SESSION_COOKIE_CONFIG.prefix).toBe("Host");
    });
  });

  describe("CSRF_COOKIE_CONFIG", () => {
    it("should use strict sameSite", () => {
      expect(CSRF_COOKIE_CONFIG.sameSite).toBe("strict");
    });

    it("should have max-age of 24 hours", () => {
      expect(CSRF_COOKIE_CONFIG.maxAge).toBe(86400);
    });
  });

  describe("getSecureCookieOptions", () => {
    it("should return default options", () => {
      const options = getSecureCookieOptions();
      expect(options.httpOnly).toBe(true);
      expect(options.path).toBe("/");
    });

    it("should merge custom options", () => {
      const options = getSecureCookieOptions({ maxAge: 3600 });
      expect(options.maxAge).toBe(3600);
      expect(options.httpOnly).toBe(true);
    });

    it("should set domain when provided", () => {
      const options = getSecureCookieOptions({ domain: "example.com" });
      expect(options.domain).toBe("example.com");
    });
  });

  describe("getPrefixedCookieName", () => {
    it("should return original name without prefix", () => {
      expect(getPrefixedCookieName("session")).toBe("session");
    });

    it("should add __Secure- prefix", () => {
      expect(getPrefixedCookieName("session", "Secure")).toBe(
        "__Secure-session",
      );
    });

    it("should add __Host- prefix", () => {
      expect(getPrefixedCookieName("session", "Host")).toBe("__Host-session");
    });
  });

  describe("validateCookieSecurity", () => {
    it("should validate correct __Host- cookie", () => {
      const result = validateCookieSecurity("__Host-session", {
        secure: true,
        httpOnly: true,
        sameSite: "strict",
        path: "/",
      });
      expect(result.secure).toBe(true);
      expect(result.issues).toEqual([]);
    });

    it("should reject __Host- cookie without Secure", () => {
      const result = validateCookieSecurity("__Host-session", {
        secure: false,
        httpOnly: true,
        sameSite: "strict",
        path: "/",
      });
      expect(result.secure).toBe(false);
      expect(result.issues.some((i) => i.includes("Secure"))).toBe(true);
    });

    it("should reject __Host- cookie with Domain", () => {
      const result = validateCookieSecurity("__Host-session", {
        secure: true,
        httpOnly: true,
        sameSite: "strict",
        path: "/",
        domain: "example.com",
      });
      expect(result.secure).toBe(false);
      expect(result.issues.some((i) => i.includes("Domain"))).toBe(true);
    });

    it("should reject __Host- cookie with non-root path", () => {
      const result = validateCookieSecurity("__Host-session", {
        secure: true,
        httpOnly: true,
        sameSite: "strict",
        path: "/api",
      });
      expect(result.secure).toBe(false);
      expect(result.issues.some((i) => i.includes("Path"))).toBe(true);
    });

    it("should reject __Secure- cookie without Secure", () => {
      const result = validateCookieSecurity("__Secure-token", {
        secure: false,
        httpOnly: true,
        sameSite: "lax",
        path: "/",
      });
      expect(result.secure).toBe(false);
      expect(result.issues.some((i) => i.includes("Secure"))).toBe(true);
    });
  });

  describe("createSecureSessionCookie", () => {
    it("should create cookie with prefixed name", () => {
      const cookie = createSecureSessionCookie("session-123");
      expect(cookie.name).toBe("__Host-nchat-session");
    });

    it("should set session value", () => {
      const cookie = createSecureSessionCookie("session-123");
      expect(cookie.value).toBe("session-123");
    });

    it("should have secure options", () => {
      const cookie = createSecureSessionCookie("session-123");
      expect(cookie.options.httpOnly).toBe(true);
      expect(cookie.options.sameSite).toBe("strict");
    });
  });
});

// ============================================================================
// Transport Security Audit Tests
// ============================================================================

describe("Transport Security Audit", () => {
  describe("generateAuditId", () => {
    it("should generate unique IDs", () => {
      const id1 = generateAuditId();
      const id2 = generateAuditId();
      expect(id1).not.toBe(id2);
    });

    it("should start with TSA prefix", () => {
      const id = generateAuditId();
      expect(id.startsWith("TSA-")).toBe(true);
    });
  });

  describe("auditTransportSecurity", () => {
    it("should pass with default configuration", () => {
      const result = auditTransportSecurity({});
      expect(result.passed).toBe(true);
      expect(result.overallScore).toBeGreaterThanOrEqual(70);
    });

    it("should fail for TLS 1.0", () => {
      const result = auditTransportSecurity({
        tlsConfig: { ...DEFAULT_TLS_CONFIG, minVersion: TLSVersion.TLS_1_0 },
      });
      expect(result.tlsScore).toBeLessThan(100);
      expect(result.findings.some((f) => f.id === "TLS-001")).toBe(true);
    });

    it("should warn for TLS 1.1", () => {
      const result = auditTransportSecurity({
        tlsConfig: { ...DEFAULT_TLS_CONFIG, minVersion: TLSVersion.TLS_1_1 },
      });
      expect(result.findings.some((f) => f.id === "TLS-002")).toBe(true);
    });

    it("should fail for disabled HSTS", () => {
      const result = auditTransportSecurity({
        hstsConfig: { ...DEFAULT_HSTS_CONFIG, enabled: false },
      });
      expect(result.hstsScore).toBeLessThan(100);
      expect(result.findings.some((f) => f.id === "HSTS-001")).toBe(true);
    });

    it("should include cookie findings", () => {
      const result = auditTransportSecurity({
        cookies: [
          {
            name: "__Host-session",
            config: {
              secure: false,
              httpOnly: true,
              sameSite: "strict",
              path: "/",
            },
          },
        ],
      });
      expect(result.cookieScore).toBeLessThan(100);
    });

    it("should have timestamp", () => {
      const result = auditTransportSecurity({});
      expect(result.timestamp).toBeInstanceOf(Date);
    });

    it("should calculate overall score", () => {
      const result = auditTransportSecurity({});
      expect(result.overallScore).toBeGreaterThanOrEqual(0);
      expect(result.overallScore).toBeLessThanOrEqual(100);
    });
  });
});

// ============================================================================
// Security Event Logging Tests
// ============================================================================

describe("Security Event Logging", () => {
  describe("createTransportSecurityEvent", () => {
    it("should create event with type", () => {
      const event = createTransportSecurityEvent(
        "tls_downgrade_attempt",
        "critical",
        {},
      );
      expect(event.type).toBe("tls_downgrade_attempt");
    });

    it("should set severity", () => {
      const event = createTransportSecurityEvent(
        "hsts_bypass_attempt",
        "warning",
        {},
      );
      expect(event.severity).toBe("warning");
    });

    it("should include details", () => {
      const event = createTransportSecurityEvent("certificate_error", "error", {
        code: "CERT_EXPIRED",
      });
      expect(event.details).toEqual({ code: "CERT_EXPIRED" });
    });

    it("should include request info", () => {
      const event = createTransportSecurityEvent(
        "transport_audit",
        "info",
        {},
        { ip: "192.168.1.1", userAgent: "Test", url: "https://example.com" },
      );
      expect(event.sourceIp).toBe("192.168.1.1");
      expect(event.userAgent).toBe("Test");
      expect(event.url).toBe("https://example.com");
    });

    it("should set timestamp", () => {
      const event = createTransportSecurityEvent(
        "csp_violation",
        "warning",
        {},
      );
      expect(event.timestamp).toBeInstanceOf(Date);
    });
  });

  describe("logTransportSecurityEvent", () => {
    it("should not throw for valid event", () => {
      const event: TransportSecurityEvent = {
        type: "transport_audit",
        timestamp: new Date(),
        severity: "info",
        details: {},
      };
      expect(() => logTransportSecurityEvent(event)).not.toThrow();
    });
  });
});

// ============================================================================
// Fingerprinting Protection Tests
// ============================================================================

describe("Fingerprinting Protection", () => {
  describe("generateTLSConfigHash", () => {
    it("should generate consistent hash", () => {
      const hash1 = generateTLSConfigHash(DEFAULT_TLS_CONFIG);
      const hash2 = generateTLSConfigHash(DEFAULT_TLS_CONFIG);
      expect(hash1).toBe(hash2);
    });

    it("should generate different hash for different config", () => {
      const hash1 = generateTLSConfigHash(DEFAULT_TLS_CONFIG);
      const hash2 = generateTLSConfigHash({
        ...DEFAULT_TLS_CONFIG,
        minVersion: TLSVersion.TLS_1_3,
      });
      expect(hash1).not.toBe(hash2);
    });

    it("should return 16-character hash", () => {
      const hash = generateTLSConfigHash(DEFAULT_TLS_CONFIG);
      expect(hash.length).toBe(16);
    });
  });

  describe("detectJA3Mismatch", () => {
    it("should return false for empty patterns", () => {
      expect(detectJA3Mismatch("", "")).toBe(false);
    });

    it("should detect mismatch for dissimilar patterns", () => {
      const expected = "cipher1,cipher2,cipher3,cipher4,cipher5";
      const actual = "other1,other2,other3,other4,other5";
      expect(detectJA3Mismatch(expected, actual)).toBe(true);
    });

    it("should not detect mismatch for similar patterns", () => {
      const expected = "cipher1,cipher2,cipher3,cipher4,cipher5";
      const actual = "cipher1,cipher2,cipher3,cipher4,cipher5";
      expect(detectJA3Mismatch(expected, actual)).toBe(false);
    });
  });
});

// ============================================================================
// Constants Tests
// ============================================================================

describe("Transport Security Constants", () => {
  it("should have correct minimum TLS version", () => {
    expect(TRANSPORT_SECURITY_CONSTANTS.MIN_TLS_VERSION).toBe(
      TLSVersion.TLS_1_2,
    );
  });

  it("should have correct recommended TLS version", () => {
    expect(TRANSPORT_SECURITY_CONSTANTS.RECOMMENDED_TLS_VERSION).toBe(
      TLSVersion.TLS_1_3,
    );
  });

  it("should have HSTS preload minimum age", () => {
    expect(TRANSPORT_SECURITY_CONSTANTS.HSTS_PRELOAD_MIN_AGE).toBe(
      HSTS_PRELOAD_MIN_AGE,
    );
  });

  it("should have session cookie max age", () => {
    expect(TRANSPORT_SECURITY_CONSTANTS.SESSION_COOKIE_MAX_AGE).toBe(86400 * 7);
  });

  it("should have CSRF cookie max age", () => {
    expect(TRANSPORT_SECURITY_CONSTANTS.CSRF_COOKIE_MAX_AGE).toBe(86400);
  });

  it("should have default HSTS max age", () => {
    expect(TRANSPORT_SECURITY_CONSTANTS.DEFAULT_HSTS_MAX_AGE).toBe(63072000);
  });
});
