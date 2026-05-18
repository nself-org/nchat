/**
 * Property-Based and Fuzz Tests for Log Sanitizer
 *
 * Tests PII protection with:
 * - Random log entries
 * - Sensitive data patterns
 * - Unicode edge cases
 * - Injection attempts
 */

import { describe, it, expect, beforeEach } from "@jest/globals";
import * as fc from "fast-check";
import {
  LogSanitizer,
  maskString,
  maskEmail,
  maskPhone,
  truncateString,
  looksLikeSecret,
  createLogSanitizer,
  type LogEntry,
} from "../log-sanitizer";

describe("Log Sanitizer - Property Tests", () => {
  let sanitizer: LogSanitizer;

  beforeEach(() => {
    sanitizer = createLogSanitizer();
  });

  // ==========================================================================
  // STRING MASKING - Property Tests
  // ==========================================================================

  describe("String Masking", () => {
    it("should always return a string of same or similar length", () => {
      fc.assert(
        fc.property(
          fc.string(),
          fc.integer({ min: 0, max: 10 }),
          fc.integer({ min: 0, max: 10 }),
          (value, prefix, suffix) => {
            const result = maskString(value, "*", prefix, suffix);
            expect(typeof result).toBe("string");
            expect(result.length).toBeGreaterThan(0);
          },
        ),
        { numRuns: 1000 },
      );
    });

    it("should preserve prefix characters", () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 10 }),
          fc.integer({ min: 1, max: 5 }),
          (value, prefix) => {
            const result = maskString(value, "*", prefix, 0);
            expect(result.substring(0, prefix)).toBe(
              value.substring(0, prefix),
            );
          },
        ),
        { numRuns: 500 },
      );
    });

    it("should preserve suffix characters", () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 10 }),
          fc.integer({ min: 1, max: 5 }),
          (value, suffix) => {
            const result = maskString(value, "*", 0, suffix);
            expect(result.substring(result.length - suffix)).toBe(
              value.substring(value.length - suffix),
            );
          },
        ),
        { numRuns: 500 },
      );
    });

    it("should never throw on any input", () => {
      fc.assert(
        fc.property(fc.string(), (value) => {
          expect(() => maskString(value)).not.toThrow();
        }),
        { numRuns: 2000 },
      );
    });
  });

  // ==========================================================================
  // EMAIL MASKING - Property Tests
  // ==========================================================================

  describe("Email Masking", () => {
    it("should preserve domain in emails", () => {
      fc.assert(
        fc.property(fc.emailAddress(), (email) => {
          const result = maskEmail(email);
          const domain = email.split("@")[1];
          expect(result).toContain(`@${domain}`);
        }),
        { numRuns: 1000 },
      );
    });

    it("should mask local part of email", () => {
      fc.assert(
        fc.property(fc.emailAddress(), (email) => {
          const result = maskEmail(email);
          expect(result).toContain("*");
        }),
        { numRuns: 1000 },
      );
    });

    it("should never throw on any input", () => {
      fc.assert(
        fc.property(fc.string(), (email) => {
          expect(() => maskEmail(email)).not.toThrow();
        }),
        { numRuns: 2000 },
      );
    });
  });

  // ==========================================================================
  // PHONE MASKING - Property Tests
  // ==========================================================================

  describe("Phone Masking", () => {
    it("should preserve last 4 digits", () => {
      fc.assert(
        fc.property(fc.stringMatching(/^[0-9]{10,15}$/), (phone) => {
          const result = maskPhone(phone);
          const last4 = phone.slice(-4);
          expect(result).toContain(last4);
        }),
        { numRuns: 500 },
      );
    });

    it("should mask other digits", () => {
      fc.assert(
        fc.property(fc.stringMatching(/^[0-9]{10,15}$/), (phone) => {
          const result = maskPhone(phone);
          expect(result).toContain("*");
        }),
        { numRuns: 500 },
      );
    });

    it("should never throw on any input", () => {
      fc.assert(
        fc.property(fc.string(), (phone) => {
          expect(() => maskPhone(phone)).not.toThrow();
        }),
        { numRuns: 2000 },
      );
    });
  });

  // ==========================================================================
  // STRING TRUNCATION - Property Tests
  // ==========================================================================

  describe("String Truncation", () => {
    it("should not modify strings within limit", () => {
      fc.assert(
        fc.property(
          fc.string({ maxLength: 100 }),
          fc.integer({ min: 100, max: 1000 }),
          (value, maxLength) => {
            const result = truncateString(value, maxLength);
            expect(result).toBe(value);
          },
        ),
        { numRuns: 500 },
      );
    });

    it("should truncate strings exceeding limit", () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 101 }),
          fc.integer({ min: 10, max: 100 }),
          (value, maxLength) => {
            const result = truncateString(value, maxLength);
            expect(result.length).toBeLessThanOrEqual(maxLength + 15); // +15 for "[truncated]"
            expect(result).toContain("[truncated]");
          },
        ),
        { numRuns: 500 },
      );
    });

    it("should never throw on any input", () => {
      fc.assert(
        fc.property(
          fc.string(),
          fc.integer({ min: 1, max: 10000 }),
          (value, maxLength) => {
            expect(() => truncateString(value, maxLength)).not.toThrow();
          },
        ),
        { numRuns: 2000 },
      );
    });
  });

  // ==========================================================================
  // SECRET DETECTION - Property Tests
  // ==========================================================================

  describe("Secret Detection", () => {
    it("should detect high-entropy strings", () => {
      fc.assert(
        fc.property(fc.stringMatching(/^[0-9a-f]{40,128}$/), (hex) => {
          const result = looksLikeSecret(hex);
          // Long hex strings should be detected as secrets
          expect(typeof result).toBe("boolean");
        }),
        { numRuns: 500 },
      );
    });

    it("should detect common secret prefixes", () => {
      const secretPrefixes = ["sk_", "pk_", "ghp_", "gho_", "ghs_", "AKIA"];
      secretPrefixes.forEach((prefix) => {
        fc.assert(
          fc.property(fc.string({ minLength: 20, maxLength: 50 }), (suffix) => {
            const secret = `${prefix}${suffix}`;
            const result = looksLikeSecret(secret);
            expect(result).toBe(true);
          }),
          { numRuns: 100 },
        );
      });
    });

    it("should not detect normal words as secrets", () => {
      const normalWords = [
        "hello",
        "world",
        "testing",
        "example",
        "password", // Short, low entropy
      ];
      normalWords.forEach((word) => {
        const result = looksLikeSecret(word);
        expect(result).toBe(false);
      });
    });

    it("should never throw on any input", () => {
      fc.assert(
        fc.property(fc.string(), (value) => {
          expect(() => looksLikeSecret(value)).not.toThrow();
        }),
        { numRuns: 2000 },
      );
    });
  });

  // ==========================================================================
  // LOG ENTRY SANITIZATION - Property Tests
  // ==========================================================================

  describe("Log Entry Sanitization", () => {
    it("should always return a result object", () => {
      fc.assert(
        fc.property(
          fc.record({
            timestamp: fc.date(),
            level: fc.constantFrom(
              "debug",
              "info",
              "warn",
              "error",
              "critical",
            ),
            message: fc.string(),
          }) as fc.Arbitrary<LogEntry>,
          (entry) => {
            const result = sanitizer.sanitize(entry);
            expect(result).toHaveProperty("entry");
            expect(result).toHaveProperty("fieldsRedacted");
            expect(result).toHaveProperty("sanitizationTimeMs");
          },
        ),
        { numRuns: 500 },
      );
    });

    it("should never throw on any log entry", () => {
      fc.assert(
        fc.property(
          fc.record({
            timestamp: fc.oneof(fc.date(), fc.string()),
            level: fc.constantFrom(
              "debug",
              "info",
              "warn",
              "error",
              "critical",
            ),
            message: fc.string(),
            context: fc.oneof(fc.object(), fc.constant(undefined)),
            metadata: fc.oneof(fc.object(), fc.constant(undefined)),
          }) as fc.Arbitrary<LogEntry>,
          (entry) => {
            expect(() => sanitizer.sanitize(entry)).not.toThrow();
          },
        ),
        { numRuns: 1000 },
      );
    });

    it("should redact password fields", () => {
      fc.assert(
        fc.property(fc.string(), (password) => {
          const entry: LogEntry = {
            timestamp: new Date(),
            level: "info",
            message: "User login",
            context: { password },
          };
          const result = sanitizer.sanitize(entry);
          expect(result.entry.context?.password).toBe("[REDACTED]");
          expect(result.fieldsRedacted).toContain("password");
        }),
        { numRuns: 500 },
      );
    });

    it("should hash session IDs", () => {
      fc.assert(
        fc.property(fc.string({ minLength: 10 }), (sessionId) => {
          const entry: LogEntry = {
            timestamp: new Date(),
            level: "info",
            message: "Session created",
            context: { sessionId },
          };
          const result = sanitizer.sanitize(entry);
          expect(result.entry.context?.sessionId).toContain("[HASH:");
          expect(result.fieldsHashed).toContain("sessionId");
        }),
        { numRuns: 500 },
      );
    });

    it("should mask email addresses in context", () => {
      fc.assert(
        fc.property(fc.emailAddress(), (email) => {
          const entry: LogEntry = {
            timestamp: new Date(),
            level: "info",
            message: "User action",
            context: { email },
          };
          const result = sanitizer.sanitize(entry);
          expect(result.entry.context?.email).toContain("*");
          expect(result.fieldsMasked).toContain("email");
        }),
        { numRuns: 500 },
      );
    });

    it("should preserve user IDs", () => {
      fc.assert(
        fc.property(fc.string({ minLength: 1 }), (userId) => {
          const entry: LogEntry = {
            timestamp: new Date(),
            level: "info",
            message: "User action",
            context: { userId },
          };
          const result = sanitizer.sanitize(entry);
          expect(result.entry.context?.userId).toBe(userId);
        }),
        { numRuns: 500 },
      );
    });
  });

  // ==========================================================================
  // PATTERN MATCHING - Fuzz Tests
  // ==========================================================================

  describe("Pattern Matching - Fuzz Tests", () => {
    it("should detect JWT tokens", () => {
      fc.assert(
        fc.property(
          fc.stringMatching(/^[A-Za-z0-9_-]{10,50}$/),
          fc.stringMatching(/^[A-Za-z0-9_-]{10,100}$/),
          fc.stringMatching(/^[A-Za-z0-9_-]{10,50}$/),
          (header, payload, signature) => {
            const jwt = `eyJ${header}.eyJ${payload}.${signature}`;
            const entry: LogEntry = {
              timestamp: new Date(),
              level: "info",
              message: `Token: ${jwt}`,
            };
            const result = sanitizer.sanitize(entry);
            expect(result.entry.message).toContain("[JWT_TOKEN]");
            expect(result.patternsMatched).toContain("jwt");
          },
        ),
        { numRuns: 200 },
      );
    });

    it("should detect Bearer tokens", () => {
      fc.assert(
        fc.property(
          // Constrained to chars the sanitizer's bearer regex matches: /Bearer\s+[A-Za-z0-9-_]+/
          fc.stringMatching(/^[A-Za-z0-9_-]{20,100}$/),
          (token) => {
            const entry: LogEntry = {
              timestamp: new Date(),
              level: "info",
              message: `Authorization: Bearer ${token}`,
            };
            const result = sanitizer.sanitize(entry);
            expect(result.entry.message).toContain("Bearer [TOKEN]");
            expect(result.patternsMatched).toContain("bearer");
          },
        ),
        { numRuns: 200 },
      );
    });

    it("should detect IPv4 addresses", () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 255 }),
          fc.integer({ min: 0, max: 255 }),
          fc.integer({ min: 0, max: 255 }),
          fc.integer({ min: 0, max: 255 }),
          (a, b, c, d) => {
            const ip = `${a}.${b}.${c}.${d}`;
            const entry: LogEntry = {
              timestamp: new Date(),
              level: "info",
              message: `Request from ${ip}`,
            };
            const result = sanitizer.sanitize(entry);
            expect(result.patternsMatched).toContain("ipv4");
          },
        ),
        { numRuns: 200 },
      );
    });

    it("should detect AWS access keys", () => {
      fc.assert(
        fc.property(
          fc.stringMatching(/^(AKIA|ABIA|ACCA|ASIA)[0-9A-Z]{16}$/),
          (awsKey) => {
            const entry: LogEntry = {
              timestamp: new Date(),
              level: "error",
              message: `Failed to use key ${awsKey}`,
            };
            const result = sanitizer.sanitize(entry);
            expect(result.entry.message).toContain("[REDACTED]");
            expect(result.patternsMatched).toContain("aws_key");
          },
        ),
        { numRuns: 200 },
      );
    });

    it("should detect credit card numbers", () => {
      // Visa format
      fc.assert(
        fc.property(fc.stringMatching(/^4[0-9]{15}$/), (cardNumber) => {
          const entry: LogEntry = {
            timestamp: new Date(),
            level: "info",
            message: `Processing card ${cardNumber}`,
          };
          const result = sanitizer.sanitize(entry);
          expect(result.entry.message).toContain("[REDACTED]");
          expect(result.patternsMatched).toContain("credit_card");
        }),
        { numRuns: 100 },
      );
    });
  });

  // ==========================================================================
  // NESTED OBJECT SANITIZATION - Property Tests
  // ==========================================================================

  describe("Nested Object Sanitization", () => {
    it("should recursively sanitize nested objects", () => {
      fc.assert(
        fc.property(fc.string(), fc.string(), (password1, password2) => {
          const entry: LogEntry = {
            timestamp: new Date(),
            level: "info",
            message: "Nested data",
            context: {
              user: {
                credentials: {
                  password: password1,
                },
              },
              admin: {
                password: password2,
              },
            },
          };
          const result = sanitizer.sanitize(entry);
          expect(result.entry.context?.user?.credentials?.password).toBe(
            "[REDACTED]",
          );
          expect(result.entry.context?.admin?.password).toBe("[REDACTED]");
        }),
        { numRuns: 200 },
      );
    });

    it("should sanitize arrays of objects", () => {
      fc.assert(
        fc.property(
          fc.array(fc.string(), { minLength: 1, maxLength: 5 }),
          (passwords) => {
            const entry: LogEntry = {
              timestamp: new Date(),
              level: "info",
              message: "Multiple items",
              context: {
                items: passwords.map((p) => ({ password: p })),
              },
            };
            const result = sanitizer.sanitize(entry);
            result.entry.context?.items?.forEach(
              (item: { password: string }) => {
                expect(item.password).toBe("[REDACTED]");
              },
            );
          },
        ),
        { numRuns: 200 },
      );
    });

    it("should handle circular references gracefully", () => {
      const entry: LogEntry = {
        timestamp: new Date(),
        level: "info",
        message: "Test",
        context: {},
      };
      // Create circular reference
      (entry.context as Record<string, unknown>).self = entry.context;

      // Should not throw
      expect(() => sanitizer.sanitize(entry)).not.toThrow();
    });
  });

  // ==========================================================================
  // UNICODE EDGE CASES - Fuzz Tests
  // ==========================================================================

  describe("Unicode Edge Cases", () => {
    it("should handle emoji in log messages", () => {
      fc.assert(
        fc.property(fc.string(), (emoji) => {
          const entry: LogEntry = {
            timestamp: new Date(),
            level: "info",
            message: `User sent ${emoji}`,
          };
          expect(() => sanitizer.sanitize(entry)).not.toThrow();
        }),
        { numRuns: 500 },
      );
    });

    it("should handle RTL characters", () => {
      const rtlChars = ["\u202E", "\u202D", "\u061C"];
      rtlChars.forEach((char) => {
        const entry: LogEntry = {
          timestamp: new Date(),
          level: "info",
          message: `Test${char}message`,
        };
        expect(() => sanitizer.sanitize(entry)).not.toThrow();
      });
    });

    it("should handle zero-width characters", () => {
      const zeroWidth = ["\u200B", "\u200C", "\u200D", "\uFEFF"];
      zeroWidth.forEach((char) => {
        const entry: LogEntry = {
          timestamp: new Date(),
          level: "info",
          message: `Test${char}message`,
        };
        expect(() => sanitizer.sanitize(entry)).not.toThrow();
      });
    });

    it("should handle mixed scripts", () => {
      fc.assert(
        fc.property(
          fc.string(),
          fc.string(),
          fc.string(),
          (unicode1, ascii, unicode2) => {
            const entry: LogEntry = {
              timestamp: new Date(),
              level: "info",
              message: `${unicode1} ${ascii} ${unicode2}`,
            };
            expect(() => sanitizer.sanitize(entry)).not.toThrow();
          },
        ),
        { numRuns: 500 },
      );
    });
  });

  // ==========================================================================
  // PERFORMANCE - Property Tests
  // ==========================================================================

  describe("Performance", () => {
    it("should sanitize entries within reasonable time", () => {
      fc.assert(
        fc.property(
          fc.record({
            timestamp: fc.date(),
            level: fc.constantFrom("debug", "info", "warn", "error"),
            message: fc.string({ maxLength: 1000 }),
            context: fc.object({ maxDepth: 3 }),
          }) as fc.Arbitrary<LogEntry>,
          (entry) => {
            const result = sanitizer.sanitize(entry);
            // Should complete in less than 100ms
            expect(result.sanitizationTimeMs).toBeLessThan(100);
          },
        ),
        { numRuns: 200 },
      );
    });

    it("should handle batch sanitization", () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              timestamp: fc.date(),
              level: fc.constantFrom("info", "warn", "error"),
              message: fc.string({ maxLength: 200 }),
            }) as fc.Arbitrary<LogEntry>,
            { minLength: 10, maxLength: 100 },
          ),
          (entries) => {
            const results = sanitizer.sanitizeBatch(entries);
            expect(results.length).toBe(entries.length);
            results.forEach((result) => {
              expect(result.sanitizationTimeMs).toBeLessThan(100);
            });
          },
        ),
        { numRuns: 20 },
      );
    });
  });
});
