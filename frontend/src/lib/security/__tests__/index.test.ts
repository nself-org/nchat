/**
 * Tests for the inline functions defined in security/index.ts
 *
 * Covers the four pure / near-pure functions that live directly in the file
 * (not re-exported from sub-modules):
 *   - assertProductionSecurity()
 *   - isDevAuthSafe()
 *   - getSecurityHeaders()
 *   - logSecurityEvent()
 *
 * The large volume of re-exports from sub-modules (session-store, two-factor,
 * pin, biometric, sast-scanner, etc.) are tested in their own test files.
 *
 * Coverage intent: get lines 19-114 of index.ts covered in the test suite.
 */

// Mock the logger so we can assert on calls without any I/O side-effects.
// Must come before the import that uses it.
jest.mock("@/lib/logger", () => ({
  logger: {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
  },
}));

// Mock auth config so we can control useDevAuth without touching env vars.
jest.mock("@/config/auth.config", () => ({
  authConfig: {
    useDevAuth: false,
  },
}));

import { logger } from "@/lib/logger";
import {
  assertProductionSecurity,
  getSecurityHeaders,
  isDevAuthSafe,
  logSecurityEvent,
} from "../index";

// ---------------------------------------------------------------------------
// Shared mocks
// ---------------------------------------------------------------------------

const mockLogger = logger as {
  error: jest.Mock;
  warn: jest.Mock;
  info: jest.Mock;
  debug: jest.Mock;
};

// ---------------------------------------------------------------------------
// assertProductionSecurity
// ---------------------------------------------------------------------------

describe("assertProductionSecurity", () => {
  const originalEnv = process.env.NODE_ENV;
  const originalJwtSecret = process.env.JWT_SECRET;

  afterEach(() => {
    // Restore env after each test
    Object.defineProperty(process.env, "NODE_ENV", {
      value: originalEnv,
      writable: true,
      configurable: true,
    });
    if (originalJwtSecret === undefined) {
      delete process.env.JWT_SECRET;
    } else {
      process.env.JWT_SECRET = originalJwtSecret;
    }
  });

  it("does nothing when NODE_ENV is 'test' (not production)", () => {
    // Jest runs with NODE_ENV='test' by default — this should be a no-op.
    expect(() => assertProductionSecurity()).not.toThrow();
  });

  it("does nothing when NODE_ENV is 'development'", () => {
    Object.defineProperty(process.env, "NODE_ENV", {
      value: "development",
      writable: true,
      configurable: true,
    });
    expect(() => assertProductionSecurity()).not.toThrow();
  });

  describe("in production", () => {
    beforeEach(() => {
      Object.defineProperty(process.env, "NODE_ENV", {
        value: "production",
        writable: true,
        configurable: true,
      });
    });

    it("throws if JWT_SECRET is missing", () => {
      delete process.env.JWT_SECRET;
      expect(() => assertProductionSecurity()).toThrow(
        /JWT_SECRET environment variable is not set/,
      );
    });

    it("throws if JWT_SECRET is shorter than 32 characters", () => {
      process.env.JWT_SECRET = "short";
      expect(() => assertProductionSecurity()).toThrow(
        /JWT_SECRET must be at least 32 characters/,
      );
    });

    it("throws if JWT_SECRET contains a weak value ('secret')", () => {
      process.env.JWT_SECRET = "this-is-a-secret-value-but-too-weak-abc";
      expect(() => assertProductionSecurity()).toThrow(
        /JWT_SECRET appears to be a weak or default value/,
      );
    });

    it("throws if JWT_SECRET contains 'development'", () => {
      process.env.JWT_SECRET = "this-is-a-development-key-that-is-long-enough";
      expect(() => assertProductionSecurity()).toThrow(
        /JWT_SECRET appears to be a weak or default value/,
      );
    });

    it("passes with a strong JWT_SECRET (32+ chars, no weak substrings)", () => {
      // 64-char random-looking string — no weak substrings
      process.env.JWT_SECRET = "aB3dE5fG7hI9jK1lM2nO4pQ6rS8tU0vW";
      expect(() => assertProductionSecurity()).not.toThrow();
    });

    it("passes with a 32-char strong secret (exact minimum length)", () => {
      process.env.JWT_SECRET = "aB3dE5fG7hI9jK1lM2nO4pQ6rS8tU0vW"; // exactly 32 chars
      expect(() => assertProductionSecurity()).not.toThrow();
    });
  });
});

// ---------------------------------------------------------------------------
// isDevAuthSafe
// ---------------------------------------------------------------------------

describe("isDevAuthSafe", () => {
  const originalEnv = process.env.NODE_ENV;

  afterEach(() => {
    Object.defineProperty(process.env, "NODE_ENV", {
      value: originalEnv,
      writable: true,
      configurable: true,
    });
  });

  it("returns true in test environment", () => {
    // NODE_ENV='test' → always safe (returns true regardless of useDevAuth)
    expect(isDevAuthSafe()).toBe(true);
  });

  it("returns true in development environment", () => {
    Object.defineProperty(process.env, "NODE_ENV", {
      value: "development",
      writable: true,
      configurable: true,
    });
    expect(isDevAuthSafe()).toBe(true);
  });

  describe("in production", () => {
    beforeEach(() => {
      Object.defineProperty(process.env, "NODE_ENV", {
        value: "production",
        writable: true,
        configurable: true,
      });
    });

    it("returns true when useDevAuth is false (safe: dev auth disabled)", () => {
      // The mock sets useDevAuth: false, so !false = true → safe
      expect(isDevAuthSafe()).toBe(true);
    });
  });
});

// ---------------------------------------------------------------------------
// getSecurityHeaders
// ---------------------------------------------------------------------------

describe("getSecurityHeaders", () => {
  const originalEnv = process.env.NODE_ENV;

  afterEach(() => {
    Object.defineProperty(process.env, "NODE_ENV", {
      value: originalEnv,
      writable: true,
      configurable: true,
    });
  });

  it("returns a non-null object", () => {
    const headers = getSecurityHeaders();
    expect(headers).toBeDefined();
    expect(typeof headers).toBe("object");
    expect(headers).not.toBeNull();
  });

  it("includes X-Content-Type-Options: nosniff", () => {
    expect(getSecurityHeaders()["X-Content-Type-Options"]).toBe("nosniff");
  });

  it("includes X-Frame-Options: DENY", () => {
    expect(getSecurityHeaders()["X-Frame-Options"]).toBe("DENY");
  });

  it("includes X-XSS-Protection", () => {
    expect(getSecurityHeaders()["X-XSS-Protection"]).toBe("1; mode=block");
  });

  it("includes Referrer-Policy", () => {
    expect(getSecurityHeaders()["Referrer-Policy"]).toBe(
      "strict-origin-when-cross-origin",
    );
  });

  it("includes Permissions-Policy", () => {
    expect(getSecurityHeaders()["Permissions-Policy"]).toBe(
      "camera=(), microphone=(), geolocation=()",
    );
  });

  it("does NOT include HSTS header outside production", () => {
    // Jest runs with NODE_ENV='test', so HSTS should be absent
    const headers = getSecurityHeaders();
    expect(headers["Strict-Transport-Security"]).toBeUndefined();
  });

  it("includes HSTS header in production", () => {
    Object.defineProperty(process.env, "NODE_ENV", {
      value: "production",
      writable: true,
      configurable: true,
    });
    const headers = getSecurityHeaders();
    expect(headers["Strict-Transport-Security"]).toBe(
      "max-age=31536000; includeSubDomains",
    );
  });

  it("returns exactly the expected keys in non-production", () => {
    const headers = getSecurityHeaders();
    const keys = Object.keys(headers).sort();
    expect(keys).toEqual([
      "Permissions-Policy",
      "Referrer-Policy",
      "X-Content-Type-Options",
      "X-Frame-Options",
      "X-XSS-Protection",
    ]);
  });

  it("returns 6 keys in production (adds HSTS)", () => {
    Object.defineProperty(process.env, "NODE_ENV", {
      value: "production",
      writable: true,
      configurable: true,
    });
    expect(Object.keys(getSecurityHeaders())).toHaveLength(6);
  });
});

// ---------------------------------------------------------------------------
// logSecurityEvent
// ---------------------------------------------------------------------------

describe("logSecurityEvent", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("calls logger.error for 'critical' level", () => {
    logSecurityEvent("critical-test-event", "critical");
    expect(mockLogger.error).toHaveBeenCalledTimes(1);
    expect(mockLogger.error).toHaveBeenCalledWith(
      "[SECURITY CRITICAL]",
      undefined,
      expect.objectContaining({
        event: "critical-test-event",
        level: "critical",
      }),
    );
  });

  it("calls logger.error for 'error' level", () => {
    logSecurityEvent("error-test-event", "error");
    expect(mockLogger.error).toHaveBeenCalledTimes(1);
    expect(mockLogger.error).toHaveBeenCalledWith(
      "[SECURITY ERROR]",
      undefined,
      expect.objectContaining({ event: "error-test-event", level: "error" }),
    );
  });

  it("calls logger.warn for 'warning' level", () => {
    logSecurityEvent("warning-test-event", "warning");
    expect(mockLogger.warn).toHaveBeenCalledTimes(1);
    expect(mockLogger.warn).toHaveBeenCalledWith(
      "[SECURITY WARNING]",
      expect.objectContaining({
        event: "warning-test-event",
        level: "warning",
      }),
    );
    expect(mockLogger.error).not.toHaveBeenCalled();
  });

  it("does not call logger.error or logger.warn for 'info' level", () => {
    logSecurityEvent("info-test-event", "info");
    expect(mockLogger.error).not.toHaveBeenCalled();
    expect(mockLogger.warn).not.toHaveBeenCalled();
  });

  it("includes event details in the log entry", () => {
    const details = { userId: "u123", ip: "127.0.0.1" };
    logSecurityEvent("suspicious-login", "error", details);
    expect(mockLogger.error).toHaveBeenCalledWith(
      "[SECURITY ERROR]",
      undefined,
      expect.objectContaining({ details, event: "suspicious-login" }),
    );
  });

  it("includes a timestamp string in the log entry", () => {
    logSecurityEvent("timed-event", "critical");
    const [, , logEntry] = mockLogger.error.mock.calls[0] as [
      string,
      undefined,
      { timestamp: string },
    ];
    expect(typeof logEntry.timestamp).toBe("string");
    expect(logEntry.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it("includes NODE_ENV in the log entry", () => {
    logSecurityEvent("env-check", "error");
    const [, , logEntry] = mockLogger.error.mock.calls[0] as [
      string,
      undefined,
      { env: string },
    ];
    expect(logEntry.env).toBe(process.env.NODE_ENV);
  });

  it("works without optional details parameter", () => {
    expect(() => logSecurityEvent("no-details-event", "warning")).not.toThrow();
  });

  it("passes undefined details when not provided", () => {
    logSecurityEvent("no-details-event", "warning");
    const [, logEntry] = mockLogger.warn.mock.calls[0] as [
      string,
      { details: unknown },
    ];
    expect(logEntry.details).toBeUndefined();
  });
});
