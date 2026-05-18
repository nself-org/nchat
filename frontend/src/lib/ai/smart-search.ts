/**
 * AI-powered semantic search service
 * Supports embeddings-based search with OpenAI/Anthropic
 * Falls back to keyword search when AI is unavailable
 */

import { captureError, addSentryBreadcrumb } from "@/lib/sentry-utils";

// Types
export interface SearchableMessage {
  id: string;
  content: string;
  userId: string;
  userName?: string;
  channelId?: string;
  channelName?: string;
  createdAt: string | Date;
  threadId?: string;
  metadata?: Record<string, unknown>;
}

export interface SearchResult {
  message: SearchableMessage;
  score: number;
  highlights?: string[];
  matchType: "semantic" | "keyword" | "exact";
  context?: {
    before?: SearchableMessage[];
    after?: SearchableMessage[];
  };
}

export interface SearchOptions {
  limit?: number;
  threshold?: number;
  includeContext?: boolean;
  contextSize?: number;
  filters?: {
    channelId?: string;
    userId?: string;
    dateFrom?: Date;
    dateTo?: Date;
    hasThread?: boolean;
  };
  rankBy?: "relevance" | "date" | "hybrid";
}

export interface SearchQuery {
  text: string;
  options?: SearchOptions;
}

export type SearchProvider = "openai" | "anthropic" | "local";

export interface SearchConfig {
  provider: SearchProvider;
  apiKey?: string;
  embeddingModel?: string;
  endpoint?: string;
}

// Default configurations
const DEFAULT_OPENAI_EMBEDDING_MODEL = "text-embedding-3-small";
const DEFAULT_SEARCH_LIMIT = 20;
const DEFAULT_SIMILARITY_THRESHOLD = 0.7;

/**
 * Smart Search class with semantic capabilities
 */
export class SmartSearch {
  private config: SearchConfig;
  private isAvailable: boolean;
  private embeddingCache: Map<string, number[]>;

  constructor(config?: Partial<SearchConfig>) {
    this.config = {
      provider: config?.provider || this.detectProvider(),
      apiKey: config?.apiKey,
      embeddingModel: config?.embeddingModel,
      endpoint: config?.endpoint,
    };

    this.isAvailable = this.checkAvailability();
    this.embeddingCache = new Map();
  }

  /**
   * Detect which provider to use
   */
  private detectProvider(): SearchProvider {
    if (typeof window !== "undefined") {
      if (process.env.NEXT_PUBLIC_OPENAI_API_KEY) return "openai";
      if (process.env.NEXT_PUBLIC_ANTHROPIC_API_KEY) return "anthropic";
    } else {
      if (process.env.OPENAI_API_KEY) return "openai";
      if (process.env.ANTHROPIC_API_KEY) return "anthropic";
    }
    return "local";
  }

  /**
   * Check if semantic search is available
   */
  private checkAvailability(): boolean {
    if (this.config.provider === "local") return true;

    const apiKey = this.config.apiKey || this.getAPIKey();
    return !!apiKey;
  }

  /**
   * Get API key from environment
   */
  private getAPIKey(): string | undefined {
    if (typeof window !== "undefined") {
      if (this.config.provider === "openai") {
        return process.env.NEXT_PUBLIC_OPENAI_API_KEY;
      }
      if (this.config.provider === "anthropic") {
        return process.env.NEXT_PUBLIC_ANTHROPIC_API_KEY;
      }
    } else {
      if (this.config.provider === "openai") {
        return process.env.OPENAI_API_KEY;
      }
      if (this.config.provider === "anthropic") {
        return process.env.ANTHROPIC_API_KEY;
      }
    }
    return undefined;
  }

  /**
   * Check if semantic search is available
   */
  public available(): boolean {
    return this.isAvailable;
  }

  /**
   * Get current provider
   */
  public getProvider(): SearchProvider {
    return this.config.provider;
  }

  /**
   * Search messages with natural language query
   */
  async search(
    query: string,
    messages: SearchableMessage[],
    options: SearchOptions = {},
  ): Promise<SearchResult[]> {
    try {
      addSentryBreadcrumb("ai", "Smart search", {
        provider: this.config.provider,
        queryLength: query.length,
        messageCount: messages.length,
      });

      // Apply filters first
      const filteredMessages = this.applyFilters(messages, options.filters);

      // Use semantic search if available, otherwise fall back to keyword search
      const results = this.isAvailable
        ? await this.semanticSearch(query, filteredMessages, options)
        : await this.keywordSearch(query, filteredMessages, options);

      // Apply ranking
      const rankedResults = this.rankResults(
        results,
        options.rankBy || "relevance",
      );

      // Apply limit
      const limit = options.limit || DEFAULT_SEARCH_LIMIT;
      return rankedResults.slice(0, limit);
    } catch (error) {
      captureError(error as Error, {
        tags: { feature: "ai-search", provider: this.config.provider },
        extra: { query, messageCount: messages.length },
      });
      // Fallback to keyword search
      return this.keywordSearch(query, messages, options);
    }
  }

  /**
   * Semantic search using embeddings
   */
  private async semanticSearch(
    query: string,
    messages: SearchableMessage[],
    options: SearchOptions,
  ): Promise<SearchResult[]> {
    // Get query embedding
    const queryEmbedding = await this.getEmbedding(query);

    // Get or compute message embeddings
    const messageEmbeddings = await Promise.all(
      messages.map(async (msg) => ({
        message: msg,
        embedding: await this.getEmbedding(msg.content),
      })),
    );

    // Calculate similarity scores
    const threshold = options.threshold || DEFAULT_SIMILARITY_THRESHOLD;
    const results: SearchResult[] = [];

    for (const { message, embedding } of messageEmbeddings) {
      const similarity = this.cosineSimilarity(queryEmbedding, embedding);

      if (similarity >= threshold) {
        results.push({
          message,
          score: similarity,
          matchType: "semantic",
          highlights: this.extractHighlights(message.content, query),
        });
      }
    }

    // Add context if requested
    if (options.includeContext) {
      return this.addContext(results, messages, options.contextSize || 2);
    }

    return results;
  }

  /**
   * Keyword-based search (fallback)
   */
  private async keywordSearch(
    query: string,
    messages: SearchableMessage[],
    options: SearchOptions,
  ): Promise<SearchResult[]> {
    const queryTerms = this.tokenize(query.toLowerCase());
    const results: SearchResult[] = [];

    for (const message of messages) {
      const contentLower = message.content.toLowerCase();
      const contentTerms = this.tokenize(contentLower);

      // Check for exact phrase match
      if (contentLower.includes(query.toLowerCase())) {
        results.push({
          message,
          score: 1.0,
          matchType: "exact",
          highlights: this.extractHighlights(message.content, query),
        });
        continue;
      }

      // Calculate keyword overlap score
      const matchedTerms = queryTerms.filter((term) =>
        contentTerms.includes(term),
      );
      const score = matchedTerms.length / queryTerms.length;

      if (score > 0) {
        results.push({
          message,
          score,
          matchType: "keyword",
          highlights: this.extractHighlights(message.content, query),
        });
      }
    }

    // Add context if requested
    if (options.includeContext) {
      return this.addContext(results, messages, options.contextSize || 2);
    }

    return results;
  }

  /**
   * Get embedding for text
   */
  private async getEmbedding(text: string): Promise<number[]> {
    // Check cache first
    const cacheKey = text.slice(0, 100); // Cache key based on first 100 chars
    if (this.embeddingCache.has(cacheKey)) {
      return this.embeddingCache.get(cacheKey)!;
    }

    let embedding: number[];

    switch (this.config.provider) {
      case "openai":
        embedding = await this.getOpenAIEmbedding(text);
        break;
      case "anthropic":
        // Anthropic doesn't have a dedicated embeddings API yet
        // Fall back to local embedding
        embedding = this.getLocalEmbedding(text);
        break;
      default:
        embedding = this.getLocalEmbedding(text);
        break;
    }

    // Cache the result
    this.embeddingCache.set(cacheKey, embedding);

    // Limit cache size
    if (this.embeddingCache.size > 1000) {
      const firstKey = this.embeddingCache.keys().next().value;
      if (firstKey !== undefined) {
        this.embeddingCache.delete(firstKey);
      }
    }

    return embedding;
  }

  /**
   * Get embedding from OpenAI
   */
  private async getOpenAIEmbedding(text: string): Promise<number[]> {
    const apiKey = this.config.apiKey || this.getAPIKey();
    if (!apiKey) {
      throw new Error("OpenAI API key not configured");
    }

    const model = this.config.embeddingModel || DEFAULT_OPENAI_EMBEDDING_MODEL;
    const endpoint =
      this.config.endpoint || "https://api.openai.com/v1/embeddings";

    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        input: text,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.data[0].embedding;
  }

  /**
   * Local embedding (simple TF-IDF-like approach)
   */
  private getLocalEmbedding(text: string): number[] {
    // Simple bag-of-words embedding with TF-IDF-like weighting
    const terms = this.tokenize(text.toLowerCase());
    const embedding = new Array(100).fill(0);

    for (let i = 0; i < terms.length; i++) {
      const term = terms[i];
      // Simple hash to embedding dimension
      const hash = this.hashString(term);
      const dim = hash % embedding.length;
      embedding[dim] += 1 / Math.sqrt(terms.length); // TF normalization
    }

    // Normalize to unit vector
    const magnitude = Math.sqrt(
      embedding.reduce((sum, val) => sum + val * val, 0),
    );
    return magnitude > 0 ? embedding.map((val) => val / magnitude) : embedding;
  }

  /**
   * Calculate cosine similarity between two vectors
   */
  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) {
      throw new Error("Vectors must have same length");
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    const denominator = Math.sqrt(normA) * Math.sqrt(normB);
    return denominator === 0 ? 0 : dotProduct / denominator;
  }

  /**
   * Tokenize text into terms
   */
  private tokenize(text: string): string[] {
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, " ")
      .split(/\s+/)
      .filter((term) => term.length > 0);
  }

  /**
   * Simple string hash function
   */
  private hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }

  /**
   * Extract highlights from text
   */
  private extractHighlights(text: string, query: string): string[] {
    const queryTerms = this.tokenize(query.toLowerCase());
    const highlights: string[] = [];
    const sentences = text.split(/[.!?]+/).filter((s) => s.trim().length > 0);

    for (const sentence of sentences) {
      const sentenceLower = sentence.toLowerCase();
      const hasMatch = queryTerms.some((term) => sentenceLower.includes(term));

      if (hasMatch) {
        highlights.push(sentence.trim());
        if (highlights.length >= 3) break;
      }
    }

    return highlights;
  }

  /**
   * Apply filters to messages
   */
  private applyFilters(
    messages: SearchableMessage[],
    filters?: SearchOptions["filters"],
  ): SearchableMessage[] {
    if (!filters) return messages;

    return messages.filter((msg) => {
      if (filters.channelId && msg.channelId !== filters.channelId) {
        return false;
      }
      if (filters.userId && msg.userId !== filters.userId) {
        return false;
      }
      if (filters.hasThread !== undefined) {
        const hasThread = !!msg.threadId;
        if (hasThread !== filters.hasThread) return false;
      }
      if (filters.dateFrom) {
        const msgDate = new Date(msg.createdAt);
        if (msgDate < filters.dateFrom) return false;
      }
      if (filters.dateTo) {
        const msgDate = new Date(msg.createdAt);
        if (msgDate > filters.dateTo) return false;
      }
      return true;
    });
  }

  /**
   * Rank search results
   */
  private rankResults(
    results: SearchResult[],
    rankBy: "relevance" | "date" | "hybrid",
  ): SearchResult[] {
    switch (rankBy) {
      case "relevance":
        return results.sort((a, b) => b.score - a.score);

      case "date":
        return results.sort(
          (a, b) =>
            new Date(b.message.createdAt).getTime() -
            new Date(a.message.createdAt).getTime(),
        );

      case "hybrid":
        // Combine relevance and recency
        const now = Date.now();
        return results
          .map((result) => {
            const age =
              (now - new Date(result.message.createdAt).getTime()) /
              (1000 * 60 * 60 * 24); // days
            const recencyScore = Math.exp(-age / 30); // Decay over ~30 days
            const hybridScore = result.score * 0.7 + recencyScore * 0.3;
            return { ...result, score: hybridScore };
          })
          .sort((a, b) => b.score - a.score);

      default:
        return results;
    }
  }

  /**
   * Add context messages around search results
   */
  private addContext(
    results: SearchResult[],
    allMessages: SearchableMessage[],
    contextSize: number,
  ): SearchResult[] {
    return results.map((result) => {
      const messageIndex = allMessages.findIndex(
        (m) => m.id === result.message.id,
      );

      if (messageIndex === -1) return result;

      const before = allMessages.slice(
        Math.max(0, messageIndex - contextSize),
        messageIndex,
      );
      const after = allMessages.slice(
        messageIndex + 1,
        messageIndex + 1 + contextSize,
      );

      return {
        ...result,
        context: { before, after },
      };
    });
  }

  /**
   * Clear embedding cache
   */
  public clearCache(): void {
    this.embeddingCache.clear();
  }

  /**
   * Get cache statistics
   */
  public getCacheStats(): { size: number; maxSize: number } {
    return {
      size: this.embeddingCache.size,
      maxSize: 1000,
    };
  }
}

// Singleton instance
let smartSearch: SmartSearch | null = null;

/**
 * Get or create the global smart search instance
 */
export function getSmartSearch(config?: Partial<SearchConfig>): SmartSearch {
  if (!smartSearch || config) {
    smartSearch = new SmartSearch(config);
  }
  return smartSearch;
}

/**
 * Quick helper to check if semantic search is available
 */
export function isSemanticSearchAvailable(): boolean {
  const search = getSmartSearch();
  return search.available() && search.getProvider() !== "local";
}

/**
 * Search messages using the global instance
 */
export async function searchMessages(
  query: string,
  messages: SearchableMessage[],
  options?: SearchOptions,
): Promise<SearchResult[]> {
  const search = getSmartSearch();
  return search.search(query, messages, options);
}
