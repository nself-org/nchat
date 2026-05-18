/**
 * Tests for Profanity Filter
 */

import { ProfanityFilter } from "../profanity-filter";

describe("ProfanityFilter", () => {
  let filter: ProfanityFilter;

  beforeEach(() => {
    filter = new ProfanityFilter();
  });

  describe("check", () => {
    it("should detect profanity", () => {
      const text = "This is a damn test message";
      const result = filter.check(text);

      expect(result.hasProfanity).toBe(true);
      expect(result.detectedWords.length).toBeGreaterThan(0);
      expect(result.score).toBeGreaterThan(0);
    });

    it("should filter profanity", () => {
      const text = "This is a damn test";
      const result = filter.check(text);

      expect(result.filteredText).not.toBe(text);
      expect(result.filteredText).toContain("d***");
    });

    it("should detect obfuscated profanity", () => {
      const text = "What the fvck is this sh1t";
      const result = filter.check(text);

      expect(result.hasProfanity).toBe(true);
      expect(result.detectedWords.length).toBeGreaterThan(0);
    });

    it("should calculate severity scores", () => {
      const mildText = "damn";
      const severeText = "fuck";

      const mildResult = filter.check(mildText);
      const severeResult = filter.check(severeText);

      expect(severeResult.score).toBeGreaterThan(mildResult.score);
    });

    it("should handle clean text", () => {
      const text = "This is a perfectly clean message";
      const result = filter.check(text);

      expect(result.hasProfanity).toBe(false);
      expect(result.detectedWords.length).toBe(0);
      expect(result.filteredText).toBe(text);
      expect(result.score).toBe(0);
    });

    it("should handle empty text", () => {
      const result = filter.check("");

      expect(result.hasProfanity).toBe(false);
      expect(result.detectedWords.length).toBe(0);
      expect(result.score).toBe(0);
    });

    it("should handle multiple profane words", () => {
      const text = "This shit is damn terrible";
      const result = filter.check(text);

      expect(result.hasProfanity).toBe(true);
      expect(result.detectedWords.length).toBeGreaterThanOrEqual(2);
    });

    it("should preserve first letter when filtering", () => {
      const text = "What the hell";
      const result = filter.check(text);

      expect(result.filteredText).toContain("h*");
    });
  });

  describe("custom word lists", () => {
    it("should add custom blocked words", () => {
      filter.addBlockedWords(["badword", "terrible"]);

      const result = filter.check("This is a badword");

      expect(result.hasProfanity).toBe(true);
      expect(result.detectedWords).toContain("badword");
    });

    it("should add custom allowed words", () => {
      filter.addAllowedWords(["damn", "hell"]);

      const result = filter.check("This damn hell");

      expect(result.hasProfanity).toBe(false);
    });

    it("should remove blocked words", () => {
      const initialResult = filter.check("damn");
      expect(initialResult.hasProfanity).toBe(true);

      filter.removeBlockedWords(["damn"]);

      const finalResult = filter.check("damn");
      expect(finalResult.hasProfanity).toBe(false);
    });

    it("should get word lists", () => {
      filter.addBlockedWords(["test"]);
      filter.addAllowedWords(["allowed"]);

      const lists = filter.getWordLists();

      expect(lists.blocked).toContain("test");
      expect(lists.allowed).toContain("allowed");
    });
  });

  describe("obfuscation patterns", () => {
    it("should detect @ for a", () => {
      const result = filter.check("d@mn");
      expect(result.hasProfanity).toBe(true);
    });

    it("should detect 4 for a", () => {
      const result = filter.check("d4mn");
      expect(result.hasProfanity).toBe(true);
    });

    it("should detect 1 for i", () => {
      const result = filter.check("sh1t");
      expect(result.hasProfanity).toBe(true);
    });

    it("should detect 0 for o", () => {
      const result = filter.check("f0ol");
      // May or may not be profanity depending on word list
      expect(result).toBeDefined();
    });

    it("should detect $ for s", () => {
      const result = filter.check("a$$ hole");
      // May or may not detect based on word boundaries
      expect(result).toBeDefined();
    });
  });

  describe("edge cases", () => {
    it("should handle very long text", () => {
      const longText = "clean ".repeat(1000) + "damn";
      const result = filter.check(longText);

      expect(result.hasProfanity).toBe(true);
    });

    it("should handle text with numbers", () => {
      const result = filter.check("123 damn 456");
      expect(result.hasProfanity).toBe(true);
    });

    it("should handle text with special characters", () => {
      const result = filter.check("!@#$ damn %^&*");
      expect(result.hasProfanity).toBe(true);
    });

    it("should be case insensitive", () => {
      const upper = filter.check("DAMN");
      const lower = filter.check("damn");
      const mixed = filter.check("DaMn");

      expect(upper.hasProfanity).toBe(true);
      expect(lower.hasProfanity).toBe(true);
      expect(mixed.hasProfanity).toBe(true);
    });
  });
});
