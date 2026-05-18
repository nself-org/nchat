/**
 * Tests for AI Detector
 */

import { AIDetector } from "../ai-detector";

describe("AIDetector", () => {
  let detector: AIDetector;

  beforeEach(() => {
    detector = new AIDetector();
  });

  afterEach(() => {
    detector.dispose();
  });

  describe("detectToxicity", () => {
    it("should detect toxic content", async () => {
      const text = "You are an idiot and stupid";
      const result = await detector.detectToxicity(text);

      expect(result.toxicScore).toBeGreaterThan(0);
      expect(result.detectedLabels.length).toBeGreaterThan(0);
    });

    it("should not flag clean content", async () => {
      const text = "This is a nice message with friendly content";
      const result = await detector.detectToxicity(text);

      expect(result.toxicScore).toBeLessThan(0.5);
      expect(result.isToxic).toBe(false);
    });

    it("should handle empty text", async () => {
      const result = await detector.detectToxicity("");

      expect(result.toxicScore).toBe(0);
      expect(result.isToxic).toBe(false);
      expect(result.detectedLabels.length).toBe(0);
    });

    it("should detect identity attacks", async () => {
      const text = "racist and hateful content";
      const result = await detector.detectToxicity(text);

      expect(result.categories).toHaveProperty("identity_attack");
    });

    it("should detect insults", async () => {
      const text = "you are a moron and a loser";
      const result = await detector.detectToxicity(text);

      expect(result.detectedLabels).toContain("insult");
    });

    it("should detect threats", async () => {
      const text = "I will destroy you and hurt you";
      const result = await detector.detectToxicity(text);

      expect(result.detectedLabels).toContain("threat");
    });
  });

  describe("detectSpam", () => {
    it("should detect excessive capitalization", async () => {
      const text = "THIS IS ALL CAPS SPAM MESSAGE";
      const result = await detector.detectSpam(text);

      expect(result.spamScore).toBeGreaterThan(0);
      expect(result.reasons).toContain("Excessive capitalization");
    });

    it("should detect repetitive characters", async () => {
      const text = "Hellooooooo there!!!!!!";
      const result = await detector.detectSpam(text);

      expect(result.spamScore).toBeGreaterThan(0);
      expect(result.reasons).toContain("Repetitive characters");
    });

    it("should detect excessive punctuation", async () => {
      const text = "What???!!!! Really???!!!!";
      const result = await detector.detectSpam(text);

      expect(result.spamScore).toBeGreaterThan(0);
      expect(result.reasons).toContain("Excessive punctuation");
    });

    it("should detect shortened URLs", async () => {
      const text = "Check this out bit.ly/scam";
      const result = await detector.detectSpam(text, { hasLinks: true });

      expect(result.spamScore).toBeGreaterThan(0);
      expect(result.reasons).toContain("Shortened URLs");
    });

    it("should detect high message frequency", async () => {
      const result = await detector.detectSpam("message", {
        messageCount: 20,
        timeWindow: 60, // 20 messages in 60 seconds
      });

      expect(result.spamScore).toBeGreaterThan(0);
      expect(result.reasons).toContain("High message frequency");
    });

    it("should detect spam phrases", async () => {
      const text = "Click here for free money! Act now!";
      const result = await detector.detectSpam(text);

      expect(result.isSpam).toBe(true);
      expect(result.reasons).toContain("Spam phrases detected");
    });

    it("should not flag normal messages", async () => {
      const text = "Hey, how are you doing today?";
      const result = await detector.detectSpam(text);

      expect(result.isSpam).toBe(false);
      expect(result.spamScore).toBeLessThan(0.5);
    });
  });

  describe("detectNSFW", () => {
    it("should handle NSFW detection placeholder", async () => {
      const imageUrl = "https://example.com/image.jpg";
      const result = await detector.detectNSFW(imageUrl);

      // Placeholder implementation returns clean result
      expect(result.isNSFW).toBe(false);
      expect(result.nsfwScore).toBe(0);
    });
  });

  describe("initialization", () => {
    it("should initialize models", async () => {
      await detector.initialize();
      // Should not throw
      expect(true).toBe(true);
    });

    it("should handle multiple initialization calls", async () => {
      await detector.initialize();
      await detector.initialize();
      // Should not throw
      expect(true).toBe(true);
    });
  });

  describe("cleanup", () => {
    it("should dispose resources", () => {
      detector.dispose();
      // Should not throw
      expect(true).toBe(true);
    });
  });
});
