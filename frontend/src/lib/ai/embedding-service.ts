/**
 * Embedding Service - OpenAI Embedding API Client
 *
 * Handles generation of text embeddings using OpenAI's embedding models.
 * Includes batching, caching, error handling, and cost tracking.
 *
 * @module lib/ai/embedding-service
 */

import { gql } from "@apollo/client";
import { apolloClient } from "@/lib/apollo-client";
import crypto from "crypto";

import { logger } from "@/lib/logger";

// ========================================
// Types
// ========================================

export interface EmbeddingRequest {
  text: string;
  messageId?: string;
}

export interface EmbeddingResponse {
  embedding: number[];
  model: string;
  version: string;
  tokenCount: number;
  cached: boolean;
}

export interface BatchEmbeddingResponse {
  embeddings: Array<{
    messageId: string;
    embedding: number[];
    tokenCount: number;
    cached: boolean;
  }>;
  totalTokens: number;
  estimatedCost: number;
  cacheHits: number;
  cacheMisses: number;
}

export type EmbeddingModel =
  | "text-embedding-3-small"
  | "text-embedding-3-large"
  | "text-embedding-ada-002";

// ========================================
// Constants
// ========================================

const DEFAULT_MODEL: EmbeddingModel = "text-embedding-3-small";
const DEFAULT_VERSION = "1.0.0";
const MAX_BATCH_SIZE = 2048; // OpenAI limit
const MAX_TEXT_LENGTH = 8191; // OpenAI token limit (approximate)

// Pricing per 1M tokens (as of 2024)
const PRICING: Record<EmbeddingModel, number> = {
  "text-embedding-3-small": 0.02,
  "text-embedding-3-large": 0.13,
  "text-embedding-ada-002": 0.1,
};

// ========================================
// GraphQL Queries
// ========================================

const GET_CACHED_EMBEDDING = gql`
  query GetCachedEmbedding($contentHash: String!) {
    nchat_embedding_cache(
      where: { content_hash: { _eq: $contentHash } }
      limit: 1
    ) {
      id
      embedding
      model
      version
      usage_count
    }
  }
`;

const INSERT_CACHED_EMBEDDING = gql`
  mutation InsertCachedEmbedding(
    $contentHash: String!
    $content: String!
    $embedding: String!
    $model: String!
    $version: String!
  ) {
    insert_nchat_embedding_cache_one(
      object: {
        content_hash: $contentHash
        content: $content
        embedding: $embedding
        model: $model
        version: $version
      }
      on_conflict: {
        constraint: nchat_embedding_cache_content_hash_key
        update_columns: [usage_count, last_used_at, updated_at]
      }
    ) {
      id
      embedding
    }
  }
`;

const UPDATE_CACHE_USAGE = gql`
  mutation UpdateCacheUsage($cacheId: uuid!) {
    update_nchat_embedding_cache_by_pk(
      pk_columns: { id: $cacheId }
      _inc: { usage_count: 1 }
      _set: { last_used_at: "now()" }
    ) {
      id
    }
  }
`;

const RECORD_EMBEDDING_STATS = gql`
  mutation RecordEmbeddingStats(
    $date: date!
    $model: String!
    $totalEmbeddings: Int!
    $totalTokens: Int!
    $estimatedCost: numeric!
    $avgProcessingTime: Int!
    $cacheHits: Int!
    $cacheMisses: Int!
    $errors: Int!
  ) {
    insert_nchat_embedding_stats_one(
      object: {
        date: $date
        model: $model
        total_embeddings: $totalEmbeddings
        total_tokens: $totalTokens
        estimated_cost: $estimatedCost
        avg_processing_time_ms: $avgProcessingTime
        cache_hit_count: $cacheHits
        cache_miss_count: $cacheMisses
        error_count: $errors
      }
      on_conflict: {
        constraint: nchat_embedding_stats_date_model_key
        update_columns: [
          total_embeddings
          total_tokens
          estimated_cost
          avg_processing_time_ms
          cache_hit_count
          cache_miss_count
          error_count
          updated_at
        ]
      }
    ) {
      id
    }
  }
`;

// ========================================
// Embedding Service Class
// ========================================

export class EmbeddingService {
  private client = apolloClient;
  private apiKey: string;
  private model: EmbeddingModel;
  private version: string;
  private baseUrl: string;

  constructor(
    apiKey?: string,
    model: EmbeddingModel = DEFAULT_MODEL,
    version: string = DEFAULT_VERSION,
  ) {
    this.apiKey = apiKey || process.env.OPENAI_API_KEY || "";
    this.model = model;
    this.version = version;
    this.baseUrl = "https://api.openai.com/v1/embeddings";

    if (!this.apiKey) {
      logger.warn("OpenAI API key not configured. Embeddings will fail.");
    }
  }

  /**
   * Generate embedding for a single text
   */
  async generateEmbedding(
    text: string,
    useCache = true,
  ): Promise<EmbeddingResponse> {
    const startTime = Date.now();
    const truncatedText = this.truncateText(text);
    const contentHash = this.hashContent(truncatedText);

    try {
      // Check cache first
      if (useCache) {
        const cached = await this.getCachedEmbedding(contentHash);
        if (cached) {
          await this.updateCacheUsage(cached.id);
          return {
            embedding: cached.embedding,
            model: cached.model,
            version: cached.version,
            tokenCount: this.estimateTokens(truncatedText),
            cached: true,
          };
        }
      }

      // Generate new embedding
      const response = await fetch(this.baseUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          input: truncatedText,
          model: this.model,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(
          `OpenAI API error: ${error.error?.message || response.statusText}`,
        );
      }

      const data = await response.json();
      const embedding = data.data[0].embedding;
      const tokenCount = data.usage.total_tokens;

      // Cache the result
      if (useCache) {
        await this.cacheEmbedding(contentHash, truncatedText, embedding);
      }

      // Record stats
      const processingTime = Date.now() - startTime;
      await this.recordStats({
        totalEmbeddings: 1,
        totalTokens: tokenCount,
        avgProcessingTime: processingTime,
        cacheHits: 0,
        cacheMisses: 1,
        errors: 0,
      });

      return {
        embedding,
        model: this.model,
        version: this.version,
        tokenCount,
        cached: false,
      };
    } catch (error) {
      logger.error("Generate embedding error:", error);

      // Record error stats
      await this.recordStats({
        totalEmbeddings: 0,
        totalTokens: 0,
        avgProcessingTime: 0,
        cacheHits: 0,
        cacheMisses: 0,
        errors: 1,
      });

      throw error;
    }
  }

  /**
   * Generate embeddings for multiple texts (batched)
   * More efficient than individual calls
   */
  async batchGenerateEmbeddings(
    requests: EmbeddingRequest[],
    useCache = true,
  ): Promise<BatchEmbeddingResponse> {
    const startTime = Date.now();
    const results: BatchEmbeddingResponse["embeddings"] = [];
    let totalTokens = 0;
    let cacheHits = 0;
    let cacheMisses = 0;

    // Process in chunks of MAX_BATCH_SIZE
    for (let i = 0; i < requests.length; i += MAX_BATCH_SIZE) {
      const chunk = requests.slice(i, i + MAX_BATCH_SIZE);
      const chunkResults = await this.processBatch(chunk, useCache);

      results.push(...chunkResults.embeddings);
      totalTokens += chunkResults.totalTokens;
      cacheHits += chunkResults.cacheHits;
      cacheMisses += chunkResults.cacheMisses;
    }

    const estimatedCost = this.calculateCost(totalTokens);
    const processingTime = Date.now() - startTime;

    // Record stats
    await this.recordStats({
      totalEmbeddings: results.length,
      totalTokens,
      avgProcessingTime: Math.floor(processingTime / results.length),
      cacheHits,
      cacheMisses,
      errors: 0,
    });

    return {
      embeddings: results,
      totalTokens,
      estimatedCost,
      cacheHits,
      cacheMisses,
    };
  }

  /**
   * Process a single batch (internal)
   */
  private async processBatch(
    requests: EmbeddingRequest[],
    useCache: boolean,
  ): Promise<Omit<BatchEmbeddingResponse, "estimatedCost">> {
    const embeddings: BatchEmbeddingResponse["embeddings"] = [];
    const uncachedRequests: Array<{
      index: number;
      text: string;
      messageId?: string;
    }> = [];
    let totalTokens = 0;
    let cacheHits = 0;
    let cacheMisses = 0;

    // Check cache for all requests
    if (useCache) {
      for (let i = 0; i < requests.length; i++) {
        const req = requests[i];
        const truncatedText = this.truncateText(req.text);
        const contentHash = this.hashContent(truncatedText);
        const cached = await this.getCachedEmbedding(contentHash);

        if (cached) {
          await this.updateCacheUsage(cached.id);
          embeddings.push({
            messageId: req.messageId || "",
            embedding: cached.embedding,
            tokenCount: this.estimateTokens(truncatedText),
            cached: true,
          });
          cacheHits++;
        } else {
          uncachedRequests.push({
            index: i,
            text: truncatedText,
            messageId: req.messageId,
          });
        }
      }
    } else {
      uncachedRequests.push(
        ...requests.map((req, i) => ({
          index: i,
          text: this.truncateText(req.text),
          messageId: req.messageId,
        })),
      );
    }

    // Generate embeddings for uncached requests
    if (uncachedRequests.length > 0) {
      const response = await fetch(this.baseUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          input: uncachedRequests.map((r) => r.text),
          model: this.model,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(
          `OpenAI API error: ${error.error?.message || response.statusText}`,
        );
      }

      const data = await response.json();
      totalTokens = data.usage.total_tokens;

      // Process results
      for (let i = 0; i < uncachedRequests.length; i++) {
        const req = uncachedRequests[i];
        const embedding = data.data[i].embedding;

        // Cache the result
        if (useCache) {
          const contentHash = this.hashContent(req.text);
          await this.cacheEmbedding(contentHash, req.text, embedding);
        }

        embeddings.push({
          messageId: req.messageId || "",
          embedding,
          tokenCount: Math.floor(totalTokens / uncachedRequests.length),
          cached: false,
        });
        cacheMisses++;
      }
    }

    return {
      embeddings,
      totalTokens,
      cacheHits,
      cacheMisses,
    };
  }

  /**
   * Get cached embedding by content hash
   */
  private async getCachedEmbedding(contentHash: string): Promise<{
    id: string;
    embedding: number[];
    model: string;
    version: string;
  } | null> {
    try {
      const { data } = await this.client.query({
        query: GET_CACHED_EMBEDDING,
        variables: { contentHash },
        fetchPolicy: "network-only",
      });

      if (data.nchat_embedding_cache.length > 0) {
        const cache = data.nchat_embedding_cache[0];
        return {
          id: cache.id,
          embedding: JSON.parse(cache.embedding),
          model: cache.model,
          version: cache.version,
        };
      }

      return null;
    } catch (error) {
      logger.error("Get cached embedding error:", error);
      return null;
    }
  }

  /**
   * Cache an embedding
   */
  private async cacheEmbedding(
    contentHash: string,
    content: string,
    embedding: number[],
  ): Promise<void> {
    try {
      await this.client.mutate({
        mutation: INSERT_CACHED_EMBEDDING,
        variables: {
          contentHash,
          content: content.substring(0, 5000), // Limit content length
          embedding: JSON.stringify(embedding),
          model: this.model,
          version: this.version,
        },
      });
    } catch (error) {
      logger.error("Cache embedding error:", error);
    }
  }

  /**
   * Update cache usage count
   */
  private async updateCacheUsage(cacheId: string): Promise<void> {
    try {
      await this.client.mutate({
        mutation: UPDATE_CACHE_USAGE,
        variables: { cacheId },
      });
    } catch (error) {
      logger.error("Update cache usage error:", error);
    }
  }

  /**
   * Record embedding statistics
   */
  private async recordStats(stats: {
    totalEmbeddings: number;
    totalTokens: number;
    avgProcessingTime: number;
    cacheHits: number;
    cacheMisses: number;
    errors: number;
  }): Promise<void> {
    try {
      const date = new Date().toISOString().split("T")[0];
      const estimatedCost = this.calculateCost(stats.totalTokens);

      await this.client.mutate({
        mutation: RECORD_EMBEDDING_STATS,
        variables: {
          date,
          model: this.model,
          totalEmbeddings: stats.totalEmbeddings,
          totalTokens: stats.totalTokens,
          estimatedCost,
          avgProcessingTime: stats.avgProcessingTime,
          cacheHits: stats.cacheHits,
          cacheMisses: stats.cacheMisses,
          errors: stats.errors,
        },
      });
    } catch (error) {
      logger.error("Record embedding stats error:", error);
    }
  }

  /**
   * Calculate cost in USD
   */
  private calculateCost(tokens: number): number {
    const pricePerMillion = PRICING[this.model] || 0;
    return (tokens / 1_000_000) * pricePerMillion;
  }

  /**
   * Truncate text to fit within token limits
   */
  private truncateText(text: string): string {
    if (text.length <= MAX_TEXT_LENGTH) {
      return text;
    }
    return text.substring(0, MAX_TEXT_LENGTH);
  }

  /**
   * Estimate token count (rough approximation)
   */
  private estimateTokens(text: string): number {
    // Rough estimate: ~4 characters per token
    return Math.ceil(text.length / 4);
  }

  /**
   * Hash content for cache key
   */
  private hashContent(text: string): string {
    return crypto.createHash("sha256").update(text).digest("hex");
  }

  /**
   * Get model dimension
   */
  getDimension(): number {
    switch (this.model) {
      case "text-embedding-3-small":
        return 1536;
      case "text-embedding-3-large":
        return 3072;
      case "text-embedding-ada-002":
        return 1536;
      default:
        return 1536;
    }
  }

  /**
   * Get current model
   */
  getModel(): string {
    return this.model;
  }

  /**
   * Get current version
   */
  getVersion(): string {
    return this.version;
  }
}

// Export singleton instance
export const embeddingService = new EmbeddingService();
