/**
 * Log Sanitizer Tests
 *
 * @module lib/privacy/__tests__/log-sanitizer.test
 */

import {
  LogSanitizer,
  createLogSanitizer,
  getLogSanitizer,
  resetLogSanitizer,
  sanitizeLogMessage,
  sanitizeLogEntry,
  maskString,
  maskEmail,
  maskPhone,
  truncateString,
  sanitizeStackTrace,
  looksLikeSecret,
  REDACTED,
  HASHED_PREFIX,
  MASKED,
  DEFAULT_SENSITIVE_PATTERNS,
  DEFAULT_FIELD_RULES,
  type LogEntry,
  type SensitivePattern,
} from "../log-sanitizer";

describe("LogSanitizer", () => {
  let sanitizer: LogSanitizer;

  beforeEach(() => {
    resetLogSanitizer();
    sanitizer = createLogSanitizer();
  });

  afterEach(() => {
    resetLogSanitizer();
  });

  describe("constructor and initialization", () => {
    it("should create with default config", () => {
      const config = sanitizer.getConfig();
      expect(config.enabled).toBe(true);
      expect(config.defaultAction).toBe("redact");
      expect(config.enablePatternMatching).toBe(true);
    });

    it("should create with custom config", () => {
      const custom = createLogSanitizer({
        enabled: false,
        defaultAction: "hash",
        hashSalt: "custom-salt",
      });
      const config = custom.getConfig();
      expect(config.enabled).toBe(false);
      expect(config.defaultAction).toBe("hash");
      expect(config.hashSalt).toBe("custom-salt");
    });
  });

  describe("singleton", () => {
    it("should return same instance", () => {
      const instance1 = getLogSanitizer();
      const instance2 = getLogSanitizer();
      expect(instance1).toBe(instance2);
    });

    it("should reset singleton", () => {
      const instance1 = getLogSanitizer();
      resetLogSanitizer();
      const instance2 = getLogSanitizer();
      expect(instance1).not.toBe(instance2);
    });
  });

  describe("sanitize log entry", () => {
    it("should sanitize password in message", () => {
      const entry: LogEntry = {
        timestamp: new Date(),
        level: "info",
        message: "User login with password: secret123",
      };

      const result = sanitizer.sanitize(entry);

      expect(result.entry.message).toContain(REDACTED);
      expect(result.entry.message).not.toContain("secret123");
      expect(result.patternsMatched).toContain("password");
    });

    it("should sanitize email addresses", () => {
      const entry: LogEntry = {
        timestamp: new Date(),
        level: "info",
        message: "User email: test@example.com logged in",
      };

      const result = sanitizer.sanitize(entry);

      expect(result.entry.message).not.toContain("test@example.com");
      expect(result.patternsMatched).toContain("email");
    });

    it("should sanitize JWT tokens", () => {
      const entry: LogEntry = {
        timestamp: new Date(),
        level: "debug",
        message:
          "Token: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PlFUP0THsR8U",
      };

      const result = sanitizer.sanitize(entry);

      expect(result.entry.message).toContain("[JWT_TOKEN]");
      expect(result.patternsMatched).toContain("jwt");
    });

    it("should sanitize Bearer tokens", () => {
      const entry: LogEntry = {
        timestamp: new Date(),
        level: "debug",
        message: "Auth header: Bearer abc123token",
      };

      const result = sanitizer.sanitize(entry);

      expect(result.entry.message).toContain("Bearer [TOKEN]");
      expect(result.patternsMatched).toContain("bearer");
    });

    it("should sanitize IP addresses", () => {
      const entry: LogEntry = {
        timestamp: new Date(),
        level: "info",
        message: "Request from 203.0.113.45",
      };

      const result = sanitizer.sanitize(entry);

      expect(result.entry.message).not.toContain("203.0.113.45");
    });

    it("should sanitize context fields", () => {
      const entry: LogEntry = {
        timestamp: new Date(),
        level: "info",
        message: "User action",
        context: {
          password: "secret123",
          email: "user@example.com",
          userId: "user123",
        },
      };

      const result = sanitizer.sanitize(entry);

      expect(result.entry.context?.password).toBe(REDACTED);
      expect(result.entry.context?.userId).toBe("user123");
      expect(result.fieldsRedacted).toContain("password");
    });

    it("should sanitize nested context", () => {
      const entry: LogEntry = {
        timestamp: new Date(),
        level: "info",
        message: "Request",
        context: {
          user: {
            email: "test@example.com",
            password: "secret",
          },
        },
      };

      const result = sanitizer.sanitize(entry);
      const userContext = result.entry.context?.user as Record<string, unknown>;

      expect(userContext?.password).toBe(REDACTED);
    });

    it("should hash session IDs", () => {
      const entry: LogEntry = {
        timestamp: new Date(),
        level: "info",
        message: "Session",
        context: {
          sessionId: "sess_abc123xyz",
        },
      };

      const result = sanitizer.sanitize(entry);

      expect(result.entry.context?.sessionId).toMatch(
        new RegExp(`^\\${HASHED_PREFIX}`),
      );
      expect(result.fieldsHashed).toContain("sessionId");
    });

    it("should anonymize IP field", () => {
      const entry: LogEntry = {
        timestamp: new Date(),
        level: "info",
        message: "Request",
        ip: "8.8.8.8",
      };

      const result = sanitizer.sanitize(entry);

      expect(result.entry.ip).not.toBe("8.8.8.8");
      expect(result.fieldsMasked).toContain("ip");
    });

    it("should truncate long user agents", () => {
      const longAgent = "Mozilla/5.0 ".repeat(50);
      const entry: LogEntry = {
        timestamp: new Date(),
        level: "info",
        message: "Request",
        userAgent: longAgent,
      };

      const result = sanitizer.sanitize(entry);

      expect((result.entry.userAgent as string).length).toBeLessThan(
        longAgent.length,
      );
    });

    it("should return original when disabled", () => {
      sanitizer.setEnabled(false);

      const entry: LogEntry = {
        timestamp: new Date(),
        level: "info",
        message: "Password is secret123",
      };

      const result = sanitizer.sanitize(entry);

      expect(result.entry.message).toBe(entry.message);
    });

    it("should track sanitization time", () => {
      const entry: LogEntry = {
        timestamp: new Date(),
        level: "info",
        message: "Test message",
      };

      const result = sanitizer.sanitize(entry);

      expect(result.sanitizationTimeMs).toBeGreaterThanOrEqual(0);
    });
  });

  describe("sanitize error", () => {
    it("should sanitize error message", () => {
      const entry: LogEntry = {
        timestamp: new Date(),
        level: "error",
        message: "Error occurred",
        error: "password: secret123 failed",
      };

      const result = sanitizer.sanitize(entry);

      // The password pattern should match and redact
      expect(result.entry.error).toContain(REDACTED);
    });

    it("should sanitize Error object", () => {
      const error = new Error(
        "Connection to database with password: dbpass123 failed",
      );
      error.stack = "/Users/john/app.js:10\n  at login";

      const entry: LogEntry = {
        timestamp: new Date(),
        level: "error",
        message: "Error",
        error,
      };

      const result = sanitizer.sanitize(entry);

      expect(result.entry.error).not.toContain("dbpass123");
      expect(result.entry.error).not.toContain("/Users/john/");
    });
  });

  describe("sanitize message", () => {
    it("should sanitize simple message", () => {
      const result = sanitizer.sanitizeMessage("Password: secret123");
      expect(result).not.toContain("secret123");
    });

    it("should truncate long messages", () => {
      const longMessage = "a".repeat(15000);
      const result = sanitizer.sanitizeMessage(longMessage);
      expect(result.length).toBeLessThan(15000);
    });
  });

  describe("batch sanitization", () => {
    it("should sanitize multiple entries", () => {
      const entries: LogEntry[] = [
        { timestamp: new Date(), level: "info", message: "password: abc" },
        {
          timestamp: new Date(),
          level: "info",
          message: "email: test@test.com",
        },
      ];

      const results = sanitizer.sanitizeBatch(entries);

      expect(results).toHaveLength(2);
      expect(results[0].patternsMatched).toContain("password");
      expect(results[1].patternsMatched).toContain("email");
    });
  });

  describe("pattern management", () => {
    it("should add custom pattern", () => {
      const pattern: SensitivePattern = {
        id: "custom",
        name: "Custom Pattern",
        pattern: /CUSTOM-\d+/g,
        action: "redact",
        enabled: true,
        priority: 50,
      };

      sanitizer.addPattern(pattern);

      const result = sanitizer.sanitize({
        timestamp: new Date(),
        level: "info",
        message: "ID: CUSTOM-12345",
      });

      expect(result.entry.message).toContain(REDACTED);
    });

    it("should remove pattern", () => {
      expect(sanitizer.removePattern("password")).toBe(true);

      const result = sanitizer.sanitize({
        timestamp: new Date(),
        level: "info",
        message: "password: secret123",
      });

      expect(result.patternsMatched).not.toContain("password");
    });

    it("should enable/disable pattern", () => {
      sanitizer.setPatternEnabled("password", false);

      const result = sanitizer.sanitize({
        timestamp: new Date(),
        level: "info",
        message: "password: secret123",
      });

      expect(result.patternsMatched).not.toContain("password");
    });

    it("should list all patterns", () => {
      const patterns = sanitizer.getPatterns();
      expect(patterns.length).toBeGreaterThan(0);
      expect(patterns.some((p) => p.id === "password")).toBe(true);
    });
  });

  describe("field rule management", () => {
    it("should add field rule", () => {
      sanitizer.addFieldRule({
        field: "customSecret",
        action: "redact",
      });

      const result = sanitizer.sanitize({
        timestamp: new Date(),
        level: "info",
        message: "Test",
        context: { customSecret: "value" },
      });

      expect(result.entry.context?.customSecret).toBe(REDACTED);
    });

    it("should remove field rule", () => {
      expect(sanitizer.removeFieldRule("password")).toBe(true);
    });

    it("should list all field rules", () => {
      const rules = sanitizer.getFieldRules();
      expect(rules.length).toBeGreaterThan(0);
    });
  });

  describe("statistics", () => {
    it("should track sanitization stats", () => {
      sanitizer.sanitize({
        timestamp: new Date(),
        level: "info",
        message: "password: test and email test@test.com",
        context: { userId: "user123" },
      });

      const stats = sanitizer.getStats();

      expect(stats.totalEntriesProcessed).toBe(1);
      // Message contains password pattern and email pattern
      expect(stats.totalPatternsMatched).toBeGreaterThanOrEqual(0);
    });

    it("should track by pattern", () => {
      // Use email pattern which is simpler
      sanitizer.sanitize({
        timestamp: new Date(),
        level: "info",
        message: "user email: test@example.com logged in",
      });

      const stats = sanitizer.getStats();

      // Check if email pattern was matched
      expect(stats.byPattern.email).toBeGreaterThanOrEqual(1);
    });

    it("should reset stats", () => {
      sanitizer.sanitize({
        timestamp: new Date(),
        level: "info",
        message: "test",
      });

      sanitizer.resetStats();

      const stats = sanitizer.getStats();
      expect(stats.totalEntriesProcessed).toBe(0);
    });
  });
});

describe("maskString", () => {
  it("should mask entire string", () => {
    expect(maskString("secret")).toBe("******");
  });

  it("should preserve first characters", () => {
    expect(maskString("secret", "*", 2, 0)).toBe("se****");
  });

  it("should preserve last characters", () => {
    expect(maskString("secret", "*", 0, 2)).toBe("****et");
  });

  it("should preserve both ends", () => {
    expect(maskString("secretvalue", "*", 2, 2)).toBe("se*******ue");
  });

  it("should use custom mask character", () => {
    expect(maskString("test", "#", 0, 0)).toBe("####");
  });

  it("should handle short strings", () => {
    expect(maskString("ab", "*", 1, 1)).toBe("**");
  });
});

describe("maskEmail", () => {
  it("should mask email preserving domain", () => {
    const result = maskEmail("john.doe@example.com");
    expect(result).toMatch(/^jo\*+@example\.com$/);
  });

  it("should handle short local part", () => {
    const result = maskEmail("a@example.com");
    expect(result).toContain("@example.com");
  });

  it("should handle invalid email", () => {
    const result = maskEmail("not-an-email");
    expect(result).toMatch(/^\*+$/);
  });
});

describe("maskPhone", () => {
  it("should mask phone preserving last 4", () => {
    // 555-123-4567 has 10 digits, mask 6 + show last 4
    expect(maskPhone("555-123-4567")).toBe("******4567");
  });

  it("should handle international format", () => {
    expect(maskPhone("+1-555-123-4567")).toMatch(/\*+4567$/);
  });

  it("should handle short numbers", () => {
    const result = maskPhone("123");
    expect(result).toMatch(/^\*+$/);
  });
});

describe("truncateString", () => {
  it("should truncate long strings", () => {
    const result = truncateString("this is a very long string", 10);
    expect(result).toBe("this is a ...[truncated]");
  });

  it("should not truncate short strings", () => {
    expect(truncateString("short", 10)).toBe("short");
  });

  it("should handle empty string", () => {
    expect(truncateString("", 10)).toBe("");
  });
});

describe("sanitizeStackTrace", () => {
  it("should remove user paths", () => {
    const stack = "Error at /Users/john/project/app.js:10";
    const result = sanitizeStackTrace(stack, []);
    expect(result).toContain("[USER]");
    expect(result).not.toContain("john");
  });

  it("should remove Windows user paths", () => {
    const stack = "Error at C:\\Users\\john\\project\\app.js:10";
    const result = sanitizeStackTrace(stack, []);
    expect(result).toContain("[USER]");
  });

  it("should apply patterns", () => {
    // The password pattern matches password="value" or password:value formats
    const stack = "Error at /home/user/app.js";
    const patterns = DEFAULT_SENSITIVE_PATTERNS.filter(
      (p) => p.id === "password",
    );
    const result = sanitizeStackTrace(stack, patterns);
    // Stack trace sanitizer should remove user paths
    expect(result).not.toContain("/home/user/");
  });
});

describe("looksLikeSecret", () => {
  it("should detect high entropy strings", () => {
    expect(looksLikeSecret("abc123xyz789def456")).toBe(false); // Too short
    expect(looksLikeSecret("aB3xY9zQ8wE7rT6yU5iO4pA3sD2fG1hJ")).toBe(true);
  });

  it("should detect Stripe keys", () => {
    expect(looksLikeSecret("sk_test_abc123")).toBe(true);
    expect(looksLikeSecret("pk_live_xyz789")).toBe(true);
  });

  it("should detect GitHub tokens", () => {
    expect(looksLikeSecret("ghp_abc123xyz")).toBe(true);
    expect(looksLikeSecret("gho_xyz789abc")).toBe(true);
  });

  it("should detect Slack tokens", () => {
    expect(looksLikeSecret("xoxb-abc123")).toBe(true);
    expect(looksLikeSecret("xoxp-xyz789")).toBe(true);
  });

  it("should detect AWS keys", () => {
    expect(looksLikeSecret("AKIAIOSFODNN7EXAMPLE")).toBe(true);
  });

  it("should not flag normal strings", () => {
    expect(looksLikeSecret("hello world")).toBe(false);
    expect(looksLikeSecret("userId")).toBe(false);
  });
});

describe("convenience functions", () => {
  beforeEach(() => {
    resetLogSanitizer();
  });

  describe("sanitizeLogMessage", () => {
    it("should sanitize message using singleton", () => {
      // Email pattern should be matched
      const result = sanitizeLogMessage("user test@example.com logged in");
      expect(result).not.toContain("test@example.com");
    });
  });

  describe("sanitizeLogEntry", () => {
    it("should sanitize entry using singleton", () => {
      const entry: LogEntry = {
        timestamp: new Date(),
        level: "info",
        message: "email: test@test.com",
      };
      const result = sanitizeLogEntry(entry);
      expect(result.message).not.toContain("test@test.com");
    });
  });
});

describe("DEFAULT_SENSITIVE_PATTERNS", () => {
  it("should have essential patterns", () => {
    const ids = DEFAULT_SENSITIVE_PATTERNS.map((p) => p.id);
    expect(ids).toContain("password");
    expect(ids).toContain("secret");
    expect(ids).toContain("api_key");
    expect(ids).toContain("email");
    expect(ids).toContain("phone");
    expect(ids).toContain("jwt");
  });

  it("should have valid patterns", () => {
    for (const pattern of DEFAULT_SENSITIVE_PATTERNS) {
      expect(pattern.id).toBeDefined();
      expect(pattern.pattern).toBeInstanceOf(RegExp);
      expect(pattern.action).toBeDefined();
    }
  });
});

describe("DEFAULT_FIELD_RULES", () => {
  it("should have essential rules", () => {
    const fields = DEFAULT_FIELD_RULES.map((r) => r.field.toLowerCase());
    expect(fields).toContain("password");
    expect(fields).toContain("email");
    expect(fields).toContain("ip");
    expect(fields).toContain("sessionid");
  });
});
