/**
 * Intent Matcher Tests
 *
 * Tests for intent detection, sentiment analysis, and pattern matching.
 * Note: Entity extraction has limitations due to message normalization
 * which removes some punctuation (colons, dots, etc.)
 *
 * @module lib/chatbot/__tests__/intent-matcher.test
 */

import {
  IntentMatcher,
  createIntentMatcher,
  resetIntentMatcher,
  DEFAULT_INTENT_PATTERNS,
} from "../intent-matcher";

describe("IntentMatcher", () => {
  let matcher: IntentMatcher;

  beforeEach(() => {
    resetIntentMatcher();
    matcher = createIntentMatcher();
  });

  // ==========================================================================
  // GREETING INTENT TESTS
  // ==========================================================================

  describe("Greeting Intent", () => {
    it("should detect simple greetings", () => {
      const messages = ["Hi", "Hello", "Hey", "Hi there", "Hello!"];

      for (const msg of messages) {
        const result = matcher.detectIntent(msg);
        expect(result.intent).toBe("greeting");
        expect(result.confidence).toBeGreaterThan(0.5);
      }
    });

    it("should detect time-based greetings", () => {
      const messages = ["Good morning", "Good afternoon", "Good evening"];

      for (const msg of messages) {
        const result = matcher.detectIntent(msg);
        expect(result.intent).toBe("greeting");
      }
    });

    it("should not mark greetings as human request", () => {
      const result = matcher.detectIntent("Hello");
      expect(result.requestsHuman).toBe(false);
    });
  });

  // ==========================================================================
  // FAREWELL INTENT TESTS
  // ==========================================================================

  describe("Farewell Intent", () => {
    it("should detect farewell messages", () => {
      const messages = ["Bye", "Goodbye", "Later", "Cya"];

      for (const msg of messages) {
        const result = matcher.detectIntent(msg);
        expect(result.intent).toBe("farewell");
      }
    });

    it("should detect have a nice day", () => {
      const result = matcher.detectIntent("Have a nice day");
      expect(result.intent).toBe("farewell");
    });
  });

  // ==========================================================================
  // THANKS INTENT TESTS
  // ==========================================================================

  describe("Thanks Intent", () => {
    it("should detect thank you messages", () => {
      const messages = [
        "Thanks",
        "Thank you",
        "Thanks a lot",
        "Appreciate it",
        "Thx",
      ];

      for (const msg of messages) {
        const result = matcher.detectIntent(msg);
        expect(result.intent).toBe("thanks");
      }
    });

    it("should detect elaborate thanks", () => {
      const result = matcher.detectIntent("Thank you so much for your help!");
      expect(result.intent).toBe("thanks");
    });
  });

  // ==========================================================================
  // HUMAN REQUEST INTENT TESTS
  // ==========================================================================

  describe("Human Request Intent", () => {
    it("should detect explicit human requests", () => {
      const messages = [
        "I want to talk to a human",
        "Connect me to an agent",
        "Transfer me to a person",
        "I need to speak with someone",
      ];

      for (const msg of messages) {
        const result = matcher.detectIntent(msg);
        expect(result.intent).toBe("human");
        expect(result.requestsHuman).toBe(true);
      }
    });

    it("should set requestsHuman flag correctly", () => {
      const result = matcher.detectIntent("Please transfer me to an operator");
      expect(result.requestsHuman).toBe(true);
    });
  });

  // ==========================================================================
  // HELP INTENT TESTS
  // ==========================================================================

  describe("Help Intent", () => {
    it("should detect help requests", () => {
      const messages = ["I need help", "Can you help me?", "I have a question"];

      for (const msg of messages) {
        const result = matcher.detectIntent(msg);
        expect(["help", "faq"]).toContain(result.intent);
      }
    });
  });

  // ==========================================================================
  // FAQ INTENT TESTS
  // ==========================================================================

  describe("FAQ Intent", () => {
    it("should detect questions ending with ?", () => {
      const result = matcher.detectIntent("Can I get a discount?");
      expect(["faq", "help"]).toContain(result.intent);
    });

    it("should detect what questions", () => {
      const result = matcher.detectIntent("What is your refund policy?");
      expect(["faq", "help"]).toContain(result.intent);
    });
  });

  // ==========================================================================
  // COMPLAINT INTENT TESTS
  // ==========================================================================

  describe("Complaint Intent", () => {
    it("should detect explicit complaint keywords", () => {
      const result = matcher.detectIntent("I have a complaint about this");
      expect(result.intent).toBe("complaint");
    });

    it("should detect frustration expressions", () => {
      const result = matcher.detectIntent("I am frustrated with this service");
      expect(result.intent).toBe("complaint");
    });

    it("should detect unacceptable messages", () => {
      const result = matcher.detectIntent("This is unacceptable");
      expect(result.intent).toBe("complaint");
    });

    it("should detect negative sentiment in complaints", () => {
      const result = matcher.detectIntent("This is terrible and awful service");
      expect(result.sentiment).toBeLessThan(0);
    });
  });

  // ==========================================================================
  // CONFIRM/CANCEL INTENT TESTS
  // ==========================================================================

  describe("Confirm Intent", () => {
    it("should detect confirmation messages", () => {
      const messages = ["Yes", "Yeah", "Sure", "OK", "Absolutely"];

      for (const msg of messages) {
        const result = matcher.detectIntent(msg);
        expect(result.intent).toBe("confirm");
      }
    });
  });

  describe("Cancel Intent", () => {
    it("should detect cancellation messages", () => {
      const messages = ["No", "Nope", "Cancel", "Never mind", "Stop"];

      for (const msg of messages) {
        const result = matcher.detectIntent(msg);
        expect(result.intent).toBe("cancel");
      }
    });
  });

  // ==========================================================================
  // SENTIMENT ANALYSIS TESTS
  // ==========================================================================

  describe("Sentiment Analysis", () => {
    it("should detect positive sentiment", () => {
      const result = matcher.detectIntent("This is great! I love it!");
      expect(result.sentiment).toBeGreaterThan(0);
    });

    it("should detect negative sentiment", () => {
      const result = matcher.detectIntent("This is terrible and awful");
      expect(result.sentiment).toBeLessThan(0);
    });

    it("should detect neutral sentiment", () => {
      const result = matcher.detectIntent("The product is blue");
      expect(result.sentiment).toBe(0);
    });

    it("should handle negation", () => {
      const result = matcher.detectIntent("This is not good");
      expect(result.sentiment).toBeLessThan(0);
    });

    it("should return score between -1 and 1", () => {
      const positive = matcher.analyzeSentiment(
        "Amazing wonderful fantastic incredible superb",
      );
      const negative = matcher.analyzeSentiment(
        "Terrible awful horrible bad worst",
      );

      expect(positive).toBeLessThanOrEqual(1);
      expect(positive).toBeGreaterThan(0);
      expect(negative).toBeGreaterThanOrEqual(-1);
      expect(negative).toBeLessThan(0);
    });
  });

  // ==========================================================================
  // ENTITY EXTRACTION TESTS (with normalization limitations)
  // ==========================================================================

  describe("Entity Extraction", () => {
    // Note: Due to message normalization, some entities may not be extracted
    // The normalization removes : @ . and other punctuation

    it("should extract phone numbers from digits", () => {
      const result = matcher.detectIntent("Call me at 5551234567");
      // Phone extraction looks for 10+ digit sequences
      expect(result.entities?.phone).toBeDefined();
    });

    it("should handle entity extraction on normalized text", () => {
      // Most punctuation-dependent entities will not be extracted
      // due to normalization - this test documents that behavior
      const result = matcher.detectIntent("Some random text here");
      // No special entities in plain text
      expect(result.entities).toBeUndefined();
    });
  });

  // ==========================================================================
  // CONFIDENCE SCORING TESTS
  // ==========================================================================

  describe("Confidence Scoring", () => {
    it("should have higher confidence for exact matches", () => {
      const exact = matcher.detectIntent("Hello");
      const partial = matcher.detectIntent("Hello how are you doing today?");

      expect(exact.confidence).toBeGreaterThanOrEqual(partial.confidence);
    });

    it("should provide alternative intents", () => {
      const result = matcher.detectIntent("Thank you, goodbye!");
      expect(result.alternatives).toBeDefined();
      expect(result.alternatives!.length).toBeGreaterThan(0);
    });

    it("should not exceed 1.0 confidence", () => {
      const result = matcher.detectIntent("Hi there! Hello! Hey!");
      expect(result.confidence).toBeLessThanOrEqual(1);
    });
  });

  // ==========================================================================
  // PATTERN MANAGEMENT TESTS
  // ==========================================================================

  describe("Pattern Management", () => {
    it("should add custom patterns", () => {
      matcher.addPattern({
        id: "custom-test",
        intent: "faq",
        patterns: ["^custom trigger$"],
        keywords: ["custom", "trigger"],
        examples: ["custom trigger"],
        priority: 20,
        isActive: true,
      });

      const result = matcher.detectIntent("custom trigger");
      expect(result.intent).toBe("faq");
    });

    it("should update existing patterns", () => {
      const updated = matcher.updatePattern("greeting", {
        keywords: ["hi", "hello", "bonjour"],
      });

      expect(updated).toBe(true);

      const patterns = matcher.getPatterns();
      const greeting = patterns.find((p) => p.id === "greeting");
      expect(greeting?.keywords).toContain("bonjour");
    });

    it("should remove patterns", () => {
      matcher.addPattern({
        id: "to-remove",
        intent: "faq",
        patterns: ["^remove me$"],
        keywords: ["remove"],
        examples: [],
        priority: 1,
        isActive: true,
      });

      const removed = matcher.removePattern("to-remove");
      expect(removed).toBe(true);

      const patterns = matcher.getPatterns();
      expect(patterns.find((p) => p.id === "to-remove")).toBeUndefined();
    });

    it("should return false for non-existent pattern updates", () => {
      const result = matcher.updatePattern("non-existent", {
        keywords: ["test"],
      });
      expect(result).toBe(false);
    });
  });

  // ==========================================================================
  // HELPER FUNCTION TESTS
  // ==========================================================================

  describe("Helper Functions", () => {
    describe("isQuestion", () => {
      it("should identify questions", () => {
        expect(matcher.isQuestion("What is this?")).toBe(true);
        expect(matcher.isQuestion("How do I do that?")).toBe(true);
        expect(matcher.isQuestion("Can you help me?")).toBe(true);
      });

      it("should not identify statements as questions", () => {
        expect(matcher.isQuestion("I need help")).toBe(false);
        expect(matcher.isQuestion("This is a statement")).toBe(false);
      });
    });

    describe("extractTopic", () => {
      it("should extract topic from about phrases", () => {
        const topic = matcher.extractTopic("I have a question about billing");
        expect(topic).toContain("billing");
      });

      it("should extract topic from problem phrases", () => {
        const topic = matcher.extractTopic("I have a problem with my order");
        expect(topic).toContain("order");
      });

      it("should return null for no clear topic", () => {
        const topic = matcher.extractTopic("Hello there");
        expect(topic).toBeNull();
      });
    });

    describe("detectHumanRequest", () => {
      it("should detect human requests", () => {
        expect(matcher.detectHumanRequest("talk to human")).toBe(true);
        expect(matcher.detectHumanRequest("connect me to agent")).toBe(true);
        expect(matcher.detectHumanRequest("transfer me")).toBe(true);
        expect(matcher.detectHumanRequest("real person please")).toBe(true);
      });

      it("should not falsely detect human requests", () => {
        expect(matcher.detectHumanRequest("hello")).toBe(false);
        expect(matcher.detectHumanRequest("I need help")).toBe(false);
      });
    });
  });

  // ==========================================================================
  // NORMALIZATION TESTS
  // ==========================================================================

  describe("Message Normalization", () => {
    it("should handle case insensitivity", () => {
      const lower = matcher.detectIntent("hello");
      const upper = matcher.detectIntent("HELLO");
      const mixed = matcher.detectIntent("HeLLo");

      expect(lower.intent).toBe(upper.intent);
      expect(upper.intent).toBe(mixed.intent);
    });

    it("should handle extra whitespace", () => {
      const result = matcher.detectIntent("  hello   there  ");
      expect(result.intent).toBe("greeting");
    });

    it("should handle punctuation", () => {
      const result = matcher.detectIntent("Hello!!!");
      expect(result.intent).toBe("greeting");
    });
  });

  // ==========================================================================
  // DEFAULT PATTERNS TESTS
  // ==========================================================================

  describe("Default Patterns", () => {
    it("should have all required intent patterns", () => {
      const requiredIntents = [
        "greeting",
        "farewell",
        "thanks",
        "help",
        "human",
        "complaint",
        "feedback",
        "confirm",
        "cancel",
        "faq",
      ];

      const patterns = DEFAULT_INTENT_PATTERNS;
      const patternIntents = patterns.map((p) => p.intent);

      for (const intent of requiredIntents) {
        expect(patternIntents).toContain(intent);
      }
    });

    it("should have examples for each pattern", () => {
      for (const pattern of DEFAULT_INTENT_PATTERNS) {
        expect(pattern.examples.length).toBeGreaterThan(0);
      }
    });
  });
});
