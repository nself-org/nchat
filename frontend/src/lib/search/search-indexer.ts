/**
 * Search Indexer
 *
 * Provides local search indexing for messages, channels, and users.
 * Uses in-memory indexing with inverted index structure for fast search.
 */

// ============================================================================
// Types
// ============================================================================

export type IndexableType = "message" | "channel" | "user";

export interface IndexableDocument {
  id: string;
  type: IndexableType;
  content: string;
  fields: Record<string, string | number | boolean | Date | null>;
  timestamp: Date;
}

export interface MessageDocument extends IndexableDocument {
  type: "message";
  fields: {
    channelId: string;
    channelName: string;
    authorId: string;
    authorName: string;
    threadId: string | null;
    isPinned: boolean;
    isStarred: boolean;
    hasAttachments: boolean;
    hasLinks: boolean;
    hasMentions: boolean;
    hasCode: boolean;
  };
}

export interface ChannelDocument extends IndexableDocument {
  type: "channel";
  fields: {
    slug: string;
    description: string | null;
    channelType: "public" | "private" | "direct";
    memberCount: number;
    createdBy: string;
    isArchived: boolean;
  };
}

export interface UserDocument extends IndexableDocument {
  type: "user";
  fields: {
    username: string;
    email: string | null;
    displayName: string;
    role: string;
    isActive: boolean;
  };
}

export type Document = MessageDocument | ChannelDocument | UserDocument;

export interface IndexEntry {
  docId: string;
  positions: number[];
  frequency: number;
  boost: number;
}

export interface SearchMatch {
  document: Document;
  score: number;
  matchedTerms: string[];
  positions: Map<string, number[]>;
}

export interface IndexStats {
  documentCount: number;
  termCount: number;
  indexSize: number;
  lastUpdated: Date | null;
  documentsByType: Record<IndexableType, number>;
}

export interface IndexerConfig {
  minTermLength?: number;
  maxTermLength?: number;
  stopWords?: string[];
  stemming?: boolean;
  caseSensitive?: boolean;
  boostFields?: Record<string, number>;
}

// ============================================================================
// Constants
// ============================================================================

const DEFAULT_STOP_WORDS = new Set([
  "a",
  "an",
  "and",
  "are",
  "as",
  "at",
  "be",
  "by",
  "for",
  "from",
  "has",
  "he",
  "in",
  "is",
  "it",
  "its",
  "of",
  "on",
  "or",
  "that",
  "the",
  "to",
  "was",
  "were",
  "will",
  "with",
]);

const DEFAULT_BOOST_FIELDS: Record<string, number> = {
  title: 2.0,
  name: 1.5,
  username: 1.5,
  displayName: 1.5,
  content: 1.0,
  description: 0.8,
};

// ============================================================================
// Text Processing
// ============================================================================

/**
 * Tokenizes text into terms
 */
export function tokenizeText(
  text: string,
  options?: { minLength?: number; maxLength?: number },
): string[] {
  const minLength = options?.minLength ?? 2;
  const maxLength = options?.maxLength ?? 50;

  // Normalize and split on word boundaries
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .split(/\s+/)
    .filter((term) => term.length >= minLength && term.length <= maxLength);
}

/**
 * Removes stop words from token list
 */
export function removeStopWords(
  tokens: string[],
  stopWords: Set<string>,
): string[] {
  return tokens.filter((token) => !stopWords.has(token));
}

/**
 * Simple stemming (removes common suffixes)
 */
export function stem(word: string): string {
  if (word.length < 4) return word;

  // Remove common suffixes - order matters (longer suffixes first)
  const suffixes = ["ies", "ing", "est", "ed", "er", "ly", "es", "s"];

  for (const suffix of suffixes) {
    if (word.endsWith(suffix) && word.length > suffix.length + 2) {
      const stemmed = word.slice(0, -suffix.length);

      // Handle special cases
      if (suffix === "ies") {
        return stemmed + "y";
      }

      // Handle -ing with double consonant (running -> run)
      if (suffix === "ing") {
        if (
          stemmed.length >= 2 &&
          stemmed[stemmed.length - 1] === stemmed[stemmed.length - 2]
        ) {
          return stemmed.slice(0, -1);
        }
      }

      // Handle -ed with double consonant (stopped -> stop)
      if (suffix === "ed") {
        if (
          stemmed.length >= 2 &&
          stemmed[stemmed.length - 1] === stemmed[stemmed.length - 2]
        ) {
          return stemmed.slice(0, -1);
        }
      }

      return stemmed;
    }
  }

  return word;
}

/**
 * Processes text into normalized terms
 */
export function processText(text: string, config: IndexerConfig): string[] {
  let tokens = tokenizeText(text, {
    minLength: config.minTermLength,
    maxLength: config.maxTermLength,
  });

  if (config.stopWords) {
    tokens = removeStopWords(tokens, new Set(config.stopWords));
  }

  if (config.stemming) {
    tokens = tokens.map(stem);
  }

  if (!config.caseSensitive) {
    tokens = tokens.map((t) => t.toLowerCase());
  }

  return tokens;
}

// ============================================================================
// Search Indexer
// ============================================================================

export class SearchIndexer {
  private documents: Map<string, Document> = new Map();
  private invertedIndex: Map<string, Map<string, IndexEntry>> = new Map();
  private config: Required<IndexerConfig>;
  private lastUpdated: Date | null = null;

  constructor(config: IndexerConfig = {}) {
    this.config = {
      minTermLength: config.minTermLength ?? 2,
      maxTermLength: config.maxTermLength ?? 50,
      stopWords: config.stopWords ?? Array.from(DEFAULT_STOP_WORDS),
      stemming: config.stemming ?? true,
      caseSensitive: config.caseSensitive ?? false,
      boostFields: config.boostFields ?? DEFAULT_BOOST_FIELDS,
    };
  }

  /**
   * Indexes a document
   */
  index(doc: Document): void {
    // Remove existing document if present
    if (this.documents.has(doc.id)) {
      this.remove(doc.id);
    }

    // Store document
    this.documents.set(doc.id, doc);

    // Process and index content
    const contentTerms = this.processDocument(doc);
    const termFrequencies = this.calculateTermFrequencies(contentTerms);

    // Add to inverted index
    for (const [term, positions] of termFrequencies) {
      if (!this.invertedIndex.has(term)) {
        this.invertedIndex.set(term, new Map());
      }

      const termIndex = this.invertedIndex.get(term)!;
      termIndex.set(doc.id, {
        docId: doc.id,
        positions,
        frequency: positions.length,
        boost: this.calculateBoost(doc),
      });
    }

    this.lastUpdated = new Date();
  }

  /**
   * Indexes multiple documents
   */
  indexMany(docs: Document[]): void {
    for (const doc of docs) {
      this.index(doc);
    }
  }

  /**
   * Removes a document from the index
   */
  remove(docId: string): boolean {
    const doc = this.documents.get(docId);
    if (!doc) return false;

    // Remove from inverted index
    for (const [, termIndex] of this.invertedIndex) {
      termIndex.delete(docId);
    }

    // Clean up empty term entries
    for (const [term, termIndex] of this.invertedIndex) {
      if (termIndex.size === 0) {
        this.invertedIndex.delete(term);
      }
    }

    // Remove document
    this.documents.delete(docId);
    this.lastUpdated = new Date();

    return true;
  }

  /**
   * Updates a document in the index
   */
  update(doc: Document): void {
    this.index(doc);
  }

  /**
   * Searches the index
   */
  search(query: string, options?: SearchOptions): SearchMatch[] {
    const terms = processText(query, this.config);
    if (terms.length === 0) return [];

    const scores = new Map<
      string,
      {
        score: number;
        matchedTerms: Set<string>;
        positions: Map<string, number[]>;
      }
    >();
    const typeFilter = options?.type;

    // Calculate TF-IDF scores for each document
    for (const term of terms) {
      const termIndex = this.invertedIndex.get(term);
      if (!termIndex) continue;

      const idf = this.calculateIDF(termIndex.size);

      for (const [docId, entry] of termIndex) {
        const doc = this.documents.get(docId);
        if (!doc) continue;
        if (typeFilter && doc.type !== typeFilter) continue;

        const tf = entry.frequency;
        const tfidf = tf * idf * entry.boost;

        if (!scores.has(docId)) {
          scores.set(docId, {
            score: 0,
            matchedTerms: new Set(),
            positions: new Map(),
          });
        }

        const docScore = scores.get(docId)!;
        docScore.score += tfidf;
        docScore.matchedTerms.add(term);
        docScore.positions.set(term, entry.positions);
      }
    }

    // Apply filters
    let results: SearchMatch[] = [];

    for (const [docId, { score, matchedTerms, positions }] of scores) {
      const document = this.documents.get(docId)!;

      // Apply field filters if provided
      if (options?.filters && !this.matchesFilters(document, options.filters)) {
        continue;
      }

      results.push({
        document,
        score,
        matchedTerms: Array.from(matchedTerms),
        positions,
      });
    }

    // Sort by score descending
    results.sort((a, b) => b.score - a.score);

    // Apply limit
    if (options?.limit) {
      results = results.slice(0, options.limit);
    }

    return results;
  }

  /**
   * Searches messages
   */
  searchMessages(query: string, limit?: number): SearchMatch[] {
    return this.search(query, { type: "message", limit });
  }

  /**
   * Searches channels
   */
  searchChannels(query: string, limit?: number): SearchMatch[] {
    return this.search(query, { type: "channel", limit });
  }

  /**
   * Searches users
   */
  searchUsers(query: string, limit?: number): SearchMatch[] {
    return this.search(query, { type: "user", limit });
  }

  /**
   * Gets a document by ID
   */
  getDocument(docId: string): Document | undefined {
    return this.documents.get(docId);
  }

  /**
   * Checks if a document exists
   */
  hasDocument(docId: string): boolean {
    return this.documents.has(docId);
  }

  /**
   * Gets all documents of a type
   */
  getDocumentsByType(type: IndexableType): Document[] {
    const docs: Document[] = [];
    for (const doc of this.documents.values()) {
      if (doc.type === type) {
        docs.push(doc);
      }
    }
    return docs;
  }

  /**
   * Gets index statistics
   */
  getStats(): IndexStats {
    const documentsByType: Record<IndexableType, number> = {
      message: 0,
      channel: 0,
      user: 0,
    };

    for (const doc of this.documents.values()) {
      documentsByType[doc.type]++;
    }

    // Estimate index size in bytes
    let indexSize = 0;
    for (const [term, termIndex] of this.invertedIndex) {
      indexSize += term.length * 2; // UTF-16 string
      indexSize += termIndex.size * 50; // Approximate entry size
    }

    return {
      documentCount: this.documents.size,
      termCount: this.invertedIndex.size,
      indexSize,
      lastUpdated: this.lastUpdated,
      documentsByType,
    };
  }

  /**
   * Clears the entire index
   */
  clear(): void {
    this.documents.clear();
    this.invertedIndex.clear();
    this.lastUpdated = null;
  }

  /**
   * Exports index data for persistence
   */
  export(): IndexData {
    const documents: Document[] = Array.from(this.documents.values());
    const index: SerializedIndex = {};

    for (const [term, termIndex] of this.invertedIndex) {
      index[term] = {};
      for (const [docId, entry] of termIndex) {
        index[term][docId] = {
          positions: entry.positions,
          frequency: entry.frequency,
          boost: entry.boost,
        };
      }
    }

    return {
      documents,
      index,
      lastUpdated: this.lastUpdated?.toISOString() ?? null,
    };
  }

  /**
   * Imports index data
   */
  import(data: IndexData): void {
    this.clear();

    // Import documents
    for (const doc of data.documents) {
      this.documents.set(doc.id, doc);
    }

    // Import inverted index
    for (const [term, entries] of Object.entries(data.index)) {
      const termIndex = new Map<string, IndexEntry>();
      for (const [docId, entry] of Object.entries(entries)) {
        termIndex.set(docId, {
          docId,
          positions: entry.positions,
          frequency: entry.frequency,
          boost: entry.boost,
        });
      }
      this.invertedIndex.set(term, termIndex);
    }

    this.lastUpdated = data.lastUpdated ? new Date(data.lastUpdated) : null;
  }

  /**
   * Processes a document into indexable terms
   */
  private processDocument(doc: Document): string[] {
    const parts: string[] = [];

    // Add main content
    parts.push(doc.content);

    // Add field values
    for (const [, value] of Object.entries(doc.fields)) {
      if (typeof value === "string") {
        parts.push(value);
      }
    }

    return processText(parts.join(" "), this.config);
  }

  /**
   * Calculates term frequencies with positions
   */
  private calculateTermFrequencies(terms: string[]): Map<string, number[]> {
    const frequencies = new Map<string, number[]>();

    for (let i = 0; i < terms.length; i++) {
      const term = terms[i];
      if (!frequencies.has(term)) {
        frequencies.set(term, []);
      }
      frequencies.get(term)!.push(i);
    }

    return frequencies;
  }

  /**
   * Calculates document boost based on type
   */
  private calculateBoost(doc: Document): number {
    let boost = 1.0;

    // Boost based on document type
    if (doc.type === "channel") boost *= 1.2;
    if (doc.type === "user") boost *= 1.1;

    // Boost pinned/starred messages
    if (doc.type === "message") {
      const fields = doc.fields as MessageDocument["fields"];
      if (fields.isPinned) boost *= 1.5;
      if (fields.isStarred) boost *= 1.3;
    }

    return boost;
  }

  /**
   * Calculates IDF (Inverse Document Frequency)
   */
  private calculateIDF(documentFrequency: number): number {
    const totalDocs = this.documents.size;
    if (totalDocs === 0 || documentFrequency === 0) return 0;
    return Math.log(totalDocs / documentFrequency) + 1;
  }

  /**
   * Checks if document matches filters
   */
  private matchesFilters(
    doc: Document,
    filters: Record<string, unknown>,
  ): boolean {
    for (const [key, value] of Object.entries(filters)) {
      const docValue = doc.fields[key as keyof typeof doc.fields];
      if (docValue !== value) return false;
    }
    return true;
  }
}

// ============================================================================
// Additional Types
// ============================================================================

interface SearchOptions {
  type?: IndexableType;
  limit?: number;
  filters?: Record<string, unknown>;
}

interface SerializedIndexEntry {
  positions: number[];
  frequency: number;
  boost: number;
}

interface SerializedIndex {
  [term: string]: {
    [docId: string]: SerializedIndexEntry;
  };
}

export interface IndexData {
  documents: Document[];
  index: SerializedIndex;
  lastUpdated: string | null;
}

// ============================================================================
// Factory Functions
// ============================================================================

let defaultIndexer: SearchIndexer | null = null;

/**
 * Gets or creates the default search indexer
 */
export function getSearchIndexer(config?: IndexerConfig): SearchIndexer {
  if (!defaultIndexer) {
    defaultIndexer = new SearchIndexer(config);
  }
  return defaultIndexer;
}

/**
 * Creates a new search indexer instance
 */
export function createSearchIndexer(config?: IndexerConfig): SearchIndexer {
  return new SearchIndexer(config);
}

// ============================================================================
// Document Builders
// ============================================================================

/**
 * Creates a message document for indexing
 */
export function createMessageDocument(
  id: string,
  content: string,
  fields: MessageDocument["fields"],
  timestamp?: Date,
): MessageDocument {
  return {
    id,
    type: "message",
    content,
    fields,
    timestamp: timestamp ?? new Date(),
  };
}

/**
 * Creates a channel document for indexing
 */
export function createChannelDocument(
  id: string,
  name: string,
  fields: ChannelDocument["fields"],
  timestamp?: Date,
): ChannelDocument {
  return {
    id,
    type: "channel",
    content: name,
    fields,
    timestamp: timestamp ?? new Date(),
  };
}

/**
 * Creates a user document for indexing
 */
export function createUserDocument(
  id: string,
  content: string,
  fields: UserDocument["fields"],
  timestamp?: Date,
): UserDocument {
  return {
    id,
    type: "user",
    content,
    fields,
    timestamp: timestamp ?? new Date(),
  };
}

export default SearchIndexer;
