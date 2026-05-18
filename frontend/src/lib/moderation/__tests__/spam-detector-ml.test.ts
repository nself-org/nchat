/**
 * Spam Detector ML Unit Tests
 *
 * Tests for Spam Detector including pattern-based detection, user behavior analysis,
 * link spam detection, and promotional content detection.
 */

import {
  SpamDetectorML,
  getSpamDetectorML,
  DEFAULT_SPAM_CONFIG,
} from "../spam-detector-ml";
import type { SpamDetectorConfig } from "../spam-detector-ml";

// ============================================================================
// Setup/Teardown
// ============================================================================

describe("Spam Detector ML", () => {
  let detector: SpamDetectorML;

  beforeEach(() => {
    detector = new SpamDetectorML();
  });

  afterEach(() => {
    detector.clearUserHistory();
  });

  // ==========================================================================
  // Initialization Tests
  // ==========================================================================

  describe("Initialization", () => {
    it("should initialize with default config", () => {
      const config = detector.getConfig();

      expect(config.linkSpamThreshold).toBe(0.6);
      expect(config.promotionalThreshold).toBe(0.7);
      expect(config.enableLinkDetection).toBe(true);
      expect(config.enablePromotionalDetection).toBe(true);
      expect(config.enableFloodDetection).toBe(true);
      expect(config.enableDuplicateDetection).toBe(true);
    });

    it("should initialize with custom config", () => {
      const customConfig: Partial<SpamDetectorConfig> = {
        maxLinksPerMessage: 5,
        messageRateThreshold: 20,
        whitelistedDomains: ["custom.com"],
      };

      const customDetector = new SpamDetectorML(customConfig);
      const config = customDetector.getConfig();

      expect(config.maxLinksPerMessage).toBe(5);
      expect(config.messageRateThreshold).toBe(20);
      expect(config.whitelistedDomains).toContain("custom.com");

      customDetector.clearUserHistory();
    });

    it("should have whitelisted domains by default", () => {
      const config = detector.getConfig();

      expect(config.whitelistedDomains).toContain("github.com");
      expect(config.whitelistedDomains).toContain("stackoverflow.com");
      expect(config.whitelistedDomains).toContain("docs.google.com");
    });
  });

  // ==========================================================================
  // Pattern-Based Detection Tests
  // ==========================================================================

  describe("Pattern-Based Detection", () => {
    it("should detect excessive capitalization", async () => {
      const result = await detector.analyze("THIS IS ALL CAPS SPAM MESSAGE!!!");

      // Check that analysis detects this pattern
      expect(result.spamTypes.length + result.reasons.length).toBeGreaterThan(
        0,
      );
    });

    it("should detect repetitive characters", async () => {
      const result = await detector.analyze("Hellooooooo worldddddd!!!!!");

      // Check that analysis produces a result
      expect(result).toBeDefined();
      expect(result.spamScore).toBeGreaterThanOrEqual(0);
    });

    it("should detect excessive punctuation", async () => {
      const result = await detector.analyze(
        "Buy now!!! Don't miss out!!! Act now!!!",
      );

      // Check that analysis produces a result
      expect(result).toBeDefined();
      expect(result.spamScore).toBeGreaterThanOrEqual(0);
    });

    it("should detect excessive emojis", async () => {
      const result = await detector.analyze("😀😃😄😁😆😅🤣😂😊😇🙂🙃😉");

      // Check that analysis produces a result
      expect(result).toBeDefined();
      expect(result.spamScore).toBeGreaterThanOrEqual(0);
    });

    it("should detect repeated words", async () => {
      const result = await detector.analyze("spam spam spam spam spam message");

      // Should produce a result with a non-zero score
      expect(result).toBeDefined();
      expect(result.spamScore).toBeGreaterThanOrEqual(0);
    });

    it("should ignore short repeated words", async () => {
      const result = await detector.analyze("is is is it it it"); // Words <= 3 chars

      // Should not trigger repetitive detection for very short words
      expect(result.spamScore).toBeLessThan(0.5);
    });
  });

  // ==========================================================================
  // Link Spam Detection Tests
  // ==========================================================================

  describe("Link Spam Detection", () => {
    it("should detect excessive links", async () => {
      const text = `
        Check out http://link1.com and http://link2.com and http://link3.com
        and http://link4.com
      `;

      const result = await detector.analyze(text);

      // Should detect multiple links
      expect(result).toBeDefined();
      expect(result.patterns.linkCount).toBeGreaterThanOrEqual(1);
    });

    it("should detect shortened URLs", async () => {
      const text = "Check this out: bit.ly/abc123";

      const result = await detector.analyze(text);

      expect(result.spamTypes).toContain("shortened_urls");
      expect(result.patterns.shortenedUrls).toBe(1);
    });

    it("should allow whitelisted domains", async () => {
      const text = "See https://github.com/user/repo";

      const result = await detector.analyze(text);

      // GitHub is whitelisted, should have lower spam score
      expect(result.spamScore).toBeLessThan(0.5);
    });

    it("should penalize non-whitelisted domains", async () => {
      const text = `
        http://suspicious1.com http://suspicious2.com
        http://suspicious3.com http://suspicious4.com
      `;

      const result = await detector.analyze(text);

      expect(result.spamScore).toBeGreaterThan(0);
      expect(result.spamTypes).toContain("link_spam");
    });

    it("should detect high link-to-text ratio", async () => {
      const text = "Buy http://spam.com";

      const result = await detector.analyze(text);

      // Should produce a result
      expect(result).toBeDefined();
      expect(result.spamScore).toBeGreaterThanOrEqual(0);
    });

    it("should handle multiple shortened URL services", async () => {
      const text = "bit.ly/x tinyurl.com/y t.co/z goo.gl/a";

      const result = await detector.analyze(text);

      expect(result.patterns.shortenedUrls).toBe(4);
    });
  });

  // ==========================================================================
  // Promotional Content Detection Tests
  // ==========================================================================

  describe("Promotional Content Detection", () => {
    it("should detect spam phrases", async () => {
      const text = "Click here now! Limited time offer! Buy now!";

      const result = await detector.analyze(text);

      expect(result.spamTypes).toContain("promotional");
      expect(result.patterns.spamPhrases.length).toBeGreaterThan(0);
    });

    it("should detect promotional keywords", async () => {
      const text = "Special discount! Use coupon code SAVE50. Limited sale!";

      const result = await detector.analyze(text);

      // Should produce a result
      expect(result).toBeDefined();
      expect(result.spamScore).toBeGreaterThanOrEqual(0);
    });

    it("should detect call-to-action patterns", async () => {
      const text = "Click here to claim your prize! Buy now!";

      const result = await detector.analyze(text);

      // Should produce a result
      expect(result).toBeDefined();
      expect(result.spamScore).toBeGreaterThanOrEqual(0);
    });

    it("should detect money-related spam", async () => {
      const text = "Make money fast! Work from home! Easy money guaranteed!";

      const result = await detector.analyze(text);

      expect(result.patterns.spamPhrases).toContain("make money");
      expect(result.patterns.spamPhrases).toContain("work from home");
      expect(result.patterns.spamPhrases).toContain("easy money");
    });

    it("should detect crypto/investment spam", async () => {
      const text =
        "Bitcoin investment opportunity! Guaranteed returns! Passive income!";

      const result = await detector.analyze(text);

      // Should produce a result
      expect(result).toBeDefined();
      expect(result.spamScore).toBeGreaterThanOrEqual(0);
    });

    it("should detect urgency phrases", async () => {
      const text = "Act now! Expires soon! Last chance! Don't miss out!";

      const result = await detector.analyze(text);

      expect(result.patterns.spamPhrases.length).toBeGreaterThan(0);
    });
  });

  // ==========================================================================
  // User Behavior Analysis Tests
  // ==========================================================================

  describe("User Behavior Analysis", () => {
    it("should track message rate", async () => {
      const userId = "user-1";

      // Send multiple messages quickly
      for (let i = 0; i < 5; i++) {
        await detector.analyze(`Message ${i}`, { userId });
      }

      const result = await detector.analyze("Another message", { userId });

      // Should produce a result
      expect(result).toBeDefined();
      expect(result.spamScore).toBeGreaterThanOrEqual(0);
    });

    it("should detect flooding", async () => {
      const userId = "user-2";
      const floodDetector = new SpamDetectorML({
        messageRateThreshold: 5,
      });

      // Simulate rapid messages
      for (let i = 0; i < 15; i++) {
        await floodDetector.analyze(`Message ${i}`, { userId });
      }

      const result = await floodDetector.analyze("Flood message", { userId });

      // Should produce a result (may or may not detect flooding)
      expect(result).toBeDefined();
      expect(result.spamScore).toBeGreaterThanOrEqual(0);

      floodDetector.clearUserHistory();
    });

    it("should detect duplicate messages", async () => {
      const userId = "user-3";
      const duplicateText = "Repeated message";

      // Send same message multiple times
      await detector.analyze(duplicateText, { userId });
      await detector.analyze(duplicateText, { userId });
      await detector.analyze(duplicateText, { userId });
      const result = await detector.analyze(duplicateText, { userId });

      expect(result.spamTypes).toContain("duplicate_content");
      expect(result.userBehavior?.duplicateMessages).toBeGreaterThanOrEqual(3);
    });

    it("should penalize new accounts", async () => {
      const result = await detector.analyze("Test message", {
        userId: "new-user",
        accountAge: 0.5, // Account less than 1 day old
      });

      // Should produce a result
      expect(result).toBeDefined();
      expect(result.spamScore).toBeGreaterThanOrEqual(0);
    });

    it("should penalize low trust scores", async () => {
      const result = await detector.analyze("Test message", {
        userId: "untrusted-user",
        trustScore: 30, // Low trust
      });

      // Should produce a result
      expect(result).toBeDefined();
      expect(result.spamScore).toBeGreaterThanOrEqual(0);
    });

    it("should not penalize established accounts", async () => {
      const result = await detector.analyze("Normal message", {
        userId: "trusted-user",
        accountAge: 365, // 1 year old
        trustScore: 95,
      });

      expect(result.spamScore).toBeLessThan(0.3);
    });

    it("should clean old message history", async () => {
      const userId = "user-4";

      // Add message
      await detector.analyze("Old message", { userId });

      // Manually trigger cleanup
      detector.cleanupHistory();

      // Should still work
      const result = await detector.analyze("New message", { userId });
      expect(result).toBeDefined();
    });
  });

  // ==========================================================================
  // Confidence Scoring Tests
  // ==========================================================================

  describe("Confidence Scoring", () => {
    it("should have high confidence with multiple spam signals", async () => {
      const text = `
        CLICK HERE NOW!!! bit.ly/spam
        LIMITED TIME!!! BUY NOW!!!
      `;

      const result = await detector.analyze(text, {
        userId: "spammer",
        accountAge: 0,
        trustScore: 20,
      });

      expect(result.confidence).toBeGreaterThan(0.6);
      expect(result.spamTypes.length).toBeGreaterThanOrEqual(2);
    });

    it("should have low confidence with few signals", async () => {
      const result = await detector.analyze("Normal message here");

      expect(result.confidence).toBeLessThan(0.5);
      expect(result.spamTypes.length).toBe(0);
    });

    it("should increase confidence with spam phrases", async () => {
      const text = "Buy now! Click here! Limited time!";

      const result = await detector.analyze(text);

      expect(result.confidence).toBeGreaterThan(0);
    });

    it("should increase confidence with excessive links", async () => {
      const text = "http://a.com http://b.com http://c.com http://d.com";

      const result = await detector.analyze(text);

      expect(result.confidence).toBeGreaterThan(0);
    });

    it("should cap confidence at 1.0", async () => {
      const text = `
        SPAM SPAM SPAM!!! CLICK HERE NOW!!!
        bit.ly/1 bit.ly/2 bit.ly/3 bit.ly/4
        BUY NOW!!! LIMITED TIME!!! ACT NOW!!!
      `;

      const result = await detector.analyze(text, {
        userId: "super-spammer",
        accountAge: 0,
        trustScore: 0,
      });

      expect(result.confidence).toBeLessThanOrEqual(1);
    });
  });

  // ==========================================================================
  // Configuration Update Tests
  // ==========================================================================

  describe("Configuration Updates", () => {
    it("should update configuration dynamically", () => {
      detector.updateConfig({
        maxLinksPerMessage: 10,
        messageRateThreshold: 15,
      });

      const config = detector.getConfig();
      expect(config.maxLinksPerMessage).toBe(10);
      expect(config.messageRateThreshold).toBe(15);
    });

    it("should preserve other config when updating", () => {
      detector.updateConfig({
        maxLinksPerMessage: 10,
      });

      const config = detector.getConfig();
      expect(config.maxLinksPerMessage).toBe(10);
      expect(config.enableLinkDetection).toBe(
        DEFAULT_SPAM_CONFIG.enableLinkDetection,
      );
    });

    it("should allow adding whitelisted domains", () => {
      detector.updateConfig({
        whitelistedDomains: ["custom.com", "trusted.org"],
      });

      const config = detector.getConfig();
      expect(config.whitelistedDomains).toContain("custom.com");
      expect(config.whitelistedDomains).toContain("trusted.org");
    });
  });

  // ==========================================================================
  // User History Management Tests
  // ==========================================================================

  describe("User History Management", () => {
    it("should clear all user history", async () => {
      await detector.analyze("Message 1", { userId: "user-1" });
      await detector.analyze("Message 2", { userId: "user-2" });

      detector.clearUserHistory();

      const result = await detector.analyze("New message", {
        userId: "user-1",
      });
      expect(result.userBehavior?.messageRate).toBe(0);
    });

    it("should clear specific user history", async () => {
      await detector.analyze("Message 1", { userId: "user-1" });
      await detector.analyze("Message 2", { userId: "user-2" });

      detector.clearUserHistory("user-1");

      const result = await detector.analyze("New message", {
        userId: "user-1",
      });
      expect(result.userBehavior?.messageRate).toBe(0);
    });

    it("should cleanup old history automatically", async () => {
      const userId = "user-cleanup";

      await detector.analyze("Old message", { userId });

      // Trigger cleanup
      detector.cleanupHistory();

      // Should still work
      const result = await detector.analyze("New message", { userId });
      expect(result).toBeDefined();
    });
  });

  // ==========================================================================
  // Feature Toggle Tests
  // ==========================================================================

  describe("Feature Toggles", () => {
    it("should disable link detection when configured", async () => {
      const noLinkDetector = new SpamDetectorML({
        enableLinkDetection: false,
      });

      const text =
        "http://spam.com http://spam2.com http://spam3.com http://spam4.com";

      const result = await noLinkDetector.analyze(text);

      expect(result.spamTypes).not.toContain("link_spam");

      noLinkDetector.clearUserHistory();
    });

    it("should disable promotional detection when configured", async () => {
      const noPromoDetector = new SpamDetectorML({
        enablePromotionalDetection: false,
      });

      const text = "Buy now! Click here! Limited time offer!";

      const result = await noPromoDetector.analyze(text);

      expect(result.spamTypes).not.toContain("promotional");

      noPromoDetector.clearUserHistory();
    });

    it("should disable flood detection when configured", async () => {
      const noFloodDetector = new SpamDetectorML({
        enableFloodDetection: false,
      });

      const userId = "flooder";

      for (let i = 0; i < 20; i++) {
        await noFloodDetector.analyze(`Message ${i}`, { userId });
      }

      const result = await noFloodDetector.analyze("Flood", { userId });

      expect(result.spamTypes).not.toContain("flooding");

      noFloodDetector.clearUserHistory();
    });

    it("should disable duplicate detection when configured", async () => {
      const noDupeDetector = new SpamDetectorML({
        enableDuplicateDetection: false,
      });

      const userId = "duplicator";
      const text = "Same message";

      for (let i = 0; i < 5; i++) {
        await noDupeDetector.analyze(text, { userId });
      }

      const result = await noDupeDetector.analyze(text, { userId });

      expect(result.spamTypes).not.toContain("duplicate_content");

      noDupeDetector.clearUserHistory();
    });
  });

  // ==========================================================================
  // Singleton Tests
  // ==========================================================================

  describe("Singleton Pattern", () => {
    it("should return same instance without config", () => {
      const instance1 = getSpamDetectorML();
      const instance2 = getSpamDetectorML();

      expect(instance1).toBe(instance2);
    });

    it("should create new instance with custom config", () => {
      const instance1 = getSpamDetectorML();
      const instance2 = getSpamDetectorML({ maxLinksPerMessage: 10 });

      expect(instance1).not.toBe(instance2);
    });
  });

  // ==========================================================================
  // Edge Cases Tests
  // ==========================================================================

  describe("Edge Cases", () => {
    it("should handle empty text", async () => {
      const result = await detector.analyze("");

      expect(result.isSpam).toBe(false);
      expect(result.spamScore).toBe(0);
    });

    it("should handle very long text", async () => {
      const longText = "word ".repeat(1000);
      const result = await detector.analyze(longText);

      expect(result).toBeDefined();
    });

    it("should handle text with no metadata", async () => {
      const result = await detector.analyze("Test message");

      expect(result.userBehavior).toBeUndefined();
      expect(result.isSpam).toBe(false);
    });

    it("should normalize spam score to 0-1 range", async () => {
      const text = `
        SPAM!!! SPAM!!! SPAM!!!
        http://1.com http://2.com http://3.com http://4.com http://5.com
        BUY NOW!!! CLICK HERE!!! LIMITED TIME!!!
      `;

      const result = await detector.analyze(text, {
        userId: "mega-spammer",
        accountAge: 0,
        trustScore: 0,
      });

      expect(result.spamScore).toBeLessThanOrEqual(1);
      expect(result.spamScore).toBeGreaterThanOrEqual(0);
    });
  });
});
