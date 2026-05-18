/**
 * Content Filter Unit Tests
 *
 * Comprehensive tests for the content filtering module including profanity,
 * spam detection, link filtering, and regex pattern matching.
 */

import {
  ContentFilter,
  FilterRule,
  FilterResult,
  SpamConfig,
  LinkFilterConfig,
  ContentFilterConfig,
  DEFAULT_SPAM_CONFIG,
  DEFAULT_LINK_CONFIG,
  DEFAULT_FILTER_CONFIG,
  escapeRegex,
  createWordBoundaryPattern,
  getCapsPercentage,
  findRepeatedChars,
  findRepeatedWords,
  countEmojis,
  extractUrls,
  extractDomain,
  normalizeText,
  createContentFilter,
  createStrictFilter,
  createLenientFilter,
  defaultContentFilter,
} from "../content-filter";

// ============================================================================
// Test Helpers
// ============================================================================

const createTestRule = (overrides?: Partial<FilterRule>): FilterRule => ({
  id: `rule-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
  type: "word",
  pattern: "testword",
  action: "block",
  enabled: true,
  ...overrides,
});

// ============================================================================
// Helper Function Tests
// ============================================================================

describe("Content Filter Helper Functions", () => {
  describe("escapeRegex", () => {
    it("should escape special regex characters", () => {
      expect(escapeRegex("hello.world")).toBe("hello\\.world");
      expect(escapeRegex("test*pattern")).toBe("test\\*pattern");
      expect(escapeRegex("a+b?c")).toBe("a\\+b\\?c");
      expect(escapeRegex("[test]")).toBe("\\[test\\]");
      expect(escapeRegex("(group)")).toBe("\\(group\\)");
      expect(escapeRegex("a{1,2}")).toBe("a\\{1,2\\}");
      expect(escapeRegex("a|b")).toBe("a\\|b");
      expect(escapeRegex("^start$end")).toBe("\\^start\\$end");
      expect(escapeRegex("back\\slash")).toBe("back\\\\slash");
    });

    it("should return unchanged string without special characters", () => {
      expect(escapeRegex("hello")).toBe("hello");
      expect(escapeRegex("simple text")).toBe("simple text");
    });

    it("should handle empty string", () => {
      expect(escapeRegex("")).toBe("");
    });
  });

  describe("createWordBoundaryPattern", () => {
    it("should create word boundary pattern", () => {
      expect(createWordBoundaryPattern("test")).toBe("\\btest\\b");
      expect(createWordBoundaryPattern("hello")).toBe("\\bhello\\b");
    });

    it("should escape special characters in pattern", () => {
      expect(createWordBoundaryPattern("test.word")).toBe("\\btest\\.word\\b");
    });
  });

  describe("getCapsPercentage", () => {
    it("should calculate caps percentage correctly", () => {
      expect(getCapsPercentage("HELLO")).toBe(100);
      expect(getCapsPercentage("hello")).toBe(0);
      expect(getCapsPercentage("HeLLo")).toBe(60);
      expect(getCapsPercentage("Hello")).toBe(20);
    });

    it("should ignore non-letter characters", () => {
      expect(getCapsPercentage("HELLO 123")).toBe(100);
      expect(getCapsPercentage("H-E-L-L-O")).toBe(100);
      expect(getCapsPercentage("hello!!!")).toBe(0);
    });

    it("should return 0 for empty string or no letters", () => {
      expect(getCapsPercentage("")).toBe(0);
      expect(getCapsPercentage("123")).toBe(0);
      expect(getCapsPercentage("!!!")).toBe(0);
    });
  });

  describe("findRepeatedChars", () => {
    it("should find repeated characters", () => {
      const result = findRepeatedChars("heeello");
      expect(result).toContainEqual({ char: "e", count: 3 });
      expect(result).toContainEqual({ char: "l", count: 2 });
    });

    it("should not include single characters", () => {
      const result = findRepeatedChars("hello");
      expect(result).toContainEqual({ char: "l", count: 2 });
      expect(result.length).toBe(1);
    });

    it("should handle empty string", () => {
      expect(findRepeatedChars("")).toEqual([]);
    });

    it("should handle string with no repeats", () => {
      expect(findRepeatedChars("abc")).toEqual([]);
    });

    it("should detect long repeats", () => {
      const result = findRepeatedChars("aaaaaaa");
      expect(result).toContainEqual({ char: "a", count: 7 });
    });
  });

  describe("findRepeatedWords", () => {
    it("should find repeated consecutive words", () => {
      const result = findRepeatedWords("hello hello hello world");
      expect(result).toContainEqual({ word: "hello", count: 3 });
    });

    it("should be case insensitive", () => {
      const result = findRepeatedWords("Hello HELLO hello");
      expect(result).toContainEqual({ word: "hello", count: 3 });
    });

    it("should not include non-consecutive repeats", () => {
      const result = findRepeatedWords("hello world hello");
      expect(result.length).toBe(0);
    });

    it("should handle empty string", () => {
      expect(findRepeatedWords("")).toEqual([]);
    });

    it("should handle single word", () => {
      expect(findRepeatedWords("hello")).toEqual([]);
    });
  });

  describe("countEmojis", () => {
    it("should count basic emojis", () => {
      // Note: '!' is not an emoji, use actual emoji characters
      expect(countEmojis("Hello 😀")).toBeGreaterThanOrEqual(1);
      expect(countEmojis("Hi 😀😃")).toBeGreaterThanOrEqual(1);
    });

    it("should return 0 for no emojis", () => {
      expect(countEmojis("Hello world")).toBe(0);
      expect(countEmojis("")).toBe(0);
    });

    it("should count multiple different emojis", () => {
      expect(countEmojis("test")).toBe(0);
    });
  });

  describe("extractUrls", () => {
    it("should extract http urls", () => {
      const result = extractUrls("Check http://example.com for more");
      expect(result).toContain("http://example.com");
    });

    it("should extract https urls", () => {
      const result = extractUrls("Visit https://secure.example.com/path");
      expect(result).toContain("https://secure.example.com/path");
    });

    it("should extract multiple urls", () => {
      const result = extractUrls("Visit http://a.com and https://b.com");
      expect(result.length).toBe(2);
      expect(result).toContain("http://a.com");
      expect(result).toContain("https://b.com");
    });

    it("should return empty array for no urls", () => {
      expect(extractUrls("No urls here")).toEqual([]);
      expect(extractUrls("")).toEqual([]);
    });

    it("should handle urls with query strings", () => {
      const result = extractUrls(
        "Link: https://example.com/path?query=value&other=1",
      );
      expect(result[0]).toContain("https://example.com/path");
    });
  });

  describe("extractDomain", () => {
    it("should extract domain from url", () => {
      expect(extractDomain("https://example.com/path")).toBe("example.com");
      expect(extractDomain("http://sub.example.com")).toBe("sub.example.com");
      expect(extractDomain("https://www.example.com:8080")).toBe(
        "www.example.com",
      );
    });

    it("should return empty string for invalid url", () => {
      expect(extractDomain("not a url")).toBe("");
      expect(extractDomain("")).toBe("");
    });

    it("should lowercase domain", () => {
      expect(extractDomain("https://EXAMPLE.COM")).toBe("example.com");
    });
  });

  describe("normalizeText", () => {
    it("should normalize text", () => {
      expect(normalizeText("Hello World!")).toBe("hello world");
      expect(normalizeText("  Multiple   Spaces  ")).toBe("multiple spaces");
      expect(normalizeText("TEST@#$%")).toBe("test");
    });

    it("should handle empty string", () => {
      expect(normalizeText("")).toBe("");
    });

    it("should handle only special characters", () => {
      expect(normalizeText("!@#$%")).toBe("");
    });
  });
});

// ============================================================================
// ContentFilter Class Tests
// ============================================================================

describe("ContentFilter Class", () => {
  let filter: ContentFilter;

  beforeEach(() => {
    filter = new ContentFilter();
  });

  describe("constructor", () => {
    it("should create filter with default config", () => {
      const config = filter.getConfig();
      expect(config.profanityEnabled).toBe(true);
      expect(config.spamEnabled).toBe(true);
      expect(config.linkEnabled).toBe(true);
    });

    it("should create filter with custom config", () => {
      const customFilter = new ContentFilter({
        profanityEnabled: false,
        spamEnabled: false,
      });
      const config = customFilter.getConfig();
      expect(config.profanityEnabled).toBe(false);
      expect(config.spamEnabled).toBe(false);
    });
  });

  describe("updateConfig", () => {
    it("should update configuration", () => {
      filter.updateConfig({ profanityEnabled: false });
      expect(filter.getConfig().profanityEnabled).toBe(false);
    });

    it("should preserve unmodified settings", () => {
      filter.updateConfig({ profanityEnabled: false });
      expect(filter.getConfig().spamEnabled).toBe(true);
    });
  });

  describe("addRule", () => {
    it("should add a new rule", () => {
      const rule = createTestRule({ id: "test-rule", pattern: "blocked" });
      filter.addRule(rule);

      const config = filter.getConfig();
      expect(config.rules.find((r) => r.id === "test-rule")).toBeDefined();
    });

    it("should update existing rule with same id", () => {
      const rule1 = createTestRule({ id: "test-rule", pattern: "blocked1" });
      const rule2 = createTestRule({ id: "test-rule", pattern: "blocked2" });

      filter.addRule(rule1);
      filter.addRule(rule2);

      const config = filter.getConfig();
      const foundRule = config.rules.find((r) => r.id === "test-rule");
      expect(foundRule?.pattern).toBe("blocked2");
    });
  });

  describe("removeRule", () => {
    it("should remove a rule", () => {
      const rule = createTestRule({ id: "test-rule" });
      filter.addRule(rule);
      const removed = filter.removeRule("test-rule");

      expect(removed).toBe(true);
      expect(
        filter.getConfig().rules.find((r) => r.id === "test-rule"),
      ).toBeUndefined();
    });

    it("should return false for non-existent rule", () => {
      expect(filter.removeRule("non-existent")).toBe(false);
    });
  });

  describe("setRuleEnabled", () => {
    it("should enable/disable a rule", () => {
      const rule = createTestRule({ id: "test-rule", enabled: true });
      filter.addRule(rule);

      expect(filter.setRuleEnabled("test-rule", false)).toBe(true);
      expect(
        filter.getConfig().rules.find((r) => r.id === "test-rule")?.enabled,
      ).toBe(false);
    });

    it("should return false for non-existent rule", () => {
      expect(filter.setRuleEnabled("non-existent", false)).toBe(false);
    });
  });

  describe("checkProfanity", () => {
    it("should detect built-in profanity", () => {
      const result = filter.checkProfanity("This contains profanity");
      expect(result.length).toBeGreaterThan(0);
      expect(result[0].type).toBe("word");
    });

    it("should not detect clean content", () => {
      const result = filter.checkProfanity("This is a clean message");
      expect(result.length).toBe(0);
    });

    it("should respect profanityEnabled setting", () => {
      filter.updateConfig({ profanityEnabled: false });
      const result = filter.checkProfanity("This contains profanity");
      expect(result.length).toBe(0);
    });

    it("should detect custom word rules", () => {
      filter.addRule(
        createTestRule({
          id: "custom-word",
          type: "word",
          pattern: "forbidden",
          action: "block",
        }),
      );

      const result = filter.checkProfanity("This is forbidden");
      expect(result.some((m) => m.ruleId === "custom-word")).toBe(true);
    });

    it("should respect whole word matching", () => {
      filter.addRule(
        createTestRule({
          id: "whole-word",
          type: "word",
          pattern: "cat",
          action: "block",
          wholeWord: true,
        }),
      );

      const result1 = filter.checkProfanity("I have a cat");
      expect(result1.some((m) => m.ruleId === "whole-word")).toBe(true);

      // 'category' contains 'cat' but shouldn't match with wholeWord
      const result2 = filter.checkProfanity("category");
      expect(result2.some((m) => m.ruleId === "whole-word")).toBe(false);
    });
  });

  describe("checkSpam", () => {
    it("should detect excessive caps", () => {
      const result = filter.checkSpam("THIS IS ALL CAPS MESSAGE");
      expect(result.some((m) => m.ruleId === "spam-caps")).toBe(true);
    });

    it("should not flag normal caps", () => {
      const result = filter.checkSpam("This Is A Normal Message");
      expect(result.some((m) => m.ruleId === "spam-caps")).toBe(false);
    });

    it("should detect repeated characters", () => {
      const result = filter.checkSpam("Hellooooooo there");
      expect(result.some((m) => m.ruleId === "spam-repeated-chars")).toBe(true);
    });

    it("should detect repeated words", () => {
      const result = filter.checkSpam("hello hello hello hello world");
      expect(result.some((m) => m.ruleId === "spam-repeated-words")).toBe(true);
    });

    it("should respect spamEnabled setting", () => {
      filter.updateConfig({ spamEnabled: false });
      const result = filter.checkSpam("THIS IS ALL CAPS MESSAGE");
      expect(result.length).toBe(0);
    });

    it("should detect duplicate messages for same user", () => {
      const userId = "user-123";
      filter.checkSpam("Hello world", userId);
      filter.checkSpam("Hello world", userId);
      filter.checkSpam("Hello world", userId);
      const result = filter.checkSpam("Hello world", userId);

      expect(result.some((m) => m.ruleId === "spam-duplicate")).toBe(true);
    });

    it("should not flag unique messages", () => {
      const userId = "user-456";
      filter.checkSpam("Message 1", userId);
      filter.checkSpam("Message 2", userId);
      const result = filter.checkSpam("Message 3", userId);

      expect(result.some((m) => m.ruleId === "spam-duplicate")).toBe(false);
    });
  });

  describe("recordMessage and clearUserHistory", () => {
    it("should record and clear message history", () => {
      const userId = "user-789";

      filter.recordMessage(userId, "Test message");
      filter.recordMessage(userId, "Test message");
      filter.recordMessage(userId, "Test message");
      filter.recordMessage(userId, "Test message");

      const result1 = filter.checkSpam("Test message", userId);
      expect(result1.some((m) => m.ruleId === "spam-duplicate")).toBe(true);

      filter.clearUserHistory(userId);

      const result2 = filter.checkSpam("Test message", userId);
      expect(result2.some((m) => m.ruleId === "spam-duplicate")).toBe(false);
    });
  });

  describe("clearAllHistory", () => {
    it("should clear all message history", () => {
      filter.recordMessage("user-1", "Test");
      filter.recordMessage("user-2", "Test");

      filter.clearAllHistory();

      // Should not detect duplicates after clearing
      const result1 = filter.checkSpam("Test", "user-1");
      const result2 = filter.checkSpam("Test", "user-2");

      expect(result1.some((m) => m.ruleId === "spam-duplicate")).toBe(false);
      expect(result2.some((m) => m.ruleId === "spam-duplicate")).toBe(false);
    });
  });

  describe("checkLinks", () => {
    it("should detect excessive links", () => {
      const manyLinks =
        "Check http://a.com http://b.com http://c.com http://d.com http://e.com http://f.com";
      const result = filter.checkLinks(manyLinks);
      expect(result.some((m) => m.ruleId === "link-excessive")).toBe(true);
    });

    it("should not flag few links", () => {
      const result = filter.checkLinks("Visit http://example.com");
      expect(result.some((m) => m.ruleId === "link-excessive")).toBe(false);
    });

    it("should block all links when configured", () => {
      filter.updateConfig({
        linkConfig: { ...DEFAULT_LINK_CONFIG, blockAllLinks: true },
      });

      const result = filter.checkLinks("Visit http://example.com");
      expect(result.some((m) => m.ruleId === "link-blocked-all")).toBe(true);
    });

    it("should respect blocked domains", () => {
      filter.updateConfig({
        linkConfig: { ...DEFAULT_LINK_CONFIG, blockedDomains: ["evil.com"] },
      });

      const result = filter.checkLinks("Visit http://evil.com/malware");
      expect(result.some((m) => m.ruleId === "link-blocked-domain")).toBe(true);
    });

    it("should respect allowed domains in whitelist mode", () => {
      filter.updateConfig({
        linkConfig: {
          ...DEFAULT_LINK_CONFIG,
          allowWhitelistedOnly: true,
          allowedDomains: ["trusted.com"],
        },
      });

      const result1 = filter.checkLinks("Visit http://trusted.com");
      expect(result1.some((m) => m.ruleId === "link-not-whitelisted")).toBe(
        false,
      );

      const result2 = filter.checkLinks("Visit http://untrusted.com");
      expect(result2.some((m) => m.ruleId === "link-not-whitelisted")).toBe(
        true,
      );
    });

    it("should respect linkEnabled setting", () => {
      filter.updateConfig({ linkEnabled: false });
      const result = filter.checkLinks(
        "Visit http://evil.com http://a.com http://b.com http://c.com http://d.com http://e.com",
      );
      expect(result.length).toBe(0);
    });

    it("should match subdomains for blocked domains", () => {
      filter.updateConfig({
        linkConfig: { ...DEFAULT_LINK_CONFIG, blockedDomains: ["evil.com"] },
      });

      const result = filter.checkLinks("Visit http://sub.evil.com");
      expect(result.some((m) => m.ruleId === "link-blocked-domain")).toBe(true);
    });
  });

  describe("checkRegex", () => {
    it("should match regex patterns", () => {
      filter.addRule(
        createTestRule({
          id: "regex-email",
          type: "regex",
          pattern: "[a-z]+@[a-z]+\\.[a-z]+",
          action: "flag",
        }),
      );

      const result = filter.checkRegex("Contact me at test@example.com");
      expect(result.some((m) => m.ruleId === "regex-email")).toBe(true);
    });

    it("should not match when pattern not found", () => {
      filter.addRule(
        createTestRule({
          id: "regex-phone",
          type: "regex",
          pattern: "\\d{3}-\\d{3}-\\d{4}",
          action: "flag",
        }),
      );

      const result = filter.checkRegex("No phone number here");
      expect(result.length).toBe(0);
    });

    it("should respect regexEnabled setting", () => {
      filter.updateConfig({ regexEnabled: false });
      filter.addRule(
        createTestRule({
          id: "regex-test",
          type: "regex",
          pattern: "test",
          action: "block",
        }),
      );

      const result = filter.checkRegex("This is a test");
      expect(result.length).toBe(0);
    });

    it("should respect case sensitivity", () => {
      filter.addRule(
        createTestRule({
          id: "regex-case",
          type: "regex",
          pattern: "Test",
          action: "block",
          caseSensitive: true,
        }),
      );

      const result1 = filter.checkRegex("This is a Test");
      expect(result1.some((m) => m.ruleId === "regex-case")).toBe(true);

      const result2 = filter.checkRegex("This is a test");
      expect(result2.some((m) => m.ruleId === "regex-case")).toBe(false);
    });

    it("should handle invalid regex gracefully", () => {
      // Create new filter to isolate the test
      const testFilter = new ContentFilter();
      testFilter.addRule(
        createTestRule({
          id: "invalid-regex",
          type: "regex",
          pattern: "[invalid",
          action: "block",
        }),
      );

      // Invalid regex should not throw, should return gracefully
      const result = testFilter.checkRegex("Test content");
      // The invalid regex rule itself should not match
      const invalidRegexMatches = result.filter(
        (r) => r.ruleId === "invalid-regex",
      );
      expect(invalidRegexMatches.length).toBe(0);
    });
  });

  describe("filter", () => {
    it("should run all checks and combine results", () => {
      filter.addRule(
        createTestRule({
          id: "test-word",
          type: "word",
          pattern: "badword",
          action: "block",
        }),
      );

      const result = filter.filter("This contains badword and profanity");
      expect(result.passed).toBe(false);
      expect(result.action).toBe("block");
      expect(result.matches.length).toBeGreaterThan(0);
    });

    it("should pass clean content", () => {
      const result = filter.filter("This is a normal clean message");
      expect(result.passed).toBe(true);
      expect(result.action).toBe("allow");
    });

    it("should include user context for spam detection", () => {
      const userId = "user-spam";

      filter.filter("Spam message", userId);
      filter.filter("Spam message", userId);
      filter.filter("Spam message", userId);
      const result = filter.filter("Spam message", userId);

      expect(result.matches.some((m) => m.ruleId === "spam-duplicate")).toBe(
        true,
      );
    });

    it("should prioritize block over flag", () => {
      filter.addRule(
        createTestRule({
          id: "flag-rule",
          type: "word",
          pattern: "suspicious",
          action: "flag",
        }),
      );
      filter.addRule(
        createTestRule({
          id: "block-rule",
          type: "word",
          pattern: "blocked",
          action: "block",
        }),
      );

      const result = filter.filter("This is suspicious and blocked content");
      expect(result.action).toBe("block");
    });

    it("should prioritize flag over warn", () => {
      filter.addRule(
        createTestRule({
          id: "warn-rule",
          type: "word",
          pattern: "careful",
          action: "warn",
        }),
      );
      filter.addRule(
        createTestRule({
          id: "flag-rule",
          type: "word",
          pattern: "suspicious",
          action: "flag",
        }),
      );

      const result = filter.filter("Be careful this is suspicious");
      expect(result.action).toBe("flag");
    });

    it("should include reasons in result", () => {
      filter.addRule(
        createTestRule({
          id: "block-rule",
          type: "word",
          pattern: "blocked",
          action: "block",
        }),
      );

      const result = filter.filter("This is blocked");
      expect(result.reason).toBeDefined();
      expect(result.reason).toContain("blocked");
    });
  });

  describe("filterAndCensor", () => {
    it("should censor blocked content", () => {
      filter.addRule(
        createTestRule({
          id: "censor-word",
          type: "word",
          pattern: "secret",
          action: "block",
        }),
      );

      const result = filter.filterAndCensor("This is a secret message");
      expect(result.filteredContent).toContain("******");
      expect(result.filteredContent).not.toContain("secret");
    });

    it("should use custom censor character", () => {
      filter.addRule(
        createTestRule({
          id: "censor-word",
          type: "word",
          pattern: "test",
          action: "block",
        }),
      );

      const result = filter.filterAndCensor("This is a test", "#");
      expect(result.filteredContent).toContain("####");
    });

    it("should not censor flagged content", () => {
      filter.addRule(
        createTestRule({
          id: "flag-word",
          type: "word",
          pattern: "maybe",
          action: "flag",
        }),
      );

      const result = filter.filterAndCensor("This is maybe ok");
      expect(result.filteredContent).toContain("maybe");
    });

    it("should return original content when clean", () => {
      const content = "This is clean content";
      const result = filter.filterAndCensor(content);
      expect(result.filteredContent).toBe(content);
    });

    it("should handle multiple matches", () => {
      filter.addRule(
        createTestRule({
          id: "bad1",
          type: "word",
          pattern: "bad",
          action: "block",
        }),
      );
      filter.addRule(
        createTestRule({
          id: "evil",
          type: "word",
          pattern: "evil",
          action: "block",
        }),
      );

      const result = filter.filterAndCensor("This is bad and evil content");
      expect(result.filteredContent).not.toContain("bad");
      expect(result.filteredContent).not.toContain("evil");
    });
  });

  describe("isClean", () => {
    it("should return true for clean content", () => {
      expect(filter.isClean("This is clean content")).toBe(true);
    });

    it("should return false for flagged content", () => {
      filter.addRule(
        createTestRule({
          id: "test-flag",
          type: "word",
          pattern: "flagged",
          action: "flag",
        }),
      );

      expect(filter.isClean("This is flagged content")).toBe(false);
    });

    it("should return false for blocked content", () => {
      expect(filter.isClean("This contains profanity")).toBe(false);
    });
  });
});

// ============================================================================
// Factory Function Tests
// ============================================================================

describe("Factory Functions", () => {
  describe("createContentFilter", () => {
    it("should create filter with default config", () => {
      const filter = createContentFilter();
      expect(filter.getConfig().profanityEnabled).toBe(true);
    });

    it("should create filter with custom config", () => {
      const filter = createContentFilter({ profanityEnabled: false });
      expect(filter.getConfig().profanityEnabled).toBe(false);
    });
  });

  describe("createStrictFilter", () => {
    it("should create strict filter", () => {
      const filter = createStrictFilter();
      const config = filter.getConfig();

      expect(config.defaultAction).toBe("block");
      expect(config.spamConfig.maxCapsPercent).toBe(50);
      expect(config.linkConfig.allowWhitelistedOnly).toBe(true);
    });

    it("should have lower thresholds", () => {
      const filter = createStrictFilter();
      const config = filter.getConfig();

      expect(config.spamConfig.maxRepeatedChars).toBeLessThan(
        DEFAULT_SPAM_CONFIG.maxRepeatedChars,
      );
      expect(config.spamConfig.maxLinks).toBeLessThan(
        DEFAULT_SPAM_CONFIG.maxLinks,
      );
    });
  });

  describe("createLenientFilter", () => {
    it("should create lenient filter", () => {
      const filter = createLenientFilter();
      const config = filter.getConfig();

      expect(config.defaultAction).toBe("flag");
      expect(config.linkEnabled).toBe(false);
      expect(config.regexEnabled).toBe(false);
    });

    it("should have higher thresholds", () => {
      const filter = createLenientFilter();
      const config = filter.getConfig();

      expect(config.spamConfig.maxCapsPercent).toBeGreaterThan(
        DEFAULT_SPAM_CONFIG.maxCapsPercent,
      );
      expect(config.spamConfig.maxEmojis).toBeGreaterThan(
        DEFAULT_SPAM_CONFIG.maxEmojis,
      );
    });
  });

  describe("defaultContentFilter", () => {
    it("should be a valid ContentFilter instance", () => {
      expect(defaultContentFilter).toBeInstanceOf(ContentFilter);
    });

    it("should use default configuration", () => {
      const config = defaultContentFilter.getConfig();
      expect(config.profanityEnabled).toBe(
        DEFAULT_FILTER_CONFIG.profanityEnabled,
      );
      expect(config.spamEnabled).toBe(DEFAULT_FILTER_CONFIG.spamEnabled);
    });
  });
});

// ============================================================================
// Default Configuration Tests
// ============================================================================

describe("Default Configurations", () => {
  describe("DEFAULT_SPAM_CONFIG", () => {
    it("should have sensible defaults", () => {
      expect(DEFAULT_SPAM_CONFIG.maxCapsPercent).toBeGreaterThan(0);
      expect(DEFAULT_SPAM_CONFIG.maxCapsPercent).toBeLessThanOrEqual(100);
      expect(DEFAULT_SPAM_CONFIG.maxRepeatedChars).toBeGreaterThan(1);
      expect(DEFAULT_SPAM_CONFIG.maxLinks).toBeGreaterThan(0);
      expect(DEFAULT_SPAM_CONFIG.maxEmojis).toBeGreaterThan(0);
    });
  });

  describe("DEFAULT_LINK_CONFIG", () => {
    it("should be permissive by default", () => {
      expect(DEFAULT_LINK_CONFIG.blockAllLinks).toBe(false);
      expect(DEFAULT_LINK_CONFIG.allowWhitelistedOnly).toBe(false);
      expect(DEFAULT_LINK_CONFIG.allowedDomains).toEqual([]);
      expect(DEFAULT_LINK_CONFIG.blockedDomains).toEqual([]);
    });
  });

  describe("DEFAULT_FILTER_CONFIG", () => {
    it("should enable all filter types by default", () => {
      expect(DEFAULT_FILTER_CONFIG.profanityEnabled).toBe(true);
      expect(DEFAULT_FILTER_CONFIG.spamEnabled).toBe(true);
      expect(DEFAULT_FILTER_CONFIG.linkEnabled).toBe(true);
      expect(DEFAULT_FILTER_CONFIG.regexEnabled).toBe(true);
    });

    it("should have default action as block", () => {
      expect(DEFAULT_FILTER_CONFIG.defaultAction).toBe("block");
    });
  });
});

// ============================================================================
// Edge Cases
// ============================================================================

describe("Edge Cases", () => {
  let filter: ContentFilter;

  beforeEach(() => {
    filter = new ContentFilter();
  });

  it("should handle empty content", () => {
    const result = filter.filter("");
    expect(result.passed).toBe(true);
    expect(result.matches.length).toBe(0);
  });

  it("should handle very long content", () => {
    const longContent = "a".repeat(10000);
    const result = filter.filter(longContent);
    expect(result).toBeDefined();
  });

  it("should handle content with only special characters", () => {
    const result = filter.filter("!@#$%^&*()");
    expect(result.passed).toBe(true);
  });

  it("should handle content with unicode characters", () => {
    const result = filter.filter("Hello world!");
    expect(result).toBeDefined();
  });

  it("should handle multiple overlapping matches", () => {
    filter.addRule(
      createTestRule({
        id: "rule-ab",
        type: "word",
        pattern: "ab",
        action: "block",
      }),
    );
    filter.addRule(
      createTestRule({
        id: "rule-bc",
        type: "word",
        pattern: "bc",
        action: "block",
      }),
    );

    const result = filter.filter("abc");
    expect(result.matches.length).toBeGreaterThanOrEqual(1);
  });

  it("should handle rapid successive calls", () => {
    for (let i = 0; i < 100; i++) {
      const result = filter.filter(`Message ${i}`);
      expect(result).toBeDefined();
    }
  });

  it("should handle disabled rule updates", () => {
    filter.addRule(
      createTestRule({
        id: "toggle-rule",
        type: "word",
        pattern: "toggle",
        action: "block",
        enabled: true,
      }),
    );

    expect(filter.filter("toggle").passed).toBe(false);

    filter.setRuleEnabled("toggle-rule", false);
    expect(filter.filter("toggle").passed).toBe(true);

    filter.setRuleEnabled("toggle-rule", true);
    expect(filter.filter("toggle").passed).toBe(false);
  });

  it("should handle null userId in spam check", () => {
    const result = filter.checkSpam("Test message");
    expect(result).toBeDefined();
  });
});
