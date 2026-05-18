/**
 * Embeddings System
 * Handles generation, caching, and management of text embeddings for semantic search
 * Supports OpenAI text-embedding-3-small and other embedding models
 */

import { captureError, addSentryBreadcrumb } from "@/lib/sentry-utils";
import crypto from "crypto";

// ============================================================================
// Types
// ============================================================================

export interface EmbeddingModel {
  name: string;
  provider: "openai" | "anthropic" | "local";
  dimensions: number;
  maxTokens: number;
  costPer1kTokens: number;
}

export interface EmbeddingRequest {
  text: string;
  model?: string;
  user?: string;
}

export interface EmbeddingResponse {
  embedding: number[];
  model: string;
  usage: {
    promptTokens: number;
    totalTokens: number;
  };
  cached: boolean;
}

export interface BatchEmbeddingRequest {
  texts: string[];
  model?: string;
  user?: string;
}

export interface BatchEmbeddingResponse {
  embeddings: number[][];
  model: string;
  usage: {
    promptTokens: number;
    totalTokens: number;
  };
  cached: number;
  generated: number;
}

export interface EmbeddingCacheEntry {
  contentHash: string;
  embedding: number[];
  model: string;
  tokenCount: number;
  createdAt: Date;
  lastUsedAt: Date;
  useCount: number;
}

export interface EmbeddingStats {
  cacheSize: number;
  cacheHits: number;
  cacheMisses: number;
  totalRequests: number;
  totalTokens: number;
  totalCost: number;
  hitRate: number;
}

// ============================================================================
// Constants
// ============================================================================

export const EMBEDDING_MODELS: Record<string, EmbeddingModel> = {
  "text-embedding-3-small": {
    name: "text-embedding-3-small",
    provider: "openai",
    dimensions: 1536,
    maxTokens: 8191,
    costPer1kTokens: 0.00002, // $0.02 per 1M tokens
  },
  "text-embedding-3-large": {
    name: "text-embedding-3-large",
    provider: "openai",
    dimensions: 3072,
    maxTokens: 8191,
    costPer1kTokens: 0.00013, // $0.13 per 1M tokens
  },
  "text-embedding-ada-002": {
    name: "text-embedding-ada-002",
    provider: "openai",
    dimensions: 1536,
    maxTokens: 8191,
    costPer1kTokens: 0.0001, // $0.10 per 1M tokens (legacy)
  },
};

export const DEFAULT_EMBEDDING_MODEL = "text-embedding-3-small";
export const CACHE_MAX_SIZE = 10000;
export const CACHE_TTL_DAYS = 30;
export const BATCH_SIZE = 100; // OpenAI limit is 2048, but we'll be conservative

// ============================================================================
// Embedding Service
// ============================================================================

export class EmbeddingService {
  private cache: Map<string, EmbeddingCacheEntry>;
  private stats: EmbeddingStats;
  private model: EmbeddingModel;
  private apiKey: string | null;

  constructor(modelName: string = DEFAULT_EMBEDDING_MODEL) {
    this.cache = new Map();
    this.stats = {
      cacheSize: 0,
      cacheHits: 0,
      cacheMisses: 0,
      totalRequests: 0,
      totalTokens: 0,
      totalCost: 0,
      hitRate: 0,
    };

    const model = EMBEDDING_MODELS[modelName];
    if (!model) {
      throw new Error(`Unknown embedding model: ${modelName}`);
    }

    this.model = model;
    this.apiKey = this.getApiKey();
  }

  /**
   * Get API key from environment
   */
  private getApiKey(): string | null {
    if (typeof window !== "undefined") {
      return process.env.NEXT_PUBLIC_OPENAI_API_KEY || null;
    }
    return process.env.OPENAI_API_KEY || null;
  }

  /**
   * Check if embeddings service is available
   */
  public isAvailable(): boolean {
    return this.apiKey !== null;
  }

  /**
   * Generate content hash for caching
   */
  private hashContent(text: string, model: string): string {
    return crypto.createHash("sha256").update(`${model}:${text}`).digest("hex");
  }

  /**
   * Get embedding from cache
   */
  private getCached(contentHash: string): EmbeddingCacheEntry | null {
    const entry = this.cache.get(contentHash);
    if (!entry) return null;

    // Update last used time and use count
    entry.lastUsedAt = new Date();
    entry.useCount++;

    this.stats.cacheHits++;
    return entry;
  }

  /**
   * Store embedding in cache
   */
  private setCached(
    contentHash: string,
    embedding: number[],
    tokenCount: number,
  ): void {
    const entry: EmbeddingCacheEntry = {
      contentHash,
      embedding,
      model: this.model.name,
      tokenCount,
      createdAt: new Date(),
      lastUsedAt: new Date(),
      useCount: 1,
    };

    this.cache.set(contentHash, entry);
    this.stats.cacheSize = this.cache.size;

    // Evict old entries if cache is too large
    if (this.cache.size > CACHE_MAX_SIZE) {
      this.evictOldEntries();
    }
  }

  /**
   * Evict least recently used cache entries
   */
  private evictOldEntries(): void {
    const entries = Array.from(this.cache.entries());
    entries.sort((a, b) => {
      return a[1].lastUsedAt.getTime() - b[1].lastUsedAt.getTime();
    });

    const toRemove = Math.floor(CACHE_MAX_SIZE * 0.2); // Remove 20%
    for (let i = 0; i < toRemove; i++) {
      this.cache.delete(entries[i][0]);
    }

    this.stats.cacheSize = this.cache.size;
  }

  /**
   * Estimate token count (rough approximation)
   */
  private estimateTokens(text: string): number {
    // Rough estimate: 1 token ~= 4 characters
    return Math.ceil(text.length / 4);
  }

  /**
   * Generate embedding for a single text
   */
  public async generateEmbedding(
    request: EmbeddingRequest,
  ): Promise<EmbeddingResponse> {
    this.stats.totalRequests++;

    const model = request.model || this.model.name;
    const contentHash = this.hashContent(request.text, model);

    // Check cache first
    const cached = this.getCached(contentHash);
    if (cached) {
      addSentryBreadcrumb("embeddings", "Cache hit", {
        model,
        textLength: request.text.length,
      });

      return {
        embedding: cached.embedding,
        model: cached.model,
        usage: {
          promptTokens: cached.tokenCount,
          totalTokens: cached.tokenCount,
        },
        cached: true,
      };
    }

    this.stats.cacheMisses++;

    // Generate new embedding
    try {
      const result = await this.callEmbeddingAPI([request.text], model);
      const embedding = result.embeddings[0];
      const tokenCount = result.usage.totalTokens;

      // Cache the result
      this.setCached(contentHash, embedding, tokenCount);

      // Update stats
      this.stats.totalTokens += tokenCount;
      this.stats.totalCost += (tokenCount / 1000) * this.model.costPer1kTokens;
      this.updateHitRate();

      addSentryBreadcrumb("embeddings", "Generated", {
        model,
        textLength: request.text.length,
        tokens: tokenCount,
      });

      return {
        embedding,
        model,
        usage: {
          promptTokens: tokenCount,
          totalTokens: tokenCount,
        },
        cached: false,
      };
    } catch (error) {
      captureError(error as Error, {
        tags: { feature: "embeddings" },
        extra: { model, textLength: request.text.length },
      });
      throw error;
    }
  }

  /**
   * Generate embeddings for multiple texts in batch
   */
  public async generateBatchEmbeddings(
    request: BatchEmbeddingRequest,
  ): Promise<BatchEmbeddingResponse> {
    const model = request.model || this.model.name;
    const embeddings: number[][] = [];
    let totalTokens = 0;
    let cached = 0;
    let generated = 0;

    // Check cache for each text
    const textsToGenerate: string[] = [];
    const indexMap: Map<number, number> = new Map(); // Maps original index to generated index

    for (let i = 0; i < request.texts.length; i++) {
      const text = request.texts[i];
      const contentHash = this.hashContent(text, model);
      const cachedEntry = this.getCached(contentHash);

      if (cachedEntry) {
        embeddings[i] = cachedEntry.embedding;
        totalTokens += cachedEntry.tokenCount;
        cached++;
      } else {
        indexMap.set(i, textsToGenerate.length);
        textsToGenerate.push(text);
      }
    }

    // Generate embeddings for uncached texts in batches
    if (textsToGenerate.length > 0) {
      for (let i = 0; i < textsToGenerate.length; i += BATCH_SIZE) {
        const batch = textsToGenerate.slice(i, i + BATCH_SIZE);
        const result = await this.callEmbeddingAPI(batch, model);

        // Cache each result
        for (let j = 0; j < result.embeddings.length; j++) {
          const text = batch[j];
          const embedding = result.embeddings[j];
          const tokenCount = this.estimateTokens(text);
          const contentHash = this.hashContent(text, model);

          this.setCached(contentHash, embedding, tokenCount);

          // Find original index
          const originalIndex = Array.from(indexMap.entries()).find(
            ([_, genIndex]) => genIndex === i + j,
          )?.[0];

          if (originalIndex !== undefined) {
            embeddings[originalIndex] = embedding;
          }
        }

        totalTokens += result.usage.totalTokens;
        generated += result.embeddings.length;
      }

      // Update stats
      this.stats.totalTokens += totalTokens;
      this.stats.totalCost += (totalTokens / 1000) * this.model.costPer1kTokens;
    }

    this.stats.totalRequests += request.texts.length;
    this.updateHitRate();

    addSentryBreadcrumb("embeddings", "Batch generated", {
      model,
      total: request.texts.length,
      cached,
      generated,
      tokens: totalTokens,
    });

    return {
      embeddings,
      model,
      usage: {
        promptTokens: totalTokens,
        totalTokens,
      },
      cached,
      generated,
    };
  }

  /**
   * Call OpenAI Embeddings API
   */
  private async callEmbeddingAPI(
    texts: string[],
    model: string,
  ): Promise<BatchEmbeddingResponse> {
    if (!this.apiKey) {
      throw new Error("OpenAI API key not configured");
    }

    const response = await fetch("https://api.openai.com/v1/embeddings", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model,
        input: texts,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenAI API error: ${response.statusText} - ${error}`);
    }

    const data = await response.json();

    return {
      embeddings: data.data.map((item: any) => item.embedding),
      model: data.model,
      usage: {
        promptTokens: data.usage.prompt_tokens,
        totalTokens: data.usage.total_tokens,
      },
      cached: 0,
      generated: texts.length,
    };
  }

  /**
   * Update hit rate statistic
   */
  private updateHitRate(): void {
    const total = this.stats.cacheHits + this.stats.cacheMisses;
    this.stats.hitRate = total > 0 ? this.stats.cacheHits / total : 0;
  }

  /**
   * Get statistics
   */
  public getStats(): EmbeddingStats {
    return { ...this.stats };
  }

  /**
   * Clear cache
   */
  public clearCache(): void {
    this.cache.clear();
    this.stats.cacheSize = 0;
    this.stats.cacheHits = 0;
    this.stats.cacheMisses = 0;
    this.stats.hitRate = 0;
  }

  /**
   * Load cache from database
   */
  public async loadCacheFromDB(): Promise<number> {
    // This would load from nchat_embedding_cache table
    // Implementation depends on your database client
    // For now, return 0
    return 0;
  }

  /**
   * Save cache to database
   */
  public async saveCacheToDB(): Promise<number> {
    // This would save to nchat_embedding_cache table
    // Implementation depends on your database client
    // For now, return 0
    return 0;
  }

  /**
   * Get model information
   */
  public getModel(): EmbeddingModel {
    return { ...this.model };
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

let embeddingService: EmbeddingService | null = null;

/**
 * Get or create the global embedding service instance
 */
export function getEmbeddingService(
  model: string = DEFAULT_EMBEDDING_MODEL,
): EmbeddingService {
  if (!embeddingService || embeddingService.getModel().name !== model) {
    embeddingService = new EmbeddingService(model);
  }
  return embeddingService;
}

/**
 * Quick helper to generate single embedding
 */
export async function generateEmbedding(
  text: string,
  model?: string,
): Promise<number[]> {
  const service = getEmbeddingService(model);
  const result = await service.generateEmbedding({ text, model });
  return result.embedding;
}

/**
 * Quick helper to generate batch embeddings
 */
export async function generateBatchEmbeddings(
  texts: string[],
  model?: string,
): Promise<number[][]> {
  const service = getEmbeddingService(model);
  const result = await service.generateBatchEmbeddings({ texts, model });
  return result.embeddings;
}

/**
 * Check if embeddings are available
 */
export function areEmbeddingsAvailable(): boolean {
  const service = getEmbeddingService();
  return service.isAvailable();
}
