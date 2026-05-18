/**
 * Search Indexer Unit Tests
 *
 * Tests for the search indexer including document indexing, text processing,
 * search functionality, and import/export.
 */

import {
  SearchIndexer,
  tokenizeText,
  removeStopWords,
  stem,
  processText,
  getSearchIndexer,
  createSearchIndexer,
  createMessageDocument,
  createChannelDocument,
  createUserDocument,
  type Document,
  type MessageDocument,
  type ChannelDocument,
  type UserDocument,
  type IndexerConfig,
} from "../search-indexer";

// ============================================================================
// Test Helpers
// ============================================================================

const createTestMessageDoc = (
  overrides?: Partial<MessageDocument>,
): MessageDocument => ({
  id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
  type: "message",
  content: "This is a test message content",
  fields: {
    channelId: "channel-1",
    channelName: "general",
    authorId: "user-1",
    authorName: "John Doe",
    threadId: null,
    isPinned: false,
    isStarred: false,
    hasAttachments: false,
    hasLinks: false,
    hasMentions: false,
    hasCode: false,
  },
  timestamp: new Date(),
  ...overrides,
});

const createTestChannelDoc = (
  overrides?: Partial<ChannelDocument>,
): ChannelDocument => ({
  id: `channel-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
  type: "channel",
  content: "General Discussion",
  fields: {
    slug: "general",
    description: "General discussion channel",
    channelType: "public",
    memberCount: 10,
    createdBy: "user-1",
    isArchived: false,
  },
  timestamp: new Date(),
  ...overrides,
});

const createTestUserDoc = (
  overrides?: Partial<UserDocument>,
): UserDocument => ({
  id: `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
  type: "user",
  content: "John Doe johndoe john@example.com",
  fields: {
    username: "johndoe",
    email: "john@example.com",
    displayName: "John Doe",
    role: "member",
    isActive: true,
  },
  timestamp: new Date(),
  ...overrides,
});

// ============================================================================
// Text Processing Tests
// ============================================================================

describe("Text Processing", () => {
  describe("tokenizeText", () => {
    it("should split text into words", () => {
      expect(tokenizeText("hello world")).toEqual(["hello", "world"]);
    });

    it("should handle multiple spaces", () => {
      expect(tokenizeText("hello   world")).toEqual(["hello", "world"]);
    });

    it("should remove punctuation", () => {
      expect(tokenizeText("hello, world!")).toEqual(["hello", "world"]);
    });

    it("should convert to lowercase", () => {
      expect(tokenizeText("Hello WORLD")).toEqual(["hello", "world"]);
    });

    it("should filter by minimum length", () => {
      expect(tokenizeText("a b cd ef", { minLength: 2 })).toEqual(["cd", "ef"]);
    });

    it("should filter by maximum length", () => {
      const longWord = "a".repeat(60);
      expect(tokenizeText(`hello ${longWord}`, { maxLength: 50 })).toEqual([
        "hello",
      ]);
    });

    it("should handle empty string", () => {
      expect(tokenizeText("")).toEqual([]);
    });

    it("should handle only punctuation", () => {
      expect(tokenizeText("!@#$%")).toEqual([]);
    });

    it("should handle numbers", () => {
      expect(tokenizeText("test123 hello")).toEqual(["test123", "hello"]);
    });
  });

  describe("removeStopWords", () => {
    it("should remove common stop words", () => {
      const stopWords = new Set(["the", "is", "a"]);
      expect(
        removeStopWords(["the", "cat", "is", "a", "pet"], stopWords),
      ).toEqual(["cat", "pet"]);
    });

    it("should handle empty token list", () => {
      expect(removeStopWords([], new Set(["the"]))).toEqual([]);
    });

    it("should handle no stop words", () => {
      expect(removeStopWords(["hello", "world"], new Set())).toEqual([
        "hello",
        "world",
      ]);
    });

    it("should handle all stop words", () => {
      const stopWords = new Set(["the", "is"]);
      expect(removeStopWords(["the", "is"], stopWords)).toEqual([]);
    });
  });

  describe("stem", () => {
    it("should remove -ing suffix", () => {
      // Double consonant is reduced (running -> run)
      expect(stem("running")).toBe("run");
      expect(stem("testing")).toBe("test");
    });

    it("should remove -ed suffix", () => {
      expect(stem("tested")).toBe("test");
      expect(stem("walked")).toBe("walk");
    });

    it("should remove -er suffix", () => {
      expect(stem("tester")).toBe("test");
    });

    it("should remove -s suffix", () => {
      expect(stem("tests")).toBe("test");
    });

    it("should remove -ies suffix", () => {
      expect(stem("studies")).toBe("study");
    });

    it("should not stem short words", () => {
      expect(stem("the")).toBe("the");
      expect(stem("is")).toBe("is");
    });

    it("should not stem already short results", () => {
      expect(stem("as")).toBe("as");
    });
  });

  describe("processText", () => {
    it("should combine tokenization and stop word removal", () => {
      const config: IndexerConfig = {
        stopWords: ["the", "is", "a"],
        stemming: false,
      };
      expect(processText("The cat is a pet", config)).toEqual(["cat", "pet"]);
    });

    it("should apply stemming when enabled", () => {
      const config: IndexerConfig = {
        stopWords: [],
        stemming: true,
      };
      expect(processText("testing tested", config)).toContain("test");
    });

    it("should respect case sensitivity", () => {
      const config: IndexerConfig = {
        caseSensitive: false,
      };
      expect(processText("HELLO World", config)).toEqual(["hello", "world"]);
    });
  });
});

// ============================================================================
// SearchIndexer Tests
// ============================================================================

describe("SearchIndexer", () => {
  let indexer: SearchIndexer;

  beforeEach(() => {
    indexer = new SearchIndexer();
  });

  describe("constructor", () => {
    it("should create with default config", () => {
      expect(indexer).toBeDefined();
      expect(indexer.getStats().documentCount).toBe(0);
    });

    it("should accept custom config", () => {
      const customIndexer = new SearchIndexer({
        minTermLength: 3,
        maxTermLength: 30,
        stemming: false,
      });
      expect(customIndexer).toBeDefined();
    });
  });

  describe("index", () => {
    it("should index a message document", () => {
      const doc = createTestMessageDoc({ id: "msg-1" });
      indexer.index(doc);

      expect(indexer.hasDocument("msg-1")).toBe(true);
      expect(indexer.getStats().documentCount).toBe(1);
    });

    it("should index a channel document", () => {
      const doc = createTestChannelDoc({ id: "channel-1" });
      indexer.index(doc);

      expect(indexer.hasDocument("channel-1")).toBe(true);
    });

    it("should index a user document", () => {
      const doc = createTestUserDoc({ id: "user-1" });
      indexer.index(doc);

      expect(indexer.hasDocument("user-1")).toBe(true);
    });

    it("should update existing document", () => {
      const doc1 = createTestMessageDoc({
        id: "msg-1",
        content: "original content",
      });
      const doc2 = createTestMessageDoc({
        id: "msg-1",
        content: "updated content",
      });

      indexer.index(doc1);
      indexer.index(doc2);

      expect(indexer.getStats().documentCount).toBe(1);
      expect(indexer.getDocument("msg-1")?.content).toBe("updated content");
    });

    it("should update lastUpdated timestamp", () => {
      expect(indexer.getStats().lastUpdated).toBeNull();

      indexer.index(createTestMessageDoc());

      expect(indexer.getStats().lastUpdated).not.toBeNull();
    });
  });

  describe("indexMany", () => {
    it("should index multiple documents", () => {
      const docs = [
        createTestMessageDoc({ id: "msg-1" }),
        createTestMessageDoc({ id: "msg-2" }),
        createTestMessageDoc({ id: "msg-3" }),
      ];

      indexer.indexMany(docs);

      expect(indexer.getStats().documentCount).toBe(3);
    });
  });

  describe("remove", () => {
    it("should remove existing document", () => {
      const doc = createTestMessageDoc({ id: "msg-1" });
      indexer.index(doc);

      const result = indexer.remove("msg-1");

      expect(result).toBe(true);
      expect(indexer.hasDocument("msg-1")).toBe(false);
    });

    it("should return false for non-existing document", () => {
      const result = indexer.remove("non-existent");
      expect(result).toBe(false);
    });

    it("should clean up inverted index", () => {
      const doc = createTestMessageDoc({
        id: "msg-1",
        content: "unique specific term",
      });
      indexer.index(doc);
      indexer.remove("msg-1");

      // The unique term should no longer return results
      const results = indexer.search("unique");
      expect(results).toHaveLength(0);
    });
  });

  describe("update", () => {
    it("should update document", () => {
      const doc = createTestMessageDoc({ id: "msg-1", content: "original" });
      indexer.index(doc);

      const updated = { ...doc, content: "updated" };
      indexer.update(updated);

      expect(indexer.getDocument("msg-1")?.content).toBe("updated");
    });
  });

  describe("search", () => {
    beforeEach(() => {
      indexer.index(
        createTestMessageDoc({
          id: "msg-1",
          content: "Hello world from the test message",
        }),
      );
      indexer.index(
        createTestMessageDoc({
          id: "msg-2",
          content: "Another message about testing",
        }),
      );
      indexer.index(
        createTestChannelDoc({
          id: "channel-1",
          content: "General Discussion Channel",
        }),
      );
      indexer.index(
        createTestUserDoc({
          id: "user-1",
          content: "John Doe Developer",
        }),
      );
    });

    it("should find documents matching query", () => {
      const results = indexer.search("message");
      expect(results.length).toBeGreaterThan(0);
    });

    it("should return empty array for no matches", () => {
      const results = indexer.search("nonexistentterm12345");
      expect(results).toHaveLength(0);
    });

    it("should return empty array for empty query", () => {
      const results = indexer.search("");
      expect(results).toHaveLength(0);
    });

    it("should rank results by relevance", () => {
      const results = indexer.search("test");
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].score).toBeGreaterThanOrEqual(
        results[results.length - 1].score,
      );
    });

    it("should include matched terms", () => {
      const results = indexer.search("message");
      expect(results[0].matchedTerms.length).toBeGreaterThan(0);
    });

    it("should filter by type", () => {
      const results = indexer.search("general", { type: "channel" });
      expect(results.every((r) => r.document.type === "channel")).toBe(true);
    });

    it("should respect limit option", () => {
      const results = indexer.search("message", { limit: 1 });
      expect(results.length).toBeLessThanOrEqual(1);
    });

    it("should apply filters", () => {
      indexer.index(
        createTestMessageDoc({
          id: "msg-pinned",
          content: "Important pinned message",
          fields: {
            channelId: "channel-1",
            channelName: "general",
            authorId: "user-1",
            authorName: "John",
            threadId: null,
            isPinned: true,
            isStarred: false,
            hasAttachments: false,
            hasLinks: false,
            hasMentions: false,
            hasCode: false,
          },
        }),
      );

      const results = indexer.search("message", {
        filters: { isPinned: true },
      });

      expect(
        results.every(
          (r) => (r.document.fields as { isPinned: boolean }).isPinned,
        ),
      ).toBe(true);
    });
  });

  describe("searchMessages", () => {
    it("should only search messages", () => {
      indexer.index(
        createTestMessageDoc({ id: "msg-1", content: "test message" }),
      );
      indexer.index(
        createTestChannelDoc({ id: "channel-1", content: "test channel" }),
      );

      const results = indexer.searchMessages("test");
      expect(results.every((r) => r.document.type === "message")).toBe(true);
    });
  });

  describe("searchChannels", () => {
    it("should only search channels", () => {
      indexer.index(
        createTestMessageDoc({ id: "msg-1", content: "test message" }),
      );
      indexer.index(
        createTestChannelDoc({ id: "channel-1", content: "test channel" }),
      );

      const results = indexer.searchChannels("test");
      expect(results.every((r) => r.document.type === "channel")).toBe(true);
    });
  });

  describe("searchUsers", () => {
    it("should only search users", () => {
      indexer.index(
        createTestMessageDoc({ id: "msg-1", content: "test message" }),
      );
      indexer.index(createTestUserDoc({ id: "user-1", content: "test user" }));

      const results = indexer.searchUsers("test");
      expect(results.every((r) => r.document.type === "user")).toBe(true);
    });
  });

  describe("getDocument", () => {
    it("should return document by ID", () => {
      const doc = createTestMessageDoc({ id: "msg-1" });
      indexer.index(doc);

      const result = indexer.getDocument("msg-1");
      expect(result).toBeDefined();
      expect(result?.id).toBe("msg-1");
    });

    it("should return undefined for non-existing document", () => {
      const result = indexer.getDocument("non-existent");
      expect(result).toBeUndefined();
    });
  });

  describe("hasDocument", () => {
    it("should return true for existing document", () => {
      indexer.index(createTestMessageDoc({ id: "msg-1" }));
      expect(indexer.hasDocument("msg-1")).toBe(true);
    });

    it("should return false for non-existing document", () => {
      expect(indexer.hasDocument("non-existent")).toBe(false);
    });
  });

  describe("getDocumentsByType", () => {
    it("should return all documents of type", () => {
      indexer.index(createTestMessageDoc({ id: "msg-1" }));
      indexer.index(createTestMessageDoc({ id: "msg-2" }));
      indexer.index(createTestChannelDoc({ id: "channel-1" }));

      const messages = indexer.getDocumentsByType("message");
      expect(messages).toHaveLength(2);
      expect(messages.every((d) => d.type === "message")).toBe(true);
    });

    it("should return empty array for no documents", () => {
      const users = indexer.getDocumentsByType("user");
      expect(users).toHaveLength(0);
    });
  });

  describe("getStats", () => {
    it("should return correct document count", () => {
      indexer.index(createTestMessageDoc({ id: "msg-1" }));
      indexer.index(createTestMessageDoc({ id: "msg-2" }));

      expect(indexer.getStats().documentCount).toBe(2);
    });

    it("should return document counts by type", () => {
      indexer.index(createTestMessageDoc({ id: "msg-1" }));
      indexer.index(createTestMessageDoc({ id: "msg-2" }));
      indexer.index(createTestChannelDoc({ id: "channel-1" }));

      const stats = indexer.getStats();
      expect(stats.documentsByType.message).toBe(2);
      expect(stats.documentsByType.channel).toBe(1);
      expect(stats.documentsByType.user).toBe(0);
    });

    it("should track term count", () => {
      indexer.index(createTestMessageDoc({ content: "hello world" }));
      expect(indexer.getStats().termCount).toBeGreaterThan(0);
    });

    it("should estimate index size", () => {
      indexer.index(createTestMessageDoc({ content: "hello world" }));
      expect(indexer.getStats().indexSize).toBeGreaterThan(0);
    });
  });

  describe("clear", () => {
    it("should remove all documents", () => {
      indexer.index(createTestMessageDoc({ id: "msg-1" }));
      indexer.index(createTestMessageDoc({ id: "msg-2" }));

      indexer.clear();

      expect(indexer.getStats().documentCount).toBe(0);
      expect(indexer.getStats().termCount).toBe(0);
    });

    it("should reset lastUpdated", () => {
      indexer.index(createTestMessageDoc());
      indexer.clear();

      expect(indexer.getStats().lastUpdated).toBeNull();
    });
  });

  describe("export/import", () => {
    it("should export index data", () => {
      indexer.index(
        createTestMessageDoc({ id: "msg-1", content: "hello world" }),
      );

      const data = indexer.export();

      expect(data.documents).toHaveLength(1);
      expect(Object.keys(data.index).length).toBeGreaterThan(0);
    });

    it("should import index data", () => {
      indexer.index(
        createTestMessageDoc({ id: "msg-1", content: "hello world" }),
      );
      const data = indexer.export();

      const newIndexer = new SearchIndexer();
      newIndexer.import(data);

      expect(newIndexer.hasDocument("msg-1")).toBe(true);
      expect(newIndexer.search("hello").length).toBeGreaterThan(0);
    });

    it("should clear existing data on import", () => {
      indexer.index(createTestMessageDoc({ id: "msg-1" }));
      indexer.index(createTestMessageDoc({ id: "msg-2" }));

      const newData = {
        documents: [createTestMessageDoc({ id: "msg-3" })],
        index: {},
        lastUpdated: null,
      };

      indexer.import(newData);

      expect(indexer.hasDocument("msg-1")).toBe(false);
      expect(indexer.hasDocument("msg-3")).toBe(true);
    });

    it("should preserve lastUpdated", () => {
      const timestamp = "2024-01-15T12:00:00.000Z";
      const data = {
        documents: [],
        index: {},
        lastUpdated: timestamp,
      };

      indexer.import(data);

      expect(indexer.getStats().lastUpdated?.toISOString()).toBe(timestamp);
    });
  });
});

// ============================================================================
// Scoring Tests
// ============================================================================

describe("Search Scoring", () => {
  let indexer: SearchIndexer;

  beforeEach(() => {
    indexer = new SearchIndexer();
  });

  it("should score documents with more term occurrences higher", () => {
    indexer.index(
      createTestMessageDoc({
        id: "msg-1",
        content: "test",
      }),
    );
    indexer.index(
      createTestMessageDoc({
        id: "msg-2",
        content: "test test test",
      }),
    );

    const results = indexer.search("test");

    const msg1 = results.find((r) => r.document.id === "msg-1");
    const msg2 = results.find((r) => r.document.id === "msg-2");

    expect(msg2?.score).toBeGreaterThan(msg1?.score ?? 0);
  });

  it("should boost pinned messages", () => {
    indexer.index(
      createTestMessageDoc({
        id: "msg-normal",
        content: "test message",
        fields: {
          channelId: "channel-1",
          channelName: "general",
          authorId: "user-1",
          authorName: "John",
          threadId: null,
          isPinned: false,
          isStarred: false,
          hasAttachments: false,
          hasLinks: false,
          hasMentions: false,
          hasCode: false,
        },
      }),
    );
    indexer.index(
      createTestMessageDoc({
        id: "msg-pinned",
        content: "test message",
        fields: {
          channelId: "channel-1",
          channelName: "general",
          authorId: "user-1",
          authorName: "John",
          threadId: null,
          isPinned: true,
          isStarred: false,
          hasAttachments: false,
          hasLinks: false,
          hasMentions: false,
          hasCode: false,
        },
      }),
    );

    const results = indexer.search("test");
    const normalMsg = results.find((r) => r.document.id === "msg-normal");
    const pinnedMsg = results.find((r) => r.document.id === "msg-pinned");

    expect(pinnedMsg?.score).toBeGreaterThan(normalMsg?.score ?? 0);
  });
});

// ============================================================================
// Factory Functions Tests
// ============================================================================

describe("Factory Functions", () => {
  describe("getSearchIndexer", () => {
    it("should return singleton instance", () => {
      const indexer1 = getSearchIndexer();
      const indexer2 = getSearchIndexer();
      expect(indexer1).toBe(indexer2);
    });
  });

  describe("createSearchIndexer", () => {
    it("should create new instance each time", () => {
      const indexer1 = createSearchIndexer();
      const indexer2 = createSearchIndexer();
      expect(indexer1).not.toBe(indexer2);
    });

    it("should accept config", () => {
      const indexer = createSearchIndexer({ stemming: false });
      expect(indexer).toBeDefined();
    });
  });
});

// ============================================================================
// Document Builders Tests
// ============================================================================

describe("Document Builders", () => {
  describe("createMessageDocument", () => {
    it("should create message document", () => {
      const doc = createMessageDocument("msg-1", "Hello world", {
        channelId: "channel-1",
        channelName: "general",
        authorId: "user-1",
        authorName: "John",
        threadId: null,
        isPinned: false,
        isStarred: false,
        hasAttachments: false,
        hasLinks: false,
        hasMentions: false,
        hasCode: false,
      });

      expect(doc.id).toBe("msg-1");
      expect(doc.type).toBe("message");
      expect(doc.content).toBe("Hello world");
      expect(doc.timestamp).toBeDefined();
    });

    it("should accept custom timestamp", () => {
      const timestamp = new Date("2024-01-15");
      const doc = createMessageDocument(
        "msg-1",
        "Hello",
        {
          channelId: "channel-1",
          channelName: "general",
          authorId: "user-1",
          authorName: "John",
          threadId: null,
          isPinned: false,
          isStarred: false,
          hasAttachments: false,
          hasLinks: false,
          hasMentions: false,
          hasCode: false,
        },
        timestamp,
      );

      expect(doc.timestamp).toEqual(timestamp);
    });
  });

  describe("createChannelDocument", () => {
    it("should create channel document", () => {
      const doc = createChannelDocument("channel-1", "General", {
        slug: "general",
        description: "General discussion",
        channelType: "public",
        memberCount: 10,
        createdBy: "user-1",
        isArchived: false,
      });

      expect(doc.id).toBe("channel-1");
      expect(doc.type).toBe("channel");
      expect(doc.content).toBe("General");
    });
  });

  describe("createUserDocument", () => {
    it("should create user document", () => {
      const doc = createUserDocument("user-1", "John Doe", {
        username: "johndoe",
        email: "john@example.com",
        displayName: "John Doe",
        role: "member",
        isActive: true,
      });

      expect(doc.id).toBe("user-1");
      expect(doc.type).toBe("user");
      expect(doc.content).toBe("John Doe");
    });
  });
});
