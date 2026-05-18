/**
 * AI Infrastructure - Main Entry Point
 * Exports all AI infrastructure components for easy importing
 */

// ============================================================================
// Providers
// ============================================================================

export {
  OpenAIClient,
  OpenAIError,
  OpenAIErrorType,
  getOpenAIClient,
  resetOpenAIClient,
  type OpenAIConfig,
  type OpenAIModel,
  type ChatMessage,
  type ChatCompletionRequest,
  type ChatCompletionResponse,
  type StreamChunk,
} from "./providers/openai-client";

export {
  AnthropicClient,
  AnthropicError,
  AnthropicErrorType,
  getAnthropicClient,
  resetAnthropicClient,
  type AnthropicConfig,
  type ClaudeModel,
  type AnthropicMessage,
  type MessageRequest,
  type MessageResponse,
  type StreamEvent,
} from "./providers/anthropic-client";

// ============================================================================
// Rate Limiting
// ============================================================================

export {
  RateLimiter,
  AI_RATE_LIMITS,
  RateLimitType,
  getRateLimiter,
  getSummarizeUserLimiter,
  getSummarizeOrgLimiter,
  getSearchUserLimiter,
  getSearchOrgLimiter,
  getChatUserLimiter,
  getChatOrgLimiter,
  getEmbeddingsUserLimiter,
  getEmbeddingsOrgLimiter,
  checkAIRateLimit,
  getRateLimitHeaders,
  type RateLimitConfig,
  type RateLimitResult,
  type RateLimitInfo,
  type RateLimitCheckOptions,
} from "./rate-limiter";

// ============================================================================
// Cost Tracking
// ============================================================================

export {
  CostTracker,
  MODEL_PRICING,
  getCostTracker,
  resetCostTracker,
  type ModelPricing,
  type TokenUsage,
  type CostCalculation,
  type UsageRecord,
  type UsageStats,
  type BudgetAlert,
  type BudgetStatus,
} from "./cost-tracker";

// ============================================================================
// Request Queue
// ============================================================================

export {
  RequestQueue,
  RequestPriority,
  getQueue,
  getAllQueues,
  type QueuedRequest,
  type QueueMetrics,
  type ProcessResult,
  type RequestProcessor,
} from "./request-queue";

// ============================================================================
// Response Cache
// ============================================================================

export {
  ResponseCache,
  CacheStrategy,
  AI_CACHE_TTL,
  getResponseCache,
  getSummarizationCache,
  getSearchCache,
  getChatCache,
  getEmbeddingsCache,
  cached,
  type CacheConfig,
  type CachedResponse,
  type CacheStats,
} from "./response-cache";

// ============================================================================
// Legacy Exports (for backward compatibility)
// ============================================================================

export {
  MessageSummarizer,
  getMessageSummarizer,
  isAISummarizationAvailable,
  type Message,
  type SummaryOptions,
  type ChannelDigest,
  type ThreadSummary,
  type AIProvider,
  type AIConfig,
} from "./message-summarizer";

export {
  SmartSearch,
  getSmartSearch,
  type SearchOptions,
  type SearchResult,
  type SearchableMessage,
  type SearchConfig,
  type SearchProvider,
  type SearchQuery,
} from "./smart-search";

// ============================================================================
// Vector Search & Embeddings
// ============================================================================

export {
  embeddingService,
  EmbeddingService,
  type EmbeddingRequest,
  type EmbeddingResponse,
  type BatchEmbeddingResponse,
  type EmbeddingModel,
} from "./embedding-service";

export {
  embeddingPipeline,
  EmbeddingPipeline,
  type PipelineConfig,
  type PipelineProgress,
  type MessageForEmbedding,
} from "./embedding-pipeline";

export {
  EmbeddingUtils,
  cosineSimilarity,
  euclideanDistance,
  manhattanDistance,
  dotProduct,
  normalize,
  magnitude,
  averageVectors,
  weightedAverageVectors,
  calculateQualityScore,
  detectAnomalies,
  reduceDimensions,
  getEmbeddingStats,
  formatEmbedding,
  compareEmbeddings,
  findMostSimilar,
  simpleCluster,
} from "./embedding-utils";

export {
  embeddingMonitor,
  EmbeddingMonitor,
  type PerformanceMetric,
  type QualityMetric,
  type CostMetric,
  type MonitoringReport,
} from "./embedding-monitor";
