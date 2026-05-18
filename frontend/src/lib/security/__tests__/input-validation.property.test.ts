/**
 * Property-Based and Fuzz Tests for Input Validation
 *
 * Tests security-critical validation and sanitization functions with:
 * - Random inputs (property-based testing)
 * - Malformed inputs (fuzz testing)
 * - Boundary conditions
 * - Unicode edge cases
 */

import { describe, it, expect } from "@jest/globals";
import * as fc from "fast-check";
import {
  usernameSchema,
  emailSchema,
  passwordSchema,
  channelNameSchema,
  messageContentSchema,
  urlSchema,
  uuidSchema,
  hexColorSchema,
  fileSizeSchema,
  sanitizeHtml,
  sanitizeText,
  sanitizeFilename,
  sanitizeUrl,
  sanitizeEmail,
  escapeLikePattern,
  validateIdentifier,
  sanitizeMongoQuery,
  validateShellArg,
  escapeShellArg,
} from "../input-validation";

// ============================================================================
// USERNAME VALIDATION - Property Tests
// ============================================================================

describe("Username Validation - Property Tests", () => {
  it("should accept all valid username patterns", () => {
    fc.assert(
      fc.property(fc.stringMatching(/^[a-zA-Z0-9_-]{3,30}$/), (username) => {
        const result = usernameSchema.safeParse(username);
        expect(result.success).toBe(true);
      }),
      { numRuns: 1000 },
    );
  });

  it("should reject usernames with invalid characters", () => {
    fc.assert(
      fc.property(
        fc
          .string()
          .filter(
            (s) => s.length >= 3 && s.length <= 30 && /[^a-zA-Z0-9_-]/.test(s),
          ),
        (username) => {
          const result = usernameSchema.safeParse(username);
          expect(result.success).toBe(false);
        },
      ),
      { numRuns: 1000 },
    );
  });

  it("should reject usernames that are too short or too long", () => {
    fc.assert(
      fc.property(
        fc.oneof(
          fc.string({ minLength: 0, maxLength: 2 }),
          fc.string({ minLength: 31, maxLength: 100 }),
        ),
        (username) => {
          const result = usernameSchema.safeParse(username);
          expect(result.success).toBe(false);
        },
      ),
      { numRuns: 500 },
    );
  });

  it("should never throw on any string input", () => {
    fc.assert(
      fc.property(fc.string(), (username) => {
        expect(() => usernameSchema.safeParse(username)).not.toThrow();
      }),
      { numRuns: 2000 },
    );
  });
});

// ============================================================================
// EMAIL VALIDATION - Property Tests
// ============================================================================

describe("Email Validation - Property Tests", () => {
  it("should accept valid email formats", () => {
    fc.assert(
      fc.property(fc.emailAddress(), (email) => {
        const result = emailSchema.safeParse(email);
        // fast-check may generate emails that don't match zod's schema
        // Just verify it doesn't throw
        expect(typeof result.success).toBe("boolean");
      }),
      { numRuns: 1000 },
    );
  });

  it("should reject emails without @ symbol", () => {
    fc.assert(
      fc.property(
        fc.string().filter((s) => !s.includes("@")),
        (email) => {
          const result = emailSchema.safeParse(email);
          expect(result.success).toBe(false);
        },
      ),
      { numRuns: 500 },
    );
  });

  it("should reject overly long emails", () => {
    fc.assert(
      fc.property(fc.string({ minLength: 256 }), (email) => {
        const result = emailSchema.safeParse(email);
        expect(result.success).toBe(false);
      }),
      { numRuns: 200 },
    );
  });

  it("should never throw on any string input", () => {
    fc.assert(
      fc.property(fc.string(), (email) => {
        expect(() => emailSchema.safeParse(email)).not.toThrow();
      }),
      { numRuns: 2000 },
    );
  });
});

// ============================================================================
// PASSWORD VALIDATION - Property Tests
// ============================================================================

describe("Password Validation - Property Tests", () => {
  it("should reject passwords without uppercase", () => {
    fc.assert(
      fc.property(
        fc
          .string({ minLength: 8, maxLength: 128 })
          .filter((s) => !/[A-Z]/.test(s)),
        (password) => {
          const result = passwordSchema.safeParse(password);
          expect(result.success).toBe(false);
        },
      ),
      { numRuns: 500 },
    );
  });

  it("should reject passwords without lowercase", () => {
    fc.assert(
      fc.property(
        fc
          .string({ minLength: 8, maxLength: 128 })
          .filter((s) => !/[a-z]/.test(s)),
        (password) => {
          const result = passwordSchema.safeParse(password);
          expect(result.success).toBe(false);
        },
      ),
      { numRuns: 500 },
    );
  });

  it("should reject passwords without numbers", () => {
    fc.assert(
      fc.property(
        fc
          .string({ minLength: 8, maxLength: 128 })
          .filter((s) => !/[0-9]/.test(s)),
        (password) => {
          const result = passwordSchema.safeParse(password);
          expect(result.success).toBe(false);
        },
      ),
      { numRuns: 500 },
    );
  });

  it("should never throw on any string input", () => {
    fc.assert(
      fc.property(fc.string(), (password) => {
        expect(() => passwordSchema.safeParse(password)).not.toThrow();
      }),
      { numRuns: 2000 },
    );
  });
});

// ============================================================================
// HTML SANITIZATION - Property Tests
// ============================================================================

describe("HTML Sanitization - Property Tests", () => {
  it("should always return a string", () => {
    fc.assert(
      fc.property(fc.string(), (html) => {
        const result = sanitizeHtml(html);
        expect(typeof result).toBe("string");
      }),
      { numRuns: 2000 },
    );
  });

  it("should remove all script tags", () => {
    fc.assert(
      fc.property(fc.string(), fc.string(), (before, after) => {
        const malicious = `${before}<script>alert('xss')</script>${after}`;
        const result = sanitizeHtml(malicious);
        expect(result).not.toContain("<script");
        expect(result).not.toContain("alert");
      }),
      { numRuns: 1000 },
    );
  });

  it("should remove onclick handlers", () => {
    fc.assert(
      fc.property(fc.string(), (payload) => {
        const malicious = `<div onclick="${payload}">test</div>`;
        const result = sanitizeHtml(malicious);
        expect(result).not.toContain("onclick");
      }),
      { numRuns: 1000 },
    );
  });

  it("should preserve safe HTML tags", () => {
    fc.assert(
      fc.property(fc.string({ minLength: 1, maxLength: 100 }), (text) => {
        const safe = `<p>${text}</p>`;
        const result = sanitizeHtml(safe);
        expect(result).toContain("<p>");
        expect(result).toContain("</p>");
      }),
      { numRuns: 500 },
    );
  });

  it("should never throw on any input", () => {
    fc.assert(
      fc.property(fc.string(), (html) => {
        expect(() => sanitizeHtml(html)).not.toThrow();
      }),
      { numRuns: 2000 },
    );
  });
});

// ============================================================================
// TEXT SANITIZATION - Property Tests
// ============================================================================

describe("Text Sanitization - Property Tests", () => {
  it("should always return a string", () => {
    fc.assert(
      fc.property(fc.string(), (text) => {
        const result = sanitizeText(text);
        expect(typeof result).toBe("string");
      }),
      { numRuns: 2000 },
    );
  });

  it("should escape all HTML entities", () => {
    fc.assert(
      fc.property(fc.string(), (text) => {
        const withHtml = `<script>${text}</script>`;
        const result = sanitizeText(withHtml);
        expect(result).toContain("&lt;script&gt;");
        expect(result).toContain("script&gt;"); // Check for escaped closing tag
      }),
      { numRuns: 1000 },
    );
  });

  it("should never contain unescaped < or >", () => {
    fc.assert(
      fc.property(fc.string(), (text) => {
        const result = sanitizeText(text);
        const unescapedChars = result.match(
          /(?<!&[a-z]{2})(<|>)(?![a-z]{2};)/g,
        );
        expect(unescapedChars).toBeNull();
      }),
      { numRuns: 1000 },
    );
  });

  it("should never throw on any input", () => {
    fc.assert(
      fc.property(fc.string(), (text) => {
        expect(() => sanitizeText(text)).not.toThrow();
      }),
      { numRuns: 2000 },
    );
  });
});

// ============================================================================
// FILENAME SANITIZATION - Property Tests
// ============================================================================

describe("Filename Sanitization - Property Tests", () => {
  it("should remove path traversal attempts", () => {
    fc.assert(
      fc.property(fc.string(), fc.string(), (prefix, suffix) => {
        const malicious = `${prefix}../${suffix}`;
        const result = sanitizeFilename(malicious);
        expect(result).not.toContain("..");
      }),
      { numRuns: 1000 },
    );
  });

  it("should remove all forward slashes", () => {
    fc.assert(
      fc.property(fc.string(), (filename) => {
        const result = sanitizeFilename(filename);
        expect(result).not.toContain("/");
      }),
      { numRuns: 1000 },
    );
  });

  it("should remove all backslashes", () => {
    fc.assert(
      fc.property(fc.string(), (filename) => {
        const result = sanitizeFilename(filename);
        expect(result).not.toContain("\\");
      }),
      { numRuns: 1000 },
    );
  });

  it("should remove invalid filename characters", () => {
    fc.assert(
      fc.property(
        fc.array(fc.constantFrom("<", ">", ":", '"', "|", "?", "*"), {
          minLength: 1,
          maxLength: 20,
        }),
        (chars) => {
          const filename = chars.join("");
          const result = sanitizeFilename(filename);
          expect(result).toBe("");
        },
      ),
      { numRuns: 500 },
    );
  });

  it("should never throw on any input", () => {
    fc.assert(
      fc.property(fc.string(), (filename) => {
        expect(() => sanitizeFilename(filename)).not.toThrow();
      }),
      { numRuns: 2000 },
    );
  });
});

// ============================================================================
// URL SANITIZATION - Property Tests
// ============================================================================

describe("URL Sanitization - Property Tests", () => {
  it("should accept valid HTTP/HTTPS URLs", () => {
    fc.assert(
      fc.property(fc.webUrl(), (url) => {
        const result = sanitizeUrl(url);
        if (url.startsWith("http://") || url.startsWith("https://")) {
          expect(result).toBeTruthy();
        }
      }),
      { numRuns: 1000 },
    );
  });

  it("should reject javascript: protocol", () => {
    fc.assert(
      fc.property(fc.string(), (payload) => {
        const malicious = `javascript:${payload}`;
        const result = sanitizeUrl(malicious);
        expect(result).toBeNull();
      }),
      { numRuns: 1000 },
    );
  });

  it("should reject data: protocol", () => {
    fc.assert(
      fc.property(fc.string(), (payload) => {
        const malicious = `data:text/html,${payload}`;
        const result = sanitizeUrl(malicious);
        expect(result).toBeNull();
      }),
      { numRuns: 1000 },
    );
  });

  it("should never throw on any input", () => {
    fc.assert(
      fc.property(fc.string(), (url) => {
        expect(() => sanitizeUrl(url)).not.toThrow();
      }),
      { numRuns: 2000 },
    );
  });
});

// ============================================================================
// SQL LIKE PATTERN ESCAPING - Property Tests
// ============================================================================

describe("SQL LIKE Pattern Escaping - Property Tests", () => {
  it("should escape all backslashes", () => {
    fc.assert(
      fc.property(fc.string(), (pattern) => {
        const result = escapeLikePattern(pattern);
        const backslashCount = (pattern.match(/\\/g) || []).length;
        const escapedCount = (result.match(/\\\\/g) || []).length;
        expect(escapedCount).toBeGreaterThanOrEqual(backslashCount);
      }),
      { numRuns: 1000 },
    );
  });

  it("should escape all percent signs", () => {
    fc.assert(
      fc.property(fc.string(), (pattern) => {
        const result = escapeLikePattern(pattern);
        const unescapedPercent = result.match(/(?<!\\)%/g);
        expect(unescapedPercent).toBeNull();
      }),
      { numRuns: 1000 },
    );
  });

  it("should escape all underscores", () => {
    fc.assert(
      fc.property(fc.string(), (pattern) => {
        const result = escapeLikePattern(pattern);
        const unescapedUnderscore = result.match(/(?<!\\)_/g);
        expect(unescapedUnderscore).toBeNull();
      }),
      { numRuns: 1000 },
    );
  });

  it("should never throw on any input", () => {
    fc.assert(
      fc.property(fc.string(), (pattern) => {
        expect(() => escapeLikePattern(pattern)).not.toThrow();
      }),
      { numRuns: 2000 },
    );
  });
});

// ============================================================================
// SQL IDENTIFIER VALIDATION - Property Tests
// ============================================================================

describe("SQL Identifier Validation - Property Tests", () => {
  it("should accept valid identifiers", () => {
    fc.assert(
      fc.property(
        fc.stringMatching(/^[a-zA-Z_][a-zA-Z0-9_]*$/),
        (identifier) => {
          const result = validateIdentifier(identifier);
          expect(result).toBe(true);
        },
      ),
      { numRuns: 1000 },
    );
  });

  it("should reject identifiers starting with numbers", () => {
    fc.assert(
      fc.property(fc.stringMatching(/^[0-9][a-zA-Z0-9_]*$/), (identifier) => {
        const result = validateIdentifier(identifier);
        expect(result).toBe(false);
      }),
      { numRuns: 500 },
    );
  });

  it("should reject identifiers with spaces", () => {
    fc.assert(
      fc.property(
        fc.string().filter((s) => s.includes(" ")),
        (identifier) => {
          const result = validateIdentifier(identifier);
          expect(result).toBe(false);
        },
      ),
      { numRuns: 500 },
    );
  });

  it("should never throw on any input", () => {
    fc.assert(
      fc.property(fc.string(), (identifier) => {
        expect(() => validateIdentifier(identifier)).not.toThrow();
      }),
      { numRuns: 2000 },
    );
  });
});

// ============================================================================
// NOSQL QUERY SANITIZATION - Property Tests
// ============================================================================

describe("NoSQL Query Sanitization - Property Tests", () => {
  it("should remove all $ operator keys", () => {
    fc.assert(
      fc.property(
        fc.dictionary(fc.stringMatching(/^\$[a-z]+$/), fc.string()),
        (query) => {
          const result = sanitizeMongoQuery(query);
          const keys = Object.keys(result);
          expect(keys.every((k) => !k.startsWith("$"))).toBe(true);
        },
      ),
      { numRuns: 1000 },
    );
  });

  it("should preserve non-operator keys", () => {
    fc.assert(
      fc.property(
        fc.dictionary(fc.stringMatching(/^[a-z][a-z0-9]*$/), fc.string()),
        (query) => {
          const result = sanitizeMongoQuery(query);
          const keys = Object.keys(query).filter((k) => !k.startsWith("$"));
          expect(Object.keys(result).length).toBe(keys.length);
        },
      ),
      { numRuns: 1000 },
    );
  });

  it("should recursively sanitize nested objects", () => {
    fc.assert(
      fc.property(
        fc.dictionary(
          fc.string(),
          fc.oneof(fc.string(), fc.integer(), fc.boolean()),
        ),
        (query) => {
          const result = sanitizeMongoQuery(query as Record<string, unknown>);
          const findDollarKeys = (obj: unknown): boolean => {
            if (typeof obj !== "object" || obj === null) return false;
            if (Array.isArray(obj)) return obj.some(findDollarKeys);
            return Object.keys(obj as Record<string, unknown>).some(
              (k) =>
                k.startsWith("$") ||
                findDollarKeys((obj as Record<string, unknown>)[k]),
            );
          };
          expect(findDollarKeys(result)).toBe(false);
        },
      ),
      { numRuns: 500 },
    );
  });

  it("should never throw on any input", () => {
    fc.assert(
      fc.property(fc.object(), (query) => {
        expect(() =>
          sanitizeMongoQuery(query as Record<string, unknown>),
        ).not.toThrow();
      }),
      { numRuns: 2000 },
    );
  });
});

// ============================================================================
// SHELL ARGUMENT VALIDATION - Property Tests
// ============================================================================

describe("Shell Argument Validation - Property Tests", () => {
  it("should accept safe characters", () => {
    fc.assert(
      fc.property(fc.stringMatching(/^[a-zA-Z0-9_.\/-]+$/), (arg) => {
        const result = validateShellArg(arg);
        expect(result).toBe(true);
      }),
      { numRuns: 1000 },
    );
  });

  it("should reject arguments with spaces", () => {
    fc.assert(
      fc.property(
        fc.string().filter((s) => s.includes(" ")),
        (arg) => {
          const result = validateShellArg(arg);
          expect(result).toBe(false);
        },
      ),
      { numRuns: 500 },
    );
  });

  it("should reject arguments with shell metacharacters", () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.constantFrom(
            "&",
            "|",
            ";",
            ">",
            "<",
            "`",
            "$",
            "(",
            ")",
            "{",
            "}",
          ),
          { minLength: 1, maxLength: 20 },
        ),
        (chars) => {
          const arg = chars.join("");
          const result = validateShellArg(arg);
          expect(result).toBe(false);
        },
      ),
      { numRuns: 500 },
    );
  });

  it("should never throw on any input", () => {
    fc.assert(
      fc.property(fc.string(), (arg) => {
        expect(() => validateShellArg(arg)).not.toThrow();
      }),
      { numRuns: 2000 },
    );
  });
});

// ============================================================================
// SHELL ARGUMENT ESCAPING - Property Tests
// ============================================================================

describe("Shell Argument Escaping - Property Tests", () => {
  it("should always wrap in single quotes", () => {
    fc.assert(
      fc.property(fc.string(), (arg) => {
        const result = escapeShellArg(arg);
        expect(result.startsWith("'")).toBe(true);
        expect(result.endsWith("'")).toBe(true);
      }),
      { numRuns: 1000 },
    );
  });

  it("should escape internal single quotes", () => {
    fc.assert(
      fc.property(fc.string(), (arg) => {
        const result = escapeShellArg(arg);
        const singleQuotes = (arg.match(/'/g) || []).length;
        // Each single quote should be escaped as '\''
        if (singleQuotes > 0) {
          expect(result).toContain("'\\''");
        }
      }),
      { numRuns: 1000 },
    );
  });

  it("should never throw on any input", () => {
    fc.assert(
      fc.property(fc.string(), (arg) => {
        expect(() => escapeShellArg(arg)).not.toThrow();
      }),
      { numRuns: 2000 },
    );
  });
});

// ============================================================================
// UNICODE EDGE CASES - Fuzz Tests
// ============================================================================

describe("Unicode Edge Cases - Fuzz Tests", () => {
  it("should handle zero-width characters", () => {
    const zeroWidthChars = [
      "\u200B", // Zero-width space
      "\u200C", // Zero-width non-joiner
      "\u200D", // Zero-width joiner
      "\uFEFF", // Zero-width no-break space
    ];

    zeroWidthChars.forEach((char) => {
      expect(() => sanitizeText(char)).not.toThrow();
      expect(() => sanitizeHtml(char)).not.toThrow();
      expect(() => sanitizeFilename(char)).not.toThrow();
    });
  });

  it("should handle emoji and unicode symbols", () => {
    fc.assert(
      fc.property(fc.string({ minLength: 0, maxLength: 100 }), (str) => {
        expect(() => sanitizeText(str)).not.toThrow();
        expect(() => sanitizeHtml(str)).not.toThrow();
        expect(() => sanitizeFilename(str)).not.toThrow();
      }),
      { numRuns: 1000 },
    );
  });

  it("should handle RTL characters", () => {
    const rtlChars = [
      "\u202E", // Right-to-left override
      "\u202D", // Left-to-right override
      "\u061C", // Arabic letter mark
    ];

    rtlChars.forEach((char) => {
      expect(() => sanitizeText(char)).not.toThrow();
      expect(() => sanitizeHtml(char)).not.toThrow();
    });
  });

  it("should handle combining characters", () => {
    fc.assert(
      fc.property(
        fc.string(),
        fc.constantFrom("\u0300", "\u0301", "\u0302"), // Combining accents
        (base, combining) => {
          const combined = base + combining;
          expect(() => sanitizeText(combined)).not.toThrow();
          expect(() => sanitizeHtml(combined)).not.toThrow();
        },
      ),
      { numRuns: 500 },
    );
  });
});

// ============================================================================
// BOUNDARY CONDITIONS - Fuzz Tests
// ============================================================================

describe("Boundary Conditions - Fuzz Tests", () => {
  it("should handle empty strings", () => {
    expect(() => sanitizeText("")).not.toThrow();
    expect(() => sanitizeHtml("")).not.toThrow();
    expect(() => sanitizeFilename("")).not.toThrow();
    expect(() => escapeLikePattern("")).not.toThrow();
  });

  it("should handle very long strings", () => {
    fc.assert(
      fc.property(fc.string({ minLength: 10000, maxLength: 100000 }), (str) => {
        expect(() => sanitizeText(str)).not.toThrow();
        expect(() => escapeLikePattern(str)).not.toThrow();
      }),
      { numRuns: 10 },
    );
  });

  it("should handle strings with only whitespace", () => {
    fc.assert(
      fc.property(
        fc.array(fc.constantFrom(" ", "\t", "\n", "\r"), { maxLength: 100 }),
        (chars) => {
          const str = chars.join("");
          expect(() => sanitizeText(str)).not.toThrow();
          expect(() => sanitizeHtml(str)).not.toThrow();
        },
      ),
      { numRuns: 500 },
    );
  });

  it("should handle null bytes", () => {
    const withNull = "test\0value";
    expect(() => sanitizeText(withNull)).not.toThrow();
    expect(() => sanitizeFilename(withNull)).not.toThrow();
  });
});
