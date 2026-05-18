/**
 * @jest-environment node
 */

/**
 * Comprehensive Tests for Spam Detector Service
 *
 * Tests cover:
 * - Heuristic spam detection
 * - Rule-based detection
 * - Blocklist management
 * - Configuration and sensitivity
 * - Edge cases
 */

import {
  SpamDetector,
  createSpamDetector,
  getSpamDetector,
  DEFAULT_SPAM_CONFIG,
} from "../spam-detector";
import type { SpamRule, SpamCategory, SpamSeverity } from "../spam-detector";

describe("SpamDetector", () => {
  let detector: SpamDetector;

  beforeEach(() => {
    detector = createSpamDetector();
  });

  afterEach(() => {
    detector.clearHistory();
    detector.clearRules();
  });

  // ============================================================================
  // Configuration Tests
  // ============================================================================

  describe("Configuration", () => {
    it("should use default configuration", () => {
      const config = detector.getConfig();
      expect(config.sensitivity).toBe("medium");
      expect(config.spamThreshold).toBe(0.6);
    });

    it("should accept custom configuration", () => {
      const customDetector = createSpamDetector({
        spamThreshold: 0.8,
        linkFloodThreshold: 10,
      });
      const config = customDetector.getConfig();
      expect(config.spamThreshold).toBe(0.8);
      expect(config.linkFloodThreshold).toBe(10);
    });

    it("should update configuration", () => {
      detector.updateConfig({ spamThreshold: 0.7 });
      expect(detector.getConfig().spamThreshold).toBe(0.7);
    });

    it("should apply sensitivity presets", () => {
      detector.setSensitivity("high");
      const config = detector.getConfig();
      expect(config.sensitivity).toBe("high");
      expect(config.spamThreshold).toBe(0.45);
    });

    it("should apply low sensitivity preset", () => {
      detector.setSensitivity("low");
      const config = detector.getConfig();
      expect(config.sensitivity).toBe("low");
      expect(config.spamThreshold).toBe(0.75);
    });
  });

  // ============================================================================
  // Basic Analysis Tests
  // ============================================================================

  describe("Basic Analysis", () => {
    it("should detect clean content", () => {
      const result = detector.analyze("Hello, how are you today?", {
        userId: "user-1",
        channelId: "channel-1",
      });

      expect(result.isSpam).toBe(false);
      expect(result.score).toBeLessThan(0.3);
    });

    it("should return metadata for analyzed content", () => {
      const result = detector.analyze(
        "Check out https://example.com for more info!",
        {
          userId: "user-1",
          channelId: "channel-1",
        },
      );

      expect(result.metadata.messageLength).toBeGreaterThan(0);
      expect(result.metadata.linkCount).toBe(1);
      expect(result.metadata.analysisTime).toBeGreaterThanOrEqual(0);
    });

    it("should skip analysis for very short messages", () => {
      const result = detector.analyze("Hi", {
        userId: "user-1",
        channelId: "channel-1",
      });

      expect(result.isSpam).toBe(false);
      expect(result.score).toBe(0);
    });

    it("should skip analysis for trusted users", () => {
      detector.addTrustedUser("trusted-user");

      const result = detector.analyze("BUY NOW!!! FREE MONEY!!!", {
        userId: "trusted-user",
        channelId: "channel-1",
      });

      expect(result.isSpam).toBe(false);
      expect(result.score).toBe(0);
    });
  });

  // ============================================================================
  // Heuristic Detection Tests
  // ============================================================================

  describe("Heuristic Detection", () => {
    describe("Caps Spam", () => {
      it("should detect excessive caps", () => {
        const result = detector.analyze(
          "THIS IS ALL CAPS AND VERY SPAMMY MESSAGE HELLO WORLD",
          {
            userId: "user-1",
            channelId: "channel-1",
          },
        );

        expect(result.categories).toContain("caps_spam");
        expect(result.metadata.capsPercentage).toBeGreaterThan(0.7);
      });

      it("should not flag normal capitalization", () => {
        const result = detector.analyze(
          "Hello World! This is a Normal Message.",
          {
            userId: "user-1",
            channelId: "channel-1",
          },
        );

        expect(result.categories).not.toContain("caps_spam");
      });
    });

    describe("Link Flooding", () => {
      it("should detect excessive links", () => {
        const content = Array(10).fill("https://example.com").join(" ");
        const result = detector.analyze(content, {
          userId: "user-1",
          channelId: "channel-1",
        });

        expect(result.categories).toContain("link_flooding");
        expect(result.metadata.linkCount).toBe(10);
      });

      it("should allow normal link count", () => {
        const result = detector.analyze(
          "Check out https://example.com and https://test.com",
          {
            userId: "user-1",
            channelId: "channel-1",
          },
        );

        expect(result.categories).not.toContain("link_flooding");
      });
    });

    describe("Mention Spam", () => {
      it("should detect excessive mentions", () => {
        const mentions = Array(15)
          .fill("@user")
          .map((m, i) => `${m}${i}`)
          .join(" ");
        const result = detector.analyze(mentions, {
          userId: "user-1",
          channelId: "channel-1",
        });

        expect(result.categories).toContain("mention_spam");
        expect(result.metadata.mentionCount).toBe(15);
      });
    });

    describe("Emoji Spam", () => {
      it("should detect excessive emojis", () => {
        const emojis = "😀😃😄😁😆😅🤣😂🙂🙃😉😊😇🥰😍🤩😘😗☺😚😙🥲😋😛😜🤪😝";
        const result = detector.analyze(emojis + emojis, {
          userId: "user-1",
          channelId: "channel-1",
        });

        expect(result.metadata.emojiCount).toBeGreaterThan(20);
      });
    });

    describe("Unicode Abuse", () => {
      it("should detect zalgo text", () => {
        const zalgo = "H̷̢̧̛̞͕̯̤̥̘̰̗̞̲̩̝̣͈̫̬̫̞̱̤̬̙̜̮̦̫͌̓́̋̑̓̃̒̔̋̃͐̌̌̔́̓̚̕͜͜͠ͅę̴̨̢̧̛̮̲̬̙̫͉̗͔̮̗̰̣̼̮̻̰̞͙̝̩̲̲̥̼̘̜͆̓̉̂̈́̑̍̐̓̀̈́̓͐̄̿̑͒̆̿̎̕̚͜͝͠l̵̨̢̧̡̧̛̛̝̖̲̬̙̹̳͍̙̯̲̖̲̖̤̪̼̱͕̠̲̪̻̺̻͂̓̌̓̎̇̃̑͒̆̃̆̎̄̅̽̀̑̀̈́̕̕͜͜͝ͅͅl̶̨̢̡̛̛͉̱̝̳̩̼̘̼̠̙̠͙̙̹̪̬̲̣̳͔̪̗̘̘̟͖̬̇̉̍̌͋̉̌̾̊̍̈́́̔̈́̋͆̑̂̈́̀̋̕͜͜͠ờ̸̢̢̢̧̨̨̩̲̣̳̦̤̥̮͓̠̬̝̬̲̻̬̗̪̲̗̥͔̈́̓̆̈́̎̅́̂̀̈́̄̿̎̍̎̈́̀̃̋̀̈́̕͘͜͜";
        const result = detector.analyze(zalgo, {
          userId: "user-1",
          channelId: "channel-1",
        });

        expect(result.metadata.unicodeAnomalyScore).toBeGreaterThan(0.3);
      });
    });

    describe("Repetition Detection", () => {
      it("should detect internal word repetition", () => {
        const result = detector.analyze(
          "spam spam spam spam spam buy now buy now buy now buy now",
          {
            userId: "user-1",
            channelId: "channel-1",
          },
        );

        expect(result.metadata.repetitionScore).toBeGreaterThan(0);
      });

      it("should detect cross-message repetition", () => {
        const content =
          "This is a repeated message that will be sent multiple times";

        // Send same message multiple times (need more than 2 repetitions)
        detector.analyze(content, {
          userId: "user-1",
          channelId: "channel-1",
        });
        detector.analyze(content, {
          userId: "user-1",
          channelId: "channel-1",
        });
        detector.analyze(content, {
          userId: "user-1",
          channelId: "channel-1",
        });
        const result = detector.analyze(content, {
          userId: "user-1",
          channelId: "channel-1",
        });

        // Either repetitive content is detected or score reflects repetition
        const hasRepetition = result.heuristics.some(
          (h) => h.category === "repetitive_content",
        );
        const hasHighScore = result.score > 0.1;
        expect(hasRepetition || hasHighScore).toBe(true);
      });
    });

    describe("Rapid Fire Detection", () => {
      it("should detect rapid-fire posting", () => {
        const detector = createSpamDetector({
          rapidFireThreshold: 5,
          rapidFireWindow: 60000,
        });

        // Simulate rapid messages
        for (let i = 0; i < 10; i++) {
          detector.analyze(`Message ${i}`, {
            userId: "user-1",
            channelId: "channel-1",
          });
        }

        const rapidFire = detector.checkRapidFire("user-1", "channel-1");
        expect(rapidFire).not.toBeNull();
        expect(rapidFire?.category).toBe("rapid_fire");
      });
    });
  });

  // ============================================================================
  // Rule-Based Detection Tests
  // ============================================================================

  describe("Rule-Based Detection", () => {
    it("should add and match keyword rules", () => {
      const rule: SpamRule = {
        id: "rule-1",
        name: "Test Keyword Rule",
        enabled: true,
        type: "keyword",
        pattern: "free money",
        severity: "high",
        category: "keyword_match",
        action: "delete",
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      detector.addRule(rule);

      const result = detector.analyze("Get free money now!", {
        userId: "user-1",
        channelId: "channel-1",
      });

      expect(result.matchedRules.length).toBe(1);
      expect(result.matchedRules[0].ruleId).toBe("rule-1");
    });

    it("should add and match regex rules", () => {
      const rule: SpamRule = {
        id: "rule-2",
        name: "Test Regex Rule",
        enabled: true,
        type: "regex",
        pattern: "\\d{4}-\\d{4}-\\d{4}-\\d{4}",
        severity: "critical",
        category: "regex_match",
        action: "ban",
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      detector.addRule(rule);

      const result = detector.analyze("My credit card is 1234-5678-9012-3456", {
        userId: "user-1",
        channelId: "channel-1",
      });

      expect(result.matchedRules.length).toBe(1);
      expect(result.matchedRules[0].severity).toBe("critical");
    });

    it("should add and match domain rules", () => {
      const rule: SpamRule = {
        id: "rule-3",
        name: "Blocked Domain Rule",
        enabled: true,
        type: "domain",
        pattern: "malicious.com",
        severity: "high",
        category: "blocked_domain",
        action: "delete",
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      detector.addRule(rule);

      const result = detector.analyze("Visit https://malicious.com/scam", {
        userId: "user-1",
        channelId: "channel-1",
      });

      expect(result.matchedRules.some((r) => r.ruleId === "rule-3")).toBe(true);
    });

    it("should respect rule exemptions", () => {
      const rule: SpamRule = {
        id: "rule-4",
        name: "Exempt Rule",
        enabled: true,
        type: "keyword",
        pattern: "admin only",
        severity: "medium",
        category: "keyword_match",
        action: "warn",
        exemptRoles: ["admin"],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      detector.addRule(rule);

      const result = detector.analyze("This is admin only content", {
        userId: "user-1",
        channelId: "channel-1",
        userRole: "admin",
      });

      expect(result.matchedRules.length).toBe(0);
    });

    it("should disable and enable rules", () => {
      const rule: SpamRule = {
        id: "rule-5",
        name: "Toggle Rule",
        enabled: true,
        type: "keyword",
        pattern: "toggleable",
        severity: "low",
        category: "keyword_match",
        action: "flag",
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      detector.addRule(rule);

      // Should match when enabled
      let result = detector.analyze("This is toggleable content", {
        userId: "user-1",
        channelId: "channel-1",
      });
      expect(result.matchedRules.length).toBe(1);

      // Disable rule
      detector.setRuleEnabled("rule-5", false);

      // Should not match when disabled
      result = detector.analyze("This is toggleable content", {
        userId: "user-1",
        channelId: "channel-1",
      });
      expect(result.matchedRules.length).toBe(0);
    });

    it("should remove rules", () => {
      const rule: SpamRule = {
        id: "rule-6",
        name: "Removable Rule",
        enabled: true,
        type: "keyword",
        pattern: "remove me",
        severity: "low",
        category: "keyword_match",
        action: "flag",
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      detector.addRule(rule);
      expect(detector.getRules().length).toBe(1);

      detector.removeRule("rule-6");
      expect(detector.getRules().length).toBe(0);
    });

    it("should get rules by workspace", () => {
      detector.addRule({
        id: "rule-ws1",
        name: "Workspace 1 Rule",
        enabled: true,
        type: "keyword",
        pattern: "test",
        severity: "low",
        category: "keyword_match",
        action: "flag",
        workspaceId: "workspace-1",
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      detector.addRule({
        id: "rule-ws2",
        name: "Workspace 2 Rule",
        enabled: true,
        type: "keyword",
        pattern: "test2",
        severity: "low",
        category: "keyword_match",
        action: "flag",
        workspaceId: "workspace-2",
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const ws1Rules = detector.getRules("workspace-1");
      expect(ws1Rules.length).toBe(1);
      expect(ws1Rules[0].id).toBe("rule-ws1");
    });
  });

  // ============================================================================
  // Blocklist Tests
  // ============================================================================

  describe("Blocklist Management", () => {
    it("should add and detect blocked domains", () => {
      detector.addBlockedDomain("spam-site.com");
      detector.addBlockedDomain("www.another-spam.net");

      const result = detector.analyze("Visit https://spam-site.com/offer", {
        userId: "user-1",
        channelId: "channel-1",
      });

      expect(result.categories).toContain("blocked_domain");
    });

    it("should remove blocked domains", () => {
      detector.addBlockedDomain("temp-blocked.com");
      detector.removeBlockedDomain("temp-blocked.com");

      const result = detector.analyze("Visit https://temp-blocked.com", {
        userId: "user-1",
        channelId: "channel-1",
      });

      expect(result.categories).not.toContain("blocked_domain");
    });

    it("should add and detect blocked keywords", () => {
      detector.addBlockedKeyword("buy viagra");

      const result = detector.analyze("Buy viagra online cheap!", {
        userId: "user-1",
        channelId: "channel-1",
      });

      expect(result.categories).toContain("keyword_match");
    });

    it("should remove blocked keywords", () => {
      detector.addBlockedKeyword("temporary keyword");
      detector.removeBlockedKeyword("temporary keyword");

      const result = detector.analyze("This has the temporary keyword", {
        userId: "user-1",
        channelId: "channel-1",
      });

      expect(
        result.matchedRules.some((r) => r.pattern === "temporary keyword"),
      ).toBe(false);
    });

    it("should manage trusted users", () => {
      detector.addTrustedUser("trusted-user-1");
      expect(detector.getConfig().trustedUsers).toContain("trusted-user-1");

      detector.removeTrustedUser("trusted-user-1");
      expect(detector.getConfig().trustedUsers).not.toContain("trusted-user-1");
    });
  });

  // ============================================================================
  // Quick Check Tests
  // ============================================================================

  describe("Quick Check", () => {
    it("should quickly identify obvious spam", () => {
      detector.addBlockedKeyword("free money");

      const isSpam = detector.quickCheck("Get FREE MONEY now!!!");
      expect(isSpam).toBe(true);
    });

    it("should quickly identify blocked domains", () => {
      detector.addBlockedDomain("spam.com");

      const isSpam = detector.quickCheck("Visit https://spam.com/offer");
      expect(isSpam).toBe(true);
    });

    it("should pass clean content quickly", () => {
      const isSpam = detector.quickCheck("Hello, how are you?");
      expect(isSpam).toBe(false);
    });

    it("should detect caps in quick check", () => {
      const isSpam = detector.quickCheck("THIS IS ALL CAPS SPAM MESSAGE NOW");
      expect(isSpam).toBe(true);
    });
  });

  // ============================================================================
  // Severity and Action Tests
  // ============================================================================

  describe("Severity and Suggested Actions", () => {
    it("should suggest appropriate action for high severity", () => {
      const rule: SpamRule = {
        id: "high-severity",
        name: "High Severity Rule",
        enabled: true,
        type: "keyword",
        pattern: "critical spam",
        severity: "critical",
        category: "keyword_match",
        action: "ban",
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      detector.addRule(rule);

      const result = detector.analyze("This is critical spam content", {
        userId: "user-1",
        channelId: "channel-1",
      });

      expect(result.severity).toBe("critical");
      expect(result.suggestedAction).toBe("ban");
    });

    it("should escalate severity based on combined factors", () => {
      // Add multiple rules
      detector.addRule({
        id: "rule-a",
        name: "Rule A",
        enabled: true,
        type: "keyword",
        pattern: "suspicious",
        severity: "medium",
        category: "keyword_match",
        action: "warn",
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      detector.addRule({
        id: "rule-b",
        name: "Rule B",
        enabled: true,
        type: "keyword",
        pattern: "content",
        severity: "high",
        category: "keyword_match",
        action: "delete",
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = detector.analyze("THIS IS SUSPICIOUS CONTENT!!!", {
        userId: "user-1",
        channelId: "channel-1",
      });

      // Should be elevated due to multiple matches + caps
      expect(result.severity).toBe("high");
    });
  });

  // ============================================================================
  // Edge Cases Tests
  // ============================================================================

  describe("Edge Cases", () => {
    it("should handle empty content", () => {
      const result = detector.analyze("", {
        userId: "user-1",
        channelId: "channel-1",
      });

      expect(result.isSpam).toBe(false);
    });

    it("should handle content with only whitespace", () => {
      const result = detector.analyze("   \n\t  ", {
        userId: "user-1",
        channelId: "channel-1",
      });

      expect(result.isSpam).toBe(false);
    });

    it("should handle malformed URLs", () => {
      const result = detector.analyze(
        "Check out htp://not-a-url and ://broken",
        {
          userId: "user-1",
          channelId: "channel-1",
        },
      );

      // Should not throw
      expect(result).toBeDefined();
    });

    it("should handle unicode-heavy content", () => {
      const result = detector.analyze("日本語テスト 中文测试 한국어 테스트", {
        userId: "user-1",
        channelId: "channel-1",
      });

      expect(result).toBeDefined();
      expect(result.isSpam).toBe(false);
    });

    it("should handle very long content", () => {
      const longContent = "a".repeat(10000);
      const result = detector.analyze(longContent, {
        userId: "user-1",
        channelId: "channel-1",
      });

      expect(result).toBeDefined();
    });

    it("should handle invalid regex patterns gracefully", () => {
      // This should not throw
      const rule: SpamRule = {
        id: "invalid-regex",
        name: "Invalid Regex",
        enabled: true,
        type: "regex",
        pattern: "[invalid(regex",
        severity: "low",
        category: "regex_match",
        action: "flag",
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      expect(() => detector.addRule(rule)).not.toThrow();
    });
  });

  // ============================================================================
  // Singleton Tests
  // ============================================================================

  describe("Singleton", () => {
    it("should return same instance without config", () => {
      const instance1 = getSpamDetector();
      const instance2 = getSpamDetector();
      expect(instance1).toBe(instance2);
    });

    it("should create new instance with config", () => {
      const instance1 = getSpamDetector({ spamThreshold: 0.9 });
      expect(instance1.getConfig().spamThreshold).toBe(0.9);
    });
  });
});
